# ForceAutoSkip for Seanime

<img src="icon-selected.png" alt="ForceAutoSkip mask and skip icon" width="128" height="128">

A Seanime plugin that forces detected opening and ending skips and retries when the player ignores a seek.

## Install

1. In Seanime, open **Extensions → Add extensions → Install from URL**.
2. Paste this manifest URL:

   ```text
   https://raw.githubusercontent.com/DefnoJae/ForceAutoSkip/main/releases/Manifest.json
   ```

3. Click **Find**, then **Install**. Approve **playback** and **storage** when prompted, then enable **Force OP/ED Skip**. Playback exposes the player API; storage remembers the confirmed Skip OP/ED preference for each player client.
4. Play an episode with OP/ED timing data or labelled MKV chapters. The player displays **Force skipped Opening/Ending** when the plugin seeks.

For manual installation, download `Manifest.json`, rename it to `force-op-ed-skip.json`, place it in the folder configured by `[extensions] dir` in Seanime's `config.toml`, and restart Seanime.

The extension respects the player's **Skip OP/ED** toggle. On initial setup, open player settings once to confirm the toggle. Version 1.0.11 remembers that value across episodes and extension/app restarts for the same player client, so subsequent skips do not need screen interaction. Turning On or Off in the submenu updates the saved value. Seanime does not expose this preference through its plugin API; on a new player client or with no saved value, it must observe the menu once and stays inactive until then.

### Updating from 1.0.0

Version 1.0.1 fixes the missing playback permission that caused `Cannot read property 'addEventListener' of undefined or null`. Update the plugin through Extensions and approve the new **playback** permission. If Seanime retains the old manifest, remove the extension and reinstall from the URL above. Restart Seanime if the old plugin is still loaded.

### Updates

Use **Check for updates** in Seanime. Version 1.0.10 restores a stable `releases/Manifest.json` manifest URL, so future releases are discoverable without uninstalling. Older release manifest URLs now advertise the latest version and migrate installations to that stable URL. GitHub raw content can take a few minutes to refresh after a push; if no update appears immediately, check again shortly. The JSON `version` field is required; only pinning the update URL to a particular release was wrong.

Version 1.0.10 also fixes two bugs in 1.0.9: opening the Skip OP/ED submenu incorrectly disabled the plugin, and individual menu text reads could hang when elements disappeared. One menu snapshot now includes the selected On/Off option, and a two-second timeout lets polling recover after an unanswered query.

Version 1.0.11 adds an independent playback watchdog using `pullStatus`, rather than relying on cached status or menu interaction. When enabled playback remains in a detected OP/ED range and continues advancing for at least two seconds, it forces a seek to the range end. A successful native skip cancels the fallback; pause, leaving the range, episode changes, and manual seeks reset the grace period. Ignored force seeks are retried no more often than every two seconds. Menu reads run separately so an unanswered settings request cannot hold up the playback watchdog.

## How it works

- Prefers explicitly labelled OP/ED chapters from the actual file. Falls back to player OP/ED timing data, refreshed every five seconds. External timing data can still be incorrect for a particular release.
- Only recognises explicit Opening/OP and Ending/ED labels (including numbered labels and titles following a colon or dash). Generic Intro, Outro, Credits, and story scene labels are ignored. Skips longer than five minutes are rejected, and chapter ends are capped at the next chapter boundary.
- Requests fresh playback status every 500 ms. Gives the normal skip two seconds before forcing, then retries ignored seeks at two-second intervals.
- Seeks to the ending's end, preserving following post-credit scenes. Does not request the next episode itself.
- Leaves paused playback and Nakama watch parties alone.

A diamond marks a chapter boundary; it does not identify an opening or ending. Without timing data or recognised MKV chapter labels, the plugin cannot infer a safe skip range. Generic Intro labels can describe story content and are never inferred to be openings.

## Compatibility and testing

Version 1.0.8 removes ambiguous chapter guesses, prefers file-specific OP/ED chapters over conflicting player timing data, and rejects oversized skip ranges. Every forced seek logs `[ForceAutoSkip]` with its playback ID, timing source, range, and current time. If a wrong skip occurs, disable the plugin temporarily and include these log lines with the expected OP/ED times when reporting it. These guards cannot establish that external OP/ED data matches the video when explicit file chapters are unavailable.

Built against official Seanime source commit `2da73d9eb59af15b004ef4e9018ac9db6fff213a` (main, retrieved October 9, 2026). Older versions without `getSkipData` can use labelled MKV chapters if they expose the required VideoCore event/control APIs. Verification used a mocked runtime; live playback still needs testing in Seanime.

To regenerate the self-contained manifest and run tests with Node.js:

```sh
node build.cjs
node test.cjs
```

Tests cover two-second grace timing, fresh status pulls with deliberately stale cached status, skipping without input events or a visible menu, successful native skip cancellation, ignored-seek retries, saved On/Off across restarts, pause and buffering, episode changes, endings, blocked menu query isolation, chapter bounds and ambiguous labels, watch parties, stale status, and every legacy update URL. Menu fixtures match Seanime's actual components.

Edit `code.js`, increment `version` in `build.cjs`, then rebuild and run tests. Commit `latest.json`, `Manifest.json`, and the generated release directories. Legacy release manifest paths are compatibility update endpoints; they must keep advertising the latest version.

API references: [Seanime plugin API](https://github.com/5rahim/seanime/blob/main/internal/extension_repo/goja_plugin_types/plugin.d.ts), [chapter skip logic](https://github.com/5rahim/seanime/blob/main/seanime-web/src/app/%28main%29/_features/media-core/media-core-chapters.ts), [official plugin examples](https://github.com/5rahim/seanime-extensions).
