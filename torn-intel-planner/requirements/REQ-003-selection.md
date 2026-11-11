# REQ-003 — 勾選航班進計畫

## 情境

> 使用者不能自己挑要飛哪幾趟：要能在列表上「select which trip to include into plan」，網站計畫跟著改。

## 行為

1. header 顯示目前模式：`priority` 或 `manual`。
2. 頁面載入時，勾選框與網站計畫一致：在網站計畫中的航班打勾。
3. 第一次勾選或取消任何一列時，切換為 manual 模式，以當時已勾選的航班為起點。
4. manual 模式下，網站計畫只包含勾選的航班，加上網站自己固定的行程。
5. 勾選結果存在瀏覽器，重新整理後保留。
6. 每次勾選變更時，移除補貨時間已過 6 小時以上的勾選紀錄。
7. 立即航班的勾選紀錄不會被移除。
8. manual 模式下，勾選過某個優先組合的立即航班後，之後同組合的立即航班都自動打勾。
9. 按 Auto 回到 priority 模式，並清除手動勾選結果。
10. priority 模式下 Auto 按鈕鎖住。
11. 勾選或按 Auto 後，面板立即更新。
12. 網站的時間軸和卡片在一分鐘內跟上勾選結果。
13. 勾選變更後沒有其他訊息時，footer 顯示 `Site timeline follows within a minute.`。
14. 按 Auto 後，footer 顯示 `Back to priority order. Site timeline follows within a minute.`。
