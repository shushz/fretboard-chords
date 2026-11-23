/** Mode 6 — Name the chord (multiple choice, both directions). Pure. */
import {
  type DegreeIndex,
  type Chord,
  type DiatonicChord,
  type Quality,
  type NumeralOptions,
  type SymbolOptions,
  CORE_DEGREES,
  buildChord,
  chordNumeral,
  chordSymbol,
  diatonicChord,
  romanNumeral,
} from '../../theory/chords';
import type { HarmonyOptions } from '../../theory/chords';
import { keyToAscii, scale } from '../../theory/keys';
import { type Note, note, pitchClass } from '../../theory/notes';
import type { Item } from '../../progress/types';
import type { PracticeConfig } from '../config';
import { weightedPick } from '../session';

export interface NameChordQuestion {
  /**
   * forward: "In E♭m, what is iv?" · reverse: "A♭m is which degree?" ·
   * degree: "In E♭m, what chord is on the 4th degree?" (quality not given away)
   */
  direction: NameChordDirection;
  chord: DiatonicChord;
  /** Displayed options; `answer` is one of them. */
  options: string[];
  answer: string;
}

export function nameChordItem(q: NameChordQuestion): Item {
  return {
    mode: 'nameChord',
    key: keyToAscii(q.chord.key),
    degree: q.chord.degree,
    quality: q.chord.quality,
    stringSet: '*',
    inversion: '*',
    anchor: null,
    variant: q.direction,
  };
}

/** Same pitch, other letter (single accidental only): A♭ ↔ G♯, B ↔ C♭ is skipped. */
export function enharmonic(n: Note): Note | null {
  if (n.acc === 0) return null;
  const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
  const i = letters.indexOf(n.letter);
  const other = letters[(i + (n.acc > 0 ? 1 : 6)) % 7];
  const pc = pitchClass(n);
  for (const acc of [-1, 0, 1] as const) {
    const cand = note(other, acc);
    if (pitchClass(cand) === pc) return cand;
  }
  return null;
}

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface NameChordOptions {
  harmony: HarmonyOptions;
  symbol: SymbolOptions;
  numeral: NumeralOptions;
  rand: () => number;
  itemWeight?: (item: Item) => number;
  previous?: unknown;
}

/**
 * Design rule: every option must look plausible at first glance. The Roman numeral already
 * says the chord's quality (iv = minor, ii° = diminished, V7 = dominant), so all forward
 * options share the answer's quality and the question tests the root and its spelling.
 * In reverse, all numerals share the chord's quality (case and symbols), so the chord
 * name doesn't rule any out. The tonic (I/i) is never asked: it's always the key's name.
 */

/** Degrees that may be asked: the selection without the tonic (or the core set if only I/i). */
export function askableDegrees(cfg: PracticeConfig): DegreeIndex[] {
  const d = cfg.degrees.filter((x) => x !== 0);
  return d.length ? d : CORE_DEGREES[cfg.key.mode].filter((x) => x !== 0);
}

function noteKey(n: Note): string {
  return `${n.letter}${n.acc}`;
}

/**
 * Wrong roots for "what is <numeral>?", all to be shown with the answer's quality:
 * the same letter with the wrong accidental (A for A♭), neighboring and 4th/5th-related
 * scale degrees (counting slips), and the enharmonic misspelling (G♯ for A♭). Double
 * accidentals only appear when the key itself uses them.
 */
export function forwardRootCandidates(
  c: DiatonicChord,
): { root: Note; enharmonicOfAnswer: boolean }[] {
  const sc = scale(c.key);
  const allowDouble = sc.some((n) => Math.abs(n.acc) === 2);
  const ok = (n: Note) => allowDouble || Math.abs(n.acc) < 2;
  const out = new Map<string, { root: Note; enharmonicOfAnswer: boolean }>();
  const add = (n: Note | null, enh = false) => {
    if (!n || !ok(n) || noteKey(n) === noteKey(c.root)) return;
    if (!out.has(noteKey(n))) out.set(noteKey(n), { root: n, enharmonicOfAnswer: enh });
  };
  for (const delta of [-1, 1] as const) {
    const acc = c.root.acc + delta;
    if (acc >= -2 && acc <= 2) add(note(c.root.letter, acc as Note['acc']));
  }
  for (const step of [1, -1, 3, 4, 2, -2]) add(sc[(((c.degree + step) % 7) + 7) % 7]);
  add(enharmonic(c.root), true);
  return [...out.values()];
}

/**
 * Pick 3 forward distractors. The answer's own misspelling (G♯m for A♭m) is only offered
 * together with a second same-pitch pair (e.g. A♭/G♯ *and* D♭/C♯), so a pair never
 * reveals the answer; when no second pair is possible it isn't offered.
 */
