# Decisions

Choices made without the owner present. Newest last.
Format: **date — decision.** Why. Alternatives. How to change it (preference name, if any).

- **2026-11-20 — Delivered as an offline PWA, not a native Android app.** Can be built
  and tested fully in cloud sessions; installable from Chrome on Android. A Capacitor/TWA
  wrapper remains possible later.
- **2026-11-20 — Theoretical keys (e.g. G♭m) are off by default** and map to their
  enharmonic key (F♯m). Preference: allow theoretical keys.
- **2026-11-20 — Toolchain pins: Preact 10.x, TypeScript ~6.0, ESLint 9, `@playwright/test`
  pinned to 1.63.0.** Preact 11 and TypeScript 7 are new majors that some plugins
  (`typescript-eslint` requires TS < 6.1, `@testing-library/preact`) don't support yet;
  Playwright is pinned to the version whose Chromium is pre-installed in the cloud
  sessions. Alternatives: latest majors. Change: bump in `package.json` once peers allow.
- **2026-11-20 — Branch/merge flow.** Each milestone is developed on `m<NN>-name`, opened
  as a PR against `main` and merged with a merge commit by the agent (per runbook).
- **2026-11-20 — Global "prefer ♯/♭" vs. per-pair toggles.** Each enharmonic pair toggle
  takes `sharp`, `flat` or `auto`; `auto` follows the global preference. Defaults are
  the explicit SPEC values (D♭, G♭, B, B♭m, E♭m, G♯m), global default ♭. Input aliases
  (e.g. "A♯m") resolve to the preferred member of the pair (B♭m by default).
  Preferences: `spelling.prefer`, `spelling.pairs[...]`.
- **2026-11-20 — Key parsing accepts prefix accidentals** ("bEm" = E♭m), `x` for 𝄪, and
  "maj/major/min/minor/m/M" suffixes.
- **2026-11-20 — Numeral/symbol style is one `dimStyle` switch** (`symbol`: °, ø7 ·
  `text`: dim, 7♭5/m7♭5). Covers "° vs dim" and "iiø7 vs ii7♭5" from SPEC §7.1.
  Seventh numerals: Imaj7, ii7, V7, viiø7 (lowercase numeral implies minor).
- **2026-11-20 — Role set includes `#5` and `bb7`** in addition to SPEC's list, so
  augmented and diminished-7 chords (quality-switch extensions) have labels.
- **2026-11-20 — Voicing span is inclusive** (frets 5–8 = span 4), matching how fret
  windows are counted ("width 5 = frets 5–9"); open strings count as fret 0.
  Preference: `fretboard.maxSpan` (default 4).
- **2026-11-20 — "Next/previous shape" ordering uses the average fret** of a voicing on
  the same string set; ties in anchor distance prefer the lower fret. Movement between
  voicings = sum of per-string fret differences.
- **2026-11-20 — Visual style "Workshop".** Neutral warm-grey surfaces, a single blue
  accent, a wood-tone fretboard (maple in light, rosewood in dark), system font stack
  (no web fonts — offline). Light/dark/system via `look.theme`. Role colours by chord
  member: root red, 3rd blue, 5th amber, 7th violet (`look.roleColors`, editable).
- **2026-11-20 — Horizontal neck, string 1 on top (tab orientation), equal fret widths.**
  On narrow screens the board shows the region window plus context frets so every
  cell stays ≥ 44 px; when the screen is wide enough (landscape/tablet) the whole neck
  is shown. Left-handed mirrors horizontally (`fretboard.leftHanded`).
- **2026-11-20 — Preferences stored in IndexedDB via `idb-keyval`** (~600 B gzipped).
  Stored data is merged onto defaults, so new preferences get their default
  automatically. Falls back to in-memory defaults if IndexedDB is unavailable.
- **2026-11-20 — Chord explorer screen** added as the M4 showcase for the fretboard view
  (all voicings of a diatonic chord in a region, roles, ghost anchors). Not in the SPEC
  mode list; it's a reference/learning screen and stays useful.
- **2026-11-20 — Hash routing** (`#/explore`, `#/prefs`) so deep links work on GitHub
  Pages without server rewrites.
- **2026-11-20 — Audio: Karplus–Strong rendered to buffers in JS** (allpass-tuned, ~±20
  cents verified in tests), cached per MIDI note, through a light compressor. Strum goes
  low → high with `sound.strumMs` between strings. Wrong answers play a short damped
  low-E "thunk". A mute button sits in the top bar (`sound.muted`). Couldn't listen to
  the output in the cloud session — tone is tuned by numbers only; adjust
  `DEFAULT_PLUCK` in `src/audio/synth.ts` if it sounds off.
