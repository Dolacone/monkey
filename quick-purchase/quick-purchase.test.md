# quick-purchase.test.js

Tests for the pure rules in `quick-purchase.js`, loaded through the script's `module.exports` branch.

- Requests, DOM reading, key suppression, color, and sound are not covered.
  - `DESIGN.md` records how they were checked.

Run with `node --test` in this folder.

## Coverage

- `withDefaults`（REQ-002 條件 4）：留空的欄位存成預設值，有填的欄位保留輸入。
- `packageSettings`（REQ-002 條件 5）：背包順序對應入院、出院、賣出道具，目標商品不變。
- `parseTargets`（REQ-002 條件 1）：目標商品欄位以逗號分隔，保留順序，去掉空白與空項目。
- `parseStock`：stock 格文字解析成數字，含 `stock` 標籤與千分位逗號。
- `isRestock`（REQ-006 條件 1）：第一次讀數大於 0、任何增加都觸發。
  - 減少與不變不觸發。
- `checkRestock`（REQ-006 條件 1）：任一目標商品補貨就觸發，各自和自己的上一次讀數比。
  - 其他目標商品減少不觸發。
  - 商店沒有該商品的列時，保留上一次讀數。
- `packStep`（REQ-003 條件 1）：入院道具、出院道具、填滿賣出道具，最後顯示已打包。
- `abroadStep`（REQ-005 條件 1）：
  - 住院中，有出院道具且任一目標有庫存才出院。
  - 不在醫院，先賣出，再在任一目標有庫存時購買。
  - 背包留有出院道具不影響購買。
- `buyPlan`（REQ-005 條件 1）：
  - 依順序選第一個有庫存的目標商品。
  - 數量取空格數與 stock 的較小值。
  - 沒有庫存或不在這間商店的目標商品被跳過。
- `pickOwned`（REQ-003 條件 2）：同名道具優先選派系的。
- `isLowCash`（REQ-003 條件 1、4）：現金低於 $1,000,000 擋下打包，剛好 $1,000,000 不擋。
  - 讀不到現金時不擋。
- `lowCashStep`（REQ-003 條件 5、6）：
  - 進入旅行社且現金不足時提醒，之後被擋的觸發不再提醒。
  - 現金回到 $1,000,000 以上時解除，仍不足時不解除。
- `messageText`（REQ-001 條件 11）：`useItem` 實際回應的 HTML 轉成純文字，冷卻 13714 秒顯示為 `3h 48m`。
- `isTriggerKey`（REQ-001 條件 5-8）：
  - `q`、`Q`、空白鍵觸發，其他按鍵不觸發。
  - 文字輸入框、文字區域、可編輯區域內不觸發，焦點在按鈕上仍觸發。
  - Ctrl、Cmd、Alt、Shift 任一按住都不觸發。
  - 自動重複的按鍵不觸發。
