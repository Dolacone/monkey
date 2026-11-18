const assert = require('node:assert/strict');
const test = require('node:test');

const { pinsFrom, isPinned, byLeaveThenBack, perHour, destOf, money, statusText, lineIndex, inFlight } = require('./torn-intel-priority.user.js');

const at = (h, m) => new Date(2026, 10, 18, h, m).getTime();
const trip = (country, itemId, leave, back, profit = 0) => ({ country, itemId, departAt: leave, returnAt: back, profit });

// REQ-001 #1: the pinned rows on torn-intel are the priority pairs.
test('pinsFrom reads the site favorites as country + item pairs', () => {
  const raw = JSON.stringify([
    { code: 'jap', itemId: 206, itemName: 'Xanax' },
    { code: 'haw', itemId: 1485, itemName: 'Shark Fin' },
  ]);
  assert.deepEqual(pinsFrom(raw), [{ country: 'jap', itemId: 206 }, { country: 'haw', itemId: 1485 }]);
  assert.deepEqual(pinsFrom(null), []);
});

// REQ-001 #1: a pair counts only when both the country and the item are pinned.
test('isPinned needs the same country and the same item', () => {
  const pins = [{ country: 'jap', itemId: 206 }, { country: 'haw', itemId: 1485 }];
  assert.equal(isPinned(pins, trip('jap', 206)), true);
  assert.equal(isPinned(pins, trip('haw', 1485)), true);
  assert.equal(isPinned(pins, trip('can', 206)), false);
  assert.equal(isPinned(pins, trip('haw', 1486)), false);
});

// REQ-002 #9: one mixed list ordered by LEAVE, then by BACK.
test('byLeaveThenBack orders by leave time and breaks ties by back time', () => {
  const rows = [
    trip('haw', 1485, at(12, 10), at(15, 0)),
    trip('jap', 206, at(11, 37), at(15, 26)),
    trip('haw', 1486, at(12, 10), at(14, 50)),
  ];
  assert.deepEqual(rows.sort(byLeaveThenBack).map((r) => r.itemId), [206, 1486, 1485]);
});

// REQ-002 #7: PROFIT is the trip profit per hour from LEAVE to BACK.
test('perHour divides the trip profit by the LEAVE-to-BACK hours', () => {
  assert.equal(money(perHour(trip('haw', 1485, at(12, 0), at(15, 0), 3e6))), '$1.0M');
  assert.equal(money(perHour(trip('jap', 206, at(11, 37), at(15, 26), 4.7e6))), '$1.2M');
});

// REQ-002 #5: DEST is the country abbreviation only.
test('destOf shows the country abbreviation', () => {
  assert.equal(destOf('jap'), 'JPN');
  assert.equal(destOf('haw'), 'HAW');
});

// REQ-002 #17: the header shows the flight arrival, the latest return when abroad, or in Torn.
test('statusText shows the flight arrival, the latest return when abroad, or in Torn', () => {
  assert.equal(statusText({ traveling: true, name: 'Torn', arrivalAt: at(11, 12) }, 'wlt', at(10, 0)), 'Torn at 11:12');
  assert.equal(statusText({ traveling: true, name: 'Hawaii', arrivalAt: at(12, 30) }, 'wlt', at(11, 30)), 'Hawaii at 12:30');
  assert.equal(statusText({ traveling: false, abroad: true, name: 'Hawaii', code: 'haw' }, 'wlt', at(14, 25)), 'in Hawaii (return at 15:28)');
  assert.equal(statusText({ traveling: false, abroad: true, name: 'Japan', code: 'jap' }, 'airstrip', at(14, 25)), 'in Japan (return at 16:55)');
  assert.equal(statusText({ traveling: false, abroad: false, name: '' }, 'wlt', at(14, 25)), 'in Torn');
  assert.equal(statusText(null, 'wlt', at(14, 25)), '');
});

// REQ-007 #3, #4 (and REQ-005 #3, #4): the line goes after the last row whose BUY is not later than the time.
test('lineIndex places the line by BUY time, before every row when no BUY is earlier', () => {
  const rows = [
    { buyAt: at(14, 16) },
    { buyAt: at(15, 29) },
    { buyAt: at(16, 42) },
    { buyAt: at(17, 51) },
  ];
  assert.equal(lineIndex(rows, at(16, 45)), 3);
  assert.equal(lineIndex(rows, at(16, 42)), 3);
  assert.equal(lineIndex(rows, at(13, 0)), 0);
  assert.equal(lineIndex(rows, null), -1);
});

// REQ-007 #6: BACK turns purple when OC is ready from LEAVE (included) until BACK (excluded).
test('inFlight is true from LEAVE up to, but not including, BACK', () => {
  const t = trip('jap', 206, at(14, 40), at(18, 29));
  assert.equal(inFlight(t, at(16, 45)), true);
  assert.equal(inFlight(t, at(14, 40)), true);
  assert.equal(inFlight(t, at(18, 29)), false);
  assert.equal(inFlight(t, at(14, 39)), false);
  assert.equal(inFlight(t, null), false);
});
