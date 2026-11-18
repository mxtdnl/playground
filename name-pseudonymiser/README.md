# name-pseudonymiser

**Status:** active

Browser tool that replaces names in an Excel workbook with pseudonyms, scrambled letters or initials, and produces a separate key to reverse it. Nothing is uploaded: the file is processed in the browser tab.

## Run

Open `index.html` in a browser. It works offline: the ExcelJS library is bundled in `vendor/`.

1. Choose an `.xlsx` or `.xlsm` file (or try `sample/referrals-sample.xlsx`, which holds invented data).
2. Check the suggested action for each column and the header row of each sheet.
3. Click **Create pseudonymised file**, then download the file and, if you need to reverse it later, the key.

Keep `index.html`, `src/` and `vendor/` together.

## Test

```bash
npm install
```

```bash
npm test
```

`test/e2e.test.js` drives the page in Chromium when Playwright is installed (it is not a dependency) and is skipped otherwise. `npm run sample` rebuilds the sample workbook; `npm run vendor` copies the ExcelJS browser build into `vendor/` after a version change (a test fails if the two differ).

## How it works

Default action per column (every choice can be changed before running):

| Header | Default | Example |
|---|---|---|
| the word "staff", plus "name" or name-like values (`Staff`, `Staff Name`, `Member of staff`) | Initials | Mr John Smith → JS |
| contains "name" anywhere (`Student Name`, `Surname`, `Forename`, `Username`) | Pseudonym | John Smith → Avery Carter |
| anything else | Keep | |

**Scramble** is also available: each name becomes random, pronounceable letters of the same length (Smith → Rovek). It is not an anagram of the original, which would be easy to reverse.

- **Header row:** the first of the top 20 rows with at least two filled cells, preferring one that mentions a name or staff column, so a title row above the table is skipped. It can be changed per sheet.
- **One replacement per word, everywhere.** Pseudonyms and scrambles are made word by word across the whole workbook, so `John Smith`, `Smith, John`, `SMITH` in a Surname column and the same person on another sheet all stay consistent. People who share a surname keep sharing a (different) one.
- **Pseudonyms** use gender-neutral given names, so a pseudonym never suggests a gender, and a separate surname list (double-barrelled names once a list runs out). A pseudonym is never a word that appears in the chosen columns, and no two names share one.
- **Kept as they are:** titles (Mr, Dr), lower-case particles (van, de), letter case (SMITH → CARTER), placeholders (N/A, Unknown, TBC, Total), numbers and dates. Single initials map to another letter (J. Smith → K. Carter).
- **Initials** handle titles, `Surname, Forename`, hyphens (Mary-Jane O'Brien → MJO) and several people in one cell (`John Smith / Jane Doe` → `JS / JD`).
- **Shared initials are numbered** in alphabetical order of name: Hannah Brooke → HB1, Helen Bradshaw → HB2. Row order doesn't matter, so each person has the same number on every sheet, and in any other export that lists the same people. The summary and the key show who is who. People are matched by name as written, ignoring case, titles and `Surname, Forename` order, so `H Bradshaw` and `Helen Bradshaw` count as two people.
- **Key:** a separate workbook listing sheet, column, header, method, original, replacement and cell count. Every run uses fresh random pseudonyms (`crypto.getRandomValues`), so a key only matches the file from the same run.

To stop real names surviving elsewhere in the file:

- Formulas in the chosen columns become plain text, and links and mixed formatting in those cells are removed.
- Formulas in other columns keep their formula but lose their cached text result, which could still hold a real name (e.g. `=B2&" "&C2`). The file is flagged to recalculate on opening; LibreOffice 24.2 did so in testing. Excel was not available to test.
- The file's author and last-modified-by fields are set to "Unknown".

## Limitations

- Not changed: names in other columns, free-text notes, sheet names, column headers and cell comments (the summary says how many comments there are).
- The output is always `.xlsx`. Features ExcelJS cannot read are not carried over: charts are dropped (tested), as are comments on empty cells; an `.xlsm` file's macros cannot be kept in an `.xlsx`.
- Files with charts made by Python's openpyxl cannot be read (an ExcelJS parsing limitation); re-saving them in LibreOffice fixed this in testing.
- `.xls`, `.csv` and password-protected files are not supported; save them as unprotected `.xlsx` first.
- Pseudonymised data is still personal data. Check the output before sharing it, and store the key separately.

## Notes

- `src/pseudonymiser.js` holds all logic and runs in both the browser and Node; `src/app.js` is the page; `src/names.js` holds the name lists.
- `npm audit` reports a moderate advisory for `uuid` (an ExcelJS dependency) about v3/v5/v6 IDs with a caller-supplied buffer. ExcelJS only calls `v4()`, so that code path is not used.
