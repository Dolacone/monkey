// ==UserScript==
// @name         Torn: Profile camping
// @version      0.3.0
// @description
// @author
// @match        https://www.torn.com/profiles.php?*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/torn/master/profile-camping.js
// @updateURL    https://raw.githubusercontent.com/Dolacone/torn/master/profile-camping.js
// @icon
// @grant        none
// ==/UserScript==

let monitorStatusInterval = null;

function monitorStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('XID');
    const attackBtn = document.querySelector('.profile-button-attack');
    if (attackBtn.classList.contains('active')) {
        clearInterval(monitorStatus);
        window.location.href = "/loader.php?sid=attack&user2ID=" + id;
    }
}

(function() {
    'use strict';
    document.body.style.backgroundColor = 'brown';
    monitorStatusInterval = setInterval(() => {
        monitorStatus();
    }, 1000);
})();
