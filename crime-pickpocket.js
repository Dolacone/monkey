// ==UserScript==
// @name         Torn: Pickpocket Targets
// @version      0.2.3
// @description  Highlight Pickpocket targets
// @author       Dola [2720731]
// @match        https://www.torn.com/loader.php?sid=crimes*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/torn/master/crime-pickpocket.js
// @icon
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let sound = document.createElement('audio');
    sound.src = 'https://cdn.pixabay.com/download/audio/2024/05/23/audio_336d55dfa8.mp3?filename=servant-bell-ring-2-211683.mp3';
    sound.preload = 'auto';

    const markGroups = ["Cyclist"]

    function updateDivColors() {
        const url = window.location.href;
        if (!url.includes("#/pickpocketing")){
            return;
        }

        const rows = document.querySelectorAll('.crime-option:not(.processed)')
        rows.forEach(row => {
            const name = row.querySelector('div .titleAndProps___DdeVu > div:first-child').textContent.trim();
            if (markGroups.some(target => name.includes(target))) {
                row.style.borderLeft = `3px solid #37b24d`;
                row.style.background = 'darkgreen';
                row.querySelector('div .childrenWrapper___h2Sw5').style.color = '#37b24d';
                sound.play();
            } else {
                row.style.display = 'none';
            };
            row.classList.add('processed');
        });
    };

    updateDivColors();
    setInterval(updateDivColors, 1000);
})();
