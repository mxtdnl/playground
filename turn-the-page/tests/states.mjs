// Screen-state catalogue for the browser harnesses (contrast.mjs,
// a11y.test.mjs). Every screen in SPEC.md 13 in every state that changes what
// is drawn: both choice formats before and after selection, every lever
// revealed, every act banner, every ending, every interlude, both debriefs.
//
// A state is reached by writing a save (the same JSON the page writes under
// turn-the-page:maya:v1), reloading and pressing Resume, then running any
// extra keyboard or mouse steps. Engine states come from the engine itself,
// so the catalogue follows the content when it changes.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RULES, createRound, applyChoice, carryOver, getNode, optionsFor } from '../src/engine.js';
import { MAYA } from '../src/content/maya.js';

const here = dirname(fileURLToPath(import.meta.url));
export const PAGE_URL = pathToFileURL(join(here, '..', 'index.html')).href + '?seed=7';
export const STORE_KEY = 'turn-the-page:maya:v1';
export const ENDINGS = ['breakthrough', 'partial', 'polite', 'early'];
export const LEVERS = RULES.levers;

export function loadChromium() {
  try {
    return createRequire(import.meta.url)('playwright').chromium; // resolves via NODE_PATH
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fixed paths from the engine (as in ui.test.mjs).

// Early exit: Challenges and clumsy wordings first. Other endings: a fixed
// pattern of preferred wording quality per decision (Round 1), so the paths and
// their debriefs show skilful, plausible and clumsy wordings (SPEC.md 10.1).
const QUALITY_PATTERN = ['skilful', 'plausible', 'skilful', 'clumsy', 'skilful', 'skilful', 'plausible'];
function orderFor(options, target, depth) {
  if (target === 'early') {
    const score = (o) => (o.lever === 'challenge' ? 0 : 2) + (o.quality === 'clumsy' ? 0 : 1);
    return options.slice().sort((a, b) => score(a) - score(b));
  }
  const want = QUALITY_PATTERN[(depth || 0) % QUALITY_PATTERN.length];
  return options.filter((o) => o.quality === want).concat(options.filter((o) => o.quality !== want));
}

export function findPath(state, target) {
  if (state.ending) return state.ending === target ? [] : null;
  for (const o of orderFor(getNode(state).options, target, state.history.length)) {
    const rest = findPath(applyChoice(state, o.id), target);
    if (rest) return [o.id].concat(rest);
  }
  return null;
}

// Every state along a path (index 0 is the start).
export function statesAlong(start, ids, guessOf) {
  const out = [start];
  let s = start;
  ids.forEach((id, i) => {
    const lever = getNode(s).options.find((o) => o.id === id).lever;
    s = applyChoice(s, id, guessOf ? guessOf(lever, i) : undefined);
    out.push(s);
  });
  return out;
}

const SEED = 7; // matches ?seed=7 in PAGE_URL, so the option order matches the page
const r1Start = createRound(MAYA, 'r1', null, SEED);

export const R1_END = {};
export const R2_END = {};
const R1_STATES = {};
let R2_STATES_BT = null; // Round 2 states on the Breakthrough-after-Breakthrough path
for (const e of ENDINGS) {
  const path = findPath(r1Start, e);
  R1_STATES[e] = statesAlong(r1Start, path);
  R1_END[e] = R1_STATES[e][R1_STATES[e].length - 1];
  const r2Start = createRound(MAYA, 'r2', carryOver(R1_END[e]), SEED);
  const r2Path = findPath(r2Start, e);
  // Right on even decisions, wrong on odd ones, so the debrief shows misses.
  const guess = (lever, i) => (i % 2 === 0 ? lever : LEVERS[(LEVERS.indexOf(lever) + 1) % 4]);
  const r2States = statesAlong(r2Start, r2Path, guess);
  R2_END[e] = r2States[r2States.length - 1];
  if (e === 'breakthrough') R2_STATES_BT = r2States;
}

export function save(screen, state, r1, extra) {
  return Object.assign({ v: 1, screen, state, r1: r1 || null, lever: null, picked: null, seed: SEED }, extra || {});
}

// The last state on a path before the act changes (for the act banners).
function actEnds(states, round) {
  const out = {};
  for (let i = 1; i < states.length; i++) {
    const prev = states[i - 1];
    const s = states[i];
    const act = MAYA.rounds[round].nodes[prev.nodeId].act;
    const nextAct = s.nodeId ? MAYA.rounds[round].nodes[s.nodeId].act : null;
    if (nextAct !== act && !out[act]) out[act] = s;
  }
  return out;
}

// Keyboard selection of the nth choice on the page (1-4).
const press = (k) => async (page) => { await page.keyboard.press(String(k)); };

// ---------------------------------------------------------------------------
// The catalogue. Each entry: { name, save (null: fresh cover), resume (press
// Resume, default true when there is a save), blockStorage, steps(page),
// motion (needs animation on), screen (expected data-screen) }.

export function catalogue() {
  const list = [];
  const add = (o) => list.push(Object.assign({ resume: !!o.save }, o));
  const r1 = R1_STATES.breakthrough;
  const r1First = r1[0];
  const r2BT = R2_STATES_BT;

  add({ name: 'cover', save: null, screen: 'cover' });
  add({ name: 'cover-resume', save: save('scene', r1First), resume: false, screen: 'cover' });
  add({ name: 'cover-storage-notice', save: null, blockStorage: true, screen: 'cover' });
  add({ name: 'how-it-works', save: save('how', null), screen: 'how' });
  add({ name: 'referral', save: save('referral', null), screen: 'referral' });

  // Round 1, format B: levers, each lever selected, each lever's wordings, a wording selected.
  add({ name: 'r1-levers', save: save('scene', r1First), screen: 'scene' });
  LEVERS.forEach((l, i) => add({ name: 'r1-lever-selected-' + l, save: save('scene', r1First), steps: press(i + 1), screen: 'scene' }));
  LEVERS.forEach((l) => add({ name: 'r1-wording-' + l, save: save('scene', r1First, null, { lever: l }), screen: 'scene' }));
  add({ name: 'r1-wording-selected', save: save('scene', r1First, null, { lever: 'challenge' }), steps: press(2), screen: 'scene' });
  add({ name: 'r1-wording-selected-third', save: save('scene', r1First, null, { lever: 'question' }), steps: press(3), screen: 'scene' });

  // Consequences with the meters flashing in each lever's colour (motion on).
  LEVERS.forEach((l) => {
    const opt = getNode(r1First).options.find((o) => o.lever === l && o.quality === 'skilful');
    add({
      name: 'r1-flash-' + l, save: save('scene', r1First, null, { lever: l }), motion: true, screen: 'consequence',
      steps: async (page) => { await page.click('[data-option="' + opt.id + '"]'); await page.waitForTimeout(120); }
    });
  });
  add({ name: 'r1-consequence', save: save('consequence', r1[1]), screen: 'consequence' });

  // Act banners: Round 1 acts 1-3, Round 2 act 1.
  const r1Acts = actEnds(r1, 'r1');
  [1, 2, 3].forEach((a) => add({ name: 'r1-act-' + a, save: save('act', r1Acts[a], r1Acts[a].ending ? r1Acts[a] : null), screen: 'act' }));
  const r2Acts = actEnds(r2BT, 'r2');
  add({ name: 'r2-act-2', save: save('act', r2Acts[2], R1_END.breakthrough), screen: 'act' });

  // Endings, interludes and debriefs.
  ENDINGS.forEach((e) => add({ name: 'r1-ending-' + e, save: save('ending', R1_END[e], R1_END[e]), screen: 'ending' }));
  ENDINGS.forEach((e) => add({ name: 'debrief1-' + e, save: save('debrief', R1_END[e], R1_END[e]), screen: 'debrief' }));
  ENDINGS.forEach((e) => add({ name: 'interlude-' + e, save: save('interlude', R1_END[e], R1_END[e]), screen: 'interlude' }));
  ENDINGS.forEach((e) => add({ name: 'r2-ending-' + e, save: save('ending', R2_END[e], R1_END[e]), screen: 'ending' }));
  ENDINGS.forEach((e) => add({ name: 'debrief2-' + e, save: save('debrief', R2_END[e], R1_END[e]), screen: 'debrief' }));

  // Round 2, format C: lines, a line selected, Name that lever, each guess selected, every reveal.
  const r2First = r2BT[0];
  const r1BT = R1_END.breakthrough;
  add({ name: 'r2-lines', save: save('scene', r2First, r1BT), screen: 'scene' });
  add({ name: 'r2-line-selected', save: save('scene', r2First, r1BT), steps: press(3), screen: 'scene' });
  const first = optionsFor(r2First)[0];
  add({ name: 'r2-name-that-lever', save: save('scene', r2First, r1BT, { picked: first.id }), screen: 'scene' });
  LEVERS.forEach((l, i) => add({ name: 'r2-guess-selected-' + l, save: save('scene', r2First, r1BT, { picked: first.id }), steps: press(i + 1), screen: 'scene' }));
  getNode(r2First).options.forEach((o) => {
    const wrong = LEVERS[(LEVERS.indexOf(o.lever) + 1) % 4];
    add({ name: 'r2-reveal-' + o.lever + '-named', save: save('consequence', applyChoice(r2First, o.id, o.lever), r1BT), screen: 'consequence' });
    add({ name: 'r2-reveal-' + o.lever + '-missed', save: save('consequence', applyChoice(r2First, o.id, wrong), r1BT), screen: 'consequence' });
  });
  return list;
}

// One engine state per node in both rounds (for alt text on every scene).
export function everyNodeState() {
  // Some pages are reached only on certain meter values, so the search keys
  // on the page, the meters and the last two levers, not on the page alone.
  const found = {};
  const seen = new Set();
  const target = { r1: Object.keys(MAYA.rounds.r1.nodes).length, r2: Object.keys(MAYA.rounds.r2.nodes).length };
  const foundIn = (round) => Object.keys(found).filter((k) => k.startsWith(round + ':')).length;
  const visit = (s, r1) => {
    if (s.ending) return;
    if (foundIn(s.round) === target[s.round]) return; // every page of this round already has a state
    const key = s.round + ':' + s.nodeId + ':' + RULES.meters.map((m) => s.meters[m]).join(',') + ':' + s.history.slice(-2).map((e) => e.lever).join(',');
    if (seen.has(key)) return;
    seen.add(key);
    if (!found[s.round + ':' + s.nodeId]) found[s.round + ':' + s.nodeId] = { state: s, r1 };
    for (const o of getNode(s).options) visit(applyChoice(s, o.id, o.lever), r1);
  };
  visit(r1Start, null);
  for (const e of ENDINGS) visit(createRound(MAYA, 'r2', carryOver(R1_END[e]), SEED), R1_END[e]);
  return Object.values(found);
}

// ---------------------------------------------------------------------------
// Browser helpers.

export async function newContext(browser, opts = {}) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
    deviceScaleFactor: opts.scale || 1,
    reducedMotion: opts.motion ? 'no-preference' : 'reduce'
  });
  if (opts.blockStorage) {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage blocked'); } });
    });
  }
  return context;
}

export async function newPage(context) {
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  return page;
}

// Open a catalogue entry on `page` (a page in a context with the right motion setting).
export async function open(page, entry) {
  await page.goto(PAGE_URL);
  if (!entry.blockStorage) {
    await page.evaluate(([k, v]) => { localStorage.clear(); if (v) localStorage.setItem(k, v); }, [STORE_KEY, entry.save ? JSON.stringify(entry.save) : null]);
    await page.reload();
  }
  if (entry.resume) await page.click('[data-action="resume"]');
  if (entry.steps) await entry.steps(page);
  if (!entry.motion) await page.waitForTimeout(30);
  const screen = await page.getAttribute('.page', 'data-screen');
  if (entry.screen && screen !== entry.screen) throw new Error(entry.name + ': expected screen ' + entry.screen + ', got ' + screen);
}

// Open a scene at any state (for alt text).
export function sceneSave(state, r1) {
  return save('scene', state, r1);
}
