# Turn the Page — folder rules

Applies inside `turn-the-page/` only, under the repository root `CLAUDE.md` (which wins on any conflict).

## Before you change anything

- **Read `docs/SPEC.md` in full before changing behaviour**, scoring, content structure or visuals. The spec is the source of truth; if code and spec disagree, raise it rather than silently picking one. `docs/BUILD-PLAN.md` says what each session builds.
- **Stay in this folder.** No references to other projects, no shared code, no root-level files. Commit messages and PR titles start `turn-the-page:`.
- **Keep the file map below current** whenever you add, rename or remove a file.

## Design principles (SPEC.md 3)

1. No single correct path. Several lever sequences reach every ending. Feedback frames choices as trade-offs; the words "correct", "wrong", "optimal" and "should have" never appear in feedback (the content test enforces this for debrief notes and road-not-taken lines).
2. Context decides: a lever's effect depends on the meters, the traits and recent choices.
3. During play, feedback is Maya's reaction and the meter movement only. Explanation waits for the debrief.
4. The illustration carries information (posture, gaze, props), so Observe has something real to observe.
5. Explicit, then implicit: Round 1 names the levers; Round 2 hides them.

## Visual language (SPEC.md 11): "Paperback Constructivist"

Hard edges; **zero border-radius except `50%` circles**; geometric decoration bleeding off edges at 0.06–0.12 opacity, never behind the meters; solid colour-block banners; system fonts only, no web fonts; no gradients; warm shadow on hover only; tokens on `:root`; WCAG AA. A figurative geometric student is deliberate.

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F3ECDC` | Page background |
| `--paper-card` | `#FFFBF2` | Cards, panels, referral note |
| `--paper-deep` | `#E6DCC6` | Meter tracks, insets |
| `--ink` | `#1C1F33` | Text; night background of cover, act banners, endings |
| `--ink-muted` | `#565868` | Secondary text |
| `--rule` | `#D9CFBA` | Borders |
| `--lever-question` | `#2747B8` | Cobalt (glyph: circle) |
| `--lever-support` | `#1A7050` | Green (glyph: square) |
| `--lever-observe` | `#D9A21B` | Ochre, fills and borders only (glyph: ring with centre dot) |
| `--lever-observe-ink` | `#7A5A08` | Ochre text |
| `--lever-challenge` | `#D2401E` | Vermilion, fills and large text (glyph: triangle) |
| `--lever-challenge-ink` | `#A8321A` | Vermilion text at body size |
| `--plum` | `#6B2E7A` | Story accent: title, page numbers, act banners |

Contrast rules:

- Ink, ink-muted, cobalt, green and plum are fine as text at any size on paper. White text works on cobalt, green, vermilion and plum fills.
- **Ochre is never text on paper** (1.95). Use `--lever-observe-ink` for ochre text; on an ochre fill use `--ink` text.
- **Vermilion on paper is large text only** (3.97). Use `--lever-challenge-ink` at body size.
- On `--ink` backgrounds use `--paper` text; ochre on ink is fine.
- Every lever appearance pairs colour with its glyph and name; never colour alone.

Type: story text in `Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif` at 400 with generous leading; interface in `system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`, 800 headings, 700 labels; uppercase with letter-spacing for eyebrows, buttons, meter labels and lever names. Meters show no numbers in the real interface.

## Technical conventions (SPEC.md 14)

- `node build.mjs` (from `turn-the-page/`) inlines `src/` into `index.html` by replacing the slots `/*CSS*/`, `//ENGINE`, `//ART`, `//CONTENT`, `//UI` in `src/shell.html`. Node built-ins only. **Never edit `index.html` by hand**; it is generated and committed.
- JS sources are ES modules (for Node tests). In the page they share one script scope inside an IIFE: the build strips `export` keywords and refuses `import` statements and literal closing `script` or `style` tags. So no two source files may declare the same top-level name, and `ui.js`/`art.js` use engine and content names directly.
- No runtime dependencies, no CDN, no web fonts, no network calls; `<meta charset="utf-8">` first; works from `file://`.
- Straight quotes in JavaScript. UK English in prose and comments.
- `src/engine.js` is pure and deterministic, with no DOM. **Every scoring number lives in its `RULES` object**; do not put numbers elsewhere. The only randomness is option display order from the seeded shuffle.
- `src/content/` is data only, no logic; comment every content object so a non-developer can edit dialogue. Stand-in text starts `PLACEHOLDER:`.
- Persistence (session 3): `localStorage` key `turn-the-page:maya:v1`, wrapped in try/catch; store no names or free text.

