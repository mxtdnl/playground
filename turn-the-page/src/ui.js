// Turn the Page — interface. Session 1: a bare DEBUG page that plays the
// case through with plain buttons and shows the meters as numbers.
// Session 3 replaces this file with the real interface (SPEC.md 13).
// Uses the engine functions and MAYA from the same inlined script scope.

const app = document.getElementById('app');
const ui = { state: null, r1: null, picked: null, lever: null, last: null, seed: 1 };

function el(tag, attrs, children) {
  const e = document.createElement(tag);
  Object.keys(attrs || {}).forEach(function (k) {
    if (k === 'onclick') e.addEventListener('click', attrs[k]);
    else if (k === 'text') e.textContent = attrs[k];
    else e.setAttribute(k, attrs[k]);
  });
  (children || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
}

function btn(label, fn, cls) {
  return el('button', { type: 'button', onclick: fn, text: label, class: cls || '' });
}

function metersLine(m) {
  return 'Trust ' + m.trust + ' · Confidence ' + m.confidence + ' · Ownership ' + m.ownership;
}

function signed(d) {
  return RULES.meters.map(function (m) { return m + ' ' + (d[m] >= 0 ? '+' : '') + d[m]; }).join(', ');
}

function startR1() {
  ui.state = createRound(MAYA, 'r1', null, ui.seed);
  ui.r1 = null; ui.lever = null; ui.picked = null; ui.last = null;
  render();
}

function startR2() {
  ui.state = createRound(MAYA, 'r2', carryOver(ui.r1), ui.seed);
  ui.lever = null; ui.picked = null; ui.last = null;
  render();
}

function choose(optionId, guess) {
  ui.state = applyChoice(ui.state, optionId, guess);
  ui.last = ui.state.history[ui.state.history.length - 1];
  ui.lever = null; ui.picked = null;
  if (ui.state.ending && ui.state.round === 'r1') ui.r1 = ui.state;
  render();
}

function render() {
  const s = ui.state;
  app.innerHTML = '';
  app.appendChild(el('h1', { text: 'Turn the Page — engine debug' }));
  app.appendChild(el('p', { class: 'muted', text: 'Session 1 debug page. Stub content; numbers shown for testing only.' }));

  if (!s) {
    const seedInput = el('input', { type: 'number', value: String(ui.seed), id: 'seed', 'aria-label': 'Seed' });
    app.appendChild(el('p', {}, ['Seed: ', seedInput]));
    app.appendChild(el('div', { class: 'panel' }, [
      el('h2', { text: MAYA.referral.title }),
      el('p', { text: 'Student: ' + MAYA.referral.student }),
      el('p', { text: 'Referred by: ' + MAYA.referral.from }),
      el('p', { class: 'story', text: MAYA.referral.text })
    ]));
    app.appendChild(btn('Start Round 1', function () { ui.seed = Number(seedInput.value) || 1; startR1(); }));
    return;
  }

  const round = MAYA.rounds[s.round];
  app.appendChild(el('p', { class: 'meters', id: 'meters', text: s.round.toUpperCase() + ' · ' + metersLine(s.meters) }));
  if (s.from) app.appendChild(el('p', { class: 'muted', text: 'Opened from Round 1 ending: ' + s.from + ' · traits ' + JSON.stringify(s.traits) }));

  if (ui.last) {
    app.appendChild(el('div', { class: 'panel', id: 'reaction' }, [
      el('p', { class: 'story', text: ui.last.reaction }),
      el('p', { text: ui.last.lever + (ui.last.quality ? ' (' + ui.last.quality + ')' : '') + ' → ' + signed(ui.last.deltas) }),
      ui.last.guess ? el('p', { text: 'You named: ' + ui.last.guess + (ui.last.guessCorrect ? ' — matches' : ' — it was ' + ui.last.lever) }) : el('span'),
      el('p', { class: 'muted', text: 'Rules applied: ' + (ui.last.trace.join(', ') || 'base only') })
    ]));
  }

  if (s.ending) {
    const ending = round.endings[s.ending];
    app.appendChild(el('div', { class: 'panel', id: 'ending' }, [
      el('h2', { text: 'Ending: ' + ending.title + ' (' + s.ending + ')' }),
      el('p', { class: 'story', text: ending.text }),
      el('pre', { text: s.history.map(function (h, i) { return (i + 1) + '. ' + h.nodeId + ' ' + h.optionId + ' ' + h.lever + (h.quality ? '/' + h.quality : '') + ' ' + signed(h.deltas) + ' → ' + metersLine(h.meters); }).join('\n') })
    ]));
    if (s.round === 'r1') app.appendChild(btn('Continue to Round 2', startR2));
    app.appendChild(btn('Replay Round 1', startR1));
    if (ui.r1) app.appendChild(btn('Replay Round 2', startR2));
    return;
  }

  const node = getNode(s);
  app.appendChild(el('div', { class: 'panel' }, [
    el('p', { class: 'muted', text: 'p. ' + node.page + ' · Act ' + node.act + ' (' + round.acts[node.act].title + ') · ' + s.nodeId }),
    el('p', { class: 'story', text: node.line }),
    el('p', { class: 'story muted', text: node.cue })
  ]));
  const options = optionsFor(s);

  if (round.format === 'B') {
    if (!ui.lever) {
      app.appendChild(el('p', { text: 'Pick a lever:' }));
      RULES.levers.forEach(function (lv) { app.appendChild(btn(lv, function () { ui.lever = lv; render(); })); });
    } else {
      app.appendChild(el('p', { text: 'Lever: ' + ui.lever + '. Pick a wording:' }));
      options.filter(function (o) { return o.lever === ui.lever; }).forEach(function (o) {
        app.appendChild(btn('"' + o.text + '" [' + o.quality + ']', function () { choose(o.id); }, 'block'));
      });
      app.appendChild(btn('← Back to levers', function () { ui.lever = null; render(); }));
    }
  } else {
    if (!ui.picked) {
      app.appendChild(el('p', { text: 'Pick a line:' }));
      options.forEach(function (o) { app.appendChild(btn('"' + o.text + '"', function () { ui.picked = o.id; render(); }, 'block')); });
    } else {
      app.appendChild(el('p', { text: 'Name that lever:' }));
      RULES.levers.forEach(function (lv) { app.appendChild(btn(lv, function () { choose(ui.picked, lv); })); });
    }
  }
}

render();
