# fight-shortcuts.test.js

Regression tests for `fight-shortcuts.js`, using hand-rolled fake jQuery/DOM objects (`loadScriptWithArmorDom` / `loadScriptWithLogDom`) instead of a full DOM library.

## Coverage

- 護甲覆蓋層（REQ-002）：只測「區塊延遲出現後重新渲染」這個非同步分支，防止 watcher 掛好後不會重新渲染的迴歸。
- 即時戰鬥日誌覆蓋層（REQ-003）：`parseLogEntry` 的各分支（miss / hit / crit / join / skip）、observer 只掛一次、批次重建覆蓋層都有覆蓋，防止解析規則或去重邏輯出現看起來合理但算錯的迴歸。
- 裝備組切換器（REQ-004）：沒有自動化測試。`initLoadoutSwitcher()` 內的函式沒有匯出，且依賴即時 DOM／React 狀態（`current` class、按鈕 `disabled`）。改動後的手動驗證方式與原因記錄在 `DESIGN.md`。
- 攻擊頁鍵盤快捷鍵（REQ-001）：沒有自動化測試，邏輯只是直接呼叫真實按鈕的 `click()`，只能手動驗證。
- 幫派頁攻擊連結開新分頁（REQ-005）：沒有自動化測試，也還沒手動驗證過——沒有進行中的戰爭可以核對真實 DOM，原因記錄在 `DESIGN.md`。
