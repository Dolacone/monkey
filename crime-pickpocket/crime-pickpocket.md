# crime-pickpocket.js

Tampermonkey userscript that highlights pickpocket targets in Torn's Pickpocketing crime, moves their action button to the header, plays a sound alert, and binds `Q` to commit the action.

## Page scope

Runs on: `https://www.torn.com/page.php?sid=crimes*`
Exits immediately if the URL does not include `#/pickpocketing`.

## Features

### Target highlighting

Polls every 1000ms via `updateDivColors()`. For each row in `.pickpocketing-root .crime-option`:
- Reads the target name and checks if it matches any item in `menuSelected`
- If matched and the commit button is enabled (`aria-disabled="false"`):
  - Highlights the row with a green left border and dark green background
  - Moves the commit button to the header action container (`[class*="resultCounts"]`)
  - Binds `Q` keydown to click the button
  - Plays a sound alert (if "Enable Sound" is selected)
- Unmatched targets: hides their commit button

### After commit

On button click:
- Captures a snapshot of the target row (avatar id, name, body type, action type, remaining seconds) before any DOM changes
- Removes `Q` keybinding
- Resets page background to black
- Restores the row's original color
- Moves the button back to its original parent and hides it
- Attaches a `MutationObserver` on `[class*="currentCrime"]` (10s safety timeout) that fires on DOM changes; each firing checks for `[class*="outcomeWrapper"]` content, and once found moves `[class*="outcomeReward"]` into the result banner area and parses the outcome status/reward
- Appends a full log record (snapshot + status + reward + timestamp) to `localStorage`, unmerged, one entry per attempt

### Attempt log

Each pickpocket attempt (via click or `Q`) is recorded to `localStorage` under the key `pickpocketLog` as a JSON array. Each record:

| Field | Example | Source |
|-------|---------|--------|
| `avatarId` | `"1164"` | Row `<img>` src (`/images/v2/crimes/faces/1164.webp`) |
| `name` | `"Cyclist"` | `[class*="titleAndProps"] > div:first-child` |
| `bodyType` | `"Average 5'0\" 162 lbs"` | `[class*="physicalProps"]` |
| `actionType` | `"Walking"` | `[class*="activity"]` direct text node |
| `remainingSeconds` | `"7s"` | `[class*="clock"]` |
| `status` | `"SUCCESS"` | `[class*="outcomeReward"] [class*="title"]` |
| `reward` | `1718` or `["Zip Wallet"]` or `["Zip Wallet", "Cell Phone"]` or `null` | `[class*="outcomeReward"] [class*="rewards"]` text parsed to a `Number` (`$` and `,` stripped) for money; an array of every `img[alt]` inside it for item rewards (can contain more than one item cell); `null` when there's no reward text (e.g. FAILURE) |
| `timestamp` | ISO string | Recorded at outcome time |

Records are never merged or deduplicated; every attempt adds a new entry. Reload does not clear `localStorage`, so history persists across page refreshes.

An "Export Log" button is injected next to "Back to Hub", styled with a solid green background and white text (independent of light/dark theme, matching the row-highlight color) so it stays visible in both modes. Clicking it downloads the full `pickpocketLog` array as a `pickpocket-log-<timestamp>.json` file via the browser's download mechanism.

### Background color as status indicator

| Color | Meaning |
|-------|---------|
| red | A target is available and highlighted |
| black | No active target (after commit or on reset) |

## Tampermonkey menu

Requires `GM_registerMenuCommand`, `GM_setValue`, `GM_getValue` grants.

Available toggles (persisted via `GM_setValue`):

| Item | Effect |
|------|--------|
| Enable Sound | Play audio alert when a target appears |
| Cyclist | Include "Cyclist" as a target name |
| Mobster | Include "Mobster" as a target name |

Toggling an item reloads the page to apply. If not running under Tampermonkey, all items default to enabled.

## Key selectors

| Selector | Used for |
|----------|----------|
| `.pickpocketing-root .crime-option` | Each target row |
| `[class*="titleAndProps"] > div:first-child` | Target name text |
| `button.commit-button, button[aria-label^="Pickpocket"]` | Commit button |
| `[class*="resultCounts"]` | Header action container (button destination) |
| `[class*="currentCrime"] [class*="bannerArea"]` | Result display area |
| `[class*="outcomeWrapper"]` | Post-commit outcome container |
| `[class*="outcomeReward"]` | Reward element to surface |
| `[class*="outcomeReward"] [class*="title"]` | Outcome status text (e.g. SUCCESS/FAIL) |
| `[class*="outcomeReward"] [class*="rewards"]` | Outcome reward text (money or item) |
| `[class*="childrenWrapper"]` | Row label text (colored green when active) |
| `[class*="physicalProps"]` | Row body type text |
| `[class*="activity"]` | Row action type text + countdown |
| `[class*="clock"]` | Row remaining seconds |

All `[class*="..."]` selectors use substring matching to tolerate hashed class name changes.

## Dependencies

- No jQuery used — vanilla DOM APIs only.
- Tampermonkey grants: `GM_registerMenuCommand`, `GM_setValue`, `GM_getValue`.
