// ==UserScript==
// @name         Torn: Quick Purchase
// @namespace    quick-purchase
// @version      1.3.0
// @description  Alert when the target abroad item restocks; each click on the travel message bar (or q / space) packs at the travel agency, self-hosps in flight, and abroad meds out, sells the packed item, and buys the target
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

  const DEFAULTS = { target: 'Xanax', sell: 'Speed', hosp: 'Blood Bag : A+', med: 'Blood Bag : O+' };
  const SETTING_LABELS = { target: 'Target item', sell: 'Sell item', hosp: 'Self-hosp item', med: 'Med-out item' };
  const STORAGE_KEY = 'quickPurchase.settings';
  const SOUND_URL = 'https://cdn.pixabay.com/download/audio/2024/05/23/audio_336d55dfa8.mp3?filename=servant-bell-ring-2-211683.mp3';

  function sameName(a, b) {
    return !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }

  function mergeSettings(stored) {
    const out = { ...DEFAULTS };
    if (stored && typeof stored === 'object') {
      for (const key of Object.keys(DEFAULTS)) {
        if (typeof stored[key] === 'string') out[key] = stored[key].trim();
      }
    }
    return out;
  }

  function settingsError(s) {
    return sameName(s.sell, s.target) ? 'Sell item and target item must differ.' : null;
  }

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

  // f: { hasTarget, hasMed, sold, stock, price, cash, free, hospital, medOut, sellPacked, sellRefused }
  function abroadAction(f) {
    if (f.hasTarget && !f.sold) return { act: null, text: 'not sold here' };
    if (f.hospital && !f.medOut) {
      if (!f.hasTarget) return { act: null, text: 'no target item set' };
      if (!f.hasMed) return { act: null, text: 'no med-out item set' };
      if (!(f.stock > 0)) return { act: null, text: 'in hospital, waiting for restock | next click: MED OUT after restock' };
      return { act: 'med' };
    }
    if (f.sellPacked && !f.sellRefused) return { act: 'sell' };
    if (!f.hasTarget) return { act: null, text: 'no target item set' };
    if (!(f.free > 0)) return { act: null, text: 'bag full' };
    if (!(f.stock > 0)) return { act: null, text: 'out of stock | next click: BUY after restock' };
    const amount = Math.min(f.stock, f.free, Math.floor(f.cash / f.price));
    if (!(amount > 0)) return { act: null, text: 'not enough cash' };
    return { act: 'buy', amount };
  }

  // ---- Travel agency (REQ-003) ----

  // f: { hosp, med, sell, carried: [names], free, skip: { hosp, med, sell } }
  function packAction(f) {
    const has = (name) => f.carried.some((n) => sameName(n, name));
    if (f.hosp && !f.skip.hosp && !has(f.hosp)) return { act: 'pack', role: 'hosp', name: f.hosp };
    if (f.med && !f.skip.med && !has(f.med)) return { act: 'pack', role: 'med', name: f.med };
    if (f.sell && !f.skip.sell && f.free > 0) return { act: 'fill', role: 'sell', name: f.sell };
    return { act: null, text: 'packed | ready to fly' };
  }

  // searchItem entries: { id, name, faction, armouryID, disabled }
  function pickOwned(list, name, factionFirst) {
    const named = (Array.isArray(list) ? list : []).filter((e) => e && !e.disabled && sameName(e.name, name));
    if (!factionFirst) return named.find((e) => !e.faction) || null;
    return named.find((e) => e.faction) || named[0] || null;
  }

  function packBody(hit) {
    const body = { itemID: hit.id };
    if (hit.faction) body.factionItem = '1';
    if (hit.armouryID) body.armouryID = hit.armouryID;
    return body;
  }

  // ---- Inventory and replies ----

  function findSlots(slots, name) {
    return (Array.isArray(slots) ? slots : []).filter((s) => s && s.item && sameName(s.item.name, name));
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
    module.exports = { mergeSettings, settingsError, parseStock, isRestock, isOutbound, parseBar, abroadAction, packAction, pickOwned, packBody, findSlots, messageText, isTriggerKey };
    return;
  }

  // ---- DOM ----

  const BAR = '.info-msg-cont .msg';
  const FLIGHT_BAR = "section[class*='flightProgressSection___']";
  const ROWS = "[class*='stockTableWrapper___'] li";
  const INVENTORY = "ul[aria-label^='Inventory']";
  const AGENCY_BAR = '.qp-bar';

  const style = document.createElement('style');
  style.textContent =
    '.qp-active{font-size:0 !important}' +
    '.qp-active>strong{display:none !important}' +
    '.qp-status{font-size:12px;font-weight:bold}' +
    '.qp-green{background:#2e7d32 !important;color:#fff !important}' +
    '.qp-settings{margin:0 0 6px;font-size:12px}' +
    '.qp-settings a{cursor:pointer;text-decoration:underline}' +
    '.qp-settings form{display:grid;grid-template-columns:auto 1fr;gap:4px 8px;max-width:420px;margin-top:4px}' +
    '.qp-settings input{min-width:0}' +
    '.qp-bar{margin:0 0 6px;padding:6px 8px;border:1px solid #888;border-radius:4px;cursor:pointer;font-size:12px}';
  document.head.appendChild(style);

  function loadSettings() {
    try {
      return mergeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
    } catch (e) {
      return mergeSettings(null);
    }
  }

  let cfg = loadSettings();

  const sound = new Audio(SOUND_URL);
  sound.preload = 'auto';

  let lastStock;
  let alerted = false;
  let bodyBackground = '';
  let busy = false;
  let medOut = false;
  let sellRefused = false;
  const packSkip = { hosp: false, med: false, sell: false };

  function inFlight() {
    return document.body.dataset.traveling === 'true';
  }

  function atAgency() {
    return !inFlight() && document.body.dataset.country === 'torn' && !!document.querySelector(INVENTORY);
  }

  function barSelector() {
    if (inFlight()) return FLIGHT_BAR;
    return atAgency() ? AGENCY_BAR : BAR;
  }

  function findTargetRow() {
    return [...document.querySelectorAll(ROWS)].find(
      (li) => sameName(li.querySelector("button[class*='itemNameButton___']")?.textContent, cfg.target)
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

  function show(text, label = cfg.target || 'Quick Purchase') {
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

  async function travelData(step, { method = 'GET', query = '', body, form } = {}) {
    let payload;
    if (form) {
      payload = new FormData();
      for (const [k, v] of Object.entries(form)) payload.set(k, v);
    } else if (body !== undefined) {
      payload = JSON.stringify(body);
    }
    try {
      const res = await fetch(window.addRFC(`/page.php?sid=travelData&step=${step}${query}`), {
        method,
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: payload,
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
    const label = cfg.hosp || 'Self-hosp';
    if (!isOutbound(document.querySelector(FLIGHT_BAR)?.textContent)) {
      return show('flying to Torn | nothing to do', label);
    }
    if (!cfg.hosp) return show('no self-hosp item set | nothing to do', label);
    show('HOSP: reading bag...', label);
    const inv = await travelData('inventory');
    if (!inv.ok) return show(`HOSP failed: ${inv.message} | next click: HOSP`, label);
    const held = findSlots(inv.data.slots, cfg.hosp);
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
    const packed = !!cfg.sell && [...document.querySelectorAll(`${INVENTORY} > li button[aria-label]`)]
      .some((b) => sameName(b.getAttribute('aria-label').replace(/ slot \d+$/, ''), cfg.sell));
    return {
      hasTarget: !!cfg.target,
      hasMed: !!cfg.med,
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
      const held = findSlots(inv.data.slots, cfg.med);
      if (!held.length) return show(`MED OUT: no ${cfg.med} in bag`);
      show('MED OUT: using...');
      const res = await travelData('useItem', { method: 'POST', body: { slotID: held[0].ID } });
      if (!res.ok) return show(`MED OUT failed: ${res.message} | next click: MED OUT`);
      medOut = true;
      refreshPage();
      return show(`MED OUT: ${res.message} | next click: ${f.sellPacked && !sellRefused ? `SELL ${cfg.sell}` : 'BUY'}`);
    }

    if (step.act === 'sell') {
      show(`SELL ${cfg.sell}: reading bag...`);
      const inv = await travelData('inventory');
      if (!inv.ok) return show(`SELL failed: ${inv.message} | next click: SELL`);
      const held = findSlots(inv.data.slots, cfg.sell);
      if (held.length) {
        if (held[0].item.isSellable === false) {
          sellRefused = true;
          return show(`SELL: this shop does not buy ${cfg.sell} | next click: BUY`);
        }
        show(`SELL ${held.length}x ${cfg.sell}...`);
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

  async function runAgency() {
    show('PACK: reading bag...', 'Pack');
    const inv = await travelData('inventory');
    if (!inv.ok) return show(`PACK failed: ${inv.message} | next click: PACK`, 'Pack');
    const slots = Array.isArray(inv.data.slots) ? inv.data.slots : [];
    const step = packAction({
      hosp: cfg.hosp,
      med: cfg.med,
      sell: cfg.sell,
      carried: slots.filter((s) => s && s.item).map((s) => s.item.name),
      free: slots.filter((s) => s && !s.item).length,
      skip: packSkip,
    });
    if (!step.act) return show(step.text, 'Pack');

    show(`PACK ${step.name}: searching...`, 'Pack');
    const found = await travelData('searchItem', { method: 'POST', form: { q: step.name } });
    if (!found.ok) return show(`PACK failed: ${found.message} | next click: PACK`, 'Pack');
    const hit = pickOwned(found.data.list, step.name, step.act === 'pack');
    if (!hit) {
      packSkip[step.role] = true;
      return show(`PACK: no ${step.name} owned, skipped | next click: PACK`, 'Pack');
    }
    const res = step.act === 'pack'
      ? await travelData('addSlotItem', { method: 'POST', body: packBody(hit) })
      : await travelData('fillSlotItems', { method: 'POST', body: { itemID: hit.id } });
    if (!res.ok) return show(`PACK failed: ${res.message} | next click: PACK`, 'Pack');
    refreshPage();
    show(`PACK: ${res.message}${hit.faction ? ' (faction)' : ''} | next click: PACK`, 'Pack');
  }

  async function trigger() {
    if (busy) return;
    busy = true;
    try {
      if (inFlight()) await runFlight();
      else if (atAgency()) await runAgency();
      else await runAbroad();
    } finally {
      busy = false;
    }
  }

  function isShopShown() {
    return !!document.querySelector(BAR) && !!document.querySelector(ROWS);
  }

  function hasBar() {
    if (inFlight()) return !!document.querySelector(FLIGHT_BAR);
    if (atAgency()) return !!document.querySelector(AGENCY_BAR);
    return isShopShown();
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

  function renderSettings() {
    const root = document.querySelector('#travel-root');
    if (!root || document.querySelector('.qp-settings')) return;
    const box = document.createElement('div');
    box.className = 'qp-settings';
    const link = document.createElement('a');
    link.textContent = 'Quick Purchase settings';
    const form = document.createElement('form');
    form.hidden = true;
    for (const key of Object.keys(DEFAULTS)) {
      const label = document.createElement('label');
      label.textContent = SETTING_LABELS[key];
      label.htmlFor = `qp-${key}`;
      const input = document.createElement('input');
      input.id = `qp-${key}`;
      input.name = key;
      input.type = 'text';
      input.placeholder = `empty = skip (default ${DEFAULTS[key]})`;
      form.append(label, input);
    }
    const save = document.createElement('button');
    save.type = 'submit';
    save.textContent = 'Save';
    const note = document.createElement('span');
    form.append(save, note);
    link.addEventListener('click', () => {
      form.hidden = !form.hidden;
      for (const key of Object.keys(DEFAULTS)) form.elements[key].value = cfg[key];
      note.textContent = '';
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const next = mergeSettings(Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, form.elements[k].value])));
      const error = settingsError(next);
      if (error) return (note.textContent = error);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        return (note.textContent = 'Could not save in this browser.');
      }
      cfg = next;
      lastStock = undefined;
      note.textContent = 'Saved.';
    });
    box.append(link, form);
    root.parentNode.insertBefore(box, root);
  }

  function renderAgencyBar() {
    const bar = document.querySelector(AGENCY_BAR);
    if (!atAgency()) return bar?.remove();
    const box = document.querySelector('.qp-settings');
    if (bar || !box) return;
    const el = document.createElement('div');
    el.className = 'qp-bar';
    el.textContent = 'Quick Purchase: click (or q / space) to pack the next item';
    box.after(el);
  }

  function onMutation() {
    renderSettings();
    renderAgencyBar();
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
