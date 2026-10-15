# company-suggestion.js

## 頁面範圍

- `https://www.torn.com/companies.php` — 只在員工頁籤（`#/option=employees`）的列表出現時動作，其他頁籤找不到員工列表，腳本不做任何事。

## 進入點

`document-idle` 時執行一次，之後靠 `MutationObserver`（監看 `document.body` 的 `childList`、`subtree`、`characterData`）偵測頁籤切換、排版切換、職位變更造成的重新渲染，debounce 150ms 後重新計算。額外監聽 `hashchange`。重新計算前先 `observer.disconnect()`，寫完 DOM 再重新 `observe()`。

## DOM 掛鉤

每位員工是 `#employees ul.employee-list > li`，桌面版與手機版共用同一組節點：

| 資料 | 選擇器 |
|---|---|
| 三項 stats | `.acc-body .stats .span-cont` 內的 `.t-show:not(.bold)`，依序為 Manual labor、Intelligence、Endurance |
| effectiveness 明細 | `.effectiveness[data-multipliers]`，JSON 陣列 |
| 目前職位 | `select.employee-rank` 選中的 option 文字 |
| 顯示文字 | `.rank .ui-selectmenu-status`（jQuery UI selectmenu 的顯示層） |

腳本只改 `.ui-selectmenu-status` 的文字和 `li` 的 class，不動 `select.employee-rank` 的值。

## 選擇器穩定性

- `.stats` 的 `title` 屬性在手機版會被搬到 `data-title`，不能用來讀 stats。`.span-cont` 的完整數字兩種排版都有。
- `data-multipliers` 的順序為 `[working_stats, settled_in, book, merits, director_education, management, wrong_gender, addiction, inactivity]`。
