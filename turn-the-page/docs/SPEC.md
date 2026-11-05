# Turn the Page — specification

*Turn the Page* is an interactive, illustrated, choose-your-own-adventure coaching simulation for high school guidance, career and university counsellors who are being introduced to a developmental coaching approach.

Version 1 covers one student (Maya, 16) across two sessions: Round 1 and a follow-up, Round 2. The engine reads all student and case data from content files, so new profiles and cases (including university students) are data, not code.

Status of numbers in this document: every scoring value is an **initial value to calibrate** (build session 2) and every trait-to-lever mapping is a **design hypothesis** to be validated by a subject-matter expert in developmental coaching. None is an empirical finding.

---

## 1. Purpose and audience

- **Learners:** high school guidance, career and university counsellors; an international group, so ages and school stages are stated explicitly and system-specific terms (GCSE, GPA, "Year 11", "college") are avoided.
- **Use:** self-paced or in a facilitated workshop. About 10–12 minutes per round, 25 minutes in total including debriefs.
- **Delivery:** one self-contained `index.html` hosted on GitHub Pages. It also works when opened from the file system. No network calls, no accounts, no data leaves the browser.

## 2. Learning outcomes (to confirm with the SME)

By the end, a counsellor can:

1. Name the four levers and recognise each in a counsellor's actual words (Round 2).
2. Explain why the same lever helps at one moment and harms at another, with reference to the student's state (trust, confidence) and traits.
3. Distinguish a skilful from a clumsy use of the same lever (Round 1).
4. Distinguish a student who *agrees* to a plan from one who *owns* it, and identify moves that build ownership.

## 3. Design principles

1. **No single correct path.** Several different lever sequences reach every ending. Moves are better or worse *in context*; the debrief frames choices as trade-offs ("you built trust quickly; ownership came late"), never as right or wrong. The words "correct", "optimal" and "should have" do not appear in feedback.
2. **Context decides.** A lever's effect depends on the current meters, the student's traits and recent choices.
3. **Consequences, not marks, during play.** Feedback during play is the student's reaction and the meter movement only. Explanation is saved for the debrief.
4. **The illustration carries information.** Posture, gaze and props change with the student's state and give the Observe lever something real to observe.
5. **Explicit, then implicit.** Round 1 names the levers; Round 2 hides them.

## 4. The four levers

Shown verbatim on the "How it works" screen and in the debrief.

| Lever | Definition | Colour | Glyph |
|---|---|---|---|
| Question | Provide probing, open questions to explore an area more | Cobalt | Circle |
| Support | Provide empathetic, supportive language and encouragement | Green | Square |
| Observe | Provide feedback based on external observations or based on what is said | Ochre | Ring with centre dot |
| Challenge | Provide a different perspective or push back on what is being said | Vermilion | Triangle |

The colour and glyph pairing is used everywhere a lever appears (cards, path replay, charts), so the code is learnable at a glance and does not depend on colour alone.

## 5. Experience flow

```
Cover → How it works → Referral note → ROUND 1 (≈7 decisions) → Round 1 ending → Debrief 1
      → Interlude "Two weeks later" → ROUND 2 (≈7 decisions) → Round 2 ending → Debrief 2 (both sessions)
      → Close: replay options
```

- Progress autosaves. Returning resumes where the user left off, with a "Start again" option.
- Round 2 can be replayed on its own from Debrief 2 using the same Round 1 carry-over.
- Replay of Round 1 is encouraged from Debrief 1 ("Try a different route").

## 6. The student model

### 6.1 Profile traits

Four traits, each in three bands (`low`, `mid`, `high`). The counsellor never sees them during play; the debrief reveals them.

| Trait | What it changes (hypothesis) |
|---|---|
| Self-confidence | How much Support is needed before Challenge lands |
| Extraversion | How much an open Question yields; how visible cues are for Observe |
| Defensiveness | How strongly Challenge and Observe cost Trust |
| Readiness for change | How fast Ownership can rise |

