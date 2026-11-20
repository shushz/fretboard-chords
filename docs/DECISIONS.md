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
