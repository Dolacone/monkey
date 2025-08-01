// ==UserScript==
// @name         Torn: Pickpocket Targets
// @version      0.5.5
// @description  Highlight Pickpocket targets
// @author       Dolacone
// @match        https://www.torn.com/page.php?sid=crimes*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/crime-pickpocket.js
// @updateURL    https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/crime-pickpocket.js
// @icon
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    const url = window.location.href;
    if (!url.includes("#/pickpocketing")){
        return;
    }

    const menuItems = ['Enable Sound', 'Cyclist', 'Mobster'];
    let menuSelected;
    let actionContainer;
    let resultContainer;

    if (typeof GM_info !== "undefined" && GM_info.scriptHandler === "Tampermonkey") {
        menuSelected = GM_getValue('menuSelected', []);

        function toggleItem(item) {
            let updatedList = [...menuSelected];
            if (updatedList.includes(item)) {
                updatedList = updatedList.filter(i => i !== item);
            } else {
                updatedList.push(item);
            }
            GM_setValue('menuSelected', updatedList);
        }

        menuItems.forEach((item) => {
            const isChecked = menuSelected.includes(item);
            GM_registerMenuCommand(
                `${isChecked ? '☑' : '☐'} ${item}`,
                () => {
                    toggleItem(item);
                    location.reload();
                }
            );
        });
    } else {
        menuSelected = menuItems;
    }

    let sound = document.createElement('audio');
    sound.src = 'https://cdn.pixabay.com/download/audio/2024/05/23/audio_336d55dfa8.mp3?filename=servant-bell-ring-2-211683.mp3';
    sound.preload = 'auto';

    const waitActionContainer = setInterval(() => {
        actionContainer = document.getElementsByClassName("resultCounts___n3YFJ")[0];
        if (actionContainer) {
            actionContainer.innerHTML = '';
            clearInterval(waitActionContainer);
        }
    }, 100);
    const waitResultContainer = setInterval(() => {
        resultContainer = document.getElementsByClassName("bannerArea___bnT7m")[1];
        if (resultContainer) {
            resultContainer.innerHTML = '';
            clearInterval(waitResultContainer);
        }
    }, 100);

    function updateDivColors() {
        const rows = document.querySelectorAll('.crime-option:not(.processed)');
        rows.forEach(row => {
            row.classList.add('processed');
            const name = row.querySelector('div .titleAndProps___DdeVu > div:first-child').textContent.trim();
            const targetButton = row.querySelectorAll('button')[1];
            if (menuSelected.some(target => name.includes(target)) && targetButton.ariaDisabled === 'false') {
                const originalRowColor = row.style.backgroundColor;
                const originalButtonParent = targetButton.parentNode;
                row.style.borderLeft = `3px solid #37b24d`;
                row.style.backgroundColor = 'darkgreen';
                row.querySelector('div .childrenWrapper___h2Sw5').style.color = '#37b24d';
                document.body.style.backgroundColor = 'red';

                // clear color after clicked
                targetButton.addEventListener('click', () => {
                    document.removeEventListener('keydown', keyPressHandler);
                    document.body.style.backgroundColor = 'black';
                    row.style.backgroundColor = originalRowColor;

                    // move button back
                    originalButtonParent.replaceChildren(targetButton);
                    targetButton.style.display = "none";

                    setInterval(() => {
                        moveOutcomeResult();
                    }, 500);
                });

                // bind keypress to click button
                function keyPressHandler(event) {
                    if (event.key == 'q') {
                        targetButton.click();
                    }
                }
                document.addEventListener('keydown', keyPressHandler);
                // move button to header
                actionContainer.appendChild(targetButton);
                targetButton.style.width = "130px";

                if (menuSelected.includes('Enable Sound')) {
                    sound.play();
                }
            } else {
                targetButton.style.display = "none";
            }
        });
    };

    function moveOutcomeResult() {
        const outcomeWrappers = document.querySelectorAll(".outcomeWrapper___I8dXb");
        outcomeWrappers.forEach(wrapper => {
            if (wrapper.innerHTML !== "") {
                const rewardElement = wrapper.querySelector(".outcomeReward___E34U7");
                if (rewardElement) {
                    resultContainer.innerHTML = '';
                    resultContainer.appendChild(rewardElement);
                    clearInterval(moveOutcomeResult);
                }
            }
        });
    }

    setInterval(() => {
        updateDivColors();
    }, 1000);
})();
