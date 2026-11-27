# Fretboard Chords — Product Spec

An offline-first web app (PWA, installable on Android) for memorizing chord shapes,
chord tones and the relationships between diatonic chords on the guitar fretboard,
in every major and minor key.

## 1. Goals

1. **Find chords fast** in a chosen region of the neck (a string set + a fret window),
   e.g. "key of F#m, strings 1–3, frets 5–9: find i, iv, V, ii°, bVI, bVII".
2. **Know the function of every note you play**: on each string, know whether the note
   is the R, 3/b3, 5/b5 or 7/b7 of the chord.
3. **Know the relationships** between chords in a key: from a given I/i shape, find
   the IV, V, vi… nearby; find the next/previous shape of the same chord up/down the neck.
4. **Name diatonic chords** in any key ("what is the iv in E♭m?" → A♭m).
5. Practice using **real progressions** (I–vi–ii–V, i–bVI–bVII–V, …).
6. **Track progress** and steer practice toward weak spots.
7. **Switch chord quality** by moving a single tone (major ↔ minor by moving the 3rd),
   which reinforces knowing where each chord tone sits.
8. **Anchor shapes to a root** on string 6 or 5.
9. **Fully offline**, pleasant clean visuals, guitar-like sound.

Non-goals for v1: backend/accounts, alternate tunings, ear training, chord-melody,
non-diatonic harmony beyond the harmonic-minor V/V7.

## 2. Platform & stack

- **PWA**: TypeScript + Vite, Preact (with signals) for UI, SVG fretboard.
- **Offline**: `vite-plugin-pwa` (Workbox) precaching every asset; the app must start
  and work with the network fully disabled after the first load. No CDN fonts/scripts.
- **Audio**: Web Audio API, plucked-string synthesis (Karplus-Strong or similar),
  no sample files required. AudioContext unlocked on first user gesture.
- **Storage**: IndexedDB (via `idb-keyval` or Dexie) for progress and settings;
  JSON export/import for backup. Answers of the last 60 days are kept one by one, one key
  per day (a save writes only that day); older days are folded into per-day summaries per
  mode × chord function (answers, right answers, a few quantiles of right-answer times),
  so years of history stay well under 1 MB and trends can go back to the start. The app
  asks the browser for persistent storage, and Progress shows when the last backup was
  made, with a plain reminder line once there are two weeks of practice and no backup in
  the last 30 days.
- **Tests**: Vitest (unit, mandatory for all theory/fretboard logic);
  Playwright (e2e + screenshots at a phone viewport, e.g. 412×915).
- **Deploy**: GitHub Pages via GitHub Actions on push to `main`
  (Vite `base` set to `/<repo-name>/`).
- Mobile-first, portrait and landscape; touch targets ≥ 44 px; dark and light themes.
  Phones in landscape and screens ≥ 700 px wide show the question beside the board.

## 3. Music theory model

### 3.1 Notes and spelling

