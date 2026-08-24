# REQ-001 — 基本腳本設定

## 情境

> 使用者想要一個新的 Tampermonkey 腳本,只在 Torn 房產頁面運作,與現有的 sample.js(Easy Property Rent Extension)各自獨立,不修改或依賴它。

## 行為

1. 腳本以 Tampermonkey userscript metadata 宣告。
2. `@match` 涵蓋 `https://www.torn.com/properties.php*`。
3. 腳本是全新獨立檔案,不修改 sample.js,也不依賴 sample.js 的任何函式或狀態。
