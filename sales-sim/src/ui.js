/* Interface for the Floor Turnaround simulation. Depends on window.SIM (engine.js). */
(function () {
  'use strict';
  const S = window.SIM;
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const k = (v) => '£' + Math.round(v / 1000) + 'k';
  const gbp = (v) => (v < 0 ? '−' : '') + '£' + Math.abs(Math.round(v)).toLocaleString('en-GB');
  const signedK = (v) => (v >= 0 ? '+' : '−') + '£' + Math.abs(Math.round(v / 1000)) + 'k';
  const STORE = 'floor-turnaround-v1';
  const MONTH_LONG = { Oct: 'October', Nov: 'November', Dec: 'December', Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September' };
  const SHORT_ROLE = { closer: 'Closer', ownbiz: 'Own biz', inbound: 'Inbound' };
  const CLAUDE_OFF = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'session_expired'];

  const app = {
    game: null, team: '', facilitator: false, pending: blankPending(), eventChoice: null,
    mode: 'checking', sampler: null, busy: false, notice: '', ctl: null,
  };
  function blankPending() { return { items: [], outOfScope: [], unclear: [], reaction: '', source: '' }; }

  // ---------- Storage (per viewer, best effort) ----------
  function save() {
    if (!app.game) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({ seed: app.game.seed, team: app.team, facilitator: app.facilitator, log: app.game.log, draft: $('#plan-text').value }));
    } catch (e) { /* storage unavailable */ }
  }
  function loadSaved() { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } }
  function clearSaved() { try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ } }
  function rebuild(saved) {
    const g = S.createGame(saved.seed);
    for (const e of saved.log || []) {
      if (g.over) break;
      S.step(g, { starts: e.starts, stops: e.stops, eventChoice: e.event ? e.event.choice : null, survey: e.survey });
    }
    return g;
  }

  // ---------- Claude detection ----------
  function setMode(mode) {
    app.mode = mode;
    const pill = $('#mode-pill');
    pill.className = 'pill ' + (mode === 'claude' ? 'claude' : mode === 'offline' ? 'offline' : '');
    $('#mode-text').textContent = mode === 'claude' ? 'Plans read by Claude' : mode === 'offline' ? 'Plans read by the built-in reader' : 'Checking for Claude…';
    pill.title = mode === 'claude' ? 'Each plan you read uses a small amount of your own Claude usage.' : mode === 'offline' ? 'Claude is not available here, so a keyword reader interprets plans. It is less flexible: be explicit.' : '';
    if (app.game && !app.game.over) { renderInterp(); renderPlanExtras(); }
  }
  function detectClaude() {
    const c = window.claude;
    if (!c || typeof c.use !== 'function') { setMode('offline'); return; }
    Promise.resolve(c.use('sample')).then((s) => { app.sampler = s || null; setMode(s ? 'claude' : 'offline'); }).catch(() => setMode('offline'));
  }

  // ---------- Screens ----------
  function show(id) {
    for (const s of ['screen-brief', 'screen-game', 'screen-debrief']) $('#' + s).hidden = s !== id;
    window.scrollTo(0, 0);
  }

  function initBrief() {
    $('#seed').value = String(1000 + Math.floor(Math.random() * 9000));
    const saved = loadSaved();
    if (saved && saved.log && saved.log.length) {
      $('#resume-box').hidden = false;
      $('#resume-text').textContent = 'You have a saved game' + (saved.team ? ' for ' + saved.team : '') + ': scenario ' + saved.seed + ', ' + saved.log.length + ' of 12 months played.';
    }
    $('#start-btn').onclick = () => {
      app.team = $('#team-name').value.trim();
      app.facilitator = $('#facilitator').checked;
      const seed = ($('#seed').value.trim() || '1').slice(0, 12);
      app.game = S.createGame(seed);
      app.pending = blankPending();
      $('#plan-text').value = '';
      startGame();
    };
    $('#resume-btn').onclick = () => {
      const saved = loadSaved(); if (!saved) return;
      app.team = saved.team || ''; app.facilitator = !!saved.facilitator;
      app.game = rebuild(saved);
      $('#plan-text').value = saved.draft || '';
      startGame();
    };
    $('#discard-btn').onclick = () => { clearSaved(); $('#resume-box').hidden = true; };
  }

  function startGame() {
    save();
    if (app.game.over) { showDebrief(); return; }
    show('screen-game');
    renderGame();
  }

  // ---------- Game rendering ----------
  function renderGame() {
    const g = app.game;
    const m = g.month;
    const label = S.MONTHS[m];
    const mp = $('#month-pill'); mp.hidden = false;
    mp.innerHTML = '<span class="num">Month ' + (m + 1) + ' / 12</span> · ' + MONTH_LONG[label] + (app.team ? ' · ' + esc(app.team) : '');
    $('#plan-title').textContent = 'Your plan for ' + MONTH_LONG[label];
    $('#plan-month').textContent = 'Scenario ' + g.seed;
    $('#run-btn').textContent = 'Run ' + MONTH_LONG[label];
    renderKpis(); renderRevenueChart(); renderFloor(); renderEvent(); renderInterp(); renderPlanExtras(); renderReport(); renderHidden();
  }

  function renderKpis() {
    const g = app.game;
    const last = g.hist[g.hist.length - 1];
    const rev = last ? last.revenue : S.HISTORY[S.HISTORY.length - 1].rev;
    const pct = (rev - S.C.BASE_REV) / S.C.BASE_REV * 100;
    const leavers = g.leaversTotal;
    const filled = g.people.filter((p) => !p.vacant).length;
    const board = Math.round(g.board);
    const tiles = [
      ['Revenue · ' + (last ? last.label : 'Sep'), k(rev), '<span class="' + (pct >= 0 ? 'delta-up' : 'delta-down') + '">' + (pct >= 0 ? '▲ +' : '▼ ') + pct.toFixed(1) + '%</span> vs £200k'],
      ['Meetings booked', last ? String(last.meetings) : '—', 'Target 84 (7 SDRs × 12)'],
      ['Deals closed', last ? String(Math.round(last.deals)) : '—', 'About £10k each'],
      ['Desks filled', filled + ' / 16', filled < 16 ? (16 - filled) + ' empty, hires on the way' : 'All seats filled'],
      ['Leavers so far', String(leavers), 'Cost about ' + gbp(leavers * S.C.CHURN_COST)],
      ['Head-office confidence', board + ' / 100', '<div class="meter' + (board < 30 ? ' low' : '') + '"><span style="width:' + board + '%"></span></div>'],
    ];
    $('#kpis').innerHTML = tiles.map((t) => '<div class="kpi"><div class="label">' + t[0] + '</div><div class="v">' + t[1] + '</div><div class="d">' + t[2] + '</div></div>').join('');
  }

  // ---------- Charts ----------
  function niceTicks(lo, hi, n) {
    const span = hi - lo; const raw = span / n; const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((x) => x * mag).find((x) => span / x <= n) || mag * 10;
    const start = Math.floor(lo / step) * step; const ticks = [];
    for (let v = start; v <= hi + step * 0.01; v += step) ticks.push(v);
    return ticks;
  }
  // opts: labels[], series[{name, cls, values[], color}], base, fmt, width, height, divider, endLabels, mini
  function lineChart(el, opts) {
    const W = Math.round(Math.max(300, el.clientWidth || opts.width || 680)), H = opts.height || 250;
    const padL = opts.mini ? 30 : 46, padR = opts.endLabels ? 96 : 14, padT = 12, padB = 24;
    const n = opts.labels.length;
    const all = []; opts.series.forEach((s) => s.values.forEach((v) => { if (v != null) all.push(v); }));
    if (opts.base != null) all.push(opts.base);
    let lo = Math.min(...all), hi = Math.max(...all);
    if (opts.yMin != null) lo = Math.min(lo, opts.yMin);
    if (opts.yMax != null) hi = Math.max(hi, opts.yMax);
    const pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
    const ticks = niceTicks(lo, hi, opts.mini ? 3 : 5);
    lo = Math.min(lo, ticks[0]); hi = Math.max(hi, ticks[ticks.length - 1]);
    const x = (i) => padL + (n === 1 ? 0 : i * (W - padL - padR) / (n - 1));
    const y = (v) => padT + (hi - v) / (hi - lo) * (H - padT - padB);
    const fmt = opts.fmt || ((v) => v);
    let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.aria || 'Line chart') + '">';
    for (const t of ticks) s += '<line class="grid" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text x="' + (padL - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + esc(fmt(t)) + '</text>';
    const every = n > 14 ? 2 : 1;
    const every2 = opts.mini || W < 520 ? Math.ceil(n / (opts.mini ? 2 : 5)) : every;
    opts.labels.forEach((l, i) => { if (i % every2 === 0 || (i === n - 1 && (n - 1) % every2 >= every2 / 2)) s += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(l) + '</text>'; });
    if (opts.divider != null) s += '<line class="divider" x1="' + x(opts.divider) + '" x2="' + x(opts.divider) + '" y1="' + padT + '" y2="' + (H - padB) + '"/><text x="' + (x(opts.divider) + 4) + '" y="' + (padT + 10) + '" class="lbl-ink">You start</text>';
    if (opts.base != null) s += '<line class="base" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(opts.base) + '" y2="' + y(opts.base) + '"/>';
    const endLabels = [];
    for (const ser of opts.series) {
      let d = '', started = false, lastI = -1;
      ser.values.forEach((v, i) => { if (v == null) { started = false; return; } d += (started ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); started = true; lastI = i; });
      if (ser.area && lastI > 0) {
        const first = ser.values.findIndex((v) => v != null);
        s += '<path class="area" d="' + d + 'L' + x(lastI) + ' ' + (H - padB) + 'L' + x(first) + ' ' + (H - padB) + 'Z"/>';
      }
      s += '<path class="' + ser.cls + '" d="' + d + '"' + (ser.dash ? ' stroke-dasharray="' + ser.dash + '"' : '') + '/>';
      if (ser.points) ser.values.forEach((v, i) => { if (v != null) s += '<circle class="' + (ser.pointCls || 'pt') + '" cx="' + x(i) + '" cy="' + y(v) + '" r="' + (i === lastI ? 5 : 3.5) + '"/>'; });
      else if (lastI >= 0) s += '<circle class="' + (ser.pointCls || 'pt') + '" cx="' + x(lastI) + '" cy="' + y(ser.values[lastI]) + '" r="4"' + (ser.color ? ' style="fill:' + ser.color + '"' : '') + '/>';
      if (opts.endLabels && lastI >= 0) endLabels.push({ y: y(ser.values[lastI]), x: x(lastI), text: ser.name + ' ' + fmt(ser.values[lastI]) });
    }
    endLabels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < endLabels.length; i++) if (endLabels[i].y - endLabels[i - 1].y < 14) endLabels[i].y = endLabels[i - 1].y + 14;
    for (const l of endLabels) s += '<text class="lbl-ink" x="' + (l.x + 8) + '" y="' + (l.y + 4) + '">' + esc(l.text) + '</text>';
    s += '<line class="cross" id="' + el.id + '-cross" x1="0" x2="0" y1="' + padT + '" y2="' + (H - padB) + '" visibility="hidden"/>';
    s += '<rect x="' + padL + '" y="' + padT + '" width="' + (W - padL - padR) + '" height="' + (H - padT - padB) + '" fill="transparent" class="hit"/></svg><div class="tip" hidden></div>';
    el.innerHTML = s;
    const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), cross = el.querySelector('.cross');
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width * W;
      const i = Math.max(0, Math.min(n - 1, Math.round((px - padL) / ((W - padL - padR) / Math.max(1, n - 1)))));
      const vals = opts.series.map((ser) => (ser.values[i] != null ? ser.name + ' ' + fmt(ser.values[i]) : null)).filter(Boolean);
      if (!vals.length) { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); return; }
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
      tip.hidden = false;
      tip.innerHTML = '<b>' + esc(opts.labels[i]) + '</b> ' + vals.map(esc).join(' · ');
      const top = Math.min(...opts.series.map((ser) => (ser.values[i] != null ? y(ser.values[i]) : H)));
      tip.style.left = Math.min(Math.max(x(i) / W * r.width, 60), r.width - 60) + 'px';
      tip.style.top = (top / H * r.height) + 'px';
    };
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
  }

  function renderRevenueChart() {
    const g = app.game;
    const labels = S.HISTORY.map((h) => h.label).concat(S.MONTHS);
    const hist = S.HISTORY.map((h) => h.rev).concat(S.MONTHS.map(() => null));
    const mine = S.HISTORY.map((h, i) => (i === S.HISTORY.length - 1 ? h.rev : null)).concat(S.MONTHS.map((_, i) => (g.hist[i] ? g.hist[i].revenue : null)));
    lineChart($('#rev-chart'), {
      labels, base: S.C.BASE_REV, fmt: k, divider: S.HISTORY.length - 1, aria: 'Monthly revenue, last six months and the months you have played', yMin: 150000, yMax: 240000,
      series: [
        { name: 'Before', cls: 'hist', values: hist, points: true, pointCls: 'pt-hist' },
        { name: 'Your office', cls: 'line', values: mine, points: true, area: true },
      ],
    });
  }

  function desk(p) {
    if (p.vacant) {
      const when = p.arrive != null && p.arrive < 12 ? 'New hire due ' + S.MONTHS[p.arrive] : 'Seat empty';
      return '<div class="desk vacant"><div class="who"><span>' + (p.leftName ? esc(p.leftName) + ' left' : 'Empty seat') + '</span><span>' + S.ROLE_LABEL[p.role] + '</span></div><div class="pct">' + when + '</div></div>';
    }
    const role = p.role === 'sdr' ? '' : SHORT_ROLE[p.role];
    const w = Math.min(p.pct || 0, 1.5) / 1.5 * 100;
    const isNew = p.tenure <= 1;
    const pctText = app.game.hist.length ? Math.round((p.pct || 0) * 100) + '% of target' : 'Not started';
    return '<div class="desk ' + (p.role === 'sdr' ? 'sdr' : '') + '"><div class="who"><span>' + esc(p.name) + (isNew ? ' <span class="tag">New</span>' : '') + '</span><span>' + (role ? role + ' · ' : '') + p.tenure + ' mo</span></div>'
      + '<div class="bar" title="' + pctText + '"><span style="width:' + w.toFixed(1) + '%"></span></div><div class="pct">' + pctText + '</div></div>';
  }
  function renderFloor() {
    const g = app.game;
    const pods = g.structural.reseat != null;
    const col = (title, sub, people) => '<div class="col"><div class="col-head"><span class="label">' + title + '</span><small>' + sub + '</small></div>' + people.map(desk).join('') + '</div>';
    let html;
    if (!pods) {
      html = '<div class="floor">' + col('SDRs', 'Kate', g.people.filter((p) => p.role === 'sdr'))
        + ['A', 'B', 'C'].map((t) => col('Team ' + t, S.MANAGERS[t], g.people.filter((p) => p.role !== 'sdr' && p.team === t))).join('') + '</div>';
    } else {
      html = '<div class="floor pods">' + ['A', 'B', 'C'].map((t) => col('Pod ' + t, S.MANAGERS[t] + ' · SDRs with closers', g.people.filter((p) => p.role !== 'sdr' && p.team === t).concat(g.people.filter((p) => p.role === 'sdr' && S.POD_OF_SDR[p.slot] === t)))).join('') + '</div>';
    }
    const onFloor = g.inits.some((i) => i.id === 'mgrfloor');
    html += '<div class="office"><span><b>' + S.OVERALL + '</b>, overall manager: ' + (onFloor ? 'working on the floor' : 'in a separate office') + '</span><span>Bell and ping-pong table by the door</span></div>';
    html += '<div class="bar-key"><span><i></i>Target (bar shows up to 150%)</span><span>Inbound reps: conversion rate vs 35%</span></div>';
    $('#floor').innerHTML = html;
    $('#floor-sub').textContent = pods ? 'Re-seated into mixed pods' : 'Laid out in columns';
  }

  function renderEvent() {
    const pe = app.game.pendingEvent;
    const el = $('#event');
    if (!pe) { el.innerHTML = ''; return; }
    el.innerHTML = '<section class="event" aria-live="polite"><span class="label">Something has come up</span><h2>' + esc(pe.title) + '</h2><p>' + esc(pe.text) + '</p>'
      + pe.choices.map((c, i) => '<label class="choice"><input type="radio" name="ev" value="' + i + '"' + (app.eventChoice === i ? ' checked' : '') + '><span>' + esc(c.label) + '<small>' + esc(c.detail) + '</small></span></label>').join('') + '</section>';
    el.querySelectorAll('input[name="ev"]').forEach((r) => { r.onchange = () => { app.eventChoice = +r.value; renderPlanExtras(); }; });
  }

  function chipFor(spec) {
    const l = S.specificityLabel(spec.specificity);
    const cls = l === 'Specific' ? 'specific' : l === 'Vague' ? 'vague' : 'partly';
    return '<span class="chip ' + cls + '">' + l + '</span>';
  }
  function renderInterp() {
    const p = app.pending;
    const el = $('#interp');
    let h = '';
    if (app.busy) h += '<p class="hint" aria-live="polite">Reading your plan… <button class="btn small" id="stop-read">Stop</button></p>';
    if (app.notice) h += '<p class="notice">' + esc(app.notice) + '</p>';
    if (p.items.length) {
      h += '<div><span class="label">We understood</span><ul class="items">' + p.items.map((it, i) => {
        const d = S.describeSpec(it);
        if (it.action === 'stop') return '<li class="item stop"><div><div class="name">Stop: ' + esc(d.name) + '</div></div><div><button class="btn small" data-rm="' + i + '" aria-label="Remove">Undo</button></div></li>';
        return '<li class="item"><div><div class="name">' + esc(d.name) + '</div><div class="detail">' + esc(d.detail) + '</div>' + (it.quote ? '<div class="quote">“' + esc(it.quote) + '”</div>' : '') + '</div><div class="stack" style="justify-items:end;gap:6px">' + chipFor(it) + (it.novel ? '<span class="chip novel">Closest match</span>' : '') + '<button class="btn small" data-rm="' + i + '" aria-label="Remove ' + esc(d.name) + '">Remove</button></div></li>';
      }).join('') + '</ul></div>';
    }
    if (p.outOfScope.length) h += '<div class="oos"><span class="label">Not in your control</span>' + p.outOfScope.map((o) => '<div><b>' + esc(o.quote) + '</b><br><span class="muted">' + esc(o.reason) + '</span></div>').join('') + '</div>';
    if (p.unclear.length) h += '<div class="oos"><span class="label">Not understood</span>' + p.unclear.map((u) => '<div>' + esc(u) + '<br><span class="muted">Try rewording: what will happen, who runs it, how often.</span></div>').join('') + '</div>';
    if (p.reaction) h += '<div class="reaction"><span class="label">On the floor</span><p>' + esc(p.reaction) + '</p></div>';
    if (app.mode === 'offline') {
      h += '<details><summary class="hint">The reader missed something?</summary><div class="row" style="margin-top:8px"><select id="add-arch" aria-label="Idea to add" style="max-width:100%;padding:6px;border:1px solid var(--line);border-radius:6px;background:var(--bg)">'
        + S.ARCH.slice().sort((a, b) => a.name.localeCompare(b.name)).map((a) => '<option value="' + a.id + '">' + esc(a.name) + '</option>').join('')
        + '</select><button class="btn small" id="add-btn">Add</button></div><p class="hint" style="margin-top:6px">Ideas added from this list count as vague unless your written plan explains who, how often and how you will measure it.</p></details>';
    }
    el.innerHTML = h;
    el.querySelectorAll('[data-rm]').forEach((b) => { b.onclick = () => { app.pending.items.splice(+b.dataset.rm, 1); renderInterp(); renderPlanExtras(); }; });
    const stop = $('#stop-read'); if (stop) stop.onclick = () => { if (app.ctl) app.ctl.abort(); };
    const add = $('#add-btn');
    if (add) add.onclick = () => {
      const def = S.ARCH_BY_ID[$('#add-arch').value];
      const spec = S.cleanSpec({ id: def.id, action: 'start', intensity: 0.75, scope: def.scope, cadence: def.once ? 'once' : 'unspecified', specificity: 0.35, quote: '' });
      mergeItems([spec]); renderInterp(); renderPlanExtras();
    };
  }

  function mergeItems(items) {
    for (const it of items) {
      const i = app.pending.items.findIndex((x) => x.id === it.id);
      if (i >= 0) app.pending.items[i] = it; else app.pending.items.push(it);
    }
  }

  function renderPlanExtras() {
    const g = app.game; if (!g) return;
    const m = g.month;
    const survey = $('#survey').checked;
    const load = S.computeLoad(g, m, survey, app.pending.items);
    const capPct = Math.min(100, load.cap / S.C.CAPACITY * 100), costPct = Math.min(100, load.cost / S.C.BUDGET * 100);
    const stopping = new Set(app.pending.items.filter((i) => i.action === 'stop').map((i) => i.id));
    let h = '<div class="loads"><div class="load' + (load.cap > S.C.CAPACITY ? ' over' : '') + '"><span class="label">Management time</span><div class="v">' + load.cap + ' / ' + S.C.CAPACITY + ' hrs</div><div class="meter"><span style="width:' + capPct + '%"></span></div></div>'
      + '<div class="load' + (load.cost > S.C.BUDGET ? ' over' : '') + '"><span class="label">Budget</span><div class="v">' + gbp(load.cost) + ' / ' + gbp(S.C.BUDGET) + '</div><div class="meter"><span style="width:' + costPct + '%"></span></div></div></div>';
    if (load.cap > S.C.CAPACITY) h += '<p class="notice">Managers do not have this much time. Everything will be done less well.</p>';
    if (load.cost > S.C.BUDGET) h += '<p class="notice">Over budget. Head office will notice the overspend.</p>';
    h += '<div><span class="label">Already running</span>';
    if (!g.inits.length) h += '<p class="empty">Nothing yet. Anything you start keeps running until you stop it.</p>';
    else h += '<ul class="items active-list">' + g.inits.map((it) => {
      const def = S.ARCH_BY_ID[it.id];
      const age = m - it.start;
      const st = stopping.has(it.id);
      return '<li class="item' + (st ? ' stop' : '') + '"><div><div class="name">' + (st ? 'Stopping: ' : '') + esc(def.name) + '</div><div class="detail">' + esc(S.describeSpec(it).detail) + '</div><div class="age">Month ' + (age + 1) + ' of running</div></div><div>'
        + '<button class="btn small" data-drop="' + it.id + '">' + (st ? 'Keep' : 'Stop') + '</button></div></li>';
    }).join('') + '</ul>';
    h += '</div>';
    $('#running').innerHTML = h;
    $('#running').querySelectorAll('[data-drop]').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.drop;
        const i = app.pending.items.findIndex((x) => x.id === id && x.action === 'stop');
        if (i >= 0) app.pending.items.splice(i, 1);
        else app.pending.items.push({ id, action: 'stop' });
        renderInterp(); renderPlanExtras();
      };
    });
    const needChoice = g.pendingEvent && app.eventChoice == null;
    $('#run-btn').disabled = needChoice || app.busy;
    const starts = app.pending.items.filter((i) => i.action === 'start').length;
    $('#run-hint').textContent = needChoice ? 'Choose how to respond to the event first.' : starts ? starts + ' new initiative' + (starts > 1 ? 's' : '') + ' will start this month.' : (g.inits.length ? 'You can run the month without starting anything new.' : 'Running a month with no plan is allowed. It shows what doing nothing looks like.');
  }

  function renderReport() {
    const g = app.game;
    const el = $('#report');
    const last = g.hist[g.hist.length - 1];
    if (!last) {
      el.innerHTML = '<div class="panel-head"><h2>Month report</h2></div><p class="muted">Reports appear here after each month. You will see revenue and who left. You will not see morale, trust or skill unless you run a survey, and even then only roughly.</p>';
      return;
    }
    let h = '<div class="panel-head"><h2>' + MONTH_LONG[last.label] + ' report</h2><span class="label num">' + k(last.revenue) + '</span></div><ul>' + last.notes.map((n) => '<li>' + esc(n) + '</li>').join('') + '</ul>';
    if (last.survey) {
      const s = last.survey;
      h += '<div class="survey" aria-label="Pulse survey">' + [['Clarity', s.clarity], ['Consistency', s.consistency], ['Care', s.care], ['Cohesion', s.cohesion], ['eNPS', s.enps]].map((x) => '<div><span class="label">' + x[0] + '</span><div class="v">' + x[1] + '</div></div>').join('') + '</div><p class="hint" style="margin-top:6px">Survey scores are noisy: treat a change under about 0.5 as no change.</p>';
    }
    const past = g.hist.slice(0, -1).reverse();
    if (past.length) h += '<details class="past"><summary>Earlier months</summary>' + past.map((r) => '<div style="margin-top:8px"><b>' + MONTH_LONG[r.label] + '</b> <span class="num muted">' + k(r.revenue) + '</span><ul>' + r.notes.map((n) => '<li>' + esc(n) + '</li>').join('') + '</ul>'
      + (r.survey ? '<p class="hint">Survey: clarity ' + r.survey.clarity + ', consistency ' + r.survey.consistency + ', care ' + r.survey.care + ', cohesion ' + r.survey.cohesion + ', eNPS ' + r.survey.enps + '</p>' : '') + '</div>').join('') + '</details>';
    el.innerHTML = h;
  }

  function renderHidden() {
    const el = $('#hidden-panel');
    el.hidden = !app.facilitator;
    if (!app.facilitator) return;
    const g = app.game;
    const last = g.hist[g.hist.length - 1];
    let h = '<div class="panel-head"><h2>Facilitator view</h2><span class="label">Hidden from players</span></div><table class="hidden-table"><tr><th>Measure</th><th>Start</th><th>Now</th></tr>'
      + S.STATE_KEYS.map((key) => '<tr><td>' + S.STATE_LABELS[key] + '</td><td class="n">' + S.BASE_STATE[key].toFixed(1) + '</td><td class="n">' + g.st[key].toFixed(2) + '</td></tr>').join('')
      + '<tr><td>Change fatigue</td><td class="n">0.0</td><td class="n">' + g.fatigue.toFixed(2) + '</td></tr>'
      + (last ? '<tr><td>Average skill</td><td class="n">—</td><td class="n">' + last.hidden.avgSkill.toFixed(2) + '</td></tr><tr><td>Average motivation</td><td class="n">—</td><td class="n">' + last.hidden.avgMot.toFixed(2) + '</td></tr><tr><td>Highest burnout</td><td class="n">—</td><td class="n">' + last.hidden.maxBurnout.toFixed(2) + '</td></tr><tr><td>Performance spread (Gini)</td><td class="n">—</td><td class="n">' + last.gini.toFixed(2) + '</td></tr>' : '')
      + '<tr><td>Manager strength S/A/B/C</td><td class="n">.60/.80/.60/.40</td><td class="n">' + ['S', 'A', 'B', 'C'].map((t) => g.mgr[t].toFixed(2).slice(1)).join('/') + '</td></tr></table>';
    if (last && last.hidden.inits.length) h += '<p class="hint" style="margin-top:8px">Initiative strength last month (0 = no effect yet): ' + last.hidden.inits.map((i) => esc(S.ARCH_BY_ID[i.id].name) + ' ' + i.strength.toFixed(2)).join(' · ') + '</p>';
    el.innerHTML = h;
  }

  // ---------- Reading a plan ----------
  async function readPlan() {
    const text = $('#plan-text').value.trim();
    if (!text || app.busy) return;
    app.notice = '';
    let res = null;
    if (app.mode === 'claude' && app.sampler) {
      app.busy = true; app.ctl = new AbortController(); renderInterp(); renderPlanExtras();
      try {
        const raw = await app.sampler.json(S.buildPrompt(text, app.game), { modelTier: 'quick', cache: { gcTime: 86400000 }, signal: app.ctl.signal });
        res = S.normalizeInterpretation(raw, app.game);
      } catch (e) {
        const code = e && e.code;
        if (code === 'cancelled') { app.busy = false; renderInterp(); renderPlanExtras(); return; }
        if (CLAUDE_OFF.includes(code)) { setMode('offline'); app.notice = 'Claude is not available in this view, so the built-in reader read your plan instead.'; }
        else if (code === 'rate_limited') app.notice = 'Claude is busy for your account right now, so the built-in reader read this plan. Try again later.';
        else app.notice = 'Claude could not read that plan, so the built-in reader did. ' + (code === 'refused' ? 'Try rewording it.' : '');
        res = null;
      }
      app.busy = false;
    }
    if (!res) res = S.interpretOffline(text, app.game);
    mergeItems(res.items);
    app.pending.outOfScope = res.outOfScope;
    app.pending.unclear = res.unclear;
    app.pending.reaction = res.reaction;
    app.pending.source = res.source;
    if (!res.items.length && !res.outOfScope.length) app.notice = (app.notice ? app.notice + ' ' : '') + 'Nothing in that plan could be turned into an action. Be concrete: what will happen, who will do it, how often.';
    renderInterp(); renderPlanExtras();
    save();
  }

  function runMonth() {
    const g = app.game;
    if (g.pendingEvent && app.eventChoice == null) return;
    const starts = app.pending.items.filter((i) => i.action === 'start');
    const stops = app.pending.items.filter((i) => i.action === 'stop').map((i) => i.id);
    S.step(g, { starts, stops, eventChoice: app.eventChoice, survey: $('#survey').checked });
    app.pending = blankPending(); app.eventChoice = null; app.notice = '';
    $('#survey').checked = false;
    $('#plan-text').value = '';
    save();
    if (g.over) { showDebrief(); return; }
    renderGame();
    $('#report').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  // ---------- Debrief ----------
  function showDebrief() {
    const g = app.game;
    show('screen-debrief');
    $('#month-pill').innerHTML = 'Debrief' + (app.team ? ' · ' + esc(app.team) : '') + ' · Scenario ' + esc(g.seed);
    const el = $('#screen-debrief');
    el.innerHTML = '<p class="muted">Working out what would have happened otherwise…</p>';
    setTimeout(() => { app.lastDebrief = S.debrief(g); renderDebrief(app.lastDebrief); }, 30);
  }

  function renderDebrief(d) {
    const g = app.game, t = d.mine, n = d.nothing.totals, r = d.reference.totals;
    const el = $('#screen-debrief');
    const vsNothing = t.revenue - n.revenue;
    const headline = g.fired ? 'Head office let you go after ' + t.months + ' months'
      : vsNothing > 150000 ? 'Twelve months later, the floor is in better shape'
      : vsNothing > 0 ? 'Twelve months later, a little better than doing nothing'
      : 'Twelve months later, you would have done better doing nothing';
    let h = '<span class="label">Debrief</span><h1 style="margin-top:6px">' + esc(headline) + '</h1>';
    h += '<div class="hero-stats">'
      + stat('Revenue over the year', '\u00a3' + (t.revenue / 1e6).toFixed(2) + 'm', signedK(vsNothing) + ' vs doing nothing')
      + stat('Run-rate, last 3 months', k(t.runRate), 'Do nothing: ' + k(n.runRate) + ' · Sequenced plan: ' + k(r.runRate))
      + stat('People who left', String(t.leavers), 'About ' + gbp(t.churnCost) + ' in replacement costs. Do nothing: ' + n.leavers)
      + stat('Performance spread', t.giniStart.toFixed(2) + ' → ' + t.giniEnd.toFixed(2), 'Gini of results vs target. Lower means less reliance on a few stars')
      + '</div>';
    h += '<section class="panel"><div class="panel-head"><h2>Three versions of the same year</h2><span class="label">Same people, same luck</span></div><div class="chart-wrap" id="deb-chart"></div>'
      + '<div class="legend"><span><i style="background:var(--series)"></i>Your office</span><span><i style="background:var(--series-2)"></i>If you had done nothing</span><span><i style="background:var(--series-3)"></i>A sequenced plan (benchmark)</span><span><i style="background:var(--muted)"></i>£200k average</span></div>'
      + '<p class="hint" style="margin-top:8px">The benchmark plan starts with call reviews, buddying, 1:1s, re-seating and protected calling hours, then adds hiring, onboarding and career-path changes over the next three months. It is one reasonable plan, not the answer.</p></section>';
    h += '<section class="panel"><div class="panel-head"><h2>What was happening underneath</h2><span class="label">Hidden during play</span></div><p class="hint" style="margin-bottom:10px">These are the numbers the model tracked but you never saw directly. Dashed lines show where each one started.</p><div class="multiples" id="minis"></div></section>';
    h += '<section class="panel"><div class="panel-head"><h2>What your actions did</h2><span class="label">Estimated by re-running the year without each one, six times</span></div>';
    if (!d.contributions.length) h += '<p class="muted">You did not start anything.</p>';
    else h += '<div class="table-wrap"><table class="contrib"><thead><tr><th>Action</th><th style="text-align:right">Revenue over the year</th><th style="text-align:right">Leavers</th></tr></thead><tbody>'
      + d.contributions.map((c) => '<tr><td>' + esc(c.name) + (c.trap ? ' <span class="flag">Quick boost, slow harm</span>' : '') + '</td><td class="n">' + signedK(c.revenue) + '</td><td class="n">' + (c.leavers > 0 ? '+' : c.leavers < 0 ? '\u2212' : '') + Math.abs(c.leavers) + '</td></tr>').join('')
      + '</tbody></table></div><p class="hint" style="margin-top:8px">Effects interact, so these do not add up to the total. Small numbers are mostly noise.</p>';
    h += '</section>';
    const abandoned = g.done.filter((x) => x.abandoned).map((x) => S.ARCH_BY_ID[x.id].name);
    h += '<div class="two"><section class="panel"><h2 style="margin-bottom:10px">Things worth noticing</h2><ul style="margin:0;padding-left:18px;display:grid;gap:6px">'
      + '<li>' + (abandoned.length ? 'You stopped ' + abandoned.length + ' initiative' + (abandoned.length > 1 ? 's' : '') + ' before they could work (' + esc(abandoned.join(', ')) + '). Each one cost trust and consistency.' : 'You did not abandon anything early.') + '</li>'
      + '<li>' + (g.hist[0] && g.hist[0].revenue < d.nothing.hist[0].revenue ? 'Your first month was ' + k(d.nothing.hist[0].revenue - g.hist[0].revenue) + ' below doing nothing. Time off the phones costs money before it pays back.' : 'Your first month was not below the do-nothing line.') + '</li>'
      + '<li>SDR leavers: ' + t.sdrLeavers + ' (do nothing: ' + n.sdrLeavers + ', benchmark: ' + r.sdrLeavers + ').</li>'
      + '<li>Head-office confidence ended at ' + t.board + ' / 100.</li>'
      + '</ul></section>';
    h += '<section class="panel"><h2 style="margin-bottom:10px">For discussion</h2><ol class="prompts">'
      + '<li>Which of your actions did you expect to matter most? What does the table say? Where were you wrong?</li>'
      + '<li>When revenue dipped, what did you want to do? What would you tell a real manager under that pressure?</li>'
      + '<li>What could you not see during the game that turned out to matter? How would you find it out in a real team?</li>'
      + '<li>Pay, pricing and targets were off the table. What did that force you to work on?</li>'
      + '<li>Next week you do this with a real team. What will you measure in month one, and what will you leave alone?</li>'
      + '</ol></section></div>';
    h += '<section class="panel"><div class="panel-head"><h2>Share your results</h2></div><div class="row"><button class="btn" id="copy-btn">Copy results</button><button class="btn" id="again-same">Play this scenario again</button><button class="btn primary" id="again-new">New scenario</button></div><textarea class="copy-area" id="copy-text" readonly hidden></textarea><p class="hint" id="copy-msg"></p></section>';
    el.innerHTML = h;

    const months = S.MONTHS.slice(0, Math.max(g.hist.length, d.nothing.hist.length));
    const pad = (arr) => months.map((_, i) => (arr[i] ? arr[i].revenue : null));
    lineChart($('#deb-chart'), {
      height: 300, labels: months, base: S.C.BASE_REV, fmt: k, endLabels: true, aria: 'Revenue by month for your office, doing nothing, and the benchmark plan',
      series: [
        { name: 'Benchmark', cls: 'line3', values: pad(d.reference.hist), color: 'var(--series-3)' },
        { name: 'Nothing', cls: 'line2', values: pad(d.nothing.hist), color: 'var(--series-2)' },
        { name: 'You', cls: 'line', values: pad(g.hist), points: true },
      ],
    });
    const minis = $('#minis');
    minis.innerHTML = ['clarity', 'consistency', 'care', 'cohesion', 'trust', 'energy'].map((key) => '<div class="mini"><h3>' + S.STATE_LABELS[key] + '</h3><div class="chart-wrap" id="mini-' + key + '"></div></div>').join('');
    for (const key of ['clarity', 'consistency', 'care', 'cohesion', 'trust', 'energy']) {
      lineChart($('#mini-' + key), {
        mini: true, height: 130, labels: ['Start'].concat(g.hist.map((x) => x.label)), base: S.BASE_STATE[key], fmt: (v) => v.toFixed(1), yMin: S.BASE_STATE[key] - 1, yMax: S.BASE_STATE[key] + 1,
        aria: S.STATE_LABELS[key] + ' over the year',
        series: [{ name: S.STATE_LABELS[key], cls: 'line', values: [S.BASE_STATE[key]].concat(g.hist.map((x) => x.hidden.st[key])) }],
      });
    }
    $('#copy-btn').onclick = () => copyResults(d);
    $('#again-same').onclick = () => { const seed = g.seed; clearSaved(); app.game = S.createGame(seed); app.pending = blankPending(); $('#plan-text').value = ''; startGame(); };
    $('#again-new').onclick = () => { clearSaved(); app.game = null; $('#month-pill').hidden = true; show('screen-brief'); initBrief(); };
  }
  function stat(label, v, d) { return '<div class="stat"><span class="label">' + label + '</span><div class="v">' + v + '</div><div class="d">' + d + '</div></div>'; }

  function copyResults(d) {
    const g = app.game;
    const data = {
      team: app.team, scenario: g.seed, fired: g.fired,
      revenueTotal: d.mine.revenue, revenueVsDoingNothing: d.mine.revenue - d.nothing.totals.revenue, runRateLast3: Math.round(d.mine.runRate),
      leavers: d.mine.leavers, sdrLeavers: d.mine.sdrLeavers, giniStart: +d.mine.giniStart.toFixed(3), giniEnd: +d.mine.giniEnd.toFixed(3), abandoned: d.mine.abandoned,
      monthlyRevenue: g.hist.map((h) => h.revenue),
      actions: g.log.map((e, i) => ({ month: S.MONTHS[i], started: e.starts.map((s) => S.ARCH_BY_ID[s.id].name), stopped: e.stops.map((id) => S.ARCH_BY_ID[id].name), event: e.event ? e.event.title + ': ' + e.event.label : null })),
    };
    const text = JSON.stringify(data, null, 2);
    const ta = $('#copy-text');
    ta.value = text;
    const fallback = () => { ta.hidden = false; ta.focus(); ta.select(); $('#copy-msg').textContent = 'Select all and copy the text above.'; };
    try {
      navigator.clipboard.writeText(text).then(() => { $('#copy-msg').textContent = 'Copied. Paste it into your class document.'; }, fallback);
    } catch (e) { fallback(); }
  }

  // ---------- Wiring ----------
  function init() {
    detectClaude();
    initBrief();
    $('#read-btn').onclick = readPlan;
    $('#plan-text').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); readPlan(); } });
    let t = null;
    $('#plan-text').addEventListener('input', () => { clearTimeout(t); t = setTimeout(save, 600); });
    $('#survey').onchange = renderPlanExtras;
    $('#run-btn').onclick = runMonth;
    let rt = null, lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      if (Math.abs(window.innerWidth - lastW) < 40) return;
      lastW = window.innerWidth; clearTimeout(rt);
      rt = setTimeout(() => { if (app.game && !$('#screen-game').hidden) renderRevenueChart(); if (app.lastDebrief && !$('#screen-debrief').hidden) renderDebrief(app.lastDebrief); }, 200);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
