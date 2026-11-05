// Unit tests for src/engine.js. Each rule in SPEC.md section 7 (and the
// carry-over in 9.2) has at least one test. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RULES, computeDeltas, createRound, optionsFor, applyChoice, checkEnding,
  carryOver, shuffle, roundHalfAway, resolveRoute, reactionFor, registerCase, futureKey
} from '../src/engine.js';

const MID = { confidence: 'mid', extraversion: 'mid', defensiveness: 'mid', readiness: 'mid' };

// computeDeltas with neutral defaults: mid traits, Trust 60, Act 2, no history.
function d(lever, opts) {
  const o = Object.assign({ quality: 'skilful', trust: 60, act: 2, traits: {}, history: [], override: undefined }, opts);
  return computeDeltas({
    lever: lever, quality: o.quality, act: o.act, history: o.history, override: o.override,
    meters: { trust: o.trust, confidence: 40, ownership: 40 },
    traits: Object.assign({}, MID, o.traits)
  }).delta;
}

const h = (lever) => ({ lever: lever });

// A test case: `n` nodes in a chain, each with all twelve Round 1 options
// (ids like 'question-skilful'), or a format C round.
function makeCase(opts) {
  const o = Object.assign({ id: 'test', n: 3, acts: [1, 2, 3], traits: {}, start: { trust: 60, confidence: 40, ownership: 40 } }, opts);
  const nodes = {};
  for (let i = 0; i < o.n; i++) {
    const options = [];
    for (const lever of RULES.levers) {
      for (const quality of RULES.qualities) {
        options.push({ id: lever + '-' + quality, lever, quality, text: lever, reaction: { default: 'r', 'confidence:low': 'low-r' }, debrief: 'd' });
      }
    }
    nodes['n' + i] = { page: i + 1, act: o.acts[i] || 3, line: 'l', cue: 'c', next: i + 1 < o.n ? 'n' + (i + 1) : null, options };
  }
  const c4 = {
    page: 99, act: 1, line: 'l', cue: 'c', next: null,
    options: RULES.levers.map((lever) => ({ id: lever, lever, text: lever, reaction: { default: 'r' }, debrief: 'd' }))
  };
  return {
    id: o.id, version: 1,
    profile: { name: 'T', age: 16, traits: Object.assign({}, MID, o.traits), start: o.start },
    rounds: {
      r1: { format: 'B', start: 'n0', nodes, endings: {} },
      r2: { format: 'C', starts: { breakthrough: 'c0', partial: 'c0', polite: 'c0', early: 'c0' }, nodes: { c0: c4 }, endings: {} }
    }
  };
}

// --- 7.1 formula and rounding ------------------------------------------------

test('7.1 rounding is half away from zero and never gives -0', () => {
  assert.equal(roundHalfAway(2.5), 3);
  assert.equal(roundHalfAway(-2.5), -3);
  assert.equal(roundHalfAway(-0.2), 0);
  assert.ok(Object.is(roundHalfAway(-0.2), 0));
});

// --- 7.2 base effects --------------------------------------------------------

test('7.2 base effects of skilful levers (neutral state)', () => {
  for (const lever of RULES.levers) assert.deepEqual(d(lever), RULES.base[lever], lever);
  assert.deepEqual(d('question'), { trust: 3, confidence: 1, ownership: 6 });
  assert.deepEqual(d('support'), { trust: 7, confidence: 5, ownership: 0 });
  assert.deepEqual(d('observe'), { trust: 2, confidence: 2, ownership: 4 });
  assert.deepEqual(d('challenge'), { trust: -4, confidence: 2, ownership: 9 });
});

test('7.2 plausible wording: positives x 0.7, then Trust -1 (session 6 initial value)', () => {
  const w = RULES.wording.plausible;
  for (const lever of RULES.levers) {
    const b = RULES.base[lever];
    const want = {};
    for (const m of RULES.meters) want[m] = roundHalfAway((b[m] > 0 ? b[m] * w.positiveFactor : b[m]) + (m === 'trust' ? w.trustPenalty : 0));
    assert.deepEqual(d(lever, { quality: 'plausible' }), want, lever);
  }
});

test('7.2 wording quality orders skilful >= plausible >= clumsy on every meter (neutral state)', () => {
  for (const lever of RULES.levers) {
    const [s, p, c] = RULES.qualities.map((q) => d(lever, { quality: q }));
    for (const m of RULES.meters) assert.ok(s[m] >= p[m] && p[m] >= c[m], lever + ' ' + m);
  }
});

