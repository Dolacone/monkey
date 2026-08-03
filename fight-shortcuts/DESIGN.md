# DESIGN

## 幫派頁攻擊連結開新分頁（REQ-005）

從舊的獨立草稿 `tmp.js` 合併進來，原本用 `GM_openInTab(url, { active: true, insert: true })`，這次維持同一個 API，沒有換成 `window.open()`。

換成 `window.open()` 曾經考慮過，好處是不用額外申請 `@grant`，維持這個腳本一直以來 `@grant none` 的最小權限慣例。但 `window.open()` 能不能在真實使用者點擊觸發的事件裡開新分頁，取決於瀏覽器認不認這次呼叫是「使用者手勢」；直接呼叫（沒有手勢）已經證實會被擋（回傳 `null`），而透過瀏覽器自動化工具模擬的滑鼠點擊在這個環境裡完全沒有送達頁面的 `click` 事件，沒辦法藉此驗證「真人點擊」這條路徑安不安全。`GM_openInTab` 是 Tampermonkey 專門為了繞開這類限制設計的 API，`tmp.js` 原本就是用這個且應該實際用過，風險比賭 `window.open()` 低，所以改用 `@grant GM_openInTab`，捨棄最小權限慣例換取可靠性。

攔截的判斷條件（`href` 前綴 `/page.php?sid=attack`）完全照抄 `tmp.js` 的邏輯，沒有拿真實的戰爭/敵對幫派頁面核對過 DOM——目前沒有進行中的戰爭，找不到真實範例。這是唯一還沒驗證的部分，等使用者下次在戰爭中看到這類連結時需要回頭確認一次。

沒有自動化測試：`initFactionAttackNewTab()` 直接操作 `document` 上的真實點擊事件與 `GM_openInTab`，跟其餘進出頁面的功能一樣只能手動驗證，而且這次連手動驗證都做不到（見上一段）。

## 處置動作後自動關閉分頁（REQ-001）

用「CONTINUE 按鈕出現」當作 Q/W/E 動作已被系統確認的訊號，而不是等固定時間或比對結果文字（例如「You mugged ... and stole $...」），因為結果文字包含玩家名稱與金額等變數，且措辭是 mug 專屬的，換成 leave/hospitalize 就不成立；CONTINUE 按鈕的 wrapper selector (`[class*="dialogButtons"] button.torn-btn`) 剛好也是 Space 鍵已經在用的同一個 selector，延續既有慣例。

`window.close()` 能不能關掉「不是由 script 開啟」的分頁，原本是最大的可行性風險（Chrome 對這類分頁的關閉有限制）。在使用者自己手動開的攻擊分頁上實測過，`window.close()` 確實把分頁關掉了，這條路可行，不需要改 `@grant` 換 Tampermonkey 的其他 API。

CONTINUE 按鈕的結構只在 mug 結果畫面上實際核對過（`div.dialog___ .green___` > `div.dialogButtons___` > `button.torn-btn` 文字為 CONTINUE）；leave 跟 hospitalize 是否走同一個 dialog 元件、按鈕文字是否也是 CONTINUE，目前是假設沒有實測，需要使用者自己在下一次 leave / hospitalize 的結果畫面上確認。

沒有自動化測試：`fightKeypressHandler`、`watchForContinueAndClose`、`findContinueButton` 都直接操作真實按鈕與即時 DOM，跟其餘鍵盤快捷鍵一樣只能手動驗證。

## 裝備組切換器（REQ-004）

Space 循環與 z 快捷道具的實作都放在 `initLoadoutSwitcher()` 內部，沒有匯出給測試檔案。這幾個 helper（`getSlots` / `clickEquipButton` / `cycleToNextSlot` / `clickQuickItem`）操作的是即時 DOM 與 React 內部狀態（`current` class、按鈕 `disabled`），不是純函式，跟既有的 loadout 鍵盤對應邏輯一樣沒有自動化測試，改成在真實頁面上手動驗證：

- 循環邏輯 (REQ-004 條件 11) 在 `https://www.torn.com/item.php` 展開的 loadout 面板上，用 4 個實際存在的槽位手動觸發 `cycleToNextSlot()`，確認 0→1→2→3→0 正確 wrap-around。React 更新 `current` class 是非同步的，同一個 tick 內連續呼叫會讀到舊的 class；真實使用情境下按鍵之間有人的反應時間，不受影響。
- z 鍵目標選擇器 (REQ-004 條件 15) 用 `querySelector` 確認 `[class*="_quick-item_"][title="Blood Bag : O+"]` 能命中正確節點，但沒有實際點擊測試，因為會真的消耗一顆道具。改用 `title` 屬性而非巢狀的 `_name_` div 文字比對，因為 `title` 是完整項目名稱、屬性層級比文字節點更好比對。

`LOADOUT_KEYS` 的按鍵比對是大小寫敏感的（直接比對 `event.key`，沒有 `.toLowerCase()`），這是既有程式碼的既定行為，不是這次改動引入的。之前 `requirements/REQ-004-loadout-switcher.md` 誤寫成「不分大小寫」，已一併修正。
