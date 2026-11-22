# REQ-004 — Discord DM

## 情境

> 使用者沒辦法對指定航班設通知（「able to set notification on target flight」）。只設了 FLIGHT DM 時也需要 RESTOCK DM，而且勾選與取消勾選要和 DM 連動。DM 按鈕佔掉列表空間：使用者要把它拿掉，「有成功登記就整行藍底框起來」，失敗就紅底。

## 行為

### 種類與歸屬

1. 每趟航班有兩種 DM：leave DM 和 restock DM，都由 torn-intel 透過 Discord 發送。
2. leave DM 的提前分鐘數採用網站 plan alert 的提前設定。
3. 讀不到這個設定，或設定不是 1 到 60 的整數時，提前 10 分鐘。
4. footer 說明 `DM = Discord leave DM Nm before leave + restock DM`。
5. 同國家、同物品、補貨時間相差不到半個補貨間隔的 plan DM，視為這一趟的 DM。
6. 補貨間隔未知時，改以補貨時間相差不到 15 分鐘判斷。

### 列的底色

7. 已勾選、兩種 DM 都設好的航班，整列以藍底加框顯示。
8. 已勾選的航班 DM 設定失敗時，整列以紅底加框顯示。
   - 只設好其中一種時，也是紅底。
9. 已勾選、兩種 DM 都沒設、也沒有設定失敗的航班，不加底色。
   - 例如 priority 模式自動排進來的航班、沒有補貨時間的航班。

### 勾選連動

10. 勾選有補貨時間的航班時，先加入網站計畫，再設兩種 DM。
11. 勾選沒有補貨時間的航班時，只加入網站計畫，不設 DM。
12. 取消勾選時，先取消這趟已設的 DM，全部取消成功後才從網站計畫移除。
13. 取消 DM 失敗時，這趟維持勾選。
14. DM 設定失敗時，這趟維持勾選。
15. 設定失敗時，footer 顯示失敗的種類，例如 `Could not set the restock DM. Uncheck and check again to retry.`。
16. 取消失敗時，footer 顯示失敗的種類，例如 `Could not cancel the leave DM. Uncheck to retry.`。
17. 同一次操作已顯示提醒上限或 DM 已發出的訊息時，footer 只顯示那則訊息，不顯示失敗的種類。

### 限制

18. 變更一趟的 DM，不影響其他航班已設的 plan DM。
19. Discord 未連結時，顯示 `Discord is not linked on torn-intel.`，DM 不會被設定或取消。
20. 達到提醒上限時，顯示 `Alert limit reached. Delete a few alerts first.`。
21. 設 DM 時，torn-intel 回報該種 DM 已經發出過，footer 顯示 `The leave DM for this trip already went out.` 或 `The restock DM for this trip already went out.`。
22. DM 請求進行中時，所有勾選框鎖住。
23. 面板每 2 分鐘從網站重新讀取一次 DM 狀態。
