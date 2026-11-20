/**
 * Regions for questions. A short fret window can miss every shape of a chord on a string
 * set (e.g. F♯m's V on strings 1–3 in frets 5–9: shapes at 4–6 and 9–10). Rather than
 * silently never asking for that chord, the window is widened minimally for that question.
 */
import type { Chord } from '../theory/chords';
import type { FretWindow, Region, StringSetId } from '../fretboard/regions';
import { type Voicing, type VoicingOptions, voicingsInRegion } from '../fretboard/voicings';

/**
 * Widen by at most this many frets. One fret is usually enough; five covers every diatonic
 * triad on every string set for any 5-fret window (unit-tested). The large cases are
 * diminished triads on strings 3–5 / 4–6 at the ends of the neck, which have only two
 * shapes per octave within a 4-fret span.
 */
export const MAX_WIDEN = 5;

/** The window itself, then windows grown by 1..maxGrow frets (towards either side). */
export function widenedWindows(w: FretWindow, maxFret: number, maxGrow: number): FretWindow[] {
  const out: FretWindow[] = [w];
  for (let g = 1; g <= maxGrow; g++) {
    for (let left = 0; left <= g; left++) {
      const start = w.start - left;
      const width = w.width + g;
      if (start < 0 || start + width - 1 > maxFret) continue;
      out.push({ start, width });
    }
  }
  return out;
}

export interface FittedRegion {
  region: Region;
  /** Valid voicings per chord, in the same order as `chords`. */
  valid: Voicing[][];
  /** True when the window had to be widened. */
  widened: boolean;
}

/**
 * The smallest widening of `window` (possibly none) in which every chord has at least one
 * voicing on `stringSet`, or null if none within `maxGrow` frets.
 */
export function fittingRegion(
  chords: readonly Chord[],
  stringSet: StringSetId,
  window: FretWindow,
  voicing: VoicingOptions & { allowOutside?: boolean },
  maxGrow = MAX_WIDEN,
): FittedRegion | null {
  for (const w of widenedWindows(window, voicing.maxFret, maxGrow)) {
    const region: Region = { stringSet, window: w };
    const valid = chords.map((c) => voicingsInRegion(c, region, voicing));
    if (valid.every((v) => v.length > 0)) return { region, valid, widened: w !== window };
  }
  return null;
}
