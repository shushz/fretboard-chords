/** Mode 1 — Find the chord: question generation and grading (pure). */
import { type DiatonicChord, diatonicChord } from '../../theory/chords';
import type { HarmonyOptions } from '../../theory/chords';
import { keyToAscii } from '../../theory/keys';
import { type Region, stringsOf, windowEnd } from '../../fretboard/regions';
import { type StringNum, fretsForPitchClass } from '../../fretboard/tuning';
import { pitchClass } from '../../theory/notes';
import {
  type FrettedNote,
  type Voicing,
  type VoicingOptions,
  fretted,
  matchVoicing,
} from '../../fretboard/voicings';
import type { Item } from '../../progress/types';
import { type PracticeConfig, stringSetWeight } from '../config';
import { weightedPick } from '../session';
import { fittingRegion } from '../region';
import { type Taps, applyTapTo } from '../taps';

export interface FindQuestion {
  chord: DiatonicChord;
  region: Region;
  /** Every valid voicing in the region. */
  valid: Voicing[];
  /** String on which the root anchor must be tapped (anchor = required), else null. */
  anchorString: 5 | 6 | null;
}

export type { Taps };

export interface GenerateOptions {
  harmony: HarmonyOptions;
  voicing: VoicingOptions & { allowOutside?: boolean };
  rand: () => number;
  /** Optional weight per candidate item (spaced repetition hook). */
  itemWeight?: (item: Item) => number;
  /** Previous question of the session (mode-specific shape). */
  previous?: unknown;
}

export function findItem(q: FindQuestion, mode: Item['mode'] = 'find'): Item {
  return {
    mode,
    key: keyToAscii(q.chord.key),
    degree: q.chord.degree,
    quality: q.chord.quality,
    stringSet: q.region.stringSet,
    inversion: '*',
    anchor: q.anchorString,
  };
}

/** Anchor strings usable below a string set, given the allowed ones. */
export function anchorCandidates(region: Region, allowed: readonly (5 | 6)[]): (5 | 6)[] {
  const lowest = Math.max(...stringsOf(region.stringSet));
  return allowed.filter((s) => s > lowest);
}

/** Root frets on `s` within window ± 2 (SPEC §4.1). */
export function anchorFrets(
  q: Pick<FindQuestion, 'chord' | 'region'>,
  s: 5 | 6,
  maxFret: number,
): number[] {
  const w = q.region.window;
  return fretsForPitchClass(s, pitchClass(q.chord.root), maxFret).filter(
    (f) => f >= w.start - 2 && f <= windowEnd(w) + 2,
  );
}

export function generateFindQuestion(cfg: PracticeConfig, o: GenerateOptions): FindQuestion | null {
  type Cand = { q: FindQuestion; item: Item };
  const cands: Cand[] = [];
  for (const degree of cfg.degrees) {
    const chord = diatonicChord(cfg.key, degree, cfg.sevenths, o.harmony);
    for (const stringSet of cfg.stringSets) {
      const fit = fittingRegion([chord], stringSet, cfg.window, o.voicing);
      if (!fit) continue;
      const region = fit.region;
      const valid = fit.valid[0];
      let anchorOpts: (5 | 6 | null)[] = [null];
      if (cfg.tapRoot) {
        const a = anchorCandidates(region, cfg.anchorStrings).filter(
          (s) => anchorFrets({ chord, region }, s, o.voicing.maxFret).length > 0,
        );
        if (a.length === 0) continue;
        anchorOpts = a;
      }
      for (const anchorString of anchorOpts) {
        const q: FindQuestion = { chord, region, valid, anchorString };
        cands.push({ q, item: findItem(q) });
      }
    }
  }
  if (cands.length === 0) return null;
  const prev = o.previous as FindQuestion | null | undefined;
  const pool =
    prev && cands.length > 1
      ? cands.filter(
          (c) =>
            !(
              c.q.chord.degree === prev.chord.degree &&
              c.q.region.stringSet === prev.region.stringSet
            ),
        )
      : cands;
  const pick = weightedPick(
    pool.length ? pool : cands,
    (c) => stringSetWeight(c.q.region.stringSet) * (o.itemWeight ? o.itemWeight(c.item) : 1),
    o.rand,
  );
  return pick.q;
}

/** Strings the user must fill before grading. */
export function requiredStrings(q: FindQuestion): StringNum[] {
  const s = stringsOf(q.region.stringSet);
  return q.anchorString ? [...s, q.anchorString] : s;
}

/** Apply a tap: replaces the note on that string, or removes it if tapped again. */
export function applyTap(q: FindQuestion, taps: Taps, string: StringNum, fret: number): Taps {
  return applyTapTo(requiredStrings(q), taps, string, fret);
}

export function isComplete(q: FindQuestion, taps: Taps): boolean {
  return requiredStrings(q).every((s) => taps.has(s));
}

export interface FindGrade {
  correct: boolean;
  matched: Voicing | null;
  /** null when no anchor was required. */
  anchorOk: boolean | null;
  /** Tapped notes that aren't part of a correct answer. */
  wrong: FrettedNote[];
}

export function gradeFind(q: FindQuestion, taps: Taps, maxFret: number): FindGrade {
  const setStrings = stringsOf(q.region.stringSet);
  const triad = setStrings.filter((s) => taps.has(s)).map((s) => fretted(s, taps.get(s)!));
  const matched = triad.length === setStrings.length ? matchVoicing(triad, q.valid) : null;
  let anchorOk: boolean | null = null;
  const wrong: FrettedNote[] = matched ? [] : triad;
  if (q.anchorString) {
    const f = taps.get(q.anchorString);
    anchorOk = f !== undefined && anchorFrets(q, q.anchorString, maxFret).includes(f);
    if (!anchorOk && f !== undefined) wrong.push(fretted(q.anchorString, f));
  }
  return { correct: matched !== null && anchorOk !== false, matched, anchorOk, wrong };
}
