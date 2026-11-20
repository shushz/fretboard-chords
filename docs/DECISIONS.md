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
