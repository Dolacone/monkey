# REQ-002 — 職位調整建議

## 情境

> 頁面上的 effectiveness 每天只算一次，調整職位後數字不會變，看不出怎樣調整效果最好。使用者要頁面直接標出哪些員工該換到哪個職位，選擇邏輯和 Night Club tracker 相同：Manager 不動，最弱的人當 Trainer，其餘依職位權重一次只調一組。

## 行為

### 預測 effectiveness

1. 每位員工在每個職位的預測 effectiveness = working stats + management + 跟職位無關的 6 項。
2. working stats 用頁面上即時的 Manual labor、Intelligence、Endurance 計算，每項 stat 先乘 1.2（BUS2110），職位需求不為 0 的 stat 各算 `floor(min(45, 45 / req * stat) + max(0, 5 * log2(stat / req)))` 後相加。
3. 職位需求使用 Nightclub 9 個職位的固定數值。
4. management = `min(30, max(0, floor((115 - (working stats + settled_in + merits + book)) / 3)))`。Manager 職位本人的 management 一律為 0。
5. settled_in、book、merits、director_education、addiction、inactivity 沿用頁面上當天的值，不因職位改變。

### Manager 與 Trainer

6. 目前在 Manager 職位的員工不調動。
7. 最弱的員工是 Manager 以外、預測 Bartender effectiveness 扣掉 addiction 影響後最低的人。
8. 最弱的員工不在 Trainer 時，建議他換到 Trainer，原本在 Trainer 的其他員工建議換到 Bartender。
9. 最弱的員工原本在 Barback、Bouncer 或 Disk-jockey 時，空出的職位不自動補人。

### 職位對調

10. 參與對調的員工是目前在 Barback、Bouncer、Disk-jockey、Bartender 的人，最弱的員工除外。其他職位的員工不調動。
11. 一個配置的增益 = 每位參與者「職位權重 x 新職位預測 effectiveness」減去「職位權重 x 目前職位預測 effectiveness」的總和。
12. 職位權重使用以下 4 組固定值（每 1 點 effectiveness 的 log 客人數變化）：

    | 權重組 | Bartender | Bouncer | Barback | Disk-jockey |
    |---|---|---|---|---|
    | per_position_trainer | 0.001057 | 0.003355 | 0.002448 | 0.001343 |
    | bartender_vs_rest | 0.001035 | 0.001987 | 0.001987 | 0.001987 |
    | per_position | 0.001053 | 0.003504 | 0.002500 | 0.001446 |
    | total_eff | 0.001189 | 0.001189 | 0.001189 | 0.001189 |

13. 候選配置是兩位不同職位的參與者互換職位。只考慮 4 組權重的增益都大於 0 的對調，取 per_position_trainer 增益最大的一組。
14. 沒有符合條件 13 的對調時，參與者都不調動。

### 一次一組

15. 條件 8 的 Trainer 調動存在時，只顯示 Trainer 調動，不顯示職位對調。
16. 沒有 Trainer 調動時，顯示條件 13 的那一組對調。

### 顯示

17. 員工目前職位和建議職位不同時，職位下拉選單顯示 `目前職位 > 建議職位`，例如 `Bartender > Bouncer`；相同時維持原本的顯示。
18. 文字超出下拉選單寬度時允許被截斷。
19. 需要調動的員工，該列背景顯示紫色，桌面版與手機版都適用。
20. 不顯示預測數值、總表或其他額外文字。
