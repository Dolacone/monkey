// ==UserScript==
// @name         Torn: Pickpocket Targets
// @version      0.5.0
// @description  Highlight Pickpocket targets
// @author       Dola [2720731]
// @match        https://www.torn.com/loader.php?sid=crimes*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/torn/master/crime-pickpocket.js
// @icon
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    const menuItems = ['Enable Sound', 'Cyclist', 'Postal worker'];
    const menuSelected = GM_getValue('menuSelected', []);

    function toggleItem(item) {
        let updatedList = [...menuSelected];
        if (updatedList.includes(item)) {
            updatedList = updatedList.filter(i => i !== item);
        } else {
            updatedList.push(item);
        }
        GM_setValue('menuSelected', updatedList);
    }

    menuItems.forEach(item => {
        const isChecked = menuSelected.includes(item);
        GM_registerMenuCommand(
            `${isChecked ? '☑' : '☐'} ${item}`,
            () => {
                toggleItem(item);
                location.reload();
            }
        );
    });

    let sound = document.createElement('audio');
    sound.src = 'https://cdn.pixabay.com/download/audio/2024/05/23/audio_336d55dfa8.mp3?filename=servant-bell-ring-2-211683.mp3';
    sound.preload = 'auto';

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
            if (menuSelected.some(target => name.includes(target)) && buttons[1].ariaDisabled === 'false') {
                const originalRowColor = row.style.backgroundColor;
                const originalButtonParent = buttons[1].parentNode;
                row.style.borderLeft = `3px solid #37b24d`;
                row.style.backgroundColor = 'darkgreen';
                row.querySelector('div .childrenWrapper___h2Sw5').style.color = '#37b24d';
                document.body.style.backgroundColor = 'red';

                // clear color after clicked
                buttons[1].addEventListener('click', () => {
                    document.removeEventListener('keydown', keyPressHandler);
                    document.body.style.backgroundColor = 'black';
                    row.style.backgroundColor = originalRowColor;

                    // move button back
                    originalButtonParent.replaceChildren(buttons[1]);
                    buttons[1].style.display = "none";
                });

                // bind keypress to click button
                function keyPressHandler(event) {
                    if (event.key == 'q') {
                        buttons[1].click();
                    }
                }
                document.addEventListener('keydown', keyPressHandler);
                // move button to header
                const newButtonParent = document.getElementsByClassName("resultCounts___n3YFJ")[0];
                newButtonParent.replaceChildren(buttons[1]);
                buttons[1].style.width = "130px";

                if (menuSelected.includes('Enable Sound')) {
                    sound.play();
                }
            } else {
                buttons[1].style.display = "none";
            }
        });
    };

    setInterval(updateDivColors, 2000);
})();
