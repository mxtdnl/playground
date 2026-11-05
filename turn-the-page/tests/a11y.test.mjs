// Accessibility, narrow layout, pulp finish and print (SPEC.md 11.3, 13, 15),
// with Playwright against the built index.html. Run `node build.mjs` first.
// Skipped where Playwright is not available.
//
// Every screen state in tests/states.mjs is checked at 1440x900, 390x844 and
// 360x740 for: focus order and a visible focus indicator (3:1), touch targets
// of at least 44px, one h1, labelled images, the decorative geometry, and at
// the two narrow sizes a single column, the sticky meter strip and no
// horizontal scroll. Then: a keyboard-only playthrough with motion on (focus
// is never lost on a page turn), reduced motion, alt text on every page of
// both rounds, the harness's own self-check, and the print stylesheet.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChromium, catalogue, everyNodeState, newContext, newPage, open, save, PAGE_URL, R1_END, R2_END } from './states.mjs';
import { pageAudit } from './wcag.mjs';
import { GRAPHICS } from './contrast.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(here, 'screenshots', 'states');
const chromium = loadChromium();
const skip = chromium ? false : 'playwright is not available';
const SIZES = [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 740 }];
const byName = (n) => catalogue().find((e) => e.name === n);

let browser;
before(async () => { if (chromium) browser = await chromium.launch(); });
after(async () => { if (browser) await browser.close(); });

