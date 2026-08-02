# REQ-001 — 攻擊頁鍵盤快捷鍵

## 情境

> 在攻擊頁 (`page.php?sid=attack&user2ID=*`) 用滑鼠逐一點擊開戰、武器、離開、搶劫、送醫院等按鈕太慢，需要鍵盤直接觸發這些動作。戰鬥結束後用 Q/W/E 選好對手的處置方式，還要再手動關掉這個分頁，希望系統確認動作完成後自動關閉。

## 行為

1. 按下 Space 時，若「開始戰鬥 / 確認」按鈕 (`[class*='dialogButtons'] button.torn-btn`) 可見，點擊它。
2. 按下 1 時，若主武器欄位 (`#weapon_main`) 可見，點擊它。
3. 按下 2 時，若副武器欄位 (`#weapon_second`) 可見，點擊它。
4. 按下 3 時，若近戰欄位 (`#weapon_melee`) 可見，點擊它。
5. 按下 4 時，若臨時武器欄位 (`#weapon_temp`) 可見，點擊它。
6. 按下 Q（不分大小寫）時，點擊文字包含「leave」的按鈕（若可見）。
7. 按下 W（不分大小寫）時，點擊文字包含「mug」的按鈕（若可見）。
8. 按下 E（不分大小寫）時，點擊文字包含「hospitalize」的按鈕（若可見）。
9. 按下 B（不分大小寫）時，導向對手個人頁 `/profiles.php?XID=<user2ID>`，`user2ID` 取自目前網址的 query string。
10. 上述任一快捷鍵被觸發時，阻止該按鍵的預設行為（`event.preventDefault()`）。
11. 對應的按鈕不可見或不存在時，該按鍵不執行任何動作；但只要按下的是 Space / 1 / 2 / 3 / 4 / Q / W / E / B 之一，仍會阻止該按鍵的預設行為。
12. 快捷鍵只在攻擊頁生效，不在 item.php 生效。

### 處置動作後自動關閉分頁

13. 按下 Q（離開）、W（搶劫）或 E（送醫院）時，若對應的 leave/mug/hospitalize 按鈕確實可見並成功被點擊，開始監聽頁面上是否出現文字為「CONTINUE」（不分大小寫）的按鈕，且該按鈕位於 `[class*="dialogButtons"] button.torn-btn` 內。
14. 監聽到上述 CONTINUE 按鈕出現時，呼叫 `window.close()` 關閉目前分頁。
15. Q/W/E 對應的 leave/mug/hospitalize 按鈕本來就不可見或不存在，導致沒有實際點擊時，不開始監聽 CONTINUE 按鈕，也不會關閉分頁。
16. CONTINUE 按鈕遲遲沒有出現時，不關閉分頁，監聽持續存在，沒有其他副作用。
