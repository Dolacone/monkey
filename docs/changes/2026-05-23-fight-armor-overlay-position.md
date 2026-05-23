---
title: "Fight: Fix Armor Overlay Position"
status: Done
created: 2026-05-23
doc_type: change
last_reviewed: 2026-05-23
source_paths:
  - fight-shortcuts.js
scope: "Fix armor info text displacing the enemy model; render it as an absolute-positioned overlay inside playerWindow instead."
---

## Problem Statement

The `#armor-info` div is inserted before `.playerWindow___sDs7q` in the DOM flow, which pushes the enemy model down and collapses it visually. The text should float on top of the model without affecting layout.

## Recommended Direction

Insert `#armor-info` inside `.playerWindow___sDs7q` with `position: absolute`, covering the top portion of the model. `playerWindow___sDs7q` already has `position: relative` available; if not, add it. Set `z-index` high enough to appear above model layers. Keep `pointer-events: none` so clicks pass through.

Rejected alternatives:
- `insertBefore` with negative margin: fragile, depends on game CSS values.
- Reuse `statusBarWrap___afmGS`: limited space, tied to game UI layout.

## Key Assumptions

- `.playerWindow___sDs7q` can accept `position: relative` without breaking game layout.
- A `z-index` of 100 is sufficient to appear above `.modelLayers___r0DfY` and `.armoursWrap___C3swY` — verified from static HTML samples: the highest inline z-index on any `.armourContainer___ftMzt` is 19 (elements-combat.html).
- Semi-transparent background (`rgba(0,0,0,0.5)`) on the overlay text area is acceptable since it only covers the top portion of the model (not the whole window).

## MVP Scope / Not Doing

In scope:
- Change `insertBefore(playerWindow)` to `prepend` inside `playerWindow` with absolute positioning
- Set `playerWindow` to `position: relative`
- Use semi-transparent dark background only behind the text lines (not full-window overlay)

Not doing:
- Draggable/repositionable overlay
- Custom opacity setting

## Tasks

- [x] T1: Change `#armor-info` insertion in `analyzeDefenderArmor` to absolute-positioned overlay inside `.playerWindow___sDs7q`
  - Replace `insertBefore(playerWindow)` with `playerWindow.css('position', 'relative').prepend(info)`
  - Set overlay CSS: `position: absolute`, `top: 0`, `left: 0`, `width: 100%`, `z-index: 100`, `background: rgba(0,0,0,0.45)`, `pointer-events: none`
  - Acceptance: armor text appears on top of the enemy model; model is still visible behind the text; no layout shift occurs.

## Review Issues

No issues found. Implementation matches spec on all checked criteria:
- `#armor-info` is removed before re-insertion (line 49), preventing duplicates.
- Overlay CSS matches spec: `position: absolute`, `top: 0`, `left: 0`, `width: 100%`, `zIndex: 100`, `pointerEvents: none`, `background: rgba(0,0,0,0.45)`.
- `prependTo(playerWindow.css('position', 'relative'))` is correct jQuery — `.css()` setter returns the jQuery object, so `.prependTo()` receives the right target.
- No explicit `height` is set, so the overlay is content-sized and covers only the top of the model.
- All tasks marked [x]; status updated to Reviewed.
