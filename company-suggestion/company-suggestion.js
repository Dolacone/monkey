// ==UserScript==
// @name         Torn: Company Position Suggestion
// @namespace    company-suggestion
// @version      1.0.0
// @description  Mark which Nightclub employees should switch position for the best predicted effectiveness
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
  const SINGLES = ['Manager', 'Barback', 'Bouncer', 'Disk-jockey'];
  const FILL = 'Bartender';
  const EDUCATION = 1.2; // BUS2110
  // data-multipliers indexes that do not depend on position:
  // settled_in, book, merits, director_education, addiction, inactivity.
  const CARRY_INDEXES = [1, 2, 3, 4, 7, 8];

  // ---- Prediction (REQ-002 #1-5) ----

  function workingStats(stats, position) {
    return REQ[position].reduce((sum, req, i) => {
      if (!req) return sum;
      const stat = stats[i] * EDUCATION;
      if (stat <= 0) return sum;
      return sum + Math.floor(Math.min(45, 45 / req * stat) + Math.max(0, 5 * Math.log2(stat / req)));
    }, 0);
  }

  function management(ws, position) {
    if (position === 'Manager' || ws >= 100) return 0;
    return Math.min(30, Math.floor(0.84 * (100 - ws) ** 0.795));
  }

  function predict(employee, position) {
    const ws = workingStats(employee.stats, position);
    return ws + management(ws, position) + employee.carry;
  }

  function carryFromMultipliers(multipliers) {
    return CARRY_INDEXES.reduce((sum, i) => sum + multipliers[i], 0);
  }

  // ---- Best assignment (REQ-002 #6-7) ----

  // Returns the suggested position for each employee, in input order.
  function bestAssignment(employees) {
    const n = employees.length;
    const fill = employees.map((e) => predict(e, FILL));
    const single = employees.map((e) => SINGLES.map((p) => predict(e, p)));
    const fillTotal = fill.reduce((a, b) => a + b, 0);
    let best = null;
    const pick = [];
    const visit = (slot) => {
      if (slot === SINGLES.length) {
        const singleSum = pick.reduce((s, k, i) => s + single[k][i], 0);
        const fillSum = fillTotal - pick.reduce((s, k) => s + fill[k], 0);
        const positions = employees.map((_, k) => (pick.includes(k) ? SINGLES[pick.indexOf(k)] : FILL));
        const moves = positions.filter((p, k) => p !== employees[k].position).length;
        if (!best || singleSum > best.singleSum
          || (singleSum === best.singleSum && (fillSum > best.fillSum || (fillSum === best.fillSum && moves < best.moves)))) {
          best = { singleSum, fillSum, moves, positions };
        }
        return;
      }
      for (let k = 0; k < n; k++) {
        if (pick.includes(k)) continue;
        pick.push(k);
        visit(slot + 1);
        pick.pop();
      }
    };
    if (n >= SINGLES.length) visit(0);
    return best ? best.positions : employees.map((e) => e.position);
  }

  // ---- Page scope (REQ-001 #2) ----

  function isNightclub(positionNames) {
    const names = positionNames.filter((p) => p !== 'Unassigned');
    return names.length === Object.keys(REQ).length && names.every((p) => p in REQ);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { workingStats, management, predict, carryFromMultipliers, bestAssignment, isNightclub };
    return;
  }

  // ---- DOM (REQ-001, REQ-002 #8-11) ----

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
      carry: carryFromMultipliers(JSON.parse(effectiveness.dataset.multipliers)),
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
    const suggested = bestAssignment(rows);
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
