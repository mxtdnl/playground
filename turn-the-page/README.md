# Turn the Page

**Status:** active (session 2 of 5 done: full script for both rounds, calibrated; awaiting script review before session 3. `index.html` is still a bare debug page)

An illustrated, choose-your-own-adventure coaching simulation for high school guidance, career and university counsellors. Counsellors practise four levers (Question, Support, Observe, Challenge) across two sessions with a fictional student, Maya, 16, and watch her trust, confidence and ownership respond.

## Run

From `turn-the-page/` (Node 22, no dependencies):

```
node build.mjs        # writes index.html from src/
open index.html       # works from file://; or serve via GitHub Pages
```

Until session 3, `index.html` is a debug page that plays the full script with plain buttons and shows the meters as numbers.

## Test

```
node --test               # engine and content tests
node tests/calibrate.mjs  # calibration report (SPEC.md 7.8); exits 1 while any criterion fails
node tests/export-review.mjs  # regenerates docs/CONTENT-REVIEW.md
```

All calibration criteria pass. After editing dialogue or numbers in `src/content/maya.js`, rebuild, re-run the tests and the calibrator, and regenerate the review document.

## Notes

- `CLAUDE.md` — folder rules, file map and the engine interpretations decided in session 1.
- `docs/SPEC.md` — the full specification.
- `docs/CONTENT-REVIEW.md` — the whole script with every number, for SME review (generated).
- `docs/BUILD-PLAN.md` — five sessions to version 1, with a Claude Code prompt for each, and the later improvement sessions.
- Scoring values and trait-to-lever mappings are design hypotheses awaiting review by a developmental-coaching expert.
