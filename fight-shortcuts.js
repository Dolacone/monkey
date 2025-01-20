// ==UserScript==
// @name         Torn: Fight Shortcuts
// @version      0.4.0
// @description  Fight better
// @author       Dola [2720731]
// @match        https://www.torn.com/loader.php?sid=attack*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/torn/master/fight-shortcuts.js
// @icon
// @grant        none
// ==/UserScript==

function keypressHandler(event) {
    event.preventDefault();
    if (event.key === ' ') {
        const fightButton = $(".btn___RxE8_")
        if (fightButton.is(':visible')) {
            fightButton.click();
        }
    } else if (event.key === '1') {
        const primaryElement = $("#weapon_main");
        if (primaryElement.is(':visible')) {
            primaryElement.click();
        }
    } else if (event.key === '2') {
        const secondaryElement = $("#weapon_second");
        if (secondaryElement.is(':visible')) {
            secondaryElement.click();
        }
    } else if (event.key === '3') {
        const meleeElement = $("#weapon_melee");
        if (meleeElement.is(':visible')) {
            meleeElement.click();
        }
    } else if (event.key === '4') {
        const temporaryElement = $("#weapon_temp");
        if (temporaryElement.is(':visible')) {
            temporaryElement.click();
        }
    } else if (event.key.toLowerCase() === 'q') {
        const leaveButton = $(".btn___RxE8_:contains('leave')");
        if (leaveButton.is(':visible')) {
            leaveButton.click();
        }
    } else if (event.key.toLowerCase() === 'w') {
        const mugButton = $(".btn___RxE8_:contains('mug')");
        if (mugButton.is(':visible')) {
            mugButton.click();
        }
    } else if (event.key.toLowerCase() === 'e') {
        const hospitalizeButton = $(".btn___RxE8_:contains('hospitalize')");
        if (hospitalizeButton.is(':visible')) {
            hospitalizeButton.click();
        }
    } else if (event.key.toLowerCase() === 'b') {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('user2ID');
        window.location.href = "/profiles.php?XID=" + id
    }
}

(function() {
    'use strict';
    document.addEventListener('keypress', keypressHandler);
})();
