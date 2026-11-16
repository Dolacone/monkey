const assert = require('node:assert/strict');
const test = require('node:test');

const { packageSettings, parseStock, isRestock, packStep, abroadStep, pickOwned, messageText, isTriggerKey } = require('./quick-purchase.js');

const CFG = { target: 'Xanax', sell: 'Vicodin', hosp: 'Blood Bag : A+', med: 'Blood Bag : O+' };

// REQ-002 #5: bag order self-hosp, med-out, sell becomes the three item settings; the target stays.
test('packageSettings reads the bag in self-hosp, med-out, sell order', () => {
  assert.deepEqual(packageSettings(['Blood Bag : B+', 'Morphine', 'Speed'], CFG),
    { target: 'Xanax', hosp: 'Blood Bag : B+', med: 'Morphine', sell: 'Speed' });
});

test('parseStock reads the stock cell text including the screen-reader label', () => {
  assert.equal(parseStock('9stock'), 9);
  assert.equal(parseStock('1,770stock'), 1770);
  assert.equal(parseStock('0stock'), 0);
  assert.equal(parseStock('stock'), null);
});

// REQ-006 #1: a non-zero first reading and any increase alert; drops from other buyers do not.
test('isRestock fires on a non-zero first reading and on any increase', () => {
  assert.equal(isRestock(undefined, 38), true);
  assert.equal(isRestock(undefined, 0), false);
  assert.equal(isRestock(0, 855), true);
  assert.equal(isRestock(5, 9), true);
  assert.equal(isRestock(1770, 1745), false);
  assert.equal(isRestock(5, 5), false);
});

// REQ-003 #1: one item per click, self-hosp, then med-out, then fill.
test('packStep packs self-hosp, then med-out, then fills the free slots', () => {
  assert.deepEqual(packStep([], 38, CFG), { act: 'pack', name: 'Blood Bag : A+' });
  assert.deepEqual(packStep(['Blood Bag : A+'], 37, CFG), { act: 'pack', name: 'Blood Bag : O+' });
  assert.deepEqual(packStep(['Blood Bag : A+', 'Blood Bag : O+'], 36, CFG), { act: 'fill', name: 'Vicodin' });
  assert.deepEqual(packStep(['Blood Bag : A+', 'Blood Bag : O+', 'Vicodin'], 0, CFG), { act: null });
});

// REQ-005 #1: in hospital, med out only after the target is in stock.
test('abroadStep meds out in hospital when the target is in stock', () => {
  assert.equal(abroadStep({ hospital: true, hasMed: true, sellCount: 36, stock: 855 }), 'med');
  assert.equal(abroadStep({ hospital: true, hasMed: true, sellCount: 36, stock: 0 }), null);
  assert.equal(abroadStep({ hospital: true, hasMed: false, sellCount: 36, stock: 855 }), null);
});

// REQ-005 #1: out of hospital, sell everything first, then buy while the target is in stock.
test('abroadStep sells before buying out of hospital', () => {
  assert.equal(abroadStep({ hospital: false, hasMed: false, sellCount: 36, stock: 0 }), 'sell');
  assert.equal(abroadStep({ hospital: false, hasMed: false, sellCount: 0, stock: 855 }), 'buy');
  assert.equal(abroadStep({ hospital: false, hasMed: true, sellCount: 0, stock: 855 }), 'buy');
  assert.equal(abroadStep({ hospital: false, hasMed: false, sellCount: 0, stock: 0 }), null);
});

// REQ-003 #2: the faction copy is packed when both exist.
test('pickOwned prefers the faction copy', () => {
  const list = [
    { id: 738, name: 'Blood Bag : O+', faction: false, disabled: false },
    { id: 738, name: 'Blood Bag : O+', faction: true, disabled: false },
    { id: 204, name: 'Speed', faction: false, disabled: false },
  ];
  assert.equal(pickOwned(list, 'Blood Bag : O+').faction, true);
  assert.equal(pickOwned(list, 'Speed').faction, false);
  assert.equal(pickOwned(list, 'Blood Bag : A+'), null);
});

// REQ-001 #11: Torn's HTML reply is shown as plain text, with the cooldown counter filled in.
test('messageText turns the useItem reply into plain text', () => {
  const html = 'You begin administering a blood transfusion, but quickly realize you\'re not compatible with this blood type.<br>You now have a medical cooldown of <span class="counter-wrap" data-time="13714"></span>.';
  assert.equal(messageText(html), "You begin administering a blood transfusion, but quickly realize you're not compatible with this blood type. You now have a medical cooldown of 3h 48m.");
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

// REQ-001 #6: typing in an input or chat keeps its normal behaviour.
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
