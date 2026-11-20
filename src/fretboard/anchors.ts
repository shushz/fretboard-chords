import type { Chord } from '../theory/chords';
import { pitchClass } from '../theory/notes';
import type { FretWindow } from './regions';
import { type StringNum, fretsForPitchClass } from './tuning';
import { type Voicing, type VoicingNote, averageFret, fretted } from './voicings';

export type AnchorString = 5 | 6;

export interface Anchor {
  readonly note: VoicingNote;
  /** Fret distance from the voicing's average fret. */
  readonly distance: number;
}

/** The anchor string must lie below the voicing's string set. */
export function canAnchor(v: Voicing, s: AnchorString): boolean {
  return v.notes.every((n) => n.string < s);
}

/**
 * Nearest root of `chord` on string `s` to voicing `v` (SPEC §4.1). With `window`,
 * the anchor must lie within the window ± `slack` frets (default 2). Ties prefer the
 * lower fret.
 */
export function nearestAnchor(
  chord: Chord,
  v: Voicing,
  s: AnchorString,
  maxFret: number,
  window?: FretWindow,
  slack = 2,
): Anchor | null {
  if (!canAnchor(v, s)) return null;
  const root = chord.tones[0];
  const center = averageFret(v);
  let best: Anchor | null = null;
  for (const f of fretsForPitchClass(s as StringNum, pitchClass(root.note), maxFret)) {
    if (window && (f < window.start - slack || f > window.start + window.width - 1 + slack)) {
      continue;
    }
    const d = Math.abs(f - center);
    if (!best || d < best.distance) {
      best = { note: { ...fretted(s as StringNum, f), tone: root, role: 'R' }, distance: d };
    }
  }
  return best;
}

export interface AnchoredVoicing {
  readonly voicing: Voicing;
  readonly anchor: Anchor;
}

/** Pair each voicing with its nearest anchor root on the given strings. */
export function pairAnchors(
  chord: Chord,
  voicings: readonly Voicing[],
  strings: readonly AnchorString[],
  maxFret: number,
  window?: FretWindow,
): AnchoredVoicing[] {
  const out: AnchoredVoicing[] = [];
  for (const v of voicings) {
    for (const s of strings) {
      const a = nearestAnchor(chord, v, s, maxFret, window);
      if (a) out.push({ voicing: v, anchor: a });
    }
  }
  return out;
}
