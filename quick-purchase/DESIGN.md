# DESIGN

## REQ-002 — 設定存放

- 存在 torn.com 的 `localStorage`。
  - 不需要 `@grant`，腳本維持在頁面環境執行，`window.addRFC` 可直接使用。
  - Tampermonkey 的 `GM_setValue` 需要 `@grant`，會讓腳本改在沙盒執行。
- 讀寫包在 `try/catch`。
  - 讀不到時用預設值。
- 道具名稱不檢查是否存在。
  - 沒有 API key，拿不到 Torn 的道具清單。
- 目標商品留空時，等補貨後出院與購買兩步都跳過，賣出照常。
- 改了目標商品後，下一次讀到的 stock 視為第一次讀數。

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

## REQ-006 — 補貨偵測

庫存變動有三個來源：

- WebSocket `travelShop` / `itemsUpdated` 推送。
- 視窗重新取得焦點或重新連線時，重抓 `step=shop`。
- 購買後重抓。

三者最後都改寫 stock 那一格，因此腳本監看 DOM，不只訂閱 WebSocket。

- 觀察到的推送只有庫存減少。
- 補貨是否也即時推送，尚未觀察到。
  - 沒推送時，要等重抓才會觸發。

## REQ-006 — 提示音

- 沿用 crime-pickpocket 的 mp3。
- 瀏覽器的自動播放限制要求使用者先在頁面上互動過。
  - `play()` 被擋時只記 console，不影響變色。
- 第一次讀數發生在頁面剛載入時，使用者通常還沒互動。
  - 這次的提示音最容易被擋。

## REQ-006 — 提醒中再次觸發

- 提醒尚未解除時再次觸發，不覆寫記下的原本背景色。
- 購買成功後，背景恢復成載入時的顏色。

## REQ-003 — 旅行社直接送 request

- 打包與填滿直接送 request，格式取自頁面原生 Add 與 Fill 按鈕實際送出的內容。
  - 派系 A+：`addSlotItem {"itemID":732,"factionItem":"1"}`。
  - 自己的 O+：`addSlotItem {"itemID":738}`。
  - Speed：`fillSlotItems {"itemID":204}`，回應 `Added x36 Speed.`。
- 旅行社判斷讀 `body[data-country="torn"]` 加上背包面板存在。
- 已打包的道具與空格讀 `step=inventory`。
  - 空格 = `item: null` 的格子數。
- 擁有的道具讀 `step=searchItem`，不需要 API key。
- 頁面沒有訊息列，腳本自己插一條在 `#travel-root` 前面。
  - 插在 React 管理的節點之外。
- 跳過的步驟記在記憶體，重新載入頁面後清掉。

## REQ-004 — 飛行中直接送 request

- 飛行中的背包沒有頁面上的單鍵使用按鈕。
  - 點格子只打開 Use / Sell / Send / Trash / View 選單。
- 腳本直接送 `step=useItem`，body `{"slotID": <ID>}`，與 Torn Oracle 相同。
- 格子由 `step=inventory` 依道具名稱找出。
  - 用掉的格子在陣列中保留，`item` 為 `null`。
  - DOM 的 `slot N` 標籤保留原編號，不能當位置用。
- 去程判斷讀 Flight progress 文字的開頭 `Torn to `。
- 是否飛行中讀 `body[data-traveling]`。
  - 去程途中 `body[data-abroad]` 已是 `"true"`，不能用它判斷海外。
- 入院後 `body[data-layout]` 即時變成 `"hospital"`。

## REQ-005 — 海外直接送 request

- 出院、賣出、購買都直接送 request，與 Torn Oracle 相同。
  - 確認框與手機的數量面板都不經過。
  - 兩種排版走同一條路徑。
- 判斷順序寫在 `abroadAction`，只吃讀好的數值，方便測試。
- 住院判斷讀 `body[data-layout]`。
  - 出院成功後記一個旗標，下一次點擊不等頁面更新就視為已出院。
  - 旗標在重新載入頁面後清掉，之後以頁面標示為準。
- 現金與空格讀訊息列。
  - `purchased <已買> / <上限>` 計入帶出國的道具，空格 = 上限 - 已買。
- 有沒有帶賣出道具先看背包 DOM，避免每次購買前多一個 request。
  - DOM 更新較慢，因此賣出前再讀 `step=inventory`。
  - `step=inventory` 已沒有賣出道具時，同一次點擊改走購買。
- 賣出以第一格的 `slotID` 加上數量 `amount` 一次送出。
- `item.isSellable === false` 時不送 request，直接視為被拒。
- Torn 有回應但失敗時視為被拒；連不上 Torn 時下次點擊重試賣出。
- 每次成功後送出 `window` 的 `focus` 事件。
  - travel bundle 的 RTK Query 開了 `refetchOnFocus`，會重抓商店與背包。

## 測試覆蓋

- 自動測試：見 `quick-purchase.test.md`。
  - REQ-001 條件 5-8，條件 12、13 的文字轉換。
  - REQ-002 條件 1、3、5、6、7 的設定合併、名稱比對、留空跳過、存檔檢查。
  - REQ-003 條件 1-4 的打包順序、跳過、派系優先、打包 body。
  - REQ-004 條件 1-3 的判斷規則。
  - REQ-005 條件 1-4 的判斷順序、購買數量、訊息列解析。
  - REQ-006 條件 1-3。
- 手動檢查：
  - REQ-003 的 request 格式：使用者在旅行社以原生 Add、Fill 打包，頁面上的 fetch 監聽器記錄 body 與回應。
  - REQ-004 條件 1 的 request：使用者在飛往日本途中，以 console 送出相同的 `step=useItem`，回應 `success: true`，`body[data-layout]` 變成 `"hospital"`。
  - 日本住院中讀 DOM：訊息列與商店列表仍在，`Speed` 的 `isSellable` 為 `true`，訊息列 `purchased 37 / 38` 計入帶出國的道具。
  - REQ-006 條件 4 的訊息列變綠：以 Stingray Plushie 庫存變動實測。
- 尚未檢查：
  - 安裝成 Tampermonkey 腳本後的整體流程。
  - 設定面板的顯示與存檔。
  - 旅行社點擊訊息列打包。
  - `step=sellItem` 與 `step=buy` 的實際回應。
  - 出院道具在醫療冷卻約 3 小時 48 分時能否使用。
  - 出院後 `body[data-layout]` 是否即時變回。
  - 回程飛行的 Flight progress 文字格式。
  - 目標 Xanax 的實際補貨觸發、整頁變紅與提示音。
