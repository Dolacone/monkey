# REQ-001 — Tampermonkey 腳本套用頁面

## 情境

> 使用者在海外商店頁要一個 Tampermonkey script，針對一個固定的目標商品，補貨時提醒，並用點擊訊息列完成購買。

## 行為

1. 腳本在 `https://www.torn.com/page.php?sid=travel` 啟用，只在人在海外、頁面顯示商店列表與訊息列時運作。飛行中或在 Torn 城內不做任何事。
2. 目標商品名稱寫死在腳本內，值為 `Xanax`。不提供 Tampermonkey 選單切換。
3. 訊息列指的是商店上方 `You are in <國家> and have $<金額>. You have purchased <已買> / <上限> items so far.` 整段。
4. 目前國家的商店沒有目標商品時，不提醒，點擊訊息列只顯示目標不在此頁，不做任何購買動作。
