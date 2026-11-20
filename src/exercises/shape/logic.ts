/** Mode 3 — Next / previous shape of the same chord on the same string set (pure). */
import { type DiatonicChord, diatonicChord } from '../../theory/chords';
import { keyToAscii } from '../../theory/keys';
import { type FretWindow, type StringSetId, stringsOf } from '../../fretboard/regions';
import type { StringNum } from '../../fretboard/tuning';
import {
  type Voicing,
  enumerateVoicings,
  fitsWindow,
  fretted,
  matchVoicing,
} from '../../fretboard/voicings';
import { adjacentShape } from '../../fretboard/movement';
import type { Item } from '../../progress/types';
import { type PracticeConfig, stringSetWeight } from '../config';
import type { GenerateOptions } from '../find/logic';
import { weightedPick } from '../session';
import type { Taps } from '../taps';

export type ShapeDirection = 'up' | 'down';

export interface ShapeQuestion {
  chord: DiatonicChord;
  stringSet: StringSetId;
  shown: Voicing;
  target: Voicing;
  direction: ShapeDirection;
}

export function shapeItem(q: ShapeQuestion): Item {
  return {
    mode: 'nextShape',
    key: keyToAscii(q.chord.key),
    degree: q.chord.degree,
    quality: q.chord.quality,
    stringSet: q.stringSet,
    inversion: q.shown.inversion,
    anchor: null,
    variant: q.direction,
  };
}

/** `cfg.variant`: 'up', 'down' or anything else for both. */
export function directions(cfg: PracticeConfig): ShapeDirection[] {
  return cfg.variant === 'up' ? ['up'] : cfg.variant === 'down' ? ['down'] : ['up', 'down'];
}

export function generateShapeQuestion(
  cfg: PracticeConfig,
  o: GenerateOptions,
): ShapeQuestion | null {
  const cands: { q: ShapeQuestion; item: Item }[] = [];
  for (const degree of cfg.degrees) {
    const chord = diatonicChord(cfg.key, degree, cfg.sevenths, o.harmony);
    for (const stringSet of cfg.stringSets) {
      const all = enumerateVoicings(chord, stringSet, o.voicing);
      for (const shown of all.filter((v) => fitsWindow(v, cfg.window, o.voicing.allowOutside))) {
        for (const direction of directions(cfg)) {
          const target = adjacentShape(shown, all, direction === 'up' ? 1 : -1);
          if (!target) continue;
          const q: ShapeQuestion = { chord, stringSet, shown, target, direction };
          cands.push({ q, item: shapeItem(q) });
        }
      }
    }
  }
  if (!cands.length) return null;
  const prev = o.previous as ShapeQuestion | null | undefined;
  const pool =
    prev && cands.length > 1
      ? cands.filter(
          (c) => !(c.q.chord.degree === prev.chord?.degree && c.q.stringSet === prev.stringSet),
        )
      : cands;
  return weightedPick(
    pool.length ? pool : cands,
    (c) => stringSetWeight(c.q.stringSet) * (o.itemWeight ? o.itemWeight(c.item) : 1),
    o.rand,
  ).q;
}

/** Frets the board must show: both shapes. */
export function shapeView(q: ShapeQuestion): FretWindow {
  const lo = Math.min(q.shown.position, q.target.position);
  const hi = Math.max(q.shown.highestFret, q.target.highestFret);
  return { start: lo, width: hi - lo + 1 };
}

export function shapeRequiredStrings(q: ShapeQuestion): StringNum[] {
  return stringsOf(q.stringSet);
}

export function gradeShape(
  q: ShapeQuestion,
  taps: Taps,
): { correct: boolean; matched: Voicing | null } {
  const strings = shapeRequiredStrings(q);
  if (!strings.every((s) => taps.has(s))) return { correct: false, matched: null };
  const matched = matchVoicing(
    strings.map((s) => fretted(s, taps.get(s)!)),
    [q.target],
  );
  return { correct: !!matched, matched };
}