function pickForward(c: DiatonicChord, rand: () => number): Note[] {
  const cands = shuffle(forwardRootCandidates(c), rand);
  const twinOf = (n: Note) => {
    const e = enharmonic(n);
    return e && Math.abs(e.acc) < 2 && noteKey(e) !== noteKey(c.root) ? e : null;
  };
  const enh = cands.find((x) => x.enharmonicOfAnswer);
  const plain = cands.filter((x) => !x.enharmonicOfAnswer);
  const paired = plain.find((x) => twinOf(x.root));
  // Use the misspelling in about half the questions where a second pair is possible.
  if (enh && paired && rand() < 0.5) return [enh.root, paired.root, twinOf(paired.root)!];
  return plain.slice(0, 3).map((x) => x.root);
}

/** Numerals for "X is which degree?": other degrees, written with X's quality. */
function pickReverse(c: DiatonicChord, numeral: NumeralOptions, rand: () => number): string[] {
  const sc = scale(c.key);
  const steps = shuffle([1, -1, 3, 4, 2, -2], rand);
  const out: string[] = [];
  const answer = chordNumeral(c, numeral);
  for (const step of steps) {
    const d = ((((c.degree + step) % 7) + 7) % 7) as DegreeIndex;
    const n = romanNumeral(c.key, d, sc[d], c.quality, numeral);
    if (n !== answer && !out.includes(n)) out.push(n);
    if (out.length === 3) break;
  }
  return out;
}

export type NameChordDirection = 'forward' | 'reverse' | 'degree';

/** `cfg.variant`: one direction, or anything else for a mix of all three. */
export function nameChordDirections(cfg: PracticeConfig): NameChordDirection[] {
  const v = cfg.variant;
  return v === 'forward' || v === 'reverse' || v === 'degree'
    ? [v]
    : ['forward', 'reverse', 'degree'];
}

/** "4th", "2nd" … for scale-degree questions (degree index 0..6). */
export function ordinal(degree: number): string {
  const n = degree + 1;
  return `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
}

/**
 * The plausible wrong quality for a chord when the question doesn't state it: the
 * common mix-ups (major ↔ minor, diminished → minor, maj7 ↔ 7, m7 ↔ m7♭5). In a minor
 * key the V chord avoids the other V (natural v / harmonic V), which would be
 * arguable rather than wrong.
 */
export function alternateQuality(c: DiatonicChord): Quality {
  const minorV = c.key.mode === 'minor' && c.degree === 4;
  switch (c.quality) {
    case 'maj':
      return minorV ? 'dim' : 'min';
    case 'min':
      return minorV ? 'dim' : 'maj';
    case 'dim':
      return 'min';
    case 'aug':
      return 'maj';
    case 'maj7':
      return '7';
    case '7':
      return minorV ? 'm7b5' : 'maj7';
    case 'm7':
      return minorV ? 'm7b5' : '7';
    case 'm7b5':
      return 'm7';
    case 'dim7':
      return 'm7b5';
  }
}

/**
 * Options for "what chord is on the Nth degree?": a 2 × 2 grid of {right root, a
 * plausible wrong root} × {right quality, a plausible wrong quality}. Knowing only the
 * root, or only the quality, leaves two candidates; you need both.
 */
export function pickDegreeGrid(c: DiatonicChord, rand: () => number): Chord[] {
  const roots = shuffle(forwardRootCandidates(c), rand);
  const wrongRoot = roots[0].root;
  const q2 = alternateQuality(c);
  return [buildChord(c.root, q2), buildChord(wrongRoot, c.quality), buildChord(wrongRoot, q2)];
}

export function generateNameChordQuestion(
  cfg: PracticeConfig,
  o: NameChordOptions,
): NameChordQuestion | null {
  const dirs = nameChordDirections(cfg);
  const cands: NameChordQuestion[] = [];
  for (const degree of askableDegrees(cfg)) {
    const chord = diatonicChord(cfg.key, degree, cfg.sevenths, o.harmony);
    for (const direction of dirs) {
      cands.push({ direction, chord, options: [], answer: '' });
    }
  }
  if (!cands.length) return null;
  const prev = o.previous as NameChordQuestion | null | undefined;
  // Never the same chord twice in a row (in either direction) when there's a choice.
  const pool =
    prev && cands.length > 1 ? cands.filter((c) => c.chord.degree !== prev.chord?.degree) : cands;
  const pick = weightedPick(
    pool.length ? pool : cands,
    (c) => (o.itemWeight ? o.itemWeight(nameChordItem(c)) : 1),
    o.rand,
  );
  const c = pick.chord;
  let answer: string;
  let wrong: string[];
  if (pick.direction === 'forward') {
    answer = chordSymbol(c, o.symbol);
    wrong = pickForward(c, o.rand).map((r) => chordSymbol(buildChord(r, c.quality), o.symbol));
  } else if (pick.direction === 'degree') {
    answer = chordSymbol(c, o.symbol);
    wrong = pickDegreeGrid(c, o.rand).map((x) => chordSymbol(x, o.symbol));
  } else {
    answer = chordNumeral(c, o.numeral);
    wrong = pickReverse(c, o.numeral, o.rand);
  }
  return {
    direction: pick.direction,
    chord: c,
    answer,
    options: shuffle([answer, ...wrong], o.rand),
  };
}