## Engine interpretations (decided in session 1)

Where SPEC.md 7 and 9.2 left room, the engine does this. Change only with a SPEC.md update.

- Order per decision: base row → state-rule *replacements* (Challenge with Trust < 50 replaces the row; Observe with Trust < 40 replaces Trust) → clumsy transform → trait multipliers (judged on the sign at that point, so they also scale the replacement row and the clumsy Trust penalty) → repetition halving of positives → additive terms (Support at Trust ≥ 70, repetition penalties, node override) → round half away from zero → trait caps (readiness `low` caps the final Ownership delta at +6 in Act 1, override included) → clamp 0–100.
- All state and trait conditions use the meters *before* the choice. "Act 1" means the node's `act` in either round.
- Repetition applies from the third consecutive use onwards (fourth, fifth...), within a round.
- History records both the applied change after clamping (`deltas`) and the unclamped formula result (`raw`).
- Early exit is checked after every choice and also at round start. Other endings apply once a route returns `null`.
- Routing: an option's own `next` wins; otherwise the node's `next`, which is a node id, `null` (end of round), an object keyed by lever with a `default`, or a list of `{ to, if: { meter: { min, max } } }` evaluated on the meters after the choice.
- Carry-over (values as calibrated in session 2; SPEC.md Calibration log): Breakthrough → Trust round(70% of final), Confidence final + 10, Ownership 20. Partial → Trust round(60%), Confidence carries unchanged, Ownership 15. Polite → Trust 30, Early → Trust 25, other meters from the profile. Readiness rises one band after Breakthrough or Partial. Carry values live in `RULES.carry`, not in the case file.
- Cases are looked up by `caseId` from a registry filled by `createRound` (or `registerCase`), so state stays plain JSON.

## Interface decisions (session 3)

- Flow: Cover → How it works → Referral → scene/consequence pairs → act banner whenever the act changes (and after Act 3) → Ending → minimal Debrief → Interlude → Round 2. Early exit skips the act banner. Round 2 replays go through the Interlude again with the same Round 1 carry-over.
- Round 1: clicking a lever card opens its two wordings; Back (or Escape) returns to the levers until a wording is chosen. Round 2: choosing a line leads straight to Name that lever (no back); the choice is applied with the guess, then the consequence page reveals the lever.
- Keyboard: `1`–`4` select (focus and highlight) a lever, line or guess; `Enter` confirms; `Escape` goes back; `Enter` with nothing selected presses the page's primary button. A mouse click selects and confirms at once.
- Destination numbers: a route that depends on the meters shows every page it can lead to (`→ p. 36 or 40`), so the number never reveals which wording is skilful.
- Meters: ten segments, `Math.round(value / 10)` filled. A change that does not cross a segment boundary still flashes the edge segment. The aria-live text says "a little" for a change of 1–4, nothing for 5–9 and "a lot" for 10 or more. These are presentation only; scoring numbers stay in `RULES`.
- Persistence: one JSON object under `turn-the-page:maya:v1` (`v`, `screen`, the engine `state`, the finished Round 1 state `r1`, the half-made choice `lever`/`picked`, `seed`). Only authored text and ids are stored. The cover is never saved, so it always offers Resume. A save that fails validation is ignored. If storage throws (on the probe or any later save) an ochre notice says progress will not be saved.
- Seeds: a new seed per round start (time and `Math.random` in the UI only); `?seed=N` fixes it for testing.
- The Interlude text lives in content (`rounds.r2.interlude`, keyed by Round 1 ending) and is listed in CONTENT-REVIEW.md.

## Illustration and debrief decisions (session 4)

