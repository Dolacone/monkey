// ==UserScript==
// @name         Torn Intel planner priority
// @version      1.0.0
// @match        https://torn-intel.com/*
// @downloadURL  https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/torn-intel-planner/torn-intel-priority.user.js
// @updateURL    https://raw.githubusercontent.com/Dolacone/monkey/refs/heads/master/torn-intel-planner/torn-intel-priority.user.js
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  // Earlier entries fill the day first; later entries fill only the remaining gaps.
  const PRIORITY = [
    { country: "jap", itemId: 206, label: "Japan Xanax" },
    { country: "can", itemId: 206, label: "Canada Xanax" },
  ];

  // Turbopack module ids and export names in torn-intel's current build.
  const PLAN_MODULE = 249186; // "X" planDay(args), "T" buildCandidates(sources, opts), "p" checkTrips(trips, args, busy)
  const FILTER_MODULE = 168931; // "d" applySourceFilters(sources, opts)

  const SELECTION_KEY = "tiPrioritySelection";
  const LEAVE_ALERTS_URL = "/api/foreign-stock/flight-alerts";
  const RESTOCK_ALERTS_URL = "/api/foreign-stock/restock-alerts";
  const PLAN_ALERTS_URL = "/api/foreign-stock/plan-alerts";
  const DM_KINDS = ["leave", "restock"];

  const state = (window.__tiPriority = {
    priority: PRIORITY,
    patched: [],
    replan: null,
    checkTrips: null,
    flightBook: false,
    carry: 0,
    carryMultiplierAt: () => 1,
    arriveEarlyMin: 0,
    arriveEarlyOverrides: {},
    view: null,
    armed: { leave: [], restock: [] },
    playerId: null,
    drugReadyAt: null,
    leadMinutes: 10,
    message: "",
    busy: false,
    collapsed: false,
  });

  const rankOf = (c) => PRIORITY.findIndex((p) => p.country === c.country && p.itemId === c.itemId);
  const isNow = (c) => String(c.id).endsWith(":now");
  // Same restock cycle: within half a restock interval, or 15 minutes when the interval is unknown.
  const sameCycle = (a, b, intervalMin) => Math.abs(a - b) < (intervalMin > 0 ? 0.5 * intervalMin * 60e3 : 15 * 60e3);
  const slotOf = (c) => ({ country: c.country, itemId: c.itemId, now: isNow(c), restockAt: c.restockAt ?? null, intervalMin: c.intervalMin ?? null });
  const matches = (slot, c) =>
    slot.country === c.country &&
    slot.itemId === c.itemId &&
    slot.now === isNow(c) &&
    (slot.now || sameCycle(c.restockAt, slot.restockAt, c.intervalMin ?? slot.intervalMin));

  const loadSelection = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(SELECTION_KEY) ?? "null");
      if (saved && Array.isArray(saved.slots)) return saved;
    } catch {}
    return { manual: false, slots: [] };
  };
  const saveSelection = (selection) => {
    try {
      localStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
    } catch {}
  };

  const tieredPlan = (planDay, args) => {
    let pinned = args.pinned ?? [];
    let result = null;
    for (let rank = 0; rank < PRIORITY.length; rank++) {
      result = planDay({ ...args, objective: "profit", pinned, candidates: args.candidates.filter((c) => rankOf(c) === rank) });
      pinned = result.trips;
    }
    return result;
  };

  const wrapPlanDay = (planDay) => (args) => {
    state.replan = () => planWithPriority(planDay, args);
    return planWithPriority(planDay, args);
  };

  const planWithPriority = (planDay, args) => {
    const candidates = args.candidates.filter((c) => rankOf(c) >= 0);
    if (candidates.length === 0) return planDay(args);
    const restMs = Math.max(0, args.restMs ?? 0);
    const fixed = args.pinned ?? [];
    const busy = [...(args.busy ?? []), ...fixed.map((t) => ({ startAt: t.departAt - restMs, endAt: t.returnAt + restMs }))];
    const reasons = state.checkTrips ? state.checkTrips(candidates, args, busy) : new Map();
    const feasible = candidates.filter((c) => !reasons.get(c.id)).sort((a, b) => a.departAt - b.departAt);
    const selection = loadSelection();
    const result = selection.manual
      ? planDay({
        ...args,
        objective: "profit",
        candidates: [],
        pinned: [...fixed, ...feasible.filter((c) => selection.slots.some((s) => matches(s, c)))],
      })
      : tieredPlan(planDay, { ...args, candidates });
    const sleepStarts = (args.afk ?? []).map((a) => a.startAt).filter((at) => at > args.windowStart);
    const periodEnd = sleepStarts.length ? Math.min(...sleepStarts) : null;
    const firstView = state.view === null;
    state.view = { feasible, chosen: result.trips.filter((t) => rankOf(t) >= 0), fixed, restMs, periodEnd };
    if (firstView) {
      loadLeadMinutes();
      refreshAlerts();
      refreshDrugCooldown();
    }
    scheduleRender();
    return result;
  };

  // Priority pairs stay in the plan even when their country is switched off in the destination filter.
  const wrapFilter = (applyFilters) => (sources, opts) => {
    state.flightBook = !!opts.flightBook;
    const disabled = new Set(opts.disabledCountries ?? []);
    const kept = applyFilters(sources, {
      ...opts,
      disabledCountries: [...disabled].filter((code) => !PRIORITY.some((p) => p.country === code)),
    });
    return kept.filter((s) => !disabled.has(s.country) || rankOf(s) >= 0);
  };

  const wrapBuildCandidates = (build) => (sources, opts) => {
    state.carry = opts.carry ?? 0;
    state.carryMultiplierAt = opts.carryMultiplierAt ?? (() => 1);
    state.arriveEarlyMin = opts.arriveEarlyMin ?? 0;
    state.arriveEarlyOverrides = opts.arriveEarlyOverrides ?? {};
    return build(sources, opts);
  };

  const keepCheckTrips = (check) => {
    state.checkTrips = check;
    return check;
  };

  // Selection

  const setSelected = (trip, on) => {
    const view = state.view;
    const saved = loadSelection();
    const slots = saved.manual ? saved.slots : view.chosen.filter((t) => view.feasible.some((c) => c.id === t.id)).map(slotOf);
    const next = on ? [...slots, slotOf(trip)] : slots.filter((s) => !matches(s, trip));
    const cutoff = Date.now() - 6 * 3600e3;
    saveSelection({ manual: true, slots: next.filter((s) => s.now || s.restockAt > cutoff) });
    state.replan?.();
  };

  // Checking a trip selects it, then sets both DMs. Unchecking cancels its DMs first and keeps it selected if that fails.
  const toggleTrip = async (id) => {
    const trip = state.view?.feasible.find((c) => c.id === id);
    if (!trip || state.busy) return;
    const selected = state.view.chosen.some((t) => t.id === id);
    state.busy = true;
    state.message = "";
    render();
    if (selected) {
      const armed = armedKindsOf(trip);
      if (armed.length === 0 || (await syncTripDms(trip, armed, false))) setSelected(trip, false);
    } else {
      setSelected(trip, true);
      render();
      if (Number.isFinite(trip.restockAt)) await syncTripDms(trip, DM_KINDS.filter((kind) => !alertFor(trip, kind)), true);
    }
    state.message ||= "Site timeline follows within a minute.";
    state.busy = false;
    render();
  };

  const resetToAuto = () => {
    saveSelection({ manual: false, slots: [] });
    state.replan?.();
    state.message = "Back to priority order. Site timeline follows within a minute.";
    render();
  };

  // Discord DMs through torn-intel's plan alerts. Each POST replaces the whole set of plan alerts of one kind.

  const planSlotAlerts = (alerts) => alerts.filter((a) => a.source === "plan" && a.targetAt);
  const alertFor = (c, kind) =>
    Number.isFinite(c.restockAt)
      ? state.armed[kind].find(
        (a) => a.country === c.country && a.itemId === c.itemId && sameCycle(Date.parse(a.targetAt), c.restockAt, c.intervalMin ?? a.intervalAvgMin),
      ) ?? null
      : null;
  const armedKindsOf = (c) => DM_KINDS.filter((kind) => alertFor(c, kind));

  const tripPayload = (t) => {
    const carry = state.carry * state.carryMultiplierAt(t.departAt);
    return {
      country: t.country,
      itemId: t.itemId,
      itemName: t.itemName,
      restockAt: t.restockAt,
      intervalMin: t.intervalMin ?? null,
      unitCost: carry > 0 ? Math.round(t.cashRequired / carry) : 0,
      cycleOffset: t.cycleOffset ?? 0,
    };
  };

  const alertPayload = (a, kind) => {
    const trip = state.view?.chosen.find((t) => alertFor(t, kind) === a);
    return trip
      ? tripPayload(trip)
      : {
        country: a.country,
        itemId: a.itemId,
        itemName: a.itemName,
        restockAt: Date.parse(a.targetAt),
        intervalMin: a.intervalAvgMin ?? null,
        unitCost: 0,
        cycleOffset: 0,
      };
  };

  const alertOptions = (kind) => ({
    kind,
    leadMinutes: state.leadMinutes,
    ticketType: state.view?.feasible[0]?.ticket ?? "airstrip",
    flightBook: state.flightBook,
    carryingQty: state.carry * state.carryMultiplierAt(Date.now()),
    arriveEarlySec: Math.round(60 * state.arriveEarlyMin),
    arriveEarlyOverrides: state.arriveEarlyOverrides,
  });

  const refreshAlerts = async () => {
    try {
      const [leave, restock] = await Promise.all([fetch(LEAVE_ALERTS_URL), fetch(RESTOCK_ALERTS_URL)]);
      if (leave.ok && restock.ok) {
        state.armed = {
          leave: planSlotAlerts((await leave.json()).alerts ?? []),
          restock: planSlotAlerts((await restock.json()).alerts ?? []),
        };
      }
    } catch {}
    render();
  };

  const loadLeadMinutes = async () => {
    try {
      const prefs = (await (await fetch("/api/ui-prefs")).json()).prefs ?? {};
      const lead = prefs.dp_plan_alert_lead;
      if (Number.isInteger(lead) && lead >= 1 && lead <= 60) state.leadMinutes = lead;
    } catch {}
    render();
  };

  const refreshDrugCooldown = async () => {
    try {
      state.playerId ??= (await (await fetch("/api/shell")).json()).session?.playerId ?? null;
      if (state.playerId !== null) {
        const bars = await (await fetch(`/api/members/${state.playerId}/bars`)).json();
        const sec = bars.cooldowns?.drug;
        state.drugReadyAt = Number.isFinite(sec) ? Date.now() + 1000 * sec : null;
      }
    } catch {}
    render();
  };

  // Adds the trip to (on) or removes it from (off) each kind's plan alert set. Returns true when every kind ends in the wanted state.
  const syncTripDms = async (trip, kinds, on) => {
    const failed = [];
    for (const kind of kinds) {
      try {
        const current = alertFor(trip, kind);
        const others = state.armed[kind].filter((a) => a !== current).map((a) => alertPayload(a, kind));
        const res = await fetch(PLAN_ALERTS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trips: on ? [...others, tripPayload(trip)] : others, options: alertOptions(kind) }),
        });
        const body = await res.json().catch(() => null);
        if (res.status === 409) {
          state.message = "Discord is not linked on torn-intel.";
          return false;
        }
        if (res.ok && body) {
          state.armed = { leave: planSlotAlerts(body.flightAlerts ?? []), restock: planSlotAlerts(body.restockAlerts ?? []) };
          if (body.skippedOverCap > 0) state.message = "Alert limit reached. Delete a few alerts first.";
          else if (on && body.alreadySent > 0) state.message = `The ${kind} DM for this trip already went out.`;
        }
        if (!alertFor(trip, kind) !== !on) failed.push(kind);
      } catch {
        failed.push(kind);
      }
    }
    if (failed.length && !state.message) state.message = `Could not ${on ? "set" : "cancel"} the ${failed.join(" and ")} DM. Click DM to retry.`;
    return failed.length === 0;
  };

  // Sets the missing DM kinds; when every kind is already set, cancels all of them.
  const toggleAlert = async (id) => {
    const trip = state.view?.chosen.find((t) => t.id === id);
    if (!trip || !Number.isFinite(trip.restockAt) || state.busy) return;
    const armedKinds = armedKindsOf(trip);
    const turnOff = armedKinds.length === DM_KINDS.length;
    state.busy = true;
    state.message = "";
    render();
    await syncTripDms(trip, turnOff ? DM_KINDS : DM_KINDS.filter((kind) => !armedKinds.includes(kind)), !turnOff);
    state.busy = false;
    render();
  };

  // Panel

  const CSS = `
    :host { all: initial; }
    .panel { width: 360px; max-height: 70vh; display: flex; flex-direction: column; overflow: hidden;
      font: 12px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; color: #e5e7eb;
      background: #0f172a; border: 1px solid #334155; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.45); }
    header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid #1e293b; }
    .title { flex: 1; font-weight: 600; }
    .mode { color: #94a3b8; font-size: 11px; }
    button { font: inherit; color: #e2e8f0; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 1px 8px; cursor: pointer; }
    button:disabled { opacity: .4; cursor: default; }
    .body { overflow: auto; }
    section { padding: 8px 12px; border-bottom: 1px solid #1e293b; }
    h3 { display: flex; justify-content: space-between; margin: 0 0 4px; font-size: 12px; font-weight: 600; }
    h3 span { color: #94a3b8; font-weight: 400; }
    ul { list-style: none; margin: 0; padding: 0; }
    .row { display: grid; grid-template-columns: 1fr 64px 92px; align-items: center; gap: 8px; padding: 3px 0; color: #94a3b8; }
    .row.on { color: #f8fafc; }
    .row.clash { opacity: .45; }
    label, .cols { display: grid; grid-template-columns: 16px repeat(3, 38px); align-items: center; gap: 6px; font-variant-numeric: tabular-nums; }
    label { cursor: pointer; }
    .buy { color: #64748b; }
    .head { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
    .head .profit { color: inherit; }
    .xanax { display: flex; align-items: center; gap: 8px; padding: 2px 0 2px 22px; color: #ea580c; font-weight: 600; font-variant-numeric: tabular-nums; }
    .xanax::after { content: ""; flex: 1; border-top: 1px dashed #ea580c; opacity: .6; }
    .xan { color: #ea580c; font-weight: 600; }
    .profit { text-align: right; color: #34d399; font-variant-numeric: tabular-nums; }
    .act { text-align: right; font-size: 11px; color: #64748b; }
    .dm.armed { background: #1d4ed8; border-color: #3b82f6; }
    .dm.partial { border-color: #f59e0b; color: #fbbf24; }
    .empty { margin: 0; color: #64748b; }
    footer { display: grid; gap: 2px; padding: 8px 12px; }
    .hint { color: #64748b; font-size: 11px; }
    .msg { color: #fbbf24; }
    .collapsed .body, .collapsed footer { display: none; }
  `;

  let host = null;
  let root = null;
  let frame = 0;

  const hm = (ms) => new Date(ms).toTimeString().slice(0, 5);
  const money = (v) => (Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1e3)}k`);
  const conflictOf = (c, view) =>
    [...view.chosen, ...view.fixed].find(
      (t) => t.id !== c.id && c.departAt < t.returnAt + view.restMs && t.departAt - view.restMs < c.returnAt,
    ) ?? null;

  const DM_LABELS = { 0: "DM", 1: { leave: "Leave only", restock: "Restock only" }, 2: "DM on" };

  const inPeriod = (t, view) => view.periodEnd === null || t.departAt < view.periodEnd;

  const rowHtml = (c, view) => {
    const selected = view.chosen.some((t) => t.id === c.id);
    const clash = selected ? null : conflictOf(c, view);
    const armedKinds = selected ? armedKindsOf(c) : [];
    const label = armedKinds.length === 1 ? DM_LABELS[1][armedKinds[0]] : DM_LABELS[armedKinds.length];
    const tone = armedKinds.length === DM_KINDS.length ? " armed" : armedKinds.length ? " partial" : "";
    const xanaxAt = state.drugReadyAt;
    const leaveTone = xanaxAt !== null && c.departAt <= xanaxAt && xanaxAt < c.buyAt ? ' class="xan"' : "";
    const backTone = xanaxAt !== null && c.buyAt <= xanaxAt && xanaxAt < c.returnAt ? ' class="xan"' : "";
    const action = selected && Number.isFinite(c.restockAt)
      ? `<button class="dm${tone}" data-act="dm" data-id="${c.id}"${state.busy ? " disabled" : ""}>${label}</button>`
      : clash
      ? `overlaps ${hm(clash.departAt)}`
      : "";
    return `<li class="row${selected ? " on" : ""}${clash ? " clash" : ""}">
      <label><input type="checkbox" data-act="trip" data-id="${c.id}"${selected ? " checked" : ""}${clash || state.busy ? " disabled" : ""}>
        <span${leaveTone}>${hm(c.departAt)}</span><span class="buy">${hm(c.buyAt)}</span><span${backTone}>${hm(c.returnAt)}</span></label>
      <span class="profit">+${money(c.profit)}</span>
      <span class="act">${action}</span>
    </li>`;
  };

  const HEAD_HTML = `<li class="row head"><span class="cols"><span></span><span>Leave</span><span>Buy</span><span>Back</span></span>
    <span class="profit">Profit</span><span class="act"></span></li>`;

  // Xanax line goes after the last row whose buy time is at or before it.
  const xanaxIndex = (rows) => {
    const at = state.drugReadyAt;
    if (at === null) return -1;
    let index = 0;
    rows.forEach((c, i) => {
      if (c.buyAt <= at) index = i + 1;
    });
    return index;
  };

  const xanaxHtml = () => {
    const now = Date.now();
    return `<li class="xanax">${state.drugReadyAt <= now ? `${hm(now)} Xanax ready` : `${hm(state.drugReadyAt)} Xanax`}</li>`;
  };

  const sectionHtml = (p, view) => {
    const rows = view.feasible.filter((c) => c.country === p.country && c.itemId === p.itemId && inPeriod(c, view));
    const sample = rows.find((c) => c.units > 0);
    const perItem = sample ? `<span>${sample.units} x ${money(sample.profit / sample.units)}</span>` : "";
    const empty = view.periodEnd === null ? "No flight fits in the next 24h" : `No flight fits before ${hm(view.periodEnd)}`;
    const items = rows.map((c) => rowHtml(c, view));
    const at = xanaxIndex(rows);
    if (at >= 0) items.splice(at, 0, xanaxHtml());
    const list = rows.length ? `<ul>${HEAD_HTML}${items.join("")}</ul>` : `<p class="empty">${empty}</p>`;
    return `<section><h3>${p.label}${perItem}</h3>${list}</section>`;
  };

  const panelHtml = (view) => {
    const manual = loadSelection().manual;
    const listed = view.chosen.filter((t) => inPeriod(t, view));
    const total = listed.reduce((sum, t) => sum + t.profit, 0);
    const period = view.periodEnd === null ? "next 24h" : `until sleep ${hm(view.periodEnd)}`;
    return `<div class="panel${state.collapsed ? " collapsed" : ""}">
      <header>
        <span class="title">Trips <span class="mode">${period}</span></span>
        <span class="mode">${manual ? "manual" : "priority"}</span>
        <button data-act="auto"${manual ? "" : " disabled"}>Auto</button>
        <button data-act="collapse">${state.collapsed ? "+" : "-"}</button>
      </header>
      <div class="body">${PRIORITY.map((p) => sectionHtml(p, view)).join("")}</div>
      <footer>
        <div>${listed.length} selected · +${money(total)}</div>
        <div class="hint">DM = Discord leave DM ${state.leadMinutes}m before leave + restock DM</div>
        ${state.message ? `<div class="msg">${state.message}</div>` : ""}
      </footer>
    </div>`;
  };

  const mount = () => {
    host = document.createElement("div");
    host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483000;";
    root = host.attachShadow({ mode: "open" });
    root.addEventListener("change", (e) => {
      const el = e.target;
      if (el.dataset?.act === "trip") toggleTrip(el.dataset.id);
    });
    root.addEventListener("click", (e) => {
      const el = e.target.closest?.("button");
      if (!el) return;
      if (el.dataset.act === "dm") toggleAlert(el.dataset.id);
      if (el.dataset.act === "auto") resetToAuto();
      if (el.dataset.act === "collapse") {
        state.collapsed = !state.collapsed;
        render();
      }
    });
    document.body.appendChild(host);
  };

  function render() {
    const onPlanner = state.view && location.pathname.startsWith("/dashboard/stocks");
    if (!onPlanner || !document.body) {
      if (host) host.style.display = "none";
      return;
    }
    if (!host) mount();
    host.style.display = "";
    const scroll = root.querySelector(".body")?.scrollTop ?? 0;
    root.innerHTML = `<style>${CSS}</style>${panelHtml(state.view)}`;
    const body = root.querySelector(".body");
    if (body) body.scrollTop = scroll;
  }

  function scheduleRender() {
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        render();
      });
    }
  }

  setInterval(render, 30e3);
  setInterval(() => {
    if (!state.view) return;
    refreshAlerts();
    refreshDrugCooldown();
  }, 120e3);

  // Module patching

  const EXPORT_PATCHES = {
    [PLAN_MODULE]: { X: wrapPlanDay, T: wrapBuildCandidates, p: keepCheckTrips },
    [FILTER_MODULE]: { d: wrapFilter },
  };

  const patchExportList = (list, patches, moduleId) => {
    const out = [...list];
    for (let i = 0; i < out.length; i += 3) {
      const wrap = patches[out[i]];
      if (wrap && out[i + 1] === 0 && typeof out[i + 2] === "function") {
        out[i + 2] = wrap(out[i + 2]);
        state.patched.push(`${moduleId}.${out[i]}`);
      }
    }
    return out;
  };

  const wrapFactory = (factory, ids) =>
    function (ctx) {
      const proxy = new Proxy(ctx, {
        get(target, prop) {
          const value = target[prop];
          if (prop === "s") {
            return (list, id) => {
              const moduleId = id ?? ids[0];
              const patches = EXPORT_PATCHES[moduleId];
              return value.call(target, patches ? patchExportList(list, patches, moduleId) : list, id);
            };
          }
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      return factory.call(this, proxy);
    };

  const patchChunk = (entry) => {
    if (!Array.isArray(entry)) return entry;
    let ids = [];
    return entry.map((item, i) => {
      if (i === 0) return item;
      if (typeof item === "number") {
        ids.push(item);
        return item;
      }
      if (typeof item === "function") {
        const hit = ids.some((id) => EXPORT_PATCHES[id]);
        const factoryIds = ids;
        ids = [];
        return hit ? wrapFactory(item, factoryIds) : item;
      }
      return item;
    });
  };

  const wrapPush = (target) => {
    const push = target.push;
    target.push = (...entries) => push.apply(target, entries.map(patchChunk));
    return target;
  };

  // Before the runtime boots, TURBOPACK must stay an Array; the runtime then replaces it with { push }.
  let current = globalThis.TURBOPACK;
  if (current === undefined) current = [];
  wrapPush(current);
  Object.defineProperty(globalThis, "TURBOPACK", {
    configurable: true,
    get: () => current,
    set: (next) => {
      current = next && typeof next.push === "function" ? wrapPush(next) : next;
    },
  });
})();
