const assert = require('node:assert/strict');
const test = require('node:test');

const { calcPowerScore, formatPowerLine } = require('./equip-display-bonus.js');

const SIG_BASE = { name: 'SIG 552', damage: 74, accuracy: 55, bonuses: [] };
const bonus = (name, percent) => ({ name, percent: String(percent) });

function assertWithin(actual, expected, pct) {
    assert.ok(Math.abs(actual / expected - 1) * 100 <= pct, `${actual} not within ${pct}% of ${expected}`);
}

test('REQ-003 #9: the baseline weapon itself scores 10000 / 10000', () => {
    const steyr = { name: 'Steyr AUG', damage: 74.93, accuracy: 54.66, bonuses: [bonus('Powerful', 30), bonus('Sure Shot', 3)] };
    const score = calcPowerScore(steyr, steyr);
    assert.equal(score.burst, 10000);
    assert.equal(score.sustain, 10000);
});

test('REQ-003 #9: burst and sustain scale separately against the baseline', () => {
    // Enfield runs much longer on its ammo than SIG 552 but deals about the same in 25 turns.
    const enfield = calcPowerScore({ name: 'Enfield SA-80', damage: 68, accuracy: 60, bonuses: [] }, SIG_BASE);
    assert.ok(Math.abs(enfield.burst - 10000) < 1000);
    assert.ok(enfield.sustain > 14000);
});

test('REQ-003 #11: missing or unknown baseline falls back to SIG 552 74/55 without bonus', () => {
    const enfield = { name: 'Enfield SA-80', damage: 68, accuracy: 60, bonuses: [] };
    const expected = calcPowerScore(enfield, SIG_BASE);
    assert.deepEqual(calcPowerScore(enfield, null), expected);
    assert.deepEqual(calcPowerScore(enfield, { name: 'Dual Uzis', damage: 70, accuracy: 50, bonuses: [] }), expected);
});

test('REQ-003 #12/#15: scores track the fight simulator within 1%', () => {
    // Expected values come from torn-fight-simulator runs of the same fixed scenario (100000 trials).
    assertWithin(calcPowerScore({ name: 'SIG 552', damage: 74, accuracy: 55, bonuses: [bonus('Powerful', 22)] }, SIG_BASE).burst, 12000, 1);
    assertWithin(calcPowerScore({ name: 'Enfield SA-80', damage: 68, accuracy: 60, bonuses: [bonus('Powerful', 22)] }, SIG_BASE).burst, 12532, 1);
    // Sustain: Enfield Powerful 24369 vs SIG 552 13129, both in burst-scaled simulator units.
    assertWithin(calcPowerScore({ name: 'Enfield SA-80', damage: 68, accuracy: 60, bonuses: [bonus('Powerful', 22)] }, SIG_BASE).sustain, 18561, 1.5);
});

test('REQ-003 #16: the same weapon always produces the same numbers', () => {
    const weapon = { name: 'M249 SAW', damage: 60, accuracy: 50, bonuses: [bonus('Deadeye', 60)] };
    assert.deepEqual(calcPowerScore(weapon, SIG_BASE), calcPowerScore(weapon, SIG_BASE));
});

test('REQ-003 #5/#6/#7: non-primary, excluded and unknown weapons get no score', () => {
    ['Dual Uzis', 'Snow Cannon', 'Egg Propelled Launcher', 'Neutrilux 2000', 'Kodachi', 'Qsz-92', 'Riot Body', '']
        .forEach((name) => assert.equal(calcPowerScore({ name, damage: 60, accuracy: 55, bonuses: [] }, SIG_BASE), null, name));
});

test('REQ-003 #4/#18: an uncomputed bonus marks both numbers with +X but leaves them unchanged', () => {
    const plain = calcPowerScore({ name: 'MP5 Navy', damage: 56.38, accuracy: 57.83, bonuses: [] }, SIG_BASE);
    const comeback = calcPowerScore({ name: 'MP5 Navy', damage: 56.38, accuracy: 57.83, bonuses: [bonus('Comeback', 70)] }, SIG_BASE);
    assert.equal(comeback.burst, plain.burst);
    assert.equal(comeback.sustain, plain.sustain);
    assert.equal(formatPowerLine(comeback), `${plain.burst}+X / ${plain.sustain}+X`);
    assert.equal(formatPowerLine(plain), `${plain.burst} / ${plain.sustain}`);
});