// Layout, targets, headings, images and decoration, measured in the page.
function layoutAudit(narrow) {
  const out = [];
  const vw = document.documentElement.clientWidth;
  const page = document.querySelector('#app .page');
  const pr = page.getBoundingClientRect();
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility === 'visible'; };
  if (document.documentElement.scrollWidth > vw) out.push('horizontal scroll: ' + document.documentElement.scrollWidth + ' > ' + vw);
  // Nothing outside the decoration sticks out of the viewport.
  page.querySelectorAll('*').forEach((el) => {
    if (el.closest('.deco') || el instanceof SVGElement || !visible(el)) return;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) out.push('overflows the viewport: ' + el.tagName.toLowerCase() + '.' + el.className + ' (' + Math.round(r.left) + '..' + Math.round(r.right) + ')');
  });
  // Touch targets (SPEC.md 13, 15).
  page.querySelectorAll('button, a[href], textarea, input, [tabindex="0"]').forEach((el) => {
    if (!visible(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 44 - 0.5 || r.height < 44 - 0.5) out.push('target under 44px: ' + el.tagName.toLowerCase() + '.' + el.className + ' "' + el.textContent.trim().slice(0, 30) + '" ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  // One h1 per screen; every image has a label.
  const h1s = page.querySelectorAll('h1');
  if (h1s.length !== 1) out.push(h1s.length + ' h1 elements');
  page.querySelectorAll('[role="img"]').forEach((el) => { if (!(el.getAttribute('aria-label') || '').trim()) out.push('role=img without a label: ' + el.className); });
  page.querySelectorAll('svg').forEach((el) => {
    if (!el.closest('[aria-hidden="true"], [role="img"]')) out.push('svg exposed without a label: ' + (el.parentElement.className || el.parentElement.tagName));
  });
  // Decorative geometry (SPEC.md 11.4): two or three shapes in at least two
  // different lever colours, 0.06-0.12 opacity, each bleeding off an edge
  // and partly on the page, none overlapping the meters.
  const shapes = Array.from(page.querySelectorAll(':scope > .deco > .shape'));
  if (shapes.length < 2 || shapes.length > 3) out.push(shapes.length + ' decorative shapes');
  const colours = new Set();
  const meters = page.querySelector('.spread .meters');
  const mr = meters && meters.getBoundingClientRect();
  shapes.forEach((s) => {
    const c = ['question', 'support', 'observe', 'challenge'].find((l) => s.classList.contains(l));
    if (!c) out.push('shape not in a lever colour: ' + s.className);
    else colours.add(c);
    const o = Number(getComputedStyle(s).opacity);
    if (o < 0.06 || o > 0.12) out.push('shape opacity ' + o);
    const r = s.getBoundingClientRect();
    const bleeds = r.left < pr.left || r.right > pr.right || r.top < pr.top || r.bottom > pr.bottom;
    if (!bleeds) out.push('shape does not bleed off an edge: ' + s.className);
    const shown = Math.max(0, Math.min(r.right, pr.right) - Math.max(r.left, pr.left)) * Math.max(0, Math.min(r.bottom, pr.bottom) - Math.max(r.top, pr.top));
    if (shown < 2000) out.push('shape barely on the page: ' + s.className);
    if (mr && r.left < mr.right && r.right > mr.left && r.top < mr.bottom && r.bottom > mr.top) out.push('shape behind the meters: ' + s.className);
  });
  if (colours.size < 2) out.push('decoration uses ' + colours.size + ' lever colour(s)');
  if (meters) {
    const bg = getComputedStyle(meters).backgroundColor;
    if (!/^rgb\(/.test(bg)) out.push('meters background not opaque: ' + bg);
  }
  // Narrow layout: one column, meters in a sticky strip that stays at the top.
  if (narrow) {
    const spread = page.querySelector('.spread');
    if (spread && getComputedStyle(spread).gridTemplateColumns.trim().split(/\s+/).length !== 1) out.push('spread is not a single column');
    if (meters) {
      if (getComputedStyle(meters).position !== 'sticky') out.push('meters are not sticky');
      if (mr.top > spread.getBoundingClientRect().top + 1) out.push('meters are not the first row');
    }
  }
  return out;
}

async function stickyCheck(page) {
  if (!(await page.locator('.spread .meters').count())) return [];
  const out = [];
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  if (max < 50) return out;
  const natural = await page.evaluate(() => document.querySelector('.spread .meters').getBoundingClientRect().top);
  for (const y of [Math.round(max / 2), max]) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    const top = await page.evaluate(() => document.querySelector('.spread .meters').getBoundingClientRect().top);
    const want = Math.max(0, natural - y);
    if (Math.abs(top - want) > 1) out.push('meters at ' + top + ' after scrolling to ' + y + ', expected ' + want);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return out;
}

// Tab through the page from the top; every focusable element in DOM order,
// once each, with a visible focus indicator at 3:1 against what is behind it.
async function focusOrder(page) {
  const out = [];
  const expected = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('#app .page button, #app .page a[href], #app .page textarea, #app .page input'))
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[inert], [aria-hidden="true"]'); });
    els.forEach((el, i) => el.setAttribute('data-tab-index', i));
    return els.length;
  });
  await page.evaluate(() => { document.querySelector('#app .page').focus(); });
  const seen = [];
  for (let i = 0; i < expected + 1; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const a = document.activeElement;
      return { idx: a && a.getAttribute('data-tab-index'), inPage: !!(a && a.closest('#app .page')), tag: a ? a.tagName : null };
    });
    if (!info.inPage) break;
    seen.push(Number(info.idx));
    const f = await page.evaluate(pageAudit, { focus: true });
    if (!f.visible) out.push('focus not visible on ' + f.el + ' (' + f.style + ' ' + f.width + ')');
    else if (f.ratio < 3) out.push('focus indicator ' + f.colour + ' at ' + f.ratio + ':1 on ' + f.el);
  }
  const want = Array.from({ length: expected }, (_, i) => i);
  if (JSON.stringify(seen) !== JSON.stringify(want)) out.push('tab order ' + JSON.stringify(seen) + ', expected ' + JSON.stringify(want));
  return out;
}

for (const size of SIZES) {
  const narrow = size.width < 860;
  test('every screen state at ' + size.width + 'x' + size.height + ': focus, targets, headings, images, decoration' + (narrow ? ', narrow layout' : ''), { skip, timeout: 600000 }, async () => {
    const problems = [];
    const shoot = size.width !== 360;
    if (shoot) mkdirSync(SHOTS, { recursive: true });
    for (const block of [false, true]) {
      const entries = catalogue().filter((e) => !!e.blockStorage === block && !e.motion);
      const context = await newContext(browser, { viewport: size, blockStorage: block });
      const page = await newPage(context);
      for (const entry of entries) {
        await open(page, entry);
        await page.evaluate(() => window.scrollTo(0, 0)); // keyboard selection may have scrolled
        if (shoot) await page.screenshot({ path: join(SHOTS, size.width + 'x' + size.height + '-' + entry.name + '.png'), fullPage: true });
        const found = (await page.evaluate(layoutAudit, narrow))
          .concat(narrow ? await stickyCheck(page) : [])
          .concat(entry.steps ? [] : await focusOrder(page));
        found.forEach((p) => problems.push(entry.name + ': ' + p));
        if (page.errors.length) problems.push(entry.name + ': page errors ' + page.errors.join('; '));
      }
      await context.close();
    }
    assert.deepEqual(problems, []);
  });
}