test('7.8 futureKey: same node, meters and capped run give the same key', () => {
  const c = makeCase({ id: 'fk', n: 6 });
  let a = createRound(c, 'r1', null, 1);
  let b = createRound(c, 'r1', null, 2);
  a = applyChoice(applyChoice(a, 'question-skilful'), 'support-clumsy');
  b = applyChoice(applyChoice(b, 'question-clumsy'), 'support-skilful');
  // Different quality history, different meters: keys differ only through meters.
  assert.notEqual(futureKey(a), futureKey(b));
  const x = Object.assign({}, a, { history: a.history.concat([{ lever: 'support' }, { lever: 'support' }]) });
  const y = Object.assign({}, a, { history: a.history.concat([{ lever: 'support' }, { lever: 'support' }, { lever: 'support' }]) });
  assert.equal(futureKey(x), futureKey(y), 'run length is capped at streakLength - 1');
  assert.ok(futureKey(x).endsWith('|support:' + (RULES.repetition.streakLength - 1) + '|'));
});

test('7.2 clumsy wording: positives x 0.4, then Trust -2 (calibrated from -3, SPEC.md calibration log)', () => {
  assert.equal(RULES.wording.clumsy.trustPenalty, -2);
  // Question: 3*0.4-2 = -0.8, 1*0.4 = 0.4, 6*0.4 = 2.4
  assert.deepEqual(d('question', { quality: 'clumsy' }), { trust: -1, confidence: 0, ownership: 2 });
  // Support: 7*0.4-2 = 0.8, 5*0.4 = 2, 0
  assert.deepEqual(d('support', { quality: 'clumsy' }), { trust: 1, confidence: 2, ownership: 0 });
  // Challenge: -4 (negative, untouched) -2 = -6, 0.8, 3.6
  assert.deepEqual(d('challenge', { quality: 'clumsy' }), { trust: -6, confidence: 1, ownership: 4 });
});

// --- 7.3 state rules ---------------------------------------------------------

test('7.3 Challenge with Trust < 50 replaces the base row (Trust -5, calibrated from -10)', () => {
  assert.deepEqual(d('challenge', { trust: 49 }), { trust: -5, confidence: -5, ownership: 2 });
  assert.deepEqual(d('challenge', { trust: 50 }), RULES.base.challenge);
});

test('7.3 Observe with Trust < 40 costs Trust 2 instead of gaining 2', () => {
  assert.deepEqual(d('observe', { trust: 39 }), { trust: -2, confidence: 2, ownership: 4 });
  assert.deepEqual(d('observe', { trust: 40 }), { trust: 2, confidence: 2, ownership: 4 });
});

test('7.3 Support with Trust >= 70 costs Ownership 2', () => {
  assert.deepEqual(d('support', { trust: 70 }), { trust: 7, confidence: 5, ownership: -2 });
  assert.deepEqual(d('support', { trust: 69 }), { trust: 7, confidence: 5, ownership: 0 });
});

// --- 7.4 repetition ----------------------------------------------------------

test('7.4 second consecutive use is unchanged', () => {
  assert.deepEqual(d('observe', { history: [h('observe')] }), RULES.base.observe);
});

test('7.4 third consecutive use halves positive effects', () => {
  // Observe: 1, 1, 2
  assert.deepEqual(d('observe', { history: [h('observe'), h('observe')] }), { trust: 1, confidence: 1, ownership: 2 });
  // Challenge: negative Trust is not halved: -4, 1, 4.5 -> 5
  assert.deepEqual(d('challenge', { history: [h('challenge'), h('challenge')] }), { trust: -4, confidence: 1, ownership: 5 });
});

test('7.4 three Questions in a row also cost Trust 3', () => {
  // 1.5-3 = -1.5 -> -2; 0.5 -> 1; 3
  assert.deepEqual(d('question', { history: [h('question'), h('question')] }), { trust: -2, confidence: 1, ownership: 3 });
});

test('7.4 three Supports in a row also cost Ownership 3', () => {
  // 3.5 -> 4; 2.5 -> 3; 0-3
  assert.deepEqual(d('support', { history: [h('support'), h('support')] }), { trust: 4, confidence: 3, ownership: -3 });
});

test('7.4 the streak continues beyond three and resets on a different lever', () => {
  assert.deepEqual(d('question', { history: [h('question'), h('question'), h('question')] }), { trust: -2, confidence: 1, ownership: 3 });
  assert.deepEqual(d('question', { history: [h('question'), h('support'), h('question')] }), RULES.base.question);
});

// --- 7.5 trait multipliers ---------------------------------------------------

