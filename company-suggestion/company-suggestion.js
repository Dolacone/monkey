// ==UserScript==
// @name         Torn: Company Position Suggestion
// @namespace    company-suggestion
// @version      2.1.0
// @description  Mark each Nightclub employee's suggested position and show predicted effectiveness on every position option
// @match        https://www.torn.com/companies.php*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/company-suggestion/company-suggestion.js
// @updateURL    https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/company-suggestion/company-suggestion.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const MOVE_CLASS = 'cs-move';
  const STYLE_ID = 'cs-style';

  // Nightclub working stat requirements: [manual labor, intelligence, endurance].
  const REQ = {
    'Bartender': [13500, 0, 27000],
    'Bouncer': [48000, 0, 24000],
    'Barback': [10250, 0, 20500],
    'Cleaner': [13500, 0, 6750],
    'Manager': [0, 27000, 54000],
    'Personal Assistant': [0, 20250, 40500],
    'Promoter': [0, 54000, 27000],
    'Trainer': [0, 81000, 40500],
    'Disk-jockey': [0, 40500, 20250],
  };
  const FILL = 'Bartender';
  const SINGLES = ['Barback', 'Bouncer', 'Disk-jockey'];
  const POOL = [...SINGLES, FILL, 'Trainer'];
  const TRAINER_MIN = 50;
  const ROLLOVER_HOUR = 18; // TCT = UTC
  const EDUCATION = 1.2; // BUS2110
  // data-multipliers order: [working_stats, settled_in, book, merits, director_education, management, wrong_gender, addiction, inactivity].
  const CARRY_INDEXES = [1, 2, 3, 4, 7, 8];
  const MANAGEMENT_PART_INDEXES = [1, 2, 3];
  const ADDICTION_INDEX = 7;
  // Log customer change per effectiveness point (FORMULAS.md); the first set is the model in use.
  const WEIGHT_SETS = [
    { 'Bartender': 0.001062, 'Bouncer': 0.001941, 'Barback': 0.001941, 'Disk-jockey': 0.001941 }, // bartender_vs_rest
    { 'Bartender': 0.001102, 'Bouncer': 0.003238, 'Barback': 0.001842, 'Disk-jockey': 0.001590 }, // per_position
    { 'Bartender': 0.001094, 'Bouncer': 0.003178, 'Barback': 0.001811, 'Disk-jockey': 0.001578 }, // per_position_trainer
    { 'Bartender': 0.001187, 'Bouncer': 0.001187, 'Barback': 0.001187, 'Disk-jockey': 0.001187 }, // total_eff
  ];

  // ---- Prediction (REQ-002: predicted effectiveness) ----

  function workingStats(stats, position) {
    return REQ[position].reduce((sum, req, i) => {
      if (!req) return sum;
      const stat = stats[i] * EDUCATION;
      if (stat <= 0) return sum;
      return sum + Math.floor(Math.min(45, 45 / req * stat) + Math.max(0, 5 * Math.log2(stat / req)));
    }, 0);
  }

  // parts: settled_in + merits + book.
  function management(ws, position, parts) {
    if (position === 'Manager') return 0;
    return Math.max(0, Math.min(30, Math.floor((115 - ws - parts) / 3)));
  }

  function predict(employee, position) {
    const ws = workingStats(employee.stats, position);
    return ws + management(ws, position, employee.parts) + employee.carry;
  }

  function fromMultipliers(multipliers) {
    const sum = (indexes) => indexes.reduce((s, i) => s + multipliers[i], 0);
    return { carry: sum(CARRY_INDEXES), parts: sum(MANAGEMENT_PART_INDEXES), addiction: multipliers[ADDICTION_INDEX] };
  }

  // ---- Target company day (REQ-002: target company day) ----

  // Weekday (0 = Sunday) of the company day that the next 18:00 TCT rollover starts.
  function targetWeekday(now) {
    return new Date(now.getTime() + (48 - ROLLOVER_HOUR) * 3600e3).getUTCDay();
  }

  // ---- Trainer (REQ-002: Manager and Trainer) ----

  // Index of the employee outside Manager whose Trainer prediction is above 50 and whose Bartender prediction,
  // addiction left out, is the lowest; -1 if none.
  function trainerPick(employees) {
    let best = -1;
    let bestValue = 0;
    employees.forEach((e, k) => {
      if (e.position === 'Manager' || predict(e, 'Trainer') <= TRAINER_MIN) return;
      const value = predict(e, FILL) - e.addiction;
      if (best < 0 || value < bestValue) [best, bestValue] = [k, value];
    });
    return best;
  }

  // ---- Arrangement (REQ-002: position arrangement) ----

  // Gain of moving members to positions under each weight set; a current Trainer counts as Bartender.
  // Points are summed per weight value before multiplying, so equal weights cancel exactly.
  function gains(members, positions) {
    return WEIGHT_SETS.map((w) => {
      const points = new Map();
      const add = (position, value) => points.set(w[position], (points.get(w[position]) || 0) + value);
      members.forEach((e, k) => {
        const from = e.position === 'Trainer' ? FILL : e.position;
        add(positions[k], predict(e, positions[k]));
        add(from, -predict(e, from));
      });
      let gain = 0;
      points.forEach((value, weight) => { gain += weight * value; });
      return gain;
    });
  }

  // One member in each single position and the rest Bartender: the arrangement that gains under every weight set,
  // largest gain under the first, fewer moves on a tie. If none gains, members stay and a current Trainer goes to Bartender.
  function bestArrangement(members) {
    let best = null;
    const n = members.length;
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) {
        for (let c = 0; c < n; c++) {
          if (a === b || a === c || b === c) continue;
          const positions = members.map(() => FILL);
          [positions[a], positions[b], positions[c]] = SINGLES;
          const g = gains(members, positions);
          if (Math.min(...g) <= 0) continue;
          const moves = positions.filter((p, k) => p !== members[k].position).length;
          if (!best || g[0] > best.gain || (g[0] === best.gain && moves < best.moves)) best = { gain: g[0], moves, positions };
        }
      }
    }
    return best ? best.positions : members.map((e) => (e.position === 'Trainer' ? FILL : e.position));
  }

  // ---- Suggestion ----

  // Suggested position for each employee, in input order, for a target company day on weekday (0 = Sunday).
  function suggest(employees, weekday) {
    const positions = employees.map((e) => e.position);
    const pick = weekday >= 1 && weekday <= 5 ? trainerPick(employees) : -1;
    if (pick >= 0) positions[pick] = 'Trainer';
    const members = employees.map((_, k) => k).filter((k) => k !== pick && POOL.includes(employees[k].position));
    const arranged = bestArrangement(members.map((k) => employees[k]));
    members.forEach((k, i) => { positions[k] = arranged[i]; });
    return positions;
  }

  // ---- Option text (REQ-002: display) ----

  function optionText(employee, name) {
    return name in REQ ? `${name}(${predict(employee, name)})` : name;
  }

  // ---- Page scope (REQ-001 #2) ----

  function isNightclub(positionNames) {
    const names = positionNames.filter((p) => p !== 'Unassigned');
    return names.length === Object.keys(REQ).length && names.every((p) => p in REQ);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { workingStats, management, predict, fromMultipliers, targetWeekday, trainerPick, gains, bestArrangement, suggest, optionText, isNightclub };
    return;
  }

  // ---- DOM (REQ-001, REQ-002: display) ----

  function readRow(li) {
    const effectiveness = li.querySelector('.effectiveness[data-multipliers]');
    const select = li.querySelector('select.employee-rank');
    const status = li.querySelector('.rank .ui-selectmenu-status');
    const spans = [...li.querySelectorAll('.acc-body .stats .span-cont')];
    if (!effectiveness || !select || !status || spans.length !== 3) return null;
    const button = status.closest('[aria-owns]');
    return {
      li,
      status,
      menu: button && document.getElementById(button.getAttribute('aria-owns')),
      options: [...select.options].map((o) => o.text.trim()),
      position: select.options[select.selectedIndex].text.trim(),
      stats: spans.map((s) => Number(s.querySelector('.t-show:not(.bold)').textContent.replace(/\D/g, ''))),
      ...fromMultipliers(JSON.parse(effectiveness.dataset.multipliers)),
    };
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `#employees ul.employee-list > li.${MOVE_CLASS} { background: purple !important; }`;
    document.head.append(style);
  }

  function render() {
    const rows = [...document.querySelectorAll('#employees ul.employee-list > li')].map(readRow);
    if (!rows.length || rows.includes(null) || !isNightclub(rows[0].options)) return;
    ensureStyle();
    const suggested = suggest(rows, targetWeekday(new Date()));
    rows.forEach((row, k) => {
      const move = suggested[k] !== row.position;
      row.li.classList.toggle(MOVE_CLASS, move);
      const text = move ? `${row.position} > ${suggested[k]}` : row.position;
      if (row.status.textContent !== text) row.status.textContent = text;
      const links = row.menu ? row.menu.querySelectorAll('li > a') : [];
      row.options.forEach((name, i) => {
        const label = optionText(row, name);
        if (links[i] && links[i].textContent !== label) links[i].textContent = label;
      });
    });
  }

  let timer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(run, 150);
  });
  function run() {
    observer.disconnect();
    try {
      render();
    } finally {
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }
  window.addEventListener('hashchange', run);
  run();
})();