- Posture: the mean of Trust and Confidence picks a band (closed < 20, guarded 20, neutral 40, open 50, animated 60). The profile's `poseBias` moves the floors by 4 towards the bias: with Maya's `guarded`, neutral needs 44 and closed needs below 16. Each posture has a default for all six pose parameters (`POSTURE_POSES` in art.js). These bands are presentation only and live in art.js, not RULES.
- Overrides: on a scene page the node's `scene.pose` overrides individual parameters. On a consequence page the chosen option's `pose` (authored where the reaction describes something visible: 101 of 184 options) overrides the posture from the meters after the choice; parameters it does not set follow the meters. The page's props carry over unless the option sets `props` (`[]` puts the phone away). `gaze: 'phone'` implies the phone prop. The content test checks every hint against `POSE_PARAMS`.
- Composition: Maya faces left towards you; your silhouette fills the bottom-left corner; the window (time of day) is top left, the door (her way out) right. Maya and her chair are drawn at 1.45x about a floor point so her face reads at 390px. Round 1 is early afternoon; Round 2 has a low red sun, warm light on the wall, a later clock and the brochure on the desk. The clock advances 5 minutes and the sun sinks a little per decision.
- Interpolation: art.js turns a pose into a numeric vector (`sceneVector`), blended by `lerpScene`. ui.js redraws for 0.4s between two pictures in the same round, and draws at once under reduced motion or after a reload.
- Debrief turning points: the authored `turningPoints` the path reached, topped up with the decisions that moved the meters most when the round ended early. Road not taken always shows both authored turning points; an unreached one says so and lists all four levers.
- Trace charts show no numbers: an ink line, lever-glyph markers with an ink outline (ochre fails 3:1 on paper alone), dashed ending thresholds from `RULES.endings`, plum columns at turning points, native tooltips. Debrief 2 draws both rounds on one axis with a break for the two weeks.
- Meet Maya lists, per trait, the referral hint and the moments where it showed: a trait multiplier or cap in the engine's `trace`, or a reaction written for that trait band.
- Copy summary: plain text (round, ending, lever counts, order, skilful wording, recognition) via the Clipboard API, falling back to selecting the text. Ending `summary`, `rounds.r2.carryNote` and `reflection` are content, listed in CONTENT-REVIEW.md and checked for the forbidden words.

## Polish decisions (session 5)

