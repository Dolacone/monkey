# DESIGN.md

實作取捨與放棄過的做法紀錄,依 REQ 編號索引。REQ-002 條件 7 以桌面側欄與手機設定選單兩個登入玩家連結取得 player_id,避免窄螢幕不渲染桌面側欄時中止腳本。表格容器允許水平捲動,讓窄螢幕仍可存取全部欄位與連結。Node 測試涵蓋兩個登入玩家選擇器、誤抓其他玩家的負向案例,以及窄螢幕的水平捲動樣式。

REQ-003 條件 2 使用 Torn PDA 的 `###PDA-APIKEY###` placeholder。Torn PDA 注入 app 已設定的 key,桌面 Tampermonkey 使用者直接替換 placeholder。Node 測試固定 placeholder,避免更新時改回空字串或寫入實際 key。

REQ-002 條件 1 依執行環境選擇 HTTP transport。Torn PDA 的 `window.PDA_httpGet` 存在時,對 `api.torn.com` 使用標準 `fetch`;否則使用 Tampermonkey 的 `GM_xmlhttpRequest`。Torn PDA 3.15.0 的 `PDA_httpGet` 在 iOS 實測回傳 `undefined`,而 Torn PDA 官方 userscript 對相同 API 網域使用 `fetch`。兩條路徑共用回應解析與錯誤格式,避免 JavaScript `Error` 經 `JSON.stringify` 後只顯示 `{}`。Node 測試分別覆蓋兩條 transport、HTTP 狀態與錯誤內容。

## REQ-003:上架頁籤(lease)的自動學習預設值 — 已放棄

原本設計(2026-08-24 曾實作):使用者在上架頁籤按下 NEXT 送出後,腳本記錄當次天數/租金,依房產市值(`marketprice`)存成「已學習紀錄」,之後市值相近的房產開放上架時自動帶入。

放棄原因:抓不到「使用者送出」這個時機點。

- 上架與續約都是兩步驟流程:填天數/租金 → NEXT → 「Are you sure...」確認畫面 → 再一次 NEXT/SEND OFFER 才是真正送出。
- 第一版用 jQuery `.on('click')`(bubble 階段)掛在按鈕上,懷疑是 Torn 自己的處理常式呼叫 `stopImmediatePropagation()` 蓋掉,改成 capture 階段仍然抓不到。
- 第二版懷疑是 `#market` 容器在進入確認畫面時被整個重新掛載,導致舊監聽器失效,改成監聽掛在 `document` 上(不會被任何步驟重新掛載),實測後 `localStorage` 仍然完全沒有寫入。
- 兩次修正都在真實帳號上用「真的按下送出」驗證,其中一次上架後房產立刻被其他玩家真的租走,造成無法復原的真實遊戲後果。
- 修到第二次仍未解決,已經超過應該停下來回報的門檻,且找到根因需要進一步的真實送出測試才能繼續驗證,風險與已投入的除錯成本不成比例。最終由使用者決定整個功能撤掉,不再嘗試。

如果之後要重新嘗試這個功能,建議路線:先用合成(非使用者觸發)的 `dispatchEvent` 觸發按鈕點擊做隔離測試 — 瀏覽器不會對非信任事件執行 `<input type="submit">` 的預設動作(不會真的送出表單),但仍會呼叫透過 `addEventListener` 掛的監聽器,可以在不影響真實遊戲狀態的前提下確認監聽器本身有沒有被觸發,再決定要往「監聽沒掛上」或「掛上了但邏輯錯」哪個方向繼續查。這一步在放棄前一直沒有實際執行過。

保留的部分:REQ-003 續約頁籤(offerExtension)的自動填值(讀 activity log)已驗證正常運作,不受這次撤掉的影響。
