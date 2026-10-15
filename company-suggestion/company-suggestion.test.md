# company-suggestion.test.js

Regression tests for the prediction and assignment functions in `company-suggestion.js` (`workingStats`, `management`, `predict`, `carryFromMultipliers`, `bestAssignment`, `isNightclub`), loaded through the script's `module.exports` branch. DOM reading and rendering are not covered; `DESIGN.md` records how they were checked by hand.

Run with `node --test` in this folder.

## Coverage

- Working stats（REQ-002 條件 2）：11 位員工的計算結果等於遊戲回報的值。拿掉 1.2 倍或改成加總後再 floor，Yaii、bilioo 這類數值會先失敗。
- Management（條件 4）：觀察到的 11 個資料點全部吻合；Manager 本人一律為 0。
- Carry（條件 5）：只加總 index 1、2、3、4、7、8，working_stats、management、wrong_gender 的位置被忽略。
- 預測值（條件 1）：ManOnFire 當 Bartender 的預測等於遊戲的 total 74。
- 最佳配置（條件 6、7）：目前的公司已是最佳，不調動任何人；對調前的配置會建議 Saikoa 回 Barback、Kyrax 回 Bartender，即使 Bartender 總和下降；同分時維持調動人數最少的配置。
- 頁面範圍（REQ-001 條件 2）：Nightclub 的職位清單才算 Nightclub，其他公司或少一個職位都不算。
