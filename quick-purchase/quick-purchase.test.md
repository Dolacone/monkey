# quick-purchase.test.js

Tests for the pure rules in `quick-purchase.js`: `parseStock`, `isRestock`, `nextAction`, `isOutbound`, `findSlots`, `messageText`, `isTriggerKey`.

- The tests load them through the script's `module.exports` branch.
- DOM reading, clicking, requests, key suppression, color, and sound are not covered.
  - `DESIGN.md` records how they were checked.

Run with `node --test` in this folder.

## Coverage

- 補貨判斷（REQ-006 條件 1）：stock 從 0 變成大於 0 才觸發。
- 不觸發（REQ-006 條件 2）：以下情況都不觸發。
  - 其他玩家買走造成的減少。
  - 大於 0 之間的變動。
  - 0 到 0。
  - 讀不到 stock。
  - 把判斷改成「數字變了就觸發」，這個測試會先失敗。
- 第一次讀數（REQ-006 條件 3）：第一次讀到大於 0 就觸發。
  - 第一次讀到 0 或讀不到時不觸發。
- 海外三段點擊順序：確認框打開時一律按 Yes，不看計數。
  - 手機的數量面板打開時，一律按面板的 Buy。
  - 都沒打開時，第 1 下是最大值，第 2 下是 Buy。
- stock 讀取：stock 格的文字解析成數字。
  - 文字含 `stock` 標籤與千分位逗號。
- 去程判斷（REQ-004 條件 1、3）：`Torn to <國家>.` 才是去程。
  - 回程 `<國家> to Torn.` 與讀不到文字都不是去程。
- 找入院道具（REQ-004 條件 1、2）：依名稱找格子。
  - 跳過 `item: null` 的已用格子與其他道具。
  - 找不到時回傳空陣列。
- 回應文字（REQ-001 條件 12、13）：`useItem` 實際回應的 HTML 轉成純文字。
  - 冷卻秒數 13714 顯示為 `3h 48m`。
- 按鍵（REQ-001 條件 5）：`q`、`Q`、空白鍵觸發。
  - 其他按鍵不觸發。
- 輸入中（REQ-001 條件 6）：文字輸入框、文字區域、可編輯區域內不觸發。
  - 焦點在按鈕上仍觸發。
- 修飾鍵（REQ-001 條件 7）：Ctrl、Cmd、Alt、Shift 任一按住都不觸發。
- 長按（REQ-001 條件 8）：自動重複的按鍵不觸發。
