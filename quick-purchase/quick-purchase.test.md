# quick-purchase.test.js

Tests for the pure rules in `quick-purchase.js` (`parseStock`, `isRestock`, `nextAction`), loaded through the script's `module.exports` branch. DOM reading, clicking, color, and sound are not covered; `DESIGN.md` records how they were checked.

Run with `node --test` in this folder.

## Coverage

- 補貨判斷（REQ-003 條件 1）：stock 從 0 變成大於 0 才觸發。
- 不觸發（REQ-003 條件 2）：其他玩家買走造成的減少、大於 0 之間的變動、0 到 0、讀不到 stock 都不觸發。把判斷改成「數字變了就觸發」會先失敗。
- 載入時（REQ-003 條件 3）：沒有前一次讀數時不觸發。
- 點擊順序（REQ-002 條件 1、2）：確認框打開時一律按 Yes，不看計數；沒有確認框時第 1 下是最大值、第 2 下是 Buy。
- stock 讀取：stock 格的文字含 `stock` 標籤與千分位逗號，解析成數字。
