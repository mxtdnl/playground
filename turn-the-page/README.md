# Turn the Page

**Status:** active (version 1 built: sessions 1–5 done. Awaiting review by a developmental-coaching expert before use with counsellors.)

An illustrated, choose-your-own-adventure coaching simulation for high school guidance, career and university counsellors. Counsellors practise four levers (Question, Support, Observe, Challenge) across two conversations with a fictional student, Maya, 16, and watch her trust, confidence and ownership respond.

It is one self-contained `index.html`: no accounts, no network calls, nothing leaves the browser. It works from GitHub Pages or opened straight from the file system.

**Play it:** <https://mxtdnl.github.io/playground/turn-the-page/> (GitHub Pages serves the repository's `main` branch, so the page shows whatever has been merged to `main`).

## Facilitator notes

### What it teaches

The four learning outcomes (SPEC.md 2; still to be confirmed with the expert):

1. Name the four levers and recognise each one in a counsellor's actual words (Round 2).
2. Explain why the same lever helps at one moment and harms at another, given the student's trust, confidence and traits.
3. Tell a skilful use of a lever from a clumsy use of the same lever (Round 1).
4. Tell a student who *agrees* to a plan from one who *owns* it, and identify moves that build ownership.

There is no single right path. Several different routes reach every ending, and the debrief describes trade-offs, not right and wrong answers. During play the only feedback is Maya's reaction, her posture in the picture and the three meters. Explanation waits for the debrief.

### Timings

| Part | Time |
|---|---|
| Cover, How it works, referral note | 2–3 min |
| Round 1 (seven decisions; lever first, then wording) | 8–10 min |
| Debrief 1 | 3–5 min |
| Round 2, "Two weeks later" (seven decisions; levers hidden, then Name that lever) | 8–10 min |
| Debrief 2 (both sessions, reflection prompts) | 5 min |
| **Total** | **about 25–30 min** |

An early exit (Maya leaves) ends a round after as few as three decisions. That is a legitimate result, and Debrief 1 explains it.

### Running it in a workshop

- **Before.** Open the link on the machine you will present from and check it loads. Each participant needs their own device and browser: progress is saved in that browser only. Tell participants that closing the tab is safe, because reopening the page offers **Resume**. In a private window, or where the browser blocks storage, an ochre notice says that progress will not be saved. The simulation still works.
- **Introduce (3 min).** Show the How it works page: the four levers with their colours and shapes, and the three meters. Say plainly that the meters have no numbers and that there is no single right path.
- **Round 1, solo (10 min).** Ask people to play without discussion. Encourage them to use Back to compare a lever's two wordings before choosing.
- **Pair discussion (5 min).** Using Debrief 1: where did trust move most, and why? Which clumsy wording looked reasonable at the time? **Try a different route** replays Round 1. Use it if there is time, or as homework.
- **Round 2, solo (10 min).** The levers are now hidden, and each choice is followed by Name that lever.
- **Plenary (10–15 min).** Use the three reflection prompts at the end of Debrief 2. Compare endings across the room: the same Round 1 ending can lead to very different Round 2 openings.
- **Same option order for everyone.** Adding `?seed=` and a number to the address (for example `.../turn-the-page/?seed=42`) shows every participant the options in the same order, which makes it easier to talk about "option 2 on page 12". It changes nothing else.
- **Keyboard.** Keys 1–4 choose, Enter confirms and Escape goes back. Everything also works with a mouse or touch.
- **Printing.** Each debrief has **Print this debrief**, which prints a clean paper copy of the path (no buttons or decoration). Other screens print only a one-line note.

### Using Copy summary

At the end of Debrief 2, **Copy summary** copies a few lines of plain text: each round's ending, how often each lever was used and in what order, skilful wording in Round 1, and the lever-recognition score in Round 2. It contains no names and nothing the participant typed, so participants can paste it into a shared document or chat to compare results across the room. If the browser blocks the clipboard, the text is selected instead: press Ctrl+C (Cmd+C on a Mac) to copy it. The simulation never sends anything anywhere: sharing happens only when a participant pastes the text.

### Safeguarding

