# quick-purchase.test.js

Tests for the pure rules in `quick-purchase.js`, loaded through the script's `module.exports` branch.

- Requests, DOM reading, key suppression, color, and sound are not covered.
  - `DESIGN.md` records how they were checked.

Run with `node --test` in this folder.

## Coverage

- `packageSettings`（REQ-002 條件 5）：背包順序對應入院、出院、賣出道具，目標商品不變。
- `parseStock`：stock 格文字解析成數字，含 `stock` 標籤與千分位逗號。
- `isRestock`（REQ-006 條件 1）：第一次讀數大於 0、任何增加都觸發。
  - 減少與不變不觸發。
- `packStep`（REQ-003 條件 1）：入院道具、出院道具、填滿賣出道具，最後顯示已打包。
- `abroadStep`（REQ-005 條件 1）：
  - 住院中，有出院道具且目標有庫存才出院。
  - 不在醫院，先賣出，再在目標有庫存時購買。
  - 背包留有出院道具不影響購買。
- `pickOwned`（REQ-003 條件 2）：同名道具優先選派系的。
- `messageText`（REQ-001 條件 11）：`useItem` 實際回應的 HTML 轉成純文字，冷卻 13714 秒顯示為 `3h 48m`。
- `isTriggerKey`（REQ-001 條件 5-8）：
  - `q`、`Q`、空白鍵觸發，其他按鍵不觸發。
  - 文字輸入框、文字區域、可編輯區域內不觸發，焦點在按鈕上仍觸發。
  - Ctrl、Cmd、Alt、Shift 任一按住都不觸發。
  - 自動重複的按鍵不觸發。
