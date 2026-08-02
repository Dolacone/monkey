# DESIGN

## 裝備組切換器（REQ-004）

Space 循環與 z 快捷道具的實作都放在 `initLoadoutSwitcher()` 內部，沒有匯出給測試檔案。這幾個 helper（`getSlots` / `clickEquipButton` / `cycleToNextSlot` / `clickQuickItem`）操作的是即時 DOM 與 React 內部狀態（`current` class、按鈕 `disabled`），不是純函式，跟既有的 loadout 鍵盤對應邏輯一樣沒有自動化測試，改成在真實頁面上手動驗證：

- 循環邏輯 (REQ-004 條件 11) 在 `https://www.torn.com/item.php` 展開的 loadout 面板上，用 4 個實際存在的槽位手動觸發 `cycleToNextSlot()`，確認 0→1→2→3→0 正確 wrap-around。React 更新 `current` class 是非同步的，同一個 tick 內連續呼叫會讀到舊的 class；真實使用情境下按鍵之間有人的反應時間，不受影響。
- z 鍵目標選擇器 (REQ-004 條件 15) 用 `querySelector` 確認 `[class*="_quick-item_"][title="Blood Bag : O+"]` 能命中正確節點，但沒有實際點擊測試，因為會真的消耗一顆道具。改用 `title` 屬性而非巢狀的 `_name_` div 文字比對，因為 `title` 是完整項目名稱、屬性層級比文字節點更好比對。

`LOADOUT_KEYS` 的按鍵比對是大小寫敏感的（直接比對 `event.key`，沒有 `.toLowerCase()`），這是既有程式碼的既定行為，不是這次改動引入的。之前 `requirements/REQ-004-loadout-switcher.md` 誤寫成「不分大小寫」，已一併修正。
