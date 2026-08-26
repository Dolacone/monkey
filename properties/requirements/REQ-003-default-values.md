# REQ-003 — 預設值與自動填值

## 情境

> 使用者不想在頁面上手動輸入 API key。Torn PDA 使用 app 已設定的 API key,桌面 Tampermonkey 使用者自行替換腳本中的 placeholder。房產續約一律使用 15 天,租金依排除 staff 加成後的 happy 套用可設定的預設值。

## 設定區塊

1. 頁面上不提供任何輸入欄位(不再有 API key 輸入框)。
2. 腳本檔案頂端的設定區(CONFIG SETTINGS)使用 `###PDA-APIKEY###` placeholder。Torn PDA 執行腳本前將它替換為 app 已設定的 API key。桌面 Tampermonkey 不替換它,使用者自行改成實際 API key。
3. CONFIG SETTINGS 提供兩個可修改的續約租金預設值:happy 3725 預設為 9000000,happy 4225 預設為 13000000。

## 續約預設值

4. 當房產的 `status` 為 `rented` 時,續約頁籤(offerExtension)的天數一律填入 15。
5. 續約租金依 REQ-002 定義的 staff-free happy 套用 CONFIG SETTINGS 的對應預設值。
6. 若 staff-free happy 沒有對應的租金設定,租金欄位維持空白,交由使用者自行輸入。
7. 上架頁籤(lease)不自動填值,天數與租金一律由使用者自行輸入。
