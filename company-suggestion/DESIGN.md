# DESIGN

## REQ-001 — 只在 Nightclub 啟用

員工頁籤沒有顯示公司類型的文字，腳本改用職位下拉選單的選項判斷：選項扣掉 `Unassigned` 後剛好是 Nightclub 的 9 個職位才啟用。

腳本只改 jQuery UI selectmenu 的顯示層（`.ui-selectmenu-status` 與展開清單的 `li > a`），原生 `select.employee-rank` 的值與 option 文字不動，因此 Submit Changes 送出的職位維持原值。

## REQ-002 — 預測公式

頁面上的 effectiveness 每天只計算一次，換職位後 `data-multipliers` 不會變。腳本因此不採用頁面上的 working_stats 與 management，改用即時 stats 依 `FORMULAS.md` 重算；其餘 6 項跟職位無關，直接沿用。

- working stats 公式來自 Torn wiki。Night Club tracker 至 2026-11-22 的 297 筆員工紀錄，扣掉當天 job gain 後全部吻合 1.2 倍（BUS2110）與每項各自 floor。
- management 公式來自 Night Club tracker 的 `management`，51 組 (working stats, parts) 吻合 49 組。不吻合的 2 組都是 Trainer，`115 − s` 等於 69。所有紀錄的 Manager 都是同一人，換 Manager 後常數 115 是否不變沒有資料驗證。
- 職位需求寫死 Nightclub 的數值，不呼叫 API，腳本不需要 API key。

## REQ-002 — 目標 company day

effectiveness 在 18:00 TCT rollover 時計算，rollover 前的職位決定下一個 company day。company day 以結束當天的日期命名，和 tracker 的 `company_days`、`set_before` 相同。腳本用裝置時鐘的 UTC 時間（TCT = UTC）加 30 小時取星期，不發 request。

## REQ-002 — Trainer

Night Club tracker 依 10 星安全差距決定每天放不放 Trainer，這需要公司週收入與其他公司的排名，REQ-001 條件 4 禁止腳本發出 request。腳本改用固定規則：週一到週五的 company day 放 Trainer，週六、週日不放。模型的週六客人是平日 2.40 倍、週日 2.06 倍，Bartender 的每點價值在週末最高。

Trainer 人選沿用 tracker 的 `trainer_pick` 排序（Bartender 預測扣掉 addiction），加上 Trainer 預測高於 50 的門檻。

## REQ-002 — 職位權重

4 組權重是 Night Club tracker 以 2026-11-22 為止的資料擬合的客人模型係數（`position_weights`），腳本寫死在 `WEIGHT_SETS`，數值與 `FORMULAS.md` 相同，不隨每日重新擬合更新。第一組 bartender_vs_rest 是 holdout 誤差最低的使用中模型。

增益先把同一個權重值的 effectiveness 點數相加成整數，再乘權重。total_eff 這類權重全相同的模型，點數總和為 0 時增益剛好是 0，不會因浮點誤差變成正數。

## REQ-002 — 職位配置

配置列舉參與者中 3 個不同的人依序擔任 Barback、Bouncer、Disk-jockey，其餘 Bartender，共 n(n−1)(n−2) 種，10 名參與者是 720 種。增益最大的配置有多個時，取調動人數最少的。

「4 組權重都增益」與 tracker 的 `target_assignment` 相同。目前在 Trainer 的員工以 Bartender 計算目前職位：若以 0 計算，離開 Trainer 本身就帶來約 100 點增益，會讓 total_eff 判定為虧損的其他調動一起通過。沒有配置通過時，這名員工仍換到 Bartender。

## REQ-002 — 選項數值

Torn 用的是 Felix Nagel 版 jQuery UI selectmenu（有 `_refreshValue`、`_formatText`、`_selectedOptionLi`）。外掛在初始化時把原生 option 文字複製成 `div.ui-selectmenu-menu > ul#<id>-menu` 內的 `li > a`，按鈕 `a.ui-selectmenu` 的 `aria-owns` 指向這個 `ul`。腳本依 option 順序改寫 `li > a` 的文字。

使用者點選選項時，外掛把該 `li > a` 的 html 複製到 `.ui-selectmenu-status`，顯示會短暫變成 `Bartender(99)`；DOM 變動觸發重新計算後，狀態文字改回 `目前職位` 或 `目前職位 > 建議職位`。

外掛結構是 2026-11-23 從 torn.com 載入的外掛原始碼讀出的；當時的瀏覽器帳號開員工頁會被導到 Job Listing，沒有在員工頁面上看到實際清單。

## REQ-002 — 紫色背景

紫色加在整個 `li` 上並用 `!important`，桌面版與手機版共用同一條 CSS 規則。

## 測試覆蓋

- 自動測試：REQ-001 條件 2，REQ-002 條件 1-11，以及條件 14 的選項文字。見 `company-suggestion.test.md`。
- 手動檢查：REQ-001 條件 1、3、4、5，REQ-002 條件 12、13，在實際員工頁面注入腳本確認。
- 尚未在員工頁面確認：REQ-002 條件 14 的選項文字寫入展開清單。
