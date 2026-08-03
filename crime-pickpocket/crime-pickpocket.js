// ==UserScript==
// @name         Torn: Pickpocket Targets
// @version      0.6.5
// @description  Highlight Pickpocket targets
// @author       Dolacone
// @match        https://www.torn.com/page.php?sid=crimes*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/crime-pickpocket/crime-pickpocket.js
// @updateURL    https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/crime-pickpocket/crime-pickpocket.js
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
    console.log('[Pickpocket] script loaded on', url);

    const menuItems = ['Enable Sound', 'Cyclist', 'Mobster'];
    const targetRowSelector = '.pickpocketing-root .crime-option';
    const PICKPOCKET_LOG_KEY = 'pickpocketLog';
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

    function captureSnapshot(row) {
        const nameEl = row.querySelector('[class*="titleAndProps"] > div:first-child');
        const bodyEl = row.querySelector('[class*="physicalProps"]');
        const activityEl = row.querySelector('[class*="activity"]');
        const clockEl = row.querySelector('[class*="clock"]');
        const imgEl = row.querySelector('img');
        const avatarMatch = imgEl ? imgEl.getAttribute('src').match(/(\d+)\.webp/) : null;

        let actionType = '';
        if (activityEl) {
            actionType = Array.from(activityEl.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent)
                .join('')
                .trim();
        }

        return {
            avatarId: avatarMatch ? avatarMatch[1] : null,
            name: nameEl ? nameEl.textContent.trim() : null,
            bodyType: bodyEl ? bodyEl.textContent.trim() : null,
            actionType,
            remainingSeconds: clockEl ? clockEl.textContent.trim() : null,
        };
    }

    function saveLogRecord(snapshot, outcome) {
        const record = {
            ...snapshot,
            status: outcome.status,
            reward: outcome.reward,
            timestamp: new Date().toISOString(),
        };
        console.log('[Pickpocket] saving log record', record);
        const log = JSON.parse(localStorage.getItem(PICKPOCKET_LOG_KEY) || '[]');
        log.push(record);
        localStorage.setItem(PICKPOCKET_LOG_KEY, JSON.stringify(log));
        console.log('[Pickpocket] pickpocketLog now has', log.length, 'entries');
    }

    const waitHeaderLink = setInterval(() => {
        const backLink = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Back to Hub');
        if (backLink && !document.getElementById('pickpocket-export-btn')) {
            const exportButton = document.createElement('button');
            exportButton.id = 'pickpocket-export-btn';
            exportButton.textContent = 'Export Log';
            exportButton.style.marginLeft = '8px';
            exportButton.style.padding = '2px 10px';
            exportButton.style.border = '1px solid #2b8a3e';
            exportButton.style.borderRadius = '4px';
            exportButton.style.backgroundColor = '#37b24d';
            exportButton.style.color = '#fff';
            exportButton.style.fontWeight = 'bold';
            exportButton.style.cursor = 'pointer';
            exportButton.addEventListener('mouseenter', () => {
                exportButton.style.backgroundColor = '#2b8a3e';
            });
            exportButton.addEventListener('mouseleave', () => {
                exportButton.style.backgroundColor = '#37b24d';
            });
            exportButton.addEventListener('click', () => {
                const log = localStorage.getItem(PICKPOCKET_LOG_KEY) || '[]';
                const blob = new Blob([log], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pickpocket-log-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });
            backLink.insertAdjacentElement('afterend', exportButton);
            console.log('[Pickpocket] export button injected');
            clearInterval(waitHeaderLink);
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
                    const snapshot = captureSnapshot(row);
                    console.log('[Pickpocket] clicked, snapshot captured', snapshot);

                    document.removeEventListener('keydown', keyPressHandler);
                    document.body.style.backgroundColor = 'black';
                    row.style.backgroundColor = originalRowColor;

                    // move button back
                    originalButtonParent.replaceChildren(targetButton);
                    targetButton.style.display = "none";

                    waitForOutcome(snapshot);
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

    function waitForOutcome(snapshot) {
        const observeRoot = document.querySelector('.pickpocketing-root [class*="currentCrime"]');
        if (!observeRoot) {
            console.log('[Pickpocket] waitForOutcome: currentCrime container not found');
            return;
        }

        const giveUpTimer = setTimeout(() => {
            observer.disconnect();
            console.log('[Pickpocket] gave up waiting for outcome (observer timeout)');
        }, 10000);

        const observer = new MutationObserver(() => {
            const outcome = moveOutcomeResult();
            console.log('[Pickpocket] mutation observed, outcome:', outcome);
            if (outcome) {
                clearTimeout(giveUpTimer);
                observer.disconnect();
                saveLogRecord(snapshot, outcome);
            }
        });
        observer.observe(observeRoot, { childList: true, subtree: true, characterData: true });
    }

    function moveOutcomeResult() {
        if (!resultContainer) {
            console.log('[Pickpocket] moveOutcomeResult: resultContainer not found yet');
            return null;
        }

        const outcomeWrappers = document.querySelectorAll('[class*="outcomeWrapper"]');
        for (const wrapper of outcomeWrappers) {
            if (wrapper.innerHTML !== "") {
                const rewardElement = wrapper.querySelector('[class*="outcomeReward"]');
                if (rewardElement) {
                    const statusEl = rewardElement.querySelector('[class*="title"]');
                    const rewardEl = rewardElement.querySelector('[class*="rewards"]');
                    let reward = null;
                    if (rewardEl) {
                        const itemImgs = rewardEl.querySelectorAll('img[alt]');
                        if (itemImgs.length > 0) {
                            reward = Array.from(itemImgs).map(img => img.getAttribute('alt'));
                        } else {
                            const rewardText = rewardEl.textContent.trim();
                            reward = rewardText ? Number(rewardText.replace(/[^0-9.]/g, '')) : null;
                        }
                    }
                    const outcome = {
                        status: statusEl ? statusEl.textContent.trim() : null,
                        reward,
                    };
                    resultContainer.innerHTML = '';
                    resultContainer.appendChild(rewardElement);
                    return outcome;
                }
            }
        }
        return null;
    }

    setInterval(() => {
        updateDivColors();
    }, 1000);
})();
