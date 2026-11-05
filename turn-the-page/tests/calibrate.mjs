// Calibration report (SPEC.md 7.8). Enumerates every path through each
// round and checks every criterion. Run from turn-the-page/:
//   node tests/calibrate.mjs
// Exits 1 if any criterion fails. Other scripts (tests/export-review.mjs)
// import calibrate(caseData) to include the report.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createRound, applyChoice, carryOver, getNode } from '../src/engine.js';
import { MAYA } from '../src/content/maya.js';

const ENDINGS = ['breakthrough', 'partial', 'polite', 'early'];
const RANDOM_BREAKTHROUGH = [0.05, 0.20];
const RANDOM_EARLY = [0.05, 0.25];

// Depth-first walk of every path. Uniform random play picks each option at a
// decision with equal probability (in Round 1, a random lever then a random
// wording, which is the same as 1 in 8), so a path's probability is the
// product of 1/k over its decisions.
function enumerate(start, onLeaf) {
  const stats = { paths: 0, decisions: 0, maxLength: 0 };
  function walk(state, prob, levers, quals) {
    if (state.ending) {
      stats.paths++;
      stats.maxLength = Math.max(stats.maxLength, levers.length);
      onLeaf({ state, prob, levers, quals });
      return;
    }
    const options = getNode(state).options;
    const p = prob / options.length;
    for (const o of options) {
      stats.decisions++;
      walk(applyChoice(state, o.id), p, levers.concat([o.lever]), quals.concat([o.quality || 'skilful']));
    }
  }
  walk(start, 1, [], []);
  return stats;
}

// Run the criteria for one starting state.
function analyse(start, collect) {
  const count = {}, prob = {};
  for (const e of ENDINGS) { count[e] = 0; prob[e] = 0; }
  const triples = new Set();
  const singleLever = [];
  const quickExits = [];
  const stats = enumerate(start, (leaf) => {
    const e = leaf.state.ending;
    count[e]++;
    prob[e] += leaf.prob;
    if (e === 'breakthrough') {
      triples.add(leaf.levers.slice(0, 3).join('>'));
      if (leaf.levers.every((l) => l === leaf.levers[0])) singleLever.push(leaf.levers.join('>') + ' [' + leaf.quals.join(',') + ']');
    }
    if (e === 'early' && leaf.levers.length <= 3) {
      const risky = leaf.levers.filter((l, i) => l === 'challenge' || leaf.quals[i] === 'clumsy').length;
      if (risky < 2) quickExits.push(leaf.levers.map((l, i) => l + '/' + leaf.quals[i]).join(' > '));
    }
    if (collect) collect(leaf);
  });
  return { stats, count, prob, triples, singleLever, quickExits };
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
    a.singleLever.length ? a.singleLever.length + ' path(s), e.g. ' + a.singleLever[0] : 'none');
  const b = a.prob.breakthrough, e = a.prob.early;
  check(scope, 'random play: Breakthrough 5-20%', b >= RANDOM_BREAKTHROUGH[0] && b <= RANDOM_BREAKTHROUGH[1], pct(b));
  check(scope, 'random play: Early exit 5-25%', e >= RANDOM_EARLY[0] && e <= RANDOM_EARLY[1], pct(e));
  check(scope, 'Early exit within 3 decisions needs >= 2 Challenges or clumsy wordings', a.quickExits.length === 0,
    a.quickExits.length ? a.quickExits.length + ' path(s), e.g. ' + a.quickExits[0] : 'none');
}

function describe(scope, a) {
  const lines = ENDINGS.map((e) => '    ' + e.padEnd(13) + String(a.count[e]).padStart(9) + ' paths   ' + pct(a.prob[e]).padStart(6) + ' of random play');
  return '  ' + scope + ': ' + a.stats.paths + ' paths, longest ' + a.stats.maxLength + ' decisions\n' + lines.join('\n');
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
  const r1 = analyse(r1Start, (leaf) => {
    const c = carryOver(leaf.state);
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
