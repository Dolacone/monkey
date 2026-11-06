// ==UserScript==
// @name         Torn: Quick Purchase
// @namespace    quick-purchase
// @version      1.0.1
// @description  Alert when the target abroad item restocks, and buy it by clicking the travel message bar (or pressing q / space) three times
// @author       Dolacone
// @match        https://www.torn.com/page.php?sid=travel*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/quick-purchase/quick-purchase.js
// @updateURL    https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/quick-purchase/quick-purchase.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const TARGET = 'Xanax';
  const SOUND_URL = 'https://cdn.pixabay.com/download/audio/2024/05/23/audio_336d55dfa8.mp3?filename=servant-bell-ring-2-211683.mp3';

  // ---- Rules (REQ-002 #1-3, REQ-003 #1-3) ----

  function parseStock(text) {
    const digits = String(text).replace(/[^0-9]/g, '');
    return digits === '' ? null : parseInt(digits, 10);
  }

  function isRestock(prev, now) {
    return prev === 0 && now !== null && now > 0;
  }

  function nextAction(step, confirmOpen) {
    if (confirmOpen) return 'confirm';
    return step === 0 ? 'max' : 'buy';
  }

  // ---- Keyboard (REQ-002 #9-12) ----

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
    module.exports = { parseStock, isRestock, nextAction, isTriggerKey };
    return;
  }

  // ---- DOM ----

  const BAR = '.info-msg-cont .msg';
  const ROWS = "[class*='stockTableWrapper___'] li";

  const style = document.createElement('style');
  style.textContent =
    '.qp-active{font-size:0 !important}' +
    '.qp-active>strong{display:none !important}' +
    '.qp-status{font-size:12px;font-weight:bold}' +
    '.qp-green{background:#2e7d32 !important;color:#fff !important}';
  document.head.appendChild(style);

  const sound = new Audio(SOUND_URL);
  sound.preload = 'auto';

  let step = 0;
  let itemId = null;
  let lastStock;
  let alerted = false;
  let bodyBackground = '';

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

  function resolveItemId() {
    const form = findTargetRow()?.querySelector("form[id^='item-'][id$='-form']");
    if (form) return (itemId = form.id.split('-')[1]);
    const panel = [...document.querySelectorAll("[id^='item-'][id$='-buyPanel']")].find(
      (p) => p.querySelector("[class*='confirmQuestion___'] strong")?.textContent.trim().replace(/^[\d,]+x /, '') === TARGET
    );
    if (panel) return (itemId = panel.id.split('-')[1]);
    return itemId;
  }

  function show(text) {
    const bar = document.querySelector(BAR);
    if (!bar) return;
    bar.classList.add('qp-active');
    let status = bar.querySelector('.qp-status');
    if (!status) {
      status = document.createElement('span');
      status.className = 'qp-status';
      bar.appendChild(status);
    }
    status.textContent = `[${TARGET}] ${text}`;
  }

  function keepScroll(action) {
    const x = window.scrollX;
    const y = window.scrollY;
    const end = performance.now() + 800;
    action();
    const hold = () => {
      if (window.scrollX !== x || window.scrollY !== y) window.scrollTo(x, y);
      if (performance.now() < end) requestAnimationFrame(hold);
    };
    requestAnimationFrame(hold);
  }

  function startAlert() {
    alerted = true;
    bodyBackground = document.body.style.backgroundColor;
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

  function waitForResult(id) {
    const end = performance.now() + 5000;
    const poll = () => {
      const msg = document.querySelector(`#item-${id}-buyPanel [class*='buyResultMessage___']`);
      if (msg) return show(`CONFIRM: ${msg.textContent.trim()} | next click: MAX`);
      if (performance.now() < end) setTimeout(poll, 100);
      else show('CONFIRM: no result shown | next click: MAX');
    };
    poll();
  }

  function runStep() {
    const id = resolveItemId();
    if (!id) return show('not sold here');

    const yes = document.querySelector(`#item-${id}-buyPanel [class*='confirmPanel___'] button[class*='yes___']`);
    const action = nextAction(step, !!yes);

    if (action === 'confirm') {
      keepScroll(() => yes.click());
      step = 0;
      clearAlert();
      show('CONFIRM sent, waiting for result...');
      return waitForResult(id);
    }

    const form = document.getElementById(`item-${id}-form`);
    if (!form) return show('row busy | click again later');

    if (action === 'max') {
      keepScroll(() => form.querySelector('.input-money-symbol').click());
      step = 1;
      setTimeout(() => show(`MAX -> qty ${form.querySelector("input[placeholder='Qty']").value} | next click: BUY`), 50);
      return;
    }

    step = 0;
    const buy = document.querySelector(`button[type='submit'][form='item-${id}-form']`);
    if (!buy || buy.disabled) return show('BUY button disabled | next click: MAX');
    keepScroll(() => buy.click());
    setTimeout(() => {
      const question = document.querySelector(`#item-${id}-buyPanel [class*='confirmQuestion___']`);
      show(question ? `BUY -> ${question.textContent.trim()} | next click: CONFIRM` : 'BUY clicked, no confirm panel | next click: MAX');
    }, 150);
  }

  function isShopShown() {
    return !!document.querySelector(BAR) && !!document.querySelector(ROWS);
  }

  function onBarClick(event) {
    if (event.target.closest(BAR) && isShopShown()) runStep();
  }

  let suppressSpaceUp = false;

  function onKeyDown(event) {
    if (!isShopShown() || !isTriggerKey(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === ' ') suppressSpaceUp = true;
    runStep();
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
    if (lastStock !== undefined && isRestock(lastStock, now)) startAlert();
    lastStock = now;
  }

  document.addEventListener('click', onBarClick, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);
  new MutationObserver(onMutation).observe(document.body, { childList: true, characterData: true, subtree: true });
  onMutation();
})();
