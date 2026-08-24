# REQ-002 — 房產總覽表格

## 情境

> 使用者想在房產頁面看到自己所有 Private Island(PI)房產的統整表格,包含快樂值、出租狀態,以及能直接跳轉去續約或上架的連結。

## 行為

1. 腳本呼叫 Torn API 的 `user` 端點、`properties` selection,取得使用者可見的全部房產資料。
2. 表格只列出符合以下兩個條件的房產:owner_id 等於目前登入玩家的 player_id,且 property_type 為 13(Private Island)。不屬於自己的房產(例如配偶名下)不顯示。
3. 每一列顯示三個欄位:
   - happy:該房產目前的 happy 值。
   - 狀態:若 `rented` 不為 null,顯示「剩餘天數/原始總天數」(例如 `15/30 days`);若 `rented` 為 null,一律顯示 `Open`(不區分是否已上架市場,兩者在 API 回傳上無法區分)。
   - 連結:若 `rented` 不為 null,連結指向該房產的續約頁籤(`tab=offerExtension`);若 `rented` 為 null,連結指向該房產的上架頁籤(`tab=lease`)。
4. 表格顯示在 properties.php 的房產清單頁(URL 不含房產 ID 參數的頁面)。
5. 使用者進入單一房產詳情頁(lease 或 offerExtension 頁籤)時不重複顯示整份表格,但沿用同一份房產資料做自動填值(見 REQ-003)。
6. 列的排序依狀態分兩段,由上到下:Open 的房產在前,段內依 happy 由小到大排序;接著是出租中的房產,段內依剩餘天數由小到大排序。
7. 使用者以桌面或手機寬度載入或重新載入房產清單頁時,表格都會顯示。使用者可以查看全部欄位,並操作每列的連結。
