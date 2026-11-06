// Flow audit (session 7). Lists every way into every page: each pair of
// (page, option, the reaction Maya actually gives with her trait bands in that
// round) and each page the option can actually lead to (every branch of a
// meter-conditioned route that some path reaches, and the end of the round,
// including an Early exit). Writes docs/FLOW-AUDIT.md grouped by destination
// page, keeping the ratings already written there. Run from turn-the-page/:
//   node tests/flow-audit.mjs                 regenerate; exit 1 if a pair has no rating,
//                                             or a "bridge" pair has no variant in the content
//   node tests/flow-audit.mjs --allow-unrated regenerate without failing on unrated pairs
//
// Ratings are written by hand in the last three columns of each table row:
//   fits    the next line follows naturally (reason optional)
//   bridge  the next page works, but its opening needs a variant for this way in
//           (reason, and the drafted variant in the last column)
//   branch  no line on the existing page can follow this reaction (reason, and
//           the proposed page, its act and where it rejoins, in the last column)
// A row is matched to its rating by the pair id in the first column, so ratings
// survive regeneration; a pair whose id disappears drops out of the document.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRound, applyChoice, carryOver, getNode, futureKey, reactionFor } from '../src/engine.js';
import { MAYA } from '../src/content/maya.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = join(root, 'docs', 'FLOW-AUDIT.md');
const ENDINGS = ['breakthrough', 'partial', 'polite', 'early'];
const RATINGS = ['fits', 'bridge', 'branch'];
const ENDING_NAME = { breakthrough: 'Breakthrough', partial: 'Partial', polite: 'Polite exit', early: 'Early exit' };

// A bridged page's line or cue may be { default, from: { 'node:option': text } }
// (SPEC.md 9.5); the audit always shows the default and lists the variant.
const plain = (x) => (x && typeof x === 'object' ? x.default : x) || '';
const variant = (x, key) => (x && typeof x === 'object' && x.from && x.from[key]) || null;

// Walk every reachable state (memoised on futureKey plus the Round 1 ending the
// round started from) and record, per (node, option, reaction), every
// destination actually reached and the Round 1 endings it was reached after.
export function enumeratePairs(caseData) {
  const pairs = new Map();
  function record(round, state, option, next, after) {
    const node = getNode(state);
    const reaction = reactionFor(option, state.traits);
    const dest = next.ending ? 'end:' + next.ending : next.nodeId;
    const id = state.nodeId + ':' + option.id + '>' + dest + (round === 'r2' ? '@' + state.traits.readiness : '');
    let p = pairs.get(id);
    if (!p) {
      p = { id, round, from: state.nodeId, fromPage: node.page, fromAct: node.act, option, reaction, dest, readiness: state.traits.readiness, after: new Set() };
      pairs.set(id, p);
    }
    if (after) p.after.add(after);
  }
  const seen = new Set(); // shared by every Round 2 start: the same key has the same future
  function walk(round, start, after) {
    (function go(state) {
      const key = futureKey(state) + '|' + after;
      if (seen.has(key) || state.ending) return;
      seen.add(key);
      for (const o of getNode(state).options) {
        const next = applyChoice(state, o.id);
        record(round, state, o, next, after);
        go(next);
      }
    })(start);
  }
  // Round 1, collecting every distinct final state for the Round 2 carry-overs.
  const finals = new Map();
  const r1 = createRound(caseData, 'r1', null, 1);
  const seen1 = new Set();
  (function go(state) {
    const key = futureKey(state);
    if (seen1.has(key)) return;
    seen1.add(key);
    if (state.ending) { const c = carryOver(state); finals.set(JSON.stringify(c), c); return; }
    for (const o of getNode(state).options) {
      const next = applyChoice(state, o.id);
      record('r1', state, o, next, null);
      go(next);
    }
  })(r1);
  // Round 2 from every distinct carry-over.
  for (const c of finals.values()) walk('r2', createRound(caseData, 'r2', c, 1), c.from);
  return [...pairs.values()];
}

