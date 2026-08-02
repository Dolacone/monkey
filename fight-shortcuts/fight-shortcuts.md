# fight-shortcuts.js

Tampermonkey userscript for Torn. Adds keyboard shortcuts on the attack page (armor overlay, real-time combat log, weapon/action keys) and a keyboard-driven loadout switcher on item.php.

Behavior is defined in `requirements/REQ-001` through `REQ-004`. This file covers only how the script runs — page scope, entry points, DOM hooks, and selector stability.

## Page scope

- Attack page: `https://www.torn.com/page.php?sid=attack&user2ID=*`
- Item page: `https://www.torn.com/item.php`

The IIFE entry point branches by page: item.php runs `initLoadoutSwitcher()` and returns; all other code runs only on the attack page.

## Entry points and DOM hooks

### 鍵盤快捷鍵（REQ-001）

`keypressHandler` 註冊在 `document` 的 `keypress` 事件上，只在攻擊頁生效。Q/W/E 成功點擊後由 `watchForContinueAndClose()` 掛一個 MutationObserver 在 `document.body`，等 CONTINUE 按鈕出現時關閉分頁；同一時間只會有一個這樣的 observer（`continueButtonObserver`）。

### 護甲覆蓋層（REQ-002）

`analyzeDefenderArmor(retries)` 在攻擊頁載入時呼叫一次。找不到對手模型或護甲區塊時用 `setTimeout` 重試；重試用盡後改由 `watchForDefenderArmorAreas()` 建立 MutationObserver，監聽對手模型視窗 (`.playerWindow___sDs7q`)，等待 `<area>` 之後才插入。

### 即時戰鬥日誌覆蓋層（REQ-003）

`startLogObserver()` 在 `analyzeDefenderArmor` 結束時呼叫，用 `logObserverStarted` flag 保證每個攻擊頁只掛一次觀察者。日誌列表 (`ul[class*="list___"]`) 尚未出現在 DOM 時，先在 `document.body` 掛一個等待用的 MutationObserver；找到列表後再切換成監聽該列表本身的 `childList` 變化。

### 裝備組切換器（REQ-004）

`initLoadoutSwitcher()` 只在 item.php 執行。用一個掛在 `document.body` 的 MutationObserver（`childList`, `subtree`）偵測 `#loadoutsRoot ul[class*="slots"]` 的出現與消失：出現時掛上槽位觀察者 (`attachSlotObserver`，監聽 `ul[class*="slots"]` 的 `class` 屬性變化) 與按鍵處理 (`loadoutKeydown`，掛在 `document` 的 `keydown`)；消失時兩者都拆除。

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
| `.weaponSlot___Wq6XA` | Weapon shortcut targets / defender weapon marker context | Hash may change |
| `#loadoutsRoot` | Loadout panel container (item.php) | Stable ID |
| `ul[class*="slots"]` | Loadout slots list (item.php) | Substring match, hash-tolerant |
| `li[class*="slot___"]` | Individual loadout slot (item.php) | Substring match, hash-tolerant |
| `button[aria-label="Equip loadout"]` | Equip button per slot (item.php) | aria-label is stable |
| `[class*="_quick-item_"][title="Blood Bag : O+"]` | Quick Items bar entry for z shortcut (item.php) | Class hash may change; `title` attribute holds the exact item name and is more stable |
| `[class*="dialogButtons"] button.torn-btn` (text "CONTINUE") | Ack signal after leave/mug/hospitalize, closes the tab | Same wrapper selector already used by Space; hash may change, matched by text as well for specificity |

If selectors break after a game update, capture a new DOM snapshot and compare against the above table.

## Dependencies

- jQuery — provided by the Torn game page, no import needed.
- Tampermonkey (Chrome/Firefox extension).
