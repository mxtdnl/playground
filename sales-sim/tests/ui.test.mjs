// End-to-end check of the built page in Chromium: plays 12 months, checks for
// console errors, and saves screenshots.
// Usage: node sales-sim/tests/ui.test.mjs [screenshot-dir]
// Needs Playwright; set PLAYWRIGHT_MODULE if it is not resolvable normally.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const page_url = pathToFileURL(fileURLToPath(new URL('../index.html', import.meta.url))).href;
const outDir = process.argv[2] || fileURLToPath(new URL('./screenshots/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const plans = [
  'Move the SDRs to sit with the closers. Every Friday Dan runs a call review for the whole floor, and we track meetings booked per SDR. Pay everyone more.',
  'Kate holds weekly 1:1s with every SDR covering development, and new SDRs shadow Priya twice a week.',
  'Redesign the interview process with a role-play and a realistic job preview.',
  '', '', 'Run a weekly sales competition with a prize.', '', '', '', '', '', '',
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const errors = [];
for (const scheme of ['light', 'dark']) {
  for (const vp of [{ width: 1360, height: 900, name: 'desktop' }, { width: 400, height: 860, name: 'phone' }]) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(`${scheme}/${vp.name}: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`${scheme}/${vp.name}: ${e.message}`));
    await page.goto(page_url);
    await page.waitForSelector('#start-btn');
    if (scheme === 'light') await page.screenshot({ path: `${outDir}/brief-${vp.name}.png`, fullPage: true });
    await page.fill('#team-name', 'Test group');
    await page.fill('#seed', '4242');
    await page.check('#facilitator');
    await page.click('#start-btn');
    for (let m = 0; m < 12; m++) {
      if (await page.locator('input[name="ev"]').count()) await page.locator('input[name="ev"]').first().check();
      if (plans[m]) {
        await page.fill('#plan-text', plans[m]);
        await page.click('#read-btn');
        await page.waitForSelector('#interp .items, #interp .oos', { timeout: 5000 });
        if (m === 0) await page.screenshot({ path: `${outDir}/plan-${scheme}-${vp.name}.png`, fullPage: true });
      }
      if (m === 4) await page.check('#survey');
      await page.click('#run-btn');
      if (m === 2) await page.screenshot({ path: `${outDir}/month3-${scheme}-${vp.name}.png`, fullPage: true });
    }
    await page.waitForSelector('#screen-debrief .hero-stats', { timeout: 20000 });
    await page.screenshot({ path: `${outDir}/debrief-${scheme}-${vp.name}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) errors.push(`${scheme}/${vp.name}: page scrolls horizontally by ${overflow}px`);
    await ctx.close();
  }
}
await browser.close();
if (errors.length) { console.log('FAIL\n' + errors.join('\n')); process.exitCode = 1; }
else console.log('PASS: 12 months played in light/dark at desktop and phone width; screenshots in ' + outDir);
