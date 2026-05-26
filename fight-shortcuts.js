// ==UserScript==
// @name         Torn: Shortcuts
// @version      1.3.5
// @description  Faster actions
// @author       Dolacone
// @match        https://www.torn.com/page.php?sid=attack&user2ID=*
// @match        https://www.torn.com/item.php
// @downloadURL  https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/fight-shortcuts.js
// @updateURL    https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/fight-shortcuts.js
// @icon
// @grant        none
// ==/UserScript==


let logObserverStarted = false;
let armorAreaObserver = null;

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
    if (!areas.length) watchForDefenderArmorAreas(defenderPlayer);

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

    $('<div id="action-log-info"></div>').appendTo($info);
    (pieces.length ? pieces : ['No armor']).forEach(name => $('<div>').addClass('armor-info-row').text(name).appendTo($info));

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
        const msgText = $li.find('span[class*="message"]').text().trim();
        const name = msgText.split(/\s+/)[0];
        if (!name) return null;
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

function watchForDefenderArmorAreas(defenderPlayer) {
    if (armorAreaObserver) return;

    const target = defenderPlayer.find(".playerWindow___sDs7q")[0] || defenderPlayer[0];
    if (!target) return;

    armorAreaObserver = new MutationObserver(function () {
        if (!defenderPlayer.find("map area").length) return;
        armorAreaObserver.disconnect();
        armorAreaObserver = null;
        analyzeDefenderArmor(0);
    });
    armorAreaObserver.observe(target, { childList: true, subtree: true });
}

function startLogObserver() {
    if (logObserverStarted) return;
    logObserverStarted = true;

    function appendEntry($container, entry) {
        let text, color;
        if (entry.type === 'join') {
            text = entry.name + ' joined';
            color = '#ff4';
        } else if (entry.type === 'miss') {
            text = 'MISS';
            color = '#4f4';
        } else {
            text = entry.isCrit ? entry.damage + ' CRI' : String(entry.damage);
            color = entry.side === 'attacker' ? '#4f4' : '#f44';
        }

        $('<div>').text(text).css('color', color).appendTo($container);
    }

    function rebuildLogOverlay(logList) {
        const $container = $('#action-log-info');
        if (!$container.length) return;

        $container.empty();
        $(logList).children('li').each(function () {
            const entry = parseLogEntry(this);
            if (!entry) return;
            appendEntry($container, entry);
        });
    }

    function attachTo(logList) {
        rebuildLogOverlay(logList);
        new MutationObserver(function (mutations) {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') rebuildLogOverlay(logList);
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyzeDefenderArmor,
        parseLogEntry,
        startLogObserver,
        watchForDefenderArmorAreas,
    };
}

function initLoadoutSwitcher() {
    const LOADOUT_KEYS = { '1': 0, '2': 1, '3': 2, '4': 3, 'q': 4, 'w': 5, 'e': 6, 'r': 7 };
    let loadoutPresent = false;
    let savedBg = '';
    let loadoutKeyHandler = null;
    let slotObserver = null;

    function highlightActiveSlot() {
        const root = document.querySelector('#loadoutsRoot');
        if (!root) return;
        root.querySelectorAll('li[class*="slot___"]').forEach(function (li) {
            if (li.className.includes('current')) {
                li.style.background = '#00ff88';
                li.style.color = '#000';
            } else {
                li.style.background = '';
                li.style.color = '';
            }
        });
    }

    function detachSlotObserver() {
        if (slotObserver) { slotObserver.disconnect(); slotObserver = null; }
        const root = document.querySelector('#loadoutsRoot');
        if (root) root.querySelectorAll('li[class*="slot___"]').forEach(function (li) {
            li.style.background = '';
            li.style.color = '';
        });
    }

    function attachSlotObserver() {
        highlightActiveSlot();
        const root = document.querySelector('#loadoutsRoot');
        if (!root) return;
        const ul = root.querySelector('ul[class*="slots"]');
        if (!ul) { setTimeout(attachSlotObserver, 0); return; }
        slotObserver = new MutationObserver(highlightActiveSlot);
        slotObserver.observe(ul, { attributes: true, attributeFilter: ['class'], subtree: true });
    }

    function loadoutKeydown(event) {
        if (event.target.closest('input, textarea, select, [contenteditable]')) return;
        const idx = LOADOUT_KEYS[event.key];
        if (idx === undefined) return;
        const root = document.querySelector('#loadoutsRoot');
        if (!root) return;
        const slots = root.querySelectorAll('li[class*="slot___"]');
        const slot = slots[idx];
        if (!slot) return;
        const btn = slot.querySelector('button[aria-label="Equip loadout"]');
        if (!btn || btn.disabled) return;
        btn.click();
        event.preventDefault();
    }

    new MutationObserver(function () {
        const present = !!document.querySelector('#loadoutsRoot ul[class*="slots"]');
        if (present === loadoutPresent) return;
        loadoutPresent = present;
        if (present) {
            savedBg = document.body.style.backgroundColor;
            document.body.style.backgroundColor = 'brown';
            attachSlotObserver();
            loadoutKeyHandler = loadoutKeydown;
            document.addEventListener('keydown', loadoutKeyHandler);
        } else {
            document.body.style.backgroundColor = savedBg;
            detachSlotObserver();
            document.removeEventListener('keydown', loadoutKeyHandler);
            loadoutKeyHandler = null;
        }
    }).observe(document.body, { childList: true, subtree: true });
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

function keypressHandler(event) {
    if (fightKeypressHandler(event)) {
        event.preventDefault();
    }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') (function () {
    'use strict';

    if (location.pathname.startsWith('/item.php')) {
        initLoadoutSwitcher();
        return;
    }

    document.body.style.backgroundColor = 'brown';

    document.addEventListener('keypress', keypressHandler);

    analyzeDefenderArmor(5);
})();
