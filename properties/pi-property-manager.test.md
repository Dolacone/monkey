# pi-property-manager.test.js

測試登入玩家 ID 在桌面側欄與手機設定選單都能取得,因為缺少 ID 會讓腳本在建立表格前中止。負向案例防止房產列表中的其他玩家被誤認為登入玩家。樣式測試防止窄螢幕再次裁切表格欄位與操作連結。API key 測試固定 Torn PDA placeholder,避免腳本退回空值或包含實際 key。
