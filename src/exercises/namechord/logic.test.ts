import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../../prefs/model';
import { parseKeyName } from '../../theory/keys';
import { diatonicChord } from '../../theory/chords';
import { note, noteToAscii } from '../../theory/notes';
import { defaultConfig } from '../config';
import { enharmonic, forwardDistractors, generateNameChordQuestion, nameChordItem } from './logic';

const p = DEFAULT_PREFERENCES;
const sym = { glyphs: false, dimStyle: 'symbol' as const };
const num = { glyphs: false, dimStyle: 'symbol' as const };
function seeded(seed = 23) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
const opts = (rand = seeded()) => ({ harmony: p.harmony, symbol: sym, numeral: num, rand });

describe('mode 6: name the chord', () => {
  it('enharmonic spellings', () => {
    expect(noteToAscii(enharmonic(note('A', -1))!)).toBe('G#');
    expect(noteToAscii(enharmonic(note('C', 1))!)).toBe('Db');
    expect(noteToAscii(enharmonic(note('C', -1))!)).toBe('B');
    expect(enharmonic(note('D'))).toBeNull();
  });
  it('"In E♭m, what is iv?" → A♭m with G♯m among distractors', () => {
    const ebm = parseKeyName('Ebm')!;
    const d = forwardDistractors(diatonicChord(ebm, 3), false, { harmony: p.harmony, symbol: sym });
    expect(d[0]).toBe('G#m');
    expect(d).toContain('Ab');
    const cfg = {
      ...defaultConfig('nameChord', ebm, p),
      degrees: [3 as const],
      variant: 'forward',
    };
    const q = generateNameChordQuestion(cfg, opts())!;
    expect(q.answer).toBe('Abm');
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain('Abm');
    expect(q.options).toContain('G#m');
    expect(new Set(q.options).size).toBe(4);
  });
  it('reverse: "A♭m is which degree in E♭m?"', () => {
    const cfg = {
      ...defaultConfig('nameChord', parseKeyName('Ebm')!, p),
      degrees: [3 as const],
      variant: 'reverse',
    };
    const q = generateNameChordQuestion(cfg, opts())!;
    expect(q.answer).toBe('iv');
    expect(q.options).toContain('IV');
    expect(q.options).toHaveLength(4);
    expect(nameChordItem(q).variant).toBe('reverse');
  });
  it('always 4 unique options containing the answer', () => {
    const rand = seeded(3);
    for (const k of ['C', 'F#m', 'Bb', 'G#m', 'Db']) {
      for (const sevenths of [false, true]) {
        const cfg = {
          ...defaultConfig('nameChord', parseKeyName(k)!, p),
          degrees: [0, 1, 2, 3, 4, 5, 6] as never,
          sevenths,
        };
        for (let i = 0; i < 20; i++) {
          const q = generateNameChordQuestion(cfg, opts(rand))!;
          expect(q.options).toContain(q.answer);
          expect(new Set(q.options).size).toBe(4);
        }
      }
    }
  });
});
