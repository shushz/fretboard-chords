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
