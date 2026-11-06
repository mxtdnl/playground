// Interface tests (SPEC.md 13, 14.4, 15) with Playwright against the built
// index.html, opened from file://. Run `node build.mjs` first.
//
// Playwright and Chromium are preinstalled in cloud sessions; do not install
// another version. Elsewhere, if `playwright` cannot be loaded these tests are
// skipped (the engine and content tests still run).
//
// Choices are fixed: for each target ending, the path is the first one found
// by a deterministic depth-first search through the engine, so the browser
// must arrive at exactly the ending, pages and meters the engine predicts.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RULES, createRound, applyChoice, carryOver, getNode, futureKey } from '../src/engine.js';
import { MAYA } from '../src/content/maya.js';

const here = dirname(fileURLToPath(import.meta.url));
const PAGE_URL = pathToFileURL(join(here, '..', 'index.html')).href + '?seed=7';
const SHOTS = join(here, 'screenshots');
const ENDINGS = ['breakthrough', 'partial', 'polite', 'early'];
// The page shows typographic quotes; the content keeps straight ones.
const plain = (t) => t.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

let chromium = null;
try {
  chromium = createRequire(import.meta.url)('playwright').chromium; // resolves via NODE_PATH
} catch (e) {
  chromium = null;
}
const skip = chromium ? false : 'playwright is not available';

// ---------------------------------------------------------------------------
// Fixed paths from the engine.

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

function findPath(state, target) {
  if (state.ending) return state.ending === target ? [] : null;
  for (const o of orderFor(getNode(state).options, target, state.history.length)) {
    const rest = findPath(applyChoice(state, o.id), target);
    if (rest) return [o.id].concat(rest);
  }
  return null;
}

// Round 2 guesses: right on even decisions, wrong on odd ones.
function guessFor(lever, i) {
  return i % 2 === 0 ? lever : RULES.levers[(RULES.levers.indexOf(lever) + 1) % 4];
}

// Engine states after each choice, for comparing with the page.
function simulate(state, ids, withGuess) {
  const states = [];
  ids.forEach((id, i) => {
    const lever = getNode(state).options.find((o) => o.id === id).lever;
    state = applyChoice(state, id, withGuess ? guessFor(lever, i) : undefined);
    states.push(state);
  });
  return states;
}

// ---------------------------------------------------------------------------
// Page helpers.

let browser;
before(async () => { if (chromium) browser = await chromium.launch(); });
after(async () => { if (browser) await browser.close(); });

async function newPage(opts = {}) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: opts.motion ? 'no-preference' : 'reduce'
  });
  if (opts.blockStorage) {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage blocked'); } });
    });
  }
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.goto(PAGE_URL);
  return page;
}

const screenOf = (page) => page.getAttribute('.page', 'data-screen');

async function meters(page) {
  const out = {};
  for (const m of RULES.meters) out[m] = Number(await page.getAttribute('.spread [data-meter="' + m + '"]', 'data-value'));
  return out;
}

async function begin(page) {
  await page.click('[data-action="start"]');
  assert.equal(await screenOf(page), 'how');
  await page.click('[data-primary]');
  assert.equal(await screenOf(page), 'referral');
  await page.click('[data-primary]');
}

