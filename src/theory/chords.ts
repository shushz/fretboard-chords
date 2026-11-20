import { type Key, type Mode, SCALE_STEPS, scale } from './keys';
import {
  type Note,
  formatNote,
  mod,
  noteToAscii,
  pitchClass,
  sameNote,
  semitonesUp,
  spellAbove,
} from './notes';
import { type Role, roleFromInterval } from './roles';

export type TriadQuality = 'maj' | 'min' | 'dim' | 'aug';
export type SeventhQuality = 'maj7' | '7' | 'm7' | 'm7b5' | 'dim7';
export type Quality = TriadQuality | SeventhQuality;

export const TRIAD_QUALITIES: readonly TriadQuality[] = ['maj', 'min', 'dim', 'aug'];

/** Semitones of 3rd, 5th, (7th) above the root, by quality. */
export const QUALITY_INTERVALS: Record<Quality, readonly number[]> = {
  maj: [4, 7],
  min: [3, 7],
  dim: [3, 6],
  aug: [4, 8],
  maj7: [4, 7, 11],
  '7': [4, 7, 10],
  m7: [3, 7, 10],
  m7b5: [3, 6, 10],
  dim7: [3, 6, 9],
};

export function isSeventh(q: Quality): q is SeventhQuality {
  return QUALITY_INTERVALS[q].length === 3;
}

/** Triad underlying a seventh chord (V7 → maj). */
export function triadOf(q: Quality): TriadQuality {
  switch (q) {
    case 'maj7':
    case '7':
      return 'maj';
    case 'm7':
      return 'min';
    case 'm7b5':
    case 'dim7':
      return 'dim';
    default:
      return q;
  }
}

export interface ChordTone {
  readonly note: Note;
  readonly role: Role;
}

export interface Chord {
  readonly root: Note;
  readonly quality: Quality;
  /** Root first, then 3rd, 5th, (7th). */
  readonly tones: readonly ChordTone[];
}

/** Build a chord by stacking letters (R–3–5–7 = every other letter) on `root`. */
export function buildChord(root: Note, quality: Quality): Chord {
  const ivs = QUALITY_INTERVALS[quality];
  const tones: ChordTone[] = [{ note: root, role: 'R' }];
  ivs.forEach((semi, i) => {
    const steps = 2 * (i + 1);
    tones.push({ note: spellAbove(root, steps, semi), role: roleFromInterval(steps, semi) });
  });
  return { root, quality, tones };
}

/** Role of a spelled note in a chord, or null if it isn't a chord tone. */
export function roleOfNote(chord: Chord, n: Note): Role | null {
  return chord.tones.find((t) => sameNote(t.note, n))?.role ?? null;
}

/** Role of a pitch class in a chord (for fretted notes, which carry no spelling). */
export function roleOfPitchClass(chord: Chord, pc: number): Role | null {
  return chord.tones.find((t) => pitchClass(t.note) === pc)?.role ?? null;
}

/** Spelled chord tone carrying pitch class `pc`, if any. */
export function toneForPitchClass(chord: Chord, pc: number): ChordTone | null {
  return chord.tones.find((t) => pitchClass(t.note) === pc) ?? null;
}

export function chordsEqual(a: Chord, b: Chord): boolean {
  return a.quality === b.quality && sameNote(a.root, b.root);
}

// ---------------------------------------------------------------------------
// Chord symbols
// ---------------------------------------------------------------------------

export interface SymbolOptions {
  glyphs: boolean;
  /** 'symbol': G°, Bø7 · 'text': Gdim, Bm7b5 */
  dimStyle: 'symbol' | 'text';
}

export const DEFAULT_SYMBOL: SymbolOptions = { glyphs: true, dimStyle: 'symbol' };

export function qualitySuffix(q: Quality, o: SymbolOptions = DEFAULT_SYMBOL): string {
  const sym = o.dimStyle === 'symbol';
  switch (q) {
    case 'maj':
      return '';
    case 'min':
      return 'm';
    case 'dim':
      return sym ? '°' : 'dim';
    case 'aug':
      return sym ? '+' : 'aug';
    case 'maj7':
      return 'maj7';
    case '7':
      return '7';
    case 'm7':
      return 'm7';
    case 'm7b5':
      return sym ? 'ø7' : o.glyphs ? 'm7♭5' : 'm7b5';
    case 'dim7':
      return sym ? '°7' : 'dim7';
  }
}

export function chordSymbol(c: Chord, o: SymbolOptions = DEFAULT_SYMBOL): string {
  return formatNote(c.root, o.glyphs) + qualitySuffix(c.quality, o);
}

export function qualityName(q: Quality): string {
  const m: Record<Quality, string> = {
    maj: 'major',
    min: 'minor',
    dim: 'diminished',
    aug: 'augmented',
    maj7: 'major 7',
    '7': 'dominant 7',
    m7: 'minor 7',
    m7b5: 'half-diminished',
    dim7: 'diminished 7',
  };
  return m[q];
}

// ---------------------------------------------------------------------------
// Diatonic harmony
// ---------------------------------------------------------------------------

