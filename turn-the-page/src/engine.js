// Turn the Page — scoring engine.
//
// Pure, deterministic functions with no DOM access. Importable from Node
// (tests, calibrator) and inlined into index.html by build.mjs, which strips
// the `export` keywords. Behaviour is specified in docs/SPEC.md sections 7
// and 9.2; read it before changing anything here.
//
// Every number the engine uses lives in RULES. All values are initial values
// to calibrate (SPEC.md 7.8), and every trait entry is a design hypothesis
// awaiting review by a developmental-coaching expert.

export const RULES = {
  // Meters and their range (SPEC.md 6.4).
  meters: ['trust', 'confidence', 'ownership'],
  meterMin: 0,
  meterMax: 100,

  // The four levers, in display order (SPEC.md 4).
  levers: ['question', 'support', 'observe', 'challenge'],

  // Base effect of a skilful use of each lever (SPEC.md 7.2).
  base: {
    question: { trust: 3, confidence: 1, ownership: 6 },
    support: { trust: 7, confidence: 5, ownership: 0 },
    observe: { trust: 2, confidence: 2, ownership: 4 },
    challenge: { trust: -4, confidence: 2, ownership: 9 }
  },

  // Wording quality, Round 1 only (SPEC.md 7.2). A skilful wording uses the
  // base row. For the others, positive effects are multiplied by
  // positiveFactor, then trustPenalty is added to Trust.
  // Plausible added in session 6 (initial value); clumsy calibrated in
  // session 2 from Trust -3 (SPEC.md, Calibration log).
  wording: {
    plausible: { positiveFactor: 0.7, trustPenalty: -1 },
    clumsy: { positiveFactor: 0.4, trustPenalty: -2 }
  },
  qualities: ['skilful', 'plausible', 'clumsy'],

  // State rules (SPEC.md 7.3). Evaluated against the meters before the choice.
  state: {
    // Challenge with Trust below the threshold: this row replaces the base row.
    challengeBeforeTrust: { lever: 'challenge', trustBelow: 50, row: { trust: -5, confidence: -5, ownership: 2 } },
    // Observe with Trust below the threshold: Trust effect replaced by this value.
    observeBeforeTrust: { lever: 'observe', trustBelow: 40, trust: -2 },
    // Support with Trust at or above the threshold: added to Ownership.
    supportAtHighTrust: { lever: 'support', trustAtLeast: 70, ownership: -2 }
  },

  // Repetition (SPEC.md 7.4). From the streakLength-th consecutive use of the
  // same lever onwards, positive effects are multiplied by positiveFactor and
  // the lever's penalty (if any) is added.
  repetition: {
    streakLength: 3,
    positiveFactor: 0.5,
    penalties: {
      question: { trust: -3 }, // interrogation
      support: { ownership: -3 } // rescuing
    }
  },

  // Trait multipliers (SPEC.md 7.5). Each entry multiplies one meter's effect
  // for one lever when the profile has that trait band.
  //   sign: 'gain' applies only to a positive effect, 'cost' only to a negative one.
  //   act: if set, applies only in that act.
  //   trustBelow: if set, applies only while Trust (before the choice) is below it.
  // Bands not listed (including every `mid` band) are neutral (x 1).
  traitMultipliers: [
    { trait: 'confidence', band: 'low', lever: 'support', meter: 'confidence', sign: 'gain', factor: 1.5, act: 1 },
    { trait: 'confidence', band: 'low', lever: 'challenge', meter: 'trust', sign: 'cost', factor: 1.5 },
    { trait: 'confidence', band: 'high', lever: 'support', meter: 'confidence', sign: 'gain', factor: 0.5 },
    { trait: 'confidence', band: 'high', lever: 'challenge', meter: 'ownership', sign: 'gain', factor: 1.3 },
    { trait: 'extraversion', band: 'low', lever: 'question', meter: 'ownership', sign: 'gain', factor: 0.7, trustBelow: 50 },
    { trait: 'extraversion', band: 'low', lever: 'observe', meter: 'trust', sign: 'gain', factor: 1.3 },
    { trait: 'extraversion', band: 'low', lever: 'observe', meter: 'confidence', sign: 'gain', factor: 1.3 },
    { trait: 'extraversion', band: 'low', lever: 'observe', meter: 'ownership', sign: 'gain', factor: 1.3 },
    { trait: 'extraversion', band: 'high', lever: 'question', meter: 'ownership', sign: 'gain', factor: 1.3 },
    { trait: 'defensiveness', band: 'high', lever: 'challenge', meter: 'trust', sign: 'cost', factor: 1.5 },
    { trait: 'defensiveness', band: 'high', lever: 'observe', meter: 'trust', sign: 'cost', factor: 1.5 }
  ],

  // Caps on the final delta of one decision (SPEC.md 7.5, readiness row).
  traitCaps: [
    { trait: 'readiness', band: 'low', meter: 'ownership', max: 6, act: 1 }
  ],

  // Node overrides (SPEC.md 7.6): authored adjustments must lie in this range.
  overrideMin: -5,
  overrideMax: 5,

  // Endings (SPEC.md 7.7), checked in this order.
  endings: {
    early: { trustAtMost: 10 }, // at any point
    breakthrough: { ownershipAtLeast: 45, trustAtLeast: 45 }, // at the end
    // Also a Breakthrough at the end: exceptionally high ownership, as long as
    // trust has not fallen below 25 (added after session 5; SPEC.md 7.7).
    highOwnership: { ownershipAtLeast: 68, trustAtLeast: 25 },
    partial: { trustAtLeast: 45, ownershipAtLeast: 30 } // at the end; otherwise 'polite'
  },
  endingOrder: ['early', 'breakthrough', 'partial', 'polite'],

  // Round 2 starting state by Round 1 ending (SPEC.md 9.2).
  //   trustCarry: fraction of Round 1's final Trust carried over.
  //   trust / confidence / ownership: absolute starting values.
  //   confidenceBonus: added to Round 1's final Confidence.
  //   Any meter not given keeps Round 1's final value if carry: true,
  //   otherwise the profile's starting value.
  // Calibrated in session 2 from 0.8 / Ownership 25 (breakthrough), 0.7
  // (partial) and Trust 20 (early): see SPEC.md, Calibration log.
  carry: {
    breakthrough: { trustCarry: 0.7, confidenceBonus: 10, ownership: 20, carry: true },
    partial: { trustCarry: 0.6, ownership: 15, carry: true },
    polite: { trust: 30, carry: false },
    early: { trust: 25, carry: false }
  },
  // Readiness for change rises one band in Round 2 after these endings (SPEC.md 6.2).
  readinessRiseAfter: ['breakthrough', 'partial'],
  bands: ['low', 'mid', 'high']
};

