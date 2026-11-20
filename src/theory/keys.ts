import {
  type Accidental,
  type Letter,
  type Note,
  fifths,
  formatNote,
  note,
  noteToAscii,
  parseNoteCandidates,
  pitchClass,
  sameNote,
  spellAbove,
} from './notes';

export type Mode = 'major' | 'minor';

export interface Key {
  readonly tonic: Note;
  readonly mode: Mode;
}

/** Semitones of each scale degree above the tonic. Minor = natural minor. */
export const SCALE_STEPS: Record<Mode, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

export function key(tonic: Note, mode: Mode): Key {
  return { tonic, mode };
}

export function sameKey(a: Key, b: Key): boolean {
  return a.mode === b.mode && sameNote(a.tonic, b.tonic);
}

/** The seven scale notes, spelled by letter (one per letter). */
export function scale(k: Key): Note[] {
  return SCALE_STEPS[k.mode].map((semi, i) => spellAbove(k.tonic, i, semi));
}

/** Key signature: positive = number of sharps, negative = number of flats. */
export function signature(k: Key): number {
  return fifths(k.tonic) - (k.mode === 'minor' ? 3 : 0);
}

/** A key with more than 7 accidentals in its signature (e.g. G♭m, D♯ major). */
export function isTheoretical(k: Key): boolean {
  return Math.abs(signature(k)) > 7;
}

export function keyToAscii(k: Key): string {
  return noteToAscii(k.tonic) + (k.mode === 'minor' ? 'm' : '');
}

export function formatKey(k: Key, glyphs = true, long = false): string {
  const t = formatNote(k.tonic, glyphs);
  if (long) return `${t} ${k.mode}`;
  return t + (k.mode === 'minor' ? 'm' : '');
}

// ---------------------------------------------------------------------------
// Enharmonic pairs and preferences
// ---------------------------------------------------------------------------

export type EnharmonicPairId = 'Db/C#' | 'Gb/F#' | 'Cb/B' | 'Bbm/A#m' | 'Ebm/D#m' | 'Abm/G#m';
export type SharpOrFlat = 'sharp' | 'flat';

interface PairDef {
  id: EnharmonicPairId;
  mode: Mode;
  flat: Note;
  sharp: Note;
}

export const ENHARMONIC_PAIRS: readonly PairDef[] = [
  { id: 'Db/C#', mode: 'major', flat: note('D', -1), sharp: note('C', 1) },
  { id: 'Gb/F#', mode: 'major', flat: note('G', -1), sharp: note('F', 1) },
  { id: 'Cb/B', mode: 'major', flat: note('C', -1), sharp: note('B') },
  { id: 'Bbm/A#m', mode: 'minor', flat: note('B', -1), sharp: note('A', 1) },
  { id: 'Ebm/D#m', mode: 'minor', flat: note('E', -1), sharp: note('D', 1) },
  { id: 'Abm/G#m', mode: 'minor', flat: note('A', -1), sharp: note('G', 1) },
];

export interface SpellingOptions {
  /** Global default for anything not covered by a specific pair toggle. */
  prefer: SharpOrFlat;
  /** Per enharmonic key pair choice. 'auto' follows `prefer`. */
  pairs: Record<EnharmonicPairId, SharpOrFlat | 'auto'>;
  /** Allow keys with > 7 accidentals, spelled with double accidentals. */
  allowTheoretical: boolean;
}

/** Defaults from SPEC §7.1: D♭, G♭, B, B♭m, E♭m, G♯m; theoretical keys off. */
export const DEFAULT_SPELLING: SpellingOptions = {
  prefer: 'flat',
  pairs: {
    'Db/C#': 'flat',
    'Gb/F#': 'flat',
    'Cb/B': 'sharp',
    'Bbm/A#m': 'flat',
    'Ebm/D#m': 'flat',
    'Abm/G#m': 'sharp',
  },
  allowTheoretical: false,
};

function pairChoice(p: PairDef, opts: SpellingOptions): SharpOrFlat {
  const c = opts.pairs[p.id];
  return c === 'auto' ? opts.prefer : c;
}

