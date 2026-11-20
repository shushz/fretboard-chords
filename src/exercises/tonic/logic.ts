/** Mode 2 — From the tonic: find a target degree near a shown I/i voicing (pure). */
import {
  CORE_DEGREES,
  type DegreeIndex,
  type DiatonicChord,
  diatonicChord,
} from '../../theory/chords';
import { keyToAscii } from '../../theory/keys';
import { type FretWindow, type Region, stringsOf } from '../../fretboard/regions';
import type { StringNum } from '../../fretboard/tuning';
import {
  type Voicing,
  enumerateVoicings,
  fretted,
  matchVoicing,
  voicingId,
} from '../../fretboard/voicings';
import { smoothestVoicings } from '../../fretboard/movement';
import type { Item } from '../../progress/types';
import { type PracticeConfig, stringSetWeight } from '../config';
import type { GenerateOptions } from '../find/logic';
import { weightedPick } from '../session';
import { fittingRegion } from '../region';
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

/** Where the shown tonic shape comes from (`cfg.variant`). Default: anywhere on the neck. */
export type TonicPlacement = 'neck' | 'window';

export function tonicPlacement(cfg: PracticeConfig): TonicPlacement {
  return cfg.variant === 'window' ? 'window' : 'neck';
}

/** A window of `width` frets around a voicing (widened to fit it), kept on the neck. */
export function windowAround(v: Voicing, width: number, maxFret: number): FretWindow {
  const w = Math.max(width, v.span);
  const start = v.position - Math.floor((w - v.span) / 2);
  return { start: Math.max(0, Math.min(maxFret - w + 1, start)), width: w };
}

/** Two questions are the same when they show the same tonic shape and ask for the same chord. */
export function sameTonicQuestion(a: TonicQuestion, b: TonicQuestion): boolean {
  return (
    a.target.degree === b.target.degree && voicingId(a.tonicVoicing) === voicingId(b.tonicVoicing)
  );
}

export function generateTonicQuestion(
  cfg: PracticeConfig,
  o: GenerateOptions,
): TonicQuestion | null {
  const tonic = diatonicChord(cfg.key, 0, cfg.sevenths, o.harmony);
  const targets = targetDegrees(cfg).map((d) => diatonicChord(cfg.key, d, cfg.sevenths, o.harmony));
  const placement = tonicPlacement(cfg);
  const cands: { q: TonicQuestion; item: Item }[] = [];
  for (const stringSet of cfg.stringSets) {
    // Tonic shapes with the region each question uses.
    // Window placement: tonic shapes inside the (minimally widened) session window.
    // Neck placement: any tonic shape, with a window of the usual width around it.
    let shapes: { tv: Voicing; window: FretWindow }[];
    if (placement === 'window') {
      const fit = fittingRegion([tonic], stringSet, cfg.window, o.voicing);
      shapes = fit ? fit.valid[0].map((tv) => ({ tv, window: fit.region.window })) : [];
    } else {
      shapes = enumerateVoicings(tonic, stringSet, o.voicing).map((tv) => ({
        tv,
        window: windowAround(tv, cfg.window.width, o.voicing.maxFret),
      }));
    }
    for (const { tv, window } of shapes) {
      for (const target of targets) {
        // Widen (keeping the tonic inside) if the target has no shape near it.
        const fit = fittingRegion([target], stringSet, window, o.voicing);
        if (!fit) continue;
        const region = fit.region;
        const valid = fit.valid[0];
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
  const prev = o.previous as TonicQuestion | null | undefined;
  let pool = cands;
  if (prev?.tonicVoicing && prev.target) {
    // Prefer a new tonic shape *and* a new target; at minimum never repeat the question.
    const fresh = cands.filter(
      (c) =>
        c.q.target.degree !== prev.target.degree &&
        voicingId(c.q.tonicVoicing) !== voicingId(prev.tonicVoicing),
    );
    const different = cands.filter((c) => !sameTonicQuestion(c.q, prev));
    pool = fresh.length ? fresh : different.length ? different : cands;
  }
  return weightedPick(
    pool,
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
