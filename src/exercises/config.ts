import type { AnchorMode, Preferences } from '../prefs/model';
import { anchorStringList } from '../prefs/model';
import { CORE_DEGREES, type DegreeIndex } from '../theory/chords';
import { type Key, type Mode, type SpellingOptions, sameKey, selectableKeys } from '../theory/keys';
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
  /**
   * Random key: a new key for every question (every progression in the walk), drawn
   * from the keys selectable under the spelling preferences. Unset = fixed `key`.
   */
  randomKey?: RandomKeyModes;
  /** Chord (degree) selection per mode, used with `randomKey`. */
  degreesByMode?: Partial<Record<Mode, DegreeIndex[]>>;
}

export type RandomKeyModes = 'major' | 'minor' | 'both';

/** Keys a random-key session draws from. */
export function randomKeyPool(modes: RandomKeyModes, spelling: SpellingOptions): Key[] {
  return selectableKeys(spelling).filter((k) => modes === 'both' || k.mode === modes);
}

export function degreesForMode(cfg: PracticeConfig, mode: Mode): DegreeIndex[] {
  const d = cfg.degreesByMode?.[mode];
  return d && d.length ? [...d] : [...CORE_DEGREES[mode]];
}

/**
 * The concrete config for one question: with a random key, pick a key (never the same
 * as `previousKey` when the pool has more than one) and that mode's chord selection.
 */
export function concreteConfig(
  cfg: PracticeConfig,
  p: Preferences,
  previousKey: Key | null,
  rand: () => number,
  /** Restrict random keys to one mode (e.g. a chosen major-key progression). */
  onlyMode?: Mode,
): PracticeConfig {
  if (!cfg.randomKey) return cfg;
  const modes =
    onlyMode && (cfg.randomKey === 'both' || cfg.randomKey === onlyMode) ? onlyMode : cfg.randomKey;
  const pool = randomKeyPool(modes, p.spelling);
  const choices =
    previousKey && pool.length > 1 ? pool.filter((k) => !sameKey(k, previousKey)) : pool;
  const key = choices[Math.floor(rand() * choices.length)] ?? cfg.key;
  return { ...cfg, key, degrees: degreesForMode(cfg, key.mode) };
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
