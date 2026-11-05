# DESIGN

## REQ-001 — 只在 Nightclub 啟用

員工頁籤沒有顯示公司類型的文字，腳本改用職位下拉選單的選項判斷：選項扣掉 `Unassigned` 後剛好是 Nightclub 的 9 個職位才啟用。

腳本只改 jQuery UI selectmenu 的顯示層 `.ui-selectmenu-status`，原生 `select.employee-rank` 的值不動，因此 Submit Changes 送出的職位維持原值。

## REQ-002 — 預測公式

頁面上的 effectiveness 每天只計算一次，換職位後 `data-multipliers` 不會變。腳本因此不採用頁面上的 working_stats 與 management，改用即時 stats 重算；其餘 6 項跟職位無關，直接沿用。

- working stats 公式來自 Torn wiki，1.2 倍（BUS2110）與每項各自 floor 是用 API 員工資料比對得出的。
- management 公式來自 Night Club tracker 的 `management`，2026-10-24 至 11-05 的 effectiveness 明細全部吻合。所有明細的 Manager 都是同一人，換 Manager 後常數 115 是否不變沒有資料驗證。
- 職位需求寫死 Nightclub 的數值，不呼叫 API，腳本不需要 API key。

## REQ-002 — Trainer

Night Club tracker 只在 10 星安全差距達 99% 時才讓最弱者當 Trainer。這個判斷需要公司週收入與其他公司的排名，REQ-001 條件 4 禁止腳本發出 request，因此腳本一律建議最弱者當 Trainer；週末 tracker 把最弱者放回 Bartender 時，頁面會標出相反的建議。

## REQ-002 — 職位權重

4 組權重是 Night Club tracker 2026-11-05 的客人模型係數（`position_weights`），腳本寫死，不隨每日重新擬合更新。對調的增益先算每位員工的差，再相加，和 tracker 的 `assignment_gains` 相同，權重相同的模型才會得到剛好 0。

## REQ-002 — 紫色背景

紫色加在整個 `li` 上並用 `!important`，桌面版與手機版共用同一條 CSS 規則。

## 測試覆蓋

- 自動測試：REQ-001 條件 2，REQ-002 條件 1-16。見 `company-suggestion.test.md`。
- 手動檢查：REQ-001 條件 1、3、4、5，REQ-002 條件 17-20，在實際員工頁面注入腳本確認。
