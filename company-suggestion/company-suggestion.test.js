const assert = require('node:assert/strict');
const test = require('node:test');

const { workingStats, management, predict, fromMultipliers, weakest, bestPair, suggest, isNightclub } = require('./company-suggestion.js');

// Real Nightclub employees on company day 2026-11-05: live stats [manual labor, intelligence, endurance],
// the position-independent carry, the management parts (settled_in + merits + book), addiction, and the in-game total.
const STAFF = {
  Kyrax: { stats: [61959, 64982, 73058], carry: 19, parts: 10, addiction: -3, total: 129 },
  RMForever: { stats: [102089, 25178, 145878], carry: 4, parts: 11, addiction: -19, total: 114 },
  jadefish: { stats: [12656, 130439, 116024], carry: 32, parts: 20, addiction: 0, total: 140 },
  LexxLuth: { stats: [10241, 7238, 21704], carry: 12, parts: 13, addiction: -13, total: 101 },
  Aells_jia: { stats: [47428, 52411, 59045], carry: 14, parts: 20, addiction: -18, total: 116 },
  Saikoa: { stats: [21493, 1506, 40746], carry: 16, parts: 14, addiction: -10, total: 115 },
  Humerm: { stats: [11872, 27597, 37179], carry: 16, parts: 12, addiction: -8, total: 112 },
  Rulse: { stats: [16196, 9458, 32537], carry: 22, parts: 10, addiction: 0, total: 119 },
  Yaii: { stats: [11399, 10813, 24866], carry: 60, parts: 60, addiction: -12, total: 154 },
  bilioo: { stats: [12407, 10511, 26581], carry: 22, parts: 10, addiction: 0, total: 117 },
  V50: { stats: [21230, 16969, 25037], carry: 21, parts: 14, addiction: -5, total: 117 },
  FF357: { stats: [9181, 13230, 20470], carry: 22, parts: 10, addiction: 0, total: 80 },
};

const CURRENT = {
  Kyrax: 'Bartender', RMForever: 'Bouncer', jadefish: 'Manager', LexxLuth: 'Bartender', Aells_jia: 'Disk-jockey',
  Saikoa: 'Bartender', Humerm: 'Bartender', Rulse: 'Bartender', Yaii: 'Barback', bilioo: 'Bartender', V50: 'Bartender',
  FF357: 'Trainer',
};

function company(positions, staff = STAFF) {
  return Object.entries(positions).map(([name, position]) => ({ name, position, ...staff[name] }));
}

function moves(staff) {
  const suggested = suggest(staff);
  return Object.fromEntries(staff.flatMap((e, k) => (suggested[k] === e.position ? [] : [[e.name, `${e.position} > ${suggested[k]}`]])));
}

test('REQ-002 #2: working stats match the in-game values (x1.2, each stat floored on its own)', () => {
  // Stats and values the game reported on 2026-10-15.
  const cases = [
    [[61350, 64982, 71861], 'Barback', 114], [[100808, 25178, 145227], 'Bouncer', 110], [[12656, 129788, 114722], 'Manager', 108],
    [[47372, 51101, 58332], 'Disk-jockey', 100], [[20772, 1506, 39491], 'Bartender', 98], [[6093, 4399, 6642], 'Bartender', 37],
    [[15532, 9403, 31225], 'Bartender', 94], [[8536, 13028, 19304], 'Bartender', 72], [[141, 55, 170], 'Bartender', 0],
    // Flooring the sum instead of each stat gives 88 and 91 here.
    [[10714, 10533, 23660], 'Bartender', 87], [[11810, 10423, 25386], 'Bartender', 90],
  ];
  for (const [stats, position, expected] of cases) {
    assert.equal(workingStats(stats, position), expected, `${stats} as ${position}`);
  }
});

test('REQ-002 #4: management counts settled_in, merits and book with working stats, caps at 30', () => {
  // [working stats, settled_in + merits + book, in-game management]
  const observed = [
    [83, 13, 6], [98, 14, 1], [93, 12, 3], [94, 10, 3], [91, 10, 4], [94, 14, 2], [35, 10, 23], [110, 10, 0],
    // book +50: working stats alone would give 7.
    [94, 60, 0],
    // omnicor on 2026-10-15: settled_in 10, merits 6.
    [14, 16, 28],
    [0, 0, 30],
  ];
  for (const [ws, parts, expected] of observed) {
    assert.equal(management(ws, 'Bartender', parts), expected, `ws ${ws} parts ${parts}`);
  }
});

