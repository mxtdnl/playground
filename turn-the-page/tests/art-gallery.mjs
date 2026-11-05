// Art gallery (SPEC.md 12): renders every posture state, a sample of page
// overrides, every value of every pose parameter and two interpolation
// midpoints to tests/screenshots/art/, at the desktop scene width (540px)
// and the phone scene width (352px, from a 390px viewport).
//
// Run from turn-the-page/: `node tests/art-gallery.mjs`. Not part of
// `node --test`; it exits 1 if a geometry check fails. It also writes
// contact sheets (all postures side by side) so differences can be compared.
//
// Playwright and Chromium are preinstalled in cloud sessions; do not install
// another version.
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POSTURES, POSE_PARAMS, postureFor, renderScene, sceneVector, lerpScene, drawScene } from '../src/art.js';
import { MAYA } from '../src/content/maya.js';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'screenshots', 'art');
const WIDTHS = [540, 352];
const BIAS = MAYA.profile.poseBias;

// Meters that land in each posture state for Maya's profile.
const METERS = {
  closed: { trust: 14, confidence: 14, ownership: 15 },
  guarded: { trust: 35, confidence: 30, ownership: 15 },
  neutral: { trust: 50, confidence: 42, ownership: 30 },
  open: { trust: 60, confidence: 50, ownership: 40 },
  animated: { trust: 70, confidence: 60, ownership: 50 }
};

const items = [];
const fails = [];
const add = (name, state, group) => items.push({ name, group, state: Object.assign({ poseBias: BIAS, round: 'r1', step: 0 }, state) });

for (const p of POSTURES) add('posture-' + p, { meters: METERS[p] }, 'postures');
for (const p of POSTURES) add('posture-' + p + '-r2', { meters: METERS[p], round: 'r2', step: 3 }, 'postures-r2');

// Page overrides: a sample of authored scene hints, on the meters of that moment.
const sample = [
  ['r1', 'r1-01', 'guarded', 0], ['r1', 'r1-04b', 'guarded', 3], ['r1', 'r1-05', 'neutral', 4],
  ['r2', 'r2-01b', 'guarded', 0], ['r2', 'r2-04a', 'open', 3], ['r2', 'r2-06a', 'animated', 5]
];
for (const [round, id, posture, step] of sample) {
  const node = MAYA.rounds[round].nodes[id];
  if (!node) { fails.push('no node ' + id); continue; }
  add('override-' + id, { meters: METERS[posture], pose: (node.scene || {}).pose, round, step }, 'overrides');
}
// Consequence pictures: an option's pose hints over the posture from the meters after the choice.
const consequences = [['r1', 'r1-01', 'c-c', 'closed'], ['r1', 'r1-04a', 'c-c', 'guarded'], ['r2', 'r2-04a', 'q', 'animated']];
for (const [round, id, oid, posture] of consequences) {
  const node = MAYA.rounds[round].nodes[id];
  const o = node && node.options.find((x) => x.id === oid);
  if (!o || !o.pose) { fails.push('no pose hint on ' + id + '/' + oid); continue; }
  add('consequence-' + id + '-' + oid, { meters: METERS[posture], pose: o.pose, props: o.pose.props || (node.scene.pose || {}).props || [], round, step: 3 }, 'consequences');
}
// Every value of every parameter, over the neutral posture.
for (const [param, values] of Object.entries(POSE_PARAMS)) {
  for (const v of values) add('param-' + param + '-' + v, { meters: METERS.neutral, pose: { [param]: v } }, 'params-' + param);
}

// Geometry checks: limbs stay attached and keep plausible lengths.
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
for (const it of items) {
  const v = sceneVector(it.state);
  const segs = { upper1: dist(v.lx, v.ly, v.e1x, v.e1y), fore1: dist(v.e1x, v.e1y, v.h1x, v.h1y), upper2: dist(v.rx, v.ry, v.e2x, v.e2y), fore2: dist(v.e2x, v.e2y, v.h2x, v.h2y) };
  for (const [k, d] of Object.entries(segs)) if (d < 16 || d > 44) fails.push(it.name + ': ' + k + ' length ' + d.toFixed(1));
  if (v.cy + 21 > v.sy + 4) fails.push(it.name + ': head sits below the shoulders');
  if (v.h1x < 0 || v.h1x > 400 || v.cx - 21 < 0) fails.push(it.name + ': outside the frame');
}
for (const p of POSTURES) {
  const got = postureFor(METERS[p], BIAS);
  if (got !== p) fails.push('meters for ' + p + ' give ' + got);
}

let chromium = null;
try { chromium = createRequire(import.meta.url)('playwright').chromium; } catch (e) { chromium = null; }

const page = (svg, w) => '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#F3ECDC}div{width:' + w + 'px;border:3px solid #1C1F33;box-sizing:border-box}svg{display:block;width:100%;height:auto}</style><div>' + svg + '</div>';
const sheet = (cells, w) => '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#F3ECDC;font:700 13px system-ui,sans-serif;color:#1C1F33}main{display:grid;grid-template-columns:repeat(' + Math.min(cells.length, 3) + ',' + w + 'px);gap:14px;padding:14px}figure{margin:0}div{border:3px solid #1C1F33}svg{display:block;width:100%;height:auto}figcaption{padding:6px 0;text-transform:uppercase;letter-spacing:.1em}p{font:400 12px Georgia,serif;margin:0;text-transform:none;letter-spacing:0}</style><main>' +
  cells.map((c) => '<figure><div>' + c.svg + '</div><figcaption>' + c.label + '<p>' + c.alt + '</p></figcaption></figure>').join('') + '</main>';

if (!chromium) {
  console.log('playwright is not available: geometry checks only');
} else {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1400, height: 900 } });
  const pg = await ctx.newPage();
  for (const it of items) {
    const art = renderScene(it.state);
    for (const w of WIDTHS) {
      await pg.setContent(page(art.svg, w));
      await pg.locator('div').screenshot({ path: join(OUT, it.name + '-' + w + '.png') });
    }
    console.log(it.name.padEnd(30) + art.posture.padEnd(10) + art.alt);
  }
  // Interpolation midpoints (0.4s tween in the interface).
  const mid = [['closed', 'animated'], ['guarded', 'open']];
  for (const [a, b] of mid) {
    const va = sceneVector({ meters: METERS[a], poseBias: BIAS, round: 'r1', step: 2 });
    const vb = sceneVector({ meters: METERS[b], poseBias: BIAS, round: 'r1', step: 3 });
    const cells = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ svg: drawScene(lerpScene(va, vb, t)), label: a + ' → ' + b + ' t=' + t, alt: '' }));
    await pg.setContent(sheet(cells, 260));
    await pg.locator('main').screenshot({ path: join(OUT, 'sheet-tween-' + a + '-' + b + '.png') });
  }
  // Contact sheets.
  const groups = [...new Set(items.map((i) => i.group))];
  for (const g of groups) {
    const cells = items.filter((i) => i.group === g).map((i) => { const r = renderScene(i.state); return { svg: r.svg, label: i.name.replace(/^(posture|override|param)-/, ''), alt: r.alt }; });
    for (const w of [352]) {
      await pg.setContent(sheet(cells, w));
      await pg.locator('main').screenshot({ path: join(OUT, 'sheet-' + g + '.png') });
    }
  }
  await browser.close();
}

if (fails.length) {
  console.error('FAIL\n' + fails.join('\n'));
  process.exit(1);
}
console.log('art gallery: ' + items.length + ' scenes, geometry checks pass' + (chromium ? '; images in tests/screenshots/art/' : ''));
