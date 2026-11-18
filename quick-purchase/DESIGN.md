# DESIGN

Selectors, request formats, and stored keys are in `quick-purchase.md`.

## REQ-001 — 直接送 request

- 每個動作直接送 travel bundle 用的 request，與 Torn Oracle 相同。
  - 確認框與手機的數量面板都不經過，兩種排版走同一條路徑。
- 背包內容每次觸發都重讀 `step=inventory`。
  - 背包 DOM 更新較慢。
- 每個動作結束後送出 `window` 的 `focus` 事件。
  - travel bundle 的 RTK Query 開了 `refetchOnFocus`，會重抓商店、背包與住院狀態。

## REQ-001 — 訊息列狀態文字

- 訊息列由 React 管理。
- 腳本不改它的文字節點。
  - 加 class，用 `font-size:0` 和 `display:none` 隱藏原文字。
  - 再附加自己的 `span`。
- React 之後更新金額時不會衝突。

## REQ-001 — 空白鍵與已取得焦點的按鈕

- 空白鍵 `keyup` 時，瀏覽器會點擊取得焦點的按鈕。
- 腳本在捕獲階段攔下觸發的 `keydown` 與對應的 `keyup`。
  - 兩者都呼叫 `preventDefault()` 與 `stopPropagation()`。
- 結果：一次按鍵只執行腳本的那一步，也不捲動頁面。

## REQ-002 — 設定存放

- 存在 torn.com 的 `localStorage`。
  - Tampermonkey 的 `GM_setValue` 需要 `@grant`，會讓腳本改在沙盒執行，讀不到 `window.addRFC`。
- 存檔時把所有目標商品的 stock 讀數重設，新的目標商品以第一次讀數判斷。
- `Load package` 把背包道具名稱去重後依序對應入院、出院、賣出道具。

## REQ-003 — 旅行社打包

- 打包 request 的格式取自頁面原生 Add 與 Fill 按鈕實際送出的內容。
- 旅行社沒有訊息列，腳本插一條在 React 管理的節點之外。

## REQ-003 — 現金不足

- 現金讀側欄 `#user-money` 的 `data-money`。
  - 每次觸發與每次 DOM 變動都重讀。
  - 讀不到時當成未知，不擋打包，也不提醒或解除。
- 「進入旅行社」是 `atAgency()` 由否轉是的那一次 DOM 變動，含頁面載入。
- 補貨提醒與現金不足提醒共用紅色背景。
  - 第一個提醒記下原本背景色。
  - 兩個提醒都解除後才恢復。

## REQ-006 — 補貨偵測

庫存變動有三個來源：

- WebSocket `travelShop` / `itemsUpdated` 推送。
- 視窗重新取得焦點或重新連線時，重抓 `step=shop`。
- 購買後重抓。

三者最後都改寫 stock 那一格，因此腳本監看 DOM，不只訂閱 WebSocket。

- 每個目標商品各自保留上一次的 stock 讀數。
- 商店沒有該商品的列時，保留上一次讀數，不算補貨。

## REQ-006 — 提示音

- 瀏覽器的自動播放限制要求使用者先在頁面上互動過。
  - `play()` 被擋時只記 console，不影響變色。
- 第一次讀數發生在頁面剛載入時，使用者通常還沒互動。
  - 這次的提示音最容易被擋。

## REQ-006 — 提醒中再次觸發

- 提醒尚未解除時再次觸發，不覆寫記下的原本背景色。

## 測試覆蓋

- 自動測試：見 `quick-purchase.test.md`。
- 手動檢查：
  - 打包 request 格式：使用者在旅行社以原生 Add、Fill 打包，頁面上的 fetch 監聽器記錄 body 與回應。
  - `step=useItem`：使用者在飛往日本途中以 console 送出，回應 `success: true`，`body[data-layout]` 變成 `"hospital"`。
  - 日本住院中讀 DOM：訊息列與商店列表仍在。
  - 出院、賣出、購買：使用者以 v1.2.0 在日本實際完成。
  - 現金來源：飛往日本途中，Chrome 旅行頁的 `#user-money` 有 `data-money="1390"`，與顯示的 `$1,390` 相同。
- 尚未檢查：
  - 設定面板與 `Load package`。
  - 旅行社點擊訊息列打包。
  - 飛行中點擊訊息列入院。
  - 出院後不重新整理頁面時，`body[data-layout]` 是否變回非住院。
  - 多個目標商品：任一補貨的提醒、依序購買、數量小於空格數的 `buy`。
  - 旅行社現金不足：進入時的提醒、擋下觸發、現金回到 $1,000,000 以上時恢復背景。
  - 不重新整理頁面時，`#user-money` 的 `data-money` 是否隨現金即時更新。
  - 手機版排版是否有 `#user-money`。
