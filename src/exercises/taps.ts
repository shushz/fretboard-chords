import type { StringNum } from '../fretboard/tuning';

/** Tapped answer: one fret per string. */
export type Taps = ReadonlyMap<StringNum, number>;

/** Apply a tap: replaces the note on that string, removes it if tapped again; other strings ignored. */
export function applyTapTo(
  required: readonly StringNum[],
  taps: Taps,
  s: StringNum,
  f: number,
): Taps {
  if (!required.includes(s)) return taps;
  const next = new Map(taps);
  if (next.get(s) === f) next.delete(s);
  else next.set(s, f);
  return next;
}
