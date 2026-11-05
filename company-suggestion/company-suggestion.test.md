# company-suggestion.test.js

Regression tests for the prediction and suggestion functions in `company-suggestion.js` (`workingStats`, `management`, `predict`, `fromMultipliers`, `weakest`, `bestPair`, `suggest`, `isNightclub`), loaded through the script's `module.exports` branch. DOM reading and rendering are not covered; `DESIGN.md` records how they were checked by hand.

Run with `node --test` in this folder.

## Coverage

- Working stats（REQ-002 條件 2）：11 位員工的計算結果等於遊戲回報的值。拿掉 1.2 倍或改成加總後再 floor，Yaii、bilioo 這類數值會先失敗。
- Management（條件 4）：2026-11-05 的明細與 omnicor 全部吻合；book +50 的 Yaii 只看 working stats 會算成 7；Manager 本人一律為 0。
- 拆解 multipliers（條件 5）：carry、management parts、addiction 各取正確的 index，working_stats、management、wrong_gender 被忽略。
- 預測值（條件 1）：11/05 的 12 位員工在目前職位的預測都等於遊戲的 total。
- 最弱者（條件 7）：FF357 是最弱者，把 addiction 算進去會變成 LexxLuth；Manager 再弱也不會被選。
- 對調（條件 10-14、16）：11/05 建議 Kyrax 換到 Bouncer、RMForever 換到 Bartender；對調完成後不再建議；只有部分權重組增益的對調不建議。
- Trainer 調動（條件 8、9、15）：最弱者不在 Trainer 時只顯示 Trainer 調動；原本的 Trainer 換到 Bartender；最弱者空出的單人職位不補人。
- 不動的人（條件 6、10）：Manager 與 Promoter 不調動。
- 頁面範圍（REQ-001 條件 2）：Nightclub 的職位清單才算 Nightclub，其他公司或少一個職位都不算。
