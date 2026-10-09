# ForceAutoSkip for Seanime

<img src="icon-bleach.png" alt="ForceAutoSkip mask and skip icon" width="128" height="128">

A Seanime plugin that forces detected opening and ending skips and retries when the player ignores a seek.

## Install

1. In Seanime, open **Extensions → Add extensions → Install from URL**.
2. Paste this manifest URL:

   ```text
   https://raw.githubusercontent.com/DefnoJae/ForceAutoSkip/main/Manifest.json
   ```

3. Click **Find**, then **Install**. Approve the **playback** permission when Seanime prompts you, then enable **Force OP/ED Skip**. Seanime requires this permission to expose its player API to the plugin.
4. Play an episode with OP/ED timing data or labelled MKV chapters. The player displays **Force skipped Opening/Ending** when the plugin seeks.

For manual installation, download `Manifest.json`, rename it to `force-op-ed-skip.json`, place it in the folder configured by `[extensions] dir` in Seanime's `config.toml`, and restart Seanime.

Disable the plugin in Extensions to watch OP/ED normally. While enabled, it forces skips independently of the player's **Skip OP/ED** toggle.

### Updating from 1.0.0

Version 1.0.1 fixes the missing playback permission that caused `Cannot read property 'addEventListener' of undefined or null`. Update the plugin through Extensions and approve the new **playback** permission. If Seanime retains the old manifest, remove the extension and reinstall from the URL above. Restart Seanime if the old plugin is still loaded.

## How it works

- Uses the player's exact OP/ED timing data when `getSkipData` is available, refreshing every five seconds to pick up late data.
- Falls back to labelled MKV chapters: Opening/OP, Ending/ED/Credits, and guarded Intro/Outro labels.
- Checks status events and polls every 500 ms. Retries an ignored seek after 1.5 seconds.
- Seeks to the ending's end, preserving following post-credit scenes. Does not request the next episode itself.
- Leaves paused playback and Nakama watch parties alone.

A diamond marks a chapter boundary; it does not identify an opening or ending. Without timing data or recognised MKV chapter labels, the plugin cannot infer a safe skip range. A generic Intro label may describe story content; this fallback is limited to sections of at most three minutes in the first half of the video.

## Compatibility and testing

Built against official Seanime source commit `2da73d9eb59af15b004ef4e9018ac9db6fff213a` (main, retrieved October 9, 2026). Older versions without `getSkipData` can use labelled MKV chapters if they expose the required VideoCore event/control APIs. Verification used a mocked runtime; live playback still needs testing in Seanime.

To regenerate the self-contained manifest and run tests with Node.js:

```sh
node build.cjs
node test.cjs
```

Tests cover exact intervals, ignored-seek retries, retry throttling, confirmed seeks, openings/endings, pause handling, watch-party exclusion, episode changes, chapter fallback, post-credit preservation, unlabelled chapters, stale status rejection, and manifest/source consistency.

Edit `code.js`, increment the version in `build.cjs` for releases, and regenerate `Manifest.json` before committing.

API references: [Seanime plugin API](https://github.com/5rahim/seanime/blob/main/internal/extension_repo/goja_plugin_types/plugin.d.ts), [chapter skip logic](https://github.com/5rahim/seanime/blob/main/seanime-web/src/app/%28main%29/_features/media-core/media-core-chapters.ts), [official plugin examples](https://github.com/5rahim/seanime-extensions).
