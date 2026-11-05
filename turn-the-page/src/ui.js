// Turn the Page — interface (SPEC.md sections 8, 13, 14.4 and 15).
//
// Screens: Cover, How it works, Referral note, Scene (Round 1 two-step choice
// or Round 2 choice plus Name that lever), Consequence (with the Round 2
// reveal), Act banner, Ending, Interlude and a minimal Debrief (session 4
// replaces the debrief). Uses the engine, art and content names from the same
// inlined script scope (CLAUDE.md, technical conventions).
//
// No scoring happens here: every meter change comes from applyChoice.

const STORE_KEY = 'turn-the-page:maya:v1';
const SAVE_VERSION = 1;

// Lever names and definitions, verbatim from SPEC.md section 4.
const LEVER_INFO = {
  question: { name: 'Question', def: 'Provide probing, open questions to explore an area more' },
  support: { name: 'Support', def: 'Provide empathetic, supportive language and encouragement' },
  observe: { name: 'Observe', def: 'Provide feedback based on external observations or based on what is said' },
  challenge: { name: 'Challenge', def: 'Provide a different perspective or push back on what is being said' }
};

// Glyphs (SPEC.md 4): circle, square, ring with centre dot, triangle.
const LEVER_GLYPHS = {
  question: '<circle cx="8" cy="8" r="7" fill="currentColor"/>',
  support: '<rect x="1.5" y="1.5" width="13" height="13" fill="currentColor"/>',
  observe: '<circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="8" cy="8" r="2.1" fill="currentColor"/>',
  challenge: '<polygon points="8,1 15.2,15 0.8,15" fill="currentColor"/>'
};

// Meter labels and what they mean (SPEC.md 6.4).
const METER_INFO = {
  trust: { name: 'Trust', def: 'Rapport: her willingness to keep talking honestly.' },
  confidence: { name: 'Confidence', def: 'Maya\'s belief in herself.' },
  ownership: { name: 'Ownership', def: 'How far the thinking and the plan are hers.' }
};

// Words for the aria-live announcement and the meter labels. Presentation
// only: the sizes describe a change already computed by the engine.
const CHANGE_WORDS = { little: 4, lot: 10 }; // |change| <= little: "a little"; >= lot: "a lot"
const LEVEL_WORDS = ['very low', 'very low', 'very low', 'low', 'low', 'middling', 'middling', 'high', 'high', 'very high', 'very high'];

const ROUND_LABELS = { r1: 'Round 1', r2: 'Round 2' };
const SCREEN_NAMES = ['cover', 'how', 'referral', 'scene', 'consequence', 'act', 'ending', 'debrief', 'interlude'];

// ---------------------------------------------------------------------------
// DOM helpers.