test('7.5 confidence low: Support Confidence gain x 1.5 in Act 1 only', () => {
  assert.equal(d('support', { traits: { confidence: 'low' }, act: 1 }).confidence, 8); // 7.5
  assert.equal(d('support', { traits: { confidence: 'low' }, act: 2 }).confidence, 5);
});

test('7.5 confidence low: Challenge Trust cost x 1.5 (also on the state-rule row)', () => {
  assert.equal(d('challenge', { traits: { confidence: 'low' } }).trust, -6);
  assert.equal(d('challenge', { traits: { confidence: 'low' }, trust: 40 }).trust, -8); // -5 x 1.5 = -7.5
});

test('7.5 confidence high: Support Confidence x 0.5; Challenge Ownership x 1.3', () => {
  assert.equal(d('support', { traits: { confidence: 'high' } }).confidence, 3); // 2.5
  assert.equal(d('challenge', { traits: { confidence: 'high' } }).ownership, 12); // 11.7
});

test('7.5 extraversion low: Question Ownership x 0.7 while Trust < 50', () => {
  assert.equal(d('question', { traits: { extraversion: 'low' }, trust: 49 }).ownership, 4); // 4.2
  assert.equal(d('question', { traits: { extraversion: 'low' }, trust: 50 }).ownership, 6);
});

test('7.5 extraversion low: Observe gains x 1.3', () => {
  assert.deepEqual(d('observe', { traits: { extraversion: 'low' } }), { trust: 3, confidence: 3, ownership: 5 }); // 2.6, 2.6, 5.2
  // A cost is not a gain: Observe before trust keeps -2.
  assert.equal(d('observe', { traits: { extraversion: 'low' }, trust: 30 }).trust, -2);
});

test('7.5 extraversion high: Question Ownership x 1.3', () => {
  assert.equal(d('question', { traits: { extraversion: 'high' } }).ownership, 8); // 7.8
});

test('7.5 defensiveness high: Trust costs from Challenge and Observe x 1.5', () => {
  assert.equal(d('challenge', { traits: { defensiveness: 'high' } }).trust, -6);
  assert.equal(d('observe', { traits: { defensiveness: 'high' }, trust: 30 }).trust, -3);
  assert.equal(d('observe', { traits: { defensiveness: 'high' } }).trust, 2); // a gain is untouched
});

test('7.5 readiness low: Ownership gain capped at +6 per decision in Act 1', () => {
  assert.equal(d('challenge', { traits: { readiness: 'low' }, act: 1 }).ownership, 6);
  assert.equal(d('challenge', { traits: { readiness: 'low' }, act: 1, override: { ownership: 3 } }).ownership, 6);
  assert.equal(d('challenge', { traits: { readiness: 'low' }, act: 2 }).ownership, 9);
});

test('7.5 mid bands are neutral', () => {
  for (const lever of RULES.levers) assert.deepEqual(d(lever, { act: 1 }), RULES.base[lever]);
});

// --- 7.6 node overrides ------------------------------------------------------

test('7.6 overrides are added after multipliers', () => {
  assert.deepEqual(d('question', { override: { ownership: 2, trust: -1 } }), { trust: 2, confidence: 1, ownership: 8 });
  // Not halved by repetition.
  assert.equal(d('observe', { history: [h('observe'), h('observe')], override: { ownership: 3 } }).ownership, 5);
});

// --- clamping ----------------------------------------------------------------

test('meters clamp to 0-100 and the recorded delta is the applied change', () => {
  const c = makeCase({ id: 'clamp', start: { trust: 98, confidence: 99, ownership: 0 } });
  const s = applyChoice(createRound(c, 'r1'), 'support-skilful');
  assert.deepEqual(s.meters, { trust: 100, confidence: 100, ownership: 0 }); // support at trust >= 70: own -2 clamps
  assert.deepEqual(s.history[0].deltas, { trust: 2, confidence: 1, ownership: 0 });
  assert.deepEqual(s.history[0].raw, { trust: 7, confidence: 5, ownership: -2 });
});

// --- 7.7 endings -------------------------------------------------------------

test('7.7 early exit at Trust <= 10 ends the round at once', () => {
  const c = makeCase({ id: 'early', start: { trust: 17, confidence: 40, ownership: 40 } });
  const s = applyChoice(createRound(c, 'r1'), 'challenge-clumsy'); // -5 -2 = -7 -> 10
  assert.equal(s.meters.trust, 10);
  assert.equal(s.ending, 'early');
  assert.equal(s.nodeId, null);
  assert.equal(s.history.length, 1);
  assert.deepEqual(optionsFor(s), []);
  assert.throws(() => applyChoice(s, 'question-skilful'));
});

