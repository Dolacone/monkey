---
title: "Fight: Armor Overlay & Weapon Highlight"
status: Reviewed
created: 2026-05-23
doc_type: change
last_reviewed: 2026-05-23
source_paths:
  - fight-shortcuts.js
scope: "After fight starts, detect defender's armor set and display it above their model window; highlight attacker's recommended weapons."
---

## Problem Statement

During a fight, the defender's armor is not visible until after "Start fight" is clicked. Once visible, the player must manually inspect which armor set the defender wears to choose the right weapon. This feature automates that inspection.

## Recommended Direction

Use a MutationObserver (set up on page load) to detect when the fight starts — specifically when `attackStarted___KxAo_` class appears on any weapon slot. This handles both space-key and mouse-click Start fight. Once triggered, poll the defender's model `<area>` elements (up to N retries with delay) until armor data is present or confirmed absent.

Rejected alternatives:
- setTimeout only: misses mouse-click Start fight trigger.
- Manual keypress: adds cognitive load for user.

## Key Assumptions

- Armor type is determined by the `title` attribute of `<area>` elements inside the defender's `<map>` (e.g. "Assault Helmet", "Combat Vest", "Riot Gloves", "Vanguard Boots").
- Defender is identified by weapon slots having class `defender___l1ETt`.
- Attacker weapons: `#weapon_main` (1), `#weapon_second` (2), `#weapon_melee` (3), `#weapon_temp` (4) — scoped to attacker's player div.
- 500ms between retries, max 5 retries (2.5s total) covers typical load time.
- If defender has no armor areas, display "No armor" without highlighting.

## MVP Scope / Not Doing

In scope:
- MutationObserver triggers armor analysis when fight starts (both space and mouse)
- Retry up to 5× with 500ms interval until `<area>` elements appear
- Display armor pieces as text above defender's `playerWindow___sDs7q`
- Highlight attacker weapons: assault→1&2 blue, riot→3 blue, vanguard→4 blue
- Clear highlights / overlay on re-analysis

Not doing:
- Mixed armor sets (e.g. 2 assault + 3 riot pieces)
- Persistent state across page reloads
- Custom colors or UI configuration

## Tasks

- [x] T1: Add `analyzeDefenderArmor(retries)` to `fight-shortcuts.js`
  - Find defender player div: `.player___vjxP2` that contains `#weapon_main.defender___l1ETt`
  - Read `<area>` elements from defender's `<map>`, deduplicate by `alt` attribute
  - Detect armor type from first matched `title`: contains "assault" / "riot" / "vanguard"
  - Remove existing `#armor-info` div; insert new one before `.playerWindow___sDs7q` with text `"Part: Name | ..."` or `"No armor"`
  - Clear previous weapon highlights on attacker player div; apply blue bg (`rgba(0,120,255,0.4)`) to: assault→`#weapon_main,#weapon_second`; riot→`#weapon_melee`; vanguard→`#weapon_temp`
  - If `<area>` elements are absent and `retries > 0`: call `setTimeout(() => analyzeDefenderArmor(retries - 1), 500)`
  - Acceptance: given elements-combat.html structure, function outputs correct armor text and weapon highlights; given elements-naked.html, outputs "No armor" with no highlights.

- [x] T2: Add MutationObserver in IIFE to `fight-shortcuts.js`
  - Observe `document.body` with `{ attributes: true, attributeFilter: ['class'], subtree: true }` to detect class changes
  - On any mutation where `mutation.target` gains class `attackStarted___KxAo_` and `fightAnalyzed` flag is false: set flag to true, call `analyzeDefenderArmor(5)`
  - `fightAnalyzed` flag starts as `false`; since each fight is a separate page load (URL: `/page.php?sid=attack&user2ID=*`), the flag resets naturally on page load — no in-flight reset logic needed
  - Also call `analyzeDefenderArmor(5)` in existing space-keypress path after `fightButton.click()` (guarded by same flag)
  - Acceptance (manual in-browser): pressing space triggers analysis; clicking Start fight button with mouse also triggers analysis; analysis runs only once per fight session.

Dependency graph: T1 → T2 (T2 calls T1)
Parallelizable: No (T2 requires T1 to exist)

## Review Issues

- [ ] Minor: `mutation.type === 'attributes'` and `mutation.attributeName === 'class'` checks (lines 186-187) are redundant — `attributeFilter: ['class']` already guarantees only attribute/class mutations reach the callback. Harmless but adds noise.
- [ ] Minor: MutationObserver additionally checks `mutation.target.classList.contains('weaponSlot___Wq6XA')` (line 189), which is not specified in the change document. The extra guard is reasonable (avoids triggering on unrelated class changes that happen to include `attackStarted___KxAo_`), but it is an undocumented narrowing of the trigger condition.
- [ ] Minor: When `defenderPlayer` is not found (line 18, `!defenderPlayer.length`), the function returns immediately without retrying. If there is a small DOM-update lag between `attackStarted___KxAo_` appearing and `defender___l1ETt` being applied, the analysis silently aborts rather than retrying. Given that the trigger is already "fight started", this window is likely tiny, but the silent bail-out is inconsistent with the retry design.
- [ ] Minor: `$('#armor-info').remove()` (line 46) is a global selector rather than scoped to the defender player div. No real risk since the ID is self-inserted, but noted for consistency.
- [ ] Note: No automated tests — acceptable for a userscript context.
