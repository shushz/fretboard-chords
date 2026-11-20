import type { AnchorMode, Preferences } from '../prefs/model';
import { anchorStringList } from '../prefs/model';
import { CORE_DEGREES, type DegreeIndex } from '../theory/chords';
import type { Key } from '../theory/keys';
import {
  type FretWindow,
  STRING_SET_TIER,
  type StringSetId,
  randomWindow,
} from '../fretboard/regions';
import type { VoicingOptions } from '../fretboard/voicings';
import type { ModeId } from '../progress/types';

export interface PracticeConfig {
  mode: ModeId;
  key: Key;
  degrees: DegreeIndex[];
  stringSets: StringSetId[];
  window: FretWindow;
  sevenths: boolean;
  anchor: AnchorMode;
  anchorStrings: (5 | 6)[];
  /** Mode-specific options. */
  variant?: string;
  /** Progression walk: find each chord within the beat limit. */
  tempo?: boolean;
}

export function defaultConfig(
  mode: ModeId,
  key: Key,
  p: Preferences,
  rand: () => number = Math.random,
): PracticeConfig {
  const sevenths = p.sevenths.enabled;
  return {
    mode,
    key,
    degrees: [...CORE_DEGREES[key.mode]],
    stringSets: stringSetsFor(p, sevenths),
    window: p.fretboard.randomWindow
      ? randomWindow(p.fretboard.window.width, p.fretboard.fretRange, rand)
      : { ...p.fretboard.window },
    sevenths,
    anchor: p.fretboard.anchor,
    anchorStrings: anchorStringList(p),
  };
}

/** Enabled string sets for triads or sevenths (drop-2 sets, plus 3-string sets for shells). */
export function stringSetsFor(p: Preferences, sevenths: boolean): StringSetId[] {
  if (!sevenths) return [...p.fretboard.stringSets];
  const out = [...p.sevenths.drop2Sets];
  if (p.sevenths.shells) out.push(...p.fretboard.stringSets);
  return out.length ? out : ['1-4'];
}

export function voicingOptions(p: Preferences): VoicingOptions & { allowOutside: boolean } {
  return {
    maxFret: p.fretboard.fretRange,
    maxSpan: p.fretboard.maxSpan,
    shells: p.sevenths.shells,
    allowOutside: p.fretboard.allowOutside,
  };
}

/** Selection weight per string set (primary sets are used most, SPEC §4). */
export function stringSetWeight(s: StringSetId): number {
  const t = STRING_SET_TIER[s];
  return t === 'primary' ? 3 : t === 'secondary' ? 1.5 : 1;
}
