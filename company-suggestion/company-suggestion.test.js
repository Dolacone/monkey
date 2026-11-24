const assert = require('node:assert/strict');
const test = require('node:test');

const { workingStats, management, predict, fromMultipliers, targetWeekday, trainerPick, suggest, optionText, isNightclub } =
  require('./company-suggestion.js');

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

// The same company on 2026-11-22 (Torn API), with the new hire BbLoup.
const STAFF_1122 = {
  Kyrax: { stats: [63057, 64982, 73616], carry: 5, parts: 10, addiction: -17 },
  RMForever: { stats: [102583, 25178, 146862], carry: 5, parts: 11, addiction: -18 },
  jadefish: { stats: [12656, 130997, 117140], carry: 32, parts: 20, addiction: 0 },
  Aells_jia: { stats: [47439, 53530, 59635], carry: 11, parts: 20, addiction: -21 },
  Saikoa: { stats: [22095, 1506, 41817], carry: 21, parts: 14, addiction: -5 },
  Humerm: { stats: [16519, 27647, 40465], carry: 13, parts: 12, addiction: -11 },
  Rulse: { stats: [16733, 9533, 33583], carry: 22, parts: 10, addiction: 0 },
  Yaii: { stats: [11913, 11088, 25935], carry: 58, parts: 60, addiction: -14 },
  bilioo: { stats: [12929, 10616, 27618], carry: 19, parts: 10, addiction: -3 },
  V50: { stats: [22452, 20784, 28903], carry: 22, parts: 14, addiction: -4 },
  FF357: { stats: [9500, 13671, 21293], carry: 19, parts: 10, addiction: -3 },
  BbLoup: { stats: [4529, 2306, 3750], carry: 8, parts: 7, addiction: -11 },
};

const CURRENT_1122 = {
  Kyrax: 'Bouncer', RMForever: 'Barback', jadefish: 'Manager', Aells_jia: 'Disk-jockey', Saikoa: 'Bartender',
  Humerm: 'Bartender', Rulse: 'Bartender', Yaii: 'Bartender', bilioo: 'Bartender', V50: 'Bartender', FF357: 'Bartender',
  BbLoup: 'Bartender',
};

const TUESDAY = 2;
const SATURDAY = 6;

function company(positions, staff = STAFF) {
  return Object.entries(positions).map(([name, position]) => ({ name, position, ...staff[name] }));
}

function nov22(changes = {}, staff = STAFF_1122) {
  return company({ ...CURRENT_1122, ...changes }, staff);
}

function moves(staff, weekday) {
  const suggested = suggest(staff, weekday);
  return Object.fromEntries(staff.flatMap((e, k) => (suggested[k] === e.position ? [] : [[e.name, `${e.position} > ${suggested[k]}`]])));
}

