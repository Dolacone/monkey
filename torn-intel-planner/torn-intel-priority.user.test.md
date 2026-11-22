# torn-intel-priority.user.test.js

Tests for the pure rules in `torn-intel-priority.user.js`, loaded through the script's `module.exports` branch.

- Module patching, planning through the site's `planDay`, DM requests, and panel DOM are not covered.
  - `DESIGN.md` records how they were checked.

Run with `node --test` in this folder.

## Coverage

- `pinsFrom`（REQ-001 條件 1）：網站釘選 `{ code, itemId }` 轉成國家 + 物品組合，沒有釘選時是空清單。
- `isPinned`（REQ-001 條件 1）：國家和物品都相同才算優先組合。
  - 同物品不同國家、同國家不同物品都不算。
- `byLeaveThenBack`（REQ-002 條件 9）：依 LEAVE 排序，LEAVE 相同時依 BACK 排序。
- `isProfitable`（REQ-002 條件 9）：該趟利潤大於 0 才列出，利潤為 0 或負數的航班不列。
- `profitText` 與 `money`（REQ-002 條件 7）：該趟利潤加上括號內的每小時利潤，3 小時 $3m 顯示 `$3.0m (1.0m/h)`，金額單位是小寫 `k`、`m`。
- `destOf`（REQ-002 條件 5）：`jap` 顯示 `JPN`，`haw` 顯示 `HAW`。
- `lineIndex`（REQ-005 條件 3、4，REQ-007 條件 3、4）：線放在 BUY 不晚於該時間的最後一列之後，沒有這種列時放在最前面，沒有時間時不放。
- `inFlight`（REQ-007 條件 6）：OC 時間在 LEAVE（含）到 BACK（不含）之間才標色。
- `statusText`（REQ-002 條件 17）：
  - 飛行中顯示目的地和抵達時間，例如 `Torn at 11:12`。
  - 人在國外顯示所在國家和最晚回程時間：Hawaii 的 WLT 在 14:25 出發顯示 `return at 15:28`，Japan 的 airstrip 顯示 `16:55`。
  - 人在 Torn 顯示 `in Torn`。
  - 還沒讀到飛行狀態時不顯示。
