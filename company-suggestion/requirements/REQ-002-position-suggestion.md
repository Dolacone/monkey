# REQ-002 — 職位調整建議

## 情境

> 頁面上的 effectiveness 每天只算一次，調整職位後數字不會變，看不出怎樣調整效果最好。使用者要頁面直接標出哪些員工該換到哪個職位。

## 行為

### 預測 effectiveness

1. 每位員工在每個職位的預測 effectiveness = working stats + management + 跟職位無關的 6 項。
2. working stats 用頁面上即時的 Manual labor、Intelligence、Endurance 計算，每項 stat 先乘 1.2（BUS2110），職位需求不為 0 的 stat 各算 `floor(min(45, 45 / req * stat) + max(0, 5 * log2(stat / req)))` 後相加。
3. 職位需求使用 Nightclub 9 個職位的固定數值。
4. management = `min(30, floor(0.84 * (100 - working stats) ^ 0.795))`，working stats 100 以上為 0。Manager 職位本人的 management 一律為 0。
5. settled_in、book、merits、director_education、addiction、inactivity 沿用頁面上當天的值，不因職位改變。

### 最佳配置

6. Manager、Barback、Bouncer、Disk-jockey 各 1 人，其餘員工全部是 Bartender。
7. 先取 4 個單人職位預測 effectiveness 總和最高的配置；總和相同時，取 Bartender 總和最高者；仍相同時，取需要調動人數最少者。

### 顯示

8. 員工目前職位和最佳配置不同時，職位下拉選單顯示 `目前職位 > 建議職位`，例如 `Manager > Disk-jockey`；相同時維持原本的顯示。
9. 文字超出下拉選單寬度時允許被截斷。
10. 需要調動的員工，該列背景顯示紫色，桌面版與手機版都適用。
11. 不顯示預測數值、總表或其他額外文字。