Profile also carries `name`, `age`, `stage`, `context`, starting meters and the illustration pose bias.

### 6.2 Maya (version 1 profile)

- **Name and age:** Maya, 16.
- **Stage:** two years before finishing secondary school; starting to think about university and career options.
- **Context:** grades have dropped this term across several subjects; she used to participate actively; family expectation (unspoken in Round 1) that she will study medicine.
- **Traits:** self-confidence `low`; extraversion `mid` (currently suppressed); defensiveness `mid`; readiness for change `low` in Round 1, rising to `mid` in Round 2 if Round 1 ended in Breakthrough or Partial.
- **Starting meters (Round 1):** Trust 35, Confidence 30, Ownership 15.

### 6.3 Referral note (shown before Round 1)

> **Referral — Student Support**
> **Student:** Maya, 16 · two years before finishing secondary school
> **Referred by:** Mr Okafor, Maths teacher
> **Reason:** Maya's grades have dropped noticeably this term across several subjects. She used to participate actively but has gone quiet in class and has missed two homework deadlines. When I asked, she said she's "just being lazy." I don't think that's the full story. Could you have a conversation with her?

The note hints at the profile without stating it. Debrief 1 maps each hint to the trait it signalled.

### 6.4 Meters

Three meters, 0–100, shown as segmented bars without numbers:

- **Trust:** rapport; willingness to keep talking honestly.
- **Confidence:** Maya's self-belief.
- **Ownership:** how far the thinking and the plan are hers.

## 7. Scoring engine

### 7.1 Formula

For each choice:

```
delta[meter] = round( base[lever][quality][meter]
                      × traitMultiplier(profile, lever, meter, act)
                      × repetitionFactor(history, lever)
                      + stateRule(state, lever, meter)
                      + nodeOverride(node, option, meter) )
```

Meters clamp to 0–100. The engine is pure and deterministic: the same inputs always give the same result. The only randomness is the display order of options, from a seeded shuffle.

### 7.2 Base effects (initial values; skilful wording)

| Lever | Trust | Confidence | Ownership |
|---|---|---|---|
| Question | +3 | +1 | +6 |
| Support | +7 | +5 | 0 |
| Observe | +2 | +2 | +4 |
| Challenge | −4 | +2 | +9 |

**Clumsy wording** (Round 1 only): positive effects × 0.4, then Trust −3 (calibrated to −2; see the Calibration log).

### 7.3 State rules (initial values)

- **Challenge before trust:** Challenge with Trust < 50 → Trust −10, Confidence −5, Ownership +2 (replaces the base row). Trust calibrated to −5; see the Calibration log.
- **Observe before trust:** Observe with Trust < 40 → Trust −2 instead of +2 (it can feel exposing).
- **Support at high trust:** Support with Trust ≥ 70 → Ownership −2 (reassurance starts to take the problem off her).

### 7.4 Repetition

The third consecutive use of the same lever halves its positive effects. Three Questions in a row also cost Trust −3 (it starts to feel like an interrogation); three Supports in a row cost Ownership −3 (rescuing).

### 7.5 Trait multipliers (hypotheses)

| Trait band | Effect |
|---|---|
| Self-confidence `low` | Support's Confidence gain × 1.5 in Act 1; Challenge's Trust cost × 1.5 |
| Self-confidence `high` | Support's Confidence gain × 0.5; Challenge's Ownership gain × 1.3 |
| Extraversion `low` | Question's Ownership gain × 0.7 while Trust < 50; Observe's gains × 1.3 |
| Extraversion `high` | Question's Ownership gain × 1.3 |
| Defensiveness `high` | Trust costs from Challenge and Observe × 1.5 |
| Readiness `low` | Ownership gain capped at +6 per decision in Act 1 |

`mid` bands are neutral (× 1).

