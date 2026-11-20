import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, updatePreferences } from '../prefs/model';
import { keyToAscii, parseKeyName, sameKey } from '../theory/keys';
import { CORE_DEGREES } from '../theory/chords';
import { concreteConfig, defaultConfig, randomKeyPool, voicingOptions } from './config';
import { generateFindQuestion } from './find/logic';
import { generateProgressionQuestion } from './progression/logic';

const p = DEFAULT_PREFERENCES;
function seeded(seed = 31) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('random key', () => {
  it('pool follows the spelling preferences', () => {
    expect(randomKeyPool('major', p.spelling)).toHaveLength(12);
    expect(randomKeyPool('both', p.spelling)).toHaveLength(24);
    const minor = randomKeyPool('minor', p.spelling).map(keyToAscii);
    expect(minor).toContain('Ebm');
    expect(minor).not.toContain('D#m');
    expect(minor).not.toContain('Gbm');
    const theo = updatePreferences(p, (d) => void (d.spelling.allowTheoretical = true));
    expect(randomKeyPool('minor', theo.spelling).map(keyToAscii)).toContain('Gbm');
  });
  it('fixed key is untouched', () => {
    const cfg = defaultConfig('find', parseKeyName('F#m')!, p);
    expect(concreteConfig(cfg, p, null, seeded())).toBe(cfg);
  });
  it('a new key each question, never the same twice in a row, with that mode’s chords', () => {
    const cfg = {
      ...defaultConfig('find', parseKeyName('C')!, p),
      randomKey: 'both' as const,
      degreesByMode: { major: [0, 4] as never, minor: [3] as never },
    };
    const rand = seeded();
    let prev = null;
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const c = concreteConfig(cfg, p, prev, rand);
      if (prev) expect(sameKey(c.key, prev)).toBe(false);
      expect(c.degrees).toEqual(c.key.mode === 'major' ? [0, 4] : [3]);
      seen.add(keyToAscii(c.key));
      // every drawn key yields a playable question
      expect(
        generateFindQuestion(c, { harmony: p.harmony, voicing: voicingOptions(p), rand }),
      ).not.toBeNull();
      prev = c.key;
    }
    expect(seen.size).toBe(24);
  });
  it('only major / only minor; missing selection falls back to the core set', () => {
    const cfg = {
      ...defaultConfig('progression', parseKeyName('C')!, p),
      randomKey: 'minor' as const,
    };
    const rand = seeded(5);
    for (let i = 0; i < 30; i++) {
      const c = concreteConfig(cfg, p, null, rand);
      expect(c.key.mode).toBe('minor');
      expect(c.degrees).toEqual([...CORE_DEGREES.minor]);
      expect(
        generateProgressionQuestion(c, { harmony: p.harmony, voicing: voicingOptions(p), rand })!
          .chords[0].key,
      ).toEqual(c.key);
    }
  });
});
