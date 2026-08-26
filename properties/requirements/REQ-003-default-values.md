# REQ-003 — 預設值與自動填值

## 情境

> 使用者不想在頁面或腳本原始碼中輸入 API key。Torn PDA 使用 app 已設定的 API key,桌面 Tampermonkey 從腳本專屬 storage 讀取。房產續約一律使用 15 天,租金依排除 staff 加成後的 happy 套用可設定的預設值。

## 設定區塊

1. 頁面上不提供任何輸入欄位(不再有 API key 輸入框)。
2. Torn PDA 使用 `###PDA-APIKEY###` placeholder。Torn PDA 執行腳本前將它替換為 app 已設定的 API key。
3. 桌面 Tampermonkey 從腳本專屬 storage 讀取 API key。腳本更新後,已儲存的 key 保持不變。
4. 桌面 Tampermonkey 提供 `Set Torn API key` 選單命令。使用者確認輸入後,腳本儲存去除頭尾空白的值並重新載入頁面。使用者取消輸入時,既有值保持不變。
5. CONFIG SETTINGS 提供兩個可修改的續約租金預設值:happy 3725 預設為 9000000,happy 4225 預設為 13000000。

## 續約預設值

6. 當房產的 `status` 為 `rented` 時,續約頁籤(offerExtension)的天數一律填入 15。
7. 續約租金依 REQ-002 定義的 staff-free happy 套用 CONFIG SETTINGS 的對應預設值。
8. 若 staff-free happy 沒有對應的租金設定,租金欄位維持空白,交由使用者自行輸入。
9. 上架頁籤(lease)不自動填值,天數與租金一律由使用者自行輸入。
