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
- `perHour` 與 `money`（REQ-002 條件 7）：該趟利潤除以 LEAVE 到 BACK 的時數，3 小時 $3M 顯示 `$1.0M`。
- `destOf`（REQ-002 條件 5）：`jap` 顯示 `JPN`，`haw` 顯示 `HAW`。
- `lineIndex`（REQ-005 條件 3、4，REQ-007 條件 3、4）：線放在 BUY 不晚於該時間的最後一列之後，沒有這種列時放在最前面，沒有時間時不放。
- `inFlight`（REQ-007 條件 6）：OC 時間在 LEAVE（含）到 BACK（不含）之間才標色。
- `statusText`（REQ-002 條件 17）：
  - 飛行中顯示目的地和抵達時間，例如 `Torn at 11:12`。
  - 不在飛行中顯示 `in Torn`。
  - 還沒讀到飛行狀態時不顯示。