/** Scale degree index 0..6 (0 = I/i). */
export type DegreeIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const DEGREES: readonly DegreeIndex[] = [0, 1, 2, 3, 4, 5, 6];

export interface HarmonyOptions {
  /** Minor-key V: harmonic (V / V7, raised 7th, default) or natural (v / m7). */
  minorV: 'harmonic' | 'natural';
}

export const DEFAULT_HARMONY: HarmonyOptions = { minorV: 'harmonic' };

export interface DiatonicChord extends Chord {
  readonly key: Key;
  readonly degree: DegreeIndex;
}

/**
 * The diatonic chord on `degree` of `k`. Thirds are stacked from the key's scale; in
 * minor with `minorV: 'harmonic'`, the V chord uses the raised 7th scale degree.
 */
export function diatonicChord(
  k: Key,
  degree: DegreeIndex,
  sevenths = false,
  opts: HarmonyOptions = DEFAULT_HARMONY,
): DiatonicChord {
  const sc = scale(k);
  const steps = [...SCALE_STEPS[k.mode]];
  if (k.mode === 'minor' && opts.minorV === 'harmonic' && degree === 4) {
    steps[6] = 11; // raised leading tone: 3rd of V
  }
  const root = sc[degree];
  const members = sevenths ? [2, 4, 6] : [2, 4];
  const ivs = members.map((m) => mod(steps[(degree + m) % 7] - steps[degree], 12));
  const quality = qualityFromIntervals(ivs);
  const chord = buildChord(root, quality);
  return { ...chord, key: k, degree };
}

function qualityFromIntervals(ivs: number[]): Quality {
  const sig = ivs.join(',');
  for (const [q, v] of Object.entries(QUALITY_INTERVALS)) {
    if (v.join(',') === sig) return q as Quality;
  }
  throw new Error(`Unknown chord intervals ${sig}`);
}

export function diatonicChords(
  k: Key,
  sevenths = false,
  opts: HarmonyOptions = DEFAULT_HARMONY,
): DiatonicChord[] {
  return DEGREES.map((d) => diatonicChord(k, d, sevenths, opts));
}

/** Default "core" degree sets (SPEC §3.3). */
export const CORE_DEGREES: Record<Mode, readonly DegreeIndex[]> = {
  minor: [0, 3, 4, 1, 5, 6], // i, iv, V, ii°, bVI, bVII
  major: [0, 3, 4, 1, 5], // I, IV, V, ii, vi
};

/** Find which degree of `k` a chord is (root spelling + quality must match). */
export function findDegree(
  k: Key,
  c: Chord,
  opts: HarmonyOptions = DEFAULT_HARMONY,
): DegreeIndex | null {
  const sevenths = isSeventh(c.quality);
  for (const d of DEGREES) {
    if (chordsEqual(diatonicChord(k, d, sevenths, opts), c)) return d;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Roman numerals
// ---------------------------------------------------------------------------

export interface NumeralOptions {
  /** ° / ø (symbol) vs "dim" / "7b5" (text). */
  dimStyle: 'symbol' | 'text';
  /** Glyph accidentals (♭VII) vs ASCII (bVII). */
  glyphs: boolean;
}

export const DEFAULT_NUMERAL: NumeralOptions = { dimStyle: 'symbol', glyphs: true };

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/**
 * Roman numeral for a chord on scale degree `degree` with root `root` in key `k`.
 * The accidental is relative to the parallel major scale (so minor bIII, bVI, bVII).
 */
export function romanNumeral(
  k: Key,
  degree: DegreeIndex,
  root: Note,
  quality: Quality,
  o: NumeralOptions = DEFAULT_NUMERAL,
): string {
  const majorStep = SCALE_STEPS.major[degree];
  const actual = semitonesUp(k.tonic, root);
  let diff = actual - majorStep;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  const acc =
    diff === 0
      ? ''
      : diff < 0
        ? (o.glyphs ? '♭' : 'b').repeat(-diff)
        : (o.glyphs ? '♯' : '#').repeat(diff);
  const tri = triadOf(quality);
  const upper = tri === 'maj' || tri === 'aug';
  let base = upper ? NUMERALS[degree] : NUMERALS[degree].toLowerCase();
  const sym = o.dimStyle === 'symbol';
  switch (quality) {
    case 'dim':
      base += sym ? '°' : 'dim';
      break;
    case 'aug':
      base += '+';
      break;
    case 'maj7':
      base += 'maj7';
      break;
    case '7':
    case 'm7':
      base += '7';
      break;
    case 'm7b5':
      base += sym ? 'ø7' : o.glyphs ? '7♭5' : '7b5';
      break;
    case 'dim7':
      base += sym ? '°7' : 'dim7';
      break;
  }
  return acc + base;
}

export function chordNumeral(c: DiatonicChord, o: NumeralOptions = DEFAULT_NUMERAL): string {
  return romanNumeral(c.key, c.degree, c.root, c.quality, o);
}

/** Debug/ASCII form, e.g. "D#-F##-A#". */
export function chordSpelling(c: Chord): string {
  return c.tones.map((t) => noteToAscii(t.note)).join('-');
}
