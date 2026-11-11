# REQ-004 — Discord DM

## 情境

> 使用者沒辦法對指定航班設通知（「able to set notification on target flight」）。只設了 FLIGHT DM 時也需要 RESTOCK DM，而且勾選與取消勾選要和 DM 連動。

## 行為

### 種類與歸屬

1. 每趟航班有兩種 DM：leave DM 和 restock DM，都由 torn-intel 透過 Discord 發送。
2. leave DM 的提前分鐘數採用網站 plan alert 的提前設定。
3. 讀不到這個設定，或設定不是 1 到 60 的整數時，提前 10 分鐘。
4. footer 說明 `DM = Discord leave DM Nm before leave + restock DM`。
5. 同國家、同物品、補貨時間相差不到半個補貨間隔的 plan DM，視為這一趟的 DM。
6. 補貨間隔未知時，改以補貨時間相差不到 15 分鐘判斷。

### 按鈕

7. 只有已勾選、而且有補貨時間的航班顯示 DM 按鈕。
8. 兩種都沒設時，按鈕顯示 `DM`。
9. 只設了一種時，按鈕以橘框顯示 `Leave only` 或 `Restock only`。
10. 兩種都設時，按鈕以藍底顯示 `DM on`。
11. 按 `DM`、`Leave only` 或 `Restock only`，會補設缺少的種類。
12. 按 `DM on`，會取消兩種 DM。

### 勾選連動

13. 勾選有補貨時間的航班時，先加入網站計畫，再設兩種 DM。
14. 勾選沒有補貨時間的航班時，只加入網站計畫，不設 DM。
15. 取消勾選時，先取消這趟已設的 DM，全部取消成功後才從網站計畫移除。
16. 取消 DM 失敗時，這趟維持勾選。
17. 有一種 DM 設定失敗時，這趟維持勾選，按鈕顯示已設成功的種類，按下可以重試。
18. 設定或取消失敗時，footer 顯示失敗的種類，例如 `Could not set the restock DM. Click DM to retry.`。
19. 同一次操作已顯示提醒上限或 DM 已發出的訊息時，footer 只顯示那則訊息，不顯示失敗的種類。

### 限制

20. 變更一趟的 DM，不影響其他航班已設的 plan DM。
21. Discord 未連結時，顯示 `Discord is not linked on torn-intel.`，DM 不會被設定或取消。
22. 達到提醒上限時，顯示 `Alert limit reached. Delete a few alerts first.`。
23. 設 DM 時，torn-intel 回報該種 DM 已經發出過，footer 顯示 `The leave DM for this trip already went out.` 或 `The restock DM for this trip already went out.`。
24. DM 請求進行中時，所有勾選框和 DM 按鈕鎖住。
25. 面板每 2 分鐘從網站重新讀取一次 DM 狀態。
