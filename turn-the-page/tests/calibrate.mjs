// Calibration report (SPEC.md 7.8). Covers every path through each round
// (memoised on the engine's futureKey) and checks every criterion. Run from turn-the-page/:
//   node tests/calibrate.mjs
// Exits 1 if any criterion fails. Other scripts (tests/export-review.mjs)
// import calibrate(caseData) to include the report.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { RULES, createRound, applyChoice, carryOver, getNode, futureKey } from '../src/engine.js';
import { MAYA } from '../src/content/maya.js';

const ENDINGS = ['breakthrough', 'partial', 'polite', 'early'];
// Round 1 (format B, 12 options) has a lower floor since session 6: random
// play picks the skilful wording 1 time in 3 (SPEC.md 7.8, Calibration log).
const RANDOM_BREAKTHROUGH = { B: [0.02, 0.20], C: [0.05, 0.20] };
const RANDOM_EARLY = [0.05, 0.25];
const ALL = () => true;

// Memoised walk (SPEC.md 7.8, method). Everything after a decision depends
// only on futureKey(state), so each key is solved once: the probability of
// each ending under uniform random play over the allowed options, the number
// of paths to each ending, and the longest remaining path. This is the same
// sum as walking every path, grouped by key, so the percentages are exact up
// to floating-point rounding order. `filter(option)` restricts the options
// (for strategy checks); `onFinal(state)` sees every distinct final state once.
export function solver(filter, onFinal) {
  const f = filter || ALL;
  const memo = new Map();
  function solve(state) {
    const key = futureKey(state);
    const hit = memo.get(key);
    if (hit) return hit;
    let r;
    if (state.ending) {
      r = { prob: {}, count: {}, depth: 0 };
      for (const e of ENDINGS) { r.prob[e] = e === state.ending ? 1 : 0; r.count[e] = e === state.ending ? 1 : 0; }
      if (onFinal) onFinal(state);
    } else {
      const options = getNode(state).options.filter(f);
      if (!options.length) throw new Error('No options left at ' + state.nodeId);
      r = { prob: {}, count: {}, depth: 0 };
      for (const e of ENDINGS) { r.prob[e] = 0; r.count[e] = 0; }
      for (const o of options) {
        const c = solve(applyChoice(state, o.id));
        for (const e of ENDINGS) { r.prob[e] += c.prob[e] / options.length; r.count[e] += c.count[e]; }
        r.depth = Math.max(r.depth, c.depth + 1);
      }
    }
    memo.set(key, r);
    return r;
  }
  solve.size = () => memo.size;
  return solve;
}

// Every path prefix of up to `n` decisions (shorter if the round ends first).
function prefixes(start, n, filter) {
  const out = [];
  (function walk(state, levers, quals) {
    if (state.ending || levers.length === n) { out.push({ state, levers, quals }); return; }
    for (const o of getNode(state).options.filter(filter || ALL)) walk(applyChoice(state, o.id), levers.concat([o.lever]), quals.concat([o.quality || 'skilful']));
  })(start, [], []);
  return out;
}

// Brute force: walk every path. Kept for the cross-check test (engine.test.mjs
// compares it with the memoised walk where full enumeration is feasible).
export function bruteForce(start, filter) {
  const prob = {}, count = {};
  for (const e of ENDINGS) { prob[e] = 0; count[e] = 0; }
  (function walk(state, p) {
    if (state.ending) { prob[state.ending] += p; count[state.ending]++; return; }
    const options = getNode(state).options.filter(filter || ALL);
    for (const o of options) walk(applyChoice(state, o.id), p / options.length);
  })(start, 1);
  return { prob, count };
}

// Run the criteria for one starting state.
export function analyse(start, onFinal) {
  const solve = solver(ALL, onFinal);
  const top = solve(start);
  const stats = { paths: ENDINGS.reduce((n, e) => n + top.count[e], 0), maxLength: top.depth, keys: solve.size() };
  // First three decisions explicitly; reachability below from the memo.
  const triples = new Set();
  const quickExits = [];
  for (const pre of prefixes(start, 3)) {
    if (solve(pre.state).count.breakthrough > 0) triples.add(pre.levers.join('>'));
    if (pre.state.ending === 'early') {
      const risky = pre.levers.filter((l, i) => l === 'challenge' || pre.quals[i] === 'clumsy').length;
      if (risky < 2) quickExits.push(pre.levers.map((l, i) => l + '/' + pre.quals[i]).join(' > '));
    }
  }
  // Single-lever strategies (any wording of that lever).
  const singleLever = [];
  for (const l of RULES.levers) {
    const r = solver((o) => o.lever === l)(start);
    if (r.count.breakthrough) singleLever.push(r.count.breakthrough + ' path(s) of only ' + l);
  }
  // Round 1 only: wording-quality strategies (SPEC.md 7.8, session 6).
  let byQuality = null;
  if (RULES.qualities.every((q) => getNode(start).options.some((o) => o.quality === q))) {
    byQuality = {};
    for (const q of RULES.qualities) byQuality[q] = solver((o) => o.quality === q)(start);
  }
  return { stats, count: top.count, prob: top.prob, triples, singleLever, quickExits, byQuality };
}

const pct = (x) => (100 * x).toFixed(1) + '%';