### 7.6 Node overrides

An option may carry a small authored adjustment (±1 to ±5) when its specific words fit the moment, for example a Question that lands on the real issue. Overrides are listed in the content review document so the SME can see every hand-tuned number.

### 7.7 Endings

Checked in this order:

1. **Early exit:** Trust ≤ 10 at any point. Maya asks, "Can I go now?" The round ends at once.
2. **Breakthrough:** at the end, Ownership ≥ 60 and Trust ≥ 50 (calibrated to Ownership ≥ 45 and Trust ≥ 45; see the Calibration log). Maya proposes her own next step.
3. **Partial (agreement without ownership):** at the end, Trust ≥ 45 and Ownership ≥ 30. Maya agrees to the counsellor's suggestion.
4. **Polite exit:** anything else. Maya thanks the counsellor and leaves, unmoved.

### 7.8 Calibration criteria (enforced by `tests/calibrate.mjs`)

The calibrator enumerates every path through each round (Round 1 has 8 options per decision, Round 2 has 4) and must report:

- Every ending is reachable in both rounds, from every Round 2 starting state.
- Breakthrough is reachable by at least three paths whose first three levers differ.
- No single-lever strategy reaches Breakthrough (for example, all Support, or all skilful Question).
- Uniformly random play reaches Breakthrough on 5–20% of paths, and Early exit on 5–25%.
- Early exit within three decisions requires at least two Challenges or clumsy wordings.

## 8. Round formats

### 8.1 Round 1: lever first, then wording (format B)

1. The scene shows Maya's line and any cue.
2. The counsellor picks one of four **lever cards**.
3. Two wordings of that lever appear: one skilful, one clumsy. Their order is shuffled. Neither is labelled.
4. The counsellor picks one. Maya's reaction appears and the meters move.
5. **Continue** turns the page.

The counsellor can go back from step 3 to step 2 before committing. Once a wording is chosen, the choice is final.

### 8.2 Round 2: hidden lever (format C)

1. The scene shows Maya's line and any cue.
2. Four counsellor lines appear, one per lever, unlabelled and shuffled.
3. The counsellor picks one.
4. **Name that lever:** the counsellor taps the lever they think the line used. This is a recognition item with a single defensible answer, so it is marked correct or incorrect. It does not affect the meters.
5. The lever is revealed, Maya's reaction appears and the meters move.

Round 2 has no clumsy/skilful split; all four lines are competent. The difficulty is choosing the right lever for the moment.

## 9. Case content

Branch-and-bottleneck structure: three acts per round, and every act ends at a shared node. Within an act, the next node is chosen by the lever used (and, optionally, by a meter condition), so paths split for one or two scenes and then rejoin. Target: 14–18 nodes per round.

Every option carries: text, lever, quality (Round 1), reaction lines (with variants by trait band where relevant), next node, any override, and a **debrief note** written as a trade-off.

### 9.1 Round 1: "Just lazy"

- **Act 1, Opening (2 decisions).** Maya arrives, drops her bag, sits near the door: "Mr Okafor sent me. I know — my grades. I'm just being lazy." Then agreeing what the conversation is for. Early Challenge ("Are you, though?") tends to shut her down. Support or a careful Observe opens her up.
- **Act 2, Exploration (3 decisions).** What "lazy" means: late nights, not starting work, "it's pointless anyway". A cue that rewards Observe: she goes quiet and looks at her phone whenever the future comes up. A first hint of the underlying issue: "Everyone's already decided what I'm doing after school." She does not explain further in Round 1.
- **Act 3, Turning point (2 decisions).** What would be different in two weeks, then the next step: Maya proposes one (ownership), accepts one (partial), or deflects (polite exit).
- **Act cliffhangers.** Short pulp-style lines at the end of each act ("She looked at the door. Then she looked back at you.").

### 9.2 Round 2: "Two weeks later" (follow-up)