- **2026-11-20 — Find the chord: grading is automatic** once every string of the set (plus
  the anchor string when required) has a note; tapping a string again moves the note,
  tapping the same note removes it; taps outside the required strings are ignored.
  "Show answer" counts as wrong. No auto-advance — a big Next button (one-handed use).
- **2026-11-20 — Ghost anchors appear in feedback, not during the question**, so the
  anchor root doesn't give the answer away; in "required" mode the anchor string is
  named in the prompt. Anchor roots are accepted anywhere on that string within the
  window ± 2 frets.
- **2026-11-20 — Mode-1 items don't include the inversion** (`inversion: '*'`): the user
  chooses which valid shape to play, so stats are per key × degree × string set
  (× anchor string). Modes that _show_ a specific shape will track inversions.
- **2026-11-20 — Last practice setup is remembered per device** in `localStorage` (a
  convenience, not a preference).
- **2026-11-20 — Progress storage: two IndexedDB records** (`stats`: item key → stats,
  `daily`: date → attempts/correct/ms) instead of a full attempt log; enough for
  rolling accuracy (last 10), median time, Leitner box/due date, streak, minutes and a
  14-day trend while staying small. "Minutes practiced" sums answer times, capped at
  60 s per answer.
- **2026-11-20 — Leitner boxes 1–5** with intervals 0 / 10 min / 1 day / 3 days / 7 days;
  wrong → box 1. Mastery = ≥ 90 % of the last 10 _and_ median correct time ≤ 3 s
  (triads) / 5 s (sevenths) — so an item needs 10 attempts before it can be mastered.
- **2026-11-20 — Weakest items** need ≥ 3 attempts; score = 2 × error rate + slowness
  (median time relative to the mastery time, capped).
