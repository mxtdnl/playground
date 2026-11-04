# Turn the Page

**Status:** active (planning: specification and build plan written, no build yet)

An illustrated, choose-your-own-adventure coaching simulation for high school guidance, career and university counsellors. Counsellors practise four levers (Question, Support, Observe, Challenge) across two sessions with a fictional student, Maya, 16, and watch her trust, confidence and ownership respond.

## Run

```
# Not built yet. From session 1 onwards:
node build.mjs        # writes index.html
open index.html       # or serve via GitHub Pages
```

## Test

```
# From session 1 onwards:
node --test tests/
node tests/calibrate.mjs
```

## Notes

- `docs/SPEC.md` — the full specification.
- `docs/BUILD-PLAN.md` — five sessions to version 1, with a Claude Code prompt for each, and the later improvement sessions.
- Scoring values and trait-to-lever mappings are design hypotheses awaiting review by a developmental-coaching expert.
