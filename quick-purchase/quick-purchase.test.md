# quick-purchase.test.js

Tests for the pure rules in `quick-purchase.js`: `mergeSettings`, `settingsError`, `parseStock`, `isRestock`, `isOutbound`, `parseBar`, `abroadAction`, `packAction`, `pickOwned`, `packBody`, `findSlots`, `messageText`, `isTriggerKey`.

- The tests load them through the script's `module.exports` branch.
- DOM reading, clicking, requests, key suppression, color, and sound are not covered.
  - `DESIGN.md` records how they were checked.

Run with `node --test` in this folder.

## Coverage

- 設定合併（REQ-002 條件 1、3、6）：存的值優先，缺的鍵用預設值，空字串保留為空。
  - 非字串的值改用預設值。
- 設定檢查（REQ-002 條件 7）：賣出道具與目標商品相同時不能存，不分大小寫。
  - 兩者皆空時可以存。
- 留空跳過（REQ-002 條件 6）：目標商品留空時不出院、不購買，但仍賣出。
  - 出院道具留空時不出院。
- 名稱比對（REQ-002 條件 5）：找格子不分大小寫。
- 打包順序（REQ-003 條件 1）：入院道具、出院道具、填滿賣出道具，一次一樣。
  - 都完成時顯示已打包。
- 跳過（REQ-003 條件 4、REQ-002 條件 6）：被跳過或留空的道具改做下一步。
- 派系優先（REQ-003 條件 2）：入院與出院道具兩種都有時選派系的。
  - `disabled` 的項目視為沒有。
- 填滿只用自己的（REQ-003 條件 3）：只有派系的賣出道具時視為沒有。
- 打包 body（REQ-003 條件 2）：與原生 Add 按鈕送出的 body 相同。

- 補貨判斷（REQ-006 條件 1）：stock 從 0 變成大於 0 才觸發。
- 不觸發（REQ-006 條件 2）：以下情況都不觸發。
  - 其他玩家買走造成的減少。
  - 大於 0 之間的變動。
  - 0 到 0。
  - 讀不到 stock。
  - 把判斷改成「數字變了就觸發」，這個測試會先失敗。
- 第一次讀數（REQ-006 條件 3）：第一次讀到大於 0 就觸發。
  - 第一次讀到 0 或讀不到時不觸發。
- 住院等補貨（REQ-005 條件 1）：住院中 stock 為 0 或讀不到時不出院。
- 動作順序（REQ-005 條件 1、3）：出院、賣出、購買。
  - 出院成功後即使頁面仍標示住院，下一步也是賣出。
- 不在此國（REQ-005 條件 1）：目標不在商店時，不出院也不賣出。
- 賣出被拒（REQ-005 條件 4）：之後直接購買。
- 購買數量（REQ-005 條件 2）：取 stock、空格、現金可買數的最小值。
- 無法購買（REQ-005 條件 1）：背包已滿、沒有庫存、現金不足各自顯示原因。
- 訊息列解析（REQ-005 條件 2）：從 `have $<金額>` 與 `purchased <已買> / <上限>` 讀現金與空格。
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