- A note = letter (A–G) + accidental (bb, b, natural, #, ##). Pitch class derived from it.
- **Spelling is always correct for the key.** Chord tones are spelled by stacking
  letters (R–3–5–7 = every other letter). Double sharps/flats must be supported
  (e.g. G#m harmonic V = D#–F##–A#).
- Display ♯ ♭ 𝄪 𝄫 glyphs in the UI (always); ASCII internally.

### 3.2 Keys

- 12 major and 12 minor tonics. Wherever more than one spelling is valid, the
  choice is a **preference** (see §7.1), never hard-coded:
  - Enharmonic key pairs, each with its own toggle and a global "prefer ♯ / prefer ♭"
    default: D♭/C♯, G♭/F♯, C♭/B (major); B♭m/A♯m, E♭m/D♯m, A♭m/G♯m (minor).
  - **Theoretical keys** (more than 7 accidentals, e.g. G♭m, D♯ major) — off by default.
    When on, they are spelled correctly with double accidentals (G♭m: G♭–A♭–B𝄫–C♭–D♭–E𝄫–F♭).
    When off, they map to their enharmonic key (G♭m → F♯m), and the UI says so once.
- Input aliases are normalized: "Gbm", "bEm", "Ebm", "A#m" and so on map to the key
  object selected by the current preferences.
- Spelling inside a key is always consistent with the chosen key name.

### 3.3 Diatonic chords

| Major key | Triad | Seventh   |
| --------- | ----- | --------- |
| I         | major | maj7      |
| ii        | minor | m7        |
| iii       | minor | m7        |
| IV        | major | maj7      |
| V         | major | 7         |
| vi        | minor | m7        |
| vii°      | dim   | m7b5 (ø7) |

| Minor key | Triad                        | Seventh    |
| --------- | ---------------------------- | ---------- |
| i         | minor                        | m7         |
| ii°       | dim                          | m7b5 (ø7)  |
| bIII      | major                        | maj7       |
| iv        | minor                        | m7         |
| v / **V** | minor / **major (harmonic)** | m7 / **7** |
| bVI       | major                        | maj7       |
| bVII      | major                        | 7          |

Minor-key V defaults to the harmonic **V / V7** (raised 7th); natural v is a preference.

**Default "core" sets** (the user's focus):

- Minor: i, iv, V (V7), ii° (iiø7), bVI, bVII
- Major: I, IV, V (V7), ii, vi (later iii, vii°)

### 3.4 Chord-tone roles

Labels relative to the chord root: `R, b3, 3, b5, 5, b7, 7` (and `bb7` reserved), displayed
with music symbols: R, ♭3, 3, ♭5, 5, ♭7, 7.
Each fretted note in a voicing carries its role.

### 3.5 Required test fixtures (non-exhaustive)

- F#m: i F#–A–C#, ii° G#–B–D, bIII A, iv B–D–F#, V C#–E#–G#, bVI D, bVII E.
- E♭m: i E♭–G♭–B♭, ii° F–A♭–C♭, bIII G♭, iv A♭–C♭–E♭, V B♭–D–F, bVI C♭–E♭–G♭, bVII D♭.
- G#m: V = D#–F##–A#.
- C major: V7 = G–B–D–F; viiø7 = B–D–F–A.

## 4. Fretboard model

- Standard tuning; string 1 = high E4, string 6 = low E2. Frets 0–15 (configurable to 17/19/22).
- **Region** = string set + fret window.
  - Triad string sets, by priority:
    - **Primary:** 1–3 and 2–4 (on by default, used most by question selection)
    - **Secondary:** 3–5 (off by default)
    - **Low:** 4–6 (off by default, can be enabled in preferences)
  - Seventh string sets (drop-2, 4 strings): 1–4, 2–5, 3–6. Optional 3-note
    shells (R–3–7, R–7–3, omitting the 5th) on 3-string sets.
  - Fret window: start fret + width (default 5 frets, e.g. 5–9). Presets plus "random".
- **Voicing** = exactly one note per string of the set, containing every required
  chord tone, span ≤ 4 frets (configurable), all frets inside the window
  (optionally allow a note one fret outside the window, setting).
  Open strings (fret 0) count as inside a window that starts at fret 1. From the tonic and
  the progression walk, whose point is staying close, also accept shapes up to 2 frets
  outside the window (Smooth still goes to the least movement). In other modes, the right
  chord played outside the window gets neutral feedback ("Right chord, but outside frets
  5–9") with no error sound; it counts as not right.
- If a chord has no voicing inside the window on a string set, questions widen the window
  for that chord by the fewest frets needed (shown in the prompt) instead of never asking
  for it; reference views show the nearest shapes outside the window.
- Triads on 3 adjacent strings have 3 closed inversions per octave; the engine
  enumerates every voicing along the whole neck and tags each with inversion
  (root position / 1st / 2nd, by lowest-string role) and position (lowest fret).
- **Example**: F#m on strings 1–3 near fret 5–7: string 3 fret 6 = C# (**5**),
  string 2 fret 7 = F# (**R**), string 1 fret 5 = A (**b3**).

### 4.1 Root anchors

A memory anchor ties an upper-string triad to the familiar root on string 6 or 5.

- **Anchored voicing** = a triad on 1–3 or 2–4 plus the chord root on string 6
  (or 5), within the fret window ± 2 frets. Typical: 2–4 triad + root on 6
  (strings 6, 4, 3, 2 with string 5 muted), or 1–3 triad + root on 5 or 6.
- The engine pairs every upper-string voicing with its nearest 6th- and 5th-string roots.
- The anchor is shown as a hint (Preferences → Labels & hints, "Root on string 6 / 5"):
  **never** / **after answering** (default) / **while answering**. It applies to Find the
  chord and the chord explorer. The strings are automatic: the nearest root on each of 6
  and 5 below the string set and within the window ± 2 (both for 1–3 and 2–4, string 6
  only for 3–5, none for 4–6).
- **Anchored variant** of Find the chord: a setup switch, "Also tap the root on string 6
  or 5" (off by default); the string is picked per question. While it's on, the hint is
  not shown before answering (it would give the root away).
- The anchor root is graded and tracked like any other note: role R on string 6/5.

## 5. Exercise modes

All modes share: key, chord set, region, triads/sevenths toggle, and session length
(N questions or T minutes; the progression walk counts chords). The key is either fixed for the session or **random**: a new
key from major, minor or both for every question (every progression in the walk), never
the same key twice in a row, with the chord set chosen per mode. Each question records correctness, time-to-answer,
and the item it tested (see §6).

1. **Find the chord** — "E♭m · iv · strings 2–4 · frets 6–10". User taps the notes;
   graded when the required number of strings has a note. Any valid voicing in the
   region is correct. On error, show the right voicing(s) with role labels.
   **Anchored variant:** first tap the root on string 6 (or 5), then build the triad on
   2–4 or 1–3 around it.
2. **From the tonic** (relative chords) — a I/i voicing is shown and played; user finds
   the target degree (IV, V, vi…) in the same region. Correct = any valid voicing;
   extra "smooth" badge if it is the one with minimal total fret movement.
   The shown I/i shape is random per question — anywhere on the neck by default, with
   the region placed around it (option: only shapes inside the chosen fret window).
   Two consecutive questions never show the same shape _and_ ask for the same chord.
3. **Next / previous shape** — a voicing is shown; user finds the next inversion of the
   same chord up (or down) the neck on the same string set.
4. **Name the tones** — a voicing is shown (and played); user labels each string's note
   with its role (R/3/5/7 buttons). Reverse variant: "tap the b3 of the V on string 2".
5. **Progression walk** — a progression plays chord by chord; user finds each chord in
   the region, ideally close to the previous one. Built-in progressions:
   - Major: I–vi–ii–V, I–IV–V–I, ii–V–I, I–V–vi–IV, vi–IV–I–V
   - Minor: i–iv–V–i, i–bVI–bVII–i, i–bVII–bVI–V, iiø–V–i, i–iv–bVII–bIII
   - Optional tempo mode (find each chord within a beat count).
6. **Name the chord** (secondary) — "In E♭m, what is iv?" → multiple choice (A♭m among
   plausible distractors, including enharmonic mis-spellings like G#m). Reverse:
   "A♭m is which degree in E♭m?" Typed answer variant later.
   Third type: "In E♭m, what chord is on the 4th degree?" — the quality isn't given, so
   options are a 2 × 2 grid of right/wrong root × right/wrong quality.
   Every option must look plausible at first glance: forward options all have the quality
   the numeral states, reverse numerals all match the chord's quality, a misspelling pair
   never singles out the answer, and the tonic (always the key's name) is never asked.
7. **Quality switch (major ↔ minor)** — a voicing is shown and played (roles hidden by
   default). The user changes its quality by moving only the tone that has to move,
   keeping every other note in place. Then the new chord plays.
   - Core: major → minor (move the 3 down a fret to b3) and minor → major (b3 up to 3).
     The user has to find which string carries the 3rd. Tapping a note that shouldn't
     move counts as an error.
   - Extensions, unlocked later: minor ↔ dim (move the 5), major ↔ aug (move the 5);
     with sevenths, V → V7 (R down two frets to b7, or add b7), maj7 ↔ 7 (7 ↔ b7),
     m7 ↔ m7b5 (5 ↔ b5).
   - Option: name the new chord afterwards (e.g. "D major → D minor"), which also
     drills the parallel-key idea.
   - Tracked per string set × inversion × which string carries the 3rd, so the stats
     show e.g. "slow at finding the 3rd on string 3".

Introduce sevenths only after triads (global toggle; suggested when triad mastery for a
key reaches the threshold).

### 5.8 Guided practice

An automatic, progress-based path for learners who'd rather not set up sessions.

- **Path** (`src/guided/curriculum.ts`): ordered steps through every mode, organized by
  **shape, not key**: a string set and the tonic's inversion. Keys are random on every
  question. Per string set (2–4, 1–3, 3–5), major keys: From the tonic from root position
  (IV, V; then ii, vi), from first and second inversion; Next/previous shape (I, IV, V);
  Name the tones (label, then tap a tone); Quality switch (major ↔ minor by the 3rd); From
  the tonic without role hints; Find the chord in root position, first, second inversion;
  Progression walk; optional challenges (Find the chord tapping the root on 6/5 too;
  progressions in tempo mode). Name the chord (theory, no fretboard) comes early, once per
  key mode. Then strings 4–6 (shorter), iii and vii° on 2–4 and 1–3; minor keys per string
  set (from i to iv, V; to ♭VI, ♭VII, ii°; quality switch; without hints; find; progression
  walk), 4–6, ♭III; then seventh chords (drop-2 on 2–5 and 1–4, major then minor). From the
  tonic comes before Find the chord (the tonic shape is a hint). Optional steps can be
  skipped and aren't reviewed.
- **Targets**: each step lists targets (mode, major/minor, chord, string set, inversion,
  hints). A target is **solid** when its last 5 answers in any key have ≥ 4 right and a
  median right-answer time ≤ 6 s (9 s for labeling tones; 8 s / 12 s with seventh chords). A step is **passed** when all its
  targets are solid; passing is remembered. Steps without hints count only answers given
  since the step opened. Answers from normal practice count too.
- **Session mix** (20 questions, or the session length): about 60 % new (current step; the
  first 5 in a row, then spread), 25 % review (learned targets weighted by recent misses and
  time since last asked), 15 % check (random learned targets). New drops to 40 % while
  "still solid" is under 75 %; 100 % before anything is learned; 0 % once the path is done.
  Never the same target twice in a row.
- **Progress**: home screen shows "Step N of M", the step's solid targets as a bar, and
  **still solid**: the share right in the latest 20 answers to learned targets. The
  session summary lists steps passed; Progress lists every step.

## 6. Progress tracking

- **Item** = (mode, key, degree, chord quality, string set, inversion, anchor string
  if any). The fret window is recorded but isn't part of the item's identity.
  Quality-switch items also record the source and target quality.
- Per item: attempts, correct, rolling accuracy (last 10), median response time,
  last-seen timestamp, spaced-repetition state (Leitner boxes 1–5 or SM-2-lite), and the
  fret window of the last attempt.
- **Review timing** (Leitner boxes 1–5, due after 0 / 1 / 3 / 7 / 21 days): wrong → box 1
  (due now); right and within the mastery time → one box up; right but slower → one box up
  but no higher than box 3. A review or drill must update the item it asks about: it is
  asked in the item's last window (or the nearest window where that shape exists), only
  that item is eligible, and a progression step reviewed as Find the chord is recorded as a
  progression step. An item that can't be asked in any window any more (a mode changed,
  a preference turned it off, a damaged key) is never replaced by another question: it is
  marked retired and leaves the due list and the weakest list until it's answered again.
- **Mastery**: ≥ 90 % over the last 10 attempts and median time ≤ 3 s (triads) /
  ≤ 5 s (sevenths). Thresholds configurable.
- Question selection: weighted toward due and weak items, with ~20 % fresh/random items.
- **Stats screen**: per-key × degree heat grid (accuracy & speed), per string set,
  per mode; trend over time; weakest 10 items with a "Practice these" button;
  daily streak and minutes practiced.
- Export/import progress as JSON; reset per key or all.

## 7. UX, visuals, sound & preferences

- Clean, high-contrast fretboard: wood-tone or neutral board, fret markers (3,5,7,9,12
  double, 15, 17), active region highlighted, out-of-region area dimmed.
- Notes as circles; after answering, show role labels (R/b3/5…) and optionally note
  names; color-code roles consistently (same color for R everywhere).
- Tap feedback: plucked note on each tap; correct → strum the chord + subtle green;
  wrong → muted "thunk" + reveal correct voicing(s). **Show answer** is not a mistake:
  neutral (accent) feedback, the answer is strummed, no thunk; it still counts as not
  right for review.
- During a session the top bar carries its status (question count, right answers,
  **End session**) so the board gets the height; End session shows the summary, Back
  leaves without it.
- Must work one-handed on a phone held while the guitar is in the lap (large buttons,
  no tiny controls).

### 7.1 Preferences

**Principle:** wherever more than one musically valid choice exists, it becomes a
preference with a sensible default. It is not hard-coded. Preferences are stored on the
device and included in the export/import. The Preferences screen is grouped:

- **Spelling:** per-pair ♭/♯ choice for D♭/C♯, G♭/F♯, C♭/B, B♭m/A♯m, E♭m/D♯m,
  A♭m/G♯m (defaults D♭, G♭, B, B♭m, E♭m, G♯m); allow theoretical keys (off).
  Accidentals are always shown as ♯ ♭ 𝄪 𝄫 (not a preference).
- **Harmony:** minor-key V as V/V7 (harmonic, default) or v/m7 (natural). Labels are
  always vii°, iiø7 and ♭3 (not preferences).
- **Fretboard:** enabled string sets (default 1–3, 2–4); fret range (15/17/19/22);
  default window and width; allow one note outside the window; max span; left-handed; show note names / roles / fret numbers.
- **Sevenths:** drop-2 4-string sets and/or 3-note shells.
- **Practice:** show roles/colors on the shape a question gives you (hint, on); root on
  string 6/5 as a hint: never / after answering (default) / while answering;
  session length, mastery thresholds, share of fresh items, tempo for the
  progression walk.
- **Sound & look:** volume/mute, strum speed, theme (light/dark/system), role colors.

## 8. Milestones

Each milestone = one PR with tests passing and a short note in `docs/CHANGELOG.md`.

1. **Scaffold** — Vite + TS + Preact, Vitest, Playwright, ESLint/Prettier, CI workflow
   (lint, test, build). Placeholder home screen.
2. **Theory engine** — notes, spelling, keys, normalization, diatonic chords, roles.
   Fixtures from §3.5 as tests.
3. **Fretboard engine** — pitch at (string, fret), voicing enumeration per region,
   inversion tagging, root-anchor pairing (§4.1), nearest-voicing / minimal-movement
   helpers. Tests.
4. **Fretboard view + preferences store** — responsive SVG, region highlight, tap input,
   role/name labels, ghost anchors, left-handed flip; preferences model (§7.1) with
   persistence and a basic Preferences screen. Playwright screenshots.
5. **Audio** — plucked-string synth, note on tap, strum, feedback sounds, mute.
6. **Mode 1: Find the chord** (including the anchored variant) + session flow
   (setup → questions → summary).
7. **Progress store** — IndexedDB persistence, item stats, stats screen v1, export/import.
8. **Modes 2 & 3** — From the tonic, Next/previous shape.
9. **Mode 4** — Name the tones (both variants).
10. **Mode 7: Quality switch** — major ↔ minor core; extensions behind toggles.
11. **Mode 5** — Progression walk (+ tempo option).
12. **Mode 6** — Name the chord.
13. **Spaced repetition & weak-spot drilling**.
14. **Sevenths** — drop-2 voicings on 4-string sets, optional shells, support in all modes
    (including the V → V7 and maj7 ↔ 7 switches).
15. **PWA & deploy** — service worker, manifest, icons, offline e2e test,
    GitHub Pages workflow. (May be pulled earlier so the app is usable on the phone.)

## 9. Later ideas

Ear mode (hear a chord, find it), alternate tunings, CAGED overlay, custom progressions,
secondary dominants, Capacitor/TWA wrapper for the Play Store.
