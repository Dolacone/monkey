// ==UserScript==
// @name         Torn: Equipment Bonus Display
// @namespace    equip-display-bonus
// @version      1.1.1
// @description  Permanently overlay weapon/armor bonus name + percentage, plus a primary weapon power score, on Item Market, Faction Armoury, and Auction House
// @match        https://www.torn.com/page.php?sid=ItemMarket*
// @match        https://www.torn.com/factions.php*
// @match        https://www.torn.com/amarket.php*
// @match        https://www.torn.com/item.php*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/equip-display-bonus/equip-display-bonus.js
// @updateURL    https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/equip-display-bonus/equip-display-bonus.js
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const OVERLAY_CLASS = 'edb-bonus-overlay';
  const LEGACY_TITLE_RE = /^<b>([^<]+)<\/b>\s*<br\s*\/?>\s*(.*)$/i;
  const PERCENT_RE = /(\d+)%/;

  // ---- Power score (REQ-003) ----

  // Torn wiki Weapon page, primary weapons: [type, clip, rate of fire min, rate of fire max].
  // Dual weapons, Egg Propelled Launcher, Neutrilux 2000 and Snow Cannon are left out on purpose.
  const PRIMARY_WEAPONS = {
    '9mm Uzi': ['SM', 30, 15, 25],
    'AK-47': ['RF', 30, 4, 8],
    'AK74U': ['SM', 30, 4, 6],
    'ArmaLite M-15A4': ['RF', 15, 3, 5],
    'Benelli M1 Tactical': ['SG', 7, 2, 3],
    'Benelli M4 Super': ['SG', 7, 2, 3],
    'Bushmaster Carbon 15': ['SM', 30, 2, 28],
    'Enfield SA-80': ['RF', 30, 2, 5],
    'Gold Plated AK-47': ['RF', 45, 4, 6],
    'Heckler & Koch SL8': ['RF', 10, 2, 9],
    'Ithaca 37': ['SG', 4, 1, 4],
    'Jackhammer': ['SG', 10, 5, 10],
    'M16 A2 Rifle': ['RF', 30, 5, 9],
    'M249 SAW': ['MG', 100, 15, 25],
    'M4A1 Colt Carbine': ['RF', 30, 4, 9],
    'Mag 7': ['SG', 5, 2, 4],
    'Minigun': ['MG', 200, 20, 30],
    'MP 40': ['SM', 32, 3, 5],
    'MP5 Navy': ['SM', 30, 5, 8],
    'Negev NG-5': ['MG', 200, 18, 27],
    'Nock Gun': ['SG', 7, 7, 7],
    'P90': ['SM', 50, 10, 30],
    'PKM': ['MG', 50, 9, 17],
    'Prototype': ['MG', 100, 20, 30],
    'Rheinmetall MG 3': ['MG', 100, 20, 30],
    'Sawed-Off Shotgun': ['SG', 2, 1, 2],
    'SIG 550': ['RF', 20, 4, 7],
    'SIG 552': ['RF', 30, 4, 7],
    'SKS Carbine': ['RF', 10, 1, 8],
    'Steyr AUG': ['RF', 30, 5, 8],
    'Stoner 96': ['MG', 100, 9, 14],
    'Tavor TAR-21': ['RF', 30, 4, 8],
    'Thompson': ['SM', 20, 3, 5],
    'Vektor CR-21': ['RF', 20, 7, 8],
    'XM8 Rifle': ['RF', 30, 5, 20],
  };

  const PAD_TYPES = ['MG', 'RF', 'SG'];
  const PAD_EXCLUDED = ['Nock Gun'];
  const SIGHT_TYPES = ['MG', 'RF', 'SM'];

  const BURST_TURNS = 25;
  const RELOADS = 2;
  const BASE_CRIT_PCT = 20; // base 12 + merits 5 + education 3
  const LASER_CRIT_PCT = 5;
  const MERIT_DAMAGE_PCT = 10;
  const MERIT_ACCURACY = 2;
  const SIGHT_ACCURACY = 1.75;
  const EDUCATION_CONSERVATION_PCT = 25;
  const PAD_CONSERVATION_PCT = 25;
  const SELF_SPEED_PASSIVE_PCT = 44; // merits 30 + education 14
  const OPP_DEX_PASSIVE_PCT = 49; // merits 30 + education 19
  const PI_PENETRATION = 2;
  const SENTINEL_ARMOUR = 58; // quality 100%
  // Sentinel coverage per body part, capped at 100%.
  const SENTINEL_COVERAGE = {
    head: 74.24, throat: 95.91, heart: 100, chest: 100, stomach: 100,
    arms: 100, hands: 100, groin: 100, legs: 100, feet: 100,
  };
  const CRIT_PARTS = [['heart', 0.11], ['throat', 0.10], ['head', 0.79]];
  const NON_CRIT_PARTS = [
    ['groin', 0.06, 1 / 1.75], ['arms', 0.10, 1 / 3.5], ['hands', 0.10, 1 / 5], ['feet', 0.10, 1 / 5],
    ['legs', 0.20, 1 / 3.5], ['stomach', 0.20, 1 / 1.75], ['chest', 0.24, 1 / 1.75],
  ];

  const POWER_BONUSES = {
    Achilles: { type: 'part', part: 'feet' },
    Assassinate: { type: 'firstTurn' },
    Blindside: { type: 'firstHit' },
    Conserve: { type: 'conserve' },
    Cupid: { type: 'part', part: 'heart' },
    Deadeye: { type: 'critDamage' },
    Expose: { type: 'critChance' },
    Penetrate: { type: 'penetrate' },
    Powerful: { type: 'flat' },
    Quicken: { type: 'speed' },
    Specialist: { type: 'flat', noReload: true },
    'Sure Shot': { type: 'sureShot' },
    Throttle: { type: 'part', part: 'throat' },
  };

  const DEFAULT_BASELINE = { name: 'SIG 552', damage: 74, accuracy: 55, bonuses: [] };

  function hitChance(ratio) {
    if (ratio >= 64) return 100;
    if (ratio >= 1) return 100 - (50 / 7) * (8 * Math.sqrt(1 / ratio) - 1);
    if (ratio > 1 / 64) return (50 / 7) * (8 * Math.sqrt(ratio) - 1);
    return 0;
  }

  function applyAccuracy(base, accuracy) {
    if (base > 50) return base + ((accuracy - 50) / 50) * (100 - base);
    return base + ((accuracy - 50) / 50) * base;
  }

  // Expected attacks within the burst window and until every clip is spent.
  // Each attack fires a uniform Rate of Fire roll, scaled by the remaining ammo ratio with stochastic rounding.
  function attackCounts(clip, rofMin, rofMax, remainingRatio, reloads) {
    const consumption = new Map();
    const p = 1 / (rofMax - rofMin + 1);
    for (let rounds = rofMin; rounds <= rofMax; rounds++) {
      const ideal = rounds * remainingRatio;
      const low = Math.floor(ideal);
      const frac = ideal - low;
      consumption.set(low, (consumption.get(low) || 0) + p * (1 - frac));
      if (frac > 0) consumption.set(low + 1, (consumption.get(low + 1) || 0) + p * frac);
    }
    let states = new Map([[`${clip}:${reloads}`, 1]]);
    let burst = 0;
    let sustain = 0;
    for (let turn = 1; states.size > 0 && turn <= 2000; turn++) {
      const next = new Map();
      const add = (key, prob) => next.set(key, (next.get(key) || 0) + prob);
      states.forEach((prob, key) => {
        const [ammo, reloadsLeft] = key.split(':').map(Number);
        if (ammo <= 0) {
          if (reloadsLeft > 0) add(`${clip}:${reloadsLeft - 1}`, prob);
          return;
        }
        sustain += prob;
        if (turn <= BURST_TURNS) burst += prob;
        consumption.forEach((cp, used) => add(`${Math.max(0, ammo - used)}:${reloadsLeft}`, prob * cp));
      });
      states = next;
    }
    return { burst, sustain };
  }

  // Raw expected damage in the fixed scenario, before scaling against the baseline.
  // Returns null for weapons outside PRIMARY_WEAPONS.
  function calcPowerRaw(weapon) {
    const spec = PRIMARY_WEAPONS[weapon.name];
    if (!spec || !(weapon.damage > 0) || !(weapon.accuracy >= 0)) return null;
    const [type, clip, rofMin, rofMax] = spec;
    const hasPad = PAD_TYPES.includes(type) && !PAD_EXCLUDED.includes(weapon.name);
    const hasSight = !hasPad && SIGHT_TYPES.includes(type);

    const fx = {
      flat: 0, critDamage: 0, critChance: 0, penetrate: 0, conserve: 0, speed: 0,
      sureShot: 0, firstTurn: 0, firstHit: 0, parts: {}, noReload: false,
    };
    let partial = false;
    (weapon.bonuses || []).forEach((bonus) => {
      const effect = POWER_BONUSES[bonus.name];
      if (!effect) {
        partial = true;
        return;
      }
      const pct = Number(bonus.percent) || 0;
      if (effect.type === 'part') fx.parts[effect.part] = (fx.parts[effect.part] || 0) + pct;
      else fx[effect.type] += pct;
      if (effect.noReload) fx.noReload = true;
    });

    const ratio = (1 + (SELF_SPEED_PASSIVE_PCT + fx.speed) / 100) / (1 + OPP_DEX_PASSIVE_PCT / 100);
    const accuracy = weapon.accuracy + MERIT_ACCURACY + (hasSight ? SIGHT_ACCURACY : 0);
    let pHit = Math.min(100, Math.max(0, applyAccuracy(hitChance(ratio), accuracy))) / 100;
    pHit = fx.sureShot / 100 + (1 - fx.sureShot / 100) * pHit;

    const critPct = BASE_CRIT_PCT + LASER_CRIT_PCT + fx.critChance;
    const armour = (part) => 1 - (SENTINEL_COVERAGE[part] / 100) * SENTINEL_ARMOUR *
      (1 - fx.penetrate / 100) / PI_PENETRATION / 100;
    const perHit = (extraPct) => {
      let sum = 0;
      CRIT_PARTS.forEach(([part, share]) => {
        const pct = MERIT_DAMAGE_PCT + fx.flat + (fx.parts[part] || 0) + fx.critDamage + extraPct;
        sum += (critPct / 100) * share * (1 + pct / 100) * armour(part);
      });
      NON_CRIT_PARTS.forEach(([part, share, multi]) => {
        const pct = MERIT_DAMAGE_PCT + fx.flat + (fx.parts[part] || 0) + extraPct;
        sum += (1 - critPct / 100) * share * multi * (1 + pct / 100) * armour(part);
      });
      return sum;
    };

    const remaining = (1 - EDUCATION_CONSERVATION_PCT / 100) * (hasPad ? 1 - PAD_CONSERVATION_PCT / 100 : 1) *
      (1 - fx.conserve / 100);
    const attacks = attackCounts(clip, rofMin, rofMax, remaining, fx.noReload ? 0 : RELOADS);

    const perAttack = pHit * weapon.damage * perHit(0);
    const firstTurnExtra = fx.firstTurn > 0 ? pHit * weapon.damage * (perHit(fx.firstTurn) - perHit(0)) : 0;
    const firstHitExtra = (n) => (fx.firstHit > 0 ? (1 - Math.pow(1 - pHit, n)) * weapon.damage *
      (perHit(fx.firstHit) - perHit(0)) : 0);
    return {
      burst: perAttack * attacks.burst + firstTurnExtra + firstHitExtra(attacks.burst),
      sustain: perAttack * attacks.sustain + firstTurnExtra + firstHitExtra(attacks.sustain),
      partial,
    };
  }

  // Scales both numbers so the baseline weapon's burst equals 10000.
  function calcPowerScore(weapon, baseline) {
    const raw = calcPowerRaw(weapon);
    if (!raw) return null;
    const base = (baseline && calcPowerRaw(baseline)) || calcPowerRaw(DEFAULT_BASELINE);
    return {
      burst: Math.round((raw.burst / base.burst) * 10000),
      sustain: Math.round((raw.sustain / base.burst) * 10000),
      partial: raw.partial,
    };
  }

  function formatPowerLine(score) {
    const mark = score.partial ? '+X' : '';
    return `${score.burst}${mark} / ${score.sustain}${mark}`;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PRIMARY_WEAPONS, calcPowerRaw, calcPowerScore, formatPowerLine };
    return;
  }

  // ---- DOM ----

  const BASELINE_KEY = 'baselineWeapon';

  function loadBaseline() {
    try {
      const stored = GM_getValue(BASELINE_KEY, null);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  function extractPercentBonus(name, description) {
    if (!name || !description) return null;
    const match = description.match(PERCENT_RE);
    if (!match) return null;
    return { name, percent: match[1] };
  }

  function collectReactStyleBonuses(container) {
    const bonuses = [];
    container.querySelectorAll('i[data-bonus-attachment-title]').forEach((icon) => {
      const bonus = extractPercentBonus(
        icon.getAttribute('data-bonus-attachment-title'),
        icon.getAttribute('data-bonus-attachment-description')
      );
      if (bonus) bonuses.push(bonus);
    });
    return bonuses;
  }

  function collectLegacyStyleBonuses(container) {
    const bonuses = [];
    container.querySelectorAll('[title]').forEach((el) => {
      const match = el.title.match(LEGACY_TITLE_RE);
      if (!match) return;
      const bonus = extractPercentBonus(match[1], match[2]);
      if (bonus) bonuses.push(bonus);
    });
    return bonuses;
  }

  function cleanText(el) {
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function parseNumber(text) {
    const match = (text || '').match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : NaN;
  }

  // Legacy pages put the damage/accuracy value right after the stat icon.
  function legacyStat(root, iconClass) {
    const icon = root && root.querySelector(`.${iconClass}`);
    if (!icon) return NaN;
    return parseNumber(icon.nextElementSibling ? icon.nextElementSibling.textContent : icon.parentElement.textContent);
  }

  function legacyWeapon(root, nameEl, bonuses) {
    return {
      name: cleanText(nameEl),
      damage: legacyStat(root, 'bonus-attachment-item-damage-bonus'),
      accuracy: legacyStat(root, 'bonus-attachment-item-accuracy-bonus'),
      bonuses,
    };
  }

  function ensureRelativePosition(el) {
    if (getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
    }
  }

  function renderOverlay(container, bonuses, weapon, baseline) {
    const existing = container.querySelector(`:scope > .${OVERLAY_CLASS}`);
    if (existing) existing.remove();
    const lines = bonuses.map((b) => `${b.name} ${b.percent}%`);
    const score = weapon ? calcPowerScore(weapon, baseline) : null;
    if (score) lines.unshift(formatPowerLine(score));
    if (lines.length === 0) return;

    ensureRelativePosition(container);

    const overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;
    overlay.style.cssText = [
      'position:absolute',
      'top:1px',
      'left:1px',
      'z-index:20',
      'pointer-events:none',
      'background:rgba(0,0,0,0.75)',
      'color:#fff',
      'font-size:9px',
      'line-height:1.3',
      'font-family:Arial,sans-serif',
      'padding:1px 3px',
      'border-radius:2px',
      'white-space:pre',
      'width:max-content',
    ].join(';');
    overlay.textContent = lines.join('\n');
    container.appendChild(overlay);
  }

  // Item Market (React) item tile: bonus icons live inside the same
  // position:relative tile wrapper as the item image; name and stats sit in the tile's <li>.
  function scanReactItemMarket(baseline) {
    document.querySelectorAll('[class*="baseItemTileWrapper"]').forEach((container) => {
      const tile = container.closest('li');
      const bonuses = collectReactStyleBonuses(container);
      const ariaNumber = (suffix) => {
        const el = tile.querySelector(`[aria-label$="${suffix}"]`);
        return el ? parseNumber(el.getAttribute('aria-label')) : NaN;
      };
      const weapon = tile && {
        name: cleanText(tile.querySelector('[class*="name___"]')),
        damage: ariaNumber('damage points'),
        accuracy: ariaNumber('accuracy points'),
        bonuses,
      };
      renderOverlay(container, bonuses, weapon, baseline);
    });
  }

  // Auction House item tile (legacy markup, but still image + bonus badge
  // share the same wrapper): `.item-cont-wrap` holds both the image and
  // the bonus icon(s).
  function scanItemContWrap(baseline) {
    document.querySelectorAll('.item-cont-wrap').forEach((container) => {
      const row = container.closest('li');
      const bonuses = collectLegacyStyleBonuses(container);
      const weapon = row && legacyWeapon(row, row.querySelector('.item-name'), bonuses);
      renderOverlay(container, bonuses, weapon, baseline);
    });
  }

  // Faction Armoury row: the bonus icon list (`ul.bonuses`) is a sibling of
  // the item image (`div.img-wrap`), not layered on top of it, so anchor
  // the overlay to the image wrapper explicitly.
  function scanArmouryRows(baseline) {
    document.querySelectorAll('ul.bonuses').forEach((bonusList) => {
      const row = bonusList.parentElement;
      const container = row && row.querySelector(':scope > .img-wrap');
      if (!container) return;
      const bonuses = collectLegacyStyleBonuses(bonusList);
      renderOverlay(container, bonuses, legacyWeapon(bonusList, row.querySelector('.name'), bonuses), baseline);
    });
  }

  // Items page: remember the equipped primary weapon as the power score baseline.
  function captureBaseline() {
    const row = document.querySelector('#primary-items li[data-equipped="true"]');
    if (!row) return;
    const weapon = legacyWeapon(row, row.querySelector('.name'), collectLegacyStyleBonuses(row));
    if (!weapon.name) return;
    const value = JSON.stringify(weapon);
    if (GM_getValue(BASELINE_KEY, null) !== value) GM_setValue(BASELINE_KEY, value);
  }

  function scanAll() {
    if (location.pathname === '/item.php') {
      captureBaseline();
      return;
    }
    const baseline = loadBaseline();
    scanReactItemMarket(baseline);
    scanItemContWrap(baseline);
    scanArmouryRows(baseline);
  }

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      observer.disconnect();
      scanAll();
      observer.observe(document.body, { childList: true, subtree: true });
    }, 150);
  });

  scanAll();
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', scanAll);
})();