test('REQ-002 prediction: working stats match the in-game values (x1.2, each stat floored on its own)', () => {
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

test('REQ-002 prediction: management counts settled_in, merits and book with working stats, caps at 30', () => {
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

test('REQ-002 prediction: the Manager gets no management bonus', () => {
  assert.equal(management(14, 'Manager', 0), 0);
});

test('REQ-002 prediction: multipliers split into carry, management parts and addiction', () => {
  // [working_stats, settled_in, book, merits, director_education, management, wrong_gender, addiction, inactivity]
  assert.deepEqual(fromMultipliers([110, 10, 0, 1, 12, 0, 0, -15, 0]), { carry: 8, parts: 11, addiction: -15 });
  assert.deepEqual(fromMultipliers([94, 10, 50, 0, 12, 0, 99, -12, -2]), { carry: 58, parts: 60, addiction: -12 });
});

test('REQ-002 prediction: prediction at the current position equals the in-game total for every employee', () => {
  for (const e of company(CURRENT)) {
    assert.equal(predict(e, e.position), e.total, e.name);
  }
});

test('REQ-002 prediction: options show each position with the prediction from live stats', () => {
  const [kyrax] = nov22();
  // Bouncer is Kyrax's current position; the game reported 108 there.
  assert.equal(optionText(kyrax, 'Bouncer'), 'Bouncer(108)');
  const ff357 = nov22().find((e) => e.name === 'FF357');
  assert.equal(optionText(ff357, 'Bartender'), 'Bartender(107)');
  assert.equal(optionText(ff357, 'Trainer'), 'Trainer(78)');
  // The Manager position gets no management bonus.
  assert.equal(optionText(ff357, 'Manager'), 'Manager(67)');
  assert.equal(optionText(ff357, 'Unassigned'), 'Unassigned');
});

test('REQ-002 target company day: the company day the next 18:00 TCT rollover starts', () => {
  const at = (iso) => targetWeekday(new Date(iso));
  assert.equal(at('2026-11-27T10:00:00Z'), SATURDAY, 'Friday before 18:00 sets Saturday');
  assert.equal(at('2026-11-26T20:00:00Z'), SATURDAY, 'Thursday after 18:00 sets Saturday');
  assert.equal(at('2026-11-27T20:00:00Z'), 0, 'Friday after 18:00 sets Sunday');
  assert.equal(at('2026-11-29T17:59:00Z'), 1, 'Sunday 17:59 sets Monday');
  assert.equal(at('2026-11-29T18:00:00Z'), TUESDAY, 'Sunday 18:00 sets Tuesday');
});

test('REQ-002 Trainer: the lowest Bartender prediction, addiction left out, among Trainer predictions above 50', () => {
  const staff = nov22();
  // BbLoup is lowest (60 + 11 = 71) but predicts 44 as Trainer; FF357 is next (107 + 3 = 110) and predicts 78.
  assert.equal(staff[trainerPick(staff)].name, 'FF357');
});

test('REQ-002 Trainer: a Trainer prediction of exactly 50 is not above 50', () => {
  const at50 = nov22({}, { ...STAFF_1122, BbLoup: { ...STAFF_1122.BbLoup, carry: 14 } });
  assert.equal(predict(at50.find((e) => e.name === 'BbLoup'), 'Trainer'), 50);
  assert.equal(at50[trainerPick(at50)].name, 'FF357');
  const at51 = nov22({}, { ...STAFF_1122, BbLoup: { ...STAFF_1122.BbLoup, carry: 15 } });
  assert.equal(at51[trainerPick(at51)].name, 'BbLoup');
});

test('REQ-002 Trainer: the Manager is never the Trainer pick', () => {
  // With no stats the Manager would predict 62 as Trainer and 62 as Bartender, lower than everyone else.
  const staff = nov22({}, { ...STAFF_1122, jadefish: { ...STAFF_1122.jadefish, stats: [0, 0, 0] } });
  assert.equal(staff[trainerPick(staff)].name, 'FF357');
});

// The best arrangement from the 2026-11-22 saved positions, Trainer aside.
const BEST_1122 = { Kyrax: 'Bouncer > Bartender', RMForever: 'Barback > Bouncer', Yaii: 'Bartender > Barback' };

test('REQ-002 Trainer: on a weekday company day the pick moves to Trainer', () => {
  assert.deepEqual(moves(nov22(), TUESDAY), { ...BEST_1122, FF357: 'Bartender > Trainer' });
});

test('REQ-002 Trainer: on a weekend company day nobody moves to Trainer', () => {
  assert.deepEqual(moves(nov22(), SATURDAY), BEST_1122);
});

test('REQ-002 Trainer: on a weekend company day the Trainer joins the arrangement', () => {
  assert.deepEqual(moves(nov22({ FF357: 'Trainer' }), SATURDAY), { ...BEST_1122, FF357: 'Trainer > Bartender' });
});

test('REQ-002 Trainer: another employee in Trainer leaves on a weekday', () => {
  assert.deepEqual(moves(nov22({ Humerm: 'Trainer' }), TUESDAY),
    { ...BEST_1122, Humerm: 'Trainer > Bartender', FF357: 'Bartender > Trainer' });
});

test('REQ-002 arrangement: the suggestion is the same whichever participants hold the single positions', () => {
  const target = (changes) => {
    const staff = nov22(changes);
    const suggested = suggest(staff, TUESDAY);
    return Object.fromEntries(staff.map((e, k) => [e.name, suggested[k]]));
  };
  const best = target({});
  assert.deepEqual(target({ Kyrax: 'Barback', RMForever: 'Disk-jockey', Aells_jia: 'Bouncer' }), best);
  assert.deepEqual(target({ Humerm: 'Bouncer', Kyrax: 'Bartender' }), best);
});

test('REQ-002 arrangement: a second Barback goes back to Bartender', () => {
  // Barback points weigh more than Bartender points, so only the whole arrangement brings the second Barback back.
  assert.deepEqual(moves(nov22({ V50: 'Barback' }), TUESDAY),
    { ...BEST_1122, V50: 'Barback > Bartender', FF357: 'Bartender > Trainer' });
});

test('REQ-002 arrangement: every move of the best arrangement shows at once', () => {
  assert.deepEqual(moves(nov22({ Kyrax: 'Barback', RMForever: 'Disk-jockey', Aells_jia: 'Bouncer' }), SATURDAY), {
    Kyrax: 'Barback > Bartender', RMForever: 'Disk-jockey > Bouncer', Aells_jia: 'Bouncer > Disk-jockey', Yaii: 'Bartender > Barback',
  });
});

test('REQ-002 arrangement: the single position the Trainer pick leaves is filled', () => {
  assert.deepEqual(moves(nov22({ FF357: 'Barback', RMForever: 'Bartender' }), TUESDAY), {
    Kyrax: 'Bouncer > Bartender', RMForever: 'Bartender > Bouncer', Yaii: 'Bartender > Barback', FF357: 'Barback > Trainer',
  });
});

test('REQ-002 arrangement: the Manager and other positions stay', () => {
  assert.deepEqual(moves(nov22({ Saikoa: 'Promoter' }), TUESDAY), { ...BEST_1122, FF357: 'Bartender > Trainer' });
});

test('REQ-001 #2: only the Nightclub position list is recognised', () => {
  const nightclub = ['Bartender', 'Disk-jockey', 'Barback', 'Bouncer', 'Manager', 'Promoter', 'Trainer', 'Personal Assistant', 'Cleaner', 'Unassigned'];
  assert.equal(isNightclub(nightclub), true);
  assert.equal(isNightclub(['Manager', 'Cleaner', 'Trainer', 'Sales Assistant', 'Store Manager', 'Unassigned']), false);
  assert.equal(isNightclub(nightclub.filter((p) => p !== 'Disk-jockey')), false);
});
