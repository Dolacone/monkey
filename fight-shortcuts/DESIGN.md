# DESIGN

## 攻擊連結開新分頁（REQ-005）

從舊的獨立草稿 `tmp.js` 合併進來，原本用 `GM_openInTab(url, { active: true, insert: true })`，維持同一個 API，沒有換成 `window.open()`。

換成 `window.open()` 曾經考慮過，好處是不用額外申請 `@grant`，維持這個腳本一直以來 `@grant none` 的最小權限慣例。但 `window.open()` 能不能在真實使用者點擊觸發的事件裡開新分頁，取決於瀏覽器認不認這次呼叫是「使用者手勢」；直接呼叫（沒有手勢）已經證實會被擋（回傳 `null`），而透過瀏覽器自動化工具模擬的滑鼠點擊在這個環境裡完全沒有送達頁面的 `click` 事件，沒辦法藉此驗證「真人點擊」這條路徑安不安全。`GM_openInTab` 是 Tampermonkey 專門為了繞開這類限制設計的 API，`tmp.js` 原本就是用這個且應該實際用過，風險比賭 `window.open()` 低，所以改用 `@grant GM_openInTab`，捨棄最小權限慣例換取可靠性。

攔截的判斷條件（`href` 前綴 `/page.php?sid=attack`）已經在 `https://www.torn.com/profiles.php?XID=...` 的真實 Attack 按鈕上核對過，是真的 `<a>` 標籤，`getAttribute('href')` 原始值符合前綴。還沒拿真實的戰爭/敵對幫派頁面核對過，等使用者下次在戰爭中看到這類連結時可以再確認一次。

原本這個功能只在 `factions.php` 生效，`initFactionAttackNewTab()` 綁在該頁面的分支裡。這次放寬成整個 `https://www.torn.com/*` 都適用（因為真實的 Attack 按鈕其實散落在 `profiles.php` 等好幾種頁面，不只 `factions.php`），所以連 `@match` 也從三條具體路徑改成單一的 `https://www.torn.com/*`，函式改名成 `initAttackLinkNewTab()`，並移到 IIFE 最前面無條件呼叫，跟後面的 item.php／攻擊頁分支完全獨立，不共用任何狀態。

放寬 `@match` 到整站的最大風險是：原本攻擊頁專屬的邏輯（`document.body` 背景變棕色、全域 `keypress` 監聽、`analyzeDefenderArmor`）如果繼續用同一個 else 分支接住「所有不是 item.php 的頁面」，就會在全站每個頁面上跑，包括在文字輸入框打字時被 `fightKeypressHandler` 的 B 鍵（無條件 `window.location.href` 導頁）攔截。已經改成明確判斷 `location.pathname` 是 `/page.php` 且 query string 的 `sid` 精確等於 `attack` 才會進入這段邏輯，跟原本 `@match` 限定單一頁面時的精確度一致（用 node 手動跑過 `sid=missions`、`sid=gym` 等鄰近案例確認不會誤判）。

沒有自動化測試：`initAttackLinkNewTab()` 直接操作 `document` 上的真實點擊事件與 `GM_openInTab`，跟其餘進出頁面的功能一樣只能手動驗證，而且連手動驗證都還沒做完整（見上一段的戰爭頁面部分）。

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
