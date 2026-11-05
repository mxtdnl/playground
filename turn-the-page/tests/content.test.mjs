// Content integrity checks (SPEC.md 14.3) for every case file.
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, routeFor } from '../src/engine.js';
import { MAYA } from '../src/content/maya.js';

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

    test(label + ': format ' + round.format + ' option sets', () => {
      for (const [id, node] of Object.entries(nodes)) {
        const ids = node.options.map((o) => o.id);
        assert.equal(new Set(ids).size, ids.length, id + ' has duplicate option ids');
        if (round.format === 'B') {
          const pairs = node.options.map((o) => o.lever + '/' + o.quality).sort();
          const want = RULES.levers.flatMap((l) => [l + '/clumsy', l + '/skilful']).sort();
          assert.deepEqual(pairs, want, id + ' needs four levers x {skilful, clumsy}');
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
        assert.ok(typeof n.line === 'string' && n.line.trim(), id + ' line');
        assert.ok(typeof n.cue === 'string', id + ' cue');
      }
    });

    test(label + ': all four endings are written' + (round.starts ? ' and each has a Round 2 opening' : ''), () => {
      for (const e of ENDINGS) assert.ok(round.endings[e] && round.endings[e].text, 'ending ' + e);
      if (round.starts) for (const e of ENDINGS) assert.ok(round.starts[e], 'opening for ' + e);
    });
  }

  test(c.id + ': page numbers are unique across the case', () => {
    const pages = Object.values(c.rounds).flatMap((r) => Object.values(r.nodes).map((n) => n.page));
    const dupes = pages.filter((p, i) => pages.indexOf(p) !== i);
    assert.deepEqual(dupes, []);
  });

  test(c.id + ': feedback text avoids "correct", "wrong", "optimal" and "should have"', () => {
    const bad = [];
    for (const [rid, round] of Object.entries(c.rounds)) {
      eachOption(round, (o, node, id) => { if (FORBIDDEN.test(o.debrief)) bad.push(rid + '/' + id + '/' + o.id + ': ' + o.debrief); });
    }
    for (const line of strings(c.roadNotTaken || {}, [])) if (FORBIDDEN.test(line)) bad.push('roadNotTaken: ' + line);
    assert.deepEqual(bad, []);
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
