const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const P = require('../src/pseudonymiser.js');
const NAMES = require('../src/names.js');

// Repeatable random numbers for tests (mulberry32).
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


test('name lists have no duplicates, no overlap and no kept words', () => {
  const first = NAMES.FIRST.map((n) => n.toLowerCase());
  const last = NAMES.SURNAMES.map((n) => n.toLowerCase());
  assert.equal(new Set(first).size, first.length, 'duplicate given name');
  assert.equal(new Set(last).size, last.length, 'duplicate surname');
  assert.deepEqual(first.filter((n) => last.includes(n)), [], 'name in both lists');
  const kept = ['mr', 'mrs', 'ms', 'miss', 'dr', 'van', 'de', 'and', 'of', 'the', 'jr', 'sr'];
  assert.deepEqual([...first, ...last].filter((n) => kept.includes(n)), []);
  for (const n of [...NAMES.FIRST, ...NAMES.SURNAMES]) assert.match(n, /^\p{Lu}[\p{L}']+$/u, n);
});

test('parseName marks given and family names', () => {
  const roles = (text, columnRole = null) =>
    P.parseName(text, columnRole)
      .tokens.filter((t) => t.word)
      .map((t) => `${t.text}:${t.kind === 'name' ? t.role : 'kept'}`)
      .join(' ');

  assert.equal(roles('John Smith'), 'John:first Smith:last');
  assert.equal(roles('Smith, John'), 'Smith:last John:first');
  assert.equal(roles('Smith, John Paul'), 'Smith:last John:first Paul:first');
  assert.equal(roles('Mrs Smith'), 'Mrs:kept Smith:last');
  assert.equal(roles('Mr J. Smith'), 'Mr:kept J:first Smith:last');
  assert.equal(roles('John'), 'John:first');
  assert.equal(roles('Mary-Jane Smith-Jones'), 'Mary:first Jane:first Smith:last Jones:last');
  assert.equal(roles('Smith-Jones, Anna'), 'Smith:last Jones:last Anna:first');
  assert.equal(roles('Ludwig van Beethoven'), 'Ludwig:first van:kept Beethoven:last');
  assert.equal(roles('Van Morrison'), 'Van:first Morrison:last');
  assert.equal(roles('John Smith, Jane Doe'), 'John:first Smith:last Jane:first Doe:last');
  assert.equal(roles('John Smith and Jane Doe'), 'John:first Smith:last and:kept Jane:first Doe:last');
  assert.equal(roles('John Smith / Jane Doe'), 'John:first Smith:last Jane:first Doe:last');
  assert.equal(roles('Smith', 'last'), 'Smith:last');
  assert.equal(roles('Anna Maria', 'first'), 'Anna:first Maria:first');
});

test('initials', () => {
  const cases = {
    'John Smith': 'JS',
    'Mr John Smith': 'JS',
    'Smith, John': 'JS',
    'john smith': 'JS',
    "Mary-Jane O'Brien": 'MJO',
    'J. Smith': 'JS',
    'Dr A B Okafor': 'ABO',
    Smith: 'S',
    'Mrs Smith': 'S',
    'Ludwig van Beethoven': 'LB',
    'John Smith / Jane Doe': 'JS / JD',
    'John Smith and Jane Doe': 'JS and JD',
    'John Smith, Jane Doe': 'JS, JD',
    'Zoë Ébert': 'ZÉ',
    'N/A': 'N/A',
    '-': '-',
    TBC: 'TBC',
  };
  for (const [input, expected] of Object.entries(cases)) {
    assert.equal(P.toInitials(input), expected, input);
  }
});

test('pseudonyms are consistent across cells and formats', () => {
  const excluded = new Set(['john', 'smith', 'jane', 'doe', 'mary', 'jones']);
  const r = P.createReplacer(seeded(1), excluded);
  const a = P.replaceNames('John Smith', 'pseudonym', null, r);
  const [first, last] = a.split(' ');
  assert.equal(P.replaceNames('Smith, John', 'pseudonym', null, r), `${last}, ${first}`);
  assert.equal(P.replaceNames('SMITH, John', 'pseudonym', null, r), `${last.toUpperCase()}, ${first}`);
  assert.equal(P.replaceNames('john smith', 'pseudonym', null, r), a.toLowerCase());
  assert.equal(P.replaceNames('Mrs Smith', 'pseudonym', null, r), `Mrs ${last}`);
  assert.equal(P.replaceNames('Smith', 'pseudonym', 'last', r), last);
  assert.equal(P.replaceNames('John', 'pseudonym', 'first', r), first);
  // Family links survive: same surname, same replacement.
  assert.equal(P.replaceNames('Jane Smith', 'pseudonym', null, r).split(' ')[1], last);
  // Lower-case particles are kept.
  assert.match(P.replaceNames('Mary van Jones', 'pseudonym', null, r), /^\S+ van \S+$/);
});

test('pseudonyms never reuse a real name and never collide', () => {
  // More distinct surnames than the list holds, to force the overflow path.
  const originals = Array.from({ length: 1500 }, (_, i) => `Surname${P.columnLetter(i + 1)}`.replace(/\d/g, ''));
  const realWords = [...new Set(originals.map((o) => o.toLowerCase()))];
  const excluded = new Set([...realWords, 'carter', 'hughes', 'alex']);
  const r = P.createReplacer(seeded(2), excluded);
  const out = new Map();
  for (const o of realWords) out.set(o, P.replaceNames(o, 'pseudonym', 'last', r));
  const values = [...out.values()].map((v) => v.toLowerCase());
  assert.equal(new Set(values).size, values.length, 'two names share a pseudonym');
  for (const v of values) {
    for (const part of v.split('-')) assert.ok(!excluded.has(part), `${v} reuses a real word`);
  }
  // Given names come from the gender-neutral list and skip excluded ones.
  const given = P.replaceNames('Taylor', 'pseudonym', 'first', P.createReplacer(seeded(3), new Set(['taylor'])));
  assert.ok(NAMES.FIRST.includes(given) && given !== 'Taylor');
});

test('scramble keeps word lengths and case, and is consistent', () => {
  const excluded = new Set(['john', 'smith', "o'neill"]);
  const r = P.createReplacer(seeded(4), excluded);
  const out = P.replaceNames('John Smith', 'scramble', null, r);
  const [a, b] = out.split(' ');
  assert.equal(a.length, 4);
  assert.equal(b.length, 5);
  assert.match(a, /^[A-Z][a-z]+$/);
  assert.equal(P.replaceNames('SMITH', 'scramble', null, r), b.toUpperCase());
  assert.equal(P.replaceNames('Smith, John', 'scramble', null, r), `${b}, ${a}`);
  assert.ok(!excluded.has(a.toLowerCase()) && !excluded.has(b.toLowerCase()));
});

test('single initials map to a different letter, consistently', () => {
  const r = P.createReplacer(seeded(5), new Set(['smith']));
  const one = P.replaceNames('J. Smith', 'pseudonym', null, r);
  const two = P.replaceNames('J Smith', 'pseudonym', null, r);
  const letter = one[0];
  assert.notEqual(letter, 'J');
  assert.match(one, /^[A-Z]\. \S+$/);
  assert.equal(two, one.replace('.', ''));
});

test('placeholders and non-text values are left alone', () => {
  for (const v of ['N/A', 'n/a', 'Unknown', 'TBC', '-', '123', 'Total', '  none ']) {
    assert.ok(P.isPlaceholder(v), v);
  }
  assert.ok(!P.isPlaceholder('Nadia'));
});

test('column suggestions follow the header rules', () => {
  const names = ['John Smith', 'Jane Doe', "Siobhan O'Sullivan"];
  const ids = ['S001', 'S002', 'S003'];
  const cases = [
    ['Student Name', names, 'pseudonym'],
    ['Surname', ['Smith'], 'pseudonym'],
    ['Forename', ['John'], 'pseudonym'],
    ['Username', ['jsmith'], 'pseudonym'],
    ['Staff', names, 'initials'],
    ['Staff', ['John Smith', 'N/A', 'Jane Doe / Tom Ash', 'TBC', 'Smith, John'], 'initials'],
    ['Staff Name', names, 'initials'],
    ['StaffName', names, 'initials'],
    ['Member of staff', names, 'initials'],
    ['staff_name', ids, 'initials'],
    ['Staff ID', ids, 'keep'],
    ['Staff email', ['a@b.org'], 'keep'],
    ['Staffing', names, 'keep'],
    ['Date', ['2026-01-01'], 'keep'],
    ['', names, 'keep'],
  ];
  for (const [header, samples, expected] of cases) {
    assert.equal(P.suggestAction(header, samples), expected, header);
  }
  assert.equal(P.headerRole('Legal Surname'), 'last');
  assert.equal(P.headerRole('LastName'), 'last');
  assert.equal(P.headerRole('Preferred Forename'), 'first');
  assert.equal(P.headerRole('first_name'), 'first');
  assert.equal(P.headerRole('Student Name'), null);
});

test('header row skips a title row above the table', () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('S');
  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = 'Staff names report';
  ws.getRow(3).values = ['Ref', 'Name', 'Staff'];
  ws.getRow(4).values = [1, 'John Smith', 'Jane Doe'];
  assert.equal(P.detectHeaderRow(ws), 3);

  const plain = wb.addWorksheet('T');
  plain.getRow(1).values = ['Id', 'Score'];
  plain.getRow(2).values = [1, 5];
  assert.equal(P.detectHeaderRow(plain), 1);

  const sheet = P.analyseSheet(ws);
  assert.deepEqual(
    sheet.columns.map((c) => [c.letter, c.header, c.suggested]),
    [
      ['A', 'Ref', 'keep'],
      ['B', 'Name', 'pseudonym'],
      ['C', 'Staff', 'initials'],
    ]
  );
});
