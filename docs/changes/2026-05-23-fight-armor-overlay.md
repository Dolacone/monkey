---
title: "Fight: Armor Overlay & Weapon Highlight"
status: Draft
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

- [ ] T1: Add `analyzeDefenderArmor(retries)` function — reads `<area>` elements from defender's model map, detects armor type, inserts text overlay before `playerWindow___sDs7q`, highlights attacker weapons. Retries up to 5× if areas are empty.
- [ ] T2: Add MutationObserver in IIFE — watches for `attackStarted___KxAo_` class on any `.weaponSlot___Wq6XA` to trigger `analyzeDefenderArmor`. Also hook into existing space-keypress fightButton.click() path as a secondary trigger (idempotent).

Dependency: T2 depends on T1.
