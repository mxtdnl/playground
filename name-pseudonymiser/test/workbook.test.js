const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const P = require('../src/pseudonymiser.js');

function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PEOPLE = [
  ['John', 'Smith', 'Helen Bradshaw'],
  ['Jane', 'Doe', 'Tom Ashworth'],
  ['Amir', 'Smith', 'Helen Bradshaw'],
  ['Zoë', "O'Neill", 'Hannah Brooke'],
];
const REAL_WORDS = ['john', 'smith', 'jane', 'doe', 'amir', 'zoë', "o'neill", 'helen', 'bradshaw', 'tom', 'ashworth', 'hannah', 'brooke', 'priya', 'nair', 'grace', 'okafor'];

// A workbook with the awkward cases: a title row, rich text, a link, shared
// formulas (as Excel writes filled-down formulas), a hidden sheet and styles.
async function buildInput() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Helen Bradshaw';
  wb.lastModifiedBy = 'Helen Bradshaw';
  const ws = wb.addWorksheet('Referrals');
  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = 'Referrals';
  ws.getRow(3).values = ['Ref', 'Student Name', 'First Name', 'Surname', 'Staff', 'Summary', 'Full Name', 'Name Length', 'Notes'];
  PEOPLE.forEach(([first, last, staff], i) => {
    const r = 4 + i;
    ws.getCell(r, 1).value = `R${r}`;
    ws.getCell(r, 2).value = `${first} ${last}`;
    ws.getCell(r, 3).value = first;
    ws.getCell(r, 4).value = last;
    ws.getCell(r, 5).value = staff;
    ws.getCell(r, 9).value = 'Called home';
  });
  // Summary: shared formula filled down F4:F7, master F4.
  ws.getCell('F4').value = { formula: 'B4&" / "&E4', result: 'John Smith / Helen Bradshaw', shareType: 'shared', ref: 'F4:F7' };
  for (let r = 5; r <= 7; r++) {
    ws.getCell(r, 6).value = { sharedFormula: 'F4', result: `${ws.getCell(r, 2).value} / ${ws.getCell(r, 5).value}` };
  }
  // Full Name: shared formula G4:G7 inside a name column. Its master G4 also
  // feeds a clone in the Notes column (I8), outside any name column.
  ws.getCell('G4').value = { formula: 'C4&" "&D4', result: 'John Smith', shareType: 'shared', ref: 'G4:I8' };
  for (let r = 5; r <= 7; r++) {
    ws.getCell(r, 7).value = { sharedFormula: 'G4', result: `${ws.getCell(r, 3).value} ${ws.getCell(r, 4).value}` };
  }
  ws.getCell('I8').value = { sharedFormula: 'G4', result: 'Called home' };
  // Name Length: numeric formulas in a name column stay as they are.
  for (let r = 4; r <= 7; r++) ws.getCell(r, 8).value = { formula: `LEN(B${r})`, result: String(ws.getCell(r, 2).value).length };

  // Formatting and awkward values.
  ws.getCell('B4').font = { bold: true, color: { argb: 'FFC00000' } };
  ws.getCell('B4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  ws.getCell('B8').value = { richText: [{ text: 'Grace ', font: { bold: true } }, { text: 'Okafor' }] };
  ws.getCell('B9').value = { text: 'Priya Nair', hyperlink: 'mailto:priya.nair@example.org' };
  ws.getCell('B10').value = 'N/A';
  ws.getCell('B11').value = 12345;
  ws.getCell('I4').note = 'Spoke to mum';
  ws.getCell('J20').note = 'Comment on an empty cell';

  const hidden = wb.addWorksheet('Old', { state: 'hidden' });
  hidden.getRow(1).values = ['Name', 'Score'];
  hidden.addRow(['Jane Doe', 3]);
  hidden.addRow(['Priya Nair', 5]);

  return wb.xlsx.writeBuffer();
}

