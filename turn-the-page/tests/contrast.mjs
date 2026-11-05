// WCAG AA contrast walk (SPEC.md 11.1 and 15). Run from turn-the-page/ after
// `node build.mjs`:  node tests/contrast.mjs
//
// Opens every state in the screen catalogue (tests/states.mjs) at 1440x900
// and 390x844 and checks every visible text node, the summary text field and
// the graphics that carry meaning on their own (WCAG 1.4.11). Exits 1 on any
// failure and prints each one with its colours and ratio. Also exports
// runContrast() for a11y.test.mjs.
import { fileURLToPath } from 'node:url';
import { loadChromium, catalogue, newContext, newPage, open } from './states.mjs';
import { pageAudit } from './wcag.mjs';

// Graphics read on their own, without a text label beside them.
export const GRAPHICS = ['.glyph-strip .mk', '.tr-mark .mk', '.cb', '.seg.on'];
const SIZES = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];

export async function runContrast(browser, log) {
  const all = catalogue();
  const failures = [];
  const pairs = {};
  let checked = 0;
  for (const size of SIZES) {
    for (const motion of [false, true]) {
      const entries = all.filter((e) => !!e.motion === motion);
      const plain = entries.filter((e) => !e.blockStorage);
      const blocked = entries.filter((e) => e.blockStorage);
      for (const [group, block] of [[plain, false], [blocked, true]]) {
        if (!group.length) continue;
        const context = await newContext(browser, { viewport: size, motion, blockStorage: block });
        const page = await newPage(context);
        for (const entry of group) {
          await open(page, entry);
          const r = await page.evaluate(pageAudit, { graphics: GRAPHICS });
          checked += r.checked;
          Object.entries(r.pairs).forEach(([k, v]) => {
            const p = pairs[k] || (pairs[k] = { min: Infinity, n: 0, large: true });
            p.n += v.n; p.min = Math.min(p.min, v.min); p.large = p.large && v.large;
          });
          r.failures.forEach((f) => failures.push(Object.assign({ state: entry.name, size: size.width }, f)));
          if (page.errors.length) failures.push({ state: entry.name, size: size.width, kind: 'error', text: page.errors.join('; ') });
          if (log) log(entry.name + ' @' + size.width + ': ' + r.checked + ' checked, ' + r.failures.length + ' below AA');
        }
        await context.close();
      }
    }
  }
  return { states: all.length * SIZES.length, checked, failures, pairs };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const chromium = loadChromium();
  if (!chromium) {
    console.error('playwright is not available');
    process.exit(1);
  }
  const verbose = process.argv.includes('--verbose');
  const browser = await chromium.launch();
  const t0 = Date.now();
  const r = await runContrast(browser, verbose ? console.log : null);
  await browser.close();
  console.log('\nColour pairs measured (text on background, lowest ratio seen):');
  Object.entries(r.pairs).sort((a, b) => a[1].min - b[1].min).forEach(([k, v]) => {
    console.log('  ' + k.padEnd(22) + ' ' + v.min.toFixed(2).padStart(6) + (v.large ? '  (large text or graphic only)' : '') + '  x' + v.n);
  });
  if (r.failures.length) {
    console.log('\nBelow WCAG AA:');
    r.failures.forEach((f) => console.log('  FAIL ' + f.state + ' @' + f.size + ' [' + f.kind + '] ' + (f.ratio ? f.fg + ' on ' + f.bg + ' ' + f.ratio + ' < ' + f.need + ' ' : '') + JSON.stringify(f.text) + (f.where ? ' at ' + f.where : '')));
  }
  console.log('\n' + (r.failures.length ? 'FAILED' : 'PASSED') + ': ' + r.checked + ' text nodes and graphics in ' + r.states + ' screen states, ' + r.failures.length + ' below AA, in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's.');
  process.exit(r.failures.length ? 1 : 0);
}
