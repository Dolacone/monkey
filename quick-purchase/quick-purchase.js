// ==UserScript==
// @name         Torn: Quick Purchase
// @namespace    quick-purchase
// @version      1.5.2
// @description  Alert when any target abroad item restocks; each click on the travel message bar (or q / space) packs at the travel agency, self-hosps in flight, and abroad meds out, sells the packed item, and buys the targets in order
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

  const DEFAULTS = { target: 'Xanax, Shark Fin, Turtle Shell', sell: 'Vicodin', hosp: 'Blood Bag : A+', med: 'Blood Bag : O+' };
  const LABELS = { target: 'Target item', sell: 'Sell item', hosp: 'Self-hosp item', med: 'Med-out item' };
  const STORAGE_KEY = 'quickPurchase.settings';
  const SOUND_URL = 'https://cdn.pixabay.com/download/audio/2024/05/23/audio_336d55dfa8.mp3?filename=servant-bell-ring-2-211683.mp3';

  // REQ-002 #4: an empty field saves its default.
  function withDefaults(values) {
    return Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, values[k] || DEFAULTS[k]]));
  }

  // REQ-002 #5: the bag holds self-hosp, med-out, then the sell item.
  function packageSettings(names, cfg) {
    return { ...cfg, hosp: names[0] ?? cfg.hosp, med: names[1] ?? cfg.med, sell: names[2] ?? cfg.sell };
  }

  // REQ-002 #1: comma-separated, in buy order.
  function parseTargets(text) {
    return String(text).split(',').map((s) => s.trim()).filter(Boolean);
  }

  // ---- Restock (REQ-006 #1) ----

  function parseStock(text) {
    const digits = String(text).replace(/[^0-9]/g, '');
    return digits === '' ? null : parseInt(digits, 10);
  }

  function isRestock(prev, now) {
    return prev === undefined ? now > 0 : now > prev;
  }

  // Readings are kept per target; a target without a stock row keeps its last reading.
  function checkRestock(last, stocks) {
    const next = { ...last };
    let restocked = false;
    for (const { name, stock } of stocks) {
      if (stock === null) continue;
      if (isRestock(last[name], stock)) restocked = true;
      next[name] = stock;
    }
    return { restocked, next };
  }

  // ---- Steps (REQ-003 #1, REQ-005 #1) ----

  function packStep(names, free, cfg) {
    if (!names.includes(cfg.hosp)) return { act: 'pack', name: cfg.hosp };
    if (!names.includes(cfg.med)) return { act: 'pack', name: cfg.med };
    if (free > 0) return { act: 'fill', name: cfg.sell };
    return { act: null };
  }

  function abroadStep({ hospital, hasMed, sellCount, inStock }) {
    if (hospital) return hasMed && inStock ? 'med' : null;
    if (sellCount > 0) return 'sell';
    return inStock ? 'buy' : null;
  }

  // REQ-005 #1: first target in stock, in the set order, up to its stock.
  function buyPlan(stocks, free) {
    const hit = stocks.find((s) => s.stock > 0);
    return hit ? { ...hit, amount: Math.min(free, hit.stock) } : null;
  }

  // REQ-003 #2: faction copy first.
  function pickOwned(list, name) {
    const named = list.filter((e) => e.name === name && !e.disabled);
    return named.find((e) => e.faction) || named[0] || null;
  }

  // ---- Low cash at the agency (REQ-003 #4-6) ----

  const MIN_CASH = 1000000;

  // An unreadable cash value (NaN) neither blocks nor clears.
  function isLowCash(cash) {
    return cash < MIN_CASH;
  }

  function lowCashStep({ entered, cash, alerted }) {
    if (entered && isLowCash(cash)) return 'alert';
    if (alerted && cash >= MIN_CASH) return 'clear';
    return null;
  }

  // ---- Torn replies (REQ-001 #11) ----

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
    module.exports = { withDefaults, packageSettings, parseTargets, parseStock, isRestock, checkRestock, packStep, abroadStep, buyPlan, pickOwned, isLowCash, lowCashStep, messageText, isTriggerKey };
    return;
  }

  // ---- DOM ----

  const BAR = '.info-msg-cont .msg';
  const FLIGHT_BAR = "section[class*='flightProgressSection___']";
  const AGENCY_BAR = '.qp-bar';
  const ROWS = "[class*='stockTableWrapper___'] li";
  const INVENTORY = "ul[aria-label^='Inventory']";
  const CASH = '#user-money';

  const style = document.createElement('style');
  style.textContent =
    '.qp-active{font-size:0 !important}' +
    '.qp-active>strong{display:none !important}' +
    '.qp-status{font-size:12px;font-weight:bold}' +
    '.qp-green{background:#2e7d32 !important;color:#fff !important}' +
    '.qp-settings{margin:0 0 6px;font-size:12px}' +
    '.qp-settings form{display:grid;grid-template-columns:auto 1fr;gap:4px 8px;max-width:420px;margin-top:4px}' +
    '.qp-bar{margin:0 0 6px;padding:6px 8px;border:1px solid #888;border-radius:4px;cursor:pointer;font-size:12px}';
  document.head.appendChild(style);

  const sound = new Audio(SOUND_URL);
  sound.preload = 'auto';

  function loadSettings() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS));
      return { ...DEFAULTS };
    }
    try {
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (e) {
      return { ...DEFAULTS };
    }
  }

  let cfg = loadSettings();
  let lastStock = {};
  let alerted = false;
  let cashAlerted = false;
  let wasAgency = false;
  let bodyBackground = '';

  function saveSettings(next) {
    cfg = next;
    lastStock = {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }

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

  function show(text) {
    const bar = document.querySelector(barSelector());
    if (!bar) return;
    bar.classList.add('qp-active');
    let status = bar.querySelector('.qp-status');
    if (!status) {
      status = document.createElement('span');
      status.className = 'qp-status';
      bar.appendChild(status);
    }
    status.textContent = text;
  }

  function targetStocks() {
    const rows = [...document.querySelectorAll(ROWS)];
    return parseTargets(cfg.target).map((name) => {
      const li = rows.find((r) => r.querySelector("button[class*='itemNameButton___']")?.textContent.trim() === name);
      return { name, li, stock: readStock(li) };
    });
  }

  function readStock(li) {
    const cell = [...(li?.querySelectorAll("[class*='cell___']") || [])].find(
      (c) => c.querySelector("[class*='srOnly___']")?.textContent.trim().toLowerCase() === 'stock'
    );
    return cell ? parseStock(cell.textContent) : null;
  }

  function readCash() {
    return Number(document.querySelector(CASH)?.dataset.money);
  }

  function ping() {
    sound.play().catch((err) => console.log('[QuickPurchase] sound blocked', err));
  }

  // The restock and low-cash alerts share one red background; the original color returns when neither holds it.
  function paintRed() {
    if (!alerted && !cashAlerted) bodyBackground = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'red';
  }

  function unpaintRed() {
    if (!alerted && !cashAlerted) document.body.style.backgroundColor = bodyBackground;
  }

  function startAlert() {
    paintRed();
    alerted = true;
    document.querySelector(BAR)?.classList.add('qp-green');
    ping();
  }

  function clearAlert() {
    if (!alerted) return;
    alerted = false;
    unpaintRed();
    document.querySelector(BAR)?.classList.remove('qp-green');
  }

  function startCashAlert() {
    paintRed();
    cashAlerted = true;
    ping();
  }

  function clearCashAlert() {
    cashAlerted = false;
    unpaintRed();
  }

  // ---- Requests ----

  async function travelData(step, { method = 'GET', query = '', body, form } = {}) {
    let payload;
    if (form) {
      payload = new FormData();
      for (const [k, v] of Object.entries(form)) payload.set(k, v);
    } else if (body) {
      payload = JSON.stringify(body);
    }
    const res = await fetch(window.addRFC(`/page.php?sid=travelData&step=${step}${query}`), {
      method,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: payload,
    });
    const data = await res.json().catch(() => null);
    const ok = res.ok && !!data && data.success !== false;
    return { ok, data, message: messageText(data?.message) || (ok ? 'done' : 'failed') };
  }

  async function bagSlots() {
    const { data } = await travelData('inventory');
    return data?.slots || [];
  }

  function useItem(slot) {
    return travelData('useItem', { method: 'POST', body: { slotID: slot.ID } });
  }

  // ---- Actions ----

  async function runAgency() {
    const cash = readCash();
    if (isLowCash(cash)) return show(`PACK: blocked, cash $${cash.toLocaleString('en-US')} < $${MIN_CASH.toLocaleString('en-US')}`);
    const slots = await bagSlots();
    const names = slots.filter((s) => s.item).map((s) => s.item.name);
    const step = packStep(names, slots.filter((s) => !s.item).length, cfg);
    if (!step.act) return show('PACK: packed');
    const found = await travelData('searchItem', { method: 'POST', form: { q: step.name } });
    const hit = pickOwned(found.data?.list || [], step.name);
    if (!hit) return show(`PACK: no ${step.name} owned`);
    const res = step.act === 'pack'
      ? await travelData('addSlotItem', { method: 'POST', body: hit.faction ? { itemID: hit.id, factionItem: '1' } : { itemID: hit.id } })
      : await travelData('fillSlotItems', { method: 'POST', body: { itemID: hit.id } });
    show(`PACK ${step.name}: ${res.message}`);
  }

  async function runFlight() {
    const slot = (await bagSlots()).find((s) => s.item?.name === cfg.hosp);
    if (!slot) return show(`HOSP: no ${cfg.hosp} in bag`);
    show(`HOSP: ${(await useItem(slot)).message}`);
  }

  async function runAbroad() {
    const slots = await bagSlots();
    const medSlot = slots.find((s) => s.item?.name === cfg.med);
    const sellSlots = slots.filter((s) => s.item?.name === cfg.sell);
    const plan = buyPlan(targetStocks(), slots.filter((s) => !s.item).length);
    const step = abroadStep({
      hospital: document.body.dataset.layout === 'hospital',
      hasMed: !!medSlot,
      sellCount: sellSlots.length,
      inStock: !!plan,
    });

    if (step === 'med') return show(`MED OUT: ${(await useItem(medSlot)).message}`);
    if (step === 'sell') {
      const res = await travelData('sellItem', { method: 'POST', body: { slotID: sellSlots[0].ID, amount: sellSlots.length } });
      return show(`SELL ${sellSlots.length}x ${cfg.sell}: ${res.message}`);
    }
    if (step === 'buy') {
      const itemId = plan.li.querySelector("form[id^='item-'][id$='-form']").id.split('-')[1];
      const res = await travelData('buy', { query: `&itemID=${itemId}&amount=${plan.amount}` });
      if (res.ok) clearAlert();
      return show(`BUY ${plan.amount}x ${plan.name}: ${res.message}`);
    }
    show('nothing to do');
  }

  async function trigger() {
    if (inFlight()) await runFlight();
    else if (atAgency()) await runAgency();
    else await runAbroad();
    window.dispatchEvent(new Event('focus'));
  }

  // ---- Events ----

  function onBarClick(event) {
    if (event.target.closest(barSelector())) trigger();
  }

  let suppressSpaceUp = false;

  function onKeyDown(event) {
    if (!document.querySelector(barSelector()) || !isTriggerKey(event)) return;
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

  // ---- Settings panel (REQ-002 #2, REQ-002 #5) and agency bar (REQ-003 #3) ----

  function renderSettings() {
    const root = document.querySelector('#travel-root');
    if (!root || document.querySelector('.qp-settings')) return;
    const box = document.createElement('div');
    box.className = 'qp-settings';
    const title = document.createElement('div');
    title.textContent = 'Quick Purchase settings';
    const form = document.createElement('form');
    for (const key of Object.keys(DEFAULTS)) {
      const label = document.createElement('label');
      label.textContent = LABELS[key];
      label.htmlFor = `qp-${key}`;
      const input = document.createElement('input');
      input.id = `qp-${key}`;
      input.name = key;
      input.type = 'text';
      form.append(label, input);
    }
    const fill = () => { for (const key of Object.keys(DEFAULTS)) form.elements[key].value = cfg[key]; };
    fill();
    const save = document.createElement('button');
    save.type = 'submit';
    save.className = 'torn-btn';
    save.textContent = 'Save';
    const load = document.createElement('button');
    load.type = 'button';
    load.className = 'torn-btn';
    load.textContent = 'Load package';
    form.append(save, load);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      saveSettings(withDefaults(Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, form.elements[k].value.trim()]))));
      fill();
    });
    load.addEventListener('click', async () => {
      const names = (await bagSlots()).filter((s) => s.item).map((s) => s.item.name);
      saveSettings(packageSettings([...new Set(names)], cfg));
      fill();
    });
    box.append(title, form);
    root.before(box);
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
    const here = atAgency();
    const cashStep = lowCashStep({ entered: here && !wasAgency, cash: readCash(), alerted: cashAlerted });
    wasAgency = here;
    if (cashStep === 'alert') startCashAlert();
    else if (cashStep === 'clear') clearCashAlert();
    const bar = document.querySelector(BAR);
    if (!bar) return;
    if (alerted) bar.classList.add('qp-green');
    const { restocked, next } = checkRestock(lastStock, targetStocks());
    lastStock = next;
    if (restocked) startAlert();
  }

  document.addEventListener('click', onBarClick, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);
  new MutationObserver(onMutation).observe(document.body, { childList: true, characterData: true, subtree: true });
  onMutation();
})();
