// ==UserScript==
// @name         Torn: Company Position Suggestion
// @namespace    company-suggestion
// @version      2.0.0
// @description  Mark the Nightclub Trainer change or the one position swap with the largest predicted customer gain
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
  const MOVABLE = ['Barback', 'Bouncer', 'Disk-jockey', 'Bartender'];
  const EDUCATION = 1.2; // BUS2110
  // data-multipliers order: [working_stats, settled_in, book, merits, director_education, management, wrong_gender, addiction, inactivity].
  const CARRY_INDEXES = [1, 2, 3, 4, 7, 8];
  const MANAGEMENT_PART_INDEXES = [1, 2, 3];
  const ADDICTION_INDEX = 7;
  // Log customer change per effectiveness point; the first set decides between swaps.
  const WEIGHT_SETS = [
    { 'Bartender': 0.001057, 'Bouncer': 0.003355, 'Barback': 0.002448, 'Disk-jockey': 0.001343 }, // per_position_trainer
    { 'Bartender': 0.001035, 'Bouncer': 0.001987, 'Barback': 0.001987, 'Disk-jockey': 0.001987 }, // bartender_vs_rest
    { 'Bartender': 0.001053, 'Bouncer': 0.003504, 'Barback': 0.002500, 'Disk-jockey': 0.001446 }, // per_position
    { 'Bartender': 0.001189, 'Bouncer': 0.001189, 'Barback': 0.001189, 'Disk-jockey': 0.001189 }, // total_eff
  ];

  // ---- Prediction (REQ-002 #1-5) ----

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

  // ---- Trainer (REQ-002 #7) ----

  // Index of the employee outside Manager with the lowest Bartender prediction, addiction left out; -1 if none.
  function weakest(employees) {
    let best = -1;
    employees.forEach((e, k) => {
      if (e.position === 'Manager') return;
      const value = predict(e, FILL) - e.addiction;
      if (best < 0 || value < predict(employees[best], FILL) - employees[best].addiction) best = k;
    });
    return best;
  }

  // ---- Swap (REQ-002 #10-14) ----

  // The swap of two employees that gains under every weight set, largest gain under the first; null if none.
  function bestPair(employees, skip) {
    const pool = employees.map((_, k) => k).filter((k) => k !== skip && MOVABLE.includes(employees[k].position));
    let best = null;
    for (let a = 0; a < pool.length; a++) {
      for (let b = a + 1; b < pool.length; b++) {
        const [i, j] = [pool[a], pool[b]];
        const [pi, pj] = [employees[i].position, employees[j].position];
        if (pi === pj) continue;
        const gains = WEIGHT_SETS.map((w) => (w[pj] * predict(employees[i], pj) - w[pi] * predict(employees[i], pi))
          + (w[pi] * predict(employees[j], pi) - w[pj] * predict(employees[j], pj)));
        if (Math.min(...gains) > 0 && (!best || gains[0] > best.gain)) best = { gain: gains[0], i, j };
      }
    }
    return best;
  }

  // ---- Suggestion (REQ-002 #6, #8-9, #15-16) ----

  // Returns the suggested position for each employee, in input order.
  function suggest(employees) {
    const positions = employees.map((e) => e.position);
    const w = weakest(employees);
    if (w >= 0 && positions[w] !== 'Trainer') {
      employees.forEach((e, k) => { if (e.position === 'Trainer') positions[k] = FILL; });
      positions[w] = 'Trainer';
      return positions;
    }
    const pair = bestPair(employees, w);
    if (pair) [positions[pair.i], positions[pair.j]] = [positions[pair.j], positions[pair.i]];
    return positions;
  }

  // ---- Page scope (REQ-001 #2) ----

  function isNightclub(positionNames) {
    const names = positionNames.filter((p) => p !== 'Unassigned');
    return names.length === Object.keys(REQ).length && names.every((p) => p in REQ);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { workingStats, management, predict, fromMultipliers, weakest, bestPair, suggest, isNightclub };
    return;
  }

  // ---- DOM (REQ-001, REQ-002 #17-20) ----

  function readRow(li) {
    const effectiveness = li.querySelector('.effectiveness[data-multipliers]');
    const select = li.querySelector('select.employee-rank');
    const status = li.querySelector('.rank .ui-selectmenu-status');
    const spans = [...li.querySelectorAll('.acc-body .stats .span-cont')];
    if (!effectiveness || !select || !status || spans.length !== 3) return null;
    return {
      li,
      status,
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
    const suggested = suggest(rows);
    rows.forEach((row, k) => {
      const move = suggested[k] !== row.position;
      row.li.classList.toggle(MOVE_CLASS, move);
      const text = move ? `${row.position} > ${suggested[k]}` : row.position;
      if (row.status.textContent !== text) row.status.textContent = text;
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