/** The standard (≤ 7 accidentals) key on `pc`, choosing via prefs when two exist. */
export function standardKeyForPitchClass(pc: number, mode: Mode, opts: SpellingOptions): Key {
  const pair = ENHARMONIC_PAIRS.find((p) => p.mode === mode && pitchClass(p.flat) === pc);
  if (pair) return key(pairChoice(pair, opts) === 'flat' ? pair.flat : pair.sharp, mode);
  // Exactly one standard key exists on this pitch class: search tonics with ≤ 1 accidental.
  for (const cand of candidateTonics(pc)) {
    const k = key(cand, mode);
    if (!isTheoretical(k)) return k;
  }
  throw new Error(`No standard key on pitch class ${pc}`);
}

function candidateTonics(pc: number): Note[] {
  const out: Note[] = [];
  const letters: Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  for (const l of letters) {
    for (const a of [0, 1, -1] as Accidental[]) {
      const n = note(l, a);
      if (pitchClass(n) === pc) out.push(n);
    }
  }
  return out;
}

export interface ResolvedKey {
  key: Key;
  /** Set when the requested key was replaced (enharmonic preference or theoretical off). */
  mappedFrom?: Key;
  /** True when the replacement happened because theoretical keys are disabled. */
  theoreticalMapped?: boolean;
}

/**
 * Normalize a requested key to the key object selected by the current preferences:
 * - members of an enharmonic pair map to the preferred member;
 * - theoretical keys map to their enharmonic standard key unless allowed.
 */
export function resolveKey(k: Key, opts: SpellingOptions): ResolvedKey {
  if (isTheoretical(k)) {
    if (opts.allowTheoretical) return { key: k };
    const std = standardKeyForPitchClass(pitchClass(k.tonic), k.mode, opts);
    return { key: std, mappedFrom: k, theoreticalMapped: true };
  }
  const pair = ENHARMONIC_PAIRS.find(
    (p) => p.mode === k.mode && (sameNote(p.flat, k.tonic) || sameNote(p.sharp, k.tonic)),
  );
  if (pair) {
    const chosen = key(pairChoice(pair, opts) === 'flat' ? pair.flat : pair.sharp, k.mode);
    if (!sameKey(chosen, k)) return { key: chosen, mappedFrom: k };
  }
  return { key: k };
}

/**
 * Parse a key name: "F#m", "Gbm", "bEm", "Ebm", "A#m", "C", "Db major", "f# minor",
 * "E♭m", "Ebmin". Returns the raw (unresolved) key or null.
 */
export function parseKeyName(input: string): Key | null {
  for (const c of parseNoteCandidates(input)) {
    const raw = c.rest.trim();
    const rest = raw.toLowerCase();
    let mode: Mode | null = null;
    if (raw === '' || raw === 'M' || rest === 'maj' || rest === 'major') mode = 'major';
    else if (rest === 'm' || rest === 'min' || rest === 'minor' || rest === '-') mode = 'minor';
    if (mode) return key(c.note, mode);
  }
  return null;
}

/** Parse + resolve with preferences. */
export function normalizeKey(input: string, opts: SpellingOptions): ResolvedKey | null {
  const k = parseKeyName(input);
  return k ? resolveKey(k, opts) : null;
}

/** The 12 keys of a mode selected by preferences, ordered by tonic pitch class from C. */
export function keysForMode(mode: Mode, opts: SpellingOptions): Key[] {
  const out: Key[] = [];
  for (let pc = 0; pc < 12; pc++) out.push(standardKeyForPitchClass(pc, mode, opts));
  return out;
}

/** Theoretical keys (single-accidental tonic, > 7 accidentals), for the key picker. */
export function theoreticalKeys(mode: Mode): Key[] {
  const out: Key[] = [];
  for (const l of ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as Letter[]) {
    for (const a of [-1, 1] as Accidental[]) {
      const k = key(note(l, a), mode);
      if (isTheoretical(k)) out.push(k);
    }
  }
  return out;
}

/** Every key the user may pick under the current preferences. */
export function selectableKeys(opts: SpellingOptions): Key[] {
  const out = [...keysForMode('major', opts), ...keysForMode('minor', opts)];
  if (opts.allowTheoretical) out.push(...theoreticalKeys('major'), ...theoreticalKeys('minor'));
  return out;
}

/** The relative major/minor key, spelled from the same scale. */
export function relativeKey(k: Key): Key {
  const s = scale(k);
  return k.mode === 'minor' ? key(s[2], 'major') : key(s[5], 'minor');
}
