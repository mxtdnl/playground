# Turn the Page — build plan

Five sessions take the simulation to a working version 1, playable end to end on GitHub Pages. Later sessions improve and extend it. Each session has a goal, a definition of done and a prompt to paste into a new Claude Code session on `mxtdnl/playground`.

Rules for every session:

- Start a fresh session for each one; the prompt and the docs carry the context.
- Every session reads `turn-the-page/CLAUDE.md` (from session 1 onwards) and `turn-the-page/docs/SPEC.md` first.
- Every session finishes by running the tests, rebuilding `index.html`, committing and pushing.
- Where a prompt below says "review gate", stop and review the output before starting the next session.

## Overview

| # | Session | Output | Review gate |
|---|---|---|---|
| 1 | Foundations | Folder, CLAUDE.md, build, engine, schema, stub case, unit tests, calibrator | — |
| 2 | Content and calibration | Full Maya profile, Round 1 and Round 2 scripts, calibrated numbers, CONTENT-REVIEW.md | **Yes: read the script** |
| 3 | Playable core | Every screen, both round formats, meters, persistence; placeholder figure | Play it once |
| 4 | Illustration and debrief | SVG scene and figure system, both debriefs | **Yes: look at the screenshots** |
| 5 | Polish and ship | Accessibility, contrast, narrow layout, pulp devices, facilitator README, Pages | Version 1 sign-off |

---

## Session 1: Foundations

**Goal:** a tested, data-driven engine with no UI to speak of.

**Done when:** `node turn-the-page/build.mjs` writes `index.html`; `node --test turn-the-page/tests/` passes; `node turn-the-page/tests/calibrate.mjs` runs against the stub case and prints a report.

```text
Read turn-the-page/docs/SPEC.md in full, and sales-sim/build.mjs and sales-sim/README.md for this repository's existing single-file pattern.

Session 1 of turn-the-page/docs/BUILD-PLAN.md: Foundations. Build no UI beyond a bare debug page.

1. Create turn-the-page/CLAUDE.md: the folder's rules, distilled from SPEC.md sections 3, 11 and 14 (design principles, visual tokens and contrast rules, technical conventions, file map, test commands). Tell future sessions to read SPEC.md before changing behaviour, and to keep CLAUDE.md's file map current.
2. Create the src/ layout and build.mjs from SPEC.md section 14, mirroring sales-sim/build.mjs (slots for CSS, ENGINE, ART, CONTENT, UI). The output turn-the-page/index.html is a complete standalone document that works from file://.
3. Implement src/engine.js as pure functions importable from Node and the browser: createRound(case, roundId, carry), optionsFor(state), applyChoice(state, optionId, guess?), checkEnding(state), carryOver(r1State), and a seeded shuffle. Implement the formula, base effects, clumsy rule, state rules, repetition, trait multipliers, node overrides, endings and Round 2 carry-over exactly as SPEC.md sections 7 and 9.2 specify. Put every number in one commented RULES object at the top of engine.js.
4. Write src/content/maya.js with the real profile and referral note (SPEC.md 6.2, 6.3) and a STUB round of three nodes in each format, marked PLACEHOLDER.
5. Tests: tests/engine.test.mjs (each rule in section 7 has at least one test; determinism; clamping; early exit), tests/content.test.mjs (every check in SPEC.md 14.3), and tests/calibrate.mjs (path enumeration and every criterion in SPEC.md 7.8, printing a pass/fail report; failing against the stub is expected, but it must run).
6. A bare debug index.html that plays the stub through with plain buttons and shows the meters as numbers, so the engine can be clicked through.

Run all tests and the build, commit and push. Report: test results, the calibration output, and any place where the spec was ambiguous and what you decided.
```

## Session 2: Content and calibration (review gate)

**Goal:** the full script for both rounds, with numbers tuned to pass every calibration criterion.

**Done when:** content tests pass; the calibrator passes every criterion; `docs/CONTENT-REVIEW.md` reads as a script a coaching expert can review.