test('REQ-002 #4: the Manager gets no management bonus', () => {
  assert.equal(management(14, 'Manager', 0), 0);
});

test('REQ-002 #5: multipliers split into carry, management parts and addiction', () => {
  // [working_stats, settled_in, book, merits, director_education, management, wrong_gender, addiction, inactivity]
  assert.deepEqual(fromMultipliers([110, 10, 0, 1, 12, 0, 0, -15, 0]), { carry: 8, parts: 11, addiction: -15 });
  assert.deepEqual(fromMultipliers([94, 10, 50, 0, 12, 0, 99, -12, -2]), { carry: 58, parts: 60, addiction: -12 });
});

test('REQ-002 #1: prediction at the current position equals the in-game total for every employee', () => {
  for (const e of company(CURRENT)) {
    assert.equal(predict(e, e.position), e.total, e.name);
  }
});

test('REQ-002 #7: the weakest is the lowest Bartender prediction with addiction left out', () => {
  const staff = company(CURRENT);
  // LexxLuth predicts 101 as Bartender with addiction -13, lower than FF357's 107; without addiction LexxLuth is 114.
  assert.equal(staff[weakest(staff)].name, 'FF357');
});

test('REQ-002 #7: the Manager is never the weakest', () => {
  const staff = company(CURRENT, { ...STAFF, jadefish: { ...STAFF.jadefish, stats: [0, 0, 0], carry: -100 } });
  assert.equal(staff[weakest(staff)].name, 'FF357');
});

test('REQ-002 #13, #16: the 2026-11-05 company swaps Kyrax to Bouncer and RMForever to Bartender', () => {
  assert.deepEqual(moves(company(CURRENT)), { Kyrax: 'Bartender > Bouncer', RMForever: 'Bouncer > Bartender' });
});

test('REQ-002 #14: after that swap no other swap gains under every weight set', () => {
  assert.deepEqual(moves(company({ ...CURRENT, Kyrax: 'Bouncer', RMForever: 'Bartender' })), {});
});

test('REQ-002 #13: a swap that only some weight sets gain is not suggested', () => {
  // With no stats every position predicts 30 + carry, so the swap gains under per_position_trainer and is 0 under total_eff.
  const flat = { A: { stats: [0, 0, 0], carry: 50, parts: 0, addiction: 0 }, B: { stats: [0, 0, 0], carry: 10, parts: 0, addiction: 0 },
    C: { stats: [0, 0, 0], carry: -50, parts: 0, addiction: 0 } };
  const staff = company({ A: 'Bartender', B: 'Bouncer', C: 'Trainer' }, flat);
  assert.equal(bestPair(staff, 2), null);
  assert.deepEqual(moves(staff), {});
});

test('REQ-002 #8, #15: the weakest out of Trainer moves there and no swap is shown that day', () => {
  assert.deepEqual(moves(company({ ...CURRENT, FF357: 'Bartender' })), { FF357: 'Bartender > Trainer' });
});

test('REQ-002 #8: another employee in Trainer goes to Bartender', () => {
  assert.deepEqual(moves(company({ ...CURRENT, FF357: 'Bartender', Humerm: 'Trainer' })),
    { FF357: 'Bartender > Trainer', Humerm: 'Trainer > Bartender' });
});

test('REQ-002 #9: the single position the weakest leaves is not filled', () => {
  assert.deepEqual(moves(company({ ...CURRENT, FF357: 'Barback', Yaii: 'Bartender' })), { FF357: 'Barback > Trainer' });
});

test('REQ-002 #6, #10: the Manager and employees outside the swap positions are not moved', () => {
  const result = moves(company({ ...CURRENT, LexxLuth: 'Promoter' }));
  assert.equal(result.jadefish, undefined);
  assert.equal(result.LexxLuth, undefined);
});

test('REQ-001 #2: only the Nightclub position list is recognised', () => {
  const nightclub = ['Bartender', 'Disk-jockey', 'Barback', 'Bouncer', 'Manager', 'Promoter', 'Trainer', 'Personal Assistant', 'Cleaner', 'Unassigned'];
  assert.equal(isNightclub(nightclub), true);
  assert.equal(isNightclub(['Manager', 'Cleaner', 'Trainer', 'Sales Assistant', 'Store Manager', 'Unassigned']), false);
  assert.equal(isNightclub(nightclub.filter((p) => p !== 'Disk-jockey')), false);
});
