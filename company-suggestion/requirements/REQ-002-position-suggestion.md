# REQ-002 — 職位調整建議

## 情境

> 頁面上的 effectiveness 每天只算一次，調整職位後數字不會變，看不出每位員工現在最適合哪個職位。使用者要頁面直接標出每位員工的建議職位，並在職位選項上看到每個職位的預測 effectiveness。Manager 不動；週一到週五由換到 Trainer 後 effectiveness 高於 50 的最弱員工當 Trainer，週六、週日不放 Trainer；其餘員工依職位權重一次調到最佳配置。

## 行為

### 預測 effectiveness

1. 每位員工在每個職位的預測 effectiveness 依 `FORMULAS.md` 的 effectiveness 公式計算。
   - working stats 與 management 用頁面上即時的 Manual labor、Intelligence、Endurance 計算。
   - settled_in、book、merits、director_education、addiction、inactivity 沿用頁面上當天的值，不因職位改變。

### 目標 company day

2. 建議針對下一次 18:00 TCT rollover 開始的 company day。
   - 18:00 TCT 前打開頁面，目標是 TCT 日期的隔天。
   - 18:00 TCT 後打開頁面，目標是 TCT 日期的後天。

### Manager 與 Trainer

3. 目前在 Manager 職位的員工不調動。
4. Trainer 人選是 Manager 以外、預測 Trainer effectiveness 高於 50 的員工中，預測 Bartender effectiveness 扣掉 addiction 影響後最低的人。
5. 目標 company day 是週一到週五時，Trainer 人選建議換到 Trainer。
   - 原本在 Trainer 的其他員工加入職位配置。
6. 目標 company day 是週六、週日時，不放 Trainer，原本在 Trainer 的員工加入職位配置。

### 職位配置

7. 參與配置的員工是目前在 Barback、Bouncer、Disk-jockey、Bartender、Trainer 的人，換到 Trainer 的人選除外。
   - Promoter、Cleaner、Personal Assistant 的員工不調動。
8. 候選配置是 Barback、Bouncer、Disk-jockey 各 1 人，其餘參與者當 Bartender。
9. 一個配置的增益 = 每位參與者「職位權重 x 新職位預測 effectiveness」減去「職位權重 x 目前職位預測 effectiveness」的總和。
   - 職位權重使用 `FORMULAS.md` 的 4 組職位權重。
   - 目前在 Trainer 的員工，目前職位以 Bartender 計算。
10. 4 組權重的增益都大於 0 的候選配置中，建議使用中權重組增益最大的配置。
    - 沒有這樣的配置時，參與者維持目前職位，原本在 Trainer 的員工換到 Bartender。
11. Trainer 調動與職位配置的所有調動同時顯示。

### 顯示

12. 員工目前職位和建議職位不同時，職位下拉選單顯示 `目前職位 > 建議職位`，例如 `Bartender > Bouncer`；相同時維持原本的顯示。
    - 文字超出下拉選單寬度時允許被截斷。
13. 需要調動的員工，該列背景顯示紫色，桌面版與手機版都適用。
14. 職位下拉選單展開時，9 個 Nightclub 職位的選項後面顯示該員工在該職位的預測 effectiveness，例如 `Bartender(99)`。
    - `Unassigned` 選項維持原本的文字。
    - 頁面不顯示總表或其他額外文字。
