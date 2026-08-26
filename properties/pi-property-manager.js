// ==UserScript==
// @name         PI Property Manager
// @namespace    pi.property.manager
// @version      1.2.0
// @description  Overview table for your Private Island properties, with auto-filled extension terms
// @author       Dola
// @license      MIT
// @match        https://www.torn.com/properties.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @require      https://code.jquery.com/jquery-1.8.2.min.js
// ==/UserScript==

/******************** CONFIG SETTINGS ********************/
const apikey = '###PDA-APIKEY###'; // Torn PDA replaces this; desktop users replace it manually.
const extensionRentByHappy = {
    3725: 9000000,
    4225: 13000000,
};
/****************** END CONFIG SETTINGS *******************/

const PI_PROPERTY_TYPE = 13;
const EXTENSION_DAYS = 15;
const STAFF_HAPPY_BY_LEVEL = {
    Maid: [0, 50, 75, 85, 100],
    Butler: [0, 75, 100, 125],
    Guard: [0, 100, 150, 200, 300, 500],
    Doctor: [0, 25],
    Pilot: [0, 50],
};
const DEBUG = 0;

function log(...args) {
    if (DEBUG) console.log('[PIPropertyManager]', ...args);
}

function getParam(name) {
    const fragment = window.location.href.split('#')[1];
    if (!fragment) return null;
    const results = new RegExp(name + '=([^&#]*)').exec(fragment);
    return results ? decodeURIComponent(results[1]) : null;
}

function getPlayerId() {
    const selectors = ['#sidebarroot a[href*="profiles.php?XID="]', '.settings-menu a[href*="profiles.php?XID="]'];
    for (const selector of selectors) {
        const href = document.querySelector(selector)?.getAttribute('href');
        const playerId = href?.match(/XID=(\d+)/)?.[1];
        if (playerId) return playerId;
    }
    return null;
}

function formatError(error) {
    if (error && typeof error === 'object') {
        if (error.message) return `${error.name || 'Error'}: ${error.message}`;
        const serialized = JSON.stringify(error);
        if (serialized && serialized !== '{}') return serialized;
    }
    return String(error || 'Unknown error');
}

function parseApiResponse(response) {
    if (!response || typeof response.responseText !== 'string') {
        throw new Error('HTTP bridge returned an invalid response');
    }
    const data = JSON.parse(response.responseText);
    if (data.error) throw data.error;
    return data;
}

function requestUrl(url, requestName) {
    const rejectWithContext = (error) => {
        throw new Error(`${requestName}: ${formatError(error)}`);
    };

    if (typeof window.PDA_httpGet === 'function') {
        return window
            .fetch(url)
            .then(async (response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                return { responseText: await response.text() };
            })
            .then(parseApiResponse)
            .catch(rejectWithContext);
    }

    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            onload: (response) => {
                try {
                    resolve(parseApiResponse(response));
                } catch (e) {
                    reject(new Error(`${requestName}: ${formatError(e)}`));
                }
            },
            onerror: (error) => reject(new Error(`${requestName}: ${formatError(error)}`)),
        });
    });
}

function apiV2Request(path, query) {
    const suffix = query ? `&${query}` : '';
    const url = `https://api.torn.com/v2/${path}?key=${apikey}&comment=PIPropertyManager${suffix}`;
    return requestUrl(url, path);
}

function getProperties() {
    return apiV2Request('user/properties', 'filters=ownedByUser&limit=100');
}

