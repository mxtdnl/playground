// Wording tells (SPEC.md 9.4 and 14.3). For every Round 1 page and lever,
// reports each wording's length, end punctuation and opening word, and flags
// surface features that would let a reader sort skilful, plausible and clumsy
// without thinking about Maya at this moment. Run from turn-the-page/:
//   node tests/wording-tells.mjs
// Exits 1 if anything is flagged. Warnings are printed but do not fail.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { RULES } from '../src/engine.js';
import { MAYA } from '../src/content/maya.js';

// Words that make a line sound more (or less) emphatic than its neighbours.
export const TELL_WORDS = ['really', 'just', 'honestly', 'actually', 'obviously', 'clearly'];
const LENGTH_FLAG = 1.25; // longest / shortest above this is flagged
const LENGTH_WARN = 1.2; // above this (up to the flag) is a warning

export function tellsIn(text) {
  const found = TELL_WORDS.filter((w) => new RegExp('\\b' + w + '\\b', 'i').test(text));
  if (text.includes('!')) found.push('!');
  return found;
}

const isQuestion = (t) => t.includes('?');
const opening = (t) => (t.replace(/^["']/, '').match(/^[A-Za-z']+/) || [''])[0];
const endMark = (t) => t.trim().slice(-1);

export function wordingTells(caseData) {
  const round = caseData.rounds.r1;
  const Q = RULES.qualities;
  const lines = [];
  const flags = [];
  const warnings = [];
  // Per lever, per quality: on how many pages it is the longest, the only
  // question, the only statement, or carries a tell word.
  const tally = {};
  for (const l of RULES.levers) {
    tally[l] = { pages: 0 };
    for (const q of Q) tally[l][q] = { longest: 0, onlyQuestion: 0, onlyStatement: 0, tell: 0 };
  }
  lines.push('Turn the Page — wording tells (SPEC.md 9.4, 14.3)', '');
  for (const [id, node] of Object.entries(round.nodes)) {
    lines.push('p. ' + node.page + ' (' + id + ')');
    for (const l of RULES.levers) {
      const w = {};
      for (const q of Q) w[q] = node.options.find((o) => o.lever === l && o.quality === q);
      const len = Q.map((q) => w[q].text.length);
      const ratio = Math.max(...len) / Math.min(...len);
      const where = 'p. ' + node.page + ' ' + l;
      tally[l].pages++;
      const maxLen = Math.max(...len);
      for (const q of Q) if (w[q].text.length === maxLen && len.filter((n) => n === maxLen).length === 1) tally[l][q].longest++;
      const qs = Q.filter((q) => isQuestion(w[q].text));
      if (qs.length === 1) tally[l][qs[0]].onlyQuestion++;
      if (qs.length === 2) tally[l][Q.find((q) => !qs.includes(q))].onlyStatement++;
      const tells = {};
      for (const q of Q) { tells[q] = tellsIn(w[q].text); if (tells[q].length) tally[l][q].tell++; }
      lines.push('  ' + l.padEnd(9) + ' ratio ' + ratio.toFixed(2));
      for (const q of Q) {
        const t = w[q].text;
        lines.push('    ' + q.padEnd(9) + String(t.length).padStart(4) + '  end ' + JSON.stringify(endMark(t)).padEnd(5) + ' opens ' + opening(t).padEnd(10) + (tells[q].length ? ' tells: ' + tells[q].join(', ') : ''));
      }
      // (d) a tell word or "!" only in a weaker wording
      for (const q of Q.slice(1)) {
        const only = tells[q].filter((t) => !tells.skilful.includes(t));
        if (only.length) flags.push(where + ': "' + only.join('", "') + '" appears in the ' + q + ' wording but not the skilful one');
      }
      // (e) length parity
      if (ratio > LENGTH_FLAG) flags.push(where + ': longest wording is ' + ratio.toFixed(2) + ' x the shortest (limit ' + LENGTH_FLAG + ')');
      else if (ratio > LENGTH_WARN) warnings.push(where + ': length ratio ' + ratio.toFixed(2));
      // (f) skilful is a question and neither other one is
      if (isQuestion(w.skilful.text) && qs.length === 1) flags.push(where + ': the skilful wording is the only question');
    }
    lines.push('');
  }
  // (a)-(c) patterns across all pages of a lever
  lines.push('Per lever, pages on which each quality is the longest / the only question / the only statement / carries a tell word:');
  for (const l of RULES.levers) {
    const t = tally[l];
    lines.push('  ' + l.padEnd(9) + Q.map((q) => q + ' ' + t[q].longest + '/' + t[q].onlyQuestion + '/' + t[q].onlyStatement + '/' + t[q].tell).join('   ') + '   (of ' + t.pages + ' pages)');
    for (const q of Q) {
      if (t[q].longest === t.pages) flags.push(l + ': the ' + q + ' wording is the longest on every page');
      if (t[q].onlyQuestion === t.pages) flags.push(l + ': the ' + q + ' wording is the only question on every page');
      if (t[q].tell === t.pages) flags.push(l + ': the ' + q + ' wording carries a tell word on every page');
      // Not a flag in SPEC.md 14.3, but worth seeing: a majority pattern.
      if (t[q].longest > t.pages / 2) warnings.push(l + ': the ' + q + ' wording is the longest on ' + t[q].longest + ' of ' + t.pages + ' pages');
      if (t[q].onlyStatement > t.pages / 3) warnings.push(l + ': the ' + q + ' wording is the only statement on ' + t[q].onlyStatement + ' of ' + t.pages + ' pages');
    }
  }
  lines.push('', 'Warnings (' + warnings.length + '):');
  for (const x of warnings) lines.push('  ' + x);
  lines.push('', 'Flags (' + flags.length + '):');
  for (const x of flags) lines.push('  FLAG  ' + x);
  lines.push('', flags.length ? 'FAILED: ' + flags.length + ' flag(s).' : 'PASSED: no flags.');
  return { text: lines.join('\n'), flags, warnings };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = wordingTells(MAYA);
  console.log(r.text);
  process.exitCode = r.flags.length ? 1 : 0;
}
