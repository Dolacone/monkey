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

## 測試涵蓋

DOM 結構、SPA 重新渲染、CSS 排版屬於瀏覽器行為,沒有寫自動化測試,以下項目已在真實 Torn 頁面手動驗證:

- REQ-001:三個網址都能正確注入,且在 Item Market 排序切換、Faction Armoury 分頁籤切換(Weapons ↔ Armor)後,疊加內容正確更新且沒有殘留。
- REQ-002:武器與盔甲加成都能顯示;單一加成與多重加成(兩行)都正確;空白加成格未顯示疊加文字;疊加文字不換行、可超出圖示格子邊界。
