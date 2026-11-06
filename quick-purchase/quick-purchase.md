# quick-purchase.js

## 頁面範圍

- `https://www.torn.com/page.php?sid=travel` — 只在海外、頁面有訊息列 `.info-msg-cont .msg` 與商店列表時動作。在 Torn 城內這個網址是 Travel Agency，沒有訊息列，腳本不做任何事。

## 進入點

- `document-idle` 時執行一次。
- `MutationObserver` 監看 `document.body` 的 `childList`、`subtree`、`characterData`，每次變動重新讀目標商品的 stock，並在提醒中重新把綠色 class 加回訊息列。
- `document` 的 `click`（捕獲階段），點擊落在訊息列內時執行下一步購買動作。

## DOM 掛鉤

商店列表是 React（`#travel-root`），每個商品是 `[class*='stockTableWrapper___'] li`：

| 資料 | 選擇器 |
|---|---|
| 商品名稱 | `button[class*='itemNameButton___']` |
| stock | `[class*='cell___']` 中含 `[class*='srOnly___']` 文字為 `stock` 的那一格 |
| 商品 ID | `form#item-<ID>-form` |
| 最大值箭頭 | `form#item-<ID>-form .input-money-symbol` |
| 數量 | `form#item-<ID>-form input[placeholder='Qty']` |
| Buy 按鈕 | `button[type='submit'][form='item-<ID>-form']` |
| 確認框 | `#item-<ID>-buyPanel [class*='confirmPanel___']` |
| 確認框問句 | `#item-<ID>-buyPanel [class*='confirmQuestion___']` |
| Yes 按鈕 | `#item-<ID>-buyPanel button[class*='yes___']` |
| 購買結果 | `#item-<ID>-buyPanel [class*='buyResultMessage___']` |

腳本對訊息列加 class `qp-active`（隱藏原文字）、`qp-green`（綠色背景），並在裡面附加 `span.qp-status` 顯示狀態；整頁背景改 `document.body.style.backgroundColor`。

## 選擇器穩定性

- 確認框打開時，該商品的 `li` 只剩 `#item-<ID>-buyPanel`，名稱、stock、表單都不在 DOM 中。商品 ID 改由確認框問句 `<數量>x <名稱>` 比對取得。
- 不使用 TornTools 加上的 `data-tt-content-type` 屬性，沒裝 TornTools 也能運作。
- class 名稱帶雜湊後綴，一律用 `[class*='名稱___']` 子字串比對。
