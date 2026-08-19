// ==UserScript==
// @name         Torn: Equipment Bonus Display
// @namespace    equip-display-bonus
// @version      1.0.0
// @description  Permanently overlay weapon/armor bonus name + percentage on the top-left of the item icon on Item Market, Faction Armoury, and Auction House
// @match        https://www.torn.com/page.php?sid=ItemMarket*
// @match        https://www.torn.com/factions.php*
// @match        https://www.torn.com/amarket.php*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const OVERLAY_CLASS = 'edb-bonus-overlay';
  const LEGACY_TITLE_RE = /^<b>([^<]+)<\/b>\s*<br\s*\/?>\s*(.*)$/i;
  const PERCENT_RE = /(\d+)%/;

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

  function ensureRelativePosition(el) {
    if (getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
    }
  }

  function renderOverlay(container, bonuses) {
    const existing = container.querySelector(`:scope > .${OVERLAY_CLASS}`);
    if (existing) existing.remove();
    if (bonuses.length === 0) return;

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
    overlay.textContent = bonuses.map((b) => `${b.name} ${b.percent}%`).join('\n');
    container.appendChild(overlay);
  }

  // Item Market (React) item tile: bonus icons live inside the same
  // position:relative tile wrapper as the item image.
  function scanReactItemMarket() {
    const containers = new Set();
    document.querySelectorAll('i[data-bonus-attachment-title]').forEach((icon) => {
      const container = icon.closest('[class*="baseItemTileWrapper"]');
      if (container) containers.add(container);
    });
    containers.forEach((container) => {
      renderOverlay(container, collectReactStyleBonuses(container));
    });
  }

  // Auction House item tile (legacy markup, but still image + bonus badge
  // share the same wrapper): `.item-cont-wrap` holds both the image and
  // the bonus icon(s).
  function scanItemContWrap() {
    const containers = new Set();
    document.querySelectorAll('.item-cont-wrap [title]').forEach((el) => {
      if (LEGACY_TITLE_RE.test(el.title)) {
        containers.add(el.closest('.item-cont-wrap'));
      }
    });
    containers.forEach((container) => {
      renderOverlay(container, collectLegacyStyleBonuses(container));
    });
  }

  // Faction Armoury row: the bonus icon list (`ul.bonuses`) is a sibling of
  // the item image (`div.img-wrap`), not layered on top of it, so anchor
  // the overlay to the image wrapper explicitly.
  function scanArmouryRows() {
    const containers = new Set();
    document.querySelectorAll('ul.bonuses [title]').forEach((el) => {
      if (!LEGACY_TITLE_RE.test(el.title)) return;
      const bonusList = el.closest('ul.bonuses');
      const row = bonusList && bonusList.parentElement;
      const imgWrap = row && row.querySelector(':scope > .img-wrap');
      if (imgWrap) containers.add(imgWrap);
    });
    containers.forEach((container) => {
      const row = container.parentElement;
      const bonusList = row && row.querySelector(':scope > ul.bonuses');
      if (!bonusList) return;
      renderOverlay(container, collectLegacyStyleBonuses(bonusList));
    });
  }

  function scanAll() {
    scanReactItemMarket();
    scanItemContWrap();
    scanArmouryRows();
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
