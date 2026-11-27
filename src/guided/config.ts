/** Guided practice: the practice config for one target, in a random key (pure). */
import type { Preferences } from '../prefs/model';
import { diatonicChord } from '../theory/chords';
import { type Key, selectableKeys } from '../theory/keys';
import { type FretWindow, type StringSetId, randomWindow } from '../fretboard/regions';
import { enumerateVoicings } from '../fretboard/voicings';
import { type PracticeConfig, defaultConfig, voicingOptions } from '../exercises/config';
import { windowAround } from '../exercises/tonic/logic';
import { progressionsFor } from '../exercises/progression/logic';
import type { Item } from '../progress/types';
import type { Target } from './curriculum';
import { matchesTarget } from './progress';
import { recordedItems } from '../exercises/review';

function pick<T>(xs: readonly T[], rand: () => number): T {
  return xs[Math.floor(rand() * xs.length)];
}

/** Keys a target is asked in: every selectable key of its mode. */
export function keysFor(t: Target, p: Preferences): Key[] {
  return selectableKeys(p.spelling).filter((k) => k.mode === t.keyMode);
}

/** Only candidates that count for the target (e.g. not "minor → diminished" for "minor → major"). */
export function targetWeight(t: Target): (item: Item) => number {
  return (item) => (matchesTarget(t, item) ? 1 : 0);
}

/** Tries before settling for a config that may not produce the target. */
const TRIES = 12;

/**
 * The config of one question for `t`: a random key, and a fret window around a random
 * shape the question needs (the chord to find, label or change, or the tonic of a
 * progression). From the tonic places its own window around the tonic shape. Some
 * key/shape picks can't produce the target (the top shape has no next shape up; a root
 * on string 6 too far away…): those are tried again.
 */
export function guidedConfig(t: Target, p: Preferences, rand: () => number): PracticeConfig {
  let cfg = configOnce(t, p, rand);
  for (let i = 1; i < TRIES; i++) {
    const got = recordedItems(cfg, p, rand, targetWeight(t));
    if (got?.some((it) => matchesTarget(t, it))) return cfg;
    cfg = configOnce(t, p, rand);
  }
  return cfg;
}

function configOnce(t: Target, p: Preferences, rand: () => number): PracticeConfig {
  const key = pick(keysFor(t, p), rand);
  const vo = voicingOptions(p);
  const width = p.fretboard.window.width;
  const sevenths = !!t.sevenths;
  const set: StringSetId = t.stringSet === '*' ? '2-4' : t.stringSet;
  const base: PracticeConfig = {
    ...defaultConfig(t.mode, key, p, rand),
    degrees: [t.degree],
    stringSets: [set],
    sevenths,
    tapRoot: false,
    randomKey: undefined,
  };
  const around = (degree: number, inv?: string): FretWindow => {
    const chord = diatonicChord(key, degree as 0, sevenths, p.harmony);
    const shapes = enumerateVoicings(chord, set, { ...vo, shells: false }).filter(
      (v) => !inv || v.inversion === inv,
    );
    return shapes.length
      ? windowAround(pick(shapes, rand), width, vo.maxFret)
      : randomWindow(width, vo.maxFret, rand);
  };
  switch (t.mode) {
    case 'fromTonic':
      return { ...base, variant: 'neck', inversion: t.inversion, givenRoles: t.roles };
    case 'find':
      return {
        ...base,
        inversion: t.inversion,
        tapRoot: !!t.anchor,
        window: around(t.degree, t.inversion),
      };
    case 'nameTones':
      return { ...base, variant: t.variant, window: around(t.degree) };
    case 'nextShape':
      return { ...base, variant: t.variant, window: around(t.degree) };
    case 'qualitySwitch':
      return { ...base, window: around(t.degree) };
    case 'nameChord':
      return { ...base, variant: undefined };
    case 'progression': {
      const progs = progressionsFor(t.keyMode).filter((pr) => pr.degrees.includes(t.degree));
      const prog = pick(progs.length ? progs : progressionsFor(t.keyMode), rand);
      return {
        ...base,
        degrees: [...prog.degrees],
        variant: prog.id,
        tempo: t.variant === 'tempo',
        window: around(0),
      };
    }
  }
}
