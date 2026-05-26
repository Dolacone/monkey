# youtube-speed.js

Tampermonkey userscript that adds keyboard shortcuts to control YouTube video playback speed, with a floating speed indicator.

## Page scope

Runs on: `https://www.youtube.com/*`

## Speed steps

`0.5 → 1 → 1.25 → 1.5 → 2 → 5 → 10`

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Z | Slow down (previous step) |
| C | Speed up (next step) |
| X | Reset to 1× |
| V | Jump to maximum speed (10×) |

## Behavior

- A fixed overlay div is injected into the top-right corner of the page showing the current speed (e.g. `Speed: 1.5x`).
- On page load, reads the current `<video>` playbackRate and initializes `currentSpeedIndex` to match. If the current rate is not in the steps array, `indexOf` returns -1 and speed defaults to the first step on next keypress.
- Speed changes apply to `document.getElementsByTagName("video")[0]` — only affects the first video element on the page.

## Dependencies

- No external dependencies. Vanilla JS only.
