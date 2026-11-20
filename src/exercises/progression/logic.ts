/** Mode 5 — Progression walk (pure). */
import { type DegreeIndex, type DiatonicChord, diatonicChord } from '../../theory/chords';
import { type Mode, keyToAscii } from '../../theory/keys';
import { type Region, stringsOf } from '../../fretboard/regions';
import type { StringNum } from '../../fretboard/tuning';
import { type Voicing, fretted, matchVoicing } from '../../fretboard/voicings';
import { smoothestVoicings } from '../../fretboard/movement';
import type { Item } from '../../progress/types';
import { type PracticeConfig, stringSetWeight } from '../config';
import type { GenerateOptions } from '../find/logic';
import { weightedPick } from '../session';
import { fittingRegion } from '../region';
export { widenedWindows } from '../region';
import type { Taps } from '../taps';

export interface Progression {
  id: string;
  mode: Mode;
  degrees: DegreeIndex[];
}

/** Built-in progressions (SPEC §5.5). Labels are derived from the key (numeral style prefs). */
export const PROGRESSIONS: readonly Progression[] = [
  { id: 'I-vi-ii-V', mode: 'major', degrees: [0, 5, 1, 4] },
  { id: 'I-IV-V-I', mode: 'major', degrees: [0, 3, 4, 0] },
  { id: 'ii-V-I', mode: 'major', degrees: [1, 4, 0] },
  { id: 'I-V-vi-IV', mode: 'major', degrees: [0, 4, 5, 3] },
  { id: 'vi-IV-I-V', mode: 'major', degrees: [5, 3, 0, 4] },
  { id: 'i-iv-V-i', mode: 'minor', degrees: [0, 3, 4, 0] },
  { id: 'i-bVI-bVII-i', mode: 'minor', degrees: [0, 5, 6, 0] },
  { id: 'i-bVII-bVI-V', mode: 'minor', degrees: [0, 6, 5, 4] },
  { id: 'iio-V-i', mode: 'minor', degrees: [1, 4, 0] },
  { id: 'i-iv-bVII-bIII', mode: 'minor', degrees: [0, 3, 6, 2] },
];

export function progressionsFor(mode: Mode): Progression[] {
  return PROGRESSIONS.filter((p) => p.mode === mode);
}

export interface ProgressionQuestion {
  progression: Progression;
  chords: DiatonicChord[];
  region: Region;
  /** Valid voicings per step. */
  valid: Voicing[][];
}

export function stepItem(q: ProgressionQuestion, step: number): Item {
  const c = q.chords[step];
  return {
    mode: 'progression',
    key: keyToAscii(c.key),
    degree: c.degree,
    quality: c.quality,
    stringSet: q.region.stringSet,
    inversion: '*',
    anchor: null,
  };
}

/** `cfg.variant` = a progression id, or anything else for "random". */
export function generateProgressionQuestion(
  cfg: PracticeConfig,
  o: GenerateOptions,
): ProgressionQuestion | null {
  const all = progressionsFor(cfg.key.mode);
  const chosen = all.filter((p) => p.id === cfg.variant);
  const progs = chosen.length ? chosen : all;
  const cands: ProgressionQuestion[] = [];
  for (const progression of progs) {
    const chords = progression.degrees.map((d) =>
      diatonicChord(cfg.key, d, cfg.sevenths, o.harmony),
    );
    for (const stringSet of cfg.stringSets) {
      // A short window can miss a chord of the progression; widen it minimally.
      const fit = fittingRegion(chords, stringSet, cfg.window, o.voicing);
      if (fit) cands.push({ progression, chords, region: fit.region, valid: fit.valid });
    }
  }
  if (!cands.length) return null;
  const prev = o.previous as ProgressionQuestion | null | undefined;
  const pool =
    prev && cands.length > 1
      ? cands.filter((c) => c.progression.id !== prev.progression?.id)
      : cands;
  return weightedPick(
    pool.length ? pool : cands,
    (c) => stringSetWeight(c.region.stringSet),
    o.rand,
  );
}

export function stepStrings(q: ProgressionQuestion): StringNum[] {
  return stringsOf(q.region.stringSet);
}

export interface StepGrade {
  correct: boolean;
  matched: Voicing | null;
  /** Minimal-movement voicings from the previous chord (empty for the first step). */
  smoothest: Voicing[];
  smooth: boolean;
}

export function gradeStep(
  q: ProgressionQuestion,
  step: number,
  taps: Taps,
  previous: Voicing | null,
): StepGrade {
  const strings = stepStrings(q);
  const valid = q.valid[step];
  const smoothest = previous ? smoothestVoicings(previous, valid) : [];
  if (!strings.every((s) => taps.has(s)))
    return { correct: false, matched: null, smoothest, smooth: false };
  const matched = matchVoicing(
    strings.map((s) => fretted(s, taps.get(s)!)),
    valid,
  );
  return {
    correct: !!matched,
    matched,
    smoothest,
    smooth: !!matched && smoothest.includes(matched),
  };
}

/** Time allowed per chord in tempo mode. */
export function beatLimitMs(bpm: number, beats: number): number {
  return Math.round((beats * 60_000) / bpm);
}
