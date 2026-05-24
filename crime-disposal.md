# crime-disposal.js

Tampermonkey userscript that highlights the correct disposal method buttons for each evidence type in Torn's Disposal crime.

## Page scope

Runs on: `https://www.torn.com/loader.php?sid=crimes*`
Exits immediately if the URL does not include `#/disposal`.

## Behavior

Waits for `div.crimeOptionGroup___gQ6rI` to become visible (polls every 100ms), then calls `updateColor()` which highlights the recommended action button(s) for each evidence item in green.

## Evidence → method map

| Evidence | Recommended methods |
|----------|-------------------|
| Biological Waste | sink |
| Body Part | (none defined) |
| Building Debris | sink |
| Dead body | (none defined) |
| Documents | burn |
| Firearm | sink |
| General Waste | bury, burn |
| Industrial Waste | sink |
| Murder Weapon | sink |
| Old Furniture | burn |
| Broken Appliance | sink |
| Vehicle | burn, sink |

## Key selectors

| Selector | Used for |
|----------|----------|
| `div.crimeOptionGroup___gQ6rI` | Wait condition — disposal UI loaded |
| `.crime-option:not(.processed)` | Each evidence row |
| `div.flexGrow___S5IUQ` | Evidence name text |
| `div.desktopMethodsSection___fPHAD` | Action buttons container |
| `button.abandon___Kj_xT` etc. | Individual method buttons (hashed class names) |

The button class names (`abandon___Kj_xT`, `bury___rKDkb`, etc.) are hashed and may change between game updates. If buttons stop highlighting, capture the current DOM and update `buttonClass`.

## Dependencies

- jQuery — provided by the Torn game page.
