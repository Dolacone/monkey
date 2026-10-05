# equip-display-bonus.js

## 頁面範圍

- `https://www.torn.com/page.php?sid=ItemMarket` — Item Market,React 版清單
- `https://www.torn.com/factions.php` — Faction Armoury(軍火庫)頁籤
- `https://www.torn.com/amarket.php` — Auction House(拍賣行)
- `https://www.torn.com/item.php` — Items 頁面,另外讀取裝備中的主武器作為戰力值基準

## 進入點

`document-idle` 時立即掃描一次全頁(`item.php` 先記錄基準武器再渲染),之後靠 `MutationObserver`(監看 `document.body` 的 `childList`/`subtree`)偵測換頁、篩選、排序造成的重新渲染,debounce 150ms 後重新掃描。額外監聽 `hashchange`,因為三個頁面都用 hash 路由切換內容。

## DOM 掛鉤(逐頁面)

腳本內部把裝備清單分成四種 DOM 樣式處理,依序嘗試比對:

1. Item Market(React):`i[data-bonus-attachment-title]`,加成敘述在 `data-bonus-attachment-description`。掛載容器是最近的 `[class*="baseItemTileWrapper"]` 祖先(該容器已是 `position: relative`)。
2. Auction House 清單卡片:容器是 `.item-cont-wrap`(同時包住裝備圖片與加成 icon),裡面找有 `title` 屬性且格式為 `<b>名稱</b><br/>說明文字` 的節點。
3. Faction Armoury 清單列:加成 icon 在 `ul.bonuses`,但這個 `ul.bonuses` 是該列(`li`)的兄弟節點,不是疊在圖示上面 —— 腳本改抓同一列裡的 `div.img-wrap` 作為掛載容器。
4. Items 清單列:每列 `li[data-item]`,掛載容器是 `.title-wrap > .title`(開頭就是看得到的裝備圖片);`.thumbnail-wrap` 在桌面版是 `display:none`,不能掛。加成 icon 在同一列的 `.cont-wrap`。

戰力值需要的武器名稱、Damage、Accuracy,逐頁面讀取位置:

| 頁面 | 名稱 | Damage / Accuracy |
|---|---|---|
| Item Market | 卡片 `li` 內的 `[class*="name___"]` | `[aria-label$="damage points"]` / `[aria-label$="accuracy points"]` 的數字 |
| Auction House | 卡片 `li` 內的 `.item-name` | `.bonus-attachment-item-damage-bonus` / `.bonus-attachment-item-accuracy-bonus` 的下一個兄弟節點文字 |
| Faction Armoury | 該列的 `.name` | 同 Auction House,icon 在 `ul.bonuses` 內 |
| Items | 該列的 `.name`;基準武器取 `#primary-items li[data-equipped="true"]` | 同 Auction House |

掃描清單時不再只找帶加成的裝備:Item Market 掃全部 `[class*="baseItemTileWrapper"]`、Auction House 掃全部 `.item-cont-wrap`、Armoury 掃全部 `ul.bonuses`,讓沒有加成的主武器也能顯示戰力值。名稱不在腳本內建主武器表的裝備沒有戰力值。

基準武器以 JSON 字串存在 `GM_setValue('baselineWeapon')`,欄位是 `{ name, damage, accuracy, bonuses }`。

## 選擇器穩定性注意事項

- React 頁面的 class 名稱(如 `baseItemTileWrapper___tV9VZ`)是 CSS Modules 產生的雜湊,重新部署後尾碼可能改變。腳本一律用 `[class*="baseItemTileWrapper"]` 做前綴比對,不比對完整 class 字串。
- 舊版頁面(Armoury、Auction House)的 `title` 屬性內容是純 HTML 字串,用正規表示式 `^<b>([^<]+)<\/b>\s*<br\s*\/?>\s*(.*)$` 解析,不假設額外空白或屬性順序。
- 空白加成格(裝備有加成欄位但未附加,如 `bonus-attachment-blank-bonus-25`)沒有 `data-bonus-attachment-title`/`title`,天然被過濾掉。

## 已知限制

- 依賴 Torn 現有的 `title`/`data-bonus-attachment-*` 屬性存放加成資訊;若 Torn 改版拿掉這些屬性(例如改成純 hover 觸發的 AJAX tooltip),疊加顯示會停止更新,需要重新確認 DOM。
- 戰力值依賴武器名稱完全比對內建主武器表;Torn 改名或新增主武器時,該武器不會顯示戰力值,要更新表格。
- Items 頁面的 `title` 也包含 Laser、Recoil Pad 這類 mod,格式跟加成相同。腳本用 `WEAPON_MOD_RE` 比對 mod 名稱並排除,不顯示也不觸發 `+X`。
- Items 頁面每列只有 30px 高,三行疊加文字會壓到下一列的圖示上。
- 疊加文字固定用小字體(9px)顯示在容器左上角,並用 `white-space: pre` + `width: max-content` 讓每個加成固定一行、寬度依內容自動撐開,不受容器寬度限制而換行。Faction Armoury 的圖示只有 60x32px,長名稱(如 "Impenetrable 23%")會超出圖示寬度,但因為容器 `overflow: visible`,文字不會被裁切或被迫換行。
