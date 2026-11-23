# Nightclub 公式

係數擬合自 Night Club tracker 的每日紀錄，最後一天是 2026-11-22。

## Effectiveness

```
effectiveness = working_stats + management + settled_in + book + merits + director_education + addiction + inactivity

working_stats = Σ floor( min(45, 45 × s / req) + max(0, 5 × log2(s / req)) )    # 只算 req > 0 的 stat，每項各自 floor
    s = stat × 1.2                                                             # BUS2110
    stat = rollover 當下、當天 job gain 加上去之前的值

management = min(30, max(0, floor((115 − working_stats − settled_in − merits − book) / 3)))
    Manager 職位 = 0
```

| 職位 | Manual labor | Intelligence | Endurance |
|---|---|---|---|
| Bartender | 13500 | 0 | 27000 |
| Barback | 10250 | 0 | 20500 |
| Bouncer | 48000 | 0 | 24000 |
| Disk-jockey | 0 | 40500 | 20250 |
| Manager | 0 | 27000 | 54000 |
| Trainer | 0 | 81000 | 40500 |
| Cleaner | 13500 | 0 | 6750 |
| Personal Assistant | 0 | 20250 | 40500 |
| Promoter | 0 | 54000 | 27000 |

- Trainer 的 `115 − working_stats − settled_in − merits − book` 等於 69 時，遊戲的 management 是 22，公式算出 23。

## 銷售額

```
income = customers × revenue_per_customer
profit = income − wages − ad

customers = e^( 8.680432
              + 0.001062 × E_bartender
              + 0.001941 × E_other
              + 0.875680 × sat + 0.721255 × sun
              + 0.000117 × ad_k − 0.000062 × ad_k × weekend )
    E_bartender = Bartender 職位的 effectiveness 總和
    E_other     = Manager、Bouncer、Barback、Disk-jockey 的 effectiveness 總和
    ad_k        = 廣告預算 / 1000
    sat、sun、weekend = 當天是週六、週日、週末時為 1，否則為 0

revenue_per_customer = Entry Fee + Σ price_d × q_d(price_d)
    q_d = 每位客人買飲料 d 的杯數
```

### 客人模型

- 擬合範圍是 10 星的 238 天（2025-09-14 至 2026-11-22），holdout 誤差 3.93%。
- Trainer 的 effectiveness 不影響 customers。
- 換算成倍數：
  - 週六客人是平日的 2.40 倍，週日是 2.06 倍。
  - 廣告每多 $100k，平日客人 +1.18%，週末 +0.55%。
  - Bartender 每 1 點 effectiveness +0.106% 客人，其他職位 +0.194%。

### 職位權重

每 1 點 effectiveness 的 log 客人數變化。bartender_vs_rest 的 holdout 誤差最低，是使用中的權重組。

| 權重組 | holdout 誤差 | Bartender | Bouncer | Barback | Disk-jockey |
|---|---|---|---|---|---|
| bartender_vs_rest | 3.93% | 0.001062 | 0.001941 | 0.001941 | 0.001941 |
| per_position | 4.17% | 0.001102 | 0.003238 | 0.001842 | 0.001590 |
| per_position_trainer | 4.56% | 0.001094 | 0.003178 | 0.001811 | 0.001578 |
| total_eff | 5.02% | 0.001187 | 0.001187 | 0.001187 | 0.001187 |

### 每位客人杯數

q_d 只隨飲料自己的價格變動，不隨星期、星數、effectiveness、廣告變動。

| 飲料 | 現價 | q_d | 漲一階 | 漲後 q_d | 彈性 |
|---|---|---|---|---|---|
| Beer | 17 | 0.971 | 19 | 0.772 | -2.04 |
| Wine | 39 | 0.288 | 43 | 0.245 | -1.66 |
| Cocktail | 50 | 0.471 | 55 | 0.402 | -1.63 |
| Shot | 6 | 1.855 | 7 | 1.589 | -1.03 |
| Soft Drink | 8 | 0.908 | 9 | 0.714 | -2.01 |

- 漲後 q_d 量自 2026-10-26 至 11-01，5 種飲料同時漲價，交叉效應分不開。
- 價格反應有轉折點，彈性只適用表中那一階。
  - 2025 年 Beer 13 到 15、15 到 17，每階 q_d 只少 2-3%。
  - Shot 6 到 7，2025 年 q_d 少 5.5%，2026 年少 14.8%。
- Entry Fee 的彈性未量測：10 星期間只有 3 天不是 33。
