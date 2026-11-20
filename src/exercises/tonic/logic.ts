/** Mode 2 — From the tonic: find a target degree near a shown I/i voicing (pure). */
import {
  CORE_DEGREES,
  type DegreeIndex,
  type DiatonicChord,
  diatonicChord,
} from '../../theory/chords';
import { keyToAscii } from '../../theory/keys';
import { type Region, stringsOf } from '../../fretboard/regions';
import type { StringNum } from '../../fretboard/tuning';
import { type Voicing, fretted, matchVoicing, voicingsInRegion } from '../../fretboard/voicings';
import { smoothestVoicings } from '../../fretboard/movement';
import type { Item } from '../../progress/types';
import { type PracticeConfig, stringSetWeight } from '../config';
import type { GenerateOptions } from '../find/logic';
import { weightedPick } from '../session';
import type { Taps } from '../taps';

export interface TonicQuestion {
  tonic: DiatonicChord;
  tonicVoicing: Voicing;
  target: DiatonicChord;
  region: Region;
  valid: Voicing[];
  /** Valid voicings with minimal total movement from the tonic voicing. */
  smooth: Voicing[];
}

export function tonicItem(q: TonicQuestion): Item {
  return {
    mode: 'fromTonic',
    key: keyToAscii(q.target.key),
    degree: q.target.degree,
    quality: q.target.quality,
    stringSet: q.region.stringSet,
    inversion: q.tonicVoicing.inversion,
    anchor: null,
  };
}

export function targetDegrees(cfg: PracticeConfig): DegreeIndex[] {
  const d = cfg.degrees.filter((x) => x !== 0);
  return d.length ? d : CORE_DEGREES[cfg.key.mode].filter((x) => x !== 0);
}

export function generateTonicQuestion(
  cfg: PracticeConfig,
  o: GenerateOptions,
): TonicQuestion | null {
  const tonic = diatonicChord(cfg.key, 0, cfg.sevenths, o.harmony);
  const cands: { q: TonicQuestion; item: Item }[] = [];
  const prev = o.previous as TonicQuestion | null | undefined;
  for (const stringSet of cfg.stringSets) {
    const region: Region = { stringSet, window: cfg.window };
    const tonics = voicingsInRegion(tonic, region, o.voicing);
    if (!tonics.length) continue;
    for (const degree of targetDegrees(cfg)) {
      const target = diatonicChord(cfg.key, degree, cfg.sevenths, o.harmony);
      const valid = voicingsInRegion(target, region, o.voicing);
      if (!valid.length) continue;
      for (const tv of tonics) {
        const q: TonicQuestion = {
          tonic,
          tonicVoicing: tv,
          target,
          region,
          valid,
          smooth: smoothestVoicings(tv, valid),
        };
        cands.push({ q, item: tonicItem(q) });
      }
    }
  }
  if (!cands.length) return null;
  const pool =
    prev && cands.length > 1
      ? cands.filter(
          (c) =>
            !(
              c.q.target.degree === prev.target?.degree &&
              c.q.region.stringSet === prev.region?.stringSet
            ),
        )
      : cands;
  return weightedPick(
    pool.length ? pool : cands,
    (c) => stringSetWeight(c.q.region.stringSet) * (o.itemWeight ? o.itemWeight(c.item) : 1),
    o.rand,
  ).q;
}

export function tonicRequiredStrings(q: TonicQuestion): StringNum[] {
  return stringsOf(q.region.stringSet);
}

export function gradeTonic(
  q: TonicQuestion,
  taps: Taps,
): { correct: boolean; matched: Voicing | null; smooth: boolean } {
  const strings = tonicRequiredStrings(q);
  if (!strings.every((s) => taps.has(s))) return { correct: false, matched: null, smooth: false };
  const matched = matchVoicing(
    strings.map((s) => fretted(s, taps.get(s)!)),
    q.valid,
  );
  return { correct: !!matched, matched, smooth: !!matched && q.smooth.includes(matched) };
}
