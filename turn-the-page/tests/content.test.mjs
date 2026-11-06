// Content integrity checks (SPEC.md 14.3) for every case file.
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, routeFor } from '../src/engine.js';
import { MAYA } from '../src/content/maya.js';
import { POSE_PARAMS } from '../src/art.js';

const CASES = [MAYA];
const ENDINGS = ['breakthrough', 'partial', 'polite', 'early'];
const FORBIDDEN = /correct|wrong|optimal|should have/i;

// Every target an option can route to (a list route can go to several).
function targets(node, option) {
  const r = routeFor(node, option);
  if (Array.isArray(r)) return r.map((x) => x.to);
  return [r];
}

function startIds(round) {
  return round.starts ? Object.values(round.starts) : [round.start];
}

function eachOption(round, fn) {
  for (const [id, node] of Object.entries(round.nodes)) for (const o of node.options) fn(o, node, id);
}

// A page's line or cue, or an ending's text: a string, or a bridged text
// { default, from: { 'previousNodeId:optionId': text } } (SPEC.md 9.5).
function isText(x, allowEmpty) {
  if (typeof x === 'string') return allowEmpty || x.trim().length > 0;
  return !!x && typeof x === 'object' && typeof x.default === 'string' && x.default.trim().length > 0 &&
    Object.keys(x).every((k) => k === 'default' || k === 'from') &&
    !!x.from && typeof x.from === 'object' && Object.keys(x.from).length > 0 &&
    Object.values(x.from).every((v) => typeof v === 'string' && v.trim() && v !== x.default);
}
const fromKeys = (x) => (x && typeof x === 'object' && x.from ? Object.keys(x.from) : []);

// Can a meter condition such as { trust: { min: 45 } } hold for some meters (0-100)?
function satisfiable(cond) {
  return !cond || Object.values(cond).every((c) => (c.min === undefined || c.min <= 100) && (c.max === undefined || c.max >= 0) && (c.min === undefined || c.max === undefined || c.min <= c.max));
}
// Targets an option can actually reach on some meters: list entries whose
// condition can hold and which an earlier unconditional entry does not shadow.
function reachableTargets(node, option) {
  const r = routeFor(node, option);
  if (!Array.isArray(r)) return [r];
  const out = [];
  for (const x of r) {
    if (satisfiable(x.if)) out.push(x.to);
    if (!x.if) break;
  }
  return out;
}

function strings(x, out) {
  if (typeof x === 'string') out.push(x);
  else if (x && typeof x === 'object') for (const v of Object.values(x)) strings(v, out);
  return out;
}

