# REQ-003 — 主武器懶人戰力值

## 情境

> 主武器旁邊沒有一個能直接比較強度的數字。使用者要一個懶人戰力值：不用精確，但兩把武器差 10% 就要看得出差 10%，數字越少越好。戰力值以玩家目前裝備的主武器為基準。戰力值分成兩個：25 回合內的總傷害，跟打光所有彈藥的總傷害，因為有些戰局不能 reload，打完就要換下一個人。

## 行為

### 顯示

1. Item Market、Faction Armoury、Auction House、Items 的主武器，疊加文字第一行顯示戰力值，格式為「{爆發戰力} / {續航戰力}」，例如 `12345 / 23456`；REQ-002 的加成文字接在戰力值下面，例如：
   ```
   12345+X / 23456+X
   Specialist 20%
   Comeback 20%
   ```
2. 戰力值顯示為整數，不加千分位逗點。
3. 主武器沒有附加任何加成時，疊加文字只有戰力值這一行。
4. 主武器帶有不計入戰力值的加成時（見條件 18），兩個戰力值後面都加上 `+X`，代表這把武器還有戰力值以外的價值。
5. 副武器、近戰武器、暫時武器、盔甲不顯示戰力值。
6. Dual Bushmasters、Dual MP5s、Dual P90s、Dual TMPs、Dual Uzis、Egg Propelled Launcher、Neutrilux 2000、Snow Cannon 不顯示戰力值。
7. 武器名稱不在 Torn wiki 主武器清單裡時，不顯示戰力值。

### 基準武器

8. 玩家打開 Items 頁面時，腳本記下目前裝備的主武器（名稱、Damage、Accuracy、加成與百分比），保存到瀏覽器，重新整理或換頁後仍沿用。
9. 基準武器的爆發戰力固定為 10000，其他武器的兩個戰力值都用同一個基準換算；因此基準武器自己顯示為 `10000 / {續航戰力}`。
10. 玩家換裝別的主武器後再打開 Items 頁面，基準武器跟著更新。
11. 尚未記錄過基準武器、或記錄到的主武器不在 Torn wiki 主武器清單裡時，改用 SIG 552、Damage 74、Accuracy 55、沒有加成作為基準。

### 計算情境

12. 戰力值用一個固定情境計算，跟玩家自己或對手的實際屬性、裝備無關：
    - 雙方四項屬性的 base 值相同。
    - 雙方 merits、education 全滿，education 含 25% ammo conservation。
    - 對手穿 Sentinel 套裝，Armor Quality 100%，Armor Bonus 取最大值。
    - 使用 PI 彈藥。
    - 不計對手的任何輸出或特效。
    - 每場可以 reload 2 次。
13. 每把武器（包含基準武器）都假設裝上同一組 mod，不看武器實際裝的 mod：依序裝 100mW Laser（Crit +5%）、Recoil Pad（Ammo Conservation 25%）；不能裝 Recoil Pad 時改裝 Thermal Sight（Accuracy +1.75）；兩個都不能裝時只裝 Laser。
    - Recoil Pad：Machine Gun、Rifle、Shotgun，Nock Gun 除外。
    - Thermal Sight：Machine Gun、Rifle、SMG。
14. 武器的彈匣容量、Rate of Fire、類型以 Torn wiki 的 Weapon 頁面為準。Damage、Accuracy、加成名稱與百分比讀取頁面上那一把武器的實際數值。
15. 爆發戰力是 25 回合內的期望總傷害；續航戰力是不設回合上限、打光所有彈匣（含 2 次 reload）的期望總傷害。
16. 戰力值不含隨機成分：同一把武器（名稱、Damage、Accuracy、加成都相同）在同一個基準下，每次顯示的數字都相同。

### 加成

17. 計入戰力值的加成：Achilles、Assassinate、Blindside、Conserve、Cupid、Deadeye、Expose、Penetrate、Powerful、Quicken、Specialist、Sure Shot、Throttle。
18. 其餘加成不影響數字，並觸發條件 4 的 `+X`，包含戰鬥中有效果但沒有計入的加成（例如 Comeback、Puncture、Focus、Weaken、Disarm），也包含跟戰鬥無關的加成（Plunder、Proficience、Revitalize、Stricken、Warlord）。
19. Specialist 讓整場只有一個彈匣、不能 reload；Conserve 的百分比跟 education、Recoil Pad 的 ammo conservation 相乘疊加剩餘比例。
20. 武器有兩個加成時，兩個加成的效果一起計入。
