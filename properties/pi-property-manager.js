// ==UserScript==
// @name         PI Property Manager
// @namespace    pi.property.manager
// @version      1.1.0
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
/****************** END CONFIG SETTINGS *******************/

const PI_PROPERTY_TYPE = 13;
const RENT_LOG_IDS = '5943,5937';
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

function apiRequest(selections) {
    return new Promise((resolve, reject) => {
        const url = `https://api.torn.com/user/?selections=${selections}&key=${apikey}&comment=PIPropertyManager`;
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            onload: (response) => {
                try {
                    const data = JSON.parse(response.responseText);
                    if (data.error) return reject(data.error);
                    resolve(data);
                } catch (e) {
                    reject(e);
                }
            },
            onerror: reject,
        });
    });
}

// REQ-003 #3: find this renter's last agreed days/rent for this property from the activity log.
function findLastRentalTerms(logData, propertyId, renterId) {
    let match = null;
    $.each(logData.log || {}, function (key, entry) {
        if (entry.data && String(entry.data.property_id) === String(propertyId) && String(entry.data.renter) === String(renterId)) {
            match = { days: entry.data.days, rent: entry.data.rent };
            return false;
        }
    });
    return match;
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
    const result = [];
    $.each(properties, function (id, value) {
        if (String(value.owner_id) === String(playerId) && value.property_type === PI_PROPERTY_TYPE) {
            result.push({ id, ...value });
        }
    });
    return result;
}

// REQ-002 #6: open properties first (sorted by happy ascending), then rented ones
// ordered by soonest-expiring first (days_left ascending).
function sortProperties(properties) {
    return properties.slice().sort((a, b) => {
        if (!a.rented && !b.rented) return a.happy - b.happy;
        if (!a.rented) return -1;
        if (!b.rented) return 1;
        return a.rented.days_left - b.rented.days_left;
    });
}

function buildStatusCell(property, logData) {
    if (!property.rented) return 'Open';
    const terms = findLastRentalTerms(logData, property.id, property.rented.user_id);
    const totalDays = terms ? terms.days : Math.round(property.rented.total_cost / property.rented.cost_per_day);
    return `${property.rented.days_left}/${totalDays} days`;
}

function buildLinkCell(property) {
    const tab = property.rented ? 'offerExtension' : 'lease';
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
function buildManagerHtml(properties, logData, statusMessage) {
    const rows = properties
        .map((p) => {
            const status = buildStatusCell(p, logData);
            const href = buildLinkCell(p);
            return `<tr><td>${p.happy}</td><td>${status}</td><td><a href="${href}" class="pi-manage-link">Manage</a></td></tr>`;
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
        anchor.after(buildManagerHtml([], {}, 'Set your API key in the CONFIG SETTINGS section at the top of the script.'));
        return;
    }

    anchor.after(buildManagerHtml([], {}, 'Loading properties...'));

    try {
        const [profileData, logData] = await Promise.all([apiRequest('profile,properties'), apiRequest(`log&log=${RENT_LOG_IDS}`)]);
        const properties = sortProperties(ownedPiProperties(profileData.properties, playerId));
        $('#pi-manager').replaceWith(buildManagerHtml(properties, logData));
    } catch (e) {
        log('Failed to load property data', e);
        $('#pi-manager').replaceWith(buildManagerHtml([], {}, 'Failed to load property data: ' + JSON.stringify(e)));
    }
}

// REQ-003 #3/#4: prefill only when this renter's last agreed terms are found in the
// activity log. Lease (open properties) is not auto-filled at all - see DESIGN.md.
async function fillOfferExtensionForm(propertyId) {
    const profileData = await apiRequest('properties');
    const property = profileData.properties[propertyId];
    if (!property || !property.rented) return;

    const costInput = document.querySelector('input.offerExtension.input-money[data-name="offercost"][type="text"]');
    const daysInput = document.querySelector('input.offerExtension.input-money[data-name="days"][type="text"]');

    const logData = await apiRequest(`log&log=${RENT_LOG_IDS}`);
    const terms = findLastRentalTerms(logData, propertyId, property.rented.user_id);
    if (terms) {
        if (costInput) setMoneyInputValue(costInput, terms.rent);
        if (daysInput) setMoneyInputValue(daysInput, terms.days);
        $('.offerExtension-form input[type="submit"]').prop('disabled', false);
    }
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