**Opening by Round 1 ending.** The agreed action is the pivot:

Starting meters below are the initial values; the calibrated values are in the Calibration log.

| Round 1 ending | Round 2 opening | Starting meters |
|---|---|---|
| Breakthrough | Maya tried her plan and has news, some good, some not | Trust carries 80%; Confidence +10; Ownership 25 |
| Partial | Maya didn't do the agreed step: "I forgot." This teaches compliance versus ownership | Trust carries 70%; Ownership 15 |
| Polite exit | Maya arrives neutral; nothing has changed | Trust 30; profile defaults otherwise |
| Early exit | Mr Okafor sent her back; she is reluctant | Trust 20; profile defaults otherwise |

- **Act 1, Reconnecting (2 decisions).** Checking in on the action without judgement.
- **Act 2, The real issue (3 decisions).** Family expectation that she will study medicine; she is drawn to design but says, "There's no point even thinking about it." Challenge is high-risk, high-reward here: it can open up her assumption that her parents would never listen, or it can close her down.
- **Act 3, Her next step (2 decisions).** Her choice of next step, for example researching two courses, or deciding how she wants to raise the subject at home, possibly with the counsellor present.

### 9.3 Content guardrails

- **Family and culture.** Family expectations about careers carry different weight in different cultures. The case never casts Maya's parents as villains. Options that put the counsellor on one side against the family are written as clumsy (Round 1) or produce realistic consequences (Round 2).
- **Role boundaries.** The counsellor coaches; they do not decide for Maya or promise outcomes.
- **Safeguarding.** The case contains no risk indicators (self-harm, abuse). The facilitator notes say that real cases with risk indicators follow the school's safeguarding procedure, which this simulation does not cover.
- **No invented facts.** No statistics, studies or named real organisations. Stand-ins are prefixed `PLACEHOLDER:` and listed in the build report.
- **Language.** UK English (counsellor, programme), plain international register, no idioms that do not travel.

## 10. Debrief

### 10.1 Debrief 1 (after Round 1)

1. **Ending card:** the ending's name and one line of what happened.
2. **Meter traces:** three small line charts across the decisions, with markers in each choice's lever colour.
3. **Your levers:** count of each lever used, and skilful versus clumsy wording.
4. **Path replay:** each decision with the chosen line, Maya's reaction, the meter change and the debrief note. The two biggest turning points are highlighted.
5. **Road not taken:** at the two turning points, a short authored line on what another lever tended to do there. Precomputed; no live simulation.
6. **Meet Maya:** her trait profile revealed, mapped to the referral-note hints and to the moments in the replay where each trait showed.
7. **Try again:** replay Round 1, or continue to Round 2.

### 10.2 Debrief 2 (after Round 2)

Everything in Debrief 1 for Round 2, plus:

- **Lever recognition:** "You named the lever correctly 5 of 7 times", with the misses shown.
- **Two sessions side by side:** meter traces across both rounds, and how the Round 1 ending shaped the Round 2 opening.
- **Reflection prompts:** three questions for self-study or the facilitator (text only; nothing is stored).
- **Copy summary:** plain text of the endings, lever counts and recognition score for pasting into a shared document. No names or free text.

## 11. Visual language: "Paperback Constructivist"

A pulp paperback crossed with Bauhaus and constructivist poster design. It shares the slides repository's DNA but has its own identity:

- **Shared with the slides repository:** hard edges; zero border-radius except circles; geometric decoration in accent colours that bleeds off edges; colour as architecture; solid colour-block banners; system fonts only; no gradients; warm shadow on hover only; tokens on `:root`; WCAG AA.
- **Distinct from it:** a cooler paper and ink-navy palette rather than warm cream; a four-colour **lever code** as the organising system; serif "book" type for story text; page numbers and page turns; pulp cliffhanger banners; and a **figurative geometric student** (Bauhaus figures in the manner of a constructivist puppet). That last point is a deliberate departure from the slides rule "no figurative illustration": the student must be shown.

