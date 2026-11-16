# quick-purchase.js

## 頁面範圍

- `https://www.torn.com/page.php?sid=travel`
  - 飛行中：`body[data-traveling="true"]`，訊息列是 `section[class*='flightProgressSection___']`。
  - 海外：頁面同時有訊息列 `.info-msg-cont .msg` 與商店列表時動作。
  - 在 Torn 城內，這個網址是 Travel Agency，沒有訊息列。
  - 沒有訊息列時，腳本不做任何事。

## 進入點

- `document-idle` 時執行一次。
- `MutationObserver` 監看 `document.body`。
  - 選項：`childList`、`subtree`、`characterData`。
  - 每次變動重新讀目標商品的 stock。
  - 提醒中，每次變動把綠色 class 加回訊息列。
- `document` 的 `click`，在捕獲階段監聽。
  - 點擊落在訊息列內時，執行下一個動作。
    - 飛行中：使用入院道具。
    - 海外：下一步購買動作。
- `document` 的 `keydown`，在捕獲階段監聽。
  - 條件：頁面有訊息列，且按下 `q` 或空白鍵。
    - 海外另外要有商店列表。
  - 符合時執行下一個動作。
- `document` 的 `keyup`，在捕獲階段監聽。
  - 攔下觸發過的那一次空白鍵的 `keyup`。

## Request

飛行中的動作直接送 travel bundle 用的 endpoint。

| 用途 | Request |
|---|---|
| 讀背包 | `GET /page.php?sid=travelData&step=inventory&rfcv=<token>` |
| 使用道具 | `POST /page.php?sid=travelData&step=useItem&rfcv=<token>`，body `{"slotID": <ID>}` |

- URL 由 Torn 的 `window.addRFC` 加上 `rfcv`。
- header：`X-Requested-With: XMLHttpRequest`。
- `step=inventory` 回傳 `slots`。
  - 每格 `{ ID, item, source, action }`。
  - 用掉的格子保留在陣列中，`item` 為 `null`。
- 回應 `success === false` 或帶 `error` 視為失敗。
- 回應的 `message` 是 HTML。
  - `<span data-time="<秒>">` 換成時長，其餘標籤移除。

## DOM 掛鉤

商店列表由 React 渲染，根節點是 `#travel-root`。

飛行中：

| 資料 | 選擇器 |
|---|---|
| 是否飛行中 | `body[data-traveling="true"]` |
| 訊息列與航線 | `section[class*='flightProgressSection___']`，文字 `Torn to <國家>.` 為去程 |

海外：

每個商品是 `[class*='stockTableWrapper___'] li`：

| 資料 | 選擇器 |
|---|---|
| 商品名稱 | `button[class*='itemNameButton___']` |
| stock | 含 `srOnly` 標籤 `stock` 的 `cell` |
| 商品 ID | `form#item-<ID>-form` |
| 最大值箭頭 | `form#item-<ID>-form .input-money-symbol` |
| 數量 | `form#item-<ID>-form input[placeholder='Qty']` |
| Buy 按鈕 | `button[type='submit'][form='item-<ID>-form']` |
| 購物車（手機） | 同 Buy 按鈕，class 為 `buyIconButton___` |
| 數量面板（手機） | `#item-<ID>-buyPanel [class*='amountPanel___']` |
| 數量面板問句 | `[class*='amountPanel___'] [class*='question___']` |
| 數量面板 Buy | `[class*='amountPanel___'] button[type='submit']` |
| 確認框 | `#item-<ID>-buyPanel [class*='confirmPanel___']` |
| 確認框問句 | `#item-<ID>-buyPanel [class*='confirmQuestion___']` |
| Yes 按鈕 | `#item-<ID>-buyPanel button[class*='yes___']` |
| 購買結果 | `#item-<ID>-buyPanel [class*='buyResultMessage___']` |

- stock 格的完整選擇器：`[class*='cell___']` 中含 `[class*='srOnly___']` 且文字為 `stock` 的那一格。

腳本改動的 DOM：

- 訊息列加 class `qp-active`，隱藏原文字。
  - 飛行中與海外的訊息列都適用。
- 訊息列加 class `qp-green`，綠色背景。
- 訊息列內附加 `span.qp-status`，顯示狀態。
- 整頁背景改 `document.body.style.backgroundColor`。

## 選擇器穩定性

- 確認框打開時，該商品的 `li` 只剩 `#item-<ID>-buyPanel`。
  - 名稱、stock、表單都不在 DOM 中。
  - 商品 ID 改由確認框問句 `<數量>x <名稱>` 比對取得。
- 手機排版時，`form#item-<ID>-form` 仍在 DOM 中，但 `display: none`。
  - 列表與數量面板共用同一個數量 state。
  - 腳本仍點這個隱藏表單的最大值箭頭。
- 手機排版時，確認框打開後商品列仍保留。
- 背包 DOM `ul[aria-label^="Inventory"]` 的格子標籤 `"<名稱> slot N"` 保留原編號。
  - 用掉的格子從 DOM 移除，`N` 不等於位置。
  - 腳本改讀 `step=inventory` 的 `slots`。
- 腳本不使用 TornTools 加上的 `data-tt-content-type` 屬性。
  - 沒裝 TornTools 也能運作。
- class 名稱帶雜湊後綴。
  - 一律用 `[class*='名稱___']` 子字串比對。
