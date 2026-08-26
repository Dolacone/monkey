# pi-property-manager.test.js

測試登入玩家 ID 在桌面側欄與手機設定選單都能取得,因為缺少 ID 會讓腳本在建立表格前中止。負向案例防止房產列表中的其他玩家被誤認為登入玩家。樣式測試防止窄螢幕再次裁切表格欄位與操作連結。API key 測試固定 Torn PDA placeholder,避免腳本退回空值或包含實際 key。請求測試分別固定 Torn PDA 的標準 `fetch` 與桌面 `GM_xmlhttpRequest` 路徑。錯誤測試防止請求名稱、transport 訊息與 HTTP 狀態再次遺失。API v2 測試固定房產端點、巢狀擁有者欄位、總租期與剩餘天數。Happy 測試涵蓋完整 staff、部分 staff、無 staff 與排序。排序測試固定 Happy、Open、剩餘天數與總租期的優先級。續約測試固定 15 天、兩個預設租金與未知 Happy 的空白租金。
