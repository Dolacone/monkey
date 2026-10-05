# DESIGN

## REQ-001 — 三種頁面、三種 DOM 結構

Torn 在三個頁面用不同前端框架渲染裝備清單,腳本因此分成三條掃描路徑,而不是共用一套選擇器:

- Item Market(React,CSS Modules):加成資訊在 `i[data-bonus-attachment-title]` 與 `data-bonus-attachment-description` 屬性上。掛載容器抓 `[class*="baseItemTileWrapper"]`(前綴比對,不比對完整雜湊 class),因為 CSS Modules 產生的 class 尾碼會隨建置改變。
- Auction House(舊版 jQuery UI):加成資訊在 `title` 屬性,格式為 HTML 字串 `<b>名稱</b><br/>說明文字`。掛載容器是 `.item-cont-wrap`,此容器同時包住裝備圖片與加成 icon,結構上等同 React 版的「badge 疊在圖片右上角」。
- Faction Armoury(舊版 jQuery UI,表格式清單):同樣用 `title` 屬性存放加成資訊,但 `ul.bonuses` 是該列(`li`)底下與圖片 `div.img-wrap` 平行的兄弟節點,不是疊在圖片上。掛載容器因此改成該列的 `div.img-wrap`,而不是加成 icon 自己的父層。

三條路徑各自找出「容器 → 一組加成」的對應關係後,共用同一個 `renderOverlay()` 產生疊加文字,避免三份重複的渲染邏輯。

## REQ-002 — 疊加文字排版

疊加的 `<div>` 使用 `white-space: pre` + `width: max-content`,让每個加成固定佔一行、寬度依內容自動撐開,不受掛載容器寬度(Faction Armoury 只有 60px)限制而被瀏覽器換行成兩行。容器維持 `overflow: visible`,文字超出圖示範圍時不會被裁切。

最初實作誤用 `white-space: pre-line`(先設 `nowrap` 又覆蓋掉),`pre-line` 允許依 containing block 寬度換行,在 60px 的 Faction Armoury 圖示上把單一加成(如 "Impenetrable 23%")拆成兩行,兩個加成就變成四行,不符合「固定兩行」的需求,已改為 `pre` + `max-content` 修正。

## SPA 重新渲染

三個頁面都是 hash 路由 + AJAX 局部更新,不會整頁重新載入。腳本用 `MutationObserver` 監看 `document.body`(`childList` + `subtree`),搭配 150ms debounce 全頁重新掃描,並另外監聽 `hashchange` 作為保險。掃描前會先 `observer.disconnect()`、掃描完再重新 `observe()`,避免自己插入的疊加節點觸發新一輪 mutation 造成無窮迴圈。

`renderOverlay()` 每次都先移除容器內既有的 `.edb-bonus-overlay` 再視當前加成重建,不做增量比對,實作簡單且對目前的清單規模(數十到約 100 項)效能足夠。

## REQ-003 — 戰力值的封閉公式

戰力值不在瀏覽器裡跑蒙地卡羅模擬,改用期望值公式直接算出,沒有亂數、一頁上百件裝備也不會卡住頁面。公式與常數取自 torn-fight-simulator(`public/js/calc.js`)的戰鬥規則,固定情境之後:

- 雙方 maxDamage、Defense 減傷對每把武器都是同一個倍率,除以基準武器後抵消,所以公式裡沒有屬性絕對值。
- 命中率:我方 Speed 被動 44%、對手 Dexterity 被動 49%,比值代入 `hitChance()`,再用 `applyAccuracy()` 套上 Accuracy + merits 2 + Sight 1.75(有裝時)。Quicken 加進 Speed 被動;Sure Shot 換算成 `s + (1 - s) x 命中率`。
- 每次命中的期望傷害:爆擊部位表與非爆擊部位表依 crit 機率(20 + Laser 5 + Expose)加權,每個部位乘上 Sentinel 護甲減免 `1 - 覆蓋率 x 58 x (1 - Penetrate%) / PI 穿透 2 / 100`。Powerful/Specialist、部位加成、Deadeye(只加在爆擊部位)與 merits 10% 相加進同一個傷害百分比。
- 出手次數:`attackCounts()` 對「彈匣剩餘彈數 x 剩餘 reload 次數」做確定性的機率轉移,每次出手的消耗量是 Rate of Fire 均勻分布乘上 conservation 剩餘比例後的 stochastic rounding,跟模擬器同一套規則。25 回合內的期望出手次數給爆發戰力,打光為止的期望出手次數給續航戰力。
- Assassinate 只加在第 1 回合那一次出手;Blindside 只加在第一次命中,乘上「這段期間至少命中一次」的機率。
- 每把武器的 mod 不讀頁面,固定依 REQ-003 條件 13 的順序推導;Recoil Pad 與 Sight 的可裝類型、Nock Gun 例外取自 Torn wiki 的 Weapon Mod 頁面。

主武器表(類型、彈匣、Rate of Fire)取自 Torn wiki 的 Weapon 頁面(2026-10-05,用瀏覽器讀取;WebFetch 與 curl 都回應 403)。wiki 主武器共 43 把,排除 5 把 Dual 與 3 把活動武器後收錄 35 把。

蒙地卡羅模擬的誤差在這裡不存在,所以戰力值顯示原始整數,不四捨五入。

基準武器只能在 Items 頁面取得(其他三個頁面沒有「裝備中」的標記)。`item.php` 每次掃描先記錄基準再渲染,讓 Items 頁面本身的戰力值也用最新基準。用 `GM_getValue/GM_setValue` 而不是頁面的 `localStorage`,跟 properties 腳本保存 API key 的做法一致,腳本更新後仍保留。

## 測試涵蓋

`equip-display-bonus.test.js` 涵蓋 REQ-003 的計算規則(條件 4、5-7、9、11、12-13、15-20),內容見 `equip-display-bonus.test.md`。

公式另外跟 torn-fight-simulator 的蒙地卡羅結果逐一對照過 10 組武器與加成(Rifle、SMG + Sight + Quicken、Machine Gun、Shotgun + Blindside、Nock Gun 只裝 Laser、Specialist、Conserve、Assassinate、部位加成,各 40000 場),爆發與續航戰力最大誤差 0.43%,在模擬器本身的抽樣誤差範圍內。這個對照依賴另一個 repo,沒有放進自動化測試;測試檔只保留三個模擬器數值當回歸基準。

DOM 讀取與疊加顯示沒有自動化測試。REQ-003 已在真實頁面注入腳本手動驗證:Items 頁面記下裝備中的 Steyr AUG(74.93 / 54.66),Primary 分頁顯示基準武器的戰力值 並排除 Laser、Recoil Pad,Armor 分頁只顯示護甲加成;Item Market Primary 頁 60 件、Faction Armoury 47 件、Auction House 10 件都正確顯示戰力值第一行、加成接在下面;沒有加成的主武器只顯示戰力值;近戰與 Dual 武器沒有戰力值;不計入的加成帶 `+X`。

DOM 結構、SPA 重新渲染、CSS 排版屬於瀏覽器行為,沒有寫自動化測試,以下項目已在真實 Torn 頁面手動驗證:

- REQ-001:三個網址都能正確注入,且在 Item Market 排序切換、Faction Armoury 分頁籤切換(Weapons ↔ Armor)後,疊加內容正確更新且沒有殘留。
- REQ-002:武器與盔甲加成都能顯示;單一加成與多重加成(兩行)都正確;空白加成格未顯示疊加文字;疊加文字不換行、可超出圖示格子邊界。