Maya's case contains no risk indicators (no self-harm, abuse or danger to herself or others). **Real cases with risk indicators follow your school's safeguarding procedure, which this simulation does not cover.** Say this when you introduce it, especially if participants are new to coaching conversations. Coaching levers are not a substitute for a safeguarding referral.

### Still to be validated by an expert

Every number in the engine is an initial value tuned only to meet the calibration criteria, and every trait mapping is a design hypothesis. None is an empirical finding. Present results to counsellors as "in this simulation", not as research. Awaiting review (SPEC.md 17):

- The trait multipliers (SPEC.md 7.5): how self-confidence, extraversion, defensiveness and readiness for change change each lever.
- The base effects, state rules, repetition penalties and the calibrated changes in the SPEC.md Calibration log, including the lowered Breakthrough threshold (Ownership ≥ 45 and Trust ≥ 45).
- The Round 2 starting meters after each Round 1 ending.
- 108 hand-tuned overrides on individual options, all listed in `docs/CONTENT-REVIEW.md`.
- The whole script, the debrief notes and the four referral-note hints. The defensiveness hint is still marked `PLACEHOLDER:` and shows that word on screen in Meet Maya.
- The learning outcomes (SPEC.md 2).

`docs/CONTENT-REVIEW.md` is generated for the reviewer: the whole script for both rounds, with every number.

## Editing the dialogue

All of Maya's case is in `src/content/maya.js`. It is data only: every page (node) and option is commented, so you can change any text between quotes without touching code.

1. Edit the text in `src/content/maya.js`. Keep straight quotes (`'` and `"`); the page shows curly ones. Inside a single-quoted string, write an apostrophe as `\'` (for example `'I\'m fine'`). Mark anything uncertain with `PLACEHOLDER:` at the start.
2. From `turn-the-page/`, rebuild and check:

```bash
node build.mjs
```

```bash
node --test
```

```bash
node tests/calibrate.mjs
```

```bash
node tests/export-review.mjs
```

The build writes `index.html` (never edit it by hand). The tests check that every page links up, every option has a reaction and a debrief note, and that debrief text avoids "correct", "wrong", "optimal" and "should have". The calibrator confirms that every ending can still be reached; it matters when you change an `override` or a `next`, because those change the numbers. Changing words alone does not affect it. The last command regenerates the review document.

3. Commit `src/content/maya.js`, `index.html` and `docs/CONTENT-REVIEW.md` together, and merge to `main` to publish.

## Run

From `turn-the-page/` (Node 22, no dependencies):

```bash
node build.mjs
```

Then open `index.html` in a browser. Progress autosaves in the browser (`localStorage`); reopening the page offers Resume or Start again. `?seed=N` fixes the option order.

## Test

From `turn-the-page/`, after `node build.mjs`:

```bash
node --test
```

```bash
node tests/calibrate.mjs
```

```bash
node tests/contrast.mjs
```

```bash
node tests/art-gallery.mjs
```

- `node --test`: engine, content, interface (`tests/ui.test.mjs`) and accessibility (`tests/a11y.test.mjs`) tests. The accessibility tests cover every screen state at 1440, 390 and 360px wide: focus order and visible focus, 44px targets, headings, labelled images, decorative geometry, the narrow single-column layout with its sticky meter strip, a keyboard-only playthrough, reduced motion, alt text on all 31 pages and the print stylesheet. They write screenshots of every state to `tests/screenshots/states/` (not committed). The browser tests use the Playwright and Chromium preinstalled in cloud sessions and are skipped where Playwright is not available.
- `tests/calibrate.mjs`: the calibration report (SPEC.md 7.8); exits 1 while any criterion fails.
- `tests/contrast.mjs`: WCAG AA contrast for every visible text node and meaningful graphic in 59 screen states at two sizes; exits 1 on any failure.
- `tests/art-gallery.mjs`: the art gallery images in `tests/screenshots/art/`; exits 1 if a geometry check fails.

## Notes

- `CLAUDE.md`: folder rules, file map and the decisions made in each build session.
- `docs/SPEC.md`: the full specification.
- `docs/CONTENT-REVIEW.md`: the whole script with every number, for expert review (generated).
- `docs/BUILD-PLAN.md`: the five sessions to version 1, and the later improvement sessions.