### 11.1 Tokens

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F3ECDC` | Page background |
| `--paper-card` | `#FFFBF2` | Cards, panels, the referral note |
| `--paper-deep` | `#E6DCC6` | Meter tracks, insets |
| `--ink` | `#1C1F33` | Text; also the "night" background of the cover, act banners and endings |
| `--ink-muted` | `#565868` | Secondary text |
| `--rule` | `#D9CFBA` | Borders |
| `--lever-question` | `#2747B8` | Cobalt |
| `--lever-support` | `#1A7050` | Green |
| `--lever-observe` | `#D9A21B` | Ochre: fills and borders only |
| `--lever-observe-ink` | `#7A5A08` | Ochre text |
| `--lever-challenge` | `#D2401E` | Vermilion: fills, large text |
| `--lever-challenge-ink` | `#A8321A` | Vermilion text at body size |
| `--plum` | `#6B2E7A` | Story accent: title, page numbers, act banners |

Measured contrast (WCAG):

| Pair | Ratio | Rule |
|---|---|---|
| `--ink` on `--paper` | 13.80 | Any size |
| `--ink-muted` on `--paper` / `--paper-card` | 5.96 / 6.80 | Any size |
| Cobalt on `--paper` | 6.66 | Any size; white on cobalt 7.84 |
| Green on `--paper` | 5.13 | Any size; white on green 6.04 |
| Ochre on `--paper` | 1.95 | Never as text; `--ink` on an ochre fill 7.06; use `--lever-observe-ink` (5.42) |
| Vermilion on `--paper` | 3.97 | Large text only; white on vermilion 4.67; use `--lever-challenge-ink` (5.69) for body text |
| Plum on `--paper` | 7.77 | Any size; white on plum 9.14 |
| `--paper` on `--ink` | 13.80 | Any size; ochre on `--ink` 7.06 |

### 11.2 Type

