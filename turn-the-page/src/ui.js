// Turn the Page — interface (SPEC.md sections 8, 13, 14.4 and 15).
//
// Screens: Cover, How it works, Referral note, Scene (Round 1 two-step choice
// or Round 2 choice plus Name that lever), Consequence (with the Round 2
// reveal), Act banner, Ending, Interlude, Debrief 1 and Debrief 2 (SPEC.md
// 10). Uses the engine, art and content names from the same
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
// Wording quality as shown in the debrief (Round 1 only; SPEC.md 10.1).
const QUALITY_LABELS = { skilful: 'Skilful wording', plausible: 'Plausible wording', clumsy: 'Clumsy wording' };
const SCREEN_NAMES = ['cover', 'how', 'referral', 'scene', 'consequence', 'act', 'ending', 'debrief', 'interlude'];

// ---------------------------------------------------------------------------
// DOM helpers.

// Typographic quotes for display (presentation only: the content keeps
// straight quotes, CLAUDE.md). An apostrophe or closing quote follows a
// letter, digit or punctuation; an opening quote starts a word.
function typo(t) {
  return String(t)
    .replace(/(^|[\s(\[—–-])"/g, '$1“').replace(/"/g, '”')
    .replace(/(^|[\s(\[—–-])'/g, '$1‘').replace(/'/g, '’');
}

// Wrap a spoken line in double quotes; quotes inside it become single.
function quoted(t) {
  return '“' + typo(t).replace(/“/g, '‘').replace(/”/g, '’') + '”';
}

function h(tag, props, kids) {
  const e = document.createElement(tag);
  if (props) {
    Object.keys(props).forEach(function (k) {
      const v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = typo(v);
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
  consequence: [['square', 'challenge', 'width:300px;height:300px;right:-150px;bottom:-130px'], ['ring', 'question', 'width:260px;height:260px;right:-120px;top:38%;border-width:44px']],
  act: [['circle', 'support', 'width:360px;height:360px;right:-140px;bottom:-140px'], ['square', 'challenge', 'width:200px;height:200px;left:-80px;bottom:8%']],
  ending: [['ring', 'observe', 'width:460px;height:460px;left:-200px;top:-160px;border-width:70px'], ['triangle', 'support', 'width:320px;height:280px;right:-110px;bottom:-80px']],
  debrief: [['square', 'challenge', 'width:260px;height:260px;right:-120px;top:120px'], ['circle', 'question', 'width:340px;height:340px;left:-180px;bottom:-120px']],
  interlude: [['circle', 'support', 'width:480px;height:480px;right:-200px;top:-140px'], ['triangle', 'observe', 'width:280px;height:240px;left:-100px;bottom:-60px'], ['square', 'question', 'width:140px;height:140px;right:20%;bottom:-60px']]
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
// Shown only in print, on screens other than the debriefs (style.css).
document.body.appendChild(h('p', { class: 'print-note', text: 'Turn the Page prints from the debrief pages only. Finish a round and open its debrief to print your path.' }));
const live = h('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true', id: 'meter-announcer' });
document.body.appendChild(live);

const view = { screen: 'cover', state: null, r1: null, lever: null, picked: null, seed: null };
let resumeData = null;
// Bridging lines (SPEC.md 9.5) are chosen by the choice just made in this
// sitting. False after a reload or Resume and at a round start, so the page
// then shows its default line, cue or ending text. Never saved.
let bridgeLive = false;

// The text to show for a page's line or cue, or an ending's text: a string,
// or { default, from: { 'previousNodeId:optionId': text } }.
function bridged(x, st) {
  if (!x || typeof x === 'string') return x || '';
  const last = st && st.history[st.history.length - 1];
  if (bridgeLive && last && x.from) {
    const v = x.from[last.nodeId + ':' + last.optionId];
    if (v) return v;
  }
  return x.default;
}
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

// Destination pages for a set of options (SPEC.md 11.3): each option turns
// to its own reply page (the option's `page`), so every fork shows a
// different number. A lever card lists its three wordings' pages in
// ascending order ('→ p. 13, 46 or 112'), so the numbers never give away
// which one is skilful.
function destLabel(options) {
  const pages = options.map(function (o) { return o.page; }).sort(function (a, b) { return a - b; });
  return '→ p. ' + (pages.length > 1 ? pages.slice(0, -1).join(', ') + ' or ' + pages[pages.length - 1] : pages[0]);
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
// Scene (SPEC.md 12). art.js draws the office and Maya. On a scene page the
// page's pose hints override the posture. On a consequence page the chosen
// option's pose hints (what her reaction describes) override the posture
// from the meters after the choice; the page's props stay unless the option
// sets its own. Between two pictures in the same round the
// pose interpolates over 0.4s, or changes at once under reduced motion.

const POSE_TWEEN_MS = 400;
let lastArt = null; // { round, vec } of the last picture drawn

function sceneView(st, node, consequence) {
  const pagePose = (node.scene || {}).pose || {};
  const pose = consequence ? (consequence.pose || {}) : pagePose;
  const art = renderScene({
    meters: st.meters,
    poseBias: MAYA.profile.poseBias,
    pose: pose,
    props: pose.props || pagePose.props || [],
    round: st.round,
    step: st.history.length
  });
  const holder = h('div', { class: 'scene-art', role: 'img', 'aria-label': art.alt, html: art.svg });
  const fig = h('figure', { class: 'scene-area scene-frame', 'data-posture': art.posture }, [holder]);
  Object.keys(art.pose).forEach(function (k) { fig.setAttribute('data-' + k, art.pose[k]); });
  const from = lastArt && lastArt.round === st.round ? lastArt.vec : null;
  lastArt = { round: st.round, vec: art.vec };
  if (from && !reducedMotion()) tweenScene(holder, from, art.vec);
  return fig;
}

function tweenScene(holder, from, to) {
  let start = null;
  holder.setAttribute('data-tweening', '');
  holder.innerHTML = drawScene(from);
  function frame(now) {
    if (!holder.isConnected && start !== null) return;
    if (start === null) start = now;
    const t = Math.min(1, (now - start) / POSE_TWEEN_MS);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease in and out
    holder.innerHTML = drawScene(lerpScene(from, to, e));
    if (t < 1) window.requestAnimationFrame(frame);
    else holder.removeAttribute('data-tweening');
  }
  window.requestAnimationFrame(frame);
}

function storyHead(node) {
  return [
    h('p', { class: 'speaker', text: MAYA.profile.name }),
    h('p', { class: 'maya-line', text: quoted(bridged(node.line, view.state)) }),
    node.cue ? h('p', { class: 'cue', text: bridged(node.cue, view.state) }) : null
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
  bridgeLive = false;
  view.r1 = null;
  view.lever = null;
  view.picked = null;
  go(view.state.ending ? 'ending' : 'scene');
}

function startRound2() {
  view.seed = newSeed();
  view.state = createRound(MAYA, 'r2', carryOver(view.r1), view.seed);
  bridgeLive = false;
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
      h('span', { class: 'quote', text: quoted(o.text) }),
      h('span', { class: 'dest', text: destLabel([o]) })
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
          dest: function (lever) { return destLabel(node.options.filter(function (o) { return o.lever === lever; })); }
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
    h('p', { class: 'picked-line', text: quoted(picked.text) }),
    h('p', { class: 'eyebrow', id: 'choice-prompt', text: 'Name that lever: which lever does this line use?' }),
    leverButtons(function (lever) { commit(view.picked, lever); }, { compact: true, attr: 'guess' })
  ]);
}

function commit(optionId, guess) {
  view.state = applyChoice(view.state, optionId, guess);
  bridgeLive = true;
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
    h('h1', { class: 'sr-only', text: ROUND_LABELS[st.round] + ', page ' + node.page }),
    h('div', { class: 'spread', 'data-node': st.nodeId }, [
      metersView(st.meters, null),
      sceneView(st, node, false),
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
    runhead(roundLabel(st) + ' · Act ' + node.act + ': ' + round.acts[node.act].title, option.page),
    h('h1', { class: 'sr-only', text: ROUND_LABELS[st.round] + ', page ' + option.page + ': what happened' }),
    h('div', { class: 'spread', 'data-node': entry.nodeId }, [
      metersView(st.meters, { before: before, lever: entry.lever, animate: !!opts.animate && !reducedMotion() }),
      sceneView(st, node, option),
      h('div', { class: 'story-col' }, [
        h('p', { class: 'eyebrow', text: 'You said' }, []),
        h('p', { class: 'you-said', text: quoted(option.text) }),
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
      h('div', { class: 'slab', 'aria-hidden': 'true' }, [h('span', { class: 'act-no', text: String(act) })]),
      h('div', { class: 'banner-body' }, [
        h('h1', { class: 'tag', text: 'End of Act ' + act + ' · ' + round.acts[act].title }),
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
        h('p', { class: 'ending-text', text: bridged(ending.text, st) }),
        h('div', { class: 'actions' }, [button('See your path', function () { go('debrief'); }, { primary: true })])
      ])
    ])
  ]);
}

// ---------------------------------------------------------------------------
// Debriefs (SPEC.md 10). Debrief 1 follows Round 1; Debrief 2 follows Round 2
// and adds lever recognition, both sessions side by side, reflection prompts
// and Copy summary. Everything is derived from the engine history and the
// authored content: no scoring happens here.

const TRAIT_INFO = {
  confidence: { name: 'Self-confidence', changes: 'How much Support is needed before Challenge lands' },
  extraversion: { name: 'Extraversion', changes: 'How much an open Question yields; how visible cues are for Observe' },
  defensiveness: { name: 'Defensiveness', changes: 'How strongly Challenge and Observe cost Trust' },
  readiness: { name: 'Readiness for change', changes: 'How fast Ownership can rise' }
};
const BAND_WORDS = { low: 'Low', mid: 'Mid', high: 'High' };

// Reference lines on the meter traces: the ending thresholds from RULES.
function traceLines(meter) {
  const E = RULES.endings;
  if (meter === 'trust') return [{ y: E.breakthrough.trustAtLeast, label: 'Breakthrough or agreement' }, { y: E.early.trustAtMost, label: 'Early exit' }];
  if (meter === 'ownership') return [{ y: E.highOwnership.ownershipAtLeast, label: 'Breakthrough at lower trust' }, { y: E.breakthrough.ownershipAtLeast, label: 'Breakthrough' }, { y: E.partial.ownershipAtLeast, label: 'Agreement' }];
  return [];
}

// A lever glyph drawn in SVG at (x, y): lever colour with an ink outline, so
// it reads on paper even where the colour alone would not (ochre).
function glyphMark(lever, x, y, r) {
  const o = ' class="mk mk-' + lever + '"';
  if (lever === 'question') return '<circle' + o + ' cx="' + x + '" cy="' + y + '" r="' + r + '"/>';
  if (lever === 'support') return '<rect' + o + ' x="' + (x - r * 0.9) + '" y="' + (y - r * 0.9) + '" width="' + (r * 1.8) + '" height="' + (r * 1.8) + '"/>';
  if (lever === 'observe') return '<circle' + o + ' cx="' + x + '" cy="' + y + '" r="' + r + '"/><circle class="mk-hole" cx="' + x + '" cy="' + y + '" r="' + (r * 0.55) + '"/><circle class="mk-dot" cx="' + x + '" cy="' + y + '" r="' + (r * 0.28) + '"/>';
  return '<polygon' + o + ' points="' + x + ',' + (y - r * 1.15) + ' ' + (x + r * 1.1) + ',' + (y + r * 0.85) + ' ' + (x - r * 1.1) + ',' + (y + r * 0.85) + '"/>';
}

function esc(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function changeWords(m, d) {
  if (!d) return METER_INFO[m].name + ' held';
  const size = Math.abs(d) <= CHANGE_WORDS.little ? ' a little' : Math.abs(d) >= CHANGE_WORDS.lot ? ' a lot' : '';
  return METER_INFO[m].name + (d > 0 ? ' rose' : ' fell') + size;
}

function startMeters(st) {
  const e = st.history[0];
  const out = {};
  RULES.meters.forEach(function (m) { out[m] = e ? e.meters[m] - e.deltas[m] : st.meters[m]; });
  return out;
}

// Turning points: the authored ones this path reached (SPEC.md 14.2), topped
// up with the decisions that moved the meters most when the round ended
// before reaching them.
function turningIndexes(st) {
  const authored = (MAYA.turningPoints[st.round] || []);
  const idx = [];
  st.history.forEach(function (e, i) { if (authored.indexOf(e.nodeId) >= 0) idx.push(i); });
  const swing = function (e) { return RULES.meters.reduce(function (a, m) { return a + Math.abs(e.deltas[m]); }, 0); };
  const rest = st.history.map(function (e, i) { return i; }).filter(function (i) { return idx.indexOf(i) < 0; })
    .sort(function (a, b) { return swing(st.history[b]) - swing(st.history[a]) || a - b; });
  while (idx.length < Math.min(2, st.history.length)) idx.push(rest.shift());
  return idx.sort(function (a, b) { return a - b; });
}

// One meter trace: an SVG line chart across the decisions, with a marker in
// each choice's lever colour and glyph. `series` is a list of segments
// [{ label, start, history, turning }]; two segments (Debrief 2) are drawn
// side by side with a break for the two weeks between them.
function traceChart(meter, series, opts) {
  opts = opts || {};
  const W = 320, H = 150, padL = 8, padR = 8, padT = 12, padB = 22, gapW = series.length > 1 ? 26 : 0;
  const steps = series.reduce(function (a, s) { return a + s.history.length; }, 0);
  const unit = (W - padL - padR - gapW * (series.length - 1)) / Math.max(1, steps + series.length - 1);
  const yOf = function (v) { return padT + (H - padT - padB) * (1 - v / 100); };
  let out = '';
  const labels = []; // drawn over the line, under the markers
  // Plot area, reference lines and labels.
  out += '<rect class="tr-bg" x="' + padL + '" y="' + padT + '" width="' + (W - padL - padR) + '" height="' + (H - padT - padB) + '"/>';
  traceLines(meter).forEach(function (l) {
    out += '<line class="tr-ref" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + yOf(l.y) + '" y2="' + yOf(l.y) + '"/>';
    // Two rounds side by side leave no room for labels: the caption names the lines instead.
    if (series.length === 1) labels.push('<text class="tr-ref-label" x="' + (padL + 4) + '" y="' + (yOf(l.y) - 3) + '">' + esc(l.label) + '</text>');
  });
  let x0 = padL;
  const marks = [];
  series.forEach(function (s, si) {
    const pts = [[x0, yOf(s.start[meter])]];
    s.history.forEach(function (e, i) { pts.push([x0 + unit * (i + 1), yOf(e.meters[meter])]); });
    (s.turning || []).forEach(function (i) {
      const bw = Math.min(unit * 0.8, 22);
      const bx = Math.max(padL, x0 + unit * (i + 1) - bw / 2);
      const bx2 = Math.min(W - padR, x0 + unit * (i + 1) + bw / 2);
      out += '<rect class="tr-turn" x="' + bx.toFixed(1) + '" y="' + padT + '" width="' + (bx2 - bx).toFixed(1) + '" height="' + (H - padT - padB) + '"/>';
    });
    out += '<polyline class="tr-line" points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>';
    out += '<rect class="tr-start" x="' + (pts[0][0] - 3) + '" y="' + (pts[0][1] - 3) + '" width="6" height="6"><title>' + esc(s.label + ': start') + '</title></rect>';
    s.history.forEach(function (e, i) {
      const node = MAYA.rounds[s.round].nodes[e.nodeId];
      marks.push('<g class="tr-mark">' + glyphMark(e.lever, +pts[i + 1][0].toFixed(1), +pts[i + 1][1].toFixed(1), 5.5) +
        '<title>' + esc(s.label + ', p. ' + node.page + ': ' + LEVER_INFO[e.lever].name + '. ' + changeWords(meter, e.deltas[meter]) + '.') + '</title></g>');
    });
    out += '<text class="tr-axis" x="' + x0 + '" y="' + (H - 6) + '">' + esc(s.label) + '</text>';
    x0 += unit * s.history.length;
    if (si < series.length - 1) {
      out += '<line class="tr-break" x1="' + (x0 + gapW / 2 + unit / 2) + '" x2="' + (x0 + gapW / 2 + unit / 2) + '" y1="' + padT + '" y2="' + (H - padB) + '"/>';
      x0 += gapW + unit;
    }
  });
  out += labels.join('') + marks.join('');
  const first = series[0].start[meter];
  const lastS = series[series.length - 1];
  const last = lastS.history.length ? lastS.history[lastS.history.length - 1].meters[meter] : lastS.start[meter];
  const label = METER_INFO[meter].name + ': started ' + LEVEL_WORDS[segCount(first)] + ', ended ' + LEVEL_WORDS[segCount(last)] + '.';
  return h('figure', { class: 'trace', 'data-trace': meter }, [
    h('figcaption', {}, [h('span', { class: 'trace-name', text: METER_INFO[meter].name }), h('span', { class: 'trace-end', text: 'ends ' + LEVEL_WORDS[segCount(last)] })]),
    h('div', { role: 'img', 'aria-label': label, html: '<svg viewBox="0 0 ' + W + ' ' + H + '" focusable="false">' + out + '</svg>' })
  ]);
}

function tracesView(series) {
  return h('div', { class: 'traces' }, RULES.meters.map(function (m) { return traceChart(m, series); }));
}

function traceKey() {
  return h('p', { class: 'trace-key' }, RULES.levers.map(function (l) { return leverTag(l); }).concat([
    h('span', { class: 'key-item' }, [h('span', { class: 'key-swatch key-turn', 'aria-hidden': 'true' }), 'Turning point']),
    h('span', { class: 'key-item' }, [h('span', { class: 'key-swatch key-ref', 'aria-hidden': 'true' }), 'Ending threshold'])
  ]));
}

function section(id, title, kids, intro) {
  return h('section', { class: 'db-section', 'data-section': id, 'aria-labelledby': 'db-' + id }, [
    h('h2', { id: 'db-' + id, text: title }),
    intro ? h('p', { class: 'db-intro', text: intro }) : null
  ].concat(kids));
}

function leverStats(st) {
  const out = {};
  RULES.levers.forEach(function (l) { out[l] = { n: 0 }; RULES.qualities.forEach(function (q) { out[l][q] = 0; }); });
  st.history.forEach(function (e) {
    out[e.lever].n += 1;
    if (e.quality) out[e.lever][e.quality] += 1;
  });
  return out;
}

// Wording quality counts for a format B round, e.g. { skilful: 3, plausible: 2, clumsy: 2 }.
function wordingCounts(st) {
  const out = {};
  RULES.qualities.forEach(function (q) { out[q] = st.history.filter(function (e) { return e.quality === q; }).length; });
  return out;
}

// 'Wording over 7 decisions: 3 skilful, 2 plausible, 2 clumsy' (debrief and Copy summary).
function wordingLine(st) {
  const c = wordingCounts(st);
  return 'Wording over ' + st.history.length + ' decision' + (st.history.length === 1 ? '' : 's') + ': ' + RULES.qualities.map(function (q) { return c[q] + ' ' + q; }).join(', ');
}

function leverCountsView(st) {
  const stats = leverStats(st);
  const isB = MAYA.rounds[st.round].format === 'B';
  const wc = wordingCounts(st);
  // Count blocks (SPEC.md 10.1): filled = skilful, lower half = plausible,
  // hollow = clumsy, each with an ink edge; the key names all three.
  const block = function (lever, quality) { return h('span', { class: 'cb lv-' + lever + (quality ? ' cb-' + quality : '') }); };
  const rows = RULES.levers.map(function (l) {
    const s = stats[l];
    const blocks = h('span', { class: 'count-blocks', 'aria-hidden': 'true' }, st.history.filter(function (e) { return e.lever === l; }).map(function (e) {
      return block(l, e.quality);
    }));
    return h('li', { class: 'count-row', 'data-lever-count': l + ':' + s.n }, [
      leverTag(l),
      blocks,
      h('span', { class: 'count-n', text: s.n === 1 ? 'once' : s.n === 0 ? 'not used' : s.n + ' times' }),
      isB && s.n ? h('span', { class: 'count-q', text: RULES.qualities.map(function (q) { return s[q] + ' ' + q; }).join(' · ') }) : null
    ]);
  });
  return [
    h('ul', { class: 'counts' }, rows),
    isB ? h('ul', { class: 'cb-key', 'aria-label': 'Key to the blocks' }, RULES.qualities.map(function (q) {
      return h('li', {}, [block('key', q), h('span', { text: QUALITY_LABELS[q] })]);
    })) : null,
    isB ? h('p', { class: 'count-total', 'data-wording': RULES.qualities.map(function (q) { return wc[q]; }).join('/') + '/' + st.history.length }, [
      h('strong', { text: wordingLine(st) + '. ' }),
      'Plausible wordings sounded reasonable but missed the moment: a little early, slightly leading, or reassuring before she had said anything. Clumsy wordings were leading, closed, judgemental, premature or rescuing. Both kept less of the lever\'s gain; clumsy ones cost more trust.'
    ]) : null
  ];
}

function meterChips(e) {
  return h('span', { class: 'chips' }, RULES.meters.map(function (m) {
    const d = e.deltas[m];
    return h('span', { class: 'chip' + (d > 0 ? ' up' : d < 0 ? ' down' : '') }, [h('span', { 'aria-hidden': 'true', text: d > 0 ? '▲ ' : d < 0 ? '▼ ' : '– ' }), changeWords(m, d)]);
  }));
}

function pathReplay(st, turning) {
  const round = MAYA.rounds[st.round];
  const isC = round.format === 'C';
  return h('ol', { class: 'path' }, st.history.map(function (e, i) {
    const node = round.nodes[e.nodeId];
    const option = node.options.find(function (o) { return o.id === e.optionId; });
    const isTurn = turning.indexOf(i) >= 0;
    return h('li', { class: 'lv-' + e.lever + (isTurn ? ' turning' : ''), 'data-turning': isTurn ? 'yes' : null, id: 'replay-' + st.round + '-' + i }, [
      isTurn ? h('p', { class: 'turn-flag', text: 'Turning point' }) : null,
      h('div', { class: 'path-head' }, [
        h('span', { class: 'pageno', text: 'p. ' + node.page }),
        leverTag(e.lever),
        e.quality ? h('span', { class: 'quality q-' + e.quality, text: QUALITY_LABELS[e.quality] }) : null,
        isC ? h('span', { class: 'muted' }, e.guessCorrect ? ['✓ You named it'] : ['✗ You named ', leverTag(e.guess)]) : null
      ]),
      h('p', { class: 'said', text: quoted(option.text) }),
      h('p', { class: 'reacted', text: e.reaction }),
      meterChips(e),
      h('p', { class: 'note', text: option.debrief })
    ]);
  }));
}

function roadNotTakenView(st) {
  const ids = MAYA.turningPoints[st.round] || [];
  const round = MAYA.rounds[st.round];
  return h('div', { class: 'roads' }, ids.map(function (id) {
    const node = round.nodes[id];
    const lines = MAYA.roadNotTaken[id] || {};
    const entry = st.history.find(function (e) { return e.nodeId === id; });
    const others = RULES.levers.filter(function (l) { return lines[l] && (!entry || entry.lever !== l); });
    return h('article', { class: 'road', 'data-road': id }, [
      h('p', { class: 'road-head' }, [h('span', { class: 'pageno', text: 'p. ' + node.page }), h('span', { text: entry ? 'You used ' : 'You did not reach this page.' }), entry ? leverTag(entry.lever) : null]),
      h('p', { class: 'road-line', text: quoted(bridged(node.line, null)) }),
      h('ul', {}, others.map(function (l) { return h('li', {}, [leverTag(l), h('span', { text: lines[l] })]); }))
    ]);
  }));
}

// Where each trait showed on this path: a trait multiplier or cap in the
// engine's trace, or a reaction written for that trait band.
function traitMoments(st, trait) {
  const round = MAYA.rounds[st.round];
  const out = [];
  st.history.forEach(function (e) {
    const node = round.nodes[e.nodeId];
    const option = node.options.find(function (o) { return o.id === e.optionId; });
    const why = [];
    (e.trace || []).forEach(function (t) {
      const p = t.split(':');
      if (p[0] === 'trait' && p[1] === trait) {
        const rule = RULES.traitMultipliers.find(function (r) { return r.trait === p[1] && r.band === p[2] && r.meter === p[3] && r.lever === e.lever; });
        if (!rule) return;
        const more = rule.factor > 1;
        why.push(rule.sign === 'gain'
          ? LEVER_INFO[e.lever].name + ' raised ' + METER_INFO[rule.meter].name.toLowerCase() + (more ? ' more' : ' less') + ' than usual'
          : LEVER_INFO[e.lever].name + ' cost ' + (more ? 'more ' : 'less ') + METER_INFO[rule.meter].name.toLowerCase() + ' than usual');
      }
      if (p[0] === 'cap' && p[1] === trait) why.push(METER_INFO[p[2]].name + ' could not rise further this early in the conversation');
    });
    const r = option.reaction;
    if (r && typeof r === 'object' && r[trait + ':' + st.traits[trait]]) why.push('her reaction showed it');
    if (why.length) out.push({ e: e, node: node, why: why });
  });
  return out;
}

function meetMayaView(st) {
  const r1Traits = MAYA.profile.traits;
  return h('div', { class: 'traits' }, Object.keys(TRAIT_INFO).map(function (t) {
    const band = st.traits[t];
    const rose = r1Traits[t] !== band;
    const hint = (MAYA.referral.hints || []).find(function (x) { return x.trait === t; });
    const moments = traitMoments(st, t);
    return h('article', { class: 'trait', 'data-trait': t + ':' + band }, [
      h('div', { class: 'trait-head' }, [
        h('h3', { text: TRAIT_INFO[t].name }),
        h('span', { class: 'band band-' + band, text: BAND_WORDS[band] + (rose ? ' (rose from ' + BAND_WORDS[r1Traits[t]].toLowerCase() + ' after Round 1)' : '') })
      ]),
      h('p', { class: 'trait-changes', text: TRAIT_INFO[t].changes + '.' }),
      hint ? h('div', { class: 'hint' }, [
        h('p', { class: 'hint-label', text: 'In the referral note' }),
        h('blockquote', { class: 'hint-quote', text: hint.text }),
        h('p', { class: 'hint-note', text: hint.note })
      ]) : null,
      h('p', { class: 'hint-label', text: 'Where it showed on your path' }),
      moments.length
        ? h('ul', { class: 'moments' }, moments.map(function (m) {
            return h('li', {}, [h('a', { href: '#replay-' + st.round + '-' + st.history.indexOf(m.e), class: 'pageno', text: 'p. ' + m.node.page }), leverTag(m.e.lever), h('span', { text: m.why.join('; ') + '.' })]);
          }))
        : h('p', { class: 'muted moments-none', text: band === 'mid' ? 'A mid band does not change the numbers, and no reaction on this path was written for it.' : 'It did not change the numbers or her reactions on this path.' })
    ]);
  }));
}

function recognitionView(st) {
  const round = MAYA.rounds[st.round];
  const named = st.history.filter(function (e) { return e.guessCorrect; }).length;
  const misses = st.history.filter(function (e) { return !e.guessCorrect; });
  return [
    h('p', { class: 'recognition', 'data-recognition': named + '/' + st.history.length, text: 'You named the lever correctly ' + named + ' of ' + st.history.length + ' times.' }),
    misses.length ? h('ul', { class: 'misses' }, misses.map(function (e) {
      const node = round.nodes[e.nodeId];
      const option = node.options.find(function (o) { return o.id === e.optionId; });
      return h('li', {}, [
        h('p', { class: 'said', text: quoted(option.text) }),
        h('p', { class: 'miss-line' }, [h('span', { class: 'pageno', text: 'p. ' + node.page }), h('span', {}, ['You named ', leverTag(e.guess), '.']), h('span', {}, ['It used ', leverTag(e.lever), '.'])])
      ]);
    })) : h('p', { class: 'muted', text: 'No misses.' })
  ];
}

function sessionCard(st) {
  const round = MAYA.rounds[st.round];
  const ending = round.endings[st.ending];
  return h('article', { class: 'session-card', 'data-session': st.round }, [
    h('p', { class: 'eyebrow', text: ROUND_LABELS[st.round] + ' · ' + round.title }),
    h('h3', { text: ending.title }),
    h('p', { class: 'session-summary', text: ending.summary }),
    h('p', { class: 'glyph-strip', role: 'img', 'aria-label': 'Levers in order: ' + st.history.map(function (e) { return LEVER_INFO[e.lever].name; }).join(', ') }, st.history.map(function (e) {
      return h('span', { 'aria-hidden': 'true', title: LEVER_INFO[e.lever].name, html: '<svg viewBox="0 0 20 20" focusable="false">' + glyphMark(e.lever, 10, 10, 7) + '</svg>' });
    }))
  ]);
}

function summaryText(r1, r2) {
  const lines = ['Turn the Page — summary', ''];
  [r1, r2].forEach(function (st) {
    if (!st) return;
    const round = MAYA.rounds[st.round];
    const stats = leverStats(st);
    lines.push(ROUND_LABELS[st.round] + ' (' + round.title + '): ' + round.endings[st.ending].title);
    lines.push('  Levers: ' + RULES.levers.map(function (l) { return LEVER_INFO[l].name + ' ' + stats[l].n; }).join(', '));
    lines.push('  Order: ' + st.history.map(function (e) { return LEVER_INFO[e.lever].name; }).join(' → '));
    if (round.format === 'B') lines.push('  ' + wordingLine(st));
    if (round.format === 'C') lines.push('  Lever recognition: ' + st.history.filter(function (e) { return e.guessCorrect; }).length + ' of ' + st.history.length);
  });
  return lines.join('\n');
}

function copySummaryView(text) {
  const status = h('span', { class: 'copy-status', role: 'status', 'aria-live': 'polite' });
  const area = h('textarea', { class: 'summary-text', readonly: true, rows: String(text.split('\n').length + 1), 'aria-label': 'Summary text', spellcheck: 'false' });
  area.value = text;
  function fallback() {
    area.focus();
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    status.textContent = ok ? 'Copied.' : 'Selected: press Ctrl+C or Cmd+C to copy.';
  }
  const btn = button('Copy summary', function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { status.textContent = 'Copied.'; }, fallback);
    } else {
      fallback();
    }
  }, { ghost: true, action: 'copy-summary' });
  return [area, h('div', { class: 'actions copy-row' }, [btn, status])];
}

function screenDebrief() {
  const st = view.state;
  const round = currentRound();
  const ending = round.endings[st.ending];
  const isR2 = st.round === 'r2';
  const r1 = isR2 && view.r1 && view.r1.ending ? view.r1 : null;
  const turning = turningIndexes(st);
  const series = [{ round: st.round, label: ROUND_LABELS[st.round], start: startMeters(st), history: st.history, turning: turning }];

  const kids = [
    h('p', { class: 'eyebrow', text: isR2 ? 'Debrief 2: both sessions' : 'Debrief 1' }),
    h('h1', { class: 'db-title', text: 'Your path through ' + ROUND_LABELS[st.round] }),
    h('div', { class: 'ending-card', 'data-ending-card': st.ending }, [
      h('p', { class: 'eyebrow', text: 'Ending' }),
      h('h2', { text: ending.title }),
      h('p', { text: ending.summary }),
      // A Polite exit with Breakthrough-level ownership: say why it was not one.
      st.ending === 'polite' && ending.ownershipNote && st.meters.ownership >= RULES.endings.breakthrough.ownershipAtLeast
        ? h('p', { class: 'ending-note', 'data-ownership-note': true, text: ending.ownershipNote }) : null
    ]),
    section('traces', 'Meter traces', [traceKey(), tracesView(series)], 'How each meter moved, decision by decision. Each marker is the lever you used; shaded columns are the turning points.'),
    section('levers', 'Your levers', leverCountsView(st))
  ];
  if (isR2) kids.push(section('recognition', 'Lever recognition', recognitionView(st)));
  kids.push(
    section('path', 'Path replay', [pathReplay(st, turning)], 'Each decision: what you said, how Maya reacted, how the meters moved, and the trade-off it carried. The two turning points are marked.'),
    section('road', 'Road not taken', [roadNotTakenView(st)], 'At the two turning points, what the other levers tended to do there. These lines are written in advance, not simulated.'),
    section('maya', 'Meet Maya', [meetMayaView(st)], 'Her trait profile, hidden during play: what each trait changes, the hint in Mr Okafor\'s referral note, and where it showed on your path.')
  );
  if (r1) {
    const r1Series = { round: 'r1', label: 'Round 1', start: startMeters(r1), history: r1.history, turning: turningIndexes(r1) };
    kids.push(
      section('sessions', 'Two sessions side by side', [
        h('div', { class: 'session-cards' }, [sessionCard(r1), sessionCard(st)]),
        h('div', { class: 'carry' }, [
          h('p', { class: 'hint-label', text: 'How Round 1 shaped Round 2' }),
          h('p', { class: 'carry-note', text: MAYA.rounds.r2.carryNote[r1.ending] })
        ]),
        traceKey(),
        tracesView([r1Series, series[0]]),
        h('p', { class: 'muted trace-lines-note', text: 'Dashed lines: on Trust, the level for a Breakthrough or agreement (upper) and for an early exit (lower); on Ownership, the level for a Breakthrough even at lower trust (top), for a Breakthrough (middle) and for agreement (bottom). The dotted line marks the two weeks between sessions.' })
      ]),
      section('reflect', 'Reflection prompts', [h('ol', { class: 'reflection' }, MAYA.reflection.map(function (q) { return h('li', { text: q }); }))], 'For self-study or with your facilitator. Nothing you think or write here is stored.'),
      section('copy', 'Copy summary', copySummaryView(summaryText(r1, st)), 'Plain text of the endings, lever counts and recognition score, for pasting into a shared document. No names or free text.')
    );
  }
  const actions = isR2
    ? [
        button('Replay Round 2', function () { go('interlude'); }, { primary: true }),
        button('Start again', function () { store.clear(); resumeData = null; Object.assign(view, { state: null, r1: null, lever: null, picked: null }); go('cover'); }, { ghost: true })
      ]
    : [
        button('Continue to Round 2', function () { view.r1 = st; go('interlude'); }, { primary: true }),
        button('Try a different route', startRound1, { ghost: true })
      ];
  actions.push(button('Print this debrief', function () { window.print(); }, { ghost: true, action: 'print' }));
  kids.push(section('next', isR2 ? 'What next' : 'Try again', [h('div', { class: 'actions' }, actions)]));
  return pageEl('debrief', null, [
    runhead('Debrief · ' + roundLabel(st), null),
    h('div', { class: 'debrief', 'data-debrief': isR2 ? '2' : '1' }, kids)
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
