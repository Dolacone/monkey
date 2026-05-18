// ==UserScript==
// @name         Torn: Pickpocket Targets
// @version      0.5.6
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
    const targetRowSelector = '.pickpocketing-root .crime-option';
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
        actionContainer = document.querySelector('.pickpocketing-root [class*="resultCounts"]');
        if (actionContainer) {
            actionContainer.innerHTML = '';
            clearInterval(waitActionContainer);
        }
    }, 100);
    const waitResultContainer = setInterval(() => {
        resultContainer = document.querySelector('.pickpocketing-root [class*="currentCrime"] [class*="bannerArea"]');
        if (resultContainer) {
            resultContainer.innerHTML = '';
            clearInterval(waitResultContainer);
        }
    }, 100);

    function updateDivColors() {
        const rows = document.querySelectorAll(targetRowSelector);
        rows.forEach(row => {
            const nameElement = row.querySelector('[class*="titleAndProps"] > div:first-child');
            const targetButton = row.querySelector('button.commit-button, button[aria-label^="Pickpocket"]');
            if (!nameElement || !targetButton) {
                return;
            }

            const name = nameElement.textContent.trim();
            const isEnabled = targetButton.getAttribute('aria-disabled') === 'false';
            if (menuSelected.some(target => name.includes(target)) && isEnabled) {
                targetButton.style.display = "";
                if (targetButton.dataset.pickpocketBound === 'true') {
                    if (actionContainer && targetButton.parentElement !== actionContainer) {
                        actionContainer.appendChild(targetButton);
                    }
                    return;
                }

                const originalRowColor = row.style.backgroundColor;
                const originalButtonParent = targetButton.parentNode;
                row.style.borderLeft = `3px solid #37b24d`;
                row.style.backgroundColor = 'darkgreen';
                const buttonContent = row.querySelector('[class*="childrenWrapper"]');
                if (buttonContent) {
                    buttonContent.style.color = '#37b24d';
                }
                document.body.style.backgroundColor = 'red';
                targetButton.dataset.pickpocketBound = 'true';

                // clear color after clicked
                targetButton.addEventListener('click', () => {
                    document.removeEventListener('keydown', keyPressHandler);
                    document.body.style.backgroundColor = 'black';
                    row.style.backgroundColor = originalRowColor;

                    // move button back
                    originalButtonParent.replaceChildren(targetButton);
                    targetButton.style.display = "none";

                    const resultInterval = setInterval(() => {
                        if (moveOutcomeResult()) {
                            clearInterval(resultInterval);
                        }
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
                if (actionContainer) {
                    actionContainer.appendChild(targetButton);
                    targetButton.style.width = "130px";
                }

                if (menuSelected.includes('Enable Sound')) {
                    sound.play();
                }
            } else {
                targetButton.style.display = "none";
            }
        });
    };

    function moveOutcomeResult() {
        if (!resultContainer) {
            return false;
        }

        const outcomeWrappers = document.querySelectorAll('[class*="outcomeWrapper"]');
        for (const wrapper of outcomeWrappers) {
            if (wrapper.innerHTML !== "") {
                const rewardElement = wrapper.querySelector('[class*="outcomeReward"]');
                if (rewardElement) {
                    resultContainer.innerHTML = '';
                    resultContainer.appendChild(rewardElement);
                    return true;
                }
            }
        }
        return false;
    }

    setInterval(() => {
        updateDivColors();
    }, 1000);
})();
