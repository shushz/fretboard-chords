# Progress

Order for the first unattended run: 1–7, 15, then 8–14 (see `AUTONOMOUS_RUN.md`).

| #   | Milestone                          | Status | PR                                                        | Notes                                                                      |
| --- | ---------------------------------- | ------ | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Scaffold                           | done   | [#1](https://github.com/shushz/fretboard-chords/pull/1)   |                                                                            |
| 2   | Theory engine                      | done   | [#2](https://github.com/shushz/fretboard-chords/pull/2)   |                                                                            |
| 3   | Fretboard engine                   | done   | [#3](https://github.com/shushz/fretboard-chords/pull/3)   |                                                                            |
| 4   | Fretboard view + preferences store | done   | [#4](https://github.com/shushz/fretboard-chords/pull/4)   | Includes a Chord explorer screen                                           |
| 5   | Audio                              | done   | [#5](https://github.com/shushz/fretboard-chords/pull/5)   | Sound not checked by ear                                                   |
| 6   | Mode 1: Find the chord             | done   | [#6](https://github.com/shushz/fretboard-chords/pull/6)   |                                                                            |
| 7   | Progress store                     | done   | [#7](https://github.com/shushz/fretboard-chords/pull/7)   |                                                                            |
| 15  | PWA & deploy                       | done   | [#8](https://github.com/shushz/fretboard-chords/pull/8)   | Live at https://shushz.github.io/fretboard-chords/ (deploy workflow green) |
| 8   | Modes 2 & 3                        | done   | [#9](https://github.com/shushz/fretboard-chords/pull/9)   |                                                                            |
| 9   | Mode 4: Name the tones             | done   | [#10](https://github.com/shushz/fretboard-chords/pull/10) |                                                                            |
| 10  | Mode 7: Quality switch             | done   | [#11](https://github.com/shushz/fretboard-chords/pull/11) |                                                                            |
| 11  | Mode 5: Progression walk           | done   | [#12](https://github.com/shushz/fretboard-chords/pull/12) |                                                                            |
| 12  | Mode 6: Name the chord             | done   | [#13](https://github.com/shushz/fretboard-chords/pull/13) | Typed-answer variant left for later                                        |
| 13  | Spaced repetition & weak spots     | done   | [#14](https://github.com/shushz/fretboard-chords/pull/14) |                                                                            |
| 14  | Sevenths                           | done   | [#15](https://github.com/shushz/fretboard-chords/pull/15) |                                                                            |

## Run summary (2026-11-20, first unattended run)

All 15 milestones are done. Each one was merged through a GitHub PR with a merge
commit; nothing was merged locally. CI (lint, unit, build, Playwright e2e) and the
Pages deploy were green on every merge.

- **Live app:** https://shushz.github.io/fretboard-chords/. It installs as a PWA and works offline.
- **Tests:** 95 unit tests (Vitest) and 22 e2e tests (Playwright, 412×915). Phone screenshots
  are in `docs/screenshots/` (`npm run screenshots` regenerates them).
- **Decisions:** every choice made without the owner is in `docs/DECISIONS.md`.

### Open points for the owner

- **Sound is untested by ear.** The cloud session can't play audio, so the
  Karplus–Strong tone was only checked numerically (pitch within 20 cents). It may
  need tuning: `DEFAULT_PLUCK` in `src/audio/synth.ts`.
- **Name the chord: typed-answer variant not built.** SPEC says "later".
- **`npm audit` reports moderate advisories** in build-time-only Workbox
  dependencies (glob/minimatch via `vite-plugin-pwa`). They don't ship to the browser.
- **Toolchain pins** (Preact 10, TypeScript ~6.0, Playwright 1.63) can be bumped once
  plugin peers support the newer majors.
- **The Chord explorer screen is an extra**, not in the SPEC. It's a reference view
  added with M4.