// Ratings already in the document: rows whose first cell is a pair id.
const split = (row) => row.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim());
export function readRatings(text) {
  const out = new Map();
  for (const line of text.split('\n')) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|/);
    if (!m) continue;
    const cells = split(line);
    const rating = cells[cells.length - 3];
    if (!RATINGS.includes(rating)) continue;
    out.set(m[1], { rating, reason: cells[cells.length - 2], detail: cells[cells.length - 1] });
  }
  return out;
}

const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const NAME = { question: 'Question', support: 'Support', observe: 'Observe', challenge: 'Challenge' };

// Hand-written notes between these markers are kept when the file is regenerated.
const NOTES_OPEN = '<!-- notes: hand-written, kept on regeneration -->';
const NOTES_CLOSE = '<!-- /notes -->';
export function readNotes(text) {
  const a = text.indexOf(NOTES_OPEN), b = text.indexOf(NOTES_CLOSE);
  return a >= 0 && b > a ? text.slice(a + NOTES_OPEN.length, b).trim() : '';
}

export function buildAudit(caseData, ratings, notes) {
  const pairs = enumeratePairs(caseData);
  const out = [];
  const w = (s) => out.push(s === undefined ? '' : s);
  // Destinations in reading order: Round 1 pages, its endings, Round 2 pages, its endings.
  const order = [];
  for (const rid of ['r1', 'r2']) {
    for (const nid of Object.keys(caseData.rounds[rid].nodes)) order.push(rid + '|' + nid);
    for (const e of ENDINGS) order.push(rid + '|end:' + e);
  }
  const groups = new Map(order.map((k) => [k, []]));
  for (const p of pairs) groups.get(p.round + '|' + p.dest).push(p);
  const counts = { r1: { fits: 0, bridge: 0, branch: 0, unrated: 0 }, r2: { fits: 0, bridge: 0, branch: 0, unrated: 0 } };
  const unrated = [];
  const missingVariant = [];
  for (const p of pairs) {
    const r = ratings.get(p.id);
    if (r) counts[p.round][r.rating]++;
    else { counts[p.round].unrated++; unrated.push(p.id); }
  }

  w('# Turn the Page — flow audit');
  w();
  w('*Generated by `tests/flow-audit.mjs` from `src/content/maya.js` and the engine. The ratings in the last three columns are written by hand and kept when the file is regenerated; everything else is regenerated. The script fails if a pair has no rating.*');
  w();
  w('Each row is one way into a page: the option chosen on the page before, Maya\'s reaction to it (the one she actually gives with her trait bands in that round), and the page it leads to. Only destinations some path actually reaches are listed (all branches of a route that depends on the meters, and the end of the round, including an Early exit after any decision that can end it). Rows are grouped by destination, so all the ways into a page sit together. When an act banner sits between the two pages, the destination heading gives its cliffhanger.');
  w();
  w('**Round 2 bands.** Maya\'s readiness for change is `mid` in Round 2 after a Round 1 Breakthrough or Partial and `low` after a Polite or Early exit. Each Round 2 pair is listed once per band it occurs in (`@mid`, `@low`), with the Round 1 endings it was reached after. Her other bands do not change (confidence `low`, extraversion `mid`, defensiveness `mid`).');
  w();
  w('**Ratings.** `fits`: the next line follows naturally. `bridge`: the page works, but its opening line (and if needed its cue) needs a variant for this way in; the draft is in the last column. `branch`: no line on the existing page can follow this reaction; the last column says what the new page would be, its act and where it rejoins.');
  w();
  w('## Counts');
  w();
  w('| Round | Pairs | fits | bridge | branch | unrated |');
  w('|---|---|---|---|---|---|');
  for (const rid of ['r1', 'r2']) {
    const c = counts[rid];
    w('| ' + (rid === 'r1' ? 'Round 1' : 'Round 2') + ' | ' + (c.fits + c.bridge + c.branch + c.unrated) + ' | ' + c.fits + ' | ' + c.bridge + ' | ' + c.branch + ' | ' + c.unrated + ' |');
  }
  w();
  w('## Notes');
  w();
  w(NOTES_OPEN);
  w(notes || '(none)');
  w(NOTES_CLOSE);
  w();

  for (const key of order) {
    const list = groups.get(key);
    if (!list.length) continue;
    const [rid, dest] = key.split('|');
    const round = caseData.rounds[rid];
    w('## ' + (rid === 'r1' ? 'Round 1' : 'Round 2') + ' → ' + (dest.startsWith('end:') ? 'ending: ' + ENDING_NAME[dest.slice(4)] : 'p. ' + round.nodes[dest].page + ' (`' + dest + '`)'));
    w();
    let destNode = null;
    if (dest.startsWith('end:')) {
      const text = round.endings[dest.slice(4)].text;
      w('**Ending text:** ' + plain(text));
      if (typeof text === 'object') {
        w();
        w('**Bridges written:** ' + Object.keys(text.from).map((k) => '`' + k + '`').join(', '));
      }
    } else {
      destNode = round.nodes[dest];
      w('**Opening line:** "' + plain(destNode.line) + '"');
      w();
      w('**Cue:** ' + (plain(destNode.cue) || '(none)'));
      const acts = new Set(list.map((p) => p.fromAct));
      if (acts.size === 1 && !acts.has(destNode.act)) {
        w();
        w('**Act banner before this page:** "' + round.acts[[...acts][0]].cliffhanger + '"');
      }
      if (typeof destNode.line === 'object' || typeof destNode.cue === 'object') {
        w();
        w('**Bridges written:** ' + Object.keys(Object.assign({}, destNode.line.from, destNode.cue && destNode.cue.from)).map((k) => '`' + k + '`').join(', '));
      }
    }
    w();
    w('| Pair | From | Option | Lever | Quality | Counsellor | Maya\'s reaction | Rating | Reason | Drafted variant (what plays is in maya.js) or proposed page |');
    w('|---|---|---|---|---|---|---|---|---|---|');
    list.sort((a, b) => a.fromPage - b.fromPage || a.option.page - b.option.page || a.id.localeCompare(b.id));
    for (const p of list) {
      const r = ratings.get(p.id) || { rating: '', reason: '', detail: '' };
      const band = p.round === 'r2' ? ' *(readiness ' + p.readiness + '; after R1 ' + [...p.after].sort((a, b) => ENDINGS.indexOf(a) - ENDINGS.indexOf(b)).map((e) => ENDING_NAME[e]).join(', ') + ')*' : '';
      const k = p.from + ':' + p.option.id;
      const written = destNode ? variant(destNode.line, k) || variant(destNode.cue, k) : variant(round.endings[dest.slice(4)].text, k);
      if (r.rating === 'bridge' && !written) missingVariant.push(p.id);
      w('| `' + p.id + '` | p. ' + p.fromPage + ' `' + p.from + '` | `' + p.option.id + '` p. ' + p.option.page + ' | ' + NAME[p.option.lever] + ' | ' + (p.option.quality || '—') + ' | ' + esc(p.option.text) + ' | ' + esc(p.reaction) + band + ' | ' + r.rating + ' | ' + esc(r.reason) + ' | ' + esc(r.detail) + ' |');
    }
    w();
  }
  return { text: out.join('\n'), pairs, counts, unrated, missingVariant };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const previous = existsSync(DOC) ? readFileSync(DOC, 'utf8') : '';
  const ratings = readRatings(previous);
  const audit = buildAudit(MAYA, ratings, readNotes(previous));
  writeFileSync(DOC, audit.text + '\n');
  for (const rid of ['r1', 'r2']) {
    const c = audit.counts[rid];
    console.log(rid + ': ' + (c.fits + c.bridge + c.branch + c.unrated) + ' pairs — fits ' + c.fits + ', bridge ' + c.bridge + ', branch ' + c.branch + ', unrated ' + c.unrated);
  }
  const stale = [...ratings.keys()].filter((k) => !audit.pairs.some((p) => p.id === k));
  if (stale.length) console.log('Ratings for pairs that no longer exist (dropped): ' + stale.join(', '));
  if (audit.unrated.length && !process.argv.includes('--allow-unrated')) {
    console.log('FAIL: ' + audit.unrated.length + ' pair(s) have no rating, e.g. ' + audit.unrated.slice(0, 5).join(', '));
    process.exitCode = 1;
  }
  if (audit.missingVariant.length) {
    console.log('FAIL: ' + audit.missingVariant.length + ' bridge pair(s) have no variant in the content, e.g. ' + audit.missingVariant.slice(0, 5).join(', '));
    process.exitCode = 1;
  }
}
