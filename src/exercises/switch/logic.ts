/** Mode 7 — Quality switch: change a chord's quality by moving exactly one tone (pure). */
import {
  type Chord,
  type DiatonicChord,
  type Quality,
  buildChord,
  diatonicChord,
} from '../../theory/chords';
import { keyToAscii } from '../../theory/keys';
import { type ChordMember, memberOf } from '../../theory/roles';
import type { Region } from '../../fretboard/regions';
import type { StringNum } from '../../fretboard/tuning';
import { type Voicing, type VoicingNote, fretted } from '../../fretboard/voicings';
import { toneForPitchClass } from '../../theory/chords';
import type { Item } from '../../progress/types';
import { type PracticeConfig, stringSetWeight } from '../config';
import type { GenerateOptions } from '../find/logic';
import { weightedPick } from '../session';
import { fittingRegion } from '../region';

export type SwitchFamily = 'core' | 'minDim' | 'majAug' | 'dom7' | 'sevenths';

export interface SwitchDef {
  from: Quality;
  to: Quality;
  /** Chord member that moves (in the source chord). */
  member: ChordMember;
  /** Fret change on the same string. */
  delta: number;
  family: SwitchFamily;
}

export const SWITCHES: readonly SwitchDef[] = [
  { from: 'maj', to: 'min', member: 'third', delta: -1, family: 'core' },
  { from: 'min', to: 'maj', member: 'third', delta: 1, family: 'core' },
  { from: 'min', to: 'dim', member: 'fifth', delta: -1, family: 'minDim' },
  { from: 'dim', to: 'min', member: 'fifth', delta: 1, family: 'minDim' },
  { from: 'maj', to: 'aug', member: 'fifth', delta: 1, family: 'majAug' },
  // Triad V → V7: the root moves down a whole step to the b7 (rootless dominant shape).
  { from: 'maj', to: '7', member: 'root', delta: -2, family: 'dom7' },
  { from: 'maj7', to: '7', member: 'seventh', delta: -1, family: 'sevenths' },
  { from: '7', to: 'maj7', member: 'seventh', delta: 1, family: 'sevenths' },
  { from: 'm7', to: 'm7b5', member: 'fifth', delta: -1, family: 'sevenths' },
  { from: 'm7b5', to: 'm7', member: 'fifth', delta: 1, family: 'sevenths' },
];

export interface SwitchExtensions {
  minDim: boolean;
  majAug: boolean;
  dom7: boolean;
}

export function enabledFamilies(sevenths: boolean, ext: SwitchExtensions): SwitchFamily[] {
  if (sevenths) return ['sevenths'];
  const f: SwitchFamily[] = ['core'];
  if (ext.minDim) f.push('minDim');
  if (ext.majAug) f.push('majAug');
  if (ext.dom7) f.push('dom7');
  return f;
}

export interface SwitchQuestion {
  source: DiatonicChord;
  target: Chord;
  def: SwitchDef;
  region: Region;
  voicing: Voicing;
  /** The note that has to move and where it goes. */
  moving: VoicingNote;
  toFret: number;
}

export function switchItem(q: SwitchQuestion): Item {
  return {
    mode: 'qualitySwitch',
    key: keyToAscii(q.source.key),
    degree: q.source.degree,
    quality: q.def.from,
    stringSet: q.region.stringSet,
    inversion: q.voicing.inversion,
    anchor: null,
    variant: `${q.def.from}>${q.def.to} s${q.moving.string}`,
  };
}

export function generateSwitchQuestion(
  cfg: PracticeConfig,
  o: GenerateOptions & { extensions: SwitchExtensions },
): SwitchQuestion | null {
  const families = enabledFamilies(cfg.sevenths, o.extensions);
  const cands: { q: SwitchQuestion; item: Item }[] = [];
  for (const degree of cfg.degrees) {
    const source = diatonicChord(cfg.key, degree, cfg.sevenths, o.harmony);
    for (const def of SWITCHES) {
      if (def.from !== source.quality || !families.includes(def.family)) continue;
      // dom7 only from the V chord (V → V7), as in SPEC §5.7
      if (def.family === 'dom7' && degree !== 4) continue;
      const target = buildChord(source.root, def.to);
      for (const stringSet of cfg.stringSets) {
        const fit = fittingRegion([source], stringSet, cfg.window, o.voicing);
        if (!fit) continue;
        const region = fit.region;
        for (const voicing of fit.valid[0]) {
          const moving = voicing.notes.find((n) => memberOf(n.role) === def.member);
          if (!moving) continue;
          const toFret = moving.fret + def.delta;
          if (toFret < 0 || toFret > o.voicing.maxFret) continue;
          const q: SwitchQuestion = { source, target, def, region, voicing, moving, toFret };
          cands.push({ q, item: switchItem(q) });
        }
      }
    }
  }
  if (!cands.length) return null;
  const prev = o.previous as SwitchQuestion | null | undefined;
  const pool =
    prev && cands.length > 1
      ? cands.filter(
          (c) =>
            !(
              c.q.source.degree === prev.source?.degree &&
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

export type SwitchTapResult =
  | { kind: 'select' } // tapped the note that must move: now tap its destination
  | { kind: 'correct' }
  | { kind: 'wrong'; reason: 'moved-wrong-note' | 'wrong-fret' };

/**
 * Interpret a tap. Tapping the note that has to move selects it; tapping its destination
 * answers; anything else (a note that shouldn't move, a wrong fret) is an error.
 */
export function tapSwitch(q: SwitchQuestion, s: StringNum, f: number): SwitchTapResult {
  if (s === q.moving.string) {
    if (f === q.moving.fret) return { kind: 'select' };
    return f === q.toFret ? { kind: 'correct' } : { kind: 'wrong', reason: 'wrong-fret' };
  }
  return { kind: 'wrong', reason: 'moved-wrong-note' };
}

/** The resulting voicing notes (with roles in the target chord). */
export function resultNotes(q: SwitchQuestion): VoicingNote[] {
  return q.voicing.notes.map((n) => {
    const fr = n === q.moving ? fretted(n.string, q.toFret) : fretted(n.string, n.fret);
    const tone = toneForPitchClass(q.target, fr.pc)!;
    return { ...fr, tone, role: tone.role };
  });
}