```text
Read turn-the-page/CLAUDE.md and turn-the-page/docs/SPEC.md in full, then src/engine.js and src/content/maya.js.

Session 2 of turn-the-page/docs/BUILD-PLAN.md: Content and calibration.

1. Replace the stub rounds in src/content/maya.js with the full Round 1 ("Just lazy", format B) and Round 2 ("Two weeks later", format C) from SPEC.md section 9: 14 to 18 nodes per round, three acts each, branch-and-bottleneck routing, the four Round 2 openings, act cliffhanger lines, the four endings per round, turning points and road-not-taken lines, and a trade-off debrief note on every option.
2. Writing rules: Maya is 16 and sounds it; short lines; reactions vary by trait band where the trait would plausibly show. In Round 1 the skilful and clumsy wordings of a lever must both clearly be that lever; clumsy means leading, closed, judgemental, premature or rescuing, not rude. In Round 2 all four lines are competent and each is unambiguously one lever. Follow the guardrails in SPEC.md 9.3 strictly (family never cast as villains, no risk indicators, no invented facts, UK English, international register). Mark anything uncertain PLACEHOLDER:.
3. Run tests/calibrate.mjs. Tune node overrides first, and RULES values only where overrides cannot fix it, until every criterion in SPEC.md 7.8 passes. Record each RULES change and why in a short "Calibration log" section at the end of SPEC.md.
4. Write tests/export-review.mjs and generate turn-the-page/docs/CONTENT-REVIEW.md: per round, a node map (Mermaid flowchart), then every node as a script (page, Maya's line, cue, each option with lever, quality, reaction, deltas for the starting state, debrief note), every override, the RULES table and the calibration report.
5. Update the debug page so the full content is playable.

Run all tests and the build, commit and push. Report: node counts, calibration results, the RULES changes, every PLACEHOLDER string, and the three content decisions you are least sure of. Stop there: the script needs human review before session 3.
```

## Session 3: Playable core

**Goal:** the real interface, playable end to end, with a placeholder figure.

**Done when:** a full playthrough of both rounds works in the browser; refreshing resumes; `tests/ui.test.mjs` plays both rounds headlessly.

```text
Read turn-the-page/CLAUDE.md and turn-the-page/docs/SPEC.md in full, and turn-the-page/docs/CONTENT-REVIEW.md. Apply any review comments I give below before starting.

Session 3 of turn-the-page/docs/BUILD-PLAN.md: Playable core. Replace the debug page with the real interface.

1. Build style.css from SPEC.md section 11: tokens on :root, the type pairing, zero radius, lever cards, line options, segmented meters with the lever-colour flash, buttons, referral note, act banner, ending page, and decorative geometry. Light paper theme with ink-night spreads; no dark-mode switching.
2. Build src/ui.js with every screen in SPEC.md section 13 except the full debriefs: Cover (Start, Resume, Start again), How it works, Referral note, Scene, Round 1 two-step choice (lever, then wording, with back), Round 2 choice plus Name that lever plus reveal, Consequence, Act banner, Ending, Interlude, and a minimal debrief listing the path (session 4 replaces it).
3. The scene area uses a simple placeholder: a framed panel with a geometric silhouette and the current posture state written as text. Session 4 replaces it.
4. Page numbers and destination numbers on options; the page-turn transition; keyboard (1 to 4, Enter, visible focus); aria-live meter announcements.
5. Persistence per SPEC.md 14.4, including the storage-unavailable notice.
6. tests/ui.test.mjs (Playwright, preinstalled; do not install another version): plays both rounds to each ending via fixed choices, checks resume after reload, runs with localStorage throwing, and takes screenshots at 1440x900 and 390x844 into tests/screenshots/.

Run all tests and the build, commit and push. Report the results and show me the screenshots.
```

## Session 4: Illustration and debrief (review gate)

**Goal:** the geometric student and office, and both debriefs.

**Done when:** every posture state renders and interpolates; both debriefs show every element in SPEC.md section 10; screenshots of every posture and both debriefs are committed.

