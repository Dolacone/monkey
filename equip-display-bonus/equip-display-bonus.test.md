# equip-display-bonus.test.js

Regression tests for the power score functions in `equip-display-bonus.js` (`calcPowerScore`, `formatPowerLine`), loaded through the script's `module.exports` branch. DOM scanning and overlay rendering are not covered; `DESIGN.md` records how they were checked by hand.

## Coverage

- 基準換算(REQ-003 條件 9、11):基準武器自己是 10000 / 10000,兩個數字各自跟基準的同一個數字換算;沒有基準或基準不在主武器表時退回 SIG 552。防止換算基準錯置時所有數字一起偏掉卻看起來合理。
- 跟模擬器對齊(條件 12、15):三個 torn-fight-simulator 的模擬結果當回歸基準,容許 1-1.5% 誤差。公式常數被改錯時這裡會先失敗。
- 確定性(條件 16):同一把武器兩次計算結果相同。
- 排除名單(條件 5-7):Dual、活動武器、近戰、副武器、盔甲、空名稱都沒有戰力值。
- `+X`(條件 4、18):不計入的加成只加標記、不改數字;跟戰鬥無關的 5 個加成也要加標記;沒有不計入加成時不加標記。
- 加成效果(條件 17、19、20):13 個計入的加成各自都會改變數字;Specialist 只有一個彈匣,續航戰力比同款可 reload 武器掉得比爆發戰力多;Conserve 對續航的提升大於爆發;兩個加成會疊加。
- Mod 推導(條件 13):Nock Gun 不能裝 Recoil Pad,續航戰力低於彈匣相同、可裝 Pad 的 Benelli M1 Tactical。
