// ==UserScript==
// @name         Torn Disposal Cheatsheet
// @version      0.1.1
// @description  Quick reference for disposal
// @author       Dolacone
// @match        https://www.torn.com/loader.php?sid=crimes*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/crime-disposal.js
// @updateURL    https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/crime-disposal.js
// @icon
// @grant        none
// ==/UserScript==

const url = window.location.href;
if (!url.includes("#/disposal")){
    return;
}

const solutions = {
    // abandon, bury, burn, sink, dissolve
    'Biological Waste': ['sink'],
    'Body Part': [],
    'Building Debris': ['sink'],
    'Dead body': [],
    'Documents': ['burn'],
    'Firearm': ['sink'],
    'General Waste': ['bury', 'burn'],
    'Industrial Waste': ['sink'],
    'Murder Weapon': ['sink'],
    'Old Furniture': ['burn'],
    'Broken Appliance': ['sink'],
    'Vehicle': ['burn', 'sink'],
}

const buttonClass = {
    'abandon': 'abandon___Kj_xT',
    'bury': 'bury___rKDkb',
    'burn': 'burn___DOobh',
    'sink': 'sink___MPksd',
    'dissolve': 'dissolve___mmdon',
}

function waitLoaded() {
    return new Promise((resolve) => {
        const checkVisibility = () => {
            if ($("div.crimeOptionGroup___gQ6rI").is(':visible')){
                clearInterval(waitVisibility);
                resolve(true);
            }
        };
        const waitVisibility = setInterval(checkVisibility, 100);
    });
}

function updateColor() {
    const targets = document.querySelectorAll('.crime-option:not(.processed');
    targets.forEach(target => {
        const name = target.querySelector('div.flexGrow___S5IUQ').textContent.trim();
        const actions = target.querySelector('div.desktopMethodsSection___fPHAD');

        solutions[name].forEach(solution => {
            buttonStyle = 'button.' + buttonClass[solution];
            actions.querySelector(buttonStyle).style.background = 'green';
        });
    });
}

waitLoaded().then(() => {
    console.log('disposal cheatsheet loaded');
    updateColor();
});