// ---------------------------------------------------------------------------
// Keyboard only, motion on: Cover to Debrief 2 and back, with no mouse. After
// every key that turns the page, focus is inside the new page (never on the
// body or the outgoing copy), during the turn and after it.

test('keyboard-only playthrough to Debrief 2, focus kept on every page turn', { skip, timeout: 180000 }, async () => {
  const context = await newContext(browser, { motion: true });
  const page = await newPage(context);
  await page.goto(PAGE_URL);
  const lost = [];
  const screens = ['cover'];
  async function key(k) {
    const before = await page.getAttribute('#app .page', 'data-screen');
    await page.keyboard.press(k);
    for (const wait of [0, 450]) {
      if (wait) await page.waitForTimeout(wait);
      const f = await page.evaluate(() => {
        const a = document.activeElement;
        return { inPage: !!(a && a.closest('#app .page')), inTurn: !!(a && a.closest('.turn-out')), screen: document.querySelector('#app .page').dataset.screen };
      });
      if (!f.inPage || f.inTurn) lost.push(k + ' on ' + before + ' (after ' + wait + 'ms)');
      if (!wait && f.screen !== screens[screens.length - 1]) screens.push(f.screen);
    }
  }
  const screen = () => page.getAttribute('#app .page', 'data-screen');
  const step = () => page.evaluate(() => { const c = document.querySelector('#app .choices'); return c ? c.dataset.step : null; });
  await key('Enter'); // Start
  await key('Enter'); // How it works
  await key('Enter'); // Referral
  let decisions = 0;
  let escaped = false;
  for (let guard = 0; guard < 80; guard++) {
    const s = await screen();
    if (s === 'scene') {
      if ((await step()) === 'lever' && !escaped) {
        await key('4'); await key('Enter'); // Challenge wordings
        await key('Escape'); // back to the levers
        assert.equal(await step(), 'lever');
        escaped = true;
      }
      // Choose the second item each time (lever, wording, line or guess).
      await key('2'); await key('Enter');
      if ((await step()) === 'wording') { await key('1'); await key('Enter'); }
      if ((await step()) === 'name') { await key('3'); await key('Enter'); }
      decisions++;
    } else if (s === 'debrief' && (await page.getAttribute('[data-debrief]', 'data-debrief')) === '2') {
      break;
    } else {
      await key('Enter');
    }
  }
  assert.equal(await screen(), 'debrief');
  assert.equal(await page.getAttribute('[data-debrief]', 'data-debrief'), '2');
  assert.ok(decisions >= 8, 'made ' + decisions + ' decisions');
  for (const s of ['cover', 'how', 'referral', 'scene', 'consequence', 'ending', 'debrief', 'interlude']) assert.ok(screens.includes(s), 'reached ' + s);
  assert.deepEqual(lost, [], 'focus lost');
  // Copy summary and Replay by Tab and Enter only.
  let found = false;
  for (let i = 0; i < 200 && !found; i++) {
    await page.keyboard.press('Tab');
    found = await page.evaluate(() => document.activeElement.dataset.action === 'copy-summary');
  }
  assert.ok(found, 'Copy summary reachable by Tab');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.copy-status').textContent.length > 0);
  await page.evaluate(() => document.querySelector('#app .page').focus());
  await key('Enter'); // the primary button: Replay Round 2
  assert.equal(await screen(), 'interlude');
  assert.deepEqual(page.errors, []);
  await context.close();
});

// ---------------------------------------------------------------------------
// Reduced motion (SPEC.md 15): page turns, meter flashes, pose interpolation
// and hover lifts are flattened; with motion on they all run.