```text
Read turn-the-page/CLAUDE.md and turn-the-page/docs/SPEC.md in full (especially sections 10, 11 and 12), then src/ui.js and src/content/maya.js.

Session 4 of turn-the-page/docs/BUILD-PLAN.md: Illustration and debrief.

1. Build src/art.js per SPEC.md section 12: renderScene(sceneState) returns inline SVG for the office (desk, chairs, window with time of day, clock advancing per decision, door, pinboard; Round 2 brochure and later light) and Maya from geometric primitives, with every pose parameter, the five posture states derived from Trust and Confidence plus profile bias, node overrides, the counsellor silhouette, 0.4s interpolation between poses (instant under reduced motion), and generated alt text. Hard edges and flat fills only; constructivist rather than cute. Replace the session 3 placeholder.
2. Write tests/art-gallery.mjs, which renders every posture state and a sample of overrides to tests/screenshots/art/. Look at every image and fix anything that reads badly: limbs detached, faces unreadable at 390px, posture differences too subtle to observe.
3. Build Debrief 1 and Debrief 2 exactly as SPEC.md section 10 lists: ending card, meter traces as inline SVG line charts with lever-colour markers, lever counts, skilful versus clumsy, path replay with turning points highlighted, road not taken, Meet Maya with referral hints mapped to traits, recognition score, both sessions side by side, reflection prompts, and Copy summary. Use the lever code and glyphs consistently.
4. Extend tests/ui.test.mjs to screenshot both debriefs for a Breakthrough path and an Early exit path at both viewport sizes.

Run all tests and the build, commit and push. Report results and show me the art gallery and debrief screenshots. Stop there for review.
```

## Session 5: Polish and ship (version 1)

**Goal:** accessible, robust and deployed.

**Done when:** every harness passes; the narrow layout works at 360px; the README exists; the Pages URL serves the page.

```text
Read turn-the-page/CLAUDE.md and turn-the-page/docs/SPEC.md in full. Apply any review comments I give below first.

Session 5 of turn-the-page/docs/BUILD-PLAN.md: Polish and ship.

1. tests/contrast.mjs: walk every text node in every screen state (both choice formats before and after selection, revealed levers, flashing meters, act banner, every ending, both debriefs) and enforce WCAG AA from SPEC.md 11.1. Fix every failure with the ink tokens or a fill change.
2. Accessibility per SPEC.md section 15: a keyboard-only playthrough test, focus order, focus not lost on page turn, reduced-motion test, 44px targets, alt text present on every scene.
3. Narrow layout at 360px and 390px: single column, sticky meter strip, no horizontal scroll; check every screen.
4. Pulp finish per SPEC.md 11.3: title lockup on the cover, act banner cliffhangers, ending emblems, decorative geometry on every screen (two or three shapes, contrasting lever colours, bleeding off edges, never behind the meters).
5. Print stylesheet for the debriefs only (a counsellor may print their path).
6. turn-the-page/README.md: facilitator notes (what it teaches, timings, running it in a workshop, using Copy summary, the safeguarding note from SPEC.md 9.3, the hypotheses still awaiting SME validation, how to edit dialogue in src/content/maya.js and rebuild).
7. Check whether GitHub Pages is enabled for this repository and from which branch; tell me exactly what I need to switch on and the resulting URL. Do not change repository settings yourself.
8. Full regression: every test, the calibrator and the build. Screenshot every screen at both sizes and look at them.

Commit and push. Report results, every remaining PLACEHOLDER string, and anything you would change before showing it to counsellors.
```

---

## After version 1

Each line is one session unless noted. Order is a recommendation.

| # | Session | Summary |
|---|---|---|
| 6 | SME revisions | Apply the coaching expert's notes on script and trait hypotheses; recalibrate; regenerate CONTENT-REVIEW.md |
| 7 | Second profile | A contrasting Maya-age profile (for example high confidence, high defensiveness) reusing the same nodes with trait-varied reactions; a profile picker after the cover; calibrator runs per profile |
| 8 | Facilitator mode | `?facilitator` URL flag: live meter numbers, rules view, a session code so a workshop shares one seed, combined Copy summary format |
| 9–10 | University case | A new case file (first-year undergraduate, age 18–19) with its own referral note and two rounds; a case picker; engine changes only if the spec needs new mechanics |
| 11 | Round 3 option | A third format mixing B and C, or a timed round, if the pilot shows learners want more practice |
| 12 | Free-text mode (exploratory) | Optional typed responses classified into a lever by Claude when opened as a claude.ai artifact, as in sales-sim; built-in fallback; needs a safeguarding review before use with real cases |

Prompt template for sessions 6 onwards:

```text
Read turn-the-page/CLAUDE.md and turn-the-page/docs/SPEC.md in full.

Session <n> of turn-the-page/docs/BUILD-PLAN.md: <title>. <paste the summary row and any notes>.

First update SPEC.md with the design for this change and reply with a short plan; wait for my approval. Then build it, keep every existing test and the calibrator passing, add tests for the new behaviour, rebuild, commit and push, and report results and every PLACEHOLDER string.
```
