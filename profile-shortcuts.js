// ==UserScript==
// @name         Torn: Profile shortcuts
// @version      0.2.0
// @description
// @author       Dola [2720731]
// @match        https://www.torn.com/profiles.php?*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/torn/master/profile-shortcuts.js
// @updateURL    https://raw.githubusercontent.com/Dolacone/torn/master/profile-shortcuts.js
// @icon
// @grant        none
// ==/UserScript==

let sound = new Audio('https://cdn.pixabay.com/download/audio/2024/05/23/audio_336d55dfa8.mp3?filename=servant-bell-ring-2-211683.mp3');
let monitorStatusInterval = null;

function keypressHandler(event) {
    event.preventDefault();
    if (event.key.toLowerCase() === 'q') {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('XID');
        window.location.href = "/loader.php?sid=attack&user2ID=" + id
    }
}

function monitorStatus() {
    const status = document.querySelector('.description .main-desc').innerText
    const status_sub = document.querySelector('.description .sub-desc').innerText
    if (status === "Okay"){
        document.body.style.backgroundColor = 'red';
        document.title = "attack";
        sound.play();
        clearInterval(monitorStatusInterval);
    }
    if (status.startsWith('In ') && status_sub === ""){
        document.body.style.backgroundColor = 'red';
        document.title = "attack";
        sound.play();
        clearInterval(monitorStatusInterval);
    }
}

(function() {
    'use strict';
    document.addEventListener('keypress', keypressHandler);

    monitorStatusInterval = setInterval(() => {
        monitorStatus();
    }, 1000);
})();
