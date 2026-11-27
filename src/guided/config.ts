/** Guided practice: the practice config for one target, in a random key (pure). */
import type { Preferences } from '../prefs/model';
import { diatonicChord } from '../theory/chords';
import { type Key, selectableKeys } from '../theory/keys';
import { randomWindow } from '../fretboard/regions';
import { enumerateVoicings } from '../fretboard/voicings';
import { type PracticeConfig, defaultConfig, voicingOptions } from '../exercises/config';
import { windowAround } from '../exercises/tonic/logic';
import { progressionsFor } from '../exercises/progression/logic';
import type { Target } from './curriculum';

function pick<T>(xs: readonly T[], rand: () => number): T {
  return xs[Math.floor(rand() * xs.length)];
}

/** Keys a target is asked in: every selectable key of its mode. */
export function keysFor(t: Target, p: Preferences): Key[] {
  return selectableKeys(p.spelling).filter((k) => k.mode === t.keyMode);
}

/**
 * The config of one question for `t`: a random key, and a fret window around a random
 * shape the question needs (the chord to find or label, or the tonic of a progression).
 */
export function guidedConfig(t: Target, p: Preferences, rand: () => number): PracticeConfig {
  const key = pick(keysFor(t, p), rand);
  const vo = voicingOptions(p);
  const width = p.fretboard.window.width;
  const base: PracticeConfig = {
    ...defaultConfig(t.mode, key, p, rand),
    degrees: [t.degree],
    stringSets: [t.stringSet],
    sevenths: false,
    tapRoot: false,
    randomKey: undefined,
  };
  const around = (degree: number, inv?: string) => {
    const chord = diatonicChord(key, degree as 0, false, p.harmony);
    const shapes = enumerateVoicings(chord, t.stringSet, vo).filter(
      (v) => !inv || v.inversion === inv,
    );
    return shapes.length
      ? windowAround(pick(shapes, rand), width, vo.maxFret)
      : randomWindow(width, vo.maxFret, rand);
  };
  switch (t.mode) {
    case 'fromTonic':
      return {
        ...base,
        variant: 'neck',
        inversion: t.inversion,
        givenRoles: t.roles,
      };
    case 'find':
      return { ...base, inversion: t.inversion, window: around(t.degree, t.inversion) };
    case 'nameTones':
      return { ...base, variant: 'label', window: around(t.degree) };
    case 'progression': {
      const progs = progressionsFor(t.keyMode).filter((pr) => pr.degrees.includes(t.degree));
      const prog = pick(progs.length ? progs : progressionsFor(t.keyMode), rand);
      return { ...base, degrees: [...prog.degrees], variant: prog.id, window: around(0) };
    }
  }
}
