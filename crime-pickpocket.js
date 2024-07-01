// ==UserScript==
// @name         Torn: Pickpocket Targets
// @version      0.2.1
// @description  Highlight Pickpocket targets
// @author       Dola [2720731]
// @match        https://www.torn.com/loader.php?sid=crimes*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/torn/master/crime-pickpocket.js
// @icon
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const markGroups = ["Cyclist", "Postal worker"]

    function updateDivColors() {
        const url = window.location.href;
        if (!url.includes("#/pickpocketing")){
            return;
        }

        const rows = document.querySelectorAll('.crime-option:not(.processed)')
        rows.forEach(row => {
          const name = row.querySelector('div .titleAndProps___DdeVu > div:first-child').textContent.trim();
          if (markGroups.includes(name)) {
              row.style.borderLeft = `3px solid #37b24d`
              row.style.background = 'darkgreen'
              row.querySelector('div .childrenWrapper___h2Sw5').style.color = '#37b24d'
          };
          row.classList.add('processed');
        });
    };

    updateDivColors();
    setInterval(updateDivColors, 1000);
})();