async function load(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

function planFrom(analysis) {
  return {
    sheets: analysis.map((s) => ({
      name: s.name,
      headerRow: s.headerRow,
      columns: s.columns.map((c) => ({ index: c.index, action: c.suggested })),
    })),
  };
}

function allText(wb) {
  const out = [];
  for (const ws of wb.worksheets) {
    ws.eachRow({ includeEmpty: true }, (row) =>
      row.eachCell({ includeEmpty: false }, (cell) => {
        const v = cell.value;
        if (typeof v === 'string') out.push({ ws: ws.name, address: cell.address, text: v });
        else if (v && typeof v === 'object') out.push({ ws: ws.name, address: cell.address, text: JSON.stringify(v) });
      })
    );
  }
  return out;
}

test('suggested columns for the test workbook', async () => {
  const wb = await load(await buildInput());
  const analysis = P.analyseWorkbook(wb);
  assert.equal(analysis[0].headerRow, 3);
  assert.deepEqual(
    Object.fromEntries(analysis[0].columns.map((c) => [c.header, c.suggested])),
    {
      Ref: 'keep',
      'Student Name': 'pseudonym',
      'First Name': 'pseudonym',
      Surname: 'pseudonym',
      Staff: 'initials',
      Summary: 'keep',
      'Full Name': 'pseudonym',
      'Name Length': 'pseudonym',
      Notes: 'keep',
    }
  );
  assert.equal(analysis[1].state, 'hidden');
  assert.deepEqual(analysis[1].columns.map((c) => c.suggested), ['pseudonym', 'keep']);
});

test('processing removes real names and keeps the workbook intact', async () => {
  const wb = await load(await buildInput());
  const result = P.processWorkbook(wb, planFrom(P.analyseWorkbook(wb)), { random: seeded(7) });
  const buffer = await wb.xlsx.writeBuffer();
  const out = await load(buffer);
  const ws = out.getWorksheet('Referrals');

  // No real name survives anywhere, including cached formula results.
  for (const { ws: sheet, address, text } of allText(out)) {
    const found = REAL_WORDS.filter((w) => new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, 'iu').test(text));
    assert.deepEqual(found, [], `${sheet}!${address} still contains ${found} in ${text}`);
  }

  // Full names match the separate first/surname columns, row by row.
  for (let r = 4; r <= 7; r++) {
    const full = ws.getCell(r, 2).value;
    assert.equal(full, `${ws.getCell(r, 3).value} ${ws.getCell(r, 4).value}`, `row ${r}`);
    assert.equal(ws.getCell(r, 7).value, full, `Full Name formula became text, row ${r}`);
  }
  // Two people called Smith keep sharing a surname.
  assert.equal(ws.getCell('D4').value, ws.getCell('D6').value);
  assert.notEqual(ws.getCell('C4').value, ws.getCell('C6').value);

  // Staff become initials; the two HBs are numbered alphabetically by name.
  assert.deepEqual([4, 5, 6, 7].map((r) => ws.getCell(r, 5).value), ['HB2', 'TA', 'HB2', 'HB1']);
  assert.deepEqual(result.numberedInitials, [
    { initials: 'HB', people: [{ code: 'HB1', name: 'Hannah Brooke' }, { code: 'HB2', name: 'Helen Bradshaw' }] },
  ]);

  // Formatting, merges, placeholders and numbers are kept.
  assert.equal(ws.getCell('B4').font.bold, true);
  assert.equal(ws.getCell('B4').fill.fgColor.argb, 'FFFFFF00');
  assert.equal(ws.getCell('B10').value, 'N/A');
  assert.equal(ws.getCell('B11').value, 12345);
  assert.ok(ws.getCell('B1').isMerged);
  assert.equal(typeof ws.getCell('B8').value, 'string', 'rich text flattened');
  assert.equal(typeof ws.getCell('B9').value, 'string', 'link removed');

  // Formulas outside name columns stay, without cached text results.
  assert.equal(ws.getCell('F4').formula, 'B4&" / "&E4');
  assert.equal(ws.getCell('F5').formula, 'B5&" / "&E5');
  assert.equal(ws.getCell('F4').result, undefined);
  assert.equal(ws.getCell('I8').formula, 'E8&" "&F8', 'clone of a replaced master keeps its formula');
  assert.equal(ws.getCell('I8').result, undefined);
  assert.equal(ws.getCell('H4').formula, 'LEN(B4)');
  assert.equal(ws.getCell('H4').result, 10);

  const zip = await JSZip.loadAsync(buffer);
  assert.match(await zip.file('xl/workbook.xml').async('string'), /fullCalcOnLoad="1"/);
  assert.doesNotMatch(await zip.file('docProps/core.xml').async('string'), /Bradshaw/);

  // The hidden sheet is processed and stays hidden.
  const old = out.getWorksheet('Old');
  assert.equal(old.state, 'hidden');
  assert.equal(old.getCell('A2').value, ws.getCell('B5').value, 'Jane Doe is the same person on both sheets');

  // Summary numbers.
  const col = (header) => result.columns.find((c) => c.header === header);
  assert.equal(col('Student Name').cells, 7); // 4 names, rich text, link, N/A (12345 is a number)
  assert.equal(col('Staff').unique, 3);
  assert.equal(result.flattened.formulas, 4);
  assert.equal(result.flattened.hyperlinks, 1);
  assert.equal(result.flattened.richText, 1);
  assert.equal(result.clearedResults, 5); // F4:F7 and I8
  // Comments are left as they are, so the user is told how many there are.
  // ExcelJS drops comments on empty cells when it reads a file, so J20's is gone.
  const noteText = (note) => (typeof note === 'string' ? note : note.texts.map((t) => t.text).join(''));
  assert.equal(result.comments, 1);
  assert.equal(noteText(ws.getCell('I4').note), 'Spoke to mum');
  assert.equal(ws.findCell(20, 10), undefined);
});

