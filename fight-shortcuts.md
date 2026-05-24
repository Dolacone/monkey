# fight-shortcuts.js

Tampermonkey userscript for Torn's attack page. Adds keyboard shortcuts, auto-detects defender armor, and shows a real-time combat log summary on the enemy model.

## Page scope

Runs only on: `https://www.torn.com/page.php?sid=attack&user2ID=*`

## Features

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| Space | Click "Start fight" / confirm dialog |
| 1 | Fire primary weapon |
| 2 | Fire secondary weapon |
| 3 | Attack with melee |
| 4 | Use temporary weapon |
| Q | Leave fight |
| W | Mug |
| E | Hospitalize |
| B | Go to defender's profile |

### Armor overlay

Triggered when the fight starts (via space or mouse click on Start fight). Uses a MutationObserver watching for `attackStarted___KxAo_` class appearing on a weapon slot.

Once triggered, `analyzeDefenderArmor(retries)` runs:
- Finds the defender player div (`.player___vjxP2` containing `#weapon_main.defender___l1ETt`)
- Reads `<area>` elements inside the defender's `<map>` — each area's `alt` = body part, `title` = armor piece name
- Deduplicates by body part (`alt`)
- Retries up to 5× at 500ms intervals if areas are absent
- Renders each piece as a `<div>` inside `#armor-info`, an absolute-positioned overlay prepended into `.playerWindow___sDs7q`
- Detects armor type from first matched piece name: `assault` / `riot` / `vanguard`
- Highlights attacker weapon slots with blue box-shadow: assault → 1+2, riot → 3, vanguard → 4

`#armor-info` CSS: `position: absolute`, `top: 0`, `left: 0`, `width: 100%`, `z-index: 100`, `pointer-events: none`, semi-transparent dark background.

### Real-time combat log overlay

Started at the end of `analyzeDefenderArmor` (success path only, runs once per fight via `fightAnalyzed` flag).

`startLogObserver()` attaches a MutationObserver to `ul[class*="list___"]` (the React log list). If the list isn't in the DOM yet, a fallback observer waits on `document.body` until it appears.

Each new `li` added to the log list is passed to `parseLogEntry(li)`, which returns:

| Result | Condition |
|--------|-----------|
| `{ type:'join', name }` | icon class contains `attack-join` |
| `{ type:'miss', side:'attacker', ... }` | attacker side, no `<em>` damage value |
| `{ type:'hit', side, damage, isCrit }` | attacker or defender hit |
| `null` (skip) | defender miss; icon contains `leave`, `grenade`, `slowed`, or `speed` |

Crit detection: icon class contains `critical-hit` OR message text contains "critically hit" (covers both `attacking-events-critical-hit` mid-fight and `attacking-events-attack-win` on the final blow).

Display in `#armor-info` (prepended above armor piece divs):

| Event | Text | Color |
|-------|------|-------|
| Attacker miss | `MISS` | `#4f4` green |
| Attacker hit | `916` | `#4f4` green |
| Attacker crit | `1715 CRI` | `#4f4` green |
| Defender hit | `2274` | `#f44` red |
| Defender crit | `1699 CRI` | `#f44` red |
| Player join | `PLAYERNAME joined` | `#ff4` yellow |

## Key selectors and stability notes

Game CSS class names use hashed suffixes (e.g. `list___Hip7j`, `player___vjxP2`). These can change between game updates. The script uses substring matches (`[class*="..."]`) where hashes are likely to change:

| Selector | Used for | Stability |
|----------|----------|-----------|
| `.player___vjxP2` | Player container div | Hash may change |
| `#weapon_main.defender___l1ETt` | Identify defender player | `#weapon_main` is stable; `defender___l1ETt` hash may change |
| `.playerWindow___sDs7q` | Enemy model window for overlay | Hash may change |
| `ul[class*="list___"]` | Live log list | Substring match, intentionally hash-tolerant |
| `span[class*="col1"]` | Log entry action column | Substring match |
| `span[class*="attacking-events-"]` | Log event type icon | Prefix is stable; full class name is event-specific |
| `span[class*="message"]` | Log entry message text | Substring match |
| `.attackStarted___KxAo_` | Fight start trigger | Hash may change; used in MutationObserver |
| `.weaponSlot___Wq6XA` | Fight start guard | Hash may change |

If selectors break after a game update, capture a new DOM snapshot and compare against the above table.

## Dependencies

- jQuery — provided by the Torn game page, no import needed.
- Tampermonkey (Chrome/Firefox extension).
