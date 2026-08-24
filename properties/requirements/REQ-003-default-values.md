# REQ-003 — 預設值與自動填值

## 情境

> 使用者不想在頁面上手動輸入 API key。API key 要寫死在腳本的設定區(跟 sample.js 一樣)。已經在租約中的房產,續約時要直接沿用該租約現有的條件。

## 設定區塊

1. 頁面上不提供任何輸入欄位(不再有 API key 輸入框)。
2. API key 寫在腳本檔案頂端的設定區(CONFIG SETTINGS),使用者要換 key 得直接編輯腳本。

## 續約沿用既有條件

3. 當房產目前為出租中(`rented` 不為 null)時,續約頁籤(offerExtension)的天數與租金輸入框,帶入這位房客(`rented.user_id`)上一次針對這間房產議定的天數與租金。這兩個數字向 Torn API 的 `user` 端點、`log` selection(`log=5943,5937`)取得,比對紀錄中的 `data.property_id` 與 `data.renter`,取相符紀錄的 `data.days` 與 `data.rent`。不使用 `total_cost / cost_per_day` 推算(該除法除不盡,`cost_per_day` 是四捨五入後的值,反推天數會有誤差)。
4. 若續約頁籤找不到第 3 條的歷史紀錄,欄位維持空白,交由使用者自行輸入。
5. 上架頁籤(lease)不自動填值,天數與租金一律由使用者自行輸入。
