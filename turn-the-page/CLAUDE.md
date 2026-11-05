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

## File map

```
turn-the-page/
  CLAUDE.md               These rules (keep the file map current)
  README.md               What it is, run, test, status
  package.json            "type": "module" and script aliases; no dependencies
  build.mjs               Inlines src/ into index.html
  index.html              Generated, committed (until session 3: debug page playing the full script)
  docs/SPEC.md            Specification (source of truth)
  docs/BUILD-PLAN.md      Sessions and prompts
  src/shell.html          Document skeleton with the five slots
  src/style.css           Styles (session 1: tokens + debug styles)
  src/engine.js           RULES, scoring, routing, endings, carry-over, seeded shuffle
  src/art.js              SVG scene and figure (session 4; stub now)
  src/content/maya.js     MAYA: profile, referral, Round 1 (15 nodes) and Round 2 (16 nodes)
  src/ui.js               Interface (until session 3: debug page)
  tests/engine.test.mjs   node:test unit tests for every rule in SPEC.md 7 and 9.2
  tests/content.test.mjs  Content integrity checks (SPEC.md 14.3), PLACEHOLDER count
  tests/calibrate.mjs     Path enumeration and SPEC.md 7.8 report; exits 1 on failure; exports calibrate()
  tests/export-review.mjs Writes docs/CONTENT-REVIEW.md from the content and the calibrator
  docs/CONTENT-REVIEW.md  Generated script and numbers for SME review (do not edit by hand)
```

Planned, not yet created: `tests/ui.test.mjs` (session 3); `tests/art-gallery.mjs` (session 4); `tests/contrast.mjs` (session 5).

## Commands (run from `turn-the-page/`)

```bash
node build.mjs            # writes index.html
node --test               # unit and content tests (finds tests/*.test.mjs)
node tests/calibrate.mjs  # calibration report; exits 1 while any criterion fails
node tests/export-review.mjs  # regenerates docs/CONTENT-REVIEW.md (run after any content or RULES change)
```

`node --test tests/` does not work on Node 22 (it treats the directory as a file); use `node --test` with no arguments. Before committing, also run `scripts/check-boundaries.sh` from the repository root. Playwright and Chromium are preinstalled in cloud sessions; do not install another version.
