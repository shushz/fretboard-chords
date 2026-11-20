import { mod } from '../theory/notes';

/** String number: 1 = high E4 … 6 = low E2. */
export type StringNum = 1 | 2 | 3 | 4 | 5 | 6;
export const STRINGS: readonly StringNum[] = [1, 2, 3, 4, 5, 6];

/** MIDI note of each open string, standard tuning. */
export const STANDARD_TUNING: Record<StringNum, number> = {
  1: 64,
  2: 59,
  3: 55,
  4: 50,
  5: 45,
  6: 40,
};

export function midiAt(string: StringNum, fret: number): number {
  return STANDARD_TUNING[string] + fret;
}

export function pitchClassAt(string: StringNum, fret: number): number {
  return mod(midiAt(string, fret), 12);
}

/** Frets (0..maxFret) on `string` where pitch class `pc` sounds. */
export function fretsForPitchClass(string: StringNum, pc: number, maxFret: number): number[] {
  const first = mod(pc - STANDARD_TUNING[string], 12);
  const out: number[] = [];
  for (let f = first; f <= maxFret; f += 12) out.push(f);
  return out;
}

/** Fret dots: single at 3,5,7,9,15,17,19,21; double at 12 (and 24). */
export const FRET_MARKERS: readonly number[] = [3, 5, 7, 9, 12, 15, 17, 19, 21];
export function isDoubleMarker(fret: number): boolean {
  return fret === 12 || fret === 24;
}

export const FRET_RANGES = [15, 17, 19, 22] as const;
export type FretRange = (typeof FRET_RANGES)[number];