- **Story text** (Maya's lines, narration, cues, reactions): `Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif`, 400, generous leading.
- **Interface** (labels, buttons, meters, cards): `system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`; 800 for headings, 700 for labels.
- **Uppercase with letter-spacing** for eyebrows, buttons, meter labels and lever names.
- **Title lockup:** stacked heavy uppercase on blocks of the four lever colours.

### 11.3 Pulp devices

- **Page numbers:** every node has a non-sequential page number (`p. 47`). Choice buttons show their destination in small type (`→ p. 63`).
- **Page turn:** a horizontal slide with a paper edge and shadow, about 0.35s. Instant under reduced motion.
- **Act banners:** full-width `--ink` blocks with a cliffhanger line in large serif and a slab of the act's colour.
- **Ending pages:** a night-ink spread with a large geometric emblem per ending.

### 11.4 Components

- **Lever card:** paper card, thick top bar in the lever colour, glyph, uppercase name, one-line definition. Selected: solid lever fill with white or ink text (per the contrast table).
- **Line option:** paper card with a serif quote and a destination page number. In Round 2 it carries no lever colour until revealed.
- **Meters:** three ten-segment bars with uppercase labels. Changed segments flash in the causing lever's colour for 0.6s, then settle to ink, with a ▲ or ▼ marker. No numbers. An `aria-live` region announces "Trust rose a little", "Ownership rose a lot", and so on.
- **Referral note:** a paper card on a slight tilt, with a plum tape strip and typewriter-style labels in the interface font.
- **Buttons:** plum fill, white uppercase text; hover shifts up 2px with a warm shadow. Ghost variant has a thick ink border.
- **Decorative geometry:** two or three large shapes per screen at 0.06–0.12 opacity, bleeding off edges, in contrasting lever colours, kept behind content and away from the meters.

## 12. Illustration system

All art is inline SVG generated from code (`src/art.js`). No image files.

- **Scene:** viewBox 400 × 300. A counsellor's office built from rectangles and circles: a desk, two chairs, a window (its colour shows the time of day), a wall clock whose hands advance one step per decision, a door and a pinboard. Round 2 adds a course brochure on the desk and a later time of day.
- **Maya:** a seated figure of primitives. The head is a circle, the hair a cut circle, the torso a trapezoid, the arms jointed bars and the legs blocks. Shown in her own colour (plum and ochre), distinct from the lever code.
- **Pose parameters:** shoulders (raised, neutral, relaxed); arms (crossed, holding bag, on lap, open, gesturing); head tilt (down, level, up); gaze (floor, door, phone, counsellor, window); mouth (flat, tight, slight smile, smile); chair position (edge, back, leaning in).
- **Posture states:** `closed`, `guarded`, `neutral`, `open`, `animated`, chosen from Trust and Confidence. The profile biases them (a defensive profile skews towards guarded). Nodes can override specific parameters, such as "looks at door" or "holds phone".
- **The counsellor:** a dark over-the-shoulder silhouette at the frame edge, so the user sees from the counsellor's position.
- **Transitions:** poses interpolate over 0.4s between states (instantly under reduced motion).
- **Alt text:** generated from the pose, for example "Maya sits on the edge of the chair, arms crossed, looking at the door."

## 13. Screens

1. **Cover:** title lockup, a one-line premise, Start (or Resume and Start again).
2. **How it works:** the four lever cards with definitions, the three meters, and "There is no single right path."
3. **Referral note.**
4. **Scene:** illustration, page number, Maya's line, the cue, the meters, then the choice panel (B or C).
5. **Consequence:** Maya's reaction, the meter changes, Continue.
6. **Act banner.**
7. **Ending page.**
8. **Debrief 1.**
9. **Interlude:** "Two weeks later", and how the Round 1 ending sets the scene.
10. **Debrief 2.**

Layout: desktop puts the scene on the left and the story and choices on the right. Below 860px it becomes a single column (scene, then story, then choices), with the meters in a sticky top strip and touch targets of at least 44px. It works at 360px wide.

## 14. Technical architecture

```
turn-the-page/
  CLAUDE.md               Folder rules for Claude Code sessions (created in session 1)
  docs/SPEC.md            This file
  docs/BUILD-PLAN.md      Sessions and prompts
  docs/CONTENT-REVIEW.md  Readable script plus every number, for SME review (generated)
  src/shell.html          Markup skeleton with /*CSS*/ //ENGINE //ART //CONTENT //UI slots
  src/style.css
  src/engine.js           Pure scoring and state functions; no DOM
  src/art.js              SVG scene and figure generators
  src/content/maya.js     Profile plus Round 1 and Round 2 nodes (data only)
  src/ui.js               Screens, input, persistence
  build.mjs               Inlines everything into turn-the-page/index.html (section 14.1)
  index.html              Generated single file (committed, served by GitHub Pages)
  tests/engine.test.mjs   node:test unit tests
  tests/calibrate.mjs     Path enumeration and calibration report (section 7.8)
  tests/content.test.mjs  Content integrity (section 14.3)
  tests/ui.test.mjs       Playwright: full playthrough, keyboard, reduced motion, 360px, storage throwing
  tests/contrast.mjs      Playwright: WCAG walk of every text node in every screen state
  tests/export-review.mjs Writes docs/CONTENT-REVIEW.md from the content files
```

### 14.1 Conventions

- **Build step.** `node build.mjs`, run from `turn-the-page/`, reads `src/shell.html` and replaces its slot comments (`/*CSS*/`, `//ENGINE`, `//ART`, `//CONTENT`, `//UI`) with the contents of the matching source files. It writes a complete document (`<!doctype html>`, `<meta charset="utf-8">`, viewport meta, and a "generated, edit src/" comment) to `index.html`. It uses Node built-ins only. The generated `index.html` is committed.
- **Isolation.** Per the repository root `CLAUDE.md`, all work stays inside `turn-the-page/`: no references to other projects and no shared code. Commit messages and PR titles are prefixed `turn-the-page:`.
- No runtime dependencies, no CDN, no web fonts, no network calls. `<meta charset="utf-8">` comes first.
- Straight quotes in JavaScript. UK English in prose and comments.
- Zero border-radius except `50%` circles.
- Content is data only: no logic in `src/content/`. Every content object is commented so a non-developer can edit the dialogue.
- The engine is importable in Node (tests) and in the browser (inlined).

### 14.2 Content schema (sketch)

```js
const CASE = {
  id: 'maya', version: 1,
  profile: {
    name: 'Maya', age: 16,
    stage: 'Two years before finishing secondary school',
    traits: { confidence: 'low', extraversion: 'mid', defensiveness: 'mid', readiness: 'low' },
    start: { trust: 35, confidence: 30, ownership: 15 },
    poseBias: 'guarded'
  },
  referral: { from: 'Mr Okafor, Maths teacher', text: '...', hints: [{ text: 'used to participate', trait: 'extraversion' }] },
  rounds: {
    r1: {
      format: 'B', start: 'r1-01',
      nodes: {
        'r1-01': {
          page: 1, act: 1, scene: { pose: { gaze: 'door' } },
          line: 'Mr Okafor sent me. I know — my grades. I\'m just being lazy.',
          cue: 'She sits on the edge of the chair, bag still on her shoulder.',
          options: [
            { id: 'q1', lever: 'question', quality: 'skilful', text: '...',
              reaction: { default: '...', 'extraversion:low': '...' },
              next: 'r1-02', override: { ownership: 2 }, debrief: '...' }
            // eight options in format B, four in format C
          ],
          next: { question: 'r1-02a', default: 'r1-02' } // optional lever routing
        }
      },
      endings: { breakthrough: {...}, partial: {...}, polite: {...}, early: {...} }
    },
    r2: { format: 'C', starts: { breakthrough: 'r2-01a', partial: 'r2-01b', polite: 'r2-01c', early: 'r2-01d' }, carry: {...}, nodes: {...} }
  },
  turningPoints: { r1: ['r1-03', 'r1-06'], r2: ['r2-04', 'r2-06'] },
  roadNotTaken: { 'r1-03': { challenge: '...', support: '...' } }
};
```

### 14.3 Content integrity checks

- Every `next` resolves to an existing node, and every node is reachable.
- Each act ends at a single bottleneck node.
- Format B nodes have exactly four levers × {skilful, clumsy}; format C nodes have one option per lever.
- Every option has reaction text, a debrief note and a lever.
- Page numbers are unique.
- Debrief notes do not contain "correct", "wrong", "optimal" or "should have".
- A count of `PLACEHOLDER:` strings is printed.

### 14.4 State and persistence

- State: `{ caseId, round, nodeId, meters, history: [{ nodeId, optionId, lever, quality, deltas, guess }], ending, seed }`.
- Autosave to `localStorage` under `turn-the-page:maya:v1`, wrapped in `try/catch`. If storage is unavailable the simulation still runs, with a notice that progress will not be saved.
- No names or free text are stored. Nothing is sent anywhere.

### 14.5 Hosting

GitHub Pages serving `turn-the-page/index.html` from the repository's Pages branch (expected URL `https://mxtdnl.github.io/playground/turn-the-page/`, assuming Pages is enabled for this repository; not yet verified).

## 15. Accessibility

- Keyboard operable throughout. `1`–`4` select levers or lines; `Enter` confirms; focus is always visible.
- The lever code never relies on colour alone: there are glyphs and names too.
- WCAG AA contrast, checked by `tests/contrast.mjs`.
- `prefers-reduced-motion` flattens page turns, meter flashes and pose interpolation.
- Meter changes are announced through `aria-live`; every illustration has generated alt text.
- Touch targets are at least 44px.

## 16. Out of scope for version 1

Additional profiles and a profile picker; university-student cases; a facilitator dashboard or shared results; free-text responses read by AI; localisation into other languages; audio; analytics.

## 17. Open items

1. SME validation of the trait multipliers (section 7.5) and the endings thresholds (section 7.7).
2. SME review of the full script (`docs/CONTENT-REVIEW.md`, produced in session 2).
3. Title confirmed: Turn the Page (subtitle optional, e.g. "a coaching adventure").
4. Whether GitHub Pages is enabled for this repository, and from which branch.

## Calibration log

Session 2 (content and calibration). Overrides were tuned first; these `RULES` values changed only where no set of overrides within ±5 could meet SPEC.md 7.8. Each value remains a hypothesis for SME review.

| Rule | Was | Now | Why |
|---|---|---|---|
| Challenge before trust, Trust (7.3) | −10 | −5 | With Maya's low-confidence multiplier (× 1.5) one early Challenge cost 15 of her 35 starting Trust (20 if clumsy). Random play in Round 1 ended early about 60% of the time against a 5–25% target, and an override of +5 on every Challenge would have been the same change hidden in content. At −5 (−8 with the multiplier) it is still the costliest single move. |
| Clumsy wording, Trust penalty (7.2) | −3 | −2 | Half of Round 1's options are clumsy, so random play drifted down by about 2 Trust per decision and Early exit stayed above 25% after the change above. Clumsy wording still loses 60% of its gains and costs Trust. |
| Breakthrough threshold (7.7) | Ownership ≥ 60, Trust ≥ 50 | Ownership ≥ 45, Trust ≥ 45 | From Ownership 15 and Trust 35, random play almost never reached 60/50 (0.0%; target 5–20%), and even a strong seven-decision path rarely did: Ownership gains are +4 to +9 per decision and Act 1 is capped at +6. 45/45 is reached by many different skilful routes, while no single-lever strategy reaches it. Breakthrough and Partial now share the Trust threshold, so the difference between them is Ownership alone, which is the agreement-versus-ownership point of the case. |
| Round 2 start after Breakthrough (9.2) | Trust 80%, Ownership 25 | Trust 70%, Ownership 20 | With the lower threshold, a Breakthrough carry-over put Round 2 within a few decisions of another Breakthrough (random play 46–64%) and made Early exit almost unreachable (under 1%). 70% and 20 keep the head start (higher Trust, Confidence +10, readiness `mid`) while leaving Round 2 open in both directions. |
| Round 2 start after Partial (9.2) | Trust 70% | Trust 60% | Same reason: random play from a Partial start reached Early exit on only 2–3% of paths. |
| Round 2 start after Early exit (9.2) | Trust 20 | Trust 25 | From Trust 20 a single Challenge (−8) followed by one Observe before trust (−2) ended the round in two decisions, which breaks the "early exit within three decisions needs two Challenges or clumsy wordings" criterion; no override within ±5 on the opening can prevent it on every path. 25 still leaves her the most reluctant of the four openings. |

Overrides: 108 of the 184 options carry one; every value is listed in `docs/CONTENT-REVIEW.md`. In Round 1 most skilful wordings carry a small Trust or Ownership bonus (+1 to +5). That is a deliberate content choice: skilful wording that fits the moment should do better than the base row, and the bonuses vary by node, so they belong in content rather than in `RULES`. Round 2 overrides were set by a constrained search within authored ranges: lines that fit the moment could only gain, lines that misfit it could only lose. They are what make Round 2 a choice of lever rather than of wording.

Calibrator interpretation (unchanged from session 1): every SPEC.md 7.8 criterion is checked for Round 1 and separately for each Round 2 opening, using the median carry-over for that Round 1 ending. Reachability of all four endings is also checked from the lowest and highest carry-over.
