# equip-display-bonus.js

## 頁面範圍

- `https://www.torn.com/page.php?sid=ItemMarket` — Item Market,React 版清單
- `https://www.torn.com/factions.php` — Faction Armoury(軍火庫)頁籤
- `https://www.torn.com/amarket.php` — Auction House(拍賣行)

## 進入點

`document-idle` 時立即掃描一次全頁,之後靠 `MutationObserver`(監看 `document.body` 的 `childList`/`subtree`)偵測換頁、篩選、排序造成的重新渲染,debounce 150ms 後重新掃描。額外監聽 `hashchange`,因為三個頁面都用 hash 路由切換內容。

## DOM 掛鉤(逐頁面)

腳本內部把裝備清單分成三種 DOM 樣式處理,依序嘗試比對:

1. Item Market(React):`i[data-bonus-attachment-title]`,加成敘述在 `data-bonus-attachment-description`。掛載容器是最近的 `[class*="baseItemTileWrapper"]` 祖先(該容器已是 `position: relative`)。
2. Auction House 清單卡片:容器是 `.item-cont-wrap`(同時包住裝備圖片與加成 icon),裡面找有 `title` 屬性且格式為 `<b>名稱</b><br/>說明文字` 的節點。
3. Faction Armoury 清單列:加成 icon 在 `ul.bonuses`,但這個 `ul.bonuses` 是該列(`li`)的兄弟節點,不是疊在圖示上面 —— 腳本改抓同一列裡的 `div.img-wrap` 作為掛載容器。

## 選擇器穩定性注意事項

- React 頁面的 class 名稱(如 `baseItemTileWrapper___tV9VZ`)是 CSS Modules 產生的雜湊,重新部署後尾碼可能改變。腳本一律用 `[class*="baseItemTileWrapper"]` 做前綴比對,不比對完整 class 字串。
- 舊版頁面(Armoury、Auction House)的 `title` 屬性內容是純 HTML 字串,用正規表示式 `^<b>([^<]+)<\/b>\s*<br\s*\/?>\s*(.*)$` 解析,不假設額外空白或屬性順序。
- 空白加成格(裝備有加成欄位但未附加,如 `bonus-attachment-blank-bonus-25`)沒有 `data-bonus-attachment-title`/`title`,天然被過濾掉。

## 已知限制

- 依賴 Torn 現有的 `title`/`data-bonus-attachment-*` 屬性存放加成資訊;若 Torn 改版拿掉這些屬性(例如改成純 hover 觸發的 AJAX tooltip),疊加顯示會停止更新,需要重新確認 DOM。
- 疊加文字固定用小字體(9px)顯示在容器左上角,並用 `white-space: pre` + `width: max-content` 讓每個加成固定一行、寬度依內容自動撐開,不受容器寬度限制而換行。Faction Armoury 的圖示只有 60x32px,長名稱(如 "Impenetrable 23%")會超出圖示寬度,但因為容器 `overflow: visible`,文字不會被裁切或被迫換行。