// Sets a Torn "input-money" widget's value: the visible text input must be updated through
// the native setter + input/change events, or the paired hidden input used on submit never syncs.
function setMoneyInputValue(input, value) {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

function ownedPiProperties(properties, playerId) {
    return (properties || []).filter(
        (value) => String(value.owner?.id) === String(playerId) && value.property?.id === PI_PROPERTY_TYPE,
    );
}

function getStaffHappyBonus(staff) {
    return (staff || []).reduce((total, entry) => {
        const levels = STAFF_HAPPY_BY_LEVEL[entry.type];
        return total + (levels?.[entry.amount] || 0);
    }, 0);
}

function getPropertyHappy(property) {
    return property.happy - getStaffHappyBonus(property.staff);
}

// REQ-002 #6: open properties first (sorted by happy ascending), then rented ones
// ordered by soonest-expiring first (rental_period_remaining ascending).
function sortProperties(properties) {
    return properties.slice().sort((a, b) => {
        const aRented = a.status === 'rented';
        const bRented = b.status === 'rented';
        if (!aRented && !bRented) return getPropertyHappy(a) - getPropertyHappy(b);
        if (!aRented) return -1;
        if (!bRented) return 1;
        return a.rental_period_remaining - b.rental_period_remaining;
    });
}

function buildStatusCell(property) {
    if (property.status !== 'rented') return 'Open';
    return `${property.rental_period_remaining}/${property.rental_period} days`;
}

function buildLinkCell(property) {
    const tab = property.status === 'rented' ? 'offerExtension' : 'lease';
    // Must be an absolute URL: a bare "#/p=options&..." href keeps whatever query string
    // the current page has (e.g. "?step=rentalmarket"), which the properties.php router
    // does not recognize together with the p=options route, producing a dead link.
    return `https://www.torn.com/properties.php#/p=options&ID=${property.id}&tab=${tab}`;
}

// Builds the whole panel as a single HTML string. Never touches the anchor's own content -
// the caller inserts/replaces this as a sibling node, so the page's own heading survives.
//
// This does NOT reuse Torn's own "users-list-title" / "icons.users-list.rental" rental-market
// classes, even though they exist and look right - their CSS (".properties-market .users-list-title
// .happiness-b" etc.) only loads on the rentalmarket step (properties.php?step=rentalmarket).
// On the plain property list page (where this panel actually lives, per REQ-002 #4) that
// stylesheet chunk is absent, so those classes render as unstyled inline text. Confirmed live
// on 2026-08-24: identical markup looked correct under step=rentalmarket and collapsed on the
// plain list page. The table below is self-contained CSS instead.
function buildManagerHtml(properties, statusMessage) {
    const rows = properties
        .map((p) => {
            const status = buildStatusCell(p);
            const href = buildLinkCell(p);
            return `<tr><td>${getPropertyHappy(p)}</td><td>${status}</td><td><a href="${href}" class="pi-manage-link">Manage</a></td></tr>`;
        })
        .join('');

    return `
        <div id="pi-manager" class="m-top10">
            <div class="pi-manager-head"><span class="pi-manager-title">PI Property Manager</span></div>
            ${statusMessage
                ? `<div class="pi-manager-status">${statusMessage}</div>`
                : `<table class="pi-manager-table">
                    <thead><tr><th>Happy</th><th>Status</th><th>Link</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>`}
        </div>
    `;
}

async function drawListPage(playerId) {
    if ($('#pi-manager').length > 0) return;
    const anchor = $('#properties-page-wrap .content-title.m-bottom10');
    if (anchor.length === 0) return;

    if (!apikey) {
        anchor.after(buildManagerHtml([], 'Set your API key in the CONFIG SETTINGS section at the top of the script.'));
        return;
    }

    anchor.after(buildManagerHtml([], 'Loading properties...'));

    try {
        const propertyData = await getProperties();
        const properties = sortProperties(ownedPiProperties(propertyData.properties, playerId));
        $('#pi-manager').replaceWith(buildManagerHtml(properties));
    } catch (e) {
        log('Failed to load property data', e);
        $('#pi-manager').replaceWith(buildManagerHtml([], 'Failed to load property data: ' + formatError(e)));
    }
}

// REQ-003 #4-#6: extensions use fixed days and a configurable rent selected by staff-free happy.
async function fillOfferExtensionForm(propertyId) {
    const propertyData = await getProperties();
    const property = propertyData.properties.find((candidate) => String(candidate.id) === String(propertyId));
    if (!property || property.status !== 'rented') return;

    const costInput = document.querySelector('input.offerExtension.input-money[data-name="offercost"][type="text"]');
    const daysInput = document.querySelector('input.offerExtension.input-money[data-name="days"][type="text"]');

    const defaultRent = extensionRentByHappy[getPropertyHappy(property)];
    if (daysInput) setMoneyInputValue(daysInput, EXTENSION_DAYS);
    if (defaultRent === undefined) {
        if (costInput) setMoneyInputValue(costInput, '');
        $('.offerExtension-form input[type="submit"]').prop('disabled', true);
        return;
    }
    if (costInput) setMoneyInputValue(costInput, defaultRent);
    $('.offerExtension-form input[type="submit"]').prop('disabled', false);
}

function checkTabAndRunScript(playerId) {
    const tab = getParam('tab');
    const propertyId = getParam('ID');

    if (tab === null) {
        drawListPage(playerId);
        return;
    }
    if (!apikey) return;

    if (tab === 'offerExtension' && propertyId) {
        fillOfferExtensionForm(propertyId);
    }
}

$(document).ready(function () {
    const playerId = getPlayerId();
    if (!playerId) return;

    let debounceTimeout;
    const targetNode = document.getElementById('properties-page-wrap');
    if (targetNode) {
        const observer = new MutationObserver(() => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                checkTabAndRunScript(playerId);
            }, 500);
        });
        observer.observe(targetNode, { childList: true, subtree: true });
    }

    checkTabAndRunScript(playerId);
});

GM_addStyle(`
#pi-manager {
    width: 100% !important;
    border-radius: 5px !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    margin-bottom: 10px !important;
    border: 1px solid #000 !important;
    font-size: 12px !important;
}
.pi-manager-head {
    background: #8ABEEF !important;
    color: #fff !important;
    padding: 6px 10px !important;
    font-weight: bold !important;
}
.pi-manager-status {
    background: #2e2e2e !important;
    color: #ddd !important;
    padding: 8px 10px !important;
}
.pi-manager-table {
    width: 100% !important;
    border-collapse: collapse !important;
    background: #2e2e2e !important;
    color: #ddd !important;
}
.pi-manager-table th {
    background: #1c1c1c !important;
    color: #aaa !important;
    text-transform: uppercase !important;
    font-size: 11px !important;
    text-align: left !important;
    padding: 6px 10px !important;
    border-bottom: 2px solid #444 !important;
}
.pi-manager-table td {
    padding: 6px 10px !important;
    border-bottom: 1px solid #444 !important;
    color: #ddd !important;
}
.pi-manager-table tbody tr:hover td {
    background: #3a3a3a !important;
}
.pi-manage-link {
    color: #8ABEEF !important;
}
`);
