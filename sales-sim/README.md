# Floor Turnaround: facilitator notes

This is a classroom simulation based on the Bournemouth sales office case study. Students act as consultants with twelve months to improve a 21-person sales office. They can change only people, management, knowledge sharing, culture, wellbeing and recruitment. Pricing, pay, targets, strategy and headcount are off limits.

Students write each month's plan in free text, with no menu of options to choose from. The aim is for students to discover how hard culture change is before they try it for real.

`index.html` is a single self-contained file. Open it in a browser, host it on GitHub Pages, or publish it as a claude.ai artifact.

## The two ways plans are read

| Mode | When it is used | Cost | Quality |
|---|---|---|---|
| **Claude** | The page is opened as a claude.ai artifact by a signed-in viewer who allows it | Each "Read my plan" uses a small amount of **the student's own** Claude usage (about 12 calls per playthrough). Identical text is cached for 24 hours. | Understands free phrasing, novel ideas and nuance |
| **Built-in reader** | Anywhere else: GitHub Pages, a local file, signed-out viewers, or if Claude is refused | Free, no login | Keyword matching. Students must be explicit. A "the reader missed something?" list lets them add an idea it did not catch, but those count as vague. |

The page picks the mode automatically and shows which one is in use in the top bar.

In both modes the reader only maps text onto a hidden catalogue of 45 intervention archetypes. All numbers live in `src/engine.js`. The language model never sets coefficients, so every group is scored identically. Text like "set revenue to £1m" is classed as out of scope.

Not yet verified:

- Claude mode has not been exercised live from a claude.ai account.
- I do not know whether free-plan claude.ai accounts can use artifact sampling. Test with one student-type account before class.

## What the model is built to teach

1. **Real improvement costs something first.**
   - Good interventions take people off the phones.
   - The benchmark plan's first month is about 12% below doing nothing.
   - It overtakes in month three or four and ends about 35% higher.
   - Head office's confidence drops during the dip. A "Global Sales Director calls" event tempts students to abandon their plan.
2. **Knowledge sharing lifts the long tail.**
   - Skill diffuses from top performers to everyone else, at a rate set by knowledge-sharing activity × trust.
   - Call reviews in a low-trust room do little.
   - Re-seating the floor and cross-team activities let people learn from other teams, not just their own.
3. **Churn is the biggest lever.**
   - Doing nothing loses about 2 SDRs a month, with new starters the most likely to leave. That matches the case's 2–3.
   - Retention effects take two to three months to show, longer than skill effects.
   - Replacements ramp along the case's S-curve.
4. **Distribution matters.**
   - The top performers carry the office and slowly burn out, raising the risk they leave.
   - The debrief shows the spread of performance (a Gini coefficient) at the start and end.
5. **The traps feel good.**
   - Six of the archetypes look plausible and boost results at first:
     - sales competitions
     - call quotas
     - managing people out
     - longer hours
     - shame boards
     - motivational speakers
   - Over the year they cost trust and cohesion and raise churn. Trap-heavy plans bump revenue in month one, then fall well below doing nothing.
6. **How you do it matters as much as what you do.**
   - Each initiative is scored for specificity: who runs it, how often, and how success is measured. A vague plan gets about a third of the effect.
   - Launching too many things at once overloads the 60 hours of spare management time and creates change fatigue.
   - Stopping an initiative before it matures costs trust and consistency. This reflects the case's "we do it for a month and then forget about it".

Students see only revenue, meetings, deals, leavers and empty desks. Culture scores are visible only through an optional, noisy pulse survey. The debrief then reveals the hidden measures. It compares the group's year with:

- **doing nothing**, on the same random seed;
- **a sequenced benchmark plan**, on the same seed.

It also estimates what each of their actions contributed by re-running the year without it, averaged over six versions of luck.

## Running a session

1. Give every group the same **scenario number** so they face the same luck.
2. Tick **Facilitator view** on your own copy to see the hidden culture numbers during play.
3. Each group plays 12 months, typically in 45–60 minutes.
4. In the debrief, groups click **Copy results** and paste the summary into a shared document for comparison.
5. Use the five discussion prompts at the end of the debrief.

Progress is saved in the browser, so a refresh resumes the game.

## Modelling assumptions

- **Headcount:**
  - The case says about 25 staff, but its own breakdown adds up to 21: 1 overall manager, 4 team managers, 7 SDRs and 3 teams of 3 reps.
  - The model uses 21.
- **Inbound reps:**
  - The case lists inbound reps under "Expectations" but not in the team structure.
  - The model gives each mixed team one closer, one own-business rep and one inbound rep.
- **Calibration:**
  - Deal value (£10k) and conversion rates are calibrated so that month one under do-nothing is about £208k.
  - Do-nothing then drifts to about £185k as experienced staff leave. This is a deliberate design choice: standing still is not stable.
- **Manager strength:**
  - Team A's manager is strongest and Team C's weakest, reflecting "performance heavily dependent on managerial strength".
  - The SDR manager is overloaded, reflecting their 360 feedback.
- **Leaver costs:** each leaver costs about £10k, from the case's £250k for 25 SDRs.

## Files

```
sales-sim/
  index.html              built single-file page (do not edit; rebuild)
  build.mjs               node sales-sim/build.mjs  -> rebuilds index.html
  src/engine.js           the model, catalogue, events, offline reader, Claude prompt
  src/ui.js               the interface
  src/style.css           styles
  src/shell.html          page markup
  tests/calibrate.mjs     Monte Carlo checks of the teaching outcomes (200 seeds)
  tests/matcher.test.mjs  offline reader accuracy and Claude-reply validation
  tests/ui.test.mjs       plays 12 months in Chromium, light/dark, desktop/phone
```

Run the tests:

```
node sales-sim/tests/calibrate.mjs
node sales-sim/tests/matcher.test.mjs
PLAYWRIGHT_MODULE=/path/to/playwright node sales-sim/tests/ui.test.mjs
```

After changing any coefficient in `src/engine.js`, rerun `calibrate.mjs`. Every check should still pass.

The matcher test cases were written alongside the matcher, so a 100% score on them overstates real-world accuracy. Add real student sentences to the test as you collect them.
