# REQ-002 — 房產總覽表格

## 情境

> 使用者想在房產頁面看到自己所有 Private Island(PI)房產的統整表格,包含快樂值、出租狀態,以及能直接跳轉去續約或上架的連結。

## 行為

1. 腳本呼叫 Torn API v2 的 `/user/properties` 端點,取得使用者可見的全部房產資料。
2. 表格只列出符合以下兩個條件的房產:`owner.id` 等於目前登入玩家的 player_id,且 `property.id` 為 13(Private Island)。不屬於自己的房產(例如配偶名下)不顯示。
3. 每一列顯示三個欄位:
   - happy:顯示房產設施與改裝提供的 happy,不包含目前 staff 提供的加成。未聘用 staff 時,顯示 API 的 `happy` 原值。
   - 狀態:若 `status` 為 `rented`,使用 `rental_period_remaining` 與 `rental_period` 顯示「剩餘天數/總租期」(例如 `28/30 days`);其他狀態一律顯示 `Open`。
   - 連結:若 `status` 為 `rented`,連結指向該房產的續約頁籤(`tab=offerExtension`);其他狀態連結指向該房產的上架頁籤(`tab=lease`)。
4. 表格顯示在 properties.php 的房產清單頁(URL 不含房產 ID 參數的頁面)。
5. 使用者進入單一房產詳情頁(lease 或 offerExtension 頁籤)時不重複顯示整份表格,但沿用同一份房產資料做自動填值(見 REQ-003)。
6. 列依以下優先級排序,數值皆由小到大:
   - 先比較排除 staff 加成後的 happy。
   - happy 相同時,`Open` 排在出租中房產之前。
   - happy 相同且皆為出租中時,先比較 `rental_period_remaining`,再比較 `rental_period`。
7. 使用者以桌面或手機寬度載入或重新載入房產清單頁時,表格都會顯示。使用者可以查看全部欄位,並操作每列的連結。
