// ==UserScript==
// @name         Torn: Fight Shortcuts
// @version      0.6.0
// @description  Fight better
// @author       Dolacone
// @match        https://www.torn.com/loader.php?sid=attack*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/fight-shortcuts.js
// @updateURL    https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/fight-shortcuts.js
// @icon
// @grant        none
// ==/UserScript==

let sound = new Audio('https://cdn.pixabay.com/download/audio/2024/05/23/audio_336d55dfa8.mp3?filename=servant-bell-ring-2-211683.mp3');
let monitorFightStartInterval = null;
let monitorTargetAvailableInterval = null;

function keypressHandler(event) {
    event.preventDefault();
    if (event.key === ' ') {
        const fightButton = $(".btn___RxE8_");
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

function monitorFightStart() {
    const fightButton = $(".btn___RxE8_:contains('Start fight')");
    if (fightButton.is(':visible')) {
        fightButton.click();
        sound.play();
        clearInterval(monitorFightStartInterval);
    }
}

function monitorTargetAvailable() {
    const attackBtn = document.querySelector('.profile-button-attack');
    if (attackBtn.classList.contains('active')) {
        clearInterval(monitorTargetAvailableInterval);
        location.reload();
    }
}

(function() {
    'use strict';
    document.body.style.backgroundColor = 'brown';
    monitorFightStartInterval = setInterval(() => {
        monitorFightStart();
    }, 500);
    monitorTargetAvailableInterval = setInterval(() => {
        monitorTargetAvailable();
    }, 500);
    document.addEventListener('keypress', keypressHandler);
})();
