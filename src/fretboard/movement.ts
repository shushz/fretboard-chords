import { type Voicing, averageFret } from './voicings';

/**
 * Total fret movement between two voicings. On the same string set this is the sum of
 * per-string fret differences; otherwise it falls back to the difference of average
 * frets times the note count.
 */
export function movement(a: Voicing, b: Voicing): number {
  if (a.stringSet === b.stringSet && a.notes.length === b.notes.length) {
    let sum = 0;
    for (const na of a.notes) {
      const nb = b.notes.find((n) => n.string === na.string);
      if (!nb) return Math.abs(averageFret(a) - averageFret(b)) * a.notes.length;
      sum += Math.abs(na.fret - nb.fret);
    }
    return sum;
  }
  return Math.abs(averageFret(a) - averageFret(b)) * Math.max(a.notes.length, b.notes.length);
}

/** Voicings among `candidates` with minimal movement from `from` (ties all returned). */
export function smoothestVoicings(from: Voicing, candidates: readonly Voicing[]): Voicing[] {
  if (candidates.length === 0) return [];
  const scored = candidates.map((v) => ({ v, m: movement(from, v) }));
  const min = Math.min(...scored.map((s) => s.m));
  return scored.filter((s) => s.m === min).map((s) => s.v);
}

/**
 * The next (direction 1) or previous (-1) shape of the same chord on the same string
 * set: the voicing whose average fret is the closest one strictly above/below.
 * `all` should be the full-neck enumeration for the chord and string set.
 */
export function adjacentShape(
  current: Voicing,
  all: readonly Voicing[],
  direction: 1 | -1,
): Voicing | null {
  const c = averageFret(current);
  let best: Voicing | null = null;
  for (const v of all) {
    if (v.stringSet !== current.stringSet) continue;
    const d = (averageFret(v) - c) * direction;
    if (d <= 0) continue;
    if (!best || d < (averageFret(best) - c) * direction) best = v;
  }
  return best;
}
