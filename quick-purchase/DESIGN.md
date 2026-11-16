# DESIGN

## 海外三段點擊 — 模擬點擊而不是直接送 request

購買的實際 request 是 travel bundle 的 RTK Query `buy` mutation：

```
GET /page.php?sid=travelData&step=buy&itemID=<ID>&amount=<n>&rfcv=<token>
```

- 腳本不直接呼叫它，改為點擊頁面上的按鈕。
- 這樣 Torn 自己的驗證照常運作。
  - 驗證項目：數量超過庫存、攜帶上限、金額。
- 確認框也照常出現。
- 購買後，React 自己更新庫存與訊息列。

## 海外三段點擊 — 點擊順序

- 確認框是否打開，直接看 DOM 判斷，不靠計數器。
- 計數器只區分「最大值」與「Buy」兩步。
- 確認框打開時，商品列被確認框整個取代。
  - 商品名稱與表單都消失。
  - 商品 ID 改從確認框問句比對。

## 海外三段點擊 — 手機排版

travel bundle 的 Buy 按鈕元件依排版渲染：

- 桌面版：`torn-btn` 文字 Buy。
- 手機版：`buyIconButton___` 購物車圖示。
- 兩者都是 `type=submit`，`form=item-<ID>-form`。
  - 表單的 `onSubmit` 切換 buy panel 開關。

buy panel 的內容依排版不同：

- 桌面版：直接是確認框。
- 手機版：先是數量面板 `amountPanel___`，按面板的 Buy 才換成確認框。
  - 數量面板的輸入框帶 `autoFocus`。
  - 腳本按下購物車 150ms 後，焦點在面板內就 `blur()`。

## 海外三段點擊 — 不捲動

- 確認框的 Yes 按鈕帶 `autoFocus`。
  - 彈出時，瀏覽器會把它捲進畫面。
- 每次點擊後 800ms 內，每個 animation frame 把捲動位置拉回點擊前的值。

## REQ-001 — 訊息列狀態文字

- 訊息列由 React 管理。
- 腳本不改它的文字節點。
  - 加 class，用 `font-size:0` 和 `display:none` 隱藏原文字。
  - 再附加自己的 `span`。
- React 之後更新金額時不會衝突。

## REQ-001 — 空白鍵與已取得焦點的按鈕

- 確認框的 Yes 帶 `autoFocus`。
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
- 按下 Yes 後，背景恢復成載入時的顏色。

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

## 測試覆蓋

- 自動測試：REQ-001 條件 5-8、12、13 的文字轉換，REQ-004 條件 1-3 的判斷規則，REQ-006 條件 1-3。
  - 見 `quick-purchase.test.md`。
- 手動檢查：
  - REQ-004 條件 1 的 request：使用者在飛往日本途中，以 console 送出相同的 `step=useItem`，回應 `success: true`，`body[data-layout]` 變成 `"hospital"`。
  - 海外三段點擊：使用者在開曼群島以 Bearer Bond 實測。
  - REQ-006 條件 4 的訊息列變綠：以 Stingray Plushie 庫存變動實測。
- 尚未實作：REQ-005，以及 REQ-001 條件 10、11 在海外的部分。
  - 海外目前仍是三段點擊。
- 尚未檢查：
  - 安裝成 Tampermonkey 腳本後，飛行中點擊訊息列入院。
  - 飛行中訊息列的狀態文字顯示。
  - 回程飛行的 Flight progress 文字格式。
  - 目標 Xanax 的實際補貨觸發、整頁變紅與提示音。
