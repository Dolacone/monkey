const assert = require('node:assert/strict');
const test = require('node:test');

const { parseStock, isRestock, nextAction, isOutbound, findSlots, messageText, isTriggerKey } = require('./quick-purchase.js');

test('parseStock reads the stock cell text including the screen-reader label', () => {
  assert.equal(parseStock('9stock'), 9);
  assert.equal(parseStock('1,770stock'), 1770);
  assert.equal(parseStock('0stock'), 0);
  assert.equal(parseStock('stock'), null);
});

// REQ-006 #1: 0 -> positive is a restock.
test('isRestock fires when stock rises from 0', () => {
  assert.equal(isRestock(0, 1), true);
  assert.equal(isRestock(0, 4713), true);
});

// REQ-006 #2: other buyers lowering the stock, or positive -> positive, never fires.
test('isRestock ignores drops and positive-to-positive changes', () => {
  assert.equal(isRestock(1770, 1745), false);
  assert.equal(isRestock(5, 0), false);
  assert.equal(isRestock(5, 9), false);
  assert.equal(isRestock(0, 0), false);
  assert.equal(isRestock(0, null), false);
});

// REQ-006 #3: the first reading fires when the target is already in stock, and stays quiet at 0.
test('isRestock fires on a non-zero first reading only', () => {
  assert.equal(isRestock(undefined, 38), true);
  assert.equal(isRestock(undefined, 0), false);
  assert.equal(isRestock(undefined, null), false);
});

// Abroad three-step flow: an open confirm panel always wins, whatever the step counter says.
test('nextAction confirms whenever the confirm panel is open', () => {
  assert.equal(nextAction(0, 'confirm'), 'confirm');
  assert.equal(nextAction(1, 'confirm'), 'confirm');
});

// Abroad three-step flow: the mobile amount panel's Buy comes next whenever that panel is open.
test('nextAction clicks the panel Buy whenever the mobile amount panel is open', () => {
  assert.equal(nextAction(0, 'amount'), 'panelBuy');
  assert.equal(nextAction(1, 'amount'), 'panelBuy');
});

// Abroad three-step flow: with no panel open, the first click fills max and the second clicks Buy (or the mobile cart).
test('nextAction alternates max then buy with no panel open', () => {
  assert.equal(nextAction(0, null), 'max');
  assert.equal(nextAction(1, null), 'buy');
});

// REQ-004 #1, #3: only the flight away from Torn self-hosps; the flight home does nothing.
test('isOutbound reads the flight progress text', () => {
  assert.equal(isOutbound('Torn to Japan.Remaining Flight Time - 00:08:18Landing at 10:40:50.'), true);
  assert.equal(isOutbound('Japan to Torn.Remaining Flight Time - 00:08:18Landing at 10:40:50.'), false);
  assert.equal(isOutbound(undefined), false);
});

// REQ-004 #1, #2: the hosp item is found by name; a used slot stays in the list with item null.
test('findSlots skips used slots and other items', () => {
  const slots = [
    { ID: 1, item: null },
    { ID: 2, item: { name: 'Blood Bag : O+' } },
    { ID: 3, item: { name: 'Blood Bag : A+' } },
    { ID: 4, item: { name: 'Speed' } },
  ];
  assert.deepEqual(findSlots(slots, 'Blood Bag : A+').map((s) => s.ID), [3]);
  assert.deepEqual(findSlots(slots, 'Xanax'), []);
  assert.deepEqual(findSlots(undefined, 'Blood Bag : A+'), []);
});

// REQ-001 #12-13: Torn's HTML reply is shown as plain text, with the cooldown counter filled in.
test('messageText turns the useItem reply into plain text', () => {
  const html = 'You begin administering a blood transfusion, but quickly realize you\'re not compatible with this blood type.<br>You now have a medical cooldown of <span class="counter-wrap" data-time="13714"></span>.';
  assert.equal(messageText(html), "You begin administering a blood transfusion, but quickly realize you're not compatible with this blood type. You now have a medical cooldown of 3h 48m.");
  assert.equal(messageText(undefined), '');
});

const BODY = { tagName: 'BODY' };
const key = (k, extra = {}) => ({ key: k, repeat: false, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, target: BODY, ...extra });

// REQ-001 #5: q and space act like a bar click; other keys do nothing.
test('isTriggerKey accepts q and space only', () => {
  assert.equal(isTriggerKey(key('q')), true);
  assert.equal(isTriggerKey(key(' ')), true);
  assert.equal(isTriggerKey(key('Q')), true);
  assert.equal(isTriggerKey(key('w')), false);
  assert.equal(isTriggerKey(key('Enter')), false);
});

// REQ-001 #6: typing in the quantity field or chat keeps its normal behaviour.
test('isTriggerKey ignores keys typed into editable fields', () => {
  assert.equal(isTriggerKey(key('q', { target: { tagName: 'INPUT', type: 'text' } })), false);
  assert.equal(isTriggerKey(key(' ', { target: { tagName: 'TEXTAREA' } })), false);
  assert.equal(isTriggerKey(key('q', { target: { tagName: 'DIV', isContentEditable: true } })), false);
  assert.equal(isTriggerKey(key(' ', { target: { tagName: 'BUTTON' } })), true);
  assert.equal(isTriggerKey(key(' ', { target: { tagName: 'INPUT', type: 'button' } })), true);
});

// REQ-001 #7: modifier combinations (for example Cmd+Q) never trigger.
test('isTriggerKey ignores modifier combinations', () => {
  for (const mod of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
    assert.equal(isTriggerKey(key('q', { [mod]: true })), false, mod);
  }
});

// REQ-001 #8: holding the key down counts once.
test('isTriggerKey ignores auto-repeat', () => {
  assert.equal(isTriggerKey(key(' ', { repeat: true })), false);
});