test('REQ-003 #18: bonuses with no combat effect still mark +X as other value', () => {
    ['Plunder', 'Proficience', 'Revitalize', 'Stricken', 'Warlord'].forEach((name) => {
        const score = calcPowerScore({ name: 'AK74U', damage: 56, accuracy: 48, bonuses: [bonus(name, 20)] }, SIG_BASE);
        assert.equal(score.partial, true, name);
    });
});

test('REQ-003 #17: every computed bonus changes the score', () => {
    const cases = [
        ['Enfield SA-80', 'Achilles'], ['Enfield SA-80', 'Assassinate'], ['Benelli M4 Super', 'Blindside'],
        ['Enfield SA-80', 'Conserve'], ['Enfield SA-80', 'Cupid'], ['Enfield SA-80', 'Deadeye'],
        ['Enfield SA-80', 'Expose'], ['Enfield SA-80', 'Penetrate'], ['Enfield SA-80', 'Powerful'],
        ['MP5 Navy', 'Quicken'], ['Enfield SA-80', 'Specialist'], ['Enfield SA-80', 'Sure Shot'], ['Enfield SA-80', 'Throttle'],
    ];
    cases.forEach(([name, bonusName]) => {
        const plain = calcPowerScore({ name, damage: 65, accuracy: 55, bonuses: [] }, SIG_BASE);
        const withBonus = calcPowerScore({ name, damage: 65, accuracy: 55, bonuses: [bonus(bonusName, 30)] }, SIG_BASE);
        assert.notDeepEqual(withBonus, plain, bonusName);
        assert.equal(withBonus.partial, false, bonusName);
    });
});

test('REQ-003 #19: Specialist allows a single clip, so sustain drops far more than burst', () => {
    const plain = calcPowerScore({ name: 'Enfield SA-80', damage: 68, accuracy: 60, bonuses: [] }, SIG_BASE);
    const specialist = calcPowerScore({ name: 'Enfield SA-80', damage: 68, accuracy: 60, bonuses: [bonus('Specialist', 28)] }, SIG_BASE);
    assert.ok(specialist.sustain < plain.sustain / 2);
    assert.ok(specialist.sustain / plain.sustain < specialist.burst / plain.burst);
});

test('REQ-003 #19: Conserve stretches the ammo, raising sustain more than burst', () => {
    const plain = calcPowerScore({ name: 'SIG 552', damage: 74, accuracy: 55, bonuses: [] }, SIG_BASE);
    const conserve = calcPowerScore({ name: 'SIG 552', damage: 74, accuracy: 55, bonuses: [bonus('Conserve', 30)] }, SIG_BASE);
    assert.ok(conserve.sustain / plain.sustain > conserve.burst / plain.burst);
});

test('REQ-003 #13: Nock Gun cannot take a Recoil Pad, so it burns ammo faster than an identical padded shotgun', () => {
    // Benelli M1 Tactical has the same 7-round clip; its Pad spends fewer rounds per attack.
    const nock = calcPowerScore({ name: 'Nock Gun', damage: 60, accuracy: 55, bonuses: [] }, SIG_BASE);
    const benelli = calcPowerScore({ name: 'Benelli M1 Tactical', damage: 60, accuracy: 55, bonuses: [] }, SIG_BASE);
    assert.ok(nock.sustain < benelli.sustain);
});

test('REQ-003 #20: two computed bonuses stack', () => {
    const weapon = (bonuses) => calcPowerScore({ name: 'SIG 552', damage: 74, accuracy: 55, bonuses }, SIG_BASE).burst;
    const powerful = weapon([bonus('Powerful', 22)]);
    const deadeye = weapon([bonus('Deadeye', 46)]);
    assert.ok(weapon([bonus('Powerful', 22), bonus('Deadeye', 46)]) > Math.max(powerful, deadeye));
});
