import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, updatePreferences } from '../prefs/model';
import { parseKeyName } from '../theory/keys';
import { isSeventh } from '../theory/chords';
import { defaultConfig, voicingOptions } from './config';
import { generateFindQuestion } from './find/logic';
import { generateTonicQuestion } from './tonic/logic';
import { generateShapeQuestion } from './shape/logic';
import { generateTonesQuestion, roleChoices } from './tones/logic';
import { generateSwitchQuestion } from './switch/logic';
import { generateProgressionQuestion } from './progression/logic';
import { generateNameChordQuestion } from './namechord/logic';
import { type ItemStats, triadMasteryForKey, updateStats } from '../progress/stats';
import type { ModeId } from '../progress/types';

function seeded(seed = 29) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('sevenths in every mode', () => {
  for (const shells of [false, true]) {
    const p = updatePreferences(DEFAULT_PREFERENCES, (d) => {
      d.sevenths.enabled = true;
      d.sevenths.shells = shells;
    });
    const o = () => ({ harmony: p.harmony, voicing: voicingOptions(p), rand: seeded() });
    const cfg = (m: ModeId) => defaultConfig(m, parseKeyName('Am')!, p);
    it(`generates seventh-chord questions (shells: ${shells})`, () => {
      expect(cfg('find').stringSets).toEqual(
        shells ? ['1-4', '2-5', '1-3', '2-4'] : ['1-4', '2-5'],
      );
      const rand = seeded();
      for (let i = 0; i < 15; i++) {
        const opt = { ...o(), rand };
        const f = generateFindQuestion(cfg('find'), opt)!;
        expect(isSeventh(f.chord.quality)).toBe(true);
        for (const v of f.valid) expect(v.notes.length === 4 || v.shell).toBe(true);
        expect(isSeventh(generateTonicQuestion(cfg('fromTonic'), opt)!.target.quality)).toBe(true);
        expect(isSeventh(generateShapeQuestion(cfg('nextShape'), opt)!.chord.quality)).toBe(true);
        const t = generateTonesQuestion(cfg('nameTones'), opt)!;
        expect(roleChoices(t.chord)).toContain('b7');
        const sw = generateSwitchQuestion(cfg('qualitySwitch'), {
          ...opt,
          extensions: { minDim: false, majAug: false, dom7: false },
        })!;
        expect(sw.def.family).toBe('sevenths');
        expect(
          generateProgressionQuestion(cfg('progression'), opt)!.chords.every((c) =>
            isSeventh(c.quality),
          ),
        ).toBe(true);
        expect(
          generateNameChordQuestion(cfg('nameChord'), {
            ...opt,
            symbol: { glyphs: true, dimStyle: 'symbol' },
            numeral: { glyphs: true, dimStyle: 'symbol' },
          })!.answer,
        ).toMatch(/7/);
      }
    });
  }
});

describe('sevenths suggestion', () => {
  it('triad mastery per key', () => {
    const stats: Record<string, ItemStats> = {};
    const t = { accuracy: 0.9, triadMs: 3000, seventhMs: 5000 };
    for (const degree of [0, 3, 4]) {
      let s: ItemStats | undefined;
      for (let i = 0; i < 10; i++) {
        s = updateStats(s, {
          item: {
            mode: 'find',
            key: 'Am',
            degree,
            quality: 'min',
            stringSet: '1-3',
            inversion: '*',
            anchor: null,
          },
          correct: true,
          timeMs: 1000,
          at: i,
          sevenths: false,
        });
      }
      stats[s!.key] = s!;
    }
    expect(triadMasteryForKey(stats, 'Am', [0, 3, 4, 1, 5, 6], t)).toBe(0.5);
    expect(triadMasteryForKey(stats, 'C', [0, 3, 4, 1, 5], t)).toBe(0);
  });
});
