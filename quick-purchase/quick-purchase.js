// ==UserScript==
// @name         Torn: Quick Purchase
// @namespace    quick-purchase
// @version      1.2.0
// @description  Alert when the target abroad item restocks; each click on the travel message bar (or q / space) self-hosps in flight, and abroad meds out, sells the packed item, and buys the target
// @author       Dolacone
// @match        https://www.torn.com/page.php?sid=travel*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/quick-purchase/quick-purchase.js
// @updateURL    https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/quick-purchase/quick-purchase.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ---- Settings (REQ-002) ----

  const TARGET = 'Xanax';
  const HOSP_ITEM = 'Blood Bag : A+';
  const MED_ITEM = 'Blood Bag : O+';
  const SELL_ITEM = 'Speed';
  const SOUND_URL = 'https://cdn.pixabay.com/download/audio/2024/05/23/audio_336d55dfa8.mp3?filename=servant-bell-ring-2-211683.mp3';

  // ---- Restock rules (REQ-006 #1-3) ----

  function parseStock(text) {
    const digits = String(text).replace(/[^0-9]/g, '');
    return digits === '' ? null : parseInt(digits, 10);
  }

  function isRestock(prev, now) {
    return (prev === undefined || prev === 0) && now !== null && now > 0;
  }

  // ---- Flight (REQ-004) ----

  function isOutbound(flightText) {
    return /^\s*Torn to /.test(String(flightText));
  }

  // ---- Abroad (REQ-005) ----

  function parseBar(text) {
    const cash = /have \$([\d,]+)/.exec(String(text));
    const used = /purchased (\d+) \/ (\d+)/.exec(String(text));
    if (!cash || !used) return null;
    return { cash: Number(cash[1].replace(/,/g, '')), free: Number(used[2]) - Number(used[1]) };
  }

  // f: { sold, stock, price, cash, free, hospital, medOut, sellPacked, sellRefused }
  function abroadAction(f) {
    if (!f.sold) return { act: null, text: 'not sold here' };
    if (f.hospital && !f.medOut) {
      if (!(f.stock > 0)) return { act: null, text: 'in hospital, waiting for restock | next click: MED OUT after restock' };
      return { act: 'med' };
    }
    if (f.sellPacked && !f.sellRefused) return { act: 'sell' };
    if (!(f.free > 0)) return { act: null, text: 'bag full' };
    if (!(f.stock > 0)) return { act: null, text: 'out of stock | next click: BUY after restock' };
    const amount = Math.min(f.stock, f.free, Math.floor(f.cash / f.price));
    if (!(amount > 0)) return { act: null, text: 'not enough cash' };
    return { act: 'buy', amount };
  }

  // ---- Inventory and replies ----

  function findSlots(slots, name) {
    return (Array.isArray(slots) ? slots : []).filter((s) => s && s.item && s.item.name === name);
  }

  function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h ? `${h}h ${m}m` : `${m}m`;
  }

  function messageText(html) {
    return String(html || '')
      .replace(/<span[^>]*data-time="(\d+)"[^>]*>\s*<\/span>/g, (_, s) => formatDuration(Number(s)))
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ---- Keyboard (REQ-001 #5-8) ----

  const TEXT_INPUT_EXCLUDED = ['button', 'submit', 'reset', 'checkbox', 'radio', 'image', 'file', 'range', 'color'];

  function isEditable(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    const tag = String(target.tagName || '').toUpperCase();
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return tag === 'INPUT' && !TEXT_INPUT_EXCLUDED.includes(String(target.type || 'text').toLowerCase());
  }

  function isTriggerKey(event) {
    if (event.key !== 'q' && event.key !== 'Q' && event.key !== ' ') return false;
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;
    return !isEditable(event.target);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseStock, isRestock, isOutbound, parseBar, abroadAction, findSlots, messageText, isTriggerKey };
    return;
  }

  // ---- DOM ----

  const BAR = '.info-msg-cont .msg';
  const FLIGHT_BAR = "section[class*='flightProgressSection___']";
  const ROWS = "[class*='stockTableWrapper___'] li";
  const INVENTORY = "ul[aria-label^='Inventory']";

  const style = document.createElement('style');
  style.textContent =
    '.qp-active{font-size:0 !important}' +
    '.qp-active>strong{display:none !important}' +
    '.qp-status{font-size:12px;font-weight:bold}' +
    '.qp-green{background:#2e7d32 !important;color:#fff !important}';
  document.head.appendChild(style);

  const sound = new Audio(SOUND_URL);
  sound.preload = 'auto';

  let lastStock;
  let alerted = false;
  let bodyBackground = '';
  let busy = false;
  let medOut = false;
  let sellRefused = false;

  function inFlight() {
    return document.body.dataset.traveling === 'true';
  }

  function barSelector() {
    return inFlight() ? FLIGHT_BAR : BAR;
  }

  function findTargetRow() {
    return [...document.querySelectorAll(ROWS)].find(
      (li) => li.querySelector("button[class*='itemNameButton___']")?.textContent.trim() === TARGET
    );
  }

  function readTargetStock() {
    const li = findTargetRow();
    if (!li) return null;
    const cell = [...li.querySelectorAll("[class*='cell___']")].find(
      (c) => c.querySelector("[class*='srOnly___']")?.textContent.trim().toLowerCase() === 'stock'
    );
    return cell ? parseStock(cell.textContent) : null;
  }

  function readTargetPrice(li) {
    const text = li.querySelector("[class*='displayPrice']")?.textContent.trim() || '';
    return /^\$[\d,]+$/.test(text) ? Number(text.replace(/\D/g, '')) : null;
  }

  function show(text, label = TARGET) {
    const bar = document.querySelector(barSelector());
    if (!bar) return;
    bar.classList.add('qp-active');
    let status = bar.querySelector('.qp-status');
    if (!status) {
      status = document.createElement('span');
      status.className = 'qp-status';
      bar.appendChild(status);
    }
    status.textContent = `[${label}] ${text}`;
  }

  function startAlert() {
    if (!alerted) bodyBackground = document.body.style.backgroundColor;
    alerted = true;
    document.body.style.backgroundColor = 'red';
    document.querySelector(BAR)?.classList.add('qp-green');
    sound.play().catch((err) => console.log('[QuickPurchase] sound blocked', err));
  }

  function clearAlert() {
    if (!alerted) return;
    alerted = false;
    document.body.style.backgroundColor = bodyBackground;
    document.querySelector(BAR)?.classList.remove('qp-green');
  }

  async function travelData(step, { method = 'GET', query = '', body } = {}) {
    try {
      const res = await fetch(window.addRFC(`/page.php?sid=travelData&step=${step}${query}`), {
        method,
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      let data = null;
      try { data = await res.json(); } catch (e) { /* non-JSON reply */ }
      const ok = res.ok && !!data && data.success !== false && !data.error;
      const raw = data && (data.message || data.text || data.error?.message || (typeof data.error === 'string' ? data.error : ''));
      return { ok, data, message: messageText(raw) || (ok ? 'done' : 'Torn did not accept that.') };
    } catch (err) {
      return { ok: false, data: null, message: 'Could not reach Torn.' };
    }
  }

  function refreshPage() {
    window.dispatchEvent(new Event('focus'));
  }

  async function runFlight() {
    const label = HOSP_ITEM;
    if (!isOutbound(document.querySelector(FLIGHT_BAR)?.textContent)) {
      return show('flying to Torn | nothing to do', label);
    }
    show('HOSP: reading bag...', label);
    const inv = await travelData('inventory');
    if (!inv.ok) return show(`HOSP failed: ${inv.message} | next click: HOSP`, label);
    const held = findSlots(inv.data.slots, HOSP_ITEM);
    if (!held.length) return show('HOSP: not in bag | nothing to do', label);
    show('HOSP: using...', label);
    const res = await travelData('useItem', { method: 'POST', body: { slotID: held[0].ID } });
    if (!res.ok) return show(`HOSP failed: ${res.message} | next click: HOSP`, label);
    const next = held.length > 1 ? `HOSP (${held.length - 1} left)` : 'nothing (none left)';
    show(`HOSP: ${res.message} | next click: ${next}`, label);
  }

  function readAbroad() {
    const li = findTargetRow();
    const bar = parseBar(document.querySelector(BAR)?.textContent) || { cash: 0, free: 0 };
    const packed = [...document.querySelectorAll(`${INVENTORY} > li button[aria-label]`)]
      .some((b) => b.getAttribute('aria-label').startsWith(`${SELL_ITEM} slot `));
    return {
      sold: !!li,
      itemId: li?.querySelector("form[id^='item-'][id$='-form']")?.id.split('-')[1],
      stock: readTargetStock(),
      price: li ? readTargetPrice(li) : null,
      cash: bar.cash,
      free: bar.free,
      hospital: document.body.dataset.layout === 'hospital',
      medOut,
      sellPacked: packed,
      sellRefused,
    };
  }

  async function runAbroad() {
    const f = readAbroad();
    let step = abroadAction(f);

    if (step.act === 'med') {
      show('MED OUT: reading bag...');
      const inv = await travelData('inventory');
      if (!inv.ok) return show(`MED OUT failed: ${inv.message} | next click: MED OUT`);
      const held = findSlots(inv.data.slots, MED_ITEM);
      if (!held.length) return show(`MED OUT: no ${MED_ITEM} in bag`);
      show('MED OUT: using...');
      const res = await travelData('useItem', { method: 'POST', body: { slotID: held[0].ID } });
      if (!res.ok) return show(`MED OUT failed: ${res.message} | next click: MED OUT`);
      medOut = true;
      refreshPage();
      return show(`MED OUT: ${res.message} | next click: ${f.sellPacked && !sellRefused ? `SELL ${SELL_ITEM}` : 'BUY'}`);
    }

    if (step.act === 'sell') {
      show(`SELL ${SELL_ITEM}: reading bag...`);
      const inv = await travelData('inventory');
      if (!inv.ok) return show(`SELL failed: ${inv.message} | next click: SELL`);
      const held = findSlots(inv.data.slots, SELL_ITEM);
      if (held.length) {
        if (held[0].item.isSellable === false) {
          sellRefused = true;
          return show(`SELL: this shop does not buy ${SELL_ITEM} | next click: BUY`);
        }
        show(`SELL ${held.length}x ${SELL_ITEM}...`);
        const res = await travelData('sellItem', { method: 'POST', body: { slotID: held[0].ID, amount: held.length } });
        if (!res.ok) {
          if (res.data) sellRefused = true;
          return show(`SELL failed: ${res.message} | next click: ${sellRefused ? 'BUY' : 'SELL'}`);
        }
        refreshPage();
        return show(`SELL: ${res.message} | next click: BUY`);
      }
      step = abroadAction({ ...f, sellPacked: false });
    }

    if (step.act === 'buy') {
      show(`BUY ${step.amount}x: sending...`);
      const res = await travelData('buy', { query: `&itemID=${f.itemId}&amount=${step.amount}` });
      if (!res.ok) return show(`BUY failed: ${res.message} | next click: BUY`);
      clearAlert();
      refreshPage();
      return show(`BUY ${step.amount}x: ${res.message} | next click: BUY if stock and space left`);
    }

    show(step.text);
  }

  async function trigger() {
    if (busy) return;
    busy = true;
    try {
      if (inFlight()) await runFlight();
      else await runAbroad();
    } finally {
      busy = false;
    }
  }

  function isShopShown() {
    return !!document.querySelector(BAR) && !!document.querySelector(ROWS);
  }

  function hasBar() {
    return inFlight() ? !!document.querySelector(FLIGHT_BAR) : isShopShown();
  }

  function onBarClick(event) {
    if (event.target.closest(barSelector()) && hasBar()) trigger();
  }

  let suppressSpaceUp = false;

  function onKeyDown(event) {
    if (!hasBar() || !isTriggerKey(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === ' ') suppressSpaceUp = true;
    trigger();
  }

  function onKeyUp(event) {
    if (event.key !== ' ' || !suppressSpaceUp) return;
    suppressSpaceUp = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function onMutation() {
    if (!document.querySelector(BAR)) return;
    if (alerted) document.querySelector(BAR).classList.add('qp-green');
    const now = readTargetStock();
    if (now === null) return;
    if (isRestock(lastStock, now)) startAlert();
    lastStock = now;
  }

  document.addEventListener('click', onBarClick, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);
  new MutationObserver(onMutation).observe(document.body, { childList: true, characterData: true, subtree: true });
  onMutation();
})();
