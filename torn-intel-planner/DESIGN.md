# DESIGN

Module ids, request formats, and stored keys are in `torn-intel-priority.user.md`.

## REQ-001 — 優先組合來源

- 優先組合讀自 `localStorage` 的 `uipref_dp_favorites`，不讀 `/api/ui-prefs`。
  - `localStorage` 在 `document-start` 就能同步讀取。
  - `/api/ui-prefs` 要等網路回應。
- 每次排程和目的地篩選都重新讀取，釘選變更在網站下一次排程時生效。

## REQ-001 — 單層排程

- priority 模式把所有優先組合的航班一次交給網站的 `planDay`，`objective` 設為 `profit`。

## REQ-001 — 目的地篩選

- 網站篩選函式在模組 460344 的 export `d`。
- 腳本只讓釘選的國家略過「停用國家」條件。
  - 停用類型、黑名單、only items、物品清單、每件最低利潤，仍由網站篩選。

## REQ-002 — header 狀態

- 狀態讀自 `/api/foreign-stock/my-travel`，每 120 秒更新一次。
- 不在飛行中時，回應只有 `traveling: false` 和 `lastAction`，沒有所在地。
  - 人在國外、不在飛行中時，header 也顯示 `in Torn`。

## 測試範圍

- `torn-intel-priority.user.test.js` 涵蓋：優先組合比對、列表排序、$/h、DEST 縮寫、header 狀態文字。
- 以下在 torn-intel 實際頁面手動確認：
  - 模組補丁是否生效（`window.__tiPriority.patched`）。
  - 排程結果和面板版面。
