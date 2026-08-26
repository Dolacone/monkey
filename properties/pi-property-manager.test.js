const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

function loadScript() {
    let styles = '';
    const source = fs.readFileSync('pi-property-manager.js', 'utf8');
    const context = {
        clearTimeout,
        console,
        document: { querySelector: () => null },
        Event: function Event() {},
        GM_addStyle: (value) => {
            styles = value;
        },
        GM_xmlhttpRequest: () => {},
        MutationObserver: function MutationObserver() {},
        setTimeout,
        window: {},
        $: () => ({ length: 0, ready: () => {} }),
    };
    context.$.each = (collection, iteratee) => {
        for (const [key, value] of Object.entries(collection)) {
            if (iteratee(key, value) === false) break;
        }
    };
    vm.createContext(context);
    vm.runInContext(source, context);
    return { context, source, styles };
}

function profileLink(playerId) {
    return { getAttribute: () => `/profiles.php?XID=${playerId}` };
}

test('REQ-002 #7: desktop sidebar identity keeps the property manager eligible', () => {
    const { context } = loadScript();
    context.document.querySelector = (selector) => (selector.startsWith('#sidebarroot') ? profileLink(2720731) : null);
    assert.equal(context.getPlayerId(), '2720731');
});

test('REQ-002 #7: mobile settings identity keeps the property manager eligible after reload', () => {
    const { context } = loadScript();
    context.document.querySelector = (selector) => (selector.startsWith('.settings-menu') ? profileLink(2720731) : null);
    assert.equal(context.getPlayerId(), '2720731');
});

test('REQ-002 #7: unrelated profile links cannot become the logged-in identity', () => {
    const { context } = loadScript();
    context.document.querySelector = () => null;
    assert.equal(context.getPlayerId(), null);
});

test('REQ-002 #7: narrow screens can reach columns that exceed the panel width', () => {
    const { styles } = loadScript();
    assert.match(styles, /#pi-manager[\s\S]*overflow-x:\s*auto/);
});

test('REQ-003 #2: Torn PDA can inject its configured API key', () => {
    const { source } = loadScript();
    assert.match(source, /const apikey = '###PDA-APIKEY###';/);
});

test('REQ-002 #1: Torn PDA loads v2 property data with the page fetch transport', async () => {
    const { context } = loadScript();
    let requestedUrl;
    context.GM_xmlhttpRequest = undefined;
    context.window.PDA_httpGet = async () => {
        throw new Error('PDA_httpGet must not be called');
    };
    context.window.fetch = async (url) => {
        requestedUrl = url;
        return {
            ok: true,
            text: async () => JSON.stringify({ properties: [] }),
        };
    };

    const result = await context.getProperties();

    assert.equal(Array.isArray(result.properties), true);
    assert.equal(result.properties.length, 0);
    assert.match(requestedUrl, /^https:\/\/api\.torn\.com\/v2\/user\/properties\?/);
    assert.match(requestedUrl, /filters=ownedByUser&limit=100/);
});

test('REQ-002 #1: desktop uses GM_xmlhttpRequest when the PDA bridge is absent', async () => {
    const { context } = loadScript();
    let requestedUrl;
    context.GM_xmlhttpRequest = ({ url, onload }) => {
        requestedUrl = url;
        onload({ responseText: JSON.stringify({ properties: [] }) });
    };

    const result = await context.getProperties();

    assert.equal(Array.isArray(result.properties), true);
    assert.equal(result.properties.length, 0);
    assert.match(requestedUrl, /^https:\/\/api\.torn\.com\/v2\/user\/properties\?/);
});

test('REQ-002 #1: transport errors retain the request name and message', async () => {
    const { context } = loadScript();
    context.window.PDA_httpGet = () => {};
    context.window.fetch = async () => {
        throw new Error('native bridge unavailable');
    };

    await assert.rejects(context.getProperties(), {
        message: 'user/properties: Error: native bridge unavailable',
    });
});

test('REQ-002 #1: a failed PDA fetch reports the HTTP status', async () => {
    const { context } = loadScript();
    context.window.PDA_httpGet = () => {};
    context.window.fetch = async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
    });

    await assert.rejects(context.getProperties(), {
        message: 'user/properties: Error: HTTP 503: Service Unavailable',
    });
});

test('REQ-002 #2: nested v2 ownership fields exclude a spouse property', () => {
    const { context } = loadScript();
    const properties = [
        { id: 101, owner: { id: 2720731 }, property: { id: 13 } },
        { id: 102, owner: { id: 999 }, property: { id: 13 } },
        { id: 103, owner: { id: 2720731 }, property: { id: 12 } },
    ];

    assert.deepEqual(
        Array.from(context.ownedPiProperties(properties, 2720731), (property) => property.id),
        [101],
    );
});

test('REQ-002 #3: status uses the API total period instead of historical terms', () => {
    const { context } = loadScript();
    const property = { status: 'rented', rental_period_remaining: 28, rental_period: 30 };

    assert.equal(context.buildStatusCell(property), '28/30 days');
});

test('REQ-002 #3: every non-rented status remains open', () => {
    const { context } = loadScript();

    for (const status of ['none', 'in_use', 'for_sale', 'for_rent']) {
        assert.equal(context.buildStatusCell({ status }), 'Open');
    }
});

test('REQ-002 #3: only a rented property opens the extension tab', () => {
    const { context } = loadScript();

    assert.match(context.buildLinkCell({ id: 101, status: 'rented' }), /tab=offerExtension$/);
    assert.match(context.buildLinkCell({ id: 102, status: 'for_rent' }), /tab=lease$/);
});

test('REQ-002 #6: rented properties use v2 remaining days for urgency order', () => {
    const { context } = loadScript();
    const properties = [
        { id: 1, status: 'rented', rental_period_remaining: 28 },
        { id: 2, status: 'none', happy: 5000 },
        { id: 3, status: 'rented', rental_period_remaining: 2 },
    ];

    assert.deepEqual(
        Array.from(context.sortProperties(properties), (property) => property.id),
        [2, 3, 1],
    );
});

test('REQ-003 #3: v2 renter identity selects the matching historical terms', async () => {
    const { context } = loadScript();
    let renterId;
    context.getProperties = async () => ({
        properties: [{ id: 101, status: 'rented', rented_by: { id: 777 } }],
    });
    context.apiRequest = async () => ({ log: {} });
    context.findLastRentalTerms = (logData, propertyId, currentRenterId) => {
        renterId = currentRenterId;
        return null;
    };

    await context.fillOfferExtensionForm('101');

    assert.equal(renterId, 777);
});
