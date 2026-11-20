# Changelog

- Spec, agent instructions and unattended-run runbook added.
- M1 Scaffold: Vite + TypeScript + Preact, Vitest, Playwright, ESLint/Prettier, CI workflow, placeholder home screen.
- M2 Theory engine: note spelling (double accidentals), keys with enharmonic/theoretical preferences and alias normalization, diatonic triads/sevenths (harmonic minor V), roles, numerals, symbols; §3.5 fixtures as tests.
- M3 Fretboard engine: tuning/pitch at (string, fret), string sets & fret windows, full-neck voicing enumeration with inversion tags, shells, window fit (one-note-outside option), root anchors, minimal-movement and next/previous-shape helpers.
- M4 Fretboard view + preferences: responsive SVG fretboard (region highlight/dim, tap input, role/name labels, ghost anchors, left-handed), full §7.1 preferences model with IndexedDB persistence, Preferences screen, Chord explorer, light/dark themes.
- M5 Audio: Karplus–Strong plucked-string synth, note on tap, strum, correct/wrong feedback sounds, mute button and volume.
- M6 Mode 1 Find the chord (incl. anchored variant) with setup → questions → summary session flow.
- M7 Progress store: IndexedDB item stats (rolling accuracy, median time, Leitner box), daily log, stats screen v1 (streak, minutes, 14-day trend, key × degree heat grid, by string set/mode, weakest items), JSON export/import, reset per key or all.
- M15 PWA & deploy: service worker precaching all assets, web manifest and icons, offline e2e test, GitHub Pages deploy workflow.
- M8 Modes 2 & 3: From the tonic (smooth-voicing badge) and Next/previous shape; shared tap-question component.
- M9 Mode 4 Name the tones: label each note's role, and the reverse "tap the b3 of V on string 2".
- M10 Mode 7 Quality switch: major ↔ minor by moving the 3rd; dim/aug/V→V7 and seventh-chord switches behind preferences; optional name-the-new-chord step.
