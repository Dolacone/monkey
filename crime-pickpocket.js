// ==UserScript==
// @name         Torn: Pickpocket Targets
// @version      0.4.3
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

    const markGroups = ["Cyclist"];

    function updateDivColors() {
        const url = window.location.href;
        if (!url.includes("#/pickpocketing")){
            return;
        }

        const rows = document.querySelectorAll('.crime-option:not(.processed)');
        rows.forEach(row => {
            row.classList.add('processed');
            const name = row.querySelector('div .titleAndProps___DdeVu > div:first-child').textContent.trim();
            const buttons = row.querySelectorAll('button');
            if (markGroups.some(target => name.includes(target)) && buttons[1].ariaDisabled === 'false') {
                const originalRowColor = row.style.backgroundColor;
                row.style.borderLeft = `3px solid #37b24d`;
                row.style.backgroundColor = 'darkgreen';
                row.querySelector('div .childrenWrapper___h2Sw5').style.color = '#37b24d';
                document.body.style.backgroundColor = 'red';

                // clear color after clicked
                buttons[1].addEventListener('click', () => {
                    document.removeEventListener('keydown', keyPressHandler);
                    document.body.style.backgroundColor = 'black';
                    row.style.backgroundColor = originalRowColor;
                });

                // bind keypress to click button
                function keyPressHandler(event) {
                    if (event.key == 'q') {
                        buttons[1].click();
                    }
                }
                document.addEventListener('keydown', keyPressHandler);

                //sound.play();
            }
        });
    };

    setInterval(updateDivColors, 2000);
})();
