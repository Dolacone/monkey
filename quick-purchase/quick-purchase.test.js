const assert = require('node:assert/strict');
const test = require('node:test');

const { parseStock, isRestock, nextAction, isTriggerKey } = require('./quick-purchase.js');

test('parseStock reads the stock cell text including the screen-reader label', () => {
  assert.equal(parseStock('9stock'), 9);
  assert.equal(parseStock('1,770stock'), 1770);
  assert.equal(parseStock('0stock'), 0);
  assert.equal(parseStock('stock'), null);
});

// REQ-003 #1: 0 -> positive is a restock.
test('isRestock fires when stock rises from 0', () => {
  assert.equal(isRestock(0, 1), true);
  assert.equal(isRestock(0, 4713), true);
});

// REQ-003 #2: other buyers lowering the stock, or positive -> positive, never fires.
test('isRestock ignores drops and positive-to-positive changes', () => {
  assert.equal(isRestock(1770, 1745), false);
  assert.equal(isRestock(5, 0), false);
  assert.equal(isRestock(5, 9), false);
  assert.equal(isRestock(0, 0), false);
  assert.equal(isRestock(0, null), false);
});

// REQ-003 #3: the first reading after load has no previous value and never fires.
test('isRestock does not fire without a previous reading', () => {
  assert.equal(isRestock(undefined, 38), false);
});

// REQ-002 #1: an open confirm panel always wins, whatever the step counter says.
test('nextAction confirms whenever the confirm panel is open', () => {
  assert.equal(nextAction(0, true), 'confirm');
  assert.equal(nextAction(1, true), 'confirm');
});

// REQ-002 #2: without a confirm panel, the first click fills max and the second clicks Buy.
test('nextAction alternates max then buy without a confirm panel', () => {
  assert.equal(nextAction(0, false), 'max');
  assert.equal(nextAction(1, false), 'buy');
});

const BODY = { tagName: 'BODY' };
const key = (k, extra = {}) => ({ key: k, repeat: false, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, target: BODY, ...extra });

// REQ-002 #9: q and space act like a bar click; other keys do nothing.
test('isTriggerKey accepts q and space only', () => {
  assert.equal(isTriggerKey(key('q')), true);
  assert.equal(isTriggerKey(key(' ')), true);
  assert.equal(isTriggerKey(key('Q')), true);
  assert.equal(isTriggerKey(key('w')), false);
  assert.equal(isTriggerKey(key('Enter')), false);
});

// REQ-002 #10: typing in the quantity field or chat keeps its normal behaviour.
test('isTriggerKey ignores keys typed into editable fields', () => {
  assert.equal(isTriggerKey(key('q', { target: { tagName: 'INPUT', type: 'text' } })), false);
  assert.equal(isTriggerKey(key(' ', { target: { tagName: 'TEXTAREA' } })), false);
  assert.equal(isTriggerKey(key('q', { target: { tagName: 'DIV', isContentEditable: true } })), false);
  assert.equal(isTriggerKey(key(' ', { target: { tagName: 'BUTTON' } })), true);
  assert.equal(isTriggerKey(key(' ', { target: { tagName: 'INPUT', type: 'button' } })), true);
});

// REQ-002 #11: modifier combinations (for example Cmd+Q) never trigger.
test('isTriggerKey ignores modifier combinations', () => {
  for (const mod of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
    assert.equal(isTriggerKey(key('q', { [mod]: true })), false, mod);
  }
});

// REQ-002 #12: holding the key down counts once.
test('isTriggerKey ignores auto-repeat', () => {
  assert.equal(isTriggerKey(key(' ', { repeat: true })), false);
});