- **2026-11-20 — Import replaces** (doesn't merge) progress and preferences, after a
  confirmation; invalid entries are skipped and counted.
- **2026-11-20 — PWA via `vite-plugin-pwa` (generateSW, autoUpdate, skipWaiting +
  clientsClaim)**: every built asset is precached; the app reloads into the new version
  automatically after an update. Icons are rendered from `public/icon.svg` with
  `node scripts/make-icons.mjs` (uses the local Chromium) and committed as PNGs.
  `npm audit` reports moderate advisories in build-time-only Workbox dependencies
  (glob/minimatch); they don't ship to the browser.
- **2026-11-20 — Deploy workflow** builds and publishes `dist/` to GitHub Pages on every
  push to `main` (`actions/configure-pages` with `enablement: true`). If Pages isn't
  enabled for the repo, the owner needs to set Settings → Pages → Source: GitHub Actions.
- **2026-11-20 — Shared tap-answer UI (`TapQuestion`)** used by modes 1–3 (and later the
  progression walk), so tap rules, feedback, reveal and sounds behave the same everywhere.
- **2026-11-20 — Mode 2 (From the tonic):** the target is any selected degree except I/i
  (all core degrees except the tonic if only I/i is selected). The tonic shape is shown
  with its roles and played; any valid voicing in the region is correct; the "Smooth ✦"
  badge marks a voicing with minimal total fret movement. On a miss, the smoothest
  shape(s) are revealed. Item inversion = the shown tonic's inversion.
- **2026-11-20 — Mode 3 (Next/previous shape):** the shown shape lies in the window; the
  answer is the adjacent shape on the whole neck (may lie outside the window, so the
  board widens to include both). Direction up/down/both is a setup option
  (`config.variant`). Item = shown inversion + direction.
- **2026-11-20 — Mode 4 (Name the tones):** "Label" variant asks string by string from
  the bass up, with big role buttons (R, b3, 3, b5, 5; + b7, 7 for sevenths) coloured by
  role, plus Undo; graded when every note is labelled (all must be right). "Tap"
  variant asks for a role on one string; any fret on that string with the right pitch
  class counts (questions are only generated when such a fret exists in the window).
  Setup option: label / tap / both (both balances the two variants ~50/50).
  Tap-variant items use `stringSet: '*'` and record role + string in the variant.
- **2026-11-20 — Mode 7 (Quality switch):** source chords are the selected diatonic
  degrees; the target has the same root. One tap answers: tapping the note that must
  move just selects it, tapping its destination is correct, tapping any other note (or a
  wrong fret) is an error. Roles are hidden until answered. Extensions are preferences
  (`practice.switchMinDim`, `switchMajAug`, `switchDom7`, all off): min ↔ dim, maj → aug
  (aug → maj omitted: no diatonic augmented source), and V → V7 by moving the root down
  a whole step to b7 (a rootless dominant shape on 3 strings; only from the V chord).
  With sevenths on, the switches are maj7 ↔ 7 and m7 ↔ m7b5. The "name the new chord"
  step (`practice.switchNameChord`) is practice feedback only and isn't scored.
  Item variant records `from>to` and the string that carries the moving tone.
- **2026-11-20 — Mode 5 (Progression walk):** one session "question" = one progression;
  each chord is graded and tracked as its own attempt (item per key × degree × string
  set). The previous chord stays on the board dimmed; "Smooth ✦" marks a minimal-movement
  choice; a miss reveals the smoothest shape and the walk continues from it. Correct
  steps auto-advance after 0.7 s; at the end the user's voicings are played back as a
  progression (▶ Replay). If the session window has no shape for some chord on a string
  set, the window is widened by up to 3 frets for that progression (shown in the prompt).
  Tempo mode (setup toggle) allows `practice.tempoBeats` beats at `practice.tempoBpm`
  per chord; running out of time counts as a miss.
- **2026-11-20 — Mode 6 (Name the chord):** 4 options. Forward distractors always
  include the enharmonic misspelling when the root has an accidental (G♯m for A♭m), then
  a random mix of: right root/wrong quality, neighbouring degrees, the same degree in the
  relative key. Reverse distractors include the case-flipped numeral (IV for iv) plus
  other diatonic numerals. The chord is played after answering. The typed-answer
  variant is left for later (SPEC says "later").
- **2026-11-20 — Question selection weights (SPEC §6):** for each question, with
  probability `practice.freshShare` (20 %) all candidates weigh the same; otherwise
  unseen items weigh 1 and seen items 1 + 4 × error rate + slowness (0–2) + 1.5 if due,
  while mastered items that aren't due weigh 0.25. These multiply the string-set tier
  weights (primary sets ×3).
- **2026-11-20 — Weak-spot drilling and reviews** run as targeted sessions: "Drill these"
  (stats, weakest 10) and "Review due items" (home, up to 20 most overdue). Each question
  targets one item via a config built from the item (mode, key, degree, string set,
  anchor, variant) and a selection weight that strongly prefers the exact item
  (inversion etc.). Progression-walk items are drilled with Find the chord. If an item
  has no question in the default window, up to 5 random windows are tried, then the item
  is skipped.
- **2026-11-20 — Sevenths:** 4-string sets (1–4, 2–5, 3–6) use drop-2 voicings only (the
  SPEC's choice; close/drop-3 shapes are filtered out) with one extra fret of span
  (default max span 4 → 5 for drop-2, needed e.g. for root-position maj7 on 2–5); every
  set then has exactly 4 inversions per octave. With `sevenths.shells`, 3-string sets
  give R–3–7 shells. All seven modes accept sevenths; the quality switch uses maj7 ↔ 7
  and m7 ↔ m7b5. The setup screen suggests sevenths once ≥ 80 % of the key's core degrees
  have a mastered triad item. The Chord explorer gained a Triads/Sevenths switch.
- **2026-11-20 — From the tonic: random tonic shape + no repeated questions** (owner
  request). By default the shown I/i shape is picked from every shape on the neck on the
  enabled string sets, and the question's region is a fret window of the usual width
  centred on it (`windowAround`); "Inside the fret window" keeps the previous behaviour.
  Setup option "Tonic shape" (`config.variant`: `neck` default / `window`). Consecutive
  questions prefer a different tonic shape _and_ a different target; if that's
  impossible (e.g. one target selected) they still always differ in at least one of the
  two. Only a config with exactly one possible question can repeat.
- **2026-11-20 — Random key** (owner request). Setup "Key choice": One key / Random key;
  random keys come from major, minor or both, drawn from the keys selectable under the
  spelling preferences (enharmonic choices respected; theoretical keys only when
  allowed). A new key every question (every progression in the walk), never the same
  key twice in a row. Chord selection is kept per mode (`degreesByMode`, default core
  sets); with "both" the progression picker offers only "Random". If a drawn key has no
  question for the setup, up to 5 other keys are tried before skipping. Stats stay per
  key. The sevenths suggestion is hidden in random-key sessions. Config fields:
  `randomKey`, `degreesByMode`.
- **2026-11-20 — Fretboard layout fixes** (owner feedback). Fret numbers sit below the
  wood, clear of the fret wires. The region highlight hugs its strings (±32 % of a string
  gap) so its dashed border no longer runs through the fret dots, and the dots are drawn
  above the dimming so they stay readable outside the region. On short landscape screens
  (wider than tall, < 600 px high) the question, buttons and feedback move to a 280 px
  side column and the board fills the rest; the visible fret range is sized so tap cells
  stay ≥ 44 px in both directions.
- **2026-11-20 — No chord is silently skipped any more** (owner report: F minor i/♭VI and
  F♯m V "missing" in frets 5–9 on strings 1–3 — their shapes there sit at 4–6 and 8–10/9–10,
  straddling the window). Practice modes now widen the window for that question by the
  fewest frets needed (`fittingRegion`, max 5; on the default string sets never more than
  2, usually 1); the prompt shows the widened frets. Applies to Find the chord, From the
  tonic, Next/previous shape, Name the tones (label), Quality switch and the progression
  walk (which already did this, limit raised from 3 to 5). The Chord explorer keeps the
  user's window but shows shapes outside it faded, and when none fits says so and names
  the nearest frets; ▶ Play then plays the nearest shape.
- **2026-11-20 — Review/drill sessions no longer repeat one question** (owner report: after
  a progression walk, "Review" asked the same IV again and again). Review and drill sessions
  used to be padded to ≥ 10 questions by cycling the items. Now "Review due items" asks
  each due item once and "Drill these" asks each weak item twice, never back to back when
  there is more than one item; a repeated item gets a different random fret window, so it
  is never the identical question.
- **2026-11-20 — Progression list with random keys from both modes** shows all ten
  progressions, labelled "(major)" / "(minor)" (it previously offered only "Random");
  choosing one limits the random keys to that progression's mode.
- **2026-11-20 — Notation is always music symbols** (owner decision). The "Accidental
  symbols", "Diminished labels" and "Role labels" preferences are removed: the app always
  shows ♯ ♭ 𝄪 𝄫, ° / ø7 (vii°, iiø7) and ♭3 / ♭5 / ♭7. ASCII stays internal (key and item
  ids). This deliberately narrows SPEC §7.1 and the CLAUDE.md "label style" example;
  stored values of the old settings are ignored.
- **2026-11-20 — Optional hint on given shapes** (owner request). New preference
  `practice.givenShapeRoles` (default on, also a toggle in the From the tonic and
  Next/previous shape setup). Off: the shape a question shows has no role labels, no role
  colours and the prompt doesn't name its inversion until you answer. Quality switch and
  Name the tones already hide roles before answering.
- **2026-11-20 — Automated checks** (owner request). `src/exercises/properties.test.ts`
  checks every mode against generated setups (all keys, chords, string sets, windows):
  every chord is askable, grading is exact, no identical consecutive questions, setup
  lists never empty, random keys never repeat. `npm run audit` (also in CI) walks every
  screen and mode at 4 sizes × light/dark and fails on page errors, horizontal overflow,
  off-screen controls, tap targets < 44 px and low contrast (WCAG 4.5:1 text, 3:1 bold
  note labels). The written critique pass runs only when the owner asks.
- **2026-11-20 — Fixes from the first audit:** the board no longer shrinks below 44 px tap
  cells (it scrolls sideways, centred on the region; the explorer's Play button no longer
  squeezes it); the open-string column is wider; labels on role colours pick dark or white
  text for contrast; light-theme muted/green/red text and dark-theme red fills darkened;
  "End" is a full-size target; Quality switch gained "Show answer"; the session summary's
  median time counts correct answers only; Name the tones keeps role colours on wrong
  labels (red ring) and explains each string; landscape side-column buttons stack.
- **2026-11-20 — Audit recommendations accepted by the owner (all nine):**
  1. Practice setup: compact mode picker (2 columns on phones, 4 on wide screens), only
     the selected mode's description shown — key and chords now on the first screen.
  2. Preferences: "Labels & hints" section — "Role labels in the chord explorer", "Note
     names under role labels", "Fret numbers", "Show roles on the given shape".
  3. Spelling: global ♭/♯ default and the per-pair "Default" option removed; one ♭/♯
     choice per pair. Stored "auto" pairs are pinned to what they resolved to.
  4. From the tonic / Next shape: after answering, the given shape fades and a key names
     it ("i (given)" vs "♭VII").
  5. A board wider than the screen fades the edge with more frets and shows ‹ / › on the
     fret-number row.
  6. Screens ≥ 700 px wide (tablets) use the side-column layout of phone landscape. Notes
     weren't enlarged: at that width the board column has no room to grow.
  7. Sevenths: string sets shown as two labelled groups, "Drop-2 (4 notes)" and "Shells
     (R–3–7)", in the explorer and in practice setup.
  8. Progression walk: session length counts chords (counter shows chords done, "2 / 20 chords"), not progressions;
     a session ends after the progression that reaches the count.
  9. Progress heat grid: column headings 1–7 and each empty cell names its degree.
- **2026-11-20 — MIT license** (owner: any permissive license). README screenshots live in
  `docs/screenshots/readme/` and are regenerated by
  `README_SHOTS=1 npx playwright test tests/e2e/readme-shots.spec.ts --trace off`.
- **2026-11-21 — Name the chord: no option can be ruled out at a glance** (owner report).
  The Roman numeral already states the quality (iv = minor, ii° = diminished, V7), so all
  forward options now share the answer's quality and the question tests the root and its
  spelling: wrong accidental (A for A♭), neighbouring and 4th/5th-related scale degrees,
  and sometimes the misspelling (G♯ for A♭), but only together with a second same-pitch
  pair so a pair never reveals the answer. Double accidentals appear only in keys that use
  them. Reverse options are all written with the chord's quality (all lowercase for a minor
  chord, all ° for a diminished one); the old case-flipped distractor ("IV" for A♭m, and
  nonsense like "II°") is gone. The tonic is never asked (it's always the key's name), and
  the same chord is never asked twice in a row in either direction.
- **2026-11-21 — Name the chord: "scale degree → chord" question type** (owner request).
  "In E♭m, what chord is on the 4th degree?" states no quality, so options form a 2 × 2
  grid: {right root, a plausible wrong root} × {right quality, its common mix-up}
  (major ↔ minor, dim → minor, maj7 ↔ 7, m7 ↔ 7, m7♭5 → m7). Knowing only the root or only
  the quality leaves a coin flip. In a minor key the V chord's mix-up is never the other V
  (natural v / harmonic V), which would be arguable rather than wrong; it uses ° / ø7.
  Setup "Question type": Numeral → chord, Scale degree → chord, Chord → numeral, Mix
  (default). Degrees are counted on the natural-minor scale in minor keys.
- **2026-11-22 — Navigation and help** (owner requests). Home no longer has a second
  Preferences entry (the gear is the one way in, on every screen). Preferences and the new
  Help & about page open "on top": the practice session or the chord explorer stays alive
  underneath and Back returns to it; if a setting changed while a question was unanswered,
  that question is regenerated with the new settings. Help & about covers getting started,
  the main ideas (roles, numerals, string sets, fret window, inversions, anchors, Smooth,
  review/mastery), every mode, tips, privacy, and contact via GitHub issues; each mode's
  setup also has a "How it works" note. No welcome card or pop-ups (owner: annoying).
  Version = build time + short commit, stamped at build (`__BUILD_TIME__`,
  `__BUILD_COMMIT__`), shown in small print on Home and in Help & about.
- **2026-11-22 — Progress redesigned around "am I getting better?" and "what should I
  practise?"** (owner request). New per-answer log (`progress/log.ts`, IndexedDB key `log`,
  capped at 20 000 answers ≈ 1–2 MB, included in backups) makes trends possible; item stats
  only hold the current state. The page now has one filter row (all modes / one mode) and:
  _Getting better?_ — two single-series charts per practice day (days off skipped): share
  of right answers, and median time of right answers, with a plain-language comparison of
  the last N practice days against the N before (weighted by answers); tap a point for
  that day. _What to practise_ replaces "keys × degrees": rows are chord functions (a
  numeral of major or minor keys, across all keys), columns are string sets, because the
  shape matters more than the key; tap a cell to filter the trend to it and "Practise this"
  (drills its weakest items). Weakest items stay; "By key" becomes a short list with an
  explanation; "By string set" and "By mode" lists were folded into the map and filters.
  Trends start with this version (older answers weren't logged individually); streak and
  minutes still use the daily totals.
- **2026-11-22 — PR previews** (owner request: a user-friendly way to evaluate a PR). Every
  pull request is built and published at
  `https://shushz.github.io/fretboard-chords/pr-preview/pr-<n>/` and the link is commented on
  the PR (`.github/workflows/preview.yml`, `rossjrw/pr-preview-action`); it's removed when
  the PR closes. To host previews next to the live app, Pages now serves the `gh-pages`
  branch: `deploy.yml` publishes `main` to its root and leaves `pr-preview/` alone
  (Settings → Pages → Source: Deploy from a branch, `gh-pages`, `/`). Previews share the
  origin with the live app, so each uses its own IndexedDB database and localStorage
  prefix (the live app keeps its existing storage), has no service worker, starts with
  about two weeks of demo practice (`progress/demo.ts`, fed through the normal recording
  path), and shows a banner naming the PR with a "Reset demo data" button. The live app's
  service worker ignores `/pr-preview/` paths.
