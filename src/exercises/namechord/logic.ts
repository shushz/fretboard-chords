/** Mode 6 — Name the chord (multiple choice, both directions). Pure. */
import {
  type DegreeIndex,
  type DiatonicChord,
  DEGREES,
  type NumeralOptions,
  type SymbolOptions,
  buildChord,
  chordNumeral,
  chordSymbol,
  diatonicChord,
  triadOf,
} from '../../theory/chords';
import type { HarmonyOptions } from '../../theory/chords';
import { keyToAscii, relativeKey } from '../../theory/keys';
import { type Note, note, pitchClass } from '../../theory/notes';
import type { Item } from '../../progress/types';
import type { PracticeConfig } from '../config';
import { weightedPick } from '../session';

export interface NameChordQuestion {
  direction: 'forward' | 'reverse';
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

/** Plausible wrong chord names for "what is degree d?". */
export function forwardDistractors(
  c: DiatonicChord,
  sevenths: boolean,
  o: Pick<NameChordOptions, 'harmony' | 'symbol'>,
): string[] {
  const sym = (x: Parameters<typeof chordSymbol>[0]) => chordSymbol(x, o.symbol);
  const out: string[] = [];
  const enh = enharmonic(c.root);
  if (enh) out.push(sym(buildChord(enh, c.quality))); // enharmonic misspelling, e.g. G♯m for A♭m
  const tri = triadOf(c.quality);
  const flipped = sevenths
    ? c.quality === 'm7'
      ? '7'
      : c.quality === '7'
        ? 'm7'
        : c.quality === 'maj7'
          ? 'm7'
          : 'm7'
    : tri === 'maj'
      ? 'min'
      : 'maj';
  out.push(sym(buildChord(c.root, flipped))); // right root, wrong quality
  for (const d of [1, -1, 2] as const) {
    const n = diatonicChord(
      c.key,
      ((((c.degree + d) % 7) + 7) % 7) as DegreeIndex,
      sevenths,
      o.harmony,
    );
    out.push(sym(n)); // a neighbouring degree
  }
  // relative-key confusion: same degree in the relative major/minor
  out.push(sym(diatonicChord(relativeKey(c.key), c.degree, sevenths, o.harmony)));
  return out;
}

export function generateNameChordQuestion(
  cfg: PracticeConfig,
  o: NameChordOptions,
): NameChordQuestion | null {
  const dirs: ('forward' | 'reverse')[] =
    cfg.variant === 'forward'
      ? ['forward']
      : cfg.variant === 'reverse'
        ? ['reverse']
        : ['forward', 'reverse'];
  const cands: NameChordQuestion[] = [];
  for (const degree of cfg.degrees) {
    const chord = diatonicChord(cfg.key, degree, cfg.sevenths, o.harmony);
    for (const direction of dirs) {
      cands.push({ direction, chord, options: [], answer: '' });
    }
  }
  if (!cands.length) return null;
  const prev = o.previous as NameChordQuestion | null | undefined;
  const pool =
    prev && cands.length > 1
      ? cands.filter(
          (c) => !(c.chord.degree === prev.chord?.degree && c.direction === prev.direction),
        )
      : cands;
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
    wrong = forwardDistractors(c, cfg.sevenths, o);
  } else {
    answer = chordNumeral(c, o.numeral);
    const others = DEGREES.filter((d) => d !== c.degree).map((d) =>
      chordNumeral(diatonicChord(c.key, d, cfg.sevenths, o.harmony), o.numeral),
    );
    // case-flipped numeral (iv ↔ IV) is a classic mistake
    const flipped = answer === answer.toLowerCase() ? answer.toUpperCase() : answer.toLowerCase();
    wrong = [flipped, ...shuffle(others, o.rand)];
  }
  const uniq = [...new Set(wrong.filter((w) => w !== answer))];
  // keep the first (most instructive) distractor, then fill randomly up to 3
  const chosen = [uniq[0], ...shuffle(uniq.slice(1), o.rand)].filter(Boolean).slice(0, 3);
  return {
    direction: pick.direction,
    chord: c,
    answer,
    options: shuffle([answer, ...chosen], o.rand),
  };
}