test('cells outside the chosen columns are unchanged', async () => {
  const input = await buildInput();
  const before = await load(input);
  const wb = await load(input);
  const analysis = P.analyseWorkbook(wb);
  P.processWorkbook(wb, planFrom(analysis), { random: seeded(9) });
  const after = await load(await wb.xlsx.writeBuffer());

  const chosen = new Set();
  for (const s of analysis) {
    for (const c of s.columns) if (c.suggested !== 'keep') chosen.add(`${s.name}|${c.index}`);
  }
  // Formulas are compared by their text (a shared formula may become a plain
  // copy of itself), and cached text results are dropped on purpose.
  const comparable = (cell) => {
    if (cell.type !== ExcelJS.ValueType.Formula) return cell.value;
    return { formula: cell.formula, result: typeof cell.result === 'string' ? undefined : cell.result };
  };
  let compared = 0;
  for (const ws of before.worksheets) {
    const out = after.getWorksheet(ws.name);
    ws.eachRow({ includeEmpty: false }, (row, r) =>
      row.eachCell({ includeEmpty: false }, (cell, c) => {
        if (chosen.has(`${ws.name}|${c}`) && r > analysis.find((s) => s.name === ws.name).headerRow) return;
        const o = out.getCell(r, c);
        assert.deepEqual(comparable(o), comparable(cell), `${ws.name}!${cell.address}`);
        assert.deepEqual(o.style, cell.style, `${ws.name}!${cell.address} style`);
        compared++;
      })
    );
  }
  assert.ok(compared > 30, `compared ${compared} cells`);
});

test('the key lists every replacement once', async () => {
  const wb = await load(await buildInput());
  const result = P.processWorkbook(wb, planFrom(P.analyseWorkbook(wb)), { random: seeded(8) });
  const ws = wb.getWorksheet('Referrals');

  const entry = (header, original) => result.key.find((e) => e.header === header && e.original === original);
  assert.equal(entry('Student Name', 'John Smith').replacement, ws.getCell('B4').value);
  assert.equal(entry('Staff', 'Helen Bradshaw').cells, 2);
  assert.equal(entry('Staff', 'Helen Bradshaw').replacement, 'HB2');
  assert.equal(entry('Student Name', 'Grace Okafor').replacement, ws.getCell('B8').value);
  const ids = result.key.map((e) => `${e.sheet}|${e.column}|${e.original}`);
  assert.equal(new Set(ids).size, ids.length);

  const keyBook = await load(await P.buildKeyWorkbook(ExcelJS, result, { sourceName: 'test.xlsx' }).xlsx.writeBuffer());
  const sheet = keyBook.getWorksheet('Key');
  assert.deepEqual(sheet.getRow(1).values.slice(1), ['Sheet', 'Column', 'Header', 'Method', 'Original', 'Replacement', 'Cells']);
  assert.equal(sheet.rowCount, result.key.length + 1);
  assert.match(keyBook.getWorksheet('About').getCell('A2').value, /test\.xlsx/);
});

test('shared initials are numbered the same way everywhere', () => {
  const wb = new ExcelJS.Workbook();
  const referrals = wb.addWorksheet('Referrals');
  referrals.getRow(1).values = ['Ref', 'Staff'];
  const names = [
    'Helen Bradshaw',
    'Hannah Brooke',
    'Bradshaw, Helen',
    'HELEN BRADSHAW',
    'Mrs H Bradshaw', // written differently, so treated as a different person
    'Tom Ashworth',
    'Helen Bradshaw / Tom Ashworth',
    'N/A',
  ];
  names.forEach((name, i) => (referrals.getRow(i + 2).values = [i + 1, name]));
  const staff = wb.addWorksheet('Staff');
  staff.getRow(1).values = ['Staff Name', 'Role'];
  staff.getRow(2).values = ['Helen Bradshaw', 'Head of Year'];

  const result = P.processWorkbook(wb, planFrom(P.analyseWorkbook(wb)), { random: seeded(10) });
  assert.deepEqual(
    names.map((_, i) => referrals.getCell(i + 2, 2).value),
    ['HB3', 'HB2', 'HB3', 'HB3', 'HB1', 'TA', 'HB3 / TA', 'N/A']
  );
  assert.equal(staff.getCell('A2').value, 'HB3', 'same person, same number on another sheet');
  assert.deepEqual(result.numberedInitials, [
    {
      initials: 'HB',
      people: [
        { code: 'HB1', name: 'Mrs H Bradshaw' },
        { code: 'HB2', name: 'Hannah Brooke' },
        { code: 'HB3', name: 'Helen Bradshaw' },
      ],
    },
  ]);
});

test('each run makes different pseudonyms by default', async () => {
  const runs = [];
  for (let i = 0; i < 2; i++) {
    const wb = await load(await buildInput());
    P.processWorkbook(wb, planFrom(P.analyseWorkbook(wb)));
    const ws = wb.getWorksheet('Referrals');
    runs.push([4, 5, 6, 7, 8, 9].map((r) => ws.getCell(r, 2).value).join('|'));
  }
  assert.notEqual(runs[0], runs[1]);
});

test('vendored ExcelJS matches the tested version', () => {
  const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  const vendored = path.join(__dirname, '..', 'vendor', 'exceljs.min.js');
  const installed = path.join(path.dirname(require.resolve('exceljs/package.json')), 'dist', 'exceljs.min.js');
  assert.equal(hash(vendored), hash(installed), 'run `npm run vendor` after changing the exceljs version');
});
