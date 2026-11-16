# quick-purchase.js

## 頁面範圍

- `https://www.torn.com/page.php?sid=travel`
  - 飛行中：`body[data-traveling="true"]`，訊息列是 `section[class*='flightProgressSection___']`。
  - 海外：頁面同時有訊息列 `.info-msg-cont .msg` 與商店列表時動作。
    - 住院中兩者仍在頁面上。
  - 在 Torn 城內，這個網址是 Travel Agency，沒有訊息列。
  - 沒有訊息列時，腳本不做任何事。

## 進入點

- `document-idle` 時執行一次。
- `MutationObserver` 監看 `document.body`。
  - 選項：`childList`、`subtree`、`characterData`。
  - 每次變動重新讀目標商品的 stock。
  - 提醒中，每次變動把綠色 class 加回訊息列。
- `document` 的 `click`，在捕獲階段監聽。
  - 點擊落在訊息列內時，執行一個動作。
- `document` 的 `keydown`，在捕獲階段監聽。
  - 條件：頁面有訊息列，且按下 `q` 或空白鍵。
    - 海外另外要有商店列表。
  - 符合時執行一個動作。
- `document` 的 `keyup`，在捕獲階段監聽。
  - 攔下觸發過的那一次空白鍵的 `keyup`。

## 設定

- `localStorage` 鍵 `quickPurchase.settings`，值為 JSON `{ target, sell, hosp, med }`。
  - 缺少的鍵用預設值，空字串表示跳過。
- 設定連結 `div.qp-settings` 插在 `#travel-root` 前面，是它的兄弟節點。
  - 不放在 React 管理的節點內。
  - 每次 DOM 變動時檢查，不在就重新插入。

## Request

動作直接送 travel bundle 用的 endpoint。

| 用途 | Request |
|---|---|
| 讀背包 | `GET step=inventory` |
| 使用道具 | `POST step=useItem`，body `{"slotID": <ID>}` |
| 賣出 | `POST step=sellItem`，body `{"slotID": <ID>, "amount": <n>}` |
| 購買 | `GET step=buy&itemID=<ID>&amount=<n>` |

- 路徑：`/page.php?sid=travelData&step=...`。
- URL 由 Torn 的 `window.addRFC` 加上 `rfcv`。
- header：`X-Requested-With: XMLHttpRequest`。
- `step=inventory` 回傳 `slots`。
  - 每格 `{ ID, item, source, action }`。
  - 用掉的格子保留在陣列中，`item` 為 `null`。
  - `item.isSellable` 在會收購該道具的國家才是 `true`。
- 回應 `success === false` 或帶 `error` 視為失敗。
- 回應的 `message` 是 HTML。
  - `<span data-time="<秒>">` 換成時長，其餘標籤移除。
- 成功後送出 `window` 的 `focus` 事件，讓頁面重新抓商店與背包。

## DOM 掛鉤

頁面由 React 渲染，根節點是 `#travel-root`。

| 資料 | 選擇器 |
|---|---|
| 是否飛行中 | `body[data-traveling="true"]` |
| 是否住院 | `body[data-layout="hospital"]` |
| 航線 | Flight progress 文字開頭 `Torn to <國家>.` 為去程 |
| 現金、空格 | 訊息列 `have $<金額>`、`purchased <已買> / <上限>` |
| 商品列 | `[class*='stockTableWrapper___'] li` |
| 商品名稱 | `button[class*='itemNameButton___']` |
| stock | 含 `srOnly` 標籤 `stock` 的 `cell` |
| 價格 | `[class*='displayPrice']` |
| 商品 ID | `form#item-<ID>-form` |
| 背包格子 | `ul[aria-label^='Inventory'] > li button[aria-label]` |

- stock 格的完整選擇器：`[class*='cell___']` 中含 `[class*='srOnly___']` 且文字為 `stock` 的那一格。
- 訊息列的 `purchased` 計入帶出國的道具。

腳本改動的 DOM：

- 訊息列加 class `qp-active`，隱藏原文字。
- 訊息列加 class `qp-green`，綠色背景。
- 訊息列內附加 `span.qp-status`，顯示狀態。
- `#travel-root` 前面插入設定連結與表單 `div.qp-settings`。
- 整頁背景改 `document.body.style.backgroundColor`。

## 選擇器穩定性

- 背包格子的標籤 `"<名稱> slot N"` 保留原編號。
  - 用掉的格子從 DOM 移除，`N` 不等於位置。
  - 背包 DOM 只用來判斷有沒有帶賣出道具。
  - 格子 ID 一律讀 `step=inventory`。
- 背包 DOM 在使用道具後不會立刻更新。
- 去程途中 `body[data-abroad]` 已是 `"true"`，飛行判斷只看 `data-traveling`。
- 腳本不使用 TornTools 加上的 `data-tt-content-type` 屬性。
  - 沒裝 TornTools 也能運作。
- class 名稱帶雜湊後綴。
  - 一律用 `[class*='名稱___']` 子字串比對。
