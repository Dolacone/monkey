// ==UserScript==
// @name         Torn: Shortcuts
// @version      1.1.2
// @description  Faster actions
// @author       Dolacone
// @match        https://www.torn.com/page.php?sid=attack&user2ID=*// @match        https://www.torn.com/companies.php*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/fight-shortcuts.js
// @updateURL    https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/fight-shortcuts.js
// @icon
// @grant        none
// ==/UserScript==


let fightAnalyzed = false;

function analyzeDefenderArmor(retries) {
    const defenderPlayer = $(".player___vjxP2").has("#weapon_main.defender___l1ETt");
    if (!defenderPlayer.length) {
        if (retries > 0) setTimeout(() => analyzeDefenderArmor(retries - 1), 500);
        return;
    }

    const areas = defenderPlayer.find("map area");
    if (!areas.length && retries > 0) {
        setTimeout(() => analyzeDefenderArmor(retries - 1), 500);
        return;
    }

    const seen = {};
    const pieces = [];
    let armorType = null;

    areas.each(function () {
        const part = $(this).attr('alt');
        const name = $(this).attr('title');
        if (part && name && !seen[part]) {
            seen[part] = true;
            pieces.push(name);
            if (!armorType) {
                const lower = name.toLowerCase();
                if (lower.includes('assault')) armorType = 'assault';
                else if (lower.includes('riot')) armorType = 'riot';
                else if (lower.includes('vanguard')) armorType = 'vanguard';
            }
        }
    });

    const playerWindow = defenderPlayer.find(".playerWindow___sDs7q");
    $('#armor-info').remove();

    const $info = $('<div id="armor-info"></div>').css({
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        zIndex: 100,
        color: 'white',
        fontSize: '11px',
        padding: '2px 4px',
        textAlign: 'left',
        textShadow: '0 0 3px black',
        background: 'rgba(0,0,0,0.45)',
        pointerEvents: 'none',
    }).prependTo(playerWindow.css('position', 'relative'));

    (pieces.length ? pieces : ['No armor']).forEach(name => $('<div>').text(name).appendTo($info));

    startLogObserver();

    const attackerPlayer = $(".player___vjxP2").not(defenderPlayer);
    attackerPlayer.find('#weapon_main, #weapon_second, #weapon_melee, #weapon_temp')
        .css('box-shadow', '');

    if (armorType === 'assault') {
        attackerPlayer.find('#weapon_main, #weapon_second').css('box-shadow', 'inset 0 0 0 4px rgb(0, 120, 255)');
    } else if (armorType === 'riot') {
        attackerPlayer.find('#weapon_melee').css('box-shadow', 'inset 0 0 0 4px rgb(0, 120, 255)');
    } else if (armorType === 'vanguard') {
        attackerPlayer.find('#weapon_temp').css('box-shadow', 'inset 0 0 0 4px rgb(0, 120, 255)');
    }
}

function parseLogEntry(li) {
    const $li = $(li);
    const col1 = $li.find('span[class*="col1"]');
    const isAttacker = col1.hasClass('color-1____8JuW');
    const isDefender = col1.hasClass('color-2___iX1n6');
    if (!isAttacker && !isDefender) return null;

    const iconClass = $li.find('span[class*="attacking-events-"]').attr('class') || '';
    if (/leave|grenade|slowed|speed/.test(iconClass)) return null;

    if (iconClass.includes('attack-join')) {
        const name = $li.find('span[class*="message"] a').first().text();
        return { type: 'join', name };
    }

    const side = isAttacker ? 'attacker' : 'defender';
    const $em = $li.find('span[class*="message"] em');
    const damage = $em.length ? parseInt($em.text().replace(/,/g, ''), 10) : null;
    const isCrit = iconClass.includes('critical-hit') || $li.find('span[class*="message"]').text().includes('critically hit');

    if (side === 'defender' && !damage) return null;
    if (side === 'attacker' && !damage) return { type: 'miss', side: 'attacker', damage: null, isCrit: false };

    return { type: 'hit', side, damage, isCrit };
}

