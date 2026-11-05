# Turn the Page

**Status:** active (session 1 of 5 done: engine, stub content, tests and calibrator; `index.html` is a bare debug page)

An illustrated, choose-your-own-adventure coaching simulation for high school guidance, career and university counsellors. Counsellors practise four levers (Question, Support, Observe, Challenge) across two sessions with a fictional student, Maya, 16, and watch her trust, confidence and ownership respond.

## Run

From `turn-the-page/` (Node 22, no dependencies):

```
node build.mjs        # writes index.html from src/
open index.html       # works from file://; or serve via GitHub Pages
```

Until session 3, `index.html` is a debug page that plays the stub case with plain buttons and shows the meters as numbers.

## Test

```
node --test               # engine and content tests
node tests/calibrate.mjs  # calibration report (SPEC.md 7.8); exits 1 while any criterion fails
```

The calibrator is expected to fail against the session 1 stub; session 2 writes the full script and tunes it to pass.

## Notes

- `CLAUDE.md` — folder rules, file map and the engine interpretations decided in session 1.
- `docs/SPEC.md` — the full specification.
- `docs/BUILD-PLAN.md` — five sessions to version 1, with a Claude Code prompt for each, and the later improvement sessions.
- Scoring values and trait-to-lever mappings are design hypotheses awaiting review by a developmental-coaching expert.
