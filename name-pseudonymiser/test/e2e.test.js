// Drives index.html in a real browser with the sample workbook. Skipped when
// Playwright is not installed (it is not a dependency of this project).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ExcelJS = require('exceljs');

let chromium = null;
try {
  ({ chromium } = require('playwright'));
} catch {
  // optional
}

const ROOT = path.join(__dirname, '..');
const SAMPLE = path.join(ROOT, 'sample', 'referrals-sample.xlsx');

async function readBook(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  return wb;
}

test('browser: sample workbook end to end', { skip: !chromium && 'Playwright is not installed' }, async (t) => {
  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    t.skip(`Chromium could not start: ${err.message.split('\n')[0]}`);
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pseudonymiser-'));
  try {
    const page = await browser.newPage({ acceptDownloads: true });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const requests = [];
    page.on('request', (r) => requests.push(r.url()));

    await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);
    await page.setInputFiles('#file', SAMPLE);
    await page.waitForSelector('#configure:not([hidden])');

    const choices = await page.$$eval('select[data-sheet]', (els) =>
      els.map((s) => `${s.dataset.sheet}!${s.dataset.column}=${s.value}`)
    );
    for (const expected of [
      'Referrals!B=pseudonym',
      'Referrals!D=pseudonym',
      'Referrals!E=initials',
      'Referrals!H=keep',
      'Staff!A=initials',
      'Staff!C=keep',
    ]) {
      assert.ok(choices.includes(expected), `${expected} not in ${choices}`);
    }

    await page.click('#run');
    await page.waitForSelector('#results:not([hidden])');
    const summary = await page.textContent('#summary');
    assert.match(summary, /HB is shared by Helen Bradshaw, Hannah Brooke/);

    const save = async (button) => {
      const [download] = await Promise.all([page.waitForEvent('download'), page.click(button)]);
      const file = path.join(dir, download.suggestedFilename());
      await download.saveAs(file);
      return file;
    };
    const outFile = await save('#download-file');
    const keyFile = await save('#download-key');
    assert.equal(path.basename(outFile), 'referrals-sample-pseudonymised.xlsx');
    assert.equal(path.basename(keyFile), 'referrals-sample-key.xlsx');

    const before = (await readBook(SAMPLE)).getWorksheet('Referrals');
    const after = (await readBook(outFile)).getWorksheet('Referrals');
    for (let r = 4; r <= 15; r++) {
      const student = before.getCell(r, 2).value;
      assert.notEqual(after.getCell(r, 2).value, student, `row ${r}`);
      const initials = before.getCell(r, 5).value.split(/[\s-]+/).map((w) => w[0]).join('');
      assert.equal(after.getCell(r, 5).value, initials, `row ${r}`);
      assert.equal(after.getCell(r, 7).value, before.getCell(r, 7).value, 'status unchanged');
      assert.equal(after.getCell(r, 8).result, undefined, 'summary result cleared');
    }
    assert.equal(after.getCell('B4').value, after.getCell('B13').value, 'repeat student, same pseudonym');
    assert.equal(after.getCell('D14').value, 'N/A');

    const key = (await readBook(keyFile)).getWorksheet('Key');
    assert.ok(key.rowCount > 20);

    assert.deepEqual(errors, []);
    assert.deepEqual(requests.filter((u) => !u.startsWith('file:') && !u.startsWith('blob:')), [], 'no network requests');
  } finally {
    await browser.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