function startLogObserver() {
    function attachTo(logList) {
        new MutationObserver(function (mutations) {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    const entry = parseLogEntry(node);
                    if (!entry) continue;

                    let text, color;
                    if (entry.type === 'join') {
                        text = entry.name + ' joined';
                        color = '#ff4';
                    } else if (entry.type === 'miss') {
                        text = 'MISS';
                        color = '#4f4';
                    } else {
                        // entry.type === 'hit'
                        const dmg = entry.isCrit ? entry.damage + ' CRI' : String(entry.damage);
                        if (entry.side === 'attacker') { text = dmg; color = '#4f4'; }
                        else                           { text = dmg; color = '#f44'; }
                    }

                    $('<div>').text(text).css('color', color).prependTo('#armor-info');
                }
            }
        }).observe(logList, { childList: true });
    }

    const logList = $('ul[class*="list___"]')[0];
    if (logList) { attachTo(logList); return; }

    const waitObserver = new MutationObserver(function () {
        const found = $('ul[class*="list___"]')[0];
        if (found) { waitObserver.disconnect(); attachTo(found); }
    });
    waitObserver.observe(document.body, { childList: true, subtree: true });
}

const WEAPON_KEYS = {
    '1': '#weapon_main',
    '2': '#weapon_second',
    '3': '#weapon_melee',
    '4': '#weapon_temp',
};

function clickIfVisible($el) {
    if ($el.is(':visible')) $el.click();
}

function fightKeypressHandler(event) {
    const key = event.key;
    const lkey = key.toLowerCase();

    if (key === ' ') {
        const $fightBtn = $("[class*='dialogButtons'] button.torn-btn");
        if ($fightBtn.is(':visible')) {
            $fightBtn.click();
            if (!fightAnalyzed) {
                fightAnalyzed = true;
                analyzeDefenderArmor(5);
            }
        }
    } else if (WEAPON_KEYS[key]) {
        clickIfVisible($(WEAPON_KEYS[key]));
    } else if (lkey === 'q') {
        clickIfVisible($("button.torn-btn:contains('leave')"));
    } else if (lkey === 'w') {
        clickIfVisible($("button.torn-btn:contains('mug')"));
    } else if (lkey === 'e') {
        clickIfVisible($("button.torn-btn:contains('hospitalize')"));
    } else if (lkey === 'b') {
        const id = new URLSearchParams(window.location.search).get('user2ID');
        window.location.href = "/profiles.php?XID=" + id;
    } else {
        return false;
    }
    return true;
}

function companyKeypressHandler(event) {
    let handled = true;
    if (event.key === ' ') {
        if (!window.location.href.includes('option=funds')) {
            const fundsTab = $('a[href="#funds"]');
            if (fundsTab.length) {
                fundsTab[0].click();
            }
        } else {
            const inputMoney = $('.input-money');
            if (inputMoney.length) {
                if (inputMoney.val().trim() === '') {
                    const symbol = $('.input-money-symbol');
                    if (symbol.length) {
                        symbol.click();
                    }
                } else {
                    const depositBtn = $("button.torn-btn").filter(function () {
                        return $(this).text().trim().toUpperCase() === 'DEPOSIT';
                    });
                    if (depositBtn.length) {
                        depositBtn.click();
                    }
                }
            }
        }
    } else {
        handled = false;
    }
    return handled;
}

function keypressHandler(event) {
    let handled = false;

    if (window.location.href.includes('companies.php')) {
        handled = companyKeypressHandler(event);
    } else {
        handled = fightKeypressHandler(event);
    }

    if (handled) {
        event.preventDefault();
    }
}

(function () {
    'use strict';

    // 初始化背景顏色 (目前 fight 跟 company 頁面都設為 brown)
    document.body.style.backgroundColor = 'brown';

    document.addEventListener('keypress', keypressHandler);

    const observer = new MutationObserver(function (mutations) {
        if (fightAnalyzed) return;
        for (const mutation of mutations) {
            if (
                mutation.target.classList.contains('attackStarted___KxAo_') &&
                mutation.target.classList.contains('weaponSlot___Wq6XA')
            ) {
                fightAnalyzed = true;
                analyzeDefenderArmor(5);
                break;
            }
        }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
})();
