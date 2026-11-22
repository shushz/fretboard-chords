import type { StringNum } from './tuning';

/** A set of adjacent strings, listed high → low (e.g. [1, 2, 3]). */
export type StringSetId = '1-3' | '2-4' | '3-5' | '4-6' | '1-4' | '2-5' | '3-6';

export const TRIAD_STRING_SETS: readonly StringSetId[] = ['1-3', '2-4', '3-5', '4-6'];
export const SEVENTH_STRING_SETS: readonly StringSetId[] = ['1-4', '2-5', '3-6'];

/** Priority tiers from SPEC §4 (primary sets are used most by question selection). */
export const STRING_SET_TIER: Record<StringSetId, 'primary' | 'secondary' | 'low'> = {
  '1-3': 'primary',
  '2-4': 'primary',
  '3-5': 'secondary',
  '4-6': 'low',
  '1-4': 'primary',
  '2-5': 'primary',
  '3-6': 'secondary',
};

export function stringsOf(id: StringSetId): StringNum[] {
  const [a, b] = id.split('-').map(Number);
  const out: StringNum[] = [];
  for (let s = a; s <= b; s++) out.push(s as StringNum);
  return out;
}

export function formatStringSet(id: StringSetId): string {
  return `strings ${id.replace('-', '–')}`;
}

/** Fret window, inclusive: start..start+width-1. */
export interface FretWindow {
  start: number;
  width: number;
}

export function windowEnd(w: FretWindow): number {
  return w.start + w.width - 1;
}

/**
 * Is `fret` inside the window? Open strings (fret 0) count as inside a window that starts at
 * fret 1: "frets 1–5" is first position, open strings included.
 */
export function inWindow(fret: number, w: FretWindow): boolean {
  return (fret >= w.start || (fret === 0 && w.start === 1)) && fret <= windowEnd(w);
}

export function formatWindow(w: FretWindow): string {
  return `frets ${w.start}–${windowEnd(w)}`;
}

export interface Region {
  stringSet: StringSetId;
  window: FretWindow;
}

/** Presets offered in the setup screen. */
export const WINDOW_PRESETS: readonly FretWindow[] = [
  { start: 0, width: 5 },
  { start: 2, width: 5 },
  { start: 5, width: 5 },
  { start: 7, width: 5 },
  { start: 9, width: 5 },
  { start: 12, width: 5 },
];

/** Random window that fits inside 0..maxFret. `rand` returns [0, 1). */
export function randomWindow(width: number, maxFret: number, rand: () => number): FretWindow {
  const maxStart = Math.max(0, maxFret - width + 1);
  return { start: Math.floor(rand() * (maxStart + 1)), width };
}
