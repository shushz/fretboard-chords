/** Mode 4 — Name the tones (label each string's role) and the reverse "tap the b3 of V on string 2". */
import { type Chord, type DiatonicChord, diatonicChord, isSeventh } from '../../theory/chords';
import { keyToAscii } from '../../theory/keys';
import type { Role } from '../../theory/roles';
import { type FretWindow, type Region, stringsOf, windowEnd } from '../../fretboard/regions';
import { type StringNum, fretsForPitchClass, pitchClassAt } from '../../fretboard/tuning';
import { type Voicing } from '../../fretboard/voicings';
import { pitchClass } from '../../theory/notes';
import type { Item } from '../../progress/types';
import { type PracticeConfig, stringSetWeight } from '../config';
import type { GenerateOptions } from '../find/logic';
import { weightedPick } from '../session';
import { fittingRegion } from '../region';

export interface LabelQuestion {
  kind: 'label';
  chord: DiatonicChord;
  region: Region;
  voicing: Voicing;
}

export interface TapRoleQuestion {
  kind: 'tap';
  chord: DiatonicChord;
  role: Role;
  string: StringNum;
  window: FretWindow;
}

export type TonesQuestion = LabelQuestion | TapRoleQuestion;

export function tonesItem(q: TonesQuestion): Item {
  const base = {
    mode: 'nameTones' as const,
    key: keyToAscii(q.chord.key),
    degree: q.chord.degree,
    quality: q.chord.quality,
    anchor: null,
  };
  if (q.kind === 'label') {
    return {
      ...base,
      stringSet: q.region.stringSet,
      inversion: q.voicing.inversion,
      variant: 'label',
    };
  }
  return { ...base, stringSet: '*', inversion: '*', variant: `tap ${q.role} s${q.string}` };
}

/** Role buttons offered for a chord (diatonic triads/sevenths). */
export function roleChoices(chord: Chord): Role[] {
  return isSeventh(chord.quality)
    ? ['R', 'b3', '3', 'b5', '5', 'b7', '7']
    : ['R', 'b3', '3', 'b5', '5'];
}

export function variants(cfg: PracticeConfig): ('label' | 'tap')[] {
  return cfg.variant === 'label' ? ['label'] : cfg.variant === 'tap' ? ['tap'] : ['label', 'tap'];
}

/** Frets on `s` within the window where the chord tone with `role` sounds. */
export function roleFrets(
  chord: Chord,
  role: Role,
  s: StringNum,
  w: FretWindow,
  maxFret: number,
): number[] {
  const tone = chord.tones.find((t) => t.role === role);
  if (!tone) return [];
  return fretsForPitchClass(s, pitchClass(tone.note), maxFret).filter(
    (f) => f >= w.start && f <= windowEnd(w),
  );
}

export function generateTonesQuestion(
  cfg: PracticeConfig,
  o: GenerateOptions,
): TonesQuestion | null {
  const cands: { q: TonesQuestion; item: Item; w: number }[] = [];
  const allStrings = [...new Set(cfg.stringSets.flatMap((s) => stringsOf(s)))];
  for (const degree of cfg.degrees) {
    const chord = diatonicChord(cfg.key, degree, cfg.sevenths, o.harmony);
    for (const v of variants(cfg)) {
      if (v === 'label') {
        for (const stringSet of cfg.stringSets) {
          const fit = fittingRegion([chord], stringSet, cfg.window, o.voicing);
          if (!fit) continue;
          const region = fit.region;
          for (const voicing of fit.valid[0]) {
            const q: LabelQuestion = { kind: 'label', chord, region, voicing };
            cands.push({ q, item: tonesItem(q), w: stringSetWeight(stringSet) });
          }
        }
      } else {
        for (const t of chord.tones) {
          for (const s of allStrings) {
            if (roleFrets(chord, t.role, s, cfg.window, o.voicing.maxFret).length === 0) continue;
            const q: TapRoleQuestion = {
              kind: 'tap',
              chord,
              role: t.role,
              string: s,
              window: cfg.window,
            };
            cands.push({ q, item: tonesItem(q), w: 1 });
          }
        }
      }
    }
  }
  if (!cands.length) return null;
  // Balance the two variants: weight so each variant gets ~half the picks when both are on.
  const nLabel = cands.filter((c) => c.q.kind === 'label').length;
  const nTap = cands.length - nLabel;
  const prev = o.previous as TonesQuestion | null | undefined;
  const pool =
    prev && cands.length > 1
      ? cands.filter((c) => !(c.q.kind === prev.kind && c.q.chord.degree === prev.chord.degree))
      : cands;
  return weightedPick(
    pool.length ? pool : cands,
    (c) => {
      const share = c.q.kind === 'label' ? (nLabel ? 1 / nLabel : 0) : nTap ? 1 / nTap : 0;
      return share * c.w * (o.itemWeight ? o.itemWeight(c.item) : 1);
    },
    o.rand,
  ).q;
}

/** labels: one role per voicing note, low → high string. */
export function gradeLabels(
  q: LabelQuestion,
  labels: readonly Role[],
): { correct: boolean; perNote: boolean[] } {
  const perNote = q.voicing.notes.map((n, i) => labels[i] === n.role);
  return { correct: perNote.length === labels.length && perNote.every(Boolean), perNote };
}

export function gradeTapRole(q: TapRoleQuestion, s: StringNum, fret: number): boolean {
  if (s !== q.string) return false;
  const tone = q.chord.tones.find((t) => t.role === q.role)!;
  return pitchClassAt(s, fret) === pitchClass(tone.note);
}
