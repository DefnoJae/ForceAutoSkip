// Seanime UI plugin. Disable this extension to watch OP/ED normally.
function init() {
    $ui.register(function (ctx) {
        const vc = ctx.videoCore;
        if (!vc || typeof vc.addEventListener !== "function") {
            ctx.toast.error("Force OP/ED Skip needs playback access. Update the extension and approve its playback permission in Seanime Extensions.");
            return;
        }
        let active = "";
        let info = null;
        let skipData = null;
        let generation = 0;
        let busy = false;
        let lastFetch = 0;
        let pending = null;
        let skipEnabled = false;
        let checking = false;
        let settingClient = "";

        function textOf(element) {
            return (element.outerHTML || "").replace(/<[^>]*>/g, " ")
                .replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim();
        }

        function readSettingSnapshot(elements) {
            const row = elements.find(function (element) {
                return element.attributes["data-vc-element"] === "menu-option" &&
                    /^Skip OP\/ED\s*(On|Off)$/.test(textOf(element));
            });
            if (row) return /\bOn$/.test(textOf(row));
            const heading = elements.find(function (element) {
                return element.attributes["data-vc-element"] === "menu-section-close" && textOf(element) === "Skip OP/ED";
            });
            if (!heading) return null;
            const selected = elements.filter(function (element) {
                return element.attributes["data-vc-element"] === "setting-select-option";
            });
            if (selected.length !== 1) return false;
            return textOf(selected[0]) === "On";
        }

        function withTimeout(promise) {
            return new Promise(function (resolve, reject) {
                const cancel = ctx.setTimeout(function () { reject(new Error("Player settings query timed out")); }, 2000);
                promise.then(function (value) { cancel(); resolve(value); }, function (error) { cancel(); reject(error); });
            });
        }

        async function checkPlayerSetting() {
            const client = vc.getCurrentClientId();
            if (client !== settingClient) { settingClient = client; skipEnabled = false; }
            if (!ctx.dom || typeof ctx.dom.query !== "function") { skipEnabled = false; return; }
            try {
                const rows = await withTimeout(ctx.dom.query(
                    '[data-vc-element="menu-option"], [data-vc-element="menu-section-close"], ' +
                    '[data-vc-element="setting-select-option"]:has([data-vc-element="setting-select-option-indicator"] svg)',
                    { withOuterHTML: true }));
                if (client !== vc.getCurrentClientId()) { skipEnabled = false; return; }
                const setting = readSettingSnapshot(rows);
                if (setting !== null) skipEnabled = setting;
            } catch (_) { skipEnabled = false; }
            if (!skipEnabled) pending = null;
        }

        async function tick() {
            if (checking) return;
            checking = true;
            try {
                refresh();
                await checkPlayerSetting();
                check(vc.getPlaybackStatus());
            } catch (error) {
                skipEnabled = false;
                console.log("[ForceAutoSkip] settings check failed: " + String(error));
            } finally { checking = false; }
        }

        function sync() {
            const state = vc.getPlaybackState();
            const next = state && state.playbackInfo;
            const key = next ? state.clientId + ":" + next.id : "";
            if (key !== active) {
                active = key;
                generation++;
                skipData = null;
                pending = null;
                lastFetch = 0;
            }
            info = next || null;
        }

        function ranges(duration) {
            const result = [];
            function add(start, end, label, source) {
                if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 &&
                    end > start && end - start <= 300 && end <= duration + 0.5) {
                    result.push({ start: start, end: Math.min(end, duration), label: label, source: source });
                }
            }
            // Explicit labels from the actual file take priority over external timings.
            const chapters = info && info.mkvMetadata && info.mkvMetadata.chapters;
            const sorted = (chapters || []).slice().sort(function (a, b) { return a.start - b.start; });
            sorted.forEach(function (chapter, index) {
                const text = (chapter.text || "").trim();
                let label = null;
                if (/^(?:opening|op)(?:\s*\d+)?(?:\s*[-:：].*)?$/i.test(text)) label = "Opening";
                if (/^(?:ending|ed)(?:\s*\d+)?(?:\s*[-:：].*)?$/i.test(text)) label = "Ending";
                if (!label || result.some(function (r) { return r.label === label; })) return;
                const next = sorted[index + 1];
                const end = chapter.end > chapter.start ? Math.min(chapter.end, next ? next.start : duration) : next ? next.start : duration;
                add(chapter.start, end, label, "MKV chapter: " + text);
            });
            ["op", "ed"].forEach(function (kind) {
                const label = kind === "op" ? "Opening" : "Ending";
                if (result.some(function (r) { return r.label === label; })) return;
                const entry = skipData && skipData[kind];
                if (entry && entry.interval) {
                    add(entry.interval.startTime, entry.interval.endTime, label, "player skip data");
                }
            });
            return result;
        }

        function check(status) {
            sync();
            if (!skipEnabled || !active || !info || info.isNakamaWatchParty || !status || status.paused ||
                status.id !== info.id || status.clientId !== vc.getCurrentClientId() ||
                !Number.isFinite(status.duration) || status.duration <= 1) return;
            const time = status.currentTime;
            if (!Number.isFinite(time)) return;
            if (pending && time >= pending.end - 0.05) pending = null;
            const range = ranges(status.duration).find(function (r) { return time >= r.start && time < r.end - 0.05; });
            if (!range) return;
            const now = Date.now();
            if (pending && pending.end === range.end && now - pending.sent < 1500) return;
            // Retry a seek that the player ignored; do not flood it with commands.
            pending = { end: range.end, sent: now };
            console.log("[ForceAutoSkip] " + JSON.stringify({ playbackId: info.id, source: range.source,
                label: range.label, start: range.start, end: range.end, from: time }));
            vc.seekTo(range.end);
            vc.showMessage("Force skipped " + range.label, 1000);
        }

        async function refresh() {
            sync();
            if (!active || !info || info.isNakamaWatchParty || busy || typeof vc.getSkipData !== "function") return;
            const now = Date.now();
            if (now - lastFetch < 5000) return;
            lastFetch = now;
            busy = true;
            const token = generation;
            try {
                const data = await vc.getSkipData();
                sync();
                if (token === generation) skipData = data || null;
            } catch (_) {
                // Older versions can still use labelled MKV chapters.
            } finally {
                busy = false;
            }
        }

        vc.addEventListener("video-status", function () { tick(); });
        vc.addEventListener("video-loaded", function () { sync(); refresh(); });
        vc.addEventListener("video-playback-state", function () { sync(); refresh(); });
        ctx.setInterval(tick, 500);
        refresh();
    });
}