// ---------------------------------------------------------------------------
// Case registry. State objects hold only a caseId (so they can be saved as
// JSON); createRound registers the case so later calls can look it up.

const CASES = {};

export function registerCase(caseData) {
  CASES[caseData.id] = caseData;
  return caseData;
}

export function getCase(caseId) {
  const c = CASES[caseId];
  if (!c) throw new Error('Unknown case: ' + caseId + ' (call createRound or registerCase first)');
  return c;
}

// ---------------------------------------------------------------------------
// Seeded randomness. Used only for the display order of options.

// 32-bit string hash (FNV-1a).
export function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: returns a function giving floats in [0, 1).
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle of a copy. Seed may be a number or a string.
export function shuffle(items, seed) {
  const next = rng(typeof seed === 'number' ? seed : hashString(String(seed)));
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Helpers.

// Round half away from zero, so a gain and an equal cost round symmetrically
// (Math.round would turn -2.5 into -2 but 2.5 into 3).
export function roundHalfAway(x) {
  return (x < 0 ? -Math.round(-x) : Math.round(x)) || 0; // `|| 0` turns -0 into 0
}

function clamp(x) {
  return Math.max(RULES.meterMin, Math.min(RULES.meterMax, x));
}

function zeroRow() {
  return { trust: 0, confidence: 0, ownership: 0 };
}

export function getRound(state) {
  return getCase(state.caseId).rounds[state.round];
}

export function getNode(state, nodeId) {
  const id = nodeId === undefined ? state.nodeId : nodeId;
  const node = getRound(state).nodes[id];
  if (!node) throw new Error('Unknown node: ' + id);
  return node;
}

// The part of a state that decides everything after it (SPEC.md 7.8):
// the node, the meters, and the last lever with the length of its run capped
// at streakLength - 1 (the only part of history computeDeltas reads; traits
// are fixed within a round). Two states with the same key have the same
// future, so the calibrator memoises on it. If a rule starts reading more of
// the history, extend this key.
export function futureKey(state) {
  const h = state.history;
  let run = 0;
  const last = h.length ? h[h.length - 1].lever : '';
  for (let i = h.length - 1; i >= 0 && h[i].lever === last; i--) run++;
  run = Math.min(run, RULES.repetition.streakLength - 1);
  return state.nodeId + '|' + RULES.meters.map(function (m) { return state.meters[m]; }).join(',') + '|' + last + ':' + run + '|' + (state.ending || '');
}

// Length of the run of `lever` at the end of history, counting the current choice.
export function streakFor(history, lever) {
  let n = 1;
  for (let i = history.length - 1; i >= 0 && history[i].lever === lever; i--) n++;
  return n;
}

// Does a meter condition such as { trust: { min: 50 } } hold?
function conditionHolds(cond, meters) {
  if (!cond) return true;
  return Object.keys(cond).every(function (m) {
    const c = cond[m];
    if (c.min !== undefined && meters[m] < c.min) return false;
    if (c.max !== undefined && meters[m] > c.max) return false;
    return true;
  });
}

// A route is a node id, null (end of round), or a list of
// { to, if: { meter: { min, max } } } entries, the first matching one winning.
export function resolveRoute(route, meters) {
  if (route === null || typeof route === 'string') return route;
  if (Array.isArray(route)) {
    for (const r of route) if (conditionHolds(r.if, meters)) return r.to;
    throw new Error('No route matched');
  }
  throw new Error('Bad route: ' + JSON.stringify(route));
}

// The route for an option: the option's own `next` wins; otherwise the node's
// `next`, which is a route or an object keyed by lever with a `default`.
export function routeFor(node, option) {
  if (Object.prototype.hasOwnProperty.call(option, 'next')) return option.next;
  const n = node.next;
  if (n && typeof n === 'object' && !Array.isArray(n)) {
    return Object.prototype.hasOwnProperty.call(n, option.lever) ? n[option.lever] : n.default;
  }
  return n;
}

// Pick the reaction line for the profile: the first `trait:band` key that
// matches, otherwise `default`.
export function reactionFor(option, traits) {
  const r = option.reaction;
  if (typeof r === 'string') return r;
  for (const key of Object.keys(r)) {
    if (key === 'default') continue;
    const parts = key.split(':');
    if (traits[parts[0]] === parts[1]) return r[key];
  }
  return r.default;
}

// ---------------------------------------------------------------------------
// The formula (SPEC.md 7.1):
//   delta[m] = round( base[lever][quality][m] x traitMultiplier x repetitionFactor
//                     + stateRule + nodeOverride )
// then the trait caps, then the meters clamp to 0-100.
//
// Order of operations (decided in session 1; see README or CLAUDE.md):
//   1. Base row, with state-rule replacements applied (Challenge or Observe
//      before trust) since SPEC.md 7.3 says those replace the base values.
//   2. Wording transform (plausible or clumsy; RULES.wording).
//   3. Trait multipliers, judged on the sign of the value from step 2.
//   4. Repetition: positives halved from the third consecutive use.
//   5. Additive terms: Support at high trust, repetition penalties, override.
//   6. Round half away from zero; apply trait caps.

export function computeDeltas(ctx) {
  const lever = ctx.lever;
  const meters = ctx.meters;
  const traits = ctx.traits;
  const act = ctx.act;
  const S = RULES.state;
  const trace = [];

  // 1. Base row with replacements.
  let row = Object.assign({}, RULES.base[lever]);
  if (lever === S.challengeBeforeTrust.lever && meters.trust < S.challengeBeforeTrust.trustBelow) {
    row = Object.assign({}, S.challengeBeforeTrust.row);
    trace.push('challengeBeforeTrust');
  }
  if (lever === S.observeBeforeTrust.lever && meters.trust < S.observeBeforeTrust.trustBelow) {
    row.trust = S.observeBeforeTrust.trust;
    trace.push('observeBeforeTrust');
  }

  // 2. Wording quality (plausible or clumsy; skilful has no transform).
  const wording = RULES.wording[ctx.quality];
  if (wording) {
    for (const m of RULES.meters) if (row[m] > 0) row[m] *= wording.positiveFactor;
    row.trust += wording.trustPenalty;
    trace.push(ctx.quality);
  }

  // 3. Trait multipliers.
  for (const tm of RULES.traitMultipliers) {
    if (traits[tm.trait] !== tm.band || tm.lever !== lever) continue;
    if (tm.act !== undefined && tm.act !== act) continue;
    if (tm.trustBelow !== undefined && !(meters.trust < tm.trustBelow)) continue;
    const v = row[tm.meter];
    if ((tm.sign === 'gain' && v > 0) || (tm.sign === 'cost' && v < 0)) {
      row[tm.meter] = v * tm.factor;
      trace.push('trait:' + tm.trait + ':' + tm.band + ':' + tm.meter);
    }
  }

  // 4. Repetition factor.
  const streak = streakFor(ctx.history, lever);
  const repeated = streak >= RULES.repetition.streakLength;
  if (repeated) {
    for (const m of RULES.meters) if (row[m] > 0) row[m] *= RULES.repetition.positiveFactor;
    trace.push('repetition');
  }

  // 5. Additive terms.
  const add = zeroRow();
  if (lever === S.supportAtHighTrust.lever && meters.trust >= S.supportAtHighTrust.trustAtLeast) {
    add.ownership += S.supportAtHighTrust.ownership;
    trace.push('supportAtHighTrust');
  }
  if (repeated && RULES.repetition.penalties[lever]) {
    const p = RULES.repetition.penalties[lever];
    for (const m of Object.keys(p)) add[m] += p[m];
    trace.push('repetitionPenalty');
  }
  const override = ctx.override || {};
  for (const m of Object.keys(override)) {
    add[m] += override[m];
    trace.push('override:' + m);
  }

  // 6. Round and cap.
  const delta = zeroRow();
  for (const m of RULES.meters) delta[m] = roundHalfAway(row[m] + add[m]);
  for (const cap of RULES.traitCaps) {
    if (traits[cap.trait] !== cap.band) continue;
    if (cap.act !== undefined && cap.act !== act) continue;
    if (delta[cap.meter] > cap.max) {
      delta[cap.meter] = cap.max;
      trace.push('cap:' + cap.trait + ':' + cap.meter);
    }
  }
  return { delta: delta, trace: trace };
}

// ---------------------------------------------------------------------------
// Public API.

// Start a round. `carry` is required for Round 2 (from carryOver) and ignored
// for Round 1. `seed` fixes the option display order.
export function createRound(caseData, roundId, carry, seed) {
  registerCase(caseData);
  const round = caseData.rounds[roundId];
  if (!round) throw new Error('Unknown round: ' + roundId);
  let meters = Object.assign({}, caseData.profile.start);
  let traits = Object.assign({}, caseData.profile.traits);
  let nodeId = round.start;
  let from = null;
  if (round.starts) {
    if (!carry) throw new Error('Round ' + roundId + ' needs a carry-over (carryOver(r1State))');
    meters = Object.assign({}, carry.meters);
    traits = Object.assign({}, carry.traits);
    nodeId = round.starts[carry.from];
    from = carry.from;
    if (!nodeId) throw new Error('No start for ending ' + carry.from);
  }
  const state = {
    caseId: caseData.id,
    round: roundId,
    nodeId: nodeId,
    meters: meters,
    traits: traits,
    history: [],
    ending: null,
    from: from,
    seed: seed === undefined ? 1 : seed
  };
  state.ending = checkEnding(state);
  return state;
}

// The current node's options in display order (seeded shuffle). Format B
// interfaces group them by lever; format C shows them as they come.
export function optionsFor(state) {
  if (state.ending) return [];
  const node = getNode(state);
  const key = state.seed + ':' + state.round + ':' + state.nodeId + ':' + state.history.length;
  return shuffle(node.options, key);
}

// Apply one choice and return a new state (the input is not modified).
// `guess` is the lever the counsellor named in format C; it never affects
// the meters.
export function applyChoice(state, optionId, guess) {
  if (state.ending) throw new Error('Round has ended');
  const node = getNode(state);
  const option = node.options.find(function (o) { return o.id === optionId; });
  if (!option) throw new Error('Unknown option ' + optionId + ' at ' + state.nodeId);
  const result = computeDeltas({
    lever: option.lever,
    quality: option.quality || 'skilful',
    meters: state.meters,
    traits: state.traits,
    act: node.act,
    history: state.history,
    override: option.override
  });
  const meters = {};
  const applied = {};
  for (const m of RULES.meters) {
    meters[m] = clamp(state.meters[m] + result.delta[m]);
    applied[m] = meters[m] - state.meters[m];
  }
  const entry = {
    nodeId: state.nodeId,
    optionId: option.id,
    lever: option.lever,
    quality: option.quality || null,
    deltas: applied,
    raw: result.delta,
    trace: result.trace,
    meters: meters,
    reaction: reactionFor(option, state.traits),
    guess: guess === undefined ? null : guess,
    guessCorrect: guess === undefined || guess === null ? null : guess === option.lever
  };
  const next = Object.assign({}, state, {
    meters: meters,
    history: state.history.concat([entry]),
    nodeId: resolveRoute(routeFor(node, option), meters)
  });
  next.ending = checkEnding(next);
  if (next.ending === 'early') next.nodeId = null;
  return next;
}

// The ending, or null while the round continues (SPEC.md 7.7). Early exit
// applies at any point; the others only once the round has run out of nodes.
export function checkEnding(state) {
  const E = RULES.endings;
  const m = state.meters;
  if (m.trust <= E.early.trustAtMost) return 'early';
  if (state.nodeId !== null) return null;
  if (m.ownership >= E.breakthrough.ownershipAtLeast && m.trust >= E.breakthrough.trustAtLeast) return 'breakthrough';
  if (m.ownership >= E.highOwnership.ownershipAtLeast && m.trust >= E.highOwnership.trustAtLeast) return 'breakthrough';
  if (m.trust >= E.partial.trustAtLeast && m.ownership >= E.partial.ownershipAtLeast) return 'partial';
  return 'polite';
}

// Round 2 starting state from a finished Round 1 (SPEC.md 9.2).
export function carryOver(r1State) {
  if (!r1State.ending) throw new Error('Round 1 has not ended');
  const profile = getCase(r1State.caseId).profile;
  const rule = RULES.carry[r1State.ending];
  const prev = r1State.meters;
  const meters = {};
  for (const m of RULES.meters) meters[m] = rule.carry ? prev[m] : profile.start[m];
  if (rule.trustCarry !== undefined) meters.trust = roundHalfAway(prev.trust * rule.trustCarry);
  if (rule.confidenceBonus !== undefined) meters.confidence = prev.confidence + rule.confidenceBonus;
  for (const m of RULES.meters) {
    if (rule[m] !== undefined) meters[m] = rule[m];
    meters[m] = clamp(meters[m]);
  }
  const traits = Object.assign({}, profile.traits);
  if (RULES.readinessRiseAfter.indexOf(r1State.ending) >= 0) {
    const i = RULES.bands.indexOf(traits.readiness);
    traits.readiness = RULES.bands[Math.min(i + 1, RULES.bands.length - 1)];
  }
  return { from: r1State.ending, meters: meters, traits: traits };
}
