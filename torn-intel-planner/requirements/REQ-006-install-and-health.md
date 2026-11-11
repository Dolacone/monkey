# REQ-006 — 安裝與失效偵測

## 情境

> 修改要「透過 js inject」套用在 torn-intel 上，並在每次重新整理後持續生效；網站改版導致失效時，使用者要能看出來。

## 行為

1. 以 userscript 形式安裝在 Tampermonkey，在 torn-intel.com 所有頁面載入的最開始執行。
2. `@downloadURL` 與 `@updateURL` 都指向 GitHub master branch 的 `torn-intel-planner/torn-intel-priority.user.js` raw URL。
3. 生效時，console 的 `window.__tiPriority.patched` 列出 4 項。
4. `patched` 少於 4 項，表示網站改版、補丁失效。
5. 排程補丁失效時，不顯示面板，網站計畫不套用優先順序。
6. 排程補丁生效、其他補丁失效時，面板仍然顯示。
7. 可飛判斷補丁失效時，面板也列出不符合網站限制的航班。
8. 目的地篩選補丁失效時，目的地篩選關掉 Japan 或 Canada 會讓該國的優先組合離開網站計畫。