test('reduced motion flattens page turns, meter flashes, pose tweens and hover lifts', { skip, timeout: 60000 }, async () => {
  for (const motion of [true, false]) {
    const context = await newContext(browser, { motion });
    const page = await newPage(context);
    await open(page, byName('r1-wording-support'));
    await page.waitForTimeout(500);
    await page.click('[data-option="s-s"]');
    const r = await page.evaluate(() => ({
      flashing: Array.from(document.querySelectorAll('.seg')).filter((s) => getComputedStyle(s).animationName !== 'none').length,
      tween: document.querySelectorAll('.scene-art[data-tweening]').length,
      transition: getComputedStyle(document.querySelector('[data-primary]')).transitionDuration,
      marks: Array.from(document.querySelectorAll('.spread .mark')).map((m) => m.textContent)
    }));
    await page.waitForFunction(() => document.getElementById('meter-announcer').textContent.length > 0);
    r.announced = await page.textContent('#meter-announcer');
    // Continue turns the page.
    await page.waitForTimeout(700);
    await page.click('[data-primary]');
    r.turn = await page.locator('.turn-out').count();
    // The ▲/▼ markers and the announcement carry the change either way.
    assert.ok(r.marks.some((t) => t === '▲' || t === '▼'));
    assert.ok(r.announced.length > 0);
    if (motion) {
      assert.equal(r.turn, 1, 'page turn runs');
      assert.ok(r.flashing > 0, 'meters flash');
      assert.equal(r.tween, 1, 'pose interpolates');
      assert.notEqual(r.transition, '0s');
    } else {
      assert.equal(r.turn, 0, 'no page turn');
      assert.equal(r.flashing, 0, 'no meter flash');
      assert.equal(r.tween, 0, 'no pose tween');
      assert.equal(r.transition, '0s');
    }
    assert.deepEqual(page.errors, []);
    await context.close();
  }
});

// ---------------------------------------------------------------------------
// Alt text (SPEC.md 12, 15) on every page of both rounds, and on every
// consequence picture reached from it.

test('alt text on every scene page of both rounds', { skip, timeout: 180000 }, async () => {
  const context = await newContext(browser, {});
  const page = await newPage(context);
  const nodes = everyNodeState();
  assert.equal(nodes.length, 31);
  for (const { state, r1 } of nodes) {
    await open(page, { name: state.nodeId, save: save('scene', state, r1), resume: true, screen: 'scene' });
    const alt = await page.getAttribute('.scene-art', 'aria-label');
    assert.match(alt, /^Maya sits [^.]+, [^.]+\.$/, 'alt text on ' + state.nodeId);
    assert.equal(await page.getAttribute('.scene-art', 'role'), 'img');
    assert.equal(await page.getAttribute('.scene-art svg', 'aria-hidden'), 'true');
  }
  assert.deepEqual(page.errors, []);
  await context.close();
});

// ---------------------------------------------------------------------------
// The contrast harness catches what it should (so a pass means something).

test('contrast harness self-check: catches ochre text, vermilion body text, a weak glyph and a faint focus ring', { skip, timeout: 60000 }, async () => {
  const context = await newContext(browser, {});
  const page = await newPage(context);
  await open(page, { name: 'how', save: save('how', null), resume: true });
  await page.evaluate(() => {
    const p = document.querySelector('#app .page .narrow');
    p.insertAdjacentHTML('afterbegin', '<p id="bad1" style="color:#D9A21B">Ochre text on paper</p><p id="bad2" style="color:#D2401E;font-size:16px">Vermilion body text</p><p id="ok1" style="color:#D2401E;font-size:28px">Vermilion large text</p><p class="glyph-strip"><svg viewBox="0 0 16 16"><circle class="mk" cx="8" cy="8" r="6" style="stroke:#E6DCC6;fill:#E6DCC6"/></svg></p><button id="faint" style="outline:3px solid #E6DCC6">Faint</button>');
  });
  const r = await page.evaluate(pageAudit, { graphics: GRAPHICS });
  const texts = r.failures.map((f) => f.text);
  assert.ok(texts.includes('Ochre text on paper'));
  assert.ok(texts.includes('Vermilion body text'));
  assert.ok(!texts.includes('Vermilion large text'));
  assert.ok(r.failures.some((f) => f.kind === 'graphic'));
  await page.focus('#faint');
  const f = await page.evaluate(pageAudit, { focus: true });
  assert.ok(f.ratio < 3, 'faint focus ring measured at ' + f.ratio);
  await context.close();
});