test('7.7 early exit at exactly 10, not at 11', () => {
  const st = (trust, nodeId) => ({ meters: { trust, confidence: 50, ownership: 90 }, nodeId });
  assert.equal(checkEnding(st(10, 'n1')), 'early');
  assert.equal(checkEnding(st(11, 'n1')), null);
  assert.equal(checkEnding(st(10, null)), 'early'); // checked before Breakthrough
});

test('7.7 end-of-round endings and their thresholds (Breakthrough at 45/45, calibrated from 60/50)', () => {
  const st = (trust, ownership) => checkEnding({ meters: { trust, confidence: 50, ownership }, nodeId: null });
  assert.equal(st(45, 45), 'breakthrough');
  assert.equal(st(44, 60), 'polite');
  assert.equal(st(45, 44), 'partial');
  assert.equal(st(45, 30), 'partial');
  assert.equal(st(44, 30), 'polite');
  assert.equal(st(45, 29), 'polite');
  assert.equal(st(11, 0), 'polite');
});

test('7.7 exceptionally high ownership is a Breakthrough while Trust is 25 or more', () => {
  const st = (trust, ownership) => checkEnding({ meters: { trust, confidence: 50, ownership }, nodeId: null });
  assert.equal(st(25, 68), 'breakthrough');
  assert.equal(st(44, 68), 'breakthrough');
  assert.equal(st(24, 68), 'polite');
  assert.equal(st(25, 67), 'polite');
  assert.equal(st(44, 67), 'polite');
  assert.equal(st(10, 90), 'early'); // early exit still comes first
});

test('a full playthrough ends when the last node is passed', () => {
  const c = makeCase({ id: 'full', start: { trust: 60, confidence: 40, ownership: 40 } });
  let s = createRound(c, 'r1');
  s = applyChoice(s, 'challenge-skilful'); // 56, 42, 49
  s = applyChoice(s, 'question-skilful'); // 59, 43, 55
  assert.equal(s.ending, null);
  s = applyChoice(s, 'challenge-skilful'); // 55, 45, 64
  assert.equal(s.nodeId, null);
  assert.deepEqual(s.meters, { trust: 55, confidence: 45, ownership: 64 });
  assert.equal(s.ending, 'breakthrough');
});

// --- determinism and seeded shuffle -----------------------------------------

test('seeded shuffle is deterministic and a permutation', () => {
  const xs = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(shuffle(xs, 42), shuffle(xs, 42));
  assert.deepEqual(shuffle(xs, 'a').slice().sort(), xs);
  const orders = new Set([1, 2, 3, 4, 5, 6].map((s) => shuffle(xs, s).join()));
  assert.ok(orders.size > 1);
  assert.deepEqual(xs, [1, 2, 3, 4, 5, 6, 7, 8]); // input untouched
});

test('optionsFor is stable for a seed and differs across seeds', () => {
  const c = makeCase({ id: 'det' });
  const ids = (seed) => optionsFor(createRound(c, 'r1', null, seed)).map((o) => o.id).join();
  assert.equal(ids(7), ids(7));
  assert.ok(new Set([1, 2, 3, 4, 5].map(ids)).size > 1);
});

test('applyChoice is pure: same inputs give the same state, input untouched', () => {
  const c = makeCase({ id: 'pure' });
  const s0 = createRound(c, 'r1', null, 3);
  const snapshot = JSON.stringify(s0);
  const a = applyChoice(s0, 'observe-clumsy');
  const b = applyChoice(s0, 'observe-clumsy');
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(s0), snapshot);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a); // state survives JSON (persistence)
});

// --- routing -----------------------------------------------------------------

test('routing: option next, node lever routing, default, and meter conditions', () => {
  const c = makeCase({ id: 'route', n: 3 });
  c.rounds.r1.nodes.n0.next = { challenge: 'n2', default: 'n1' };
  c.rounds.r1.nodes.n0.options.find((o) => o.id === 'support-clumsy').next = 'n2';
  const s0 = createRound(c, 'r1');
  assert.equal(applyChoice(s0, 'question-skilful').nodeId, 'n1');
  assert.equal(applyChoice(s0, 'challenge-skilful').nodeId, 'n2');
  assert.equal(applyChoice(s0, 'support-clumsy').nodeId, 'n2');
  const route = [{ to: 'hi', if: { trust: { min: 50 } } }, { to: 'lo' }];
  assert.equal(resolveRoute(route, { trust: 50 }), 'hi');
  assert.equal(resolveRoute(route, { trust: 49 }), 'lo');
  assert.equal(resolveRoute(null, {}), null);
});

