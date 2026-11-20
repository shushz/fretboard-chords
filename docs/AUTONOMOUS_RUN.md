# Unattended run — runbook

The owner is **not available** during this run and will review the history afterwards.
Do not stop to ask questions. When something is ambiguous, make the most reasonable
choice, record it in `docs/DECISIONS.md`, and keep going.

## Answers given up front

| Question      | Answer                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merging       | One PR per milestone. **Merge it into `main` yourself** once `npm run lint && npm test && npm run build` pass (and e2e, when the UI changed and browsers are available). Then start the next milestone from the updated `main`. |
| Scope / order | Get a usable app first: milestones **1 → 7, then 15 (PWA & deploy)**, then **8 → 14** as time allows.                                                                                                                           |
| Visual style  | Agent's choice. Pick one clean, cohesive look, support light and dark themes, and record the choice in `docs/DECISIONS.md`.                                                                                                     |
| Publishing    | Yes — GitHub Pages via GitHub Actions, at `https://shushz.github.io/fretboard-chords/` (Vite `base: '/fretboard-chords/'`).                                                                                                     |

## Loop for each milestone

1. `git checkout main && git pull`, then `git checkout -b m<NN>-short-name`.
2. Implement the milestone per SPEC §8, with tests.
3. Run `npm run lint && npm test && npm run build` (+ `npm run test:e2e` for UI work).
   Fix until green. For UI milestones, save phone-size screenshots (412×915) in
   `docs/screenshots/m<NN>-*.png` and look at them before merging.
4. Add a line to `docs/CHANGELOG.md`; update `docs/PROGRESS.md`.
5. Commit in small, meaningful commits. Push the branch and open a PR with
   what changed, how it was tested, screenshots, and any deviations or decisions.
6. Merge the PR into `main` (merge commit, not squash, so the history stays readable).
   If merging through GitHub isn't possible from the session, merge locally with
   `git merge --no-ff m<NN>-short-name` and push `main`, and note "merged locally" in
   `docs/PROGRESS.md`.
7. Move on to the next milestone.

## When stuck

- A failing check you can't fix after a reasonable effort: reduce scope, leave a
  `TODO(m<NN>)` with an explanation, note it in `docs/PROGRESS.md`, and move on rather
  than stopping the run.
- Never force-push `main`, rewrite merged history, or delete branches.
- Never add runtime network requests, analytics or a backend (see CLAUDE.md).
- If a tool, package or browser can't be installed, use an alternative, and say so in
  the PR and in `docs/PROGRESS.md`.

## Resuming

A run may span several sessions. At the start of every session, read
`docs/PROGRESS.md` and continue from the first milestone that isn't marked done.

## Files to keep updated

- `docs/PROGRESS.md` — table of milestones with status (todo / in progress / done),
  PR link, and notes. This is the first thing the owner will read.
- `docs/DECISIONS.md` — dated list of choices made without the owner
  (what, why, alternatives, how to change it later; preference name if applicable).
- `docs/CHANGELOG.md` — one line per merged PR.
