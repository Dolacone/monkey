# REQ-001 — Tampermonkey 腳本套用頁面

## 情境

> 使用者要一個 Tampermonkey script,在特定幾個 Torn 頁面上執行。

## 行為

1. 腳本在以下網址啟用:
   - `https://www.torn.com/page.php?sid=ItemMarket`
   - `https://www.torn.com/factions.php`
   - `https://www.torn.com/amarket.php`
2. 三個頁面各自用不同的 DOM 結構顯示裝備清單(ItemMarket 為卡片式、factions.php 軍火庫為列表式、amarket.php 拍賣行為清單式),腳本須同時支援三種結構。
3. 頁面因換頁、篩選、排序等互動重新渲染清單時,腳本顯示的疊加資訊要跟著更新:不殘留在已被移除的節點上,也不漏掉新出現的裝備。