// --- format C: Name that lever ----------------------------------------------

test('format C: the guess is recorded and never affects the meters', () => {
  const c = registerCase(makeCase({ id: 'guess' }));
  const r1 = { caseId: 'guess', ending: 'polite', meters: { trust: 50, confidence: 40, ownership: 30 } };
  const s0 = createRound(c, 'r2', carryOver(r1));
  const right = applyChoice(s0, 'observe', 'observe');
  const wrong = applyChoice(s0, 'observe', 'question');
  assert.equal(right.history[0].guessCorrect, true);
  assert.equal(wrong.history[0].guessCorrect, false);
  assert.deepEqual(right.meters, wrong.meters);
});

test('reaction variants by trait band', () => {
  const opt = { reaction: { default: 'a', 'confidence:low': 'b' } };
  assert.equal(reactionFor(opt, { confidence: 'low' }), 'b');
  assert.equal(reactionFor(opt, { confidence: 'mid' }), 'a');
});

// --- 9.2 carry-over ----------------------------------------------------------

test('9.2 carry-over by Round 1 ending', () => {
  registerCase(makeCase({ id: 'carry', traits: { readiness: 'low' }, start: { trust: 35, confidence: 30, ownership: 15 } }));
  const r1 = (ending) => ({ caseId: 'carry', ending, meters: { trust: 65, confidence: 47, ownership: 70 } });
  const b = carryOver(r1('breakthrough'));
  assert.deepEqual(b.meters, { trust: 46, confidence: 57, ownership: 20 }); // 65 x 0.7 = 45.5 -> 46
  assert.equal(b.traits.readiness, 'mid');
  const p = carryOver(r1('partial'));
  assert.deepEqual(p.meters, { trust: 39, confidence: 47, ownership: 15 }); // 65 x 0.6 = 39
  assert.equal(p.traits.readiness, 'mid');
  const po = carryOver(r1('polite'));
  assert.deepEqual(po.meters, { trust: 30, confidence: 30, ownership: 15 });
  assert.equal(po.traits.readiness, 'low');
  const e = carryOver(r1('early'));
  assert.deepEqual(e.meters, { trust: 25, confidence: 30, ownership: 15 });
  assert.equal(e.traits.readiness, 'low');
});

test('9.2 carry-over clamps and requires a finished round', () => {
  registerCase(makeCase({ id: 'carry2' }));
  const b = carryOver({ caseId: 'carry2', ending: 'breakthrough', meters: { trust: 100, confidence: 95, ownership: 90 } });
  assert.equal(b.meters.confidence, 100);
  assert.throws(() => carryOver({ caseId: 'carry2', ending: null, meters: {} }));
});

test('createRound for Round 2 uses the opening for the carry and needs one', () => {
  const c = makeCase({ id: 'r2start' });
  assert.throws(() => createRound(c, 'r2'));
  const s = createRound(c, 'r2', { from: 'partial', meters: { trust: 40, confidence: 30, ownership: 15 }, traits: MID });
  assert.equal(s.nodeId, 'c0');
  assert.equal(s.from, 'partial');
  assert.deepEqual(s.meters, { trust: 40, confidence: 30, ownership: 15 });
});

// --- 7.8 calibrator method: memoised walk equals brute force -----------------

test('7.8 memoised calibrator walk matches brute-force enumeration', async () => {
  const { solver, bruteForce } = await import('./calibrate.mjs');
  const { MAYA } = await import('../src/content/maya.js');
  const same = (label, start, filter) => {
    const m = solver(filter)(start);
    const b = bruteForce(start, filter);
    for (const e of Object.keys(b.count)) {
      assert.equal(m.count[e], b.count[e], label + ' ' + e + ' count');
      assert.ok(Math.abs(m.prob[e] - b.prob[e]) < 1e-12, label + ' ' + e + ' probability');
    }
  };
  // Round 2, every opening (4 options per decision).
  for (const from of ['breakthrough', 'partial', 'polite', 'early']) {
    const carry = { from, meters: { trust: 40, confidence: 35, ownership: 20 }, traits: Object.assign({}, MAYA.profile.traits) };
    same('r2 ' + from, createRound(MAYA, 'r2', carry, 1));
  }
  // Round 1 restricted to two wordings per lever, where full enumeration is feasible.
  same('r1 skilful+clumsy', createRound(MAYA, 'r1', null, 1), (o) => o.quality !== 'plausible');
});
