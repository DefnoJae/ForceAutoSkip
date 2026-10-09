# ForceAutoSkip for Seanime

<img src="icon-selected.png" alt="ForceAutoSkip mask and skip icon" width="128" height="128">

A Seanime plugin that forces detected opening and ending skips and retries when the player ignores a seek.

## Install

1. In Seanime, open **Extensions → Add extensions → Install from URL**.
2. Paste this manifest URL:

   ```text
   https://raw.githubusercontent.com/DefnoJae/ForceAutoSkip/main/releases/v1.0.8/Manifest.json
   ```

3. Click **Find**, then **Install**. Approve the **playback** permission when Seanime prompts you, then enable **Force OP/ED Skip**. Seanime requires this permission to expose its player API to the plugin.
4. Play an episode with OP/ED timing data or labelled MKV chapters. The player displays **Force skipped Opening/Ending** when the plugin seeks.

For manual installation, download `Manifest.json`, rename it to `force-op-ed-skip.json`, place it in the folder configured by `[extensions] dir` in Seanime's `config.toml`, and restart Seanime.

Disable the plugin in Extensions to watch OP/ED normally. While enabled, it forces skips independently of the player's **Skip OP/ED** toggle.

### Updating from 1.0.0

Version 1.0.1 fixes the missing playback permission that caused `Cannot read property 'addEventListener' of undefined or null`. Update the plugin through Extensions and approve the new **playback** permission. If Seanime retains the old manifest, remove the extension and reinstall from the URL above. Restart Seanime if the old plugin is still loaded.

### Stale versions during installation

Seanime's Find action reads the supplied URL, but Install fetches the manifest's own `manifestURI` again. Version 1.0.8 uses a dedicated release URL for both the manifest and icon so these requests cannot fall back to a cached earlier main manifest. Install using the versioned URL above. Future releases use new paths; install the new release URL to upgrade. Keep published release files unchanged.

## How it works

- Prefers explicitly labelled OP/ED chapters from the actual file. Falls back to player OP/ED timing data, refreshed every five seconds. External timing data can still be incorrect for a particular release.
- Only recognises explicit Opening/OP and Ending/ED labels (including numbered labels and titles following a colon or dash). Generic Intro, Outro, Credits, and story scene labels are ignored. Skips longer than five minutes are rejected, and chapter ends are capped at the next chapter boundary.
- Checks status events and polls every 500 ms. Retries an ignored seek after 1.5 seconds.
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

Tests cover exact intervals, ignored-seek retries, retry throttling, confirmed seeks, openings/endings, pause handling, watch-party exclusion, episode changes, chapter fallback, post-credit preservation, unlabelled chapters, stale status rejection, and manifest/source consistency.

Edit `code.js`, increment `version` in `build.cjs` for releases, and regenerate the manifests before committing. Publish each new `releases/vVERSION` directory and keep previous releases unchanged.

API references: [Seanime plugin API](https://github.com/5rahim/seanime/blob/main/internal/extension_repo/goja_plugin_types/plugin.d.ts), [chapter skip logic](https://github.com/5rahim/seanime/blob/main/seanime-web/src/app/%28main%29/_features/media-core/media-core-chapters.ts), [official plugin examples](https://github.com/5rahim/seanime-extensions).
