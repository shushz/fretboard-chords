import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../../prefs/model';
import { parseKeyName } from '../../theory/keys';
import { defaultConfig, voicingOptions } from '../config';
import {
  type LabelQuestion,
  type TapRoleQuestion,
  generateTonesQuestion,
  gradeLabels,
  gradeTapRole,
  roleChoices,
  roleFrets,
  tonesItem,
} from './logic';
import { diatonicChord } from '../../theory/chords';

const p = DEFAULT_PREFERENCES;
const fsm = parseKeyName('F#m')!;
function seeded(seed = 13) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
const opts = (rand = seeded()) => ({ harmony: p.harmony, voicing: voicingOptions(p), rand });

describe('mode 4: name the tones', () => {
  it('mixes both variants', () => {
    const cfg = defaultConfig('nameTones', fsm, p);
    const rand = seeded();
    const kinds = new Set<string>();
    for (let i = 0; i < 40; i++) kinds.add(generateTonesQuestion(cfg, opts(rand))!.kind);
    expect(kinds).toEqual(new Set(['label', 'tap']));
  });
  it('grades labels per note', () => {
    const cfg = {
      ...defaultConfig('nameTones', fsm, p),
      variant: 'label',
      degrees: [0 as const],
      stringSets: ['1-3' as const],
    };
    const q = generateTonesQuestion(cfg, opts()) as LabelQuestion;
    expect(q.kind).toBe('label');
    // only F#m voicing in 5–9 on 1–3 is 5, R, b3
    expect(gradeLabels(q, ['5', 'R', 'b3'])).toEqual({
      correct: true,
      perNote: [true, true, true],
    });
    expect(gradeLabels(q, ['5', 'R', '3'])).toEqual({
      correct: false,
      perNote: [true, true, false],
    });
    expect(tonesItem(q).inversion).toBe('second');
  });
  it('tap the b3 of V on string 2 (F#m: V = C#–E#–G#)', () => {
    const V = diatonicChord(fsm, 4);
    const q: TapRoleQuestion = {
      kind: 'tap',
      chord: V,
      role: '3',
      string: 2,
      window: { start: 5, width: 5 },
    };
    expect(roleFrets(V, '3', 2, q.window, 15)).toEqual([6]); // E# = F on string 2 fret 6
    expect(gradeTapRole(q, 2, 6)).toBe(true);
    expect(gradeTapRole(q, 2, 5)).toBe(false);
    expect(gradeTapRole(q, 3, 10)).toBe(false);
    expect(tonesItem(q).variant).toBe('tap 3 s2');
  });
  it('tap questions only when the tone exists in the window', () => {
    const cfg = { ...defaultConfig('nameTones', fsm, p), variant: 'tap' };
    const rand = seeded(2);
    for (let i = 0; i < 30; i++) {
      const q = generateTonesQuestion(cfg, opts(rand)) as TapRoleQuestion;
      expect(roleFrets(q.chord, q.role, q.string, q.window, 15).length).toBeGreaterThan(0);
    }
  });
  it('role choices', () => {
    expect(roleChoices(diatonicChord(fsm, 0))).toEqual(['R', 'b3', '3', 'b5', '5']);
    expect(roleChoices(diatonicChord(fsm, 4, true))).toContain('b7');
  });
});
