const assert = require('node:assert/strict');
const test = require('node:test');

function makeLogNode(text, options = {}) {
    return {
        nodeType: 1,
        col1Class: options.side === 'defender' ? 'color-2___iX1n6' : 'color-1____8JuW',
        iconClass: options.icon || 'attacking-events-standart-damage',
        messageText: text,
        damageText: options.damage || '',
        timeText: options.time || '',
    };
}

function makeSelection(value) {
    return {
        0: value && value.nodeType !== undefined ? value : undefined,
        length: value ? 1 : 0,
        find(selector) {
            if (selector.includes('col1')) return makeSelection({ className: value.col1Class });
            if (selector.includes('col2')) return makeSelection({ textValue: value.timeText });
            if (selector.includes('attacking-events')) return makeSelection({ className: value.iconClass });
            if (selector.includes('message') && selector.includes('em')) {
                return value.damageText ? makeSelection({ textValue: value.damageText }) : makeSelection(null);
            }
            if (selector.includes('message')) return makeSelection({ textValue: value.messageText });
            return makeSelection(null);
        },
        hasClass(className) {
            return (value.className || '').split(/\s+/).includes(className);
        },
        attr(name) {
            return name === 'class' ? value.className : undefined;
        },
        text(nextText) {
            if (arguments.length) {
                if (!value) return this;
                value.textValue = nextText;
                return this;
            }
            if (!value) return '';
            return value.textValue || '';
        },
        css() {
            return this;
        },
        addClass() {
            return this;
        },
        prependTo(target) {
            if (typeof target === 'string') target = global.$(target);
            target.unshift(value.textValue);
            return this;
        },
        appendTo(target) {
            if (typeof target === 'string') target = global.$(target);
            target.push(value.textValue);
            return this;
        },
    };
}

function loadScriptWithLogDom() {
    delete require.cache[require.resolve('./fight-shortcuts.js')];

    const overlay = [];
    const logList = { observeCount: 0, observer: null, rows: [] };

    global.document = { body: {} };
    global.window = undefined;
    global.MutationObserver = class {
        constructor(callback) {
            this.callback = callback;
        }
        observe(target) {
            target.observeCount++;
            target.observer = this.callback;
        }
    };
    global.$ = function (arg) {
        if (arg === 'ul[class*="list___"]') return { 0: logList, length: 1 };
        if (arg === logList) return {
            children() {
                return {
                    each(callback) {
                        logList.rows.forEach(row => callback.call(row));
                    },
                };
            },
        };
        if (arg === '<div>') return makeSelection({ textValue: '' });
        if (arg === '#action-log-info') return {
            length: 1,
            empty() {
                overlay.length = 0;
                return this;
            },
            push(text) {
                overlay.push(text);
            },
        };
        return makeSelection(arg);
    };

    const script = require('./fight-shortcuts.js');
    return { script, overlay, logList };
}

function replaceLogRows(logList, rows) {
    logList.rows = rows;
    logList.observer([{ type: 'childList' }]);
}

function loadScriptWithArmorDom() {
    delete require.cache[require.resolve('./fight-shortcuts.js')];

    const state = {
        areas: [],
        overlay: [],
        armorObserver: null,
    };

    const defenderPlayer = {
        0: { nodeType: 1 },
        length: 1,
        find(selector) {
            if (selector === 'map area') {
                return {
                    length: state.areas.length,
                    each(callback) {
                        state.areas.forEach(area => callback.call(area));
                    },
                };
            }
            if (selector === '.playerWindow___sDs7q') {
                return {
                    0: { nodeType: 1 },
                    length: 1,
                    css() {
                        return this;
                    },
                };
            }
            return { length: 0, css() { return this; } };
        },
    };

    const players = {
        has() {
            return defenderPlayer;
        },
        not() {
            return {
                find() {
                    return { css() { return this; } };
                },
            };
        },
    };

    global.document = { body: {} };
    global.window = undefined;
    global.MutationObserver = class {
        constructor(callback) {
            this.callback = callback;
        }
        observe(target) {
            if (target !== global.document.body) state.armorObserver = this.callback;
        }
        disconnect() {}
    };
    global.$ = function (arg) {
        if (arg === '.player___vjxP2') return players;
        if (arg === '#armor-info') return {
            remove() {
                state.overlay = [];
            },
        };
        if (arg === '<div id="armor-info"></div>') return {
            css() {
                return this;
            },
            prependTo() {
                return {
                    append(text) {
                        state.overlay.push(text);
                    },
                };
            },
        };
        if (arg === '<div id="action-log-info"></div>') return {
            appendTo() {
                return this;
            },
        };
        if (arg === '<div>') return {
            addClass() {
                return this;
            },
            text(text) {
                this.textValue = text;
                return this;
            },
            appendTo(target) {
                target.append(this.textValue);
                return this;
            },
        };
        if (arg && Object.hasOwn(arg, 'alt')) return {
            attr(name) {
                return arg[name];
            },
        };
        if (arg === 'ul[class*="list___"]') return { 0: null, length: 0 };
        return { length: 0 };
    };

    const script = require('./fight-shortcuts.js');
    return { script, state };
}

