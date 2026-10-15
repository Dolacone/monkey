# DESIGN

## REQ-001 — 只在 Nightclub 啟用

員工頁籤沒有顯示公司類型的文字，腳本改用職位下拉選單的選項判斷：選項扣掉 `Unassigned` 後剛好是 Nightclub 的 9 個職位才啟用。

腳本只改 jQuery UI selectmenu 的顯示層 `.ui-selectmenu-status`，原生 `select.employee-rank` 的值不動，因此 Submit Changes 送出的職位維持原值。

## REQ-002 — 預測公式

頁面上的 effectiveness 每天只計算一次，換職位後 `data-multipliers` 不會變。腳本因此不採用頁面上的 working_stats 與 management，改用即時 stats 重算；其餘 6 項跟職位無關，直接沿用。

- working stats 公式來自 Torn wiki，1.2 倍（BUS2110）與每項各自 floor 是用 API 員工資料比對得出的，12 人中 11 人吻合，剩下 1 人是 stats 在當天計算後才增加。
- management 公式未知。`floor(0.84 * (100 - ws) ^ 0.795)` 是吻合全部觀察點的候選公式之一，ws 40-70 之間缺少資料點，預測可能偏差 1-2 分。
- 職位需求寫死 Nightclub 的數值，不呼叫 API，腳本不需要 API key。

## REQ-002 — 最佳配置

4 個單人職位窮舉所有排列（12 人時 11880 種），每種排列的 Bartender 總和用「全員 Bartender 總和 - 被選中者的 Bartender 值」算出。依單人職位總和、Bartender 總和、調動人數依序比較。

## REQ-002 — 紫色背景

紫色加在整個 `li` 上並用 `!important`，桌面版與手機版共用同一條 CSS 規則。

## 測試覆蓋

- 自動測試：REQ-001 條件 2，REQ-002 條件 1-7。見 `company-suggestion.test.md`。
- 手動檢查：REQ-001 條件 1、3、4、5，REQ-002 條件 8-11，在實際員工頁面注入腳本確認。