function criteria(check, scope, a, includeReachability) {
  if (includeReachability) {
    const missing = ENDINGS.filter((e) => a.count[e] === 0);
    check(scope, 'every ending reachable', missing.length === 0, missing.length ? 'unreachable: ' + missing.join(', ') : 'all four reached');
  }
  check(scope, 'Breakthrough by >= 3 paths with different first three levers', a.triples.size >= 3,
    a.triples.size + ' distinct opening triple(s)' + (a.triples.size ? ': ' + [...a.triples].slice(0, 5).join('; ') + (a.triples.size > 5 ? '; ...' : '') : ''));
  check(scope, 'no single-lever strategy reaches Breakthrough', a.singleLever.length === 0,
    a.singleLever.length ? a.singleLever.join('; ') : 'none');
  const b = a.prob.breakthrough, e = a.prob.early;
  const rb = RANDOM_BREAKTHROUGH[a.byQuality ? 'B' : 'C'];
  check(scope, 'random play: Breakthrough ' + rb[0] * 100 + '-' + rb[1] * 100 + '%', b >= rb[0] && b <= rb[1], pct(b));
  check(scope, 'random play: Early exit 5-25%', e >= RANDOM_EARLY[0] && e <= RANDOM_EARLY[1], pct(e));
  check(scope, 'Early exit within 3 decisions needs >= 2 Challenges or clumsy wordings', a.quickExits.length === 0,
    a.quickExits.length ? a.quickExits.length + ' path(s), e.g. ' + a.quickExits[0] : 'none');
  if (a.byQuality) {
    const q = a.byQuality;
    check(scope, 'no strategy of only plausible wordings reaches Breakthrough', q.plausible.count.breakthrough === 0,
      q.plausible.count.breakthrough ? q.plausible.count.breakthrough + ' path(s)' : 'none (best ending reached: ' + ENDINGS.filter((e) => q.plausible.count[e]).join(', ') + ')');
    const good = (k) => q[k].prob.breakthrough + q[k].prob.partial;
    const line = (m) => RULES.qualities.map((k) => k + ' ' + pct(m === 'good' ? good(k) : q[k].prob[m])).join(', ');
    check(scope, 'one-quality random play: Breakthrough or Partial falls skilful > plausible > clumsy',
      good('skilful') > good('plausible') && good('plausible') > good('clumsy'), line('good'));
    check(scope, 'one-quality random play: Early exit rises skilful < plausible < clumsy',
      q.skilful.prob.early < q.plausible.prob.early && q.plausible.prob.early < q.clumsy.prob.early, line('early'));
  }
}

function describe(scope, a) {
  const lines = ENDINGS.map((e) => '    ' + e.padEnd(13) + String(a.count[e]).padStart(9) + ' paths   ' + pct(a.prob[e]).padStart(6) + ' of random play');
  return '  ' + scope + ': ' + a.stats.paths + ' paths (' + a.stats.keys + ' distinct states), longest ' + a.stats.maxLength + ' decisions\n' + lines.join('\n');
}

// Run every criterion for a case. Returns the printable report, the list of
// checks and the number failed.
export function calibrate(caseData) {
  const results = [];
  const check = (scope, name, pass, detail) => results.push({ scope, name, pass, detail });
  // --- Round 1 ---------------------------------------------------------------
  const t0 = Date.now();
  const r1Start = createRound(caseData, 'r1', null, 1);
  const carries = {};
  for (const e of ENDINGS) carries[e] = new Map();
  const r1 = analyse(r1Start, (state) => {
    const c = carryOver(state);
    carries[c.from].set(JSON.stringify(c), c);
  });
  const out = ['Turn the Page — calibration report (SPEC.md 7.8)', 'Case: ' + caseData.id, '', describe('Round 1', r1)];
  criteria(check, 'Round 1', r1, true);

  // --- Round 2 ---------------------------------------------------------------
  // Round 2 starting states differ with Round 1's final meters. For each
  // Round 1 ending, every criterion uses the median carry-over; reachability
  // is also checked from the lowest and highest Trust carry-over.
  function pick(list) {
    const sorted = list.slice().sort((a, b) => a.meters.trust - b.meters.trust || a.meters.confidence - b.meters.confidence);
    const chosen = { median: sorted[Math.floor((sorted.length - 1) / 2)], lowest: sorted[0], highest: sorted[sorted.length - 1] };
    return chosen;
  }

  out.push('');
  for (const from of ENDINGS) {
    const list = [...carries[from].values()];
    const scope = 'Round 2 after ' + from;
    if (!list.length) {
      out.push('  ' + scope + ': not testable (Round 1 never ends in ' + from + ')');
      check(scope, 'every ending reachable', false, 'opening not reachable from Round 1');
      continue;
    }
    const chosen = pick(list);
    const median = analyse(createRound(caseData, 'r2', chosen.median, 1));
    out.push(describe(scope + ' (median carry ' + JSON.stringify(chosen.median.meters) + ', ' + list.length + ' distinct)', median));
    const missing = new Set(ENDINGS.filter((e) => median.count[e] === 0));
    for (const which of ['lowest', 'highest']) {
      if (chosen[which] === chosen.median) continue;
      const a = analyse(createRound(caseData, 'r2', chosen[which], 1));
      for (const e of ENDINGS) if (a.count[e] === 0) missing.add(e + ' (' + which + ' Trust carry)');
    }
    check(scope, 'every ending reachable', missing.size === 0, missing.size ? 'unreachable: ' + [...missing].join(', ') : 'all four reached');
    criteria(check, scope, median, false);
  }

  // --- Report ----------------------------------------------------------------
  out.push('', 'Criteria:');
  for (const r of results) out.push('  ' + (r.pass ? 'PASS' : 'FAIL') + '  ' + r.scope + ': ' + r.name + ' — ' + r.detail);
  const failed = results.filter((r) => !r.pass).length;
  out.push('', (failed ? 'FAILED ' + failed + ' of ' : 'PASSED all ') + results.length + ' checks in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's.');
  return { text: out.join('\n'), results, failed };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = calibrate(MAYA);
  console.log(report.text);
  process.exitCode = report.failed ? 1 : 0;
}
