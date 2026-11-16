const assert = require('node:assert/strict');
const test = require('node:test');

const { mergeSettings, settingsError, parseStock, isRestock, isOutbound, parseBar, abroadAction, findSlots, messageText, isTriggerKey } = require('./quick-purchase.js');

// REQ-002 #1, #3, #6: stored values win, missing keys fall back to defaults, and an empty value stays empty (skip).
test('mergeSettings fills defaults and keeps empty values', () => {
  assert.deepEqual(mergeSettings(null), { target: 'Xanax', sell: 'Speed', hosp: 'Blood Bag : A+', med: 'Blood Bag : O+' });
  assert.deepEqual(mergeSettings({ target: ' Plushie ', hosp: '' }), { target: 'Plushie', sell: 'Speed', hosp: '', med: 'Blood Bag : O+' });
  assert.equal(mergeSettings({ target: 42 }).target, 'Xanax');
});

// REQ-002 #7: the sell item may not equal the target, or the next click would sell what was just bought.
test('settingsError rejects a sell item equal to the target, ignoring case', () => {
  assert.equal(typeof settingsError({ target: 'Xanax', sell: ' xanax' }), 'string');
  assert.equal(settingsError({ target: 'Xanax', sell: 'Speed' }), null);
  assert.equal(settingsError({ target: '', sell: '' }), null);
});


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

const BASE = { hasTarget: true, hasMed: true, sold: true, stock: 0, price: 646899, cash: 42925112, free: 1, hospital: true, medOut: false, sellPacked: true, sellRefused: false };
const act = (over) => abroadAction({ ...BASE, ...over });

// REQ-005 #1: in hospital, wait for the restock before using the med-out item.
test('abroadAction waits in hospital until the target is in stock', () => {
  assert.equal(act({ stock: 0 }).act, null);
  assert.match(act({ stock: 0 }).text, /waiting for restock/);
  assert.equal(act({ stock: null }).act, null);
  assert.equal(act({ stock: 855 }).act, 'med');
});

// REQ-005 #1, #3: med out comes first; after a successful med out the next click sells, then buys.
test('abroadAction orders med out, sell, buy', () => {
  assert.equal(act({ stock: 855 }).act, 'med');
  assert.equal(act({ stock: 855, medOut: true }).act, 'sell');
  assert.equal(act({ stock: 855, hospital: false }).act, 'sell');
  assert.equal(act({ stock: 855, hospital: false, sellPacked: false, free: 37 }).act, 'buy');
});

// REQ-005 #1: a country without the target does nothing at all, not even med out or sell.
test('abroadAction does nothing when the target is not sold here', () => {
  assert.deepEqual(act({ sold: false, stock: 855 }), { act: null, text: 'not sold here' });
});

// REQ-005 #4: once the shop refuses the sell item, clicks go straight to buying.
test('abroadAction skips the sell after a refusal', () => {
  assert.equal(act({ hospital: false, stock: 855, free: 2, sellRefused: true }).act, 'buy');
});

// REQ-002 #6: an empty target skips med out and buy, but still sells; an empty med-out item never meds out.
test('abroadAction skips the steps whose setting is empty', () => {
  assert.equal(act({ hasTarget: false, sold: false, stock: null }).act, null);
  assert.match(act({ hasTarget: false, sold: false, stock: null }).text, /no target/);
  assert.equal(act({ hasTarget: false, sold: false, hospital: false }).act, 'sell');
  assert.match(act({ hasTarget: false, sold: false, hospital: false, sellPacked: false }).text, /no target/);
  assert.match(act({ hasMed: false, stock: 855 }).text, /no med-out/);
});

// REQ-005 #2: buy the smallest of stock, free slots, and what the cash covers.
test('abroadAction buys min(stock, free, cash / price)', () => {
  const out = { hospital: false, sellPacked: false };
  assert.equal(act({ ...out, stock: 855, free: 37 }).amount, 37);
  assert.equal(act({ ...out, stock: 5, free: 37 }).amount, 5);
  assert.equal(act({ ...out, stock: 855, free: 37, cash: 646899 * 3 + 1 }).amount, 3);
});

// REQ-005 #1: nothing to buy gives a reason instead of a request.
test('abroadAction explains bag full, no stock, and no cash', () => {
  const out = { hospital: false, sellPacked: false };
  assert.deepEqual(act({ ...out, stock: 855, free: 0 }), { act: null, text: 'bag full' });
  assert.match(act({ ...out, stock: 0, free: 37 }).text, /out of stock/);
  assert.deepEqual(act({ ...out, stock: 855, free: 37, cash: 100 }), { act: null, text: 'not enough cash' });
});

// REQ-005 #2: cash and free slots come from the bar; packed items count as purchased.
test('parseBar reads cash and free slots from the message bar', () => {
  assert.deepEqual(parseBar('You are in Japan and have $42,925,112. You have purchased 37 / 38 items so far.'), { cash: 42925112, free: 1 });
  assert.equal(parseBar('Torn to Japan.'), null);
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
  assert.deepEqual(findSlots(slots, 'blood bag : a+').map((s) => s.ID), [3], 'REQ-002 #5: names ignore case');
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