function h(tag, props, kids) {
  const e = document.createElement(tag);
  if (props) {
    Object.keys(props).forEach(function (k) {
      const v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'onclick') e.addEventListener('click', v);
      else e.setAttribute(k, v === true ? '' : String(v));
    });
  }
  (kids || []).forEach(function (c) {
    if (c === null || c === undefined || c === false) return;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
}

function glyph(lever) {
  return h('span', { class: 'glyph', 'aria-hidden': 'true', html: '<svg viewBox="0 0 16 16" focusable="false">' + LEVER_GLYPHS[lever] + '</svg>' });
}

// A lever name with its glyph, in the lever's text colour (never colour alone).
function leverTag(lever) {
  return h('span', { class: 'lever-tag lv-' + lever }, [glyph(lever), LEVER_INFO[lever].name]);
}

function leverChip(lever) {
  return h('span', { class: 'lever-chip lv-' + lever }, [glyph(lever), LEVER_INFO[lever].name]);
}

function button(label, onclick, opts) {
  opts = opts || {};
  return h('button', {
    type: 'button',
    class: 'btn' + (opts.ghost ? ' btn--ghost' : ''),
    'data-primary': opts.primary ? true : null,
    'data-action': opts.action || null,
    onclick: onclick
  }, [h('span', { text: label }), opts.dest ? h('span', { class: 'dest', text: opts.dest }) : null]);
}

function runhead(left, pageNo) {
  return h('header', { class: 'runhead' }, [
    h('span', { text: left }),
    pageNo ? h('span', { class: 'pageno', 'data-page': pageNo, text: 'p. ' + pageNo }) : h('span', { class: 'pageno', text: 'Turn the Page' })
  ]);
}

// Decorative geometry: shapes bleeding off the edges, behind the content.
// Each entry: [kind, colour, inline position and size].
function deco(shapes) {
  return h('div', { class: 'deco', 'aria-hidden': 'true' }, shapes.map(function (s) {
    return h('span', { class: 'shape ' + s[0] + ' ' + s[1], style: s[2] });
  }));
}

const DECO = {
  cover: [['circle', 'question', 'width:520px;height:520px;right:-180px;top:-160px'], ['triangle', 'challenge', 'width:360px;height:320px;left:-120px;bottom:-90px'], ['square', 'support', 'width:200px;height:200px;right:12%;bottom:-80px']],
  how: [['ring', 'observe', 'width:420px;height:420px;right:-170px;top:-120px;border-width:60px'], ['triangle', 'question', 'width:300px;height:260px;left:-120px;bottom:-60px']],
  referral: [['square', 'question', 'width:300px;height:300px;left:-140px;top:18%'], ['circle', 'challenge', 'width:380px;height:380px;right:-160px;bottom:-140px']],
  scene: [['circle', 'observe', 'width:380px;height:380px;right:-170px;bottom:-150px'], ['triangle', 'question', 'width:240px;height:210px;right:-90px;top:42%']],
  consequence: null,
  act: [['circle', 'support', 'width:360px;height:360px;right:-140px;bottom:-140px'], ['square', 'plum', 'width:200px;height:200px;left:-80px;bottom:8%']],
  ending: [['ring', 'observe', 'width:460px;height:460px;left:-200px;top:-160px;border-width:70px'], ['triangle', 'support', 'width:320px;height:280px;right:-110px;bottom:-80px']],
  debrief: [['square', 'challenge', 'width:260px;height:260px;right:-120px;top:120px'], ['circle', 'question', 'width:340px;height:340px;left:-180px;bottom:-120px']],
  interlude: [['circle', 'plum', 'width:480px;height:480px;right:-200px;top:-140px'], ['triangle', 'observe', 'width:280px;height:240px;left:-100px;bottom:-60px'], ['square', 'question', 'width:140px;height:140px;right:20%;bottom:-60px']]
};

function pageEl(screen, extraClass, kids) {
  return h('section', { class: 'page page--' + screen + (extraClass ? ' ' + extraClass : ''), 'data-screen': screen, tabindex: '-1' }, [deco(DECO[screen] || DECO.scene)].concat(kids));
}

// ---------------------------------------------------------------------------
// Persistence (SPEC.md 14.4). Everything is wrapped in try/catch: if storage
// is unavailable the simulation still runs, with a notice. No names or free
// text are stored; nothing is sent anywhere.

const store = (function () {
  let ls = null;
  try {
    ls = window.localStorage;
    const probe = STORE_KEY + ':probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
  } catch (e) {
    ls = null;
  }
  return {
    ok: ls !== null,
    load: function () {
      if (!ls) return null;
      try {
        const raw = ls.getItem(STORE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    save: function (data) {
      if (!ls) return false;
      try {
        ls.setItem(STORE_KEY, JSON.stringify(data));
        return true;
      } catch (e) {
        return false;
      }
    },
    clear: function () {
      if (!ls) return;
      try { ls.removeItem(STORE_KEY); } catch (e) { /* nothing to clear */ }
    }
  };
})();

function validRoundState(st) {
  if (!st || typeof st !== 'object' || st.caseId !== MAYA.id) return false;
  const round = MAYA.rounds[st.round];
  if (!round || !st.meters || !Array.isArray(st.history)) return false;
  if (st.nodeId !== null && !round.nodes[st.nodeId]) return false;
  return st.history.every(function (e) { return round.nodes[e.nodeId]; });
}

function validSave(d) {
  if (!d || d.v !== SAVE_VERSION || SCREEN_NAMES.indexOf(d.screen) < 0 || d.screen === 'cover') return false;
  if (d.state !== null && !validRoundState(d.state)) return false;
  if (d.r1 !== null && !validRoundState(d.r1)) return false;
  const needsState = ['scene', 'consequence', 'act', 'ending', 'debrief'];
  if (needsState.indexOf(d.screen) >= 0 && !d.state) return false;
  if (d.screen === 'consequence' && d.state.history.length === 0) return false;
  if (d.screen === 'interlude' && !(d.r1 && d.r1.ending)) return false;
  if (d.screen === 'scene' && (d.state.ending || d.state.nodeId === null)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// App state. `state` is the engine state of the current round; `r1` is the
// finished Round 1 state (for the carry-over); `lever` and `picked` are the
// unfinished first step of a choice.

registerCase(MAYA);

const root = document.getElementById('app');
const live = h('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true', id: 'meter-announcer' });
document.body.appendChild(live);

const view = { screen: 'cover', state: null, r1: null, lever: null, picked: null, seed: null };
let resumeData = null;
(function () {
  const d = store.load();
  if (validSave(d)) resumeData = d;
})();

function showStorageNotice() {
  if (document.getElementById('storage-notice')) return;
  const n = h('div', { class: 'notice', id: 'storage-notice', role: 'status', text: 'This browser is not letting the page save your progress. You can still play, but if you close or reload the page you will start again.' });
  document.body.insertBefore(n, root);
}
if (!store.ok) showStorageNotice();

function persist() {
  if (view.screen === 'cover') return; // the cover keeps the saved place for Resume
  const ok = store.save({
    v: SAVE_VERSION, screen: view.screen, state: view.state, r1: view.r1,
    lever: view.lever, picked: view.picked, seed: view.seed
  });
  if (!ok) showStorageNotice();
}

function newSeed() {
  const m = /[?&]seed=(\d+)/.exec(window.location.search);
  if (m) return Number(m[1]);
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

function reducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// ---------------------------------------------------------------------------
// Rendering.

// The old page slides off over the new one (SPEC.md 11.3).
function pageTurn(oldPage) {
  if (reducedMotion()) return;
  const wrap = h('div', { class: 'turn-out', 'aria-hidden': 'true' });
  wrap.inert = true;
  const clone = oldPage.cloneNode(true);
  clone.removeAttribute('tabindex');
  clone.style.transform = 'translateY(' + (-window.scrollY) + 'px)';
  wrap.appendChild(clone);
  document.body.appendChild(wrap);
  let gone = false;
  function done() { if (!gone) { gone = true; wrap.remove(); } }
  wrap.addEventListener('animationend', done);
  setTimeout(done, 700);
}

function render(opts) {
  opts = opts || {};
  const old = root.querySelector('.page');
  if (old && opts.turn) pageTurn(old);
  const page = SCREENS[view.screen](opts);
  root.replaceChildren(page);
  if (opts.turn) window.scrollTo(0, 0);
  persist();
  const target = (opts.focus && page.querySelector(opts.focus)) || page;
  target.focus({ preventScroll: true });
}

function go(screen, opts) {
  view.screen = screen;
  render(Object.assign({ turn: true }, opts || {}));
}

function currentRound() {
  return MAYA.rounds[view.state.round];
}

function roundLabel(st) {
  return ROUND_LABELS[st.round] + ' · ' + MAYA.rounds[st.round].title;
}

// Destination pages for a set of options (SPEC.md 11.3). A route that depends
// on the meters lists every page it can lead to, so the number never gives
// away which wording is the skilful one.
function destLabel(round, node, options) {
  const pages = [];
  let end = false;
  options.forEach(function (o) {
    const r = routeFor(node, o);
    (Array.isArray(r) ? r.map(function (x) { return x.to; }) : [r]).forEach(function (t) {
      if (t === null) end = true;
      else if (pages.indexOf(round.nodes[t].page) < 0) pages.push(round.nodes[t].page);
    });
  });
  pages.sort(function (a, b) { return a - b; });
  const parts = pages.map(String);
  if (!parts.length) return '→ the end';
  return '→ p. ' + parts.join(' or ') + (end ? ' or the end' : '');
}

// ---------------------------------------------------------------------------
// Meters: ten segments, no numbers. With `change`, the segments that moved
// flash in the causing lever's colour and a marker shows the direction.

function segCount(v) {
  return Math.max(0, Math.min(10, Math.round(v / 10)));
}

function metersView(meters, change, extraClass) {
  const box = h('div', { class: 'meters' + (extraClass ? ' ' + extraClass : '') });
  RULES.meters.forEach(function (m) {
    const filled = segCount(meters[m]);
    const delta = change ? meters[m] - change.before[m] : 0;
    const prevFilled = change ? segCount(change.before[m]) : filled;
    let lo = Math.min(prevFilled, filled);
    let hi = Math.max(prevFilled, filled);
    if (delta !== 0 && lo === hi) {
      // The change did not cross a segment boundary: flash the edge segment.
      if (delta > 0) { lo = Math.max(0, filled - 1); hi = lo + 1; } else { lo = Math.min(9, filled); hi = lo + 1; }
    }
    const segs = h('div', { class: 'segs', 'aria-hidden': 'true' });
    for (let i = 0; i < 10; i++) {
      let cls = 'seg' + (i < filled ? ' on' : '');
      if (change && change.animate && delta !== 0 && i >= lo && i < hi) cls += i < filled ? ' flash-on' : ' flash-off';
      segs.appendChild(h('span', { class: cls }));
    }
    const label = METER_INFO[m].name;
    const meter = h('div', {
      class: 'meter',
      role: 'img',
      'aria-label': label + ': ' + LEVEL_WORDS[filled],
      'data-meter': m,
      'data-value': meters[m],
      'data-filled': filled,
      'data-change': delta,
      style: change ? '--flash-colour: var(--lever-' + change.lever + ')' : null
    }, [
      h('span', { class: 'meter-label', 'aria-hidden': 'true', text: label }),
      segs,
      h('span', { class: 'mark', 'aria-hidden': 'true', text: delta > 0 ? '▲' : delta < 0 ? '▼' : '' })
    ]);
    box.appendChild(meter);
  });
  return box;
}

function describeChange(deltas) {
  const parts = RULES.meters.filter(function (m) { return deltas[m] !== 0; }).map(function (m) {
    const d = deltas[m];
    const size = Math.abs(d) <= CHANGE_WORDS.little ? ' a little' : Math.abs(d) >= CHANGE_WORDS.lot ? ' a lot' : '';
    return METER_INFO[m].name + (d > 0 ? ' rose' : ' fell') + size + '.';
  });
  return parts.length ? parts.join(' ') : 'The meters did not move.';
}

function announce(text) {
  live.textContent = '';
  setTimeout(function () { live.textContent = text; }, 60);
}

// ---------------------------------------------------------------------------
// Scene placeholder (session 3): art.js draws a silhouette and names the posture.

function sceneView(meters, node, roundId) {
  const art = renderScene({ meters: meters, poseBias: MAYA.profile.poseBias, pose: (node.scene || {}).pose, round: roundId });
  return h('figure', { class: 'scene-area scene-frame', style: 'margin:0', 'data-posture': art.posture }, [
    h('div', { role: 'img', 'aria-label': art.alt, html: art.svg }),
    h('figcaption', { class: 'scene-caption' }, [
      h('span', { class: 'posture', text: 'Posture: ' + art.posture }),
      h('span', { text: art.caption || 'Placeholder figure' })
    ])
  ]);
}

function storyHead(node) {
  return [
    h('p', { class: 'speaker', text: MAYA.profile.name }),
    h('p', { class: 'maya-line', text: '“' + node.line + '”' }),
    node.cue ? h('p', { class: 'cue', text: node.cue }) : null
  ];
}

// ---------------------------------------------------------------------------
// Screens.

function screenCover() {
  const resume = resumeData;
  const actions = resume
    ? [
        button('Resume', function () {
          Object.assign(view, { screen: resume.screen, state: resume.state, r1: resume.r1, lever: resume.lever || null, picked: resume.picked || null, seed: resume.seed });
          render({ turn: true });
        }, { primary: true, action: 'resume' }),
        button('Start again', startAfresh, { ghost: true, action: 'start-again' })
      ]
    : [button('Start', startAfresh, { primary: true, action: 'start' })];
  return pageEl('cover', 'night', [
    h('div', { class: 'cover-inner' }, [
      h('h1', { class: 'lockup', 'aria-label': 'Turn the Page: a coaching adventure' }, [
        h('span', { class: 'lk1', 'aria-hidden': 'true', text: 'Turn' }),
        h('span', { class: 'lk2', 'aria-hidden': 'true', text: 'the' }),
        h('span', { class: 'lk3', 'aria-hidden': 'true', text: 'Page' }),
        h('span', { class: 'lk4', 'aria-hidden': 'true', text: 'A coaching adventure' })
      ]),
      h('p', { class: 'premise', text: 'Maya, 16, says she is "just being lazy". You are her counsellor. Two conversations, four levers, and no single right path.' }),
      resume ? h('p', { class: 'eyebrow', text: 'You have a conversation in progress.' }) : null,
      h('div', { class: 'actions' }, actions)
    ])
  ]);
}

function startAfresh() {
  store.clear();
  resumeData = null;
  Object.assign(view, { state: null, r1: null, lever: null, picked: null, seed: null });
  go('how');
}

function leverCardStatic(lever) {
  return h('div', { class: 'lever-card lv-' + lever }, [
    h('span', { class: 'name' }, [glyph(lever), LEVER_INFO[lever].name]),
    h('span', { class: 'def', text: LEVER_INFO[lever].def })
  ]);
}

function screenHow() {
  return pageEl('how', null, [
    runhead('How it works', null),
    h('div', { class: 'narrow', style: 'max-width:1100px' }, [
      h('h1', { class: 'how-title', text: 'How it works' }),
      h('p', { class: 'story', style: 'font-size:1.15rem;max-width:44rem', text: 'You will hold two conversations with Maya, a student her maths teacher is worried about. Each page shows what she says and what you can see. You decide how to respond, using four levers.' }),
      h('div', { class: 'lever-grid how-levers' }, RULES.levers.map(leverCardStatic)),
      h('h2', { text: 'Three meters' }),
      h('p', { style: 'max-width:44rem', text: 'They show how Maya is responding. They have no numbers: watch which way they move.' }),
      metersView({ trust: 50, confidence: 30, ownership: 20 }, null, 'how-meters'),
      h('ul', { class: 'steps' }, RULES.meters.map(function (m) {
        return h('li', {}, [h('strong', { text: METER_INFO[m].name + ': ' }), METER_INFO[m].def]);
      })),
      h('h2', { style: 'margin-top:28px', text: 'Two rounds' }),
      h('ol', { class: 'steps' }, [
        h('li', { text: 'Round 1: choose a lever, then choose how to say it. The two wordings are not labelled. You can go back to the levers before you choose a wording.' }),
        h('li', { text: 'Round 2, two weeks later: choose what to say. The levers are hidden. After each choice, name the lever you think the line used.' })
      ]),
      h('p', { class: 'muted', text: 'Keyboard: keys 1 to 4 choose, Enter confirms, Escape goes back.' }),
      h('p', { class: 'pull', text: 'There is no single right path.' }),
      h('div', { class: 'actions' }, [button('Read the referral', function () { go('referral'); }, { primary: true })])
    ])
  ]);
}

function screenReferral() {
  const r = MAYA.referral;
  return pageEl('referral', null, [
    runhead('Before you begin', null),
    h('article', { class: 'referral' }, [
      h('h1', { text: r.title }),
      h('div', { class: 'field' }, [h('span', { class: 'field-label', text: 'Student' }), h('span', { class: 'field-value', text: r.student })]),
      h('div', { class: 'field' }, [h('span', { class: 'field-label', text: 'Referred by' }), h('span', { class: 'field-value', text: r.from })]),
      h('div', { class: 'field' }, [h('span', { class: 'field-label', text: 'Reason' }), h('span', { class: 'field-value', text: r.text })]),
      h('div', { class: 'actions' }, [button('Begin the conversation', startRound1, { primary: true, dest: '→ p. ' + MAYA.rounds.r1.nodes[MAYA.rounds.r1.start].page })])
    ])
  ]);
}

function startRound1() {
  view.seed = newSeed();
  view.state = createRound(MAYA, 'r1', null, view.seed);
  view.r1 = null;
  view.lever = null;
  view.picked = null;
  go(view.state.ending ? 'ending' : 'scene');
}

function startRound2() {
  view.seed = newSeed();
  view.state = createRound(MAYA, 'r2', carryOver(view.r1), view.seed);
  view.lever = null;
  view.picked = null;
  go(view.state.ending ? 'ending' : 'scene');
}

// Round 1, step 1 (and Round 2's Name that lever): four lever buttons.
function leverButtons(onPick, opts) {
  opts = opts || {};
  return h('div', { class: 'lever-grid' + (opts.compact ? ' compact' : '') }, RULES.levers.map(function (lever, i) {
    return h('button', {
      type: 'button',
      class: 'lever-card lv-' + lever,
      'data-key': i + 1,
      'data-lever': opts.attr === 'guess' ? null : lever,
      'data-guess': opts.attr === 'guess' ? lever : null,
      onclick: function () { onPick(lever); }
    }, [
      h('span', { class: 'key', 'aria-hidden': 'true', text: String(i + 1) }),
      h('span', { class: 'name' }, [glyph(lever), LEVER_INFO[lever].name]),
      h('span', { class: 'def', text: LEVER_INFO[lever].def }),
      opts.dest ? h('span', { class: 'dest', text: opts.dest(lever) }) : null
    ]);
  }));
}

function lineButtons(options, round, node, onPick, coloured) {
  return h('div', { class: 'line-list' }, options.map(function (o, i) {
    return h('button', {
      type: 'button',
      class: 'line-option' + (coloured ? ' lv-' + o.lever : ''),
      'data-key': i + 1,
      'data-option': o.id,
      onclick: function () { onPick(o.id); }
    }, [
      h('span', { class: 'num', 'aria-hidden': 'true', text: String(i + 1) }),
      h('span', { class: 'quote', text: '“' + o.text + '”' }),
      h('span', { class: 'dest', text: destLabel(round, node, [o]) })
    ]);
  }));
}

function choicePanel(st, node) {
  const round = MAYA.rounds[st.round];
  const options = optionsFor(st);
  if (round.format === 'B') {
    if (!view.lever) {
      return h('div', { class: 'choices', 'data-step': 'lever' }, [
        h('p', { class: 'eyebrow', id: 'choice-prompt', text: 'Choose a lever' }),
        leverButtons(function (lever) {
          view.lever = lever;
          render({ focus: '.line-option' });
        }, {
          dest: function (lever) { return destLabel(round, node, node.options.filter(function (o) { return o.lever === lever; })); }
        })
      ]);
    }
    const lever = view.lever;
    return h('div', { class: 'choices', 'data-step': 'wording' }, [
      h('p', { class: 'eyebrow with-tag', id: 'choice-prompt' }, [leverTag(lever), h('span', { text: '· Choose your words' })]),
      lineButtons(options.filter(function (o) { return o.lever === lever; }), round, node, commit, true),
      h('button', {
        type: 'button', class: 'link-back', 'data-back': true,
        onclick: function () { view.lever = null; render({ focus: '[data-lever="' + lever + '"]' }); }
      }, ['← Choose a different lever'])
    ]);
  }
  // Format C.
  if (!view.picked) {
    return h('div', { class: 'choices', 'data-step': 'line' }, [
      h('p', { class: 'eyebrow', id: 'choice-prompt', text: 'Choose what to say' }),
      lineButtons(options, round, node, function (id) {
        view.picked = id;
        render({ focus: '[data-guess]' });
      }, false)
    ]);
  }
  const picked = node.options.find(function (o) { return o.id === view.picked; });
  return h('div', { class: 'choices', 'data-step': 'name' }, [
    h('p', { class: 'eyebrow', text: 'You chose to say' }),
    h('p', { class: 'picked-line', text: '“' + picked.text + '”' }),
    h('p', { class: 'eyebrow', id: 'choice-prompt', text: 'Name that lever: which lever does this line use?' }),
    leverButtons(function (lever) { commit(view.picked, lever); }, { compact: true, attr: 'guess' })
  ]);
}

function commit(optionId, guess) {
  view.state = applyChoice(view.state, optionId, guess);
  view.lever = null;
  view.picked = null;
  if (view.state.ending && view.state.round === 'r1') view.r1 = view.state;
  view.screen = 'consequence';
  render({ animate: true, focus: '[data-primary]' });
}

function screenScene() {
  const st = view.state;
  const node = getNode(st);
  return pageEl('scene', null, [
    runhead(roundLabel(st) + ' · Act ' + node.act + ': ' + currentRound().acts[node.act].title, node.page),
    h('div', { class: 'spread', 'data-node': st.nodeId }, [
      metersView(st.meters, null),
      sceneView(st.meters, node, st.round),
      h('div', { class: 'story-col' }, storyHead(node).concat([choicePanel(st, node)]))
    ])
  ]);
}

function lastEntry() {
  return view.state.history[view.state.history.length - 1];
}

function screenConsequence(opts) {
  const st = view.state;
  const round = currentRound();
  const entry = lastEntry();
  const node = round.nodes[entry.nodeId];
  const option = node.options.find(function (o) { return o.id === entry.optionId; });
  const before = {};
  RULES.meters.forEach(function (m) { before[m] = entry.meters[m] - entry.deltas[m]; });
  if (opts.animate) announce(describeChange(entry.deltas));

  let reveal = null;
  if (round.format === 'C') {
    const named = entry.guess;
    reveal = h('div', { class: 'reveal', 'data-reveal': entry.lever, 'data-guess-correct': entry.guessCorrect ? 'yes' : 'no' }, [
      h('span', { class: 'eyebrow', style: 'margin:0', text: 'This line used' }),
      leverChip(entry.lever),
      h('span', { class: 'verdict' }, entry.guessCorrect
        ? ['✓ You named it.']
        : ['✗ You named ', leverTag(named), '.'])
    ]);
  }
  const next = st.ending ? '→ the end' : '→ p. ' + round.nodes[st.nodeId].page;
  return pageEl('consequence', null, [
    runhead(roundLabel(st) + ' · Act ' + node.act + ': ' + round.acts[node.act].title, node.page),
    h('div', { class: 'spread', 'data-node': entry.nodeId }, [
      metersView(st.meters, { before: before, lever: entry.lever, animate: !!opts.animate && !reducedMotion() }),
      sceneView(st.meters, node, st.round),
      h('div', { class: 'story-col' }, [
        h('p', { class: 'eyebrow', text: 'You said' }, []),
        h('p', { class: 'you-said', text: '“' + option.text + '”' }),
        reveal,
        h('p', { class: 'speaker', text: MAYA.profile.name }),
        h('p', { class: 'reaction', text: entry.reaction }),
        h('div', { class: 'actions' }, [button('Continue', afterConsequence, { primary: true, dest: next })])
      ])
    ])
  ]);
}

function afterConsequence() {
  const st = view.state;
  const round = currentRound();
  const prevAct = round.nodes[lastEntry().nodeId].act;
  if (st.ending === 'early') return go('ending');
  const nextAct = st.nodeId ? round.nodes[st.nodeId].act : null;
  go(nextAct !== prevAct ? 'act' : 'scene');
}

function screenAct() {
  const st = view.state;
  const round = currentRound();
  const act = round.nodes[lastEntry().nodeId].act;
  const next = st.ending ? null : round.nodes[st.nodeId].page;
  return pageEl('act', 'act-' + act, [
    runhead(roundLabel(st), null),
    h('div', { class: 'banner' }, [
      h('div', { class: 'slab', 'aria-hidden': 'true' }),
      h('div', { class: 'banner-body' }, [
        h('p', { class: 'tag', text: 'End of Act ' + act + ' · ' + round.acts[act].title }),
        h('p', { class: 'cliff', text: round.acts[act].cliffhanger })
      ])
    ]),
    h('div', { class: 'banner-actions' }, [
      button('Turn the page', function () { go(st.ending ? 'ending' : 'scene'); }, { primary: true, dest: next ? '→ p. ' + next : '→ the end' })
    ])
  ]);
}

// One large geometric emblem per ending (SPEC.md 11.3).
const EMBLEMS = {
  breakthrough: '<circle cx="160" cy="150" r="96" fill="#D9A21B"/><polygon points="160,30 250,250 70,250" fill="#D2401E"/><circle cx="160" cy="168" r="34" fill="#F3ECDC"/><rect x="40" y="250" width="240" height="18" fill="#2747B8"/>',
  partial: '<path d="M 64 170 A 96 96 0 0 1 256 170 Z" fill="#1A7050"/><rect x="64" y="170" width="192" height="96" fill="none" stroke="#F3ECDC" stroke-width="10"/><circle cx="160" cy="170" r="20" fill="#D9A21B"/>',
  polite: '<rect x="70" y="60" width="180" height="180" fill="#2747B8"/><rect x="40" y="250" width="240" height="18" fill="#F3ECDC"/><circle cx="250" cy="70" r="34" fill="#D9A21B"/>',
  early: '<rect x="100" y="40" width="130" height="230" fill="none" stroke="#F3ECDC" stroke-width="10"/><polygon points="100,40 180,70 180,290 100,270" fill="#D2401E"/><circle cx="165" cy="170" r="8" fill="#F3ECDC"/><polygon points="230,200 290,270 230,270" fill="#D9A21B"/>'
};

function screenEnding() {
  const st = view.state;
  const ending = currentRound().endings[st.ending];
  return pageEl('ending', 'night', [
    runhead(roundLabel(st), null),
    h('div', { class: 'ending-inner', 'data-ending': st.ending }, [
      h('div', { class: 'emblem', 'aria-hidden': 'true', html: '<svg viewBox="0 0 320 300" focusable="false">' + EMBLEMS[st.ending] + '</svg>' }),
      h('div', {}, [
        h('p', { class: 'eyebrow', text: ROUND_LABELS[st.round] + ' ends' }),
        h('h1', { class: 'ending-title', text: ending.title }),
        h('p', { class: 'ending-text', text: ending.text }),
        h('div', { class: 'actions' }, [button('See your path', function () { go('debrief'); }, { primary: true })])
      ])
    ])
  ]);
}

// Minimal debrief: the path, decision by decision. Session 4 replaces this
// with the full debriefs in SPEC.md section 10.
function screenDebrief() {
  const st = view.state;
  const round = currentRound();
  const ending = round.endings[st.ending];
  const isR2 = st.round === 'r2';
  const named = st.history.filter(function (e) { return e.guessCorrect; }).length;
  const items = st.history.map(function (e) {
    const node = round.nodes[e.nodeId];
    const option = node.options.find(function (o) { return o.id === e.optionId; });
    return h('li', { class: 'lv-' + e.lever }, [
      h('div', { class: 'path-head' }, [
        h('span', { class: 'pageno', text: 'p. ' + node.page }),
        leverTag(e.lever),
        e.quality ? h('span', { class: 'muted', text: e.quality === 'skilful' ? 'Skilful wording' : 'Clumsy wording' }) : null,
        isR2 ? h('span', { class: 'muted' }, e.guessCorrect ? ['✓ You named it'] : ['✗ You named ', leverTag(e.guess)]) : null
      ]),
      h('p', { class: 'said', text: '“' + option.text + '”' }),
      h('p', { class: 'reacted', text: e.reaction }),
      h('p', { class: 'note', text: option.debrief })
    ]);
  });
  const actions = isR2
    ? [
        button('Replay Round 2', function () { go('interlude'); }, { primary: true }),
        button('Start again', function () { store.clear(); resumeData = null; Object.assign(view, { state: null, r1: null, lever: null, picked: null }); go('cover'); }, { ghost: true })
      ]
    : [
        button('Continue to Round 2', function () { view.r1 = st; go('interlude'); }, { primary: true }),
        button('Try a different route', startRound1, { ghost: true })
      ];
  return pageEl('debrief', null, [
    runhead('Debrief · ' + roundLabel(st), null),
    h('div', { class: 'narrow' }, [
      h('h1', { text: 'Your path through ' + ROUND_LABELS[st.round] }),
      h('div', { class: 'ending-card' }, [h('h2', { text: ending.title }), h('p', { text: ending.text })]),
      isR2 ? h('p', { style: 'margin-top:16px;font-weight:700', 'data-recognition': named + '/' + st.history.length, text: 'You named the lever correctly ' + named + ' of ' + st.history.length + ' times.' }) : null,
      h('p', { class: 'muted', style: 'margin-top:16px', text: 'This is a short version of the debrief: each decision, what Maya said, and the trade-off it carried.' }),
      h('ol', { class: 'path' }, items),
      h('div', { class: 'actions' }, actions)
    ])
  ]);
}

function screenInterlude() {
  const r1 = view.r1;
  const r2 = MAYA.rounds.r2;
  return pageEl('interlude', null, [
    runhead('Interlude', null),
    h('div', { class: 'narrow interlude-inner' }, [
      h('p', { class: 'eyebrow', text: 'Round 1 ended: ' + MAYA.rounds.r1.endings[r1.ending].title }),
      h('h1', { class: 'interlude-title', text: 'Two weeks later' }),
      h('p', { class: 'interlude-text', text: r2.interlude[r1.ending] }),
      h('div', { class: 'actions' }, [button('Begin Round 2', startRound2, { primary: true, dest: '→ p. ' + r2.nodes[r2.starts[r1.ending]].page })])
    ])
  ]);
}

const SCREENS = {
  cover: screenCover, how: screenHow, referral: screenReferral, scene: screenScene,
  consequence: screenConsequence, act: screenAct, ending: screenEnding,
  debrief: screenDebrief, interlude: screenInterlude
};

// ---------------------------------------------------------------------------
// Keyboard (SPEC.md 15): 1-4 select a lever or line, Enter confirms, Escape
// goes back. A mouse click selects and confirms in one go.

document.addEventListener('keydown', function (e) {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const page = root.querySelector('.page');
  if (!page) return;
  if (/^[1-4]$/.test(e.key)) {
    const b = page.querySelector('[data-key="' + e.key + '"]');
    if (!b) return;
    e.preventDefault();
    page.querySelectorAll('.is-selected').forEach(function (x) { x.classList.remove('is-selected'); });
    b.classList.add('is-selected');
    b.focus();
  } else if (e.key === 'Enter') {
    const a = document.activeElement;
    if (a && a.tagName === 'BUTTON') return; // the button activates itself
    const target = page.querySelector('.is-selected') || page.querySelector('[data-primary]');
    if (target) { e.preventDefault(); target.click(); }
  } else if (e.key === 'Escape') {
    const back = page.querySelector('[data-back]');
    if (back) { e.preventDefault(); back.click(); }
  }
});

root.replaceChildren();
render({});