// Play one round with fixed option ids, checking each step against the engine.
async function playRound(page, state, ids) {
  const isR2 = state.round === 'r2';
  const expected = simulate(state, ids, isR2);
  const round = MAYA.rounds[state.round];
  for (let i = 0; i < ids.length; i++) {
    const before = i === 0 ? state : expected[i - 1];
    assert.equal(await screenOf(page), 'scene', 'scene before decision ' + (i + 1));
    assert.equal(await page.getAttribute('.spread', 'data-node'), before.nodeId);
    assert.equal(await page.getAttribute('.runhead [data-page]', 'data-page'), String(round.nodes[before.nodeId].page));
    const option = getNode(before).options.find((o) => o.id === ids[i]);
    if (isR2) {
      assert.equal(await page.locator('.line-option').count(), 4);
      await page.click('[data-option="' + option.id + '"]');
      assert.equal(await page.getAttribute('.choices', 'data-step'), 'name');
      await page.click('[data-guess="' + guessFor(option.lever, i) + '"]');
    } else {
      assert.equal(await page.locator('[data-lever]').count(), 4);
      await page.click('[data-lever="' + option.lever + '"]');
      assert.equal(await page.locator('.line-option').count(), RULES.qualities.length);
      await page.click('[data-option="' + option.id + '"]');
    }
    assert.equal(await screenOf(page), 'consequence');
    assert.deepEqual(await meters(page), expected[i].meters, 'meters after decision ' + (i + 1));
    if (isR2) {
      assert.equal(await page.getAttribute('.reveal', 'data-reveal'), option.lever);
      assert.equal(await page.getAttribute('.reveal', 'data-guess-correct'), i % 2 === 0 ? 'yes' : 'no');
    }
    await page.waitForFunction(() => document.getElementById('meter-announcer').textContent.length > 0);
    await page.click('[data-primary]');
    if ((await screenOf(page)) === 'act') await page.click('[data-primary]');
  }
  const last = expected[expected.length - 1];
  assert.equal(await screenOf(page), 'ending');
  assert.equal(await page.getAttribute('[data-ending]', 'data-ending'), last.ending);
  return last;
}

// ---------------------------------------------------------------------------
// Tests.

for (const target of ENDINGS) {
  test('plays Round 1 and Round 2 to ' + target, { skip, timeout: 120000 }, async () => {
    const r1Start = createRound(MAYA, 'r1', null, 1);
    const r1Path = findPath(r1Start, target);
    assert.ok(r1Path, 'no Round 1 path to ' + target);
    const page = await newPage();
    await begin(page);
    const r1End = await playRound(page, r1Start, r1Path);
    assert.equal(r1End.ending, target);

    await page.click('[data-primary]');
    assert.equal(await screenOf(page), 'debrief');
    assert.equal(await page.locator('.path li').count(), r1Path.length);
    await page.click('[data-primary]');
    assert.equal(await screenOf(page), 'interlude');
    assert.equal(plain(await page.textContent('.interlude-text')), MAYA.rounds.r2.interlude[target]);
    await page.click('[data-primary]');

    const r2Start = createRound(MAYA, 'r2', carryOver(r1End), 1);
    assert.equal(r2Start.nodeId, MAYA.rounds.r2.starts[target]);
    const r2Path = findPath(r2Start, target);
    assert.ok(r2Path, 'no Round 2 path to ' + target + ' after ' + target);
    const r2End = await playRound(page, r2Start, r2Path);
    assert.equal(r2End.ending, target);

    await page.click('[data-primary]');
    assert.equal(await screenOf(page), 'debrief');
    const named = r2Path.filter((id, i) => i % 2 === 0).length;
    assert.equal(await page.getAttribute('[data-recognition]', 'data-recognition'), named + '/' + r2Path.length);
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });
}

