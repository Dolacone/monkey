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
- Removes `Q` keybinding
- Resets page background to black
- Restores the row's original color
- Moves the button back to its original parent and hides it
- Polls every 500ms until `[class*="outcomeWrapper"]` has content, then moves `[class*="outcomeReward"]` into the result banner area

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
| `[class*="childrenWrapper"]` | Row label text (colored green when active) |

All `[class*="..."]` selectors use substring matching to tolerate hashed class name changes.

## Dependencies

- No jQuery used — vanilla DOM APIs only.
- Tampermonkey grants: `GM_registerMenuCommand`, `GM_setValue`, `GM_getValue`.
