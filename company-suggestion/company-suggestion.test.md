# company-suggestion.test.js

Regression tests for the prediction and suggestion functions in `company-suggestion.js` (`workingStats`, `management`, `predict`, `fromMultipliers`, `targetWeekday`, `trainerPick`, `gains`, `suggest`, `optionText`, `isNightclub`), loaded through the script's `module.exports` branch. DOM reading and rendering are not covered; `DESIGN.md` records how they were checked by hand.

Run with `node --test` in this folder.

## Coverage

- Working stats（REQ-002 預測）：11 位員工的計算結果等於遊戲回報的值。拿掉 1.2 倍或改成加總後再 floor，Yaii、bilioo 這類數值會先失敗。
- Management（REQ-002 預測）：2026-11-05 的明細與 omnicor 全部吻合；book +50 的 Yaii 只看 working stats 會算成 7；Manager 本人一律為 0。
- 拆解 multipliers（REQ-002 預測）：carry、management parts、addiction 各取正確的 index，working_stats、management、wrong_gender 被忽略。
- 預測值（REQ-002 預測）：11/05 的 12 位員工在目前職位的預測都等於遊戲的 total。
- 選項文字（REQ-002 顯示）：11/22 的 Kyrax 目前職位顯示遊戲的 108；Manager 選項不含 management；`Unassigned` 不加數值。
- 目標 company day：18:00 TCT 前後、週四晚到週日晚的邊界各自落在正確的星期。
- Trainer 人選：11/22 新進的 BbLoup Bartender 最低，但 Trainer 預測只有 44，因此選 FF357；Trainer 預測剛好 50 不算高於 50；Manager 不會被選。
- Trainer 日：週二 FF357 換到 Trainer；週六沒人換到 Trainer；週六原本的 Trainer 只換回 Bartender，不帶動 total_eff 判定虧損的輪調；週二原本的其他 Trainer 換回 Bartender。
- 配置：RMForever 與 Yaii 對調在 total_eff 剛好為 0，不建議；4 人輪調一次全部顯示；Trainer 人選空出的 Barback 由配置補人；Manager 與 Promoter 不調動。
- 頁面範圍（REQ-001 條件 2）：Nightclub 的職位清單才算 Nightclub，其他公司或少一個職位都不算。