- Contrast: `tests/contrast.mjs` measures the colour actually behind each text node (ancestor backgrounds plus any decorative shape showing through, worst case) and fails below 4.5:1, or 3:1 for large text (24px, or 18.66px bold). Graphics that carry meaning without a label beside them (trace markers, the lever-order strip, lever-count blocks, meter segments) need 3:1 at their edge. Fixes: flashing meter segments carry an ink edge (ochre alone was 1.95); lever-count blocks have an ink edge; the session cards' lever order is drawn as ink-outlined marks on a paper tile (cobalt and green on ink were 2.1 and 2.7).
- Every screen has one h1 (visually hidden on scene and consequence pages; the act banner's tag on act pages). Every target is at least 44 x 44px, including the page links in Meet Maya.
- Decoration: two or three shapes per screen in at least two different lever colours (no plum), 0.06–0.12 opacity, each bleeding off an edge, none over the meters; the consequence page has its own set.
- Act banners show the act number, heavy and cut off by the slab's bottom edge, in the act's colour.
- Typographic quotes are display only: `typo()` in ui.js curls straight quotes in every text it renders, and `quoted()` wraps a spoken line, turning quotes inside it into single ones. Content keeps straight quotes.
- In Debrief 2's two-session traces the threshold lines are named in a note under the charts, not on the chart (the labels collided with the markers at 390px).
- Print: only the debriefs print (white paper, no decoration or buttons, three traces in a row, cards kept whole); any other screen prints a one-line note. Each debrief has a Print this debrief button.
- Hosting: GitHub Pages is enabled for the repository and deploys `main` (checked in session 5 through the public deployments API), so the page is at `https://mxtdnl.github.io/playground/turn-the-page/` once merged.

## File map

```
turn-the-page/
  CLAUDE.md               These rules (keep the file map current)
  README.md               What it is, run, test, status
  package.json            "type": "module" and script aliases; no dependencies
  build.mjs               Inlines src/ into index.html
  index.html              Generated, committed: the playable interface
  docs/SPEC.md            Specification (source of truth)
  docs/BUILD-PLAN.md      Sessions and prompts
  docs/reference/         The slides repository's CLAUDE.md and SLIDES.md, kept as
                          reference for the shared visual DNA (SPEC.md 11). Not rules
                          for this folder: where they differ, SPEC.md and this file win
  src/shell.html          Document skeleton with the five slots
  src/style.css           Styles from SPEC.md 11: tokens, components, layouts, page turn, meters
  src/engine.js           RULES, scoring, routing, endings, carry-over, seeded shuffle
  src/art.js              SVG office and Maya (SPEC.md 12): postures, pose parameters, interpolation vectors, alt text
  src/content/maya.js     MAYA: profile, referral, Round 1 (15 nodes), Round 2 (16 nodes), interlude and
                          carry-over notes, ending summaries, reflection prompts
  src/ui.js               Every screen in SPEC.md 13 incl. Debrief 1 and 2, pose tweening, keyboard, persistence
  tests/engine.test.mjs   node:test unit tests for every rule in SPEC.md 7 and 9.2
  tests/content.test.mjs  Content integrity checks (SPEC.md 14.3), PLACEHOLDER count
  tests/calibrate.mjs     Path enumeration and SPEC.md 7.8 report; exits 1 on failure; exports calibrate()
  tests/export-review.mjs Writes docs/CONTENT-REVIEW.md from the content and the calibrator
  docs/CONTENT-REVIEW.md  Generated script and numbers for SME review (do not edit by hand)
  tests/ui.test.mjs       Playwright: both rounds to every ending, resume, storage throwing, keyboard, scene art,
                          both debriefs (Breakthrough and Early exit paths), screenshots
  tests/art-gallery.mjs   Renders every posture, sample page and consequence hints, every pose value, tweens;
                          geometry checks (limbs attached); not part of `node --test`
  tests/states.mjs        Screen-state catalogue shared by contrast.mjs and a11y.test.mjs (59 states reached
                          by writing a save and pressing Resume), one state per page, browser helpers
  tests/wcag.mjs          pageAudit(): in-page WCAG contrast measurement (text, graphics, focus indicator)
  tests/contrast.mjs      WCAG AA walk of every text node in every catalogue state at 1440 and 390; exits 1 on
                          failure; not part of `node --test`
  tests/a11y.test.mjs     Playwright: every state at 1440/390/360 (focus order, focus ring 3:1, 44px targets,
                          one h1, labelled images, decoration, narrow layout, sticky meters), keyboard-only
                          playthrough, focus kept on page turns, reduced motion, alt text on all 31 pages,
                          contrast self-check, print stylesheet
  .gitignore              Ignores tests/screenshots/states/
  tests/screenshots/      Screenshots from ui.test.mjs at 1440x900 and 390x844 (regenerated on every run)
  tests/screenshots/art/  Images and contact sheets from art-gallery.mjs at 540px and 352px wide
  tests/screenshots/states/ Every catalogue state at 1440x900 and 390x844 and the debrief print PDFs, from
                          a11y.test.mjs (not committed)
```

## Commands (run from `turn-the-page/`)

```bash
node build.mjs            # writes index.html
node --test               # unit, content and UI tests (finds tests/*.test.mjs; build first, the UI test loads index.html)
node tests/calibrate.mjs  # calibration report; exits 1 while any criterion fails
node tests/export-review.mjs  # regenerates docs/CONTENT-REVIEW.md (run after any content or RULES change)
node tests/art-gallery.mjs    # renders the art gallery; exits 1 if a geometry check fails
node tests/contrast.mjs   # WCAG AA contrast walk of every screen state; exits 1 on any failure
```

`node --test tests/` does not work on Node 22 (it treats the directory as a file); use `node --test` with no arguments. Before committing, also run `scripts/check-boundaries.sh` from the repository root. Playwright and Chromium are preinstalled in cloud sessions; do not install another version.
