// ==UserScript==
// @name         Torn: Profile shortcuts
// @version      0.1.0
// @description
// @author       Dola [2720731]
// @match        https://www.torn.com/profiles.php?*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/torn/master/profile-shortcuts.js
// @icon
// @grant        none
// ==/UserScript==

function keypressHandler(event) {
    event.preventDefault();
    if (event.key.toLowerCase() === 'q') {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('XID');
        window.location.href = "/loader.php?sid=attack&user2ID=" + id
    }
}

(function() {
    'use strict';
    document.addEventListener('keypress', keypressHandler);
})();