for (const c of CASES) {
  for (const [rid, round] of Object.entries(c.rounds)) {
    const nodes = round.nodes;
    const label = c.id + '/' + rid;

    test(label + ': every next resolves to an existing node', () => {
      eachOption(round, (o, node, id) => {
        for (const t of targets(node, o)) {
          assert.ok(t === null || nodes[t], id + '/' + o.id + ' -> ' + t + ' does not exist');
        }
      });
      for (const s of startIds(round)) assert.ok(nodes[s], 'start ' + s + ' does not exist');
    });

    test(label + ': every node is reachable', () => {
      const seen = new Set();
      const stack = startIds(round).slice();
      while (stack.length) {
        const id = stack.pop();
        if (id === null || seen.has(id)) continue;
        seen.add(id);
        for (const o of nodes[id].options) stack.push(...targets(nodes[id], o));
      }
      const unreachable = Object.keys(nodes).filter((id) => !seen.has(id));
      assert.deepEqual(unreachable, [], 'unreachable: ' + unreachable.join(', '));
    });

    test(label + ': each act ends at a single bottleneck node; routes never go back an act', () => {
      const exits = {};
      eachOption(round, (o, node, id) => {
        for (const t of targets(node, o)) {
          const leaves = t === null || nodes[t].act !== node.act;
          if (t !== null) assert.ok(nodes[t].act >= node.act, id + ' routes back to act ' + nodes[t].act);
          if (leaves) (exits[node.act] = exits[node.act] || new Set()).add(id);
        }
      });
      const acts = new Set(Object.values(nodes).map((n) => n.act));
      for (const act of acts) {
        const e = exits[act] ? [...exits[act]] : [];
        assert.equal(e.length, 1, 'act ' + act + ' exits from ' + (e.join(', ') || 'no node'));
      }
      assert.ok(round.acts, 'round has act titles and cliffhangers');
      for (const act of acts) assert.ok(round.acts[act] && round.acts[act].cliffhanger, 'act ' + act + ' has a cliffhanger');
    });

    // Branch pages (SPEC.md 9.5) are ordinary nodes, often reached by one
    // option's own `next`; this checks that every page, branch or not, can
    // still reach its act's bottleneck (the one page that leaves the act).
    test(label + ': every page rejoins its act at the bottleneck', () => {
      const bottleneck = {};
      eachOption(round, (o, node, id) => {
        for (const t of targets(node, o)) if (t === null || nodes[t].act !== node.act) bottleneck[node.act] = id;
      });
      for (const [id, node] of Object.entries(nodes)) {
        const goal = bottleneck[node.act];
        const seen = new Set();
        const stack = [id];
        let found = false;
        while (stack.length && !found) {
          const x = stack.pop();
          if (x === null || seen.has(x) || nodes[x].act !== node.act) continue;
          if (x === goal) found = true;
          seen.add(x);
          for (const o of nodes[x].options) stack.push(...targets(nodes[x], o));
        }
        assert.ok(found, id + ' never reaches the act ' + node.act + ' bottleneck ' + goal);
      }
    });

    test(label + ': format ' + round.format + ' option sets', () => {
      for (const [id, node] of Object.entries(nodes)) {
        const ids = node.options.map((o) => o.id);
        assert.equal(new Set(ids).size, ids.length, id + ' has duplicate option ids');
        if (round.format === 'B') {
          // SPEC.md 8.1 and 14.3: exactly 4 levers x {skilful, plausible, clumsy} = 12 options.
          assert.equal(node.options.length, RULES.levers.length * RULES.qualities.length, id + ' needs 12 options');
          const pairs = node.options.map((o) => o.lever + '/' + o.quality).sort();
          const want = RULES.levers.flatMap((l) => RULES.qualities.map((q) => l + '/' + q)).sort();
          assert.deepEqual(pairs, want, id + ' needs four levers x {skilful, plausible, clumsy}');
          // Ids follow the lever and quality, so saves and the debrief stay readable.
          for (const o of node.options) assert.equal(o.id, o.lever[0] + '-' + o.quality[0], id + '/' + o.id + ' id matches lever and quality');
        } else if (round.format === 'C') {
          assert.deepEqual(node.options.map((o) => o.lever).sort(), RULES.levers.slice().sort(), id + ' needs one option per lever');
          for (const o of node.options) assert.equal(o.quality, undefined, id + '/' + o.id + ': format C has no quality');
        } else {
          assert.fail('unknown format ' + round.format);
        }
      }
    });

    test(label + ': every option has text, a lever, reaction text and a debrief note', () => {
      eachOption(round, (o, node, id) => {
        const where = id + '/' + o.id;
        assert.ok(RULES.levers.includes(o.lever), where + ' lever');
        assert.ok(typeof o.text === 'string' && o.text.trim(), where + ' text');
        const r = o.reaction;
        assert.ok(typeof r === 'string' ? r.trim() : r && typeof r.default === 'string' && r.default.trim(), where + ' reaction');
        if (r && typeof r === 'object') {
          for (const k of Object.keys(r)) {
            if (k === 'default') continue;
            const [trait, band] = k.split(':');
            assert.ok(trait in c.profile.traits && RULES.bands.includes(band), where + ' reaction key ' + k);
          }
        }
        assert.ok(typeof o.debrief === 'string' && o.debrief.trim(), where + ' debrief');
      });
    });

    test(label + ': overrides are within +/-' + RULES.overrideMax + ' on real meters', () => {
      eachOption(round, (o, node, id) => {
        for (const [m, v] of Object.entries(o.override || {})) {
          assert.ok(RULES.meters.includes(m), id + '/' + o.id + ' override meter ' + m);
          assert.ok(Number.isInteger(v) && v >= RULES.overrideMin && v <= RULES.overrideMax && v !== 0, id + '/' + o.id + ' override ' + v);
        }
      });
    });

    test(label + ': every node has a page, act, line and cue', () => {
      for (const [id, n] of Object.entries(nodes)) {
        assert.ok(Number.isInteger(n.page) && n.page > 0, id + ' page');
        assert.ok(Number.isInteger(n.act) && n.act >= 1, id + ' act');
        assert.ok(isText(n.line), id + ' line');
        assert.ok(isText(n.cue, true), id + ' cue');
      }
    });

    test(label + ': all four endings are written' + (round.starts ? ' and each has a Round 2 opening' : ''), () => {
      for (const e of ENDINGS) assert.ok(round.endings[e] && isText(round.endings[e].text) && round.endings[e].summary, 'ending ' + e + ' text and summary');
      if (round.starts) for (const e of ENDINGS) assert.ok(round.carryNote && round.carryNote[e], 'carry-over note for ' + e);
      if (round.starts) for (const e of ENDINGS) assert.ok(round.starts[e], 'opening for ' + e);
    });
  }

  // Bridging lines (SPEC.md 9.5): every `from` key names a real page and option
  // in the same round that can route to this page (or end the round here) on
  // some meters. Early exit can follow any option, since it depends only on Trust.
  for (const [rid, round] of Object.entries(c.rounds)) {
    test(c.id + '/' + rid + ': every bridging key names a page and option that can lead here', () => {
      let n = 0;
      const check = (key, where, leadsHere) => {
        const m = /^([^:]+):([^:]+)$/.exec(key);
        assert.ok(m, where + ': bad key ' + key);
        const node = round.nodes[m[1]];
        assert.ok(node, where + ': ' + key + ' names no page in ' + rid);
        const o = node.options.find((x) => x.id === m[2]);
        assert.ok(o, where + ': ' + key + ' names no option on ' + m[1]);
        assert.ok(leadsHere(node, o), where + ': ' + key + ' cannot lead here');
        n++;
      };
      for (const [id, node] of Object.entries(round.nodes)) {
        for (const field of ['line', 'cue']) {
          for (const key of fromKeys(node[field])) check(key, id + '.' + field, (from, o) => reachableTargets(from, o).includes(id));
        }
      }
      for (const [e, ending] of Object.entries(round.endings)) {
        for (const key of fromKeys(ending.text)) check(key, 'ending ' + e, (from, o) => e === 'early' || reachableTargets(from, o).includes(null));
      }
      assert.ok(n > 0, 'no bridging lines in ' + rid);
    });
  }

  test(c.id + ': page numbers are unique across the case', () => {
    // Node pages and every option's reply page together (options turn to their own page).
    const pages = Object.values(c.rounds).flatMap((r) => Object.values(r.nodes).flatMap((n) => [n.page].concat(n.options.map((o) => o.page))));
    for (const p of pages) assert.ok(Number.isInteger(p) && p > 0, 'page ' + p);
    const dupes = pages.filter((p, i) => pages.indexOf(p) !== i);
    assert.deepEqual(dupes, []);
  });

  test(c.id + ': feedback text avoids "correct", "wrong", "optimal" and "should have"', () => {
    const bad = [];
    for (const [rid, round] of Object.entries(c.rounds)) {
      eachOption(round, (o, node, id) => { if (FORBIDDEN.test(o.debrief)) bad.push(rid + '/' + id + '/' + o.id + ': ' + o.debrief); });
    }
    for (const line of strings(c.roadNotTaken || {}, [])) if (FORBIDDEN.test(line)) bad.push('roadNotTaken: ' + line);
    for (const round of Object.values(c.rounds)) {
      for (const line of strings([Object.values(round.endings).map((e) => [e.summary, e.ownershipNote || '']), round.carryNote || {}], [])) if (FORBIDDEN.test(line)) bad.push('debrief: ' + line);
    }
    for (const line of c.reflection || []) if (FORBIDDEN.test(line)) bad.push('reflection: ' + line);
    assert.deepEqual(bad, []);
  });

  test(c.id + ': pose hints on pages and options use known parameters and values', () => {
    const bad = [];
    const check = (pose, where) => {
      for (const [k, v] of Object.entries(pose || {})) {
        if (k === 'props') { if (!Array.isArray(v) || v.some((p) => !['phone', 'brochure'].includes(p))) bad.push(where + ' props'); continue; }
        if (!POSE_PARAMS[k] || !POSE_PARAMS[k].includes(v)) bad.push(where + ' ' + k + ': ' + v);
      }
    };
    for (const [rid, round] of Object.entries(c.rounds)) {
      for (const [id, n] of Object.entries(round.nodes)) {
        check((n.scene || {}).pose, rid + '/' + id);
        for (const o of n.options) check(o.pose, rid + '/' + id + '/' + o.id);
      }
    }
    assert.deepEqual(bad, []);
  });

  test(c.id + ': three reflection prompts for Debrief 2', () => {
    assert.equal((c.reflection || []).length, 3);
  });

  test(c.id + ': turning points and road-not-taken refer to real nodes and levers', () => {
    for (const [rid, ids] of Object.entries(c.turningPoints || {})) {
      for (const id of ids) assert.ok(c.rounds[rid].nodes[id], 'turning point ' + id);
    }
    const all = Object.assign({}, ...Object.values(c.rounds).map((r) => r.nodes));
    for (const [id, levers] of Object.entries(c.roadNotTaken || {})) {
      assert.ok(all[id], 'road not taken at ' + id);
      for (const l of Object.keys(levers)) assert.ok(RULES.levers.includes(l), 'road not taken lever ' + l);
    }
  });

  test(c.id + ': referral hints quote the referral note; traits use known bands', () => {
    for (const hint of c.referral.hints) {
      assert.ok(c.referral.text.includes(hint.text), 'hint not in note: ' + hint.text);
      assert.ok(hint.trait in c.profile.traits, 'hint trait ' + hint.trait);
    }
    for (const band of Object.values(c.profile.traits)) assert.ok(RULES.bands.includes(band));
    for (const m of RULES.meters) assert.ok(Number.isInteger(c.profile.start[m]));
  });

  test(c.id + ': PLACEHOLDER count', (t) => {
    const n = strings(c, []).filter((s) => s.includes('PLACEHOLDER:')).length;
    t.diagnostic('PLACEHOLDER: strings in ' + c.id + ': ' + n);
    console.log('PLACEHOLDER: strings in ' + c.id + ': ' + n);
  });
}

// The version 1 profile and referral note are the real ones (SPEC.md 6.2, 6.3).
test('maya: profile and referral note match SPEC.md 6.2 and 6.3', () => {
  assert.equal(MAYA.profile.name, 'Maya');
  assert.equal(MAYA.profile.age, 16);
  assert.deepEqual(MAYA.profile.traits, { confidence: 'low', extraversion: 'mid', defensiveness: 'mid', readiness: 'low' });
  assert.deepEqual(MAYA.profile.start, { trust: 35, confidence: 30, ownership: 15 });
  assert.equal(MAYA.referral.from, 'Mr Okafor, Maths teacher');
  assert.equal(MAYA.referral.text, 'Maya\'s grades have dropped noticeably this term across several subjects. She used to participate actively but has gone quiet in class and has missed two homework deadlines. When I asked, she said she\'s "just being lazy." I don\'t think that\'s the full story. Could you have a conversation with her?');
});
