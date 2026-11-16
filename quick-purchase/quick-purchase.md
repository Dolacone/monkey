# quick-purchase.js

## 頁面範圍

- `https://www.torn.com/page.php?sid=travel`
  - 旅行社：`body[data-country="torn"]`、不在飛行中、頁面有背包面板。
  - 飛行中：`body[data-traveling="true"]`。
  - 海外：其他情況。

| 頁面 | 訊息列 |
|---|---|
| 旅行社 | 腳本插入的 `div.qp-bar` |
| 飛行中 | `section[class*='flightProgressSection___']` |
| 海外 | `.info-msg-cont .msg` |

## 進入點

- `document-idle` 時執行一次。
- `MutationObserver` 監看 `document.body`。
  - 選項：`childList`、`subtree`、`characterData`。
  - 每次變動插入缺少的設定連結與旅行社訊息列。
  - 每次變動重新讀目標商品的 stock。
  - 提醒中，每次變動把綠色 class 加回訊息列。
- `document` 的 `click`，在捕獲階段監聽。
  - 點擊落在訊息列內時，執行一個動作。
- `document` 的 `keydown`，在捕獲階段監聽。
  - 條件：頁面有訊息列，且按下 `q` 或空白鍵。
- `document` 的 `keyup`，在捕獲階段監聽。
  - 攔下觸發過的那一次空白鍵的 `keyup`。
- 每個動作結束後，送出 `window` 的 `focus` 事件。

## 設定

- `localStorage` 鍵 `quickPurchase.settings`，值為 JSON `{ target, sell, hosp, med }`。
  - 缺少的鍵用預設值。
- 設定連結 `div.qp-settings` 插在 `#travel-root` 前面。
- `Load package` 按鈕在設定表單內，只在旅行社顯示。
- 表單按鈕使用 Torn 的 `torn-btn` class，跟隨頁面的深色或淺色模式。

## Request

路徑 `/page.php?sid=travelData&step=<step>`，由 Torn 的 `window.addRFC` 加上 `rfcv`，header `X-Requested-With: XMLHttpRequest`。

| step | Method | 內容 |
|---|---|---|
| `inventory` | GET | 回傳 `slots`，每格 `{ ID, item }` |
| `searchItem` | POST | `FormData` `q=<名稱>`，回傳 `list`，每項 `{ id, name, faction, disabled }` |
| `addSlotItem` | POST | `{"itemID": <id>}`，派系的加 `"factionItem": "1"` |
| `fillSlotItems` | POST | `{"itemID": <id>}` |
| `useItem` | POST | `{"slotID": <ID>}` |
| `sellItem` | POST | `{"slotID": <ID>, "amount": <n>}` |
| `buy` | GET | `&itemID=<id>&amount=<n>` |

- `inventory` 的空格是 `item: null` 的格子。
- 回應帶 `success: false` 時視為失敗。
- 回應的 `message` 是 HTML。
  - `<span data-time="<秒>">` 換成時長，其餘標籤移除。

## DOM 掛鉤

| 資料 | 選擇器 |
|---|---|
| 是否住院 | `body[data-layout="hospital"]` |
| 商品列 | `[class*='stockTableWrapper___'] li` |
| 商品名稱 | `button[class*='itemNameButton___']` |
| stock | `[class*='cell___']` 中含 `[class*='srOnly___']` 文字 `stock` 的那一格 |
| 商品 ID | `form#item-<ID>-form` |
| 背包面板 | `ul[aria-label^='Inventory']` |

腳本改動的 DOM：

- 訊息列加 class `qp-active`，隱藏原文字。
- 訊息列內附加 `span.qp-status`，顯示狀態。
- 訊息列加 class `qp-green`，綠色背景。
- 整頁背景改 `document.body.style.backgroundColor`。
- `#travel-root` 前面插入 `div.qp-settings`。
- 旅行社時，`div.qp-settings` 後面插入 `div.qp-bar`，離開旅行社時移除。

## 選擇器穩定性

- 去程途中 `body[data-abroad]` 已是 `"true"`，飛行判斷只看 `data-traveling`。
- 背包 DOM 的格子標籤 `"<名稱> slot N"` 保留原編號，且在使用道具後不會立刻更新。
  - 背包內容一律讀 `step=inventory`。
- class 名稱帶雜湊後綴。
  - 一律用 `[class*='名稱___']` 子字串比對。
