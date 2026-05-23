---
title: "Fight: Real-time Combat Log Overlay"
status: Reviewed
created: 2026-05-24
doc_type: change
last_reviewed: 2026-05-24
last_reviewed_pass: 2
source_paths:
  - fight-shortcuts.js
scope: "Observe the live fight action log and display a real-time parsed summary (hits, misses, crits, joins) in the existing #armor-info overlay; new entries prepend above armor piece divs."
---

## Problem Statement

During a fight, the action log shows verbose text requiring the player to scan for key numbers. The existing armor overlay on the enemy model has space to show a compact, color-coded combat summary in real time without switching focus from the model.

## Alternative Directions

A (chosen): MutationObserver on `ul[class*="list___"]` — watch for new `li` prepended to the live log list; parse each entry; prepend a color-coded `<div>` to `#armor-info`.

B: setInterval polling — check log list `li` count every 500ms. Simpler but has up to 500ms lag and wastes cycles.

C: Extend existing `attackStarted___KxAo_` observer. Adds complexity without benefit over Option A.

Direction A chosen: most responsive, zero polling cost, consistent with existing MutationObserver pattern.

## Key Assumptions

- Log list selector uses `ul[class*="list___"]` (attribute substring match) rather than the full hashed class `ul.list___Hip7j` because game class hashes may change between updates. Both Alternative Directions and Tasks use this form consistently.
- `ul[class*="list___"]` persists for the duration of the fight; new entries are prepended as `li` children — not full list re-renders.
- `color-1____8JuW` = attacker (player), `color-2___iX1n6` = defender — consistent throughout fight.
- Crits identified by icon class containing `critical-hit` OR message text containing "critically hit" (handles `attacking-events-critical-hit` mid-fight and `attacking-events-attack-win` on final blow).
- Join event identified by icon class containing `attack-join`; PLAYERNAME = first `<a>` text in the message span.
- Defender misses filtered out (not shown); only attacker misses shown as `MISS`.
- Non-combat events (leave, grenade, slowed, speed effects) filtered out.
- `em.green` = attacker damage; `em.red` = defender damage.
- Overlay already has `width: 100%` bounded by `.playerWindow___sDs7q`.
- `fightAnalyzed` flag already prevents `analyzeDefenderArmor` from running more than once per page load. `startLogObserver` is called only on the success path inside `analyzeDefenderArmor`, so it is inherently called at most once. No additional guard needed inside `startLogObserver` itself. The MutationObserver instance does not need to be stored for disconnect — it runs until page unload, matching the lifetime of the fight page.

## MVP Scope / Not Doing

In scope:
- Refactor armor display in `analyzeDefenderArmor`: each armor piece rendered as its own `<div>` inside `#armor-info`; remove `whiteSpace: 'pre'` CSS since newline-joined text is no longer used
- Parse new log entries: attacker miss → `MISS` green; attacker hit → `916` green; attacker crit → `1715 CRI` green; defender hit → `2274` red; defender crit → `1699 CRI` red; join → `PLAYERNAME joined` yellow
- Defender miss → skip; leave/grenade/slowed → skip
- Log entry `<div>`s prepend to top of `#armor-info`; armor piece `<div>`s naturally pushed down
- MutationObserver started after armor confirmed

Not doing:
- Cap on max log lines shown
- Grouping multi-round fire into one line
- Showing slowed/demoralized status in overlay

## Tasks

- [x] T1: Refactor armor rendering in `analyzeDefenderArmor` to use per-piece `<div>` elements
  - Replace the single `.text(infoText)` call (newline-joined armor names) with individual `$('<div>').text(name)` elements appended to `#armor-info`
  - Remove `whiteSpace: 'pre'` from `#armor-info` CSS (no longer needed with block `<div>` children)
  - All other `#armor-info` CSS unchanged (position, top, left, width, z-index, background, pointer-events, color, font-size, padding)
  - Acceptance: overlay still shows each armor piece on its own line; `#armor-info` contains one `<div>` per piece; no `white-space: pre` in computed style.

- [x] T2: Add `parseLogEntry(li)` function
  - Input: `li` jQuery element (a row from the live log list)
  - Side: attacker if col1 span has class `color-1____8JuW`; defender if `color-2___iX1n6`
  - Event type from icon span class (`[class*="attacking-events-"]`)
  - Crit: icon class contains `critical-hit` OR `.message___Ezhic` text contains "critically hit"
  - Join: icon class contains `attack-join` → return `{ type:'join', name: <first <a> text in message> }`
  - Damage: text of `em` child inside `.message___Ezhic`, commas stripped, parsed as int
  - Skip conditions (return null): icon class contains `leave`, `grenade`, `slowed`, or `speed`; defender side with no `em` child (defender miss)
  - Attacker miss: attacker side + no `em` → `{ type:'miss', side:'attacker', damage:null, isCrit:false }`
  - Acceptance: attacker-miss li → `{type:'miss',side:'attacker',damage:null,isCrit:false}`; attacker-crit li → `{type:'hit',side:'attacker',damage:1715,isCrit:true}`; defender-miss li → null; join li → `{type:'join',name:'Dola'}`.

- [x] T3: Add `startLogObserver()` and integrate with `analyzeDefenderArmor`
  - Observe `ul[class*="list___"]` with `{ childList: true }`
  - For each node in `addedNodes`: call `parseLogEntry`; if null, skip
  - Display logic (full condition tree):
    - `type === 'join'` → `color:#ff4`, text = `${name} joined`
    - `type === 'miss'` (attacker) → `color:#4f4`, text = `MISS`
    - `type === 'hit'` + `side === 'attacker'` + `isCrit` → `color:#4f4`, text = `${damage} CRI`
    - `type === 'hit'` + `side === 'attacker'` + !`isCrit` → `color:#4f4`, text = `${damage}`
    - `type === 'hit'` + `side === 'defender'` + `isCrit` → `color:#f44`, text = `${damage} CRI`
    - `type === 'hit'` + `side === 'defender'` + !`isCrit` → `color:#f44`, text = `${damage}`
  - Prepend the built `<div>` to `#armor-info`
  - Call `startLogObserver()` at end of `analyzeDefenderArmor` on the success path only (after armor divs are appended, not on retry bail-out)
  - Acceptance: after fight starts, each qualifying log entry appears as the top `<div>` in `#armor-info` within one frame of DOM mutation; armor piece divs shift down; correct color and text for each case.

Dependency graph: T1 independent; T2 independent; T3 requires T1 (#armor-info structure) and T2 (parseLogEntry).
Parallelizable: T1 and T2 in parallel; T3 must follow both.

## Review Issues

- [x] ~~🟡 [Major]: `startLogObserver()` silently returned when `ul[class*="list___"]` was absent, causing the observer to never attach.~~ Fixed: `startLogObserver` now falls back to a `waitObserver` on `document.body` (`childList: true, subtree: true`) that disconnects itself and calls `attachTo()` once the log list appears. Logic is correct — `disconnect()` is called before `attachTo()`, preventing duplicate attachment.

No remaining issues. All selectors verified against DOM samples. All tasks complete.
