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
    context.$.each = () => {};
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
