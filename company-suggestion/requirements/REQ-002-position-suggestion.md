# REQ-002 — 職位調整建議

## 情境

> 頁面上的 effectiveness 每天只算一次，調整職位後數字不會變，看不出每位員工現在最適合哪個職位。使用者要腳本先算出一套全公司的最佳職位，再照著改下拉選單；下拉選單的選擇和這套職位不同時（例如設了兩個 Barback），該列要有提示。職位選項上要看到每個職位的預測 effectiveness。Manager 不動；週一到週五由換到 Trainer 後 effectiveness 高於 50 的最弱員工當 Trainer，週六、週日不放 Trainer；其餘員工依職位權重排成分數最高的配置。

## 行為

### 預測 effectiveness

1. 每位員工在每個職位的預測 effectiveness 依 `FORMULAS.md` 的 effectiveness 公式計算。
   - working stats 與 management 用頁面上即時的 Manual labor、Intelligence、Endurance 計算。
   - settled_in、book、merits、director_education、addiction、inactivity 沿用頁面上當天的值，不因職位改變。

### 目標 company day

2. 建議針對下一次 18:00 TCT rollover 開始的 company day。
   - 18:00 TCT 前打開頁面，目標是 TCT 日期的隔天。
   - 18:00 TCT 後打開頁面，目標是 TCT 日期的後天。

### 建議職位的基準

3. 建議職位依已儲存的職位計算，使用者在下拉選單改選職位時，建議職位不變。
   - 已儲存的職位是員工頁載入時下拉選單的職位。

### Manager 與 Trainer

4. 已儲存職位是 Manager 的員工，建議職位是 Manager。
5. Trainer 人選是已儲存職位不是 Manager、預測 Trainer effectiveness 高於 50 的員工中，預測 Bartender effectiveness 扣掉 addiction 影響後最低的人。
6. 目標 company day 是週一到週五時，Trainer 人選的建議職位是 Trainer。
   - 已儲存職位是 Trainer 的其他員工加入職位配置。
7. 目標 company day 是週六、週日時，不放 Trainer，已儲存職位是 Trainer 的員工加入職位配置。

### 職位配置

8. 參與配置的員工是已儲存職位為 Barback、Bouncer、Disk-jockey、Bartender、Trainer 的人，換到 Trainer 的人選除外。
   - 已儲存職位是 Promoter、Cleaner、Personal Assistant 的員工，建議職位是已儲存的職位。
9. 候選配置是 Barback、Bouncer、Disk-jockey 各 1 人，其餘參與者當 Bartender。
10. 參與者的建議職位是分數最高的候選配置。
    - 分數 = 每位參與者「職位權重 x 該職位預測 effectiveness」的總和。
    - 職位權重使用 `FORMULAS.md` 中使用中的權重組 bartender_vs_rest。
11. Trainer 調動與職位配置的所有調動同時顯示。

### 顯示

12. 下拉選單選的職位和建議職位不同時，職位下拉選單顯示 `選的職位 > 建議職位`，例如 `Barback > Bartender`；相同時維持原本的顯示。
    - 文字超出下拉選單寬度時允許被截斷。
13. 下拉選單選的職位和建議職位不同的員工，該列背景顯示紫色，桌面版與手機版都適用。
14. 職位下拉選單展開時，9 個 Nightclub 職位的選項後面顯示該員工在該職位的預測 effectiveness，例如 `Bartender(99)`。
    - `Unassigned` 選項維持原本的文字。
    - 頁面不顯示總表或其他額外文字。
