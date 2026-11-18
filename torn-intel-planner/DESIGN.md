# DESIGN

Module ids, request formats, and stored keys are in `torn-intel-priority.user.md`.

## REQ-001 — 優先組合來源

- 優先組合讀自 `localStorage` 的 `uipref_dp_favorites`，不讀 `/api/ui-prefs`。
  - `localStorage` 在 `document-start` 就能同步讀取。
  - `/api/ui-prefs` 要等網路回應。
- 每次排程都重新讀取，釘選變更在網站下一次排程時生效。

## REQ-001 — 單層排程

- priority 模式把所有優先組合的航班一次交給網站的 `planDay`，`objective` 設為 `profit`。

## REQ-001 — 已知限制：網站篩選

- 網站先套用 Departure Planner 的篩選，排程補丁才拿到候選航班。
  - 篩選條件：停用國家、停用類型、黑名單、only items、物品清單、每件最低利潤。
  - 被篩掉的釘選組合不會出現在面板和網站計畫。
- 釘選新組合時，網站篩選也要放行該國家和物品。
- 腳本不替換網站篩選函式。
  - 網站傳給篩選函式的 flight book 狀態，腳本因此讀不到。
  - DM 請求的 `flightBook` 固定送 `false`。

## REQ-002 — header 狀態

- 狀態讀自 `/api/foreign-stock/my-travel`，每 120 秒更新一次。
- 不在飛行中時，回應只有 `traveling: false` 和 `lastAction`，沒有所在地。
  - 人在國外、不在飛行中時，header 也顯示 `in Torn`。

## 測試範圍

- `torn-intel-priority.user.test.js` 涵蓋：優先組合比對、列表排序、$/h、DEST 縮寫、header 狀態文字。
- 以下在 torn-intel 實際頁面手動確認：
  - 模組補丁是否生效（`window.__tiPriority.patched`）。
  - 排程結果和面板版面。