test('resumes after reload, mid-choice and on a consequence; Start again clears', { skip, timeout: 60000 }, async () => {
  const page = await newPage();
  await begin(page);
  await page.click('[data-lever="support"]');
  await page.click('[data-option="s-s"]');
  await page.click('[data-primary]');
  await page.click('[data-lever="question"]');
  assert.equal(await page.getAttribute('.choices', 'data-step'), 'wording');
  const metersBefore = await meters(page);

  await page.reload();
  assert.equal(await screenOf(page), 'cover');
  await page.click('[data-action="resume"]');
  assert.equal(await screenOf(page), 'scene');
  assert.equal(await page.getAttribute('.spread', 'data-node'), 'r1-02');
  assert.equal(await page.getAttribute('.choices', 'data-step'), 'wording');
  assert.equal(await page.getAttribute('.line-option.lv-question', 'class') !== null, true);
  assert.deepEqual(await meters(page), metersBefore);

  await page.click('[data-back]');
  assert.equal(await page.getAttribute('.choices', 'data-step'), 'lever');
  await page.click('[data-lever="observe"]');
  await page.click('[data-option="o-s"]');
  const after = await meters(page);
  await page.reload();
  await page.click('[data-action="resume"]');
  assert.equal(await screenOf(page), 'consequence');
  assert.deepEqual(await meters(page), after);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('turn-the-page:maya:v1')));
  assert.equal(saved.v, 1);
  assert.equal(saved.state.history.length, 2);

  await page.reload();
  await page.click('[data-action="start-again"]');
  assert.equal(await screenOf(page), 'how');
  const cleared = await page.evaluate(() => JSON.parse(localStorage.getItem('turn-the-page:maya:v1')));
  assert.equal(cleared.screen, 'how');
  assert.equal(cleared.state, null, 'Start again discards the round in progress');
  assert.equal(cleared.r1, null);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  assert.equal(await page.locator('[data-action="resume"]').count(), 0);
  assert.equal(await page.locator('[data-action="start"]').count(), 1);
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test('runs with localStorage throwing, and shows the notice', { skip, timeout: 60000 }, async () => {
  const page = await newPage({ blockStorage: true });
  assert.equal(await page.locator('#storage-notice').count(), 1);
  assert.match(await page.textContent('#storage-notice'), /not letting the page save/);
  await begin(page);
  const start = createRound(MAYA, 'r1', null, 1);
  await playRound(page, start, findPath(start, 'polite'));
  await page.reload();
  assert.equal(await page.locator('[data-action="resume"]').count(), 0);
  assert.equal(await page.locator('#storage-notice').count(), 1);
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test('keyboard: 1-4 select, Enter confirms, Escape goes back, focus is visible', { skip, timeout: 60000 }, async () => {
  const page = await newPage();
  await page.keyboard.press('Enter'); // cover: Start
  assert.equal(await screenOf(page), 'how');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  assert.equal(await screenOf(page), 'scene');
  await page.keyboard.press('2');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.lever), 'support');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.equal(outline, 'solid');
  await page.keyboard.press('Enter');
  assert.equal(await page.getAttribute('.choices', 'data-step'), 'wording');
  await page.keyboard.press('Escape');
  assert.equal(await page.getAttribute('.choices', 'data-step'), 'lever');
  await page.keyboard.press('1');
  await page.keyboard.press('Enter');
  await page.keyboard.press('1');
  await page.keyboard.press('Enter');
  assert.equal(await screenOf(page), 'consequence');
  await page.keyboard.press('Enter');
  assert.equal(await screenOf(page), 'scene');
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

// Screenshots of every screen at both sizes, with motion on.
const SIZES = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
for (const size of SIZES) {
  test('screenshots at ' + size.width + 'x' + size.height, { skip, timeout: 120000 }, async () => {
    mkdirSync(SHOTS, { recursive: true });
    const page = await newPage({ viewport: size, motion: true });
    let n = 0;
    const shot = async (name, wait = 800) => {
      await page.waitForTimeout(wait);
      const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      assert.ok(noHScroll, 'horizontal scroll on ' + name + ' at ' + size.width);
      n++;
      await page.screenshot({ path: join(SHOTS, size.width + 'x' + size.height + '-' + String(n).padStart(2, '0') + '-' + name + '.png'), fullPage: true });
    };
    await shot('cover');
    await page.click('[data-action="start"]');
    await shot('how-it-works');
    await page.click('[data-primary]');
    await shot('referral');
    await page.click('[data-primary]');
    await shot('r1-scene-levers');
    await page.click('[data-lever="observe"]');
    await shot('r1-scene-wording', 300);
    await page.click('[data-option="o-s"]');
    await shot('r1-consequence-flash', 120);
    await page.waitForTimeout(700);

    // Continue on a breakthrough path to show the act banner and ending.
    const start = createRound(MAYA, 'r1', null, 1);
    const afterFirst = applyChoice(start, 'o-s');
    const rest = findPath(afterFirst, 'breakthrough');
    await page.click('[data-primary]');
    let state = afterFirst;
    let bannerShot = false;
    for (const id of rest) {
      if ((await screenOf(page)) === 'act') {
        if (!bannerShot) { await shot('act-banner'); bannerShot = true; }
        await page.click('[data-primary]');
      }
      const lever = getNode(state).options.find((o) => o.id === id).lever;
      await page.click('[data-lever="' + lever + '"]');
      await page.click('[data-option="' + id + '"]');
      state = applyChoice(state, id);
      await page.click('[data-primary]');
    }
    if ((await screenOf(page)) === 'act') await page.click('[data-primary]');
    await shot('r1-ending-breakthrough');
    await page.click('[data-primary]');
    await shot('r1-debrief');
    await page.click('[data-primary]');
    await shot('interlude');
    await page.click('[data-primary]');
    await shot('r2-scene-lines');
    const r2node = getNode(createRound(MAYA, 'r2', carryOver(state), 1));
    await page.click('[data-option="' + r2node.options[0].id + '"]');
    await shot('r2-name-that-lever', 300);
    await page.click('[data-guess="support"]');
    await shot('r2-reveal');
    assert.deepEqual(page.errors, []);
    await page.context().close();

    // Early exit ending and the storage notice, on fresh pages.
    const early = await newPage({ viewport: size });
    await begin(early);
    const s0 = createRound(MAYA, 'r1', null, 1);
    await playRound(early, s0, findPath(s0, 'early'));
    await early.waitForTimeout(100);
    n++;
    await early.screenshot({ path: join(SHOTS, size.width + 'x' + size.height + '-' + String(n).padStart(2, '0') + '-r1-ending-early.png'), fullPage: true });
    await early.context().close();

    const blocked = await newPage({ viewport: size, blockStorage: true });
    n++;
    await blocked.screenshot({ path: join(SHOTS, size.width + 'x' + size.height + '-' + String(n).padStart(2, '0') + '-cover-storage-notice.png'), fullPage: true });
    await blocked.context().close();
  });
}

// ---------------------------------------------------------------------------
// Illustration (SPEC.md 12): alt text on every scene, pose interpolation with
// motion on, none under reduced motion.

test('scene art: alt text, page overrides, 0.4s interpolation, instant under reduced motion', { skip, timeout: 60000 }, async () => {
  for (const motion of [true, false]) {
    const page = await newPage({ motion });
    await begin(page);
    await page.waitForTimeout(500);
    assert.match(await page.getAttribute('.scene-art', 'aria-label'), /^Maya sits on the edge of the chair, holding her bag on her lap/);
    assert.equal(await page.getAttribute('.scene-frame', 'data-gaze'), 'door', 'r1-01 overrides the gaze');
    await page.click('[data-lever="support"]');
    await page.click('[data-option="s-s"]');
    const tweening = await page.locator('.scene-art[data-tweening]').count();
    assert.equal(tweening, motion ? 1 : 0, 'tweening with motion ' + motion);
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.scene-art[data-tweening]').count(), 0);
    assert.match(await page.getAttribute('.scene-art', 'aria-label'), /^Maya sits /);
    assert.equal(await page.locator('.scene-art > svg').count(), 1);
    // The consequence uses the option's pose hints: "Her shoulders come down a little. She looks at you properly".
    assert.equal(await page.getAttribute('.scene-frame', 'data-shoulders'), 'relaxed');
    assert.equal(await page.getAttribute('.scene-frame', 'data-gaze'), 'counsellor');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  }
});

// ---------------------------------------------------------------------------
// Debriefs (SPEC.md 10): every element, then screenshots for a Breakthrough
// path and an Early exit path at both sizes.

const D1_SECTIONS = ['traces', 'levers', 'path', 'road', 'maya', 'next'];
const D2_SECTIONS = ['traces', 'levers', 'recognition', 'path', 'road', 'maya', 'sessions', 'reflect', 'copy', 'next'];

async function checkDebrief(page, state, which) {
  assert.equal(await screenOf(page), 'debrief');
  assert.equal(await page.getAttribute('[data-debrief]', 'data-debrief'), which);
  const sections = await page.$$eval('.db-section', (els) => els.map((e) => e.dataset.section));
  assert.deepEqual(sections, which === '1' ? D1_SECTIONS : D2_SECTIONS);
  assert.equal(await page.getAttribute('[data-ending-card]', 'data-ending-card'), state.ending);
  const n = state.history.length;
  // Three traces with one lever marker per decision (two rounds side by side in Debrief 2).
  assert.equal(await page.locator('[data-section="traces"] .trace').count(), 3);
  assert.equal(await page.locator('[data-section="traces"] .tr-mark').count(), 3 * n);
  assert.equal(await page.locator('.path li').count(), n);
  assert.equal(await page.locator('.path li.turning').count(), Math.min(2, n));
  for (const lever of RULES.levers) {
    const used = state.history.filter((e) => e.lever === lever).length;
    assert.equal(await page.locator('[data-lever-count="' + lever + ':' + used + '"]').count(), 1, 'count for ' + lever);
  }
  if (which === '1') {
    const counts = RULES.qualities.map((q) => state.history.filter((e) => e.quality === q).length);
    assert.equal(await page.getAttribute('[data-wording]', 'data-wording'), counts.join('/') + '/' + n);
    // Key with three block styles, each named (never colour alone).
    assert.deepEqual(await page.$$eval('.cb-key li', (els) => els.map((e) => e.textContent)), ['Skilful wording', 'Plausible wording', 'Clumsy wording']);
    for (const q of RULES.qualities) assert.equal(await page.locator('.cb-key .cb-' + q).count(), 1);
    // Path replay tags each decision with its wording quality.
    const tags = await page.$$eval('.path .quality', (els) => els.map((e) => e.textContent));
    assert.deepEqual(tags, state.history.map((e) => ({ skilful: 'Skilful wording', plausible: 'Plausible wording', clumsy: 'Clumsy wording' })[e.quality]));
  }
  assert.equal(await page.locator('.road').count(), 2);
  assert.equal(await page.locator('.trait').count(), 4);
  assert.equal(await page.locator('.hint-quote').count(), 4);
}

for (const target of ['breakthrough', 'early']) {
  for (const size of SIZES) {
    test('debriefs for a ' + target + ' path at ' + size.width + 'x' + size.height, { skip, timeout: 180000 }, async () => {
      mkdirSync(SHOTS, { recursive: true });
      const page = await newPage({ viewport: size });
      const name = (s) => join(SHOTS, size.width + 'x' + size.height + '-debrief-' + target + '-' + s + '.png');
      await begin(page);
      const r1Start = createRound(MAYA, 'r1', null, 1);
      const r1End = await playRound(page, r1Start, findPath(r1Start, target));
      await page.click('[data-primary]');
      await checkDebrief(page, r1End, '1');
      const noHScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      assert.ok(await noHScroll(), 'horizontal scroll on Debrief 1');
      await page.screenshot({ path: name('1'), fullPage: true });

      await page.click('[data-primary]'); // Continue to Round 2
      await page.click('[data-primary]'); // Interlude: Begin Round 2
      const r2Start = createRound(MAYA, 'r2', carryOver(r1End), 1);
      const r2Path = findPath(r2Start, target);
      const r2End = await playRound(page, r2Start, r2Path);
      await page.click('[data-primary]');
      await checkDebrief(page, r2End, '2');
      const named = r2Path.filter((id, i) => i % 2 === 0).length;
      assert.equal(await page.getAttribute('[data-recognition]', 'data-recognition'), named + '/' + r2Path.length);
      assert.equal(await page.locator('.misses li').count(), r2Path.length - named);
      assert.equal(await page.locator('.session-card').count(), 2);
      assert.equal(await page.locator('[data-section="sessions"] .tr-mark').count(), 3 * (r1End.history.length + r2End.history.length));
      assert.equal(plain(await page.textContent('.carry-note')), MAYA.rounds.r2.carryNote[target]);
      assert.equal(await page.locator('.reflection li').count(), 3);
      const summary = await page.inputValue('.summary-text');
      assert.match(summary, new RegExp('Round 1 \\(Just lazy\\): ' + MAYA.rounds.r1.endings[target].title));
      assert.match(summary, new RegExp('Lever recognition: ' + named + ' of ' + r2Path.length));
      await page.click('[data-action="copy-summary"]');
      await page.waitForFunction(() => document.querySelector('.copy-status').textContent.length > 0);
      assert.ok(await noHScroll(), 'horizontal scroll on Debrief 2');
      await page.screenshot({ path: name('2'), fullPage: true });
      assert.deepEqual(page.errors, []);
      await page.context().close();
    });
  }
}

// ---------------------------------------------------------------------------
// Bridging lines (SPEC.md 9.5).

// Compare text ignoring quote style (quoted() turns inner double quotes into single).
const same = (a, b) => assert.equal(plain(a).replace(/'/g, '"'), String(b).replace(/'/g, '"'));
const textOf = (x) => (x && typeof x === 'object' ? x.default : x);
const fromOf = (x, key) => x && typeof x === 'object' && x.from ? x.from[key] : undefined;

// A path that takes the given option at each named page ({ 'r1-03d': 'o-s' })
// and ends as `endOk(state)` says. Depth-first, preferring the session's
// quality pattern; dead ends are remembered by futureKey.
function findPathVia(start, wants, endOk) {
  const dead = new Set();
  return (function go(state) {
    if (state.ending) return endOk(state) ? [] : null;
    const key = futureKey(state);
    if (dead.has(key)) return null;
    const opts = getNode(state).options;
    const forced = wants[state.nodeId];
    const order = forced ? opts.filter((o) => o.id === forced) : orderFor(opts, 'any', state.history.length);
    for (const o of order) {
      const rest = go(applyChoice(state, o.id));
      if (rest) return [o.id].concat(rest);
    }
    dead.add(key);
    return null;
  })(start);
}

// Make one choice on the current scene page (either format), then Continue,
// passing any act banner.
async function choose(page, state, optionId, i) {
  const option = getNode(state).options.find((o) => o.id === optionId);
  if (state.round === 'r2') {
    await page.click('[data-option="' + optionId + '"]');
    await page.click('[data-guess="' + guessFor(option.lever, i) + '"]');
  } else {
    await page.click('[data-lever="' + option.lever + '"]');
    await page.click('[data-option="' + optionId + '"]');
  }
  assert.equal(await screenOf(page), 'consequence');
}
async function onward(page) {
  await page.click('[data-primary]');
  if ((await screenOf(page)) === 'act') await page.click('[data-primary]');
}

test('bridging lines: variant after that option, default after a reload (page line, cue and ending text)', { skip, timeout: 120000 }, async () => {
  const r1 = MAYA.rounds.r1;
  const page = await newPage();
  await begin(page);
  // p. 7 Support (skilful) leads to p. 12, which has a bridging line for it.
  await choose(page, createRound(MAYA, 'r1', null, 1), 's-s', 0);
  await onward(page);
  assert.equal(await page.getAttribute('.spread', 'data-node'), 'r1-02');
  same(await page.textContent('.maya-line'), '"' + fromOf(r1.nodes['r1-02'].line, 'r1-01:s-s') + '"');
  same(await page.textContent('.cue'), textOf(r1.nodes['r1-02'].cue));
  await page.reload();
  await page.click('[data-action="resume"]');
  assert.equal(await page.getAttribute('.spread', 'data-node'), 'r1-02');
  same(await page.textContent('.maya-line'), '"' + textOf(r1.nodes['r1-02'].line) + '"');
  await page.context().close();

  // A cue variant, and a reload on the consequence page before turning.
  const p2 = await newPage();
  await begin(p2);
  await choose(p2, createRound(MAYA, 'r1', null, 1), 'c-c', 0);
  await onward(p2);
  same(await p2.textContent('.cue'), fromOf(r1.nodes['r1-02'].cue, 'r1-01:c-c'));
  same(await p2.textContent('.maya-line'), '"' + textOf(r1.nodes['r1-02'].line) + '"');
  await p2.context().close();
  const p3 = await newPage();
  await begin(p3);
  await choose(p3, createRound(MAYA, 'r1', null, 1), 's-s', 0);
  await p3.reload();
  await p3.click('[data-action="resume"]');
  assert.equal(await screenOf(p3), 'consequence');
  await onward(p3);
  same(await p3.textContent('.maya-line'), '"' + textOf(r1.nodes['r1-02'].line) + '"');
  await p3.context().close();

  // Ending text: a Polite exit straight after p. 70 Question (skilful).
  const start = createRound(MAYA, 'r1', null, 1);
  const path = findPathVia(start, { 'r1-07': 'q-s' }, (s) => s.ending === 'polite');
  assert.ok(path, 'no path to a Polite exit through r1-07:q-s');
  const p4 = await newPage();
  await begin(p4);
  let st = start;
  for (let i = 0; i < path.length; i++) { await choose(p4, st, path[i], i); st = applyChoice(st, path[i]); await p4.click('[data-primary]'); if ((await screenOf(p4)) === 'act') await p4.click('[data-primary]'); }
  assert.equal(await screenOf(p4), 'ending');
  same(await p4.textContent('.ending-text'), fromOf(r1.endings.polite.text, 'r1-07:q-s'));
  await p4.reload();
  await p4.click('[data-action="resume"]');
  assert.equal(await screenOf(p4), 'ending');
  same(await p4.textContent('.ending-text'), textOf(r1.endings.polite.text));
  assert.deepEqual(p4.errors, []);
  await p4.context().close();
});

// Three paths that use bridges, screenshotted on every bridged page at both
// sizes into tests/screenshots/bridges/ (read them after content changes).
const BRIDGE_PATHS = [
  { name: 'A', round: 'r1', wants: { 'r1-01': 's-s', 'r1-02': 'c-s', 'r1-03d': 'o-s' }, end: () => true },
  { name: 'B', round: 'r1', wants: { 'r1-01': 'c-s', 'r1-02': 'o-s', 'r1-05': 'c-c', 'r1-06d': 'q-s', 'r1-07': 'q-s' }, end: () => true },
  { name: 'C', round: 'r2', wants: { 'r2-02': 'o', 'r2-03a': 'c', 'r2-05': 'c', 'r2-06d': 'c' }, end: () => true }
];
for (const size of SIZES) {
  test('bridged paths read through at ' + size.width + 'x' + size.height, { skip, timeout: 180000 }, async () => {
    const dir = join(SHOTS, 'bridges');
    mkdirSync(dir, { recursive: true });
    for (const bp of BRIDGE_PATHS) {
      const page = await newPage({ viewport: size });
      await begin(page);
      let st = createRound(MAYA, 'r1', null, 1);
      if (bp.round === 'r2') {
        // Round 1 to a Breakthrough first, so Round 2 is played live.
        const r1Path = findPath(st, 'breakthrough');
        st = await playRound(page, st, r1Path);
        await page.click('[data-primary]');
        await page.click('[data-primary]');
        await page.click('[data-primary]');
        st = createRound(MAYA, 'r2', carryOver(st), 1);
      }
      const path = findPathVia(st, bp.wants, bp.end);
      assert.ok(path, 'no path for bridged path ' + bp.name);
      let bridges = 0;
      for (let i = 0; i < path.length; i++) {
        await choose(page, st, path[i], i);
        const key = st.nodeId + ':' + path[i];
        st = applyChoice(st, path[i], st.round === 'r2' ? guessFor(getNode(st).options.find((o) => o.id === path[i]).lever, i) : undefined);
        await onward(page);
        const round = MAYA.rounds[st.round];
        const target = st.ending ? round.endings[st.ending].text : round.nodes[st.nodeId].line;
        const cue = st.ending ? null : round.nodes[st.nodeId].cue;
        const v = fromOf(target, key), vc = fromOf(cue, key);
        if (v || vc) {
          bridges++;
          if (st.ending) same(await page.textContent('.ending-text'), v);
          else {
            if (v) same(await page.textContent('.maya-line'), '"' + v + '"');
            if (vc) same(await page.textContent('.cue'), vc);
          }
          await page.screenshot({ path: join(dir, size.width + 'x' + size.height + '-' + bp.name + '-' + String(i + 1).padStart(2, '0') + '-' + (st.ending ? 'ending-' + st.ending : st.nodeId) + '.png'), fullPage: true });
        }
      }
      assert.ok(bridges >= 2, 'path ' + bp.name + ' shows only ' + bridges + ' bridge(s)');
      assert.deepEqual(page.errors, []);
      await page.context().close();
    }
  });
}
