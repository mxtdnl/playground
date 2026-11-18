/* Browser side of the Name Pseudonymiser: file handling, column choices, downloads. */
(function () {
  'use strict';

  const P = window.Pseudonymiser;
  const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const ACTION_LABELS = {
    keep: 'Keep as is',
    pseudonym: 'Pseudonym',
    scramble: 'Scramble',
    initials: 'Initials',
  };
  const PREVIEW_ROWS = 5;

  const $ = (id) => document.getElementById(id);
  const state = { fileName: '', buffer: null, workbook: null, sheets: [], result: null };

  // Builds elements without innerHTML, so cell contents can never become markup.
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  const plural = (n, one, many) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
  const baseName = (name) => name.replace(/\.(xlsx|xlsm)$/i, '');

  function showError(message) {
    const box = $('file-error');
    box.textContent = message;
    box.hidden = !message;
  }

  function clearResult() {
    state.result = null;
    $('results').hidden = true;
    $('summary').replaceChildren();
  }

  /* ---------------------------------------------------------------- */
  /* Step 1: load                                                      */
  /* ---------------------------------------------------------------- */

  async function loadFile(file) {
    showError('');
    clearResult();
    $('configure').hidden = true;
    $('file-name').hidden = true;
    if (!/\.(xlsx|xlsm)$/i.test(file.name)) {
      showError('Choose an .xlsx or .xlsm file. Save .xls and .csv files as .xlsx in Excel first.');
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer.slice(0));
      state.fileName = file.name;
      state.buffer = buffer;
      state.workbook = workbook;
      state.sheets = workbook.worksheets.map((ws) => withChoices(P.analyseSheet(ws)));
    } catch (err) {
      console.error(err);
      showError(
        "This file couldn't be read. It may be password-protected, not a real .xlsx file, or contain something " +
          `the reader can't handle; re-saving it in Excel often helps. (Details: ${err.message})`
      );
      return;
    }
    $('file-name').textContent = file.name;
    $('file-name').hidden = false;
    renderSheets();
    $('configure').hidden = false;
  }

  function withChoices(sheet) {
    sheet.columns.forEach((c) => (c.action = c.suggested));
    return sheet;
  }

  /* ---------------------------------------------------------------- */
  /* Step 2: choose columns                                            */
  /* ---------------------------------------------------------------- */

  function actionSelect(sheet, col) {
    const label = `Change column ${col.letter}${col.header ? ` (${col.header})` : ''} on sheet ${sheet.name} to`;
    const select = el(
      'select',
      {
        'aria-label': label,
        'data-sheet': sheet.name,
        'data-column': col.letter,
        onchange: (e) => {
          col.action = e.target.value;
          e.target.closest('tr').classList.toggle('changed', col.action !== 'keep');
          clearResult();
          updateRunButton();
        },
      },
      P.ACTIONS.map((a) => el('option', { value: a, selected: a === col.action }, ACTION_LABELS[a]))
    );
    return select;
  }

  function columnTable(sheet, columns) {
    return el(
      'div',
      { class: 'table-wrap' },
      el(
        'table',
        { class: 'cols' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Col'), el('th', {}, 'Header'), el('th', {}, 'Example values'), el('th', {}, 'Change to'))),
        el(
          'tbody',
          {},
          columns.map((col) =>
            el(
              'tr',
              { class: col.action !== 'keep' ? 'changed' : null },
              el('td', { class: 'col' }, col.letter),
              el('td', { class: 'header' }, col.header || el('span', { class: 'muted' }, '(no header)')),
              el('td', { class: 'examples', title: col.examples.join(' · ') }, col.examples.join(' · ') || '—'),
              el('td', { class: 'action' }, actionSelect(sheet, col))
            )
          )
        )
      )
    );
  }

  function renderSheet(sheet, index) {
    const suggested = sheet.columns.filter((c) => c.suggested !== 'keep');
    const others = sheet.columns.filter((c) => c.suggested === 'keep');
    const headerInput = el('input', {
      type: 'number',
      min: 1,
      max: Math.max(1, sheet.rowCount),
      value: sheet.headerRow,
      'aria-label': `Header row for sheet ${sheet.name}`,
      onchange: (e) => {
        const row = Math.round(Number(e.target.value));
        if (!row || row < 1 || row > Math.max(1, sheet.rowCount)) {
          e.target.value = sheet.headerRow;
          return;
        }
        const ws = state.workbook.getWorksheet(sheet.name);
        state.sheets[index] = withChoices(P.analyseSheet(ws, row));
        clearResult();
        renderSheets();
      },
    });

    return el(
      'section',
      { class: 'sheet' },
      el(
        'div',
        { class: 'sheet-head' },
        el('h3', {}, sheet.name, sheet.state !== 'visible' ? el('span', { class: 'tag' }, 'hidden sheet') : null),
        el('label', { class: 'header-row' }, 'Header row', headerInput)
      ),
      !sheet.columns.length
        ? el('p', { class: 'none' }, 'This sheet is empty.')
        : [
            suggested.length
              ? columnTable(sheet, suggested)
              : el('p', { class: 'none' }, 'No name or staff columns found. Pick any columns to change below.'),
            others.length
              ? el(
                  'details',
                  { open: !suggested.length },
                  el('summary', {}, `Other columns (${others.length})`),
                  columnTable(sheet, others)
                )
              : null,
          ]
    );
  }

  function renderSheets() {
    $('sheets').replaceChildren(...state.sheets.map(renderSheet));
    updateRunButton();
  }

  function planFromChoices() {
    return {
      sheets: state.sheets.map((s) => ({
        name: s.name,
        headerRow: s.headerRow,
        columns: s.columns.filter((c) => c.action !== 'keep').map((c) => ({ index: c.index, action: c.action })),
      })),
    };
  }

  function updateRunButton() {
    const count = state.sheets.reduce((n, s) => n + s.columns.filter((c) => c.action !== 'keep').length, 0);
    $('run').disabled = count === 0;
    $('run-status').textContent = count ? plural(count, 'column will change', 'columns will change') : 'Choose at least one column to change.';
  }

  /* ---------------------------------------------------------------- */
  /* Step 3: run and download                                          */
  /* ---------------------------------------------------------------- */

  async function run() {
    const button = $('run');
    button.disabled = true;
    $('run-status').textContent = 'Working…';
    clearResult();
    try {
      // Start from the untouched upload each time, so runs never stack up.
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(state.buffer.slice(0));
      const summary = P.processWorkbook(workbook, planFromChoices());
      const file = await workbook.xlsx.writeBuffer();
      const key = await P.buildKeyWorkbook(ExcelJS, summary, { sourceName: state.fileName }).xlsx.writeBuffer();
      state.result = { file, key, summary };
      renderResults();
      $('results').hidden = false;
      $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error(err);
      $('summary').replaceChildren(el('p', { class: 'alert error' }, `Something went wrong: ${err.message}`));
      $('results').hidden = false;
    } finally {
      updateRunButton();
    }
  }

  function renderResults() {
    const { summary } = state.result;
    const items = summary.columns.map((c) => {
      const what = { pseudonym: 'pseudonyms', scramble: 'scrambled', initials: 'initials' }[c.action];
      return el(
        'li',
        {},
        el('b', {}, c.header || `Column ${c.column}`),
        ` (${c.sheet}, column ${c.column}): ${plural(c.cells, 'cell', 'cells')}, ${plural(c.unique, 'different value', 'different values')} → ${what}`
      );
    });

    const notes = [];
    for (const group of summary.numberedInitials) {
      notes.push(`Shared initials numbered: ${group.people.map((p) => `${p.code} ${p.name}`).join(', ')}.`);
    }
    const f = summary.flattened;
    if (f.formulas) notes.push(`${plural(f.formulas, 'formula', 'formulas')} in name columns replaced by plain text.`);
    if (f.hyperlinks) notes.push(`${plural(f.hyperlinks, 'link', 'links')} removed from name cells.`);
    if (f.richText) notes.push(`${plural(f.richText, 'cell', 'cells')} with mixed formatting turned into plain text.`);
    if (summary.comments) {
      const n = summary.comments;
      notes.push(`${plural(n, 'cell comment was', 'cell comments were')} left unchanged; check ${n === 1 ? 'it' : 'them'} for names.`);
    }
    if (summary.clearedResults) {
      notes.push(
        `${plural(summary.clearedResults, 'formula result', 'formula results')} could still have shown real names, so Excel will recalculate ${summary.clearedResults === 1 ? 'it' : 'them'} when the file is opened.`
      );
    }

    const byColumn = new Map();
    for (const entry of summary.key) {
      const id = `${entry.sheet}\u0000${entry.column}`;
      if (!byColumn.has(id)) byColumn.set(id, []);
      byColumn.get(id).push(entry);
    }
    const previewRows = [];
    for (const entries of byColumn.values()) {
      const first = entries[0];
      previewRows.push(
        el('tr', {}, el('th', { colspan: 3 }, `${first.header || `Column ${first.column}`} (${first.sheet})`))
      );
      for (const e of entries.slice(0, PREVIEW_ROWS)) {
        previewRows.push(el('tr', {}, el('td', {}, e.original), el('td', { class: 'arrow' }, '→'), el('td', {}, e.replacement)));
      }
    }

    $('summary').replaceChildren(
      el('ul', { class: 'summary' }, items),
      notes.length ? el('div', { class: 'alert warn' }, el('ul', { class: 'summary' }, notes.map((n) => el('li', {}, n)))) : null,
      previewRows.length
        ? el(
            'details',
            {},
            el('summary', {}, 'Preview the first replacements'),
            el('div', { class: 'table-wrap' }, el('table', { class: 'preview' }, el('tbody', {}, previewRows)))
          )
        : null
    );
  }

  function download(buffer, name) {
    const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_TYPE }));
    const link = el('a', { href: url, download: name });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  /* ---------------------------------------------------------------- */
  /* Wiring                                                            */
  /* ---------------------------------------------------------------- */

  $('file').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) loadFile(file);
    e.target.value = '';
  });

  const drop = $('drop');
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  $('run').addEventListener('click', run);
  $('download-file').addEventListener('click', () => {
    if (state.result) download(state.result.file, `${baseName(state.fileName)}-pseudonymised.xlsx`);
  });
  $('download-key').addEventListener('click', () => {
    if (state.result) download(state.result.key, `${baseName(state.fileName)}-key.xlsx`);
  });

  if (!window.ExcelJS || !P) {
    showError('The page did not load completely. Keep index.html next to its src and vendor folders.');
  }
})();
