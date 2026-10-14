// Monte Carlo calibration: runs scripted strategies over many seeds and
// checks the outcomes the teaching design depends on.
// Usage: node sales-sim/tests/calibrate.mjs [seeds]
import { SIM } from './load-engine.mjs';

const N = +(process.argv[2] || 200);
const S = (id, scope, cadence, extra) => Object.assign({ id, action: 'start', intensity: 0.75, scope, cadence, specificity: 0.85, owner: 'lead', quote: '' }, extra || {});

const vague = SIM.REFERENCE_LOG.map((e) => ({ starts: e.starts.map((s) => Object.assign({}, s, { specificity: 0.2, cadence: 'unspecified', owner: '' })) }));
const allAtOnce = [{ starts: SIM.ARCH.filter((a) => !a.trap).slice(0, 26).map((a) => S(a.id, a.scope, a.once ? 'once' : 'weekly')) }];
const traps = [
  { starts: [S('competition', 'office', 'weekly'), S('callquota', 'sdr', 'daily'), S('longhours', 'office', 'weekly'), S('shameboard', 'office', 'weekly')] },
  { starts: [S('pizza', 'office', 'weekly'), S('speaker', 'office', 'once')] },
  { starts: [S('culling', 'office', 'weekly')] },
];
const quitter = [
  { starts: SIM.REFERENCE_LOG[0].starts },
  { stops: SIM.REFERENCE_LOG[0].starts.filter((s) => s.id !== 'reseat').map((s) => s.id), starts: [S('competition', 'office', 'weekly'), S('training', 'office', 'weekly')] },
  { stops: ['training'], starts: [S('socials', 'office', 'monthly')] },
];

function randomLog(seed) {
  let a = 0; for (const c of String(seed)) a = (a * 31 + c.charCodeAt(0)) >>> 0;
  const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const log = [];
  for (let m = 0; m < 12; m++) {
    const starts = [];
    const k = m === 0 ? 3 + Math.floor(r() * 4) : (r() < 0.4 ? 1 + Math.floor(r() * 2) : 0);
    for (let i = 0; i < k; i++) {
      const a2 = SIM.ARCH[Math.floor(r() * SIM.ARCH.length)];
      starts.push(S(a2.id, a2.scope, a2.once ? 'once' : ['weekly', 'monthly', 'unspecified'][Math.floor(r() * 3)], { specificity: 0.2 + r() * 0.7 }));
    }
    log.push({ starts });
  }
  return log;
}

const strategies = {
  nothing: { log: () => [], choices: SIM.PASSIVE_CHOICES },
  reference: { log: () => SIM.REFERENCE_LOG, choices: SIM.REFERENCE_CHOICES },
  vague: { log: () => vague, choices: SIM.REFERENCE_CHOICES },
  allAtOnce: { log: () => allAtOnce, choices: SIM.REFERENCE_CHOICES },
  traps: { log: () => traps, choices: SIM.PASSIVE_CHOICES },
  quitter: { log: () => quitter, choices: { gsd: 2 } },
  random: { log: (s) => randomLog(s), choices: SIM.PASSIVE_CHOICES },
};

const k = (v) => (v / 1000).toFixed(0).padStart(4);
const results = {};
for (const [name, st] of Object.entries(strategies)) {
  const monthly = Array(12).fill(0); const cnt = Array(12).fill(0);
  let tot = 0, sdrL = 0, leav = 0, run = 0, g0 = 0, g1 = 0, fired = 0, months = 0;
  const totals = [];
  for (let i = 0; i < N; i++) {
    const seed = 'cal' + i;
    const g = SIM.replay(seed, st.log(seed), { choiceById: st.choices });
    g.hist.forEach((h, m) => { monthly[m] += h.revenue; cnt[m]++; });
    const t = SIM.totals(g);
    tot += t.revenue / t.months; sdrL += t.sdrLeavers / t.months; leav += t.leavers; run += t.runRate;
    g0 += t.giniStart; g1 += t.giniEnd; fired += t.fired ? 1 : 0; months += t.months;
    totals.push(t.revenue);
  }
  totals.sort((a, b) => a - b);
  results[name] = {
    monthly: monthly.map((v, m) => (cnt[m] ? v / cnt[m] : 0)),
    avg: tot / N, sdrPerMonth: sdrL / N, leavers: leav / N, runRate: run / N, gini0: g0 / N, gini1: g1 / N, fired: fired / N,
    p10: totals[Math.floor(N * 0.1)], p90: totals[Math.floor(N * 0.9)],
  };
  const r = results[name];
  console.log(name.padEnd(10), 'avg', k(r.avg), 'run', k(r.runRate), 'sdrL/mo', r.sdrPerMonth.toFixed(2), 'leavers', r.leavers.toFixed(1),
    'gini', r.gini0.toFixed(2), '->', r.gini1.toFixed(2), 'fired', (r.fired * 100).toFixed(0) + '%', 'total p10-p90', k(r.p10), '-', k(r.p90));
  console.log('           months', r.monthly.map(k).join(''));
}

const base = results.nothing;
const checks = [
  ['do-nothing averages 185-210k', base.avg > 185000 && base.avg < 210000],
  ['do-nothing loses 2-3 SDRs a month', base.sdrPerMonth >= 1.8 && base.sdrPerMonth <= 3],
  ['reference dips in month 1-2 (avg of m1-2 below do-nothing)', (results.reference.monthly[0] + results.reference.monthly[1]) < (base.monthly[0] + base.monthly[1])],
  ['reference final run-rate +15% or more vs do-nothing', results.reference.runRate > base.runRate * 1.15],
  ['reference roughly halves SDR churn', results.reference.sdrPerMonth < base.sdrPerMonth * 0.65],
  ['reference narrows distribution', results.reference.gini1 < base.gini1],
  ['traps bump early (m1-2 above do-nothing)', (results.traps.monthly[0] + results.traps.monthly[1]) > (base.monthly[0] + base.monthly[1])],
  ['traps end below do-nothing (last 3 months)', results.traps.runRate < base.runRate],
  ['traps raise churn', results.traps.leavers > base.leavers],
  ['vague plan clearly worse than specific plan', results.vague.runRate < results.reference.runRate * 0.93],
  ['doing everything at once is worse than sequencing', results.allAtOnce.avg < results.reference.avg],
  ['quitting early is worse than reference', results.quitter.avg < results.reference.avg],
  ['random play mostly near or below reference', results.random.runRate < results.reference.runRate],
];
let fail = 0;
for (const [label, ok] of checks) { console.log((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) fail++; }
process.exitCode = fail ? 1 : 0;