test('correct design: defender armor overlay updates when armor areas arrive after initial No armor render', () => {
    const { script, state } = loadScriptWithArmorDom();

    script.analyzeDefenderArmor(0);
    assert.deepEqual(state.overlay, ['No armor']);

    state.areas = [
        { alt: 'Helmet', title: 'Combat Helmet' },
        { alt: 'Pants', title: 'Combat Pants' },
        { alt: 'Gloves', title: 'Combat Gloves' },
        { alt: 'Gloves', title: 'Combat Gloves' },
    ];
    state.armorObserver();

    assert.deepEqual(state.overlay, [
        'Combat Helmet',
        'Combat Pants',
        'Combat Gloves',
    ]);
});

test('correct design: action log observer attaches only once', () => {
    const { script, logList } = loadScriptWithLogDom();

    script.startLogObserver();
    script.startLogObserver();

    assert.equal(logList.observeCount, 1);
});

test('correct design: action overlay preserves original latest-first order for batched log entries', () => {
    const { script, overlay, logList } = loadScriptWithLogDom();
    script.startLogObserver();

    replaceLogRows(logList, [
        makeLogNode('Dola fired 3 TR rounds hitting TriageStat for 981', { damage: '981' }),
        makeLogNode('Dola fired 3 TR rounds hitting TriageStat for 212', { damage: '212' }),
        makeLogNode('Dola fired 3 TR rounds missing TriageStat', { icon: 'attacking-events-miss' }),
        makeLogNode('Dola fired 2 rounds hitting TriageStat for 1797', { damage: '1797' }),
        makeLogNode('Dola fired 1 round hitting TriageStat for 536', { damage: '536' }),
        makeLogNode('Dola fired 1 round missing TriageStat', { icon: 'attacking-events-miss' }),
        makeLogNode('Dola initiated an attack against TriageStat', { icon: 'attacking-events-attack-join' }),
    ]);

    assert.deepEqual(overlay, [
        '981',
        '212',
        'MISS',
        '1797',
        '536',
        'MISS',
        'Dola joined',
    ]);
});

test('correct design: action overlay does not duplicate existing events after repeated observer starts', () => {
    const { script, overlay, logList } = loadScriptWithLogDom();
    script.startLogObserver();
    script.startLogObserver();

    replaceLogRows(logList, [
        makeLogNode('Dola fired 3 TR rounds hitting TriageStat for 981', { damage: '981' }),
        makeLogNode('Dola initiated an attack against TriageStat', { icon: 'attacking-events-attack-join' }),
    ]);

    assert.deepEqual(overlay, ['981', 'Dola joined']);
});

test('correct design: rebuilt action log list fully renews overlay from current rows', () => {
    const { script, overlay, logList } = loadScriptWithLogDom();
    script.startLogObserver();

    replaceLogRows(logList, [
        makeLogNode('Dola initiated an attack against Doc-Holliday', { icon: 'attacking-events-attack-join' }),
    ]);

    replaceLogRows(logList, [
        makeLogNode('Dola fired 2 rounds hitting Doc-Holliday in the Right leg for 586', { damage: '586' }),
        makeLogNode('Dola initiated an attack against Doc-Holliday', { icon: 'attacking-events-attack-join' }),
    ]);

    replaceLogRows(logList, [
        makeLogNode('Doc-Holliday critically hit Dola with his Metal Nunchaku in the Head for 5617', { side: 'defender', icon: 'attacking-events-critical-hit', damage: '5617' }),
        makeLogNode('Dola fired 2 rounds critically hitting Doc-Holliday in the Throat for 3518', { icon: 'attacking-events-specialist', damage: '3518' }),
        makeLogNode('Dola fired 2 rounds hitting Doc-Holliday in the Right leg for 586', { damage: '586' }),
        makeLogNode('Dola initiated an attack against Doc-Holliday', { icon: 'attacking-events-attack-join' }),
    ]);

    replaceLogRows(logList, [
        makeLogNode('Dola fired 3 rounds hitting Doc-Holliday in the Right hand for 409', { icon: 'attacking-events-attack-win', damage: '409' }),
        makeLogNode('Doc-Holliday critically hit Dola with his Metal Nunchaku in the Head for 5617', { side: 'defender', icon: 'attacking-events-critical-hit', damage: '5617' }),
        makeLogNode('Dola fired 2 rounds critically hitting Doc-Holliday in the Throat for 3518', { icon: 'attacking-events-specialist', damage: '3518' }),
        makeLogNode('Dola fired 2 rounds hitting Doc-Holliday in the Right leg for 586', { damage: '586' }),
        makeLogNode('Dola initiated an attack against Doc-Holliday', { icon: 'attacking-events-attack-join' }),
    ]);

    assert.deepEqual(overlay, [
        '409',
        '5617 CRI',
        '3518 CRI',
        '586',
        'Dola joined',
    ]);
});
