# torn-intel-priority.user.js

## 頁面範圍

- `@match https://torn-intel.com/*`
- `@run-at document-start`
  - 必須在網站的 Turbopack runtime 載入前執行。
- 面板只在 `location.pathname` 以 `/dashboard/stocks` 開頭時顯示。
- `@downloadURL` 與 `@updateURL` 指向 GitHub master branch 的 raw script。
  - Tampermonkey 依 `@version` 判斷更新。

## 進入點

- 啟動時把 `globalThis.TURBOPACK` 換成 getter/setter。
  - runtime 啟動前，`TURBOPACK` 是 Array，腳本包裝它的 `push`。
  - runtime 啟動後，把 `TURBOPACK` 換成 `{ push }` 物件，setter 再包裝一次。
- 每個 chunk 裡，模組 id 在補丁表中時，包裝該模組的 factory。
  - factory 呼叫 `ctx.s(exportList, id)` 時，腳本替換 export 函式。
  - 替換成功的項目以 `<模組 id>.<export 名稱>` 加入 `window.__tiPriority.patched`。
- 網站呼叫排程函式、而且候選中有優先組合航班時，腳本重算計畫，並在下一個 animation frame 重繪面板。
- `setInterval` 每 30 秒重繪面板。
- `setInterval` 每 120 秒重新讀取 DM 狀態和藥物冷卻。
- 面板的 shadow root 監聽 `change`（勾選框）和 `click`（按鈕）。

## 補丁表

| `patched` 項目 | 網站函式 | 補丁 |
|---|---|---|
| `249186.X` | planDay(args) | 排程補丁 |
| `249186.T` | buildCandidates(sources, opts) | 記錄攜帶量與提早抵達設定 |
| `249186.p` | checkTrips(trips, args, busy) | 可飛判斷補丁 |
| `168931.d` | applySourceFilters(sources, opts) | 目的地篩選補丁 |

- 腳本只替換格式為 `[名稱, 0, 函式]` 的 export 項目。
- 補丁名稱對應 `requirements/GLOSSARY.md`。

## 網站 API

| 路徑 | 方法 | 用途 |
|---|---|---|
| `/api/foreign-stock/flight-alerts` | GET | 讀 leave DM |
| `/api/foreign-stock/restock-alerts` | GET | 讀 restock DM |
| `/api/foreign-stock/plan-alerts` | POST | 設定一種 plan DM 的完整集合 |
| `/api/ui-prefs` | GET | 讀 `prefs.dp_plan_alert_lead` |
| `/api/shell` | GET | 讀 `session.playerId` |
| `/api/members/<playerId>/bars` | GET | 讀 `cooldowns.drug`（秒） |

- 只有 `source` 為 `plan`、而且有 `targetAt` 的提醒算 plan DM。
- `plan-alerts` 每次 POST 都會取代同一種的所有 plan DM。
  - 腳本送出時附上其他航班已設的 plan DM。
- `plan-alerts` 回應：
  - `flightAlerts`、`restockAlerts`：送出後的提醒集合。
  - `skippedOverCap`：大於 0 時顯示提醒上限訊息。
  - `alreadySent`：大於 0 時顯示 DM 已發出訊息。
  - status 409：腳本當成 Discord 未連結。

## 腳本改動的 DOM 與儲存

- `document.body` 附加一個 `position: fixed` 的 div，掛 open shadow root。
  - 面板的 HTML 與 CSS 都在 shadow root 內。
- `localStorage` 的 `tiPrioritySelection`：`{ manual, slots }`。
  - 每個 slot 以國家、物品、是否為立即航班、補貨時間比對航班。
- `window.__tiPriority`：腳本狀態，含 `patched`。

## 穩定性

- 模組 id 與 export 名稱是網站目前 build 的值。
  - 網站重新 build 後可能改變。
  - `window.__tiPriority.patched` 少於 4 項時，到網站新的 chunk 找回對應的模組與 export。
- 立即航班以航班 id 結尾為 `:now` 判斷。
