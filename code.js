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
            function add(start, end, label) {
                if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 &&
                    end > start && end <= duration + 0.5) {
                    result.push({ start: start, end: Math.min(end, duration), label: label });
                }
            }
            // Exact OP/ED data takes priority over chapter labels.
            ["op", "ed"].forEach(function (kind) {
                const entry = skipData && skipData[kind];
                if (entry && entry.interval) {
                    add(entry.interval.startTime, entry.interval.endTime, kind === "op" ? "Opening" : "Ending");
                }
            });
            const chapters = info && info.mkvMetadata && info.mkvMetadata.chapters;
            const sorted = (chapters || []).slice().sort(function (a, b) { return a.start - b.start; });
            sorted.forEach(function (chapter, index) {
                const text = (chapter.text || "").trim();
                let label = null;
                if (/\bopening\b|^op(?:\s|\d|$)|^intro$/i.test(text)) label = "Opening";
                if (/\bending\b|^ed(?:\s|\d|$)|^credits\b|^outro$/i.test(text)) label = "Ending";
                if (!label || result.some(function (r) { return r.label === label; })) return;
                const next = sorted[index + 1];
                const end = chapter.end > chapter.start ? chapter.end : next ? next.start : duration;
                // Intro/outro are ambiguous: use them only near their respective ends.
                if (/^intro$/i.test(text) && (chapter.start > duration / 2 || end - chapter.start > 180)) return;
                if (/^outro$/i.test(text) && chapter.start < duration / 2) return;
                add(chapter.start, end, label);
            });
            return result;
        }

        function check(status) {
            sync();
            if (!active || !info || info.isNakamaWatchParty || !status || status.paused ||
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

        vc.addEventListener("video-status", function () { check(vc.getPlaybackStatus()); });
        vc.addEventListener("video-loaded", function () { sync(); refresh(); });
        vc.addEventListener("video-playback-state", function () { sync(); refresh(); });
        ctx.setInterval(function () { check(vc.getPlaybackStatus()); refresh(); }, 500);
        refresh();
    });
}
