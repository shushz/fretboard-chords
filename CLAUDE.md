# CLAUDE.md — instructions for agents working on this repo

Read `SPEC.md` before starting any task. It is the source of truth for behavior,
music theory rules and milestones. If a task conflicts with the spec, say so in the PR
description instead of silently diverging.

## Project in one line

Offline-first PWA (TypeScript + Vite + Preact, SVG fretboard, Web Audio) for drilling
diatonic chord shapes, chord-tone roles and chord relationships on the guitar neck.

## Commands

- `npm install` — install deps
- `npm run dev` — dev server
- `npm test` — Vitest unit tests (must pass)
- `npm run test:e2e` — Playwright e2e/screenshot tests
- `npm run lint` — ESLint + Prettier check
- `npm run build` — production build (must succeed)

Before opening a PR, run: `npm run lint && npm test && npm run build`.
Run e2e when UI changed; if Playwright browsers can't be installed in the environment,
say so in the PR rather than skipping silently.

## Layout

```
src/
  theory/      notes, spelling, keys, chords, roles — pure TS, no DOM
  fretboard/   tuning, positions, voicing enumeration — pure TS, no DOM
  audio/       Web Audio synth and feedback sounds
  exercises/   one folder per mode; question generation + grading (pure) + UI
  progress/    item stats, spaced repetition, IndexedDB persistence
  ui/          shared components (Fretboard.tsx, buttons, layout, theme)
tests/e2e/     Playwright specs
docs/          CHANGELOG.md, screenshots, design notes
```

## Rules

- **Theory and fretboard logic must be pure and unit-tested.** Any change in
  `src/theory` or `src/fretboard` needs tests; keep the fixtures in SPEC §3.5 green.
- **Spelling matters.** Never derive note names from pitch class alone; spell from the
  key/chord letters. Support double sharps/flats.
- **Offline only.** No runtime network requests, no CDN assets, no analytics,
  no backend. Everything must be bundled and precached.
- Keep question generation and grading separate from rendering so they can be tested
  without a DOM.
- Mobile-first: test at 412×915; touch targets ≥ 44 px; works in portrait and landscape.
- Roles are labeled `R, ♭3, 3, ♭5, 5, ♭7, 7` in the UI (ASCII `b3` internally); use the same role colors everywhere.
- **No hard-coded musical choices.** If there is more than one valid option (enharmonic
  spelling, minor-V variant, string sets, anchors…), read it from the
  preferences model (SPEC §7.1). Add new preferences there with a sensible default.
- Avoid heavy dependencies; prefer small, well-maintained packages. Justify new ones
  in the PR description.
- Strict TypeScript (`strict: true`), no `any` without a comment explaining why.

## Unattended runs

If the task says the owner is away, follow `docs/AUTONOMOUS_RUN.md`: don't ask
questions, log choices in `docs/DECISIONS.md`, keep `docs/PROGRESS.md` current, and
merge each milestone PR yourself once checks pass.

## Workflow

- One milestone (SPEC §8) or one clearly scoped fix per branch/PR.
- Branch name: `m<NN>-short-name` for milestones, `fix-short-name` for fixes.
- PR description: what changed, how it was tested, screenshots for UI changes,
  any deviations from SPEC.
- Every PR gets a preview link (PR comment, built by `preview.yml`) with demo data; point the
  owner to it for UI changes. Previews must not touch the live app's storage.
- Add a line to `docs/CHANGELOG.md` for each PR.
- **Keep user-facing docs current in the same PR.** If a PR changes anything a user can
  see or do, the same PR must:
  1. Regenerate the README screenshots (`npm run build && README_SHOTS=1 npx playwright
test tests/e2e/readme-shots.spec.ts --trace off`), extending
     `tests/e2e/readme-shots.spec.ts` when a new screen or feature deserves a shot, look at
     them, and update the README text that describes the change.
  2. Update the in-app help: _Help & about_ (`src/ui/screens/About.tsx`) and the mode's
     `description` / `help` in `src/exercises/modes.ts`, so they describe the app as it is
     after the PR (screens, names of buttons and settings, behaviour).
  3. Tick both in the PR template's checklist (`.github/pull_request_template.md`).
     Stacked PRs: each PR's README and help match that PR; regenerate again after merging a
     base branch in.
- If you find a spec gap or ambiguity, make a reasonable choice, document it in the PR,
  and propose a SPEC.md edit in the same PR.

## Audits

- `npm test` includes property tests (`src/exercises/properties.test.ts`) that check every
  mode against many generated setups; keep them green and extend them with new modes/options.
- `npm run audit` runs the automated walkthrough (`tests/e2e/audit.spec.ts`): every screen
  and mode at phone portrait/landscape and tablet sizes, light and dark, checking for page
  errors, horizontal overflow, off-screen elements, small tap targets and low contrast.
- A written **critique pass** (reviewing the walkthrough screenshots and flows against the
  spec and UX sense, reported as findings) runs **only when the owner asks**. Don't
  schedule it; do suggest it after significant changes (new modes, layout or flow changes).
