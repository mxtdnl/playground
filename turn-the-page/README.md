# Turn the Page

**Status:** active (session 4 of 5 done: playable end to end with the geometric office and Maya, posture changes and both full debriefs; session 5 polishes accessibility and ships)

An illustrated, choose-your-own-adventure coaching simulation for high school guidance, career and university counsellors. Counsellors practise four levers (Question, Support, Observe, Challenge) across two sessions with a fictional student, Maya, 16, and watch her trust, confidence and ownership respond.

## Run

From `turn-the-page/` (Node 22, no dependencies):

```
node build.mjs        # writes index.html from src/
open index.html       # works from file://; or serve via GitHub Pages
```

Progress autosaves in the browser (`localStorage`); reopening the page offers Resume or Start again. `?seed=N` fixes the option order.

## Test

```
node --test               # engine, content and interface tests (run node build.mjs first)
node tests/calibrate.mjs  # calibration report (SPEC.md 7.8); exits 1 while any criterion fails
node tests/export-review.mjs  # regenerates docs/CONTENT-REVIEW.md
node tests/art-gallery.mjs    # art gallery images in tests/screenshots/art/; exits 1 if a geometry check fails
```

The interface test (`tests/ui.test.mjs`) uses the Playwright and Chromium preinstalled in cloud sessions and is skipped where Playwright is not available; it writes screenshots to `tests/screenshots/`. All calibration criteria pass. After editing dialogue or numbers in `src/content/maya.js`, rebuild, re-run the tests and the calibrator, and regenerate the review document.

## Notes

- `CLAUDE.md` — folder rules, file map and the engine interpretations decided in session 1.
- `docs/SPEC.md` — the full specification.
- `docs/CONTENT-REVIEW.md` — the whole script with every number, for SME review (generated).
- `docs/BUILD-PLAN.md` — five sessions to version 1, with a Claude Code prompt for each, and the later improvement sessions.
- Scoring values and trait-to-lever mappings are design hypotheses awaiting review by a developmental-coaching expert.
