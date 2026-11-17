/*
 * Core logic for the Name Pseudonymiser.
 *
 * Works on ExcelJS workbooks and never touches the DOM, so the same file runs
 * in the browser (as window.Pseudonymiser) and in Node for the tests.
 *
 * Pseudonyms and scrambles are made word by word: every distinct word gets
 * one replacement, used everywhere it appears. "John Smith", "Smith, John"
 * and a "Surname" column holding "Smith" therefore stay consistent with each
 * other. Initials are worked out per cell.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./names.js'));
  } else {
    root.Pseudonymiser = factory(root.PseudonymiserNames);
  }
})(typeof self !== 'undefined' ? self : this, function (NAMES) {
  'use strict';

  const ACTIONS = ['keep', 'pseudonym', 'scramble', 'initials'];

  // ExcelJS cell types (ExcelJS.ValueType).
  const MERGE = 1;
  const FORMULA = 6;

  // Words left as they are inside a name.
  const TITLES = new Set(
    'mr mrs ms miss mx dr prof professor sir dame lady lord rev revd reverend fr father sister br brother master madam mme mlle herr frau cllr'.split(' ')
  );
  const SUFFIXES = new Set('jr jnr junior sr snr senior ii iii iv phd mbe obe cbe esq'.split(' '));
  // Kept only when written in lower case and not first: "Ludwig van Beethoven" but not "Van Morrison".
  const PARTICLES = new Set('van von der den de del della di da du dos das le la al el bin binti bint ibn ap'.split(' '));
  const CONNECTORS = new Set(['of', 'the']);

  // Whole-cell values that are not names and are left alone.
  const PLACEHOLDERS = new Set([
    'n/a', 'na', 'n.a.', 'none', 'nil', 'null', 'unknown', 'not known', 'tbc', 'tbd', 'tba',
    'not applicable', 'unassigned', 'vacant', 'various', 'other', 'anonymous',
    'total', 'totals', 'grand total', 'subtotal', 'sub-total', 'sum', 'average',
  ]);

  const WORD_RE = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu;
  const PERSON_SEP_RE = /[;/&+|\n\r]/;
  const HYPHEN_RE = /^[-‐‑–]$/;
  const NAMEISH_RE = /^[\p{L}\p{M}][\p{L}\p{M}'’.\-\s,]*$/u;
  const CONSONANTS = 'bcdfghjklmnprstvwz';
  const VOWELS = 'aeiou';
  const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

  /* ------------------------------------------------------------------ */
  /* Small helpers                                                       */
  /* ------------------------------------------------------------------ */

  function columnLetter(n) {
    let s = '';
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  function wordKey(word) {
    return word.normalize('NFC').replace(/’/g, "'").toLowerCase();
  }

  // "StaffName", "staff_name" and "Staff Name" all become "staff name".
  function normaliseHeader(header) {
    return String(header || '')
      .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .toLowerCase();
  }

  // Text of a cell that could hold a name: strings, rich text, link text and
  // text results of formulas. Numbers, dates, booleans and errors give null.
  function cellText(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    if (typeof value !== 'object' || value instanceof Date) return null;
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text || '').join('');
    if (value.hyperlink !== undefined && value.text !== undefined) return cellText(value.text);
    if (value.formula !== undefined || value.sharedFormula !== undefined) return cellText(value.result);
    return null;
  }

  // Any value as display text (used for headers and examples).
  function displayText(value) {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object') {
      const text = cellText(value);
      if (text !== null) return text;
      if (value.result !== undefined && value.result !== null) return displayText(value.result);
      if (value.error) return String(value.error);
      return '';
    }
    return String(value);
  }

  function isTextResult(result) {
    return typeof result === 'string' || Boolean(result && Array.isArray(result.richText));
  }

  function isPlaceholder(text) {
    const t = text.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
    return PLACEHOLDERS.has(t) || !/\p{L}/u.test(t);
  }

  function shuffle(items, random) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function cryptoRandom() {
    const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    if (!c || typeof c.getRandomValues !== 'function') {
      throw new Error('No secure random number source is available.');
    }
    const buf = new Uint32Array(1);
    return () => {
      c.getRandomValues(buf);
      return buf[0] / 4294967296;
    };
  }

  // Applies the case style of the original word: SMITH -> CARTER, smith -> carter.
  function matchCase(template, canonical) {
    const letters = template.replace(/[^\p{L}]/gu, '');
    const upper = letters.toUpperCase();
    const lower = letters.toLowerCase();
    if (upper === lower) return canonical; // script without case
    if (letters === upper && [...letters].length > 1) return canonical.toUpperCase();
    if (letters === lower) return canonical.toLowerCase();
    return canonical;
  }

  /* ------------------------------------------------------------------ */
  /* Reading names                                                       */
  /* ------------------------------------------------------------------ */

  function tokenize(text) {
    const tokens = [];
    let last = 0;
    for (const m of text.matchAll(WORD_RE)) {
      if (m.index > last) tokens.push({ word: false, text: text.slice(last, m.index) });
      tokens.push({ word: true, text: m[0] });
      last = m.index + m[0].length;
    }
    if (last < text.length) tokens.push({ word: false, text: text.slice(last) });
    return tokens;
  }

  function classify(word, firstInPart) {
    const lower = word.toLowerCase();
    if (TITLES.has(lower)) return 'keep';
    if (firstInPart) return 'name';
    if (SUFFIXES.has(lower) || CONNECTORS.has(lower)) return 'keep';
    if (PARTICLES.has(lower) && word === lower) return 'keep';
    return 'name';
  }

  // Groups the name words of one comma-separated part into units. Words joined
  // by a hyphen (Mary-Jane, Smith-Jones) form one unit.
  function describePart(tokens, part) {
    const units = [];
    let titled = false;
    part.forEach((i, pos) => {
      const t = tokens[i];
      t.kind = classify(t.text, pos === 0);
      if (t.kind !== 'name') {
        if (TITLES.has(t.text.toLowerCase())) titled = true;
        return;
      }
      const prev = units[units.length - 1];
      if (prev && prev[prev.length - 1] === i - 2 && HYPHEN_RE.test(tokens[i - 1].text)) prev.push(i);
      else units.push([i]);
    });
    return { units, titled };
  }

  /*
   * Splits a cell into tokens and marks each name word with a role:
   * 'first' (given name) or 'last' (family name). Handles "First Last",
   * "Last, First", titles ("Mrs Smith"), hyphenated names and several people
   * in one cell ("A Smith / B Jones", "A Smith and B Jones").
   * columnRole ('first' | 'last' | null) comes from headers such as "Surname".
   */
  function parseName(text, columnRole) {
    const tokens = tokenize(text);
    const persons = [];
    let group = [];
    let joiner = '';

    const setRole = (units, role) => units.forEach((u) => u.forEach((i) => (tokens[i].role = role)));

    const addGroup = () => {
      const parts = [[]];
      for (const i of group) {
        const t = tokens[i];
        if (t.word) parts[parts.length - 1].push(i);
        else if (t.text.includes(',')) parts.push([]);
      }
      const infos = parts.map((part) => describePart(tokens, part)).filter((p) => p.units.length);
      if (infos.length === 2 && !(infos[0].units.length > 1 && infos[1].units.length > 1)) {
        // "Smith, John": one person, family name first.
        setRole(infos[0].units, 'last');
        setRole(infos[1].units, 'first');
        persons.push({ joiner, words: [...infos[1].units.flat(), ...infos[0].units.flat()] });
      } else {
        infos.forEach((p, k) => {
          const n = p.units.length;
          p.units.forEach((unit, u) => setRole([unit], u === n - 1 && (n > 1 || p.titled) ? 'last' : 'first'));
          persons.push({ joiner: k === 0 ? joiner : ',', words: p.units.flat() });
        });
      }
      group = [];
    };

    tokens.forEach((t, i) => {
      const splits = t.word ? t.text.toLowerCase() === 'and' : PERSON_SEP_RE.test(t.text);
      if (!splits) {
        group.push(i);
        return;
      }
      if (t.word) t.kind = 'keep';
      addGroup();
      joiner = t.word ? 'and' : t.text;
    });
    addGroup();

    if (columnRole) {
      for (const t of tokens) if (t.kind === 'name') t.role = columnRole;
    }
    return { tokens, persons };
  }

  // Header wording that says which part of a name a column holds.
  function headerRole(header) {
    const h = normaliseHeader(header);
    if (/\b(surnames?|last ?names?|family names?|maiden names?)\b/.test(h)) return 'last';
    if (/\b(first ?names?|forenames?|given names?|middle names?|christian names?)\b/.test(h)) return 'first';
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Making replacements                                                 */
  /* ------------------------------------------------------------------ */

  function pronounceable(length, random) {
    let vowel = random() < 0.35;
    let s = '';
    for (let i = 0; i < length; i++) {
      const set = vowel ? VOWELS : CONSONANTS;
      s += set[Math.floor(random() * set.length)];
      vowel = !vowel;
    }
    return s;
  }

  /*
   * Hands out replacements. Each distinct word gets exactly one replacement
   * per kind ('first', 'last', 'scramble'), no two words share one, and a
   * replacement is never a word that appears in the data (`excluded`), so a
   * pseudonym can't be mistaken for a real person in the file.
   */
  function createReplacer(random, excluded) {
    const maps = { first: new Map(), last: new Map(), scramble: new Map(), letter: new Map() };
    const used = { first: new Set(), last: new Set(), scramble: new Set(), letter: new Set() };
    const lists = { first: NAMES.FIRST, last: NAMES.SURNAMES };
    const pools = {};
    const pick = (items) => items[Math.floor(random() * items.length)];

    const isFree = (kind, candidate) => {
      const k = wordKey(candidate);
      return !used[kind].has(k) && !k.split('-').some((p) => excluded.has(p));
    };

    // Pronounceable first, then any letters, then one letter longer.
    function invent(kind, length) {
      for (let len = Math.max(2, length); ; len++) {
        for (let tries = 0; tries < 400; tries++) {
          const raw = tries < 200 ? pronounceable(len, random) : Array.from({ length: len }, () => pick(LETTERS)).join('');
          const candidate = raw.charAt(0).toUpperCase() + raw.slice(1);
          if (isFree(kind, candidate)) return candidate;
        }
      }
    }

    function fromList(kind) {
      if (!pools[kind]) pools[kind] = shuffle(lists[kind], random);
      const pool = pools[kind];
      while (pool.length) {
        const candidate = pool.pop();
        if (isFree(kind, candidate)) return candidate;
      }
      // List used up: double-barrelled combinations, then invented names.
      const base = lists[kind].filter((n) => !excluded.has(wordKey(n)));
      if (base.length > 1) {
        for (let tries = 0; tries < 5000; tries++) {
          const a = pick(base);
          const b = pick(base);
          if (a !== b && isFree(kind, `${a}-${b}`)) return `${a}-${b}`;
        }
      }
      return invent(kind, 6);
    }

    function letterFor(word) {
      const k = wordKey(word);
      if (!maps.letter.has(k)) {
        const free = LETTERS.filter((l) => l !== k && !used.letter.has(l));
        const letter = free.length ? pick(free) : pick(LETTERS.filter((l) => l !== k));
        maps.letter.set(k, letter);
        used.letter.add(letter);
      }
      return maps.letter.get(k);
    }

    // kind: 'first' | 'last' | 'scramble'
    function word(original, kind) {
      const letterCount = [...original.replace(/[^\p{L}]/gu, '')].length;
      if (letterCount <= 1) return matchCase(original, letterFor(original).toUpperCase());
      const k = wordKey(original);
      const map = maps[kind];
      if (!map.has(k)) {
        const replacement = kind === 'scramble' ? invent('scramble', letterCount) : fromList(kind);
        map.set(k, replacement);
        used[kind].add(wordKey(replacement));
      }
      return matchCase(original, map.get(k));
    }

    return { word };
  }

  // Pseudonym or scramble for one cell. method: 'pseudonym' | 'scramble'.
  function replaceNames(text, method, columnRole, replacer) {
    const { tokens } = parseName(text.normalize('NFC'), columnRole);
    return tokens
      .map((t) => {
        if (!t.word || t.kind !== 'name') return t.text;
        return replacer.word(t.text, method === 'scramble' ? 'scramble' : t.role || 'first');
      })
      .join('');
  }

  function formatJoiner(joiner) {
    if (/[\n\r]/.test(joiner)) return '\n';
    const s = joiner.trim();
    if (!s) return ' ';
    if (s === ',' || s === ';') return `${s} `;
    return ` ${s} `;
  }

  // Initials for one cell, plus each person's name (used to spot two people
  // who end up with the same initials).
  function initialsDetail(text) {
    const { tokens, persons } = parseName(text.normalize('NFC'), null);
    const people = persons
      .filter((p) => p.words.length)
      .map((p) => ({
        joiner: p.joiner,
        initials: p.words
          .map((i) => (tokens[i].text.match(/\p{L}/u) || [''])[0])
          .join('')
          .toUpperCase(),
        name: p.words.map((i) => wordKey(tokens[i].text)).join(' '),
      }));
    if (!people.length) return { text, people };
    const out = people.map((p, k) => (k ? formatJoiner(p.joiner) : '') + p.initials).join('');
    return { text: out, people };
  }

  function toInitials(text) {
    return isPlaceholder(text) ? text : initialsDetail(text).text;
  }

  /* ------------------------------------------------------------------ */
  /* Reading the workbook                                                */
  /* ------------------------------------------------------------------ */

  function looksLikeNames(samples) {
    const texts = samples.filter((s) => typeof s === 'string' && s.trim()).slice(0, 50);
    if (!texts.length) return false;
    const ok = texts.filter((s) => NAMEISH_RE.test(s.trim())).length;
    return ok / texts.length >= 0.8;
  }

  /*
   * Default action for a column:
   *  - header mentions staff (as a word) and holds names -> initials
   *  - header contains "name" anywhere                   -> pseudonym
   *  - anything else                                     -> keep
   */
  function suggestAction(header, samples) {
    const h = String(header || '');
    const hasName = h.toLowerCase().includes('name');
    const isStaff = /\bstaff\b/.test(normaliseHeader(h));
    if (isStaff && (hasName || looksLikeNames(samples || []))) return 'initials';
    if (hasName) return 'pseudonym';
    return 'keep';
  }

  function isCandidateHeader(text) {
    return text.toLowerCase().includes('name') || /\bstaff\b/.test(normaliseHeader(text));
  }

  function rowTexts(ws, r) {
    const row = ws.findRow(r);
    const texts = [];
    if (!row) return texts;
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.type === MERGE) return;
      const t = displayText(cell.value).trim();
      if (t) texts.push(t);
    });
    return texts;
  }

  // The header row is the first of the top 20 rows with at least two filled
  // cells, preferring one that mentions a name or staff column. A one-cell
  // title row above the table is skipped.
  function detectHeaderRow(ws, maxScan = 20) {
    let firstAny = 0;
    let firstMulti = 0;
    const last = Math.min(ws.rowCount, maxScan);
    for (let r = 1; r <= last; r++) {
      const texts = rowTexts(ws, r);
      if (!texts.length) continue;
      if (!firstAny) firstAny = r;
      if (texts.length < 2) continue;
      if (!firstMulti) firstMulti = r;
      if (texts.some(isCandidateHeader)) return r;
    }
    return firstMulti || firstAny || 1;
  }

  function analyseSheet(ws, headerRow) {
    const hr = headerRow || detectHeaderRow(ws);
    const header = ws.findRow(hr);
    const lastSample = Math.min(ws.rowCount, hr + 200);
    const columnCount = ws.columnCount; // ExcelJS recomputes this on every read
    const columns = [];
    for (let c = 1; c <= columnCount; c++) {
      const hcell = header && header.findCell(c);
      const h = hcell && hcell.type !== MERGE ? displayText(hcell.value).trim() : '';
      const texts = [];
      const examples = [];
      for (let r = hr + 1; r <= lastSample; r++) {
        const cell = ws.findCell(r, c);
        if (!cell || cell.type === MERGE) continue;
        const text = cellText(cell.value);
        if (text !== null && text.trim()) texts.push(text.trim());
        const shown = displayText(cell.value).trim();
        if (shown && examples.length < 3 && !examples.includes(shown)) examples.push(shown);
      }
      if (!h && !examples.length) continue;
      columns.push({
        index: c,
        letter: columnLetter(c),
        header: h,
        examples,
        suggested: suggestAction(h, texts),
        role: headerRole(h),
      });
    }
    return { name: ws.name, state: ws.state, headerRow: hr, rowCount: ws.rowCount, columns };
  }

  function analyseWorkbook(workbook) {
    return workbook.worksheets.map((ws) => analyseSheet(ws));
  }

  /* ------------------------------------------------------------------ */
  /* Changing the workbook                                               */
  /* ------------------------------------------------------------------ */

  // Visits every existing cell, including empty ones that carry a comment,
  // without creating new rows or cells.
  function eachCell(workbook, fn) {
    for (const ws of workbook.worksheets) {
      for (let r = 1; r <= ws.rowCount; r++) {
        const row = ws.findRow(r);
        if (!row) continue;
        for (let c = 1; c <= row.cellCount; c++) {
          const cell = row.findCell(c);
          if (cell) fn(ws, cell);
        }
      }
    }
  }

  function eachFormulaCell(workbook, fn) {
    eachCell(workbook, (ws, cell) => {
      if (cell.type === FORMULA) fn(ws, cell);
    });
  }

  /*
   * Applies a plan to the workbook in place.
   *
   * plan = { sheets: [{ name, headerRow, columns: [{ index, action }] }] }
   * action is one of 'keep' | 'pseudonym' | 'scramble' | 'initials'.
   * options.random: () => number in [0, 1); defaults to crypto.getRandomValues.
   *
   * Returns the key (original -> replacement) and a summary of what changed.
   */
  function processWorkbook(workbook, plan, options = {}) {
    const random = options.random || cryptoRandom();

    const jobs = [];
    for (const sheetPlan of plan.sheets || []) {
      const ws = workbook.getWorksheet(sheetPlan.name);
      if (!ws) throw new Error(`Sheet not found: ${sheetPlan.name}`);
      const headerRow = sheetPlan.headerRow || detectHeaderRow(ws);
      for (const col of sheetPlan.columns || []) {
        if (!ACTIONS.includes(col.action)) throw new Error(`Unknown action: ${col.action}`);
        if (col.action === 'keep') continue;
        const hcell = ws.findCell(headerRow, col.index);
        const header = hcell ? displayText(hcell.value).trim() : '';
        jobs.push({
          order: jobs.length,
          ws,
          headerRow,
          index: col.index,
          letter: columnLetter(col.index),
          header,
          action: col.action,
          role: headerRole(header),
          cells: 0,
          originals: new Set(),
        });
      }
    }

    // 1. Find the cells to change and every word in them.
    const targets = [];
    const excluded = new Set();
    for (const job of jobs) {
      for (let r = job.headerRow + 1; r <= job.ws.rowCount; r++) {
        const cell = job.ws.findCell(r, job.index);
        if (!cell || cell.type === MERGE) continue;
        const text = cellText(cell.value);
        if (text === null || !text.trim()) continue;
        targets.push({ job, cell, text });
        for (const m of text.normalize('NFC').matchAll(WORD_RE)) excluded.add(wordKey(m[0]));
      }
    }

    // 2. Work out each replacement.
    const replacer = createReplacer(random, excluded);
    const keyEntries = new Map();
    const initialsSeen = new Map(); // initials -> Map(person -> example text)
    const flattened = { formulas: 0, hyperlinks: 0, richText: 0 };
    const changes = [];

    for (const { job, cell, text } of targets) {
      let replacement;
      if (isPlaceholder(text)) {
        replacement = text;
      } else if (job.action === 'initials') {
        const detail = initialsDetail(text);
        replacement = detail.text;
        for (const p of detail.people) {
          if (!initialsSeen.has(p.initials)) initialsSeen.set(p.initials, new Map());
          const people = initialsSeen.get(p.initials);
          if (!people.has(p.name)) people.set(p.name, text.trim());
        }
      } else {
        replacement = replaceNames(text, job.action, job.role, replacer);
      }

      const original = text.trim();
      job.cells++;
      job.originals.add(original);
      const entryKey = `${job.order}\u0000${original}`;
      const entry = keyEntries.get(entryKey);
      if (entry) entry.cells++;
      else {
        keyEntries.set(entryKey, {
          order: job.order,
          sheet: job.ws.name,
          column: job.letter,
          header: job.header,
          action: job.action,
          original,
          replacement: replacement.trim(),
          cells: 1,
        });
      }

      const value = cell.value;
      if (typeof value === 'string' && value === replacement) continue;
      if (value && typeof value === 'object') {
        if (value.formula !== undefined || value.sharedFormula !== undefined) flattened.formulas++;
        else if (value.hyperlink !== undefined) flattened.hyperlinks++;
        else if (value.richText) flattened.richText++;
      }
      changes.push({ ws: job.ws, cell, value: replacement });
    }

    // 3. A shared formula whose master cell is about to become plain text must
    //    get its own copy of the formula first, or the file can't be saved.
    const changing = new Set(changes.map((c) => `${c.ws.name}!${c.cell.address}`));
    eachFormulaCell(workbook, (ws, cell) => {
      const v = cell.value;
      if (!v.sharedFormula) return;
      if (!changing.has(`${ws.name}!${v.sharedFormula}`) || changing.has(`${ws.name}!${cell.address}`)) return;
      const formula = cell.formula;
      if (!formula) cell.value = v.result === undefined ? null : v.result;
      else cell.value = v.result === undefined ? { formula } : { formula, result: v.result };
    });

    // 4. Write the replacements. Cell formatting is kept.
    for (const c of changes) c.cell.value = c.value;

    // 5. Formulas elsewhere keep a cached copy of their last text result, which
    //    may contain a real name (e.g. =B2&" "&C2). Drop those cached results;
    //    Excel recalculates them from the pseudonymised cells on opening.
    let clearedResults = 0;
    eachFormulaCell(workbook, (ws, cell) => {
      const v = cell.value;
      if (!isTextResult(v.result)) return;
      delete v.result;
      cell.value = v;
      clearedResults++;
    });
    if (clearedResults) {
      workbook.calcProperties = Object.assign({}, workbook.calcProperties, { fullCalcOnLoad: true });
    }

    // 6. The file's author fields often hold a staff member's name.
    workbook.creator = '';
    workbook.lastModifiedBy = '';

    // 7. Cell comments are not changed; count them so the user can check them.
    let comments = 0;
    eachCell(workbook, (ws, cell) => {
      if (cell.note) comments++;
    });

    const initialsClashes = [];
    for (const [initials, people] of initialsSeen) {
      if (people.size > 1) initialsClashes.push({ initials, names: [...people.values()] });
    }

    const key = [...keyEntries.values()].sort(
      (a, b) => a.order - b.order || a.original.localeCompare(b.original)
    );

    return {
      columns: jobs.map((j) => ({
        sheet: j.ws.name,
        column: j.letter,
        header: j.header,
        action: j.action,
        cells: j.cells,
        unique: j.originals.size,
      })),
      key: key.map(({ order, ...rest }) => rest),
      initialsClashes,
      clearedResults,
      flattened,
      comments,
    };
  }

  const ACTION_NAMES = { pseudonym: 'Pseudonym', scramble: 'Scramble', initials: 'Initials' };

  // The re-identification key as a new workbook. ExcelJS is passed in so this
  // file does not depend on how the library was loaded.
  function buildKeyWorkbook(ExcelJS, result, info = {}) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Key');
    ws.columns = [
      { header: 'Sheet', key: 'sheet', width: 18 },
      { header: 'Column', key: 'column', width: 9 },
      { header: 'Header', key: 'header', width: 24 },
      { header: 'Method', key: 'method', width: 12 },
      { header: 'Original', key: 'original', width: 32 },
      { header: 'Replacement', key: 'replacement', width: 32 },
      { header: 'Cells', key: 'cells', width: 8 },
    ];
    for (const e of result.key) {
      ws.addRow({ ...e, method: ACTION_NAMES[e.action] || e.action });
    }
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: 'A1', to: 'G1' };

    const about = wb.addWorksheet('About');
    about.getColumn(1).width = 100;
    const lines = [
      'Re-identification key',
      info.sourceName ? `Source file: ${info.sourceName}` : '',
      `Created: ${(info.createdAt || new Date()).toISOString()}`,
      'Anyone with this key can reverse the pseudonymisation.',
      'Store it securely, separately from the pseudonymised file, and never send the two together.',
    ].filter(Boolean);
    lines.forEach((line, i) => (about.getCell(i + 1, 1).value = line));
    about.getCell(1, 1).font = { bold: true, size: 14 };
    return wb;
  }

  return {
    ACTIONS,
    analyseSheet,
    analyseWorkbook,
    buildKeyWorkbook,
    columnLetter,
    createReplacer,
    detectHeaderRow,
    headerRole,
    initialsDetail,
    isPlaceholder,
    parseName,
    processWorkbook,
    replaceNames,
    suggestAction,
    toInitials,
  };
});
