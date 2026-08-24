# pi-property-manager.js

行為以 `requirements/REQ-001` 至 `REQ-003` 為準。放棄過的做法與技術原因記在 `DESIGN.md`。本檔案只記錄腳本如何運作。

## 頁面範圍與進入點

- `@match https://www.torn.com/properties.php*`。
- 頁面是 SPA,切換頁籤不會整頁刷新,靠 `MutationObserver` 監控 `#properties-page-wrap` 的子節點變化,搭配 500ms debounce 後重新判斷目前頁面狀態。
- 目前頁面狀態由 URL hash 判斷,格式為 `#/p=options&ID=<propertyId>&tab=<tab>`:
  - hash 無 `tab` 參數(清單頁):顯示總覽表格。
  - `tab=offerExtension`:自動填續約表單。
  - `tab=lease`:不處理,天數/租金一律由使用者自行輸入(見 `DESIGN.md`)。

## DOM 掛勾與選擇器

- 表格插入點:`#properties-page-wrap .content-title.m-bottom10`(插在其後)。
- 玩家 ID 來源:桌面寬度使用 `#sidebarroot a[href*="profiles.php?XID="]`,手機寬度使用 `.settings-menu a[href*="profiles.php?XID="]`,從 href 取出 XID。兩個選擇器都限定在登入玩家區域,避免抓到房產列表或論壇動態列的其他玩家。
- 續約表單輸入框:`input.offerExtension.input-money[data-name="offercost"]`(租金)、`input.offerExtension.input-money[data-name="days"]`(天數)。同一個 `data-name` 底下同時有 `type="text"`(顯示用)與 `type="hidden"`(送出用)兩個 input,只能寫 `type="text"` 那個。
- 送出按鈕:續約表單為 `.offerExtension-form input[type="submit"]`,預設是 `disabled`,填完值後需手動移除。
- 總覽表格是純自製的 `<table>`,搭配 `GM_addStyle` 寫死的深色主題 CSS,不依賴 Torn 任何頁面專屬 class。表格容器在窄螢幕允許水平捲動,避免欄位或操作連結被裁切。

## 寫入 input-money 元件的方式

Torn 的金額輸入框(`input-money`)是「顯示用文字框 + 隱藏送出用欄位」的組合,兩者靠元件自己的 JS 監聽同步。用 jQuery `.val()` 直接改值不會觸發同步,隱藏欄位仍是空的,送出會失敗。必須改用原生 setter(`HTMLInputElement.prototype.value` 的 setter)寫入顯示用欄位,再手動 dispatch `input` 與 `change` 事件,隱藏欄位才會跟著更新。此寫法已在 2026-08 於實際頁面驗證過。

## 資料來源

- 房產清單:Torn API `user?selections=properties`。
- 續約金額/天數的歷史紀錄:Torn API `user?selections=log&log=5943,5937`,比對 `data.property_id` 與 `data.renter`。
- API key 位於腳本頂端的 CONFIG SETTINGS 區塊(`const apikey`)。預設值是 `###PDA-APIKEY###`,Torn PDA 在執行前替換成 app 已設定的 API key。桌面 Tampermonkey 使用者自行把 placeholder 改成實際 API key。API key 不存在 localStorage,頁面也不提供輸入欄位。
- Torn PDA 以 `PDA_httpGet` 的存在判斷 app 環境,但對 `api.torn.com` 使用標準 `fetch`。桌面 Tampermonkey 使用 `GM_xmlhttpRequest`。請求失敗時顯示 selection、錯誤型別與訊息。

## 已知限制

- `rented` 為 `null` 時無法區分「已上架市場」與「完全未上架」,兩者在 API 回傳上長得一樣(REQ-002 已明確採用不區分的做法)。
- 續約狀態欄位若在活動紀錄中找不到對應的歷史筆數(例如記錄超出 API 可查詢範圍),會退回用 `total_cost / cost_per_day` 四捨五入估算原始天數,估算值可能有誤差。
- 上架頁籤(lease)不自動填值,詳見 `DESIGN.md` 的 REQ-003 章節。

## 曾經試過但放棄的做法:借用 Torn 的 rental market class

一度改成套用 Torn 自己在 `properties.php?step=rentalmarket` 頁面用的清單 class(`users-list-title` / `icons.users-list.rental` / `happiness-b` 等),外觀確實能做到跟站方一致。但這些 class 的樣式規則(例如 `.properties-market .users-list-title .happiness-b`)只在 rental market 那個 step 才會載入對應的 CSS,總覽表格實際顯示的位置是清單頁(`properties.php`,無 `step` 參數),那裡完全沒有這包樣式,整排會直接崩成一行純文字。已在 2026-08-24 於兩個頁面各自實測確認差異。因為表格必須顯示在清單頁(REQ-002 #4),這個做法無法用,改回自製 `<table>` + 深色 CSS。