// ---------------------------------------------------------------------------
// Print (debriefs only): paper-white, no decoration or buttons, both debriefs
// whole; any other screen prints a short note instead.

test('print stylesheet: debriefs print cleanly, other screens print a note', { skip, timeout: 120000 }, async () => {
  const context = await newContext(browser, {});
  const page = await newPage(context);
  mkdirSync(SHOTS, { recursive: true });
  for (const [which, st, r1] of [['1', R1_END.breakthrough, R1_END.breakthrough], ['2', R2_END.partial, R1_END.partial]]) {
    await open(page, { name: 'debrief' + which, save: save('debrief', st, r1), resume: true, screen: 'debrief' });
    await page.emulateMedia({ media: 'print' });
    const r = await page.evaluate(() => {
      const vis = (sel) => Array.from(document.querySelectorAll(sel)).filter((e) => e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden').length;
      return {
        body: getComputedStyle(document.body).backgroundColor,
        deco: vis('.deco'),
        buttons: vis('#app button'),
        sections: vis('.db-section'),
        traces: vis('.trace'),
        note: vis('.print-note'),
        avoid: getComputedStyle(document.querySelector('.path li')).breakInside
      };
    });
    assert.equal(r.body, 'rgb(255, 255, 255)');
    assert.equal(r.deco, 0, 'no decoration in print');
    assert.equal(r.buttons, 0, 'no buttons in print');
    assert.ok(r.sections >= (which === '1' ? 5 : 9), 'sections printed: ' + r.sections);
    assert.ok(r.traces >= 3);
    assert.equal(r.note, 0);
    assert.equal(r.avoid, 'avoid');
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    writeFileSync(join(SHOTS, 'print-debrief' + which + '.pdf'), pdf);
    await page.emulateMedia({ media: 'screen' });
  }
  await open(page, byName('r1-levers'));
  await page.emulateMedia({ media: 'print' });
  const other = await page.evaluate(() => ({
    page: getComputedStyle(document.querySelector('#app .page')).display,
    note: getComputedStyle(document.querySelector('.print-note')).display
  }));
  assert.equal(other.page, 'none');
  assert.notEqual(other.note, 'none');
  assert.deepEqual(page.errors, []);
  await context.close();
});

// ---------------------------------------------------------------------------
// Reply pages (every option turns to its own page) and the high-ownership note.

test('every option shows its own reply page; the consequence page carries it', { skip, timeout: 60000 }, async () => {
  const context = await newContext(browser, {});
  const page = await newPage(context);
  await open(page, byName('r1-levers'));
  const cards = await page.$$eval('[data-lever] .dest', (els) => els.map((e) => e.textContent));
  assert.equal(new Set(cards).size, 4, 'four different lever-card labels: ' + cards.join(', '));
  for (const c of cards) assert.match(c, /^→ p\. \d+ or \d+$/);
  await open(page, byName('r2-lines'));
  const lines = await page.$$eval('.line-option .dest', (els) => els.map((e) => e.textContent));
  assert.equal(new Set(lines).size, 4, 'four different line labels: ' + lines.join(', '));
  const first = lines[0];
  await page.click('.line-option[data-key="1"]');
  await page.click('[data-guess="question"]');
  assert.equal('→ p. ' + (await page.getAttribute('.runhead [data-page]', 'data-page')), first);
  assert.deepEqual(page.errors, []);
  await context.close();
});

test('a Polite exit with high ownership explains why it was not a Breakthrough', { skip, timeout: 60000 }, async () => {
  const context = await newContext(browser, {});
  const page = await newPage(context);
  await open(page, byName('debrief1-polite')); // ends with Ownership 65, Trust 42
  assert.equal(await page.locator('[data-ownership-note]').count(), 1);
  await open(page, byName('debrief1-early'));
  assert.equal(await page.locator('[data-ownership-note]').count(), 0);
  await context.close();
});
