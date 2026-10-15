const assert = require('node:assert/strict');
const test = require('node:test');

const { workingStats, management, predict, carryFromMultipliers, bestAssignment, isNightclub } = require('./company-suggestion.js');

// Real Nightclub employees: live stats [manual labor, intelligence, endurance] and the position-independent carry.
const STAFF = {
  jadefish: { stats: [12656, 129788, 114722], carry: 32 },
  RMForever: { stats: [100808, 25178, 145227], carry: 8 },
  Aells_jia: { stats: [47372, 51101, 58332], carry: 18 },
  Kyrax: { stats: [61350, 64982, 71861], carry: 8 },
  ManOnFire: { stats: [6093, 4399, 6642], carry: 15 },
  Rulse: { stats: [15532, 9403, 31225], carry: 22 },
  Yaii: { stats: [10714, 10533, 23660], carry: 12 },
  bilioo: { stats: [11810, 10423, 25386], carry: -14 },
  FF357: { stats: [8536, 13028, 19304], carry: 22 },
  omnicor: { stats: [1556, 7269, 4552], carry: 25 },
  Blaznbeth712: { stats: [141, 55, 170], carry: 19 },
  Saikoa: { stats: [20772, 1506, 39491], carry: 26 },
};

function company(positions) {
  return Object.entries(positions).map(([name, position]) => ({ name, position, ...STAFF[name] }));
}

const CURRENT = {
  jadefish: 'Manager', RMForever: 'Bouncer', 'Aells_jia': 'Disk-jockey', Kyrax: 'Bartender', ManOnFire: 'Bartender',
  Rulse: 'Bartender', Yaii: 'Bartender', bilioo: 'Bartender', FF357: 'Bartender', omnicor: 'Bartender',
  Blaznbeth712: 'Bartender', Saikoa: 'Barback',
};

test('REQ-002 #2: working stats match the in-game values (x1.2, each stat floored on its own)', () => {
  // Values the game reported for these employees at these positions.
  const cases = [
    ['Kyrax', 'Barback', 114], ['RMForever', 'Bouncer', 110], ['jadefish', 'Manager', 108],
    ['Aells_jia', 'Disk-jockey', 100], ['Saikoa', 'Bartender', 98], ['ManOnFire', 'Bartender', 37],
    ['Rulse', 'Bartender', 94], ['FF357', 'Bartender', 72], ['Blaznbeth712', 'Bartender', 0],
    // Flooring the sum instead of each stat gives 88 and 91 here.
    ['Yaii', 'Bartender', 87], ['bilioo', 'Bartender', 90],
  ];
  for (const [name, position, expected] of cases) {
    assert.equal(workingStats(STAFF[name].stats, position), expected, `${name} as ${position}`);
  }
});

test('REQ-002 #4: management follows the observed curve, caps at 30, stops at 100', () => {
  const observed = [[0, 30], [9, 30], [14, 28], [37, 22], [72, 11], [87, 6], [90, 5], [94, 3], [98, 1], [100, 0], [114, 0]];
  for (const [ws, expected] of observed) {
    assert.equal(management(ws, 'Bartender'), expected, `ws ${ws}`);
  }
});

test('REQ-002 #4: the Manager gets no management bonus', () => {
  assert.equal(management(14, 'Manager'), 0);
  assert.equal(management(0, 'Manager'), 0);
});

test('REQ-002 #5: carry sums only the position-independent multipliers', () => {
  // [working_stats, settled_in, book, merits, director_education, management, wrong_gender, addiction, inactivity]
  assert.equal(carryFromMultipliers([110, 10, 0, 1, 12, 0, 0, -15, 0]), 8);
  assert.equal(carryFromMultipliers([14, 10, 0, 6, 12, 28, 99, -3, 0]), 25);
});

test('REQ-002 #1: prediction is working stats + management + carry', () => {
  // ManOnFire as Bartender: 37 + 22 + 15 = 74, the in-game total.
  assert.equal(predict({ ...STAFF.ManOnFire }, 'Bartender'), 74);
});

test('REQ-002 #6-7: the current company is already optimal, so nothing moves', () => {
  const staff = company(CURRENT);
  assert.deepEqual(bestAssignment(staff), staff.map((e) => e.position));
});

test('REQ-002 #7: single positions win even when the Bartender total drops', () => {
  // Before the swap the single positions summed 498 and Bartenders 726; after it 504 and 719.
  const staff = company({ ...CURRENT, Kyrax: 'Barback', Saikoa: 'Bartender' });
  const suggested = Object.fromEntries(bestAssignment(staff).map((p, k) => [staff[k].name, p]));
  assert.equal(suggested.Saikoa, 'Barback');
  assert.equal(suggested.Kyrax, 'Bartender');
});

test('REQ-002 #7: ties keep the arrangement with the fewest moves', () => {
  // jadefish as Manager and Aells_jia as Manager tie on both sums; the current Manager stays.
  const staff = company({ ...CURRENT, Kyrax: 'Barback', Saikoa: 'Bartender' });
  const suggested = Object.fromEntries(bestAssignment(staff).map((p, k) => [staff[k].name, p]));
  assert.equal(suggested.jadefish, 'Manager');
  assert.equal(suggested['Aells_jia'], 'Disk-jockey');
  const swapped = company({ ...CURRENT, jadefish: 'Disk-jockey', 'Aells_jia': 'Manager' });
  assert.deepEqual(bestAssignment(swapped), swapped.map((e) => e.position));
});

test('REQ-001 #2: only the Nightclub position list is recognised', () => {
  const nightclub = ['Bartender', 'Disk-jockey', 'Barback', 'Bouncer', 'Manager', 'Promoter', 'Trainer', 'Personal Assistant', 'Cleaner', 'Unassigned'];
  assert.equal(isNightclub(nightclub), true);
  assert.equal(isNightclub(['Manager', 'Cleaner', 'Trainer', 'Sales Assistant', 'Store Manager', 'Unassigned']), false);
  assert.equal(isNightclub(nightclub.filter((p) => p !== 'Disk-jockey')), false);
});
