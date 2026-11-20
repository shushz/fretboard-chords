import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../prefs/model';
import { parseKeyName } from '../theory/keys';
import { voicingId } from '../fretboard/voicings';
import { movement } from '../fretboard/movement';
import { defaultConfig, voicingOptions } from './config';
import { generateTonicQuestion, gradeTonic, targetDegrees, tonicItem } from './tonic/logic';
import { generateShapeQuestion, gradeShape, shapeItem, shapeView } from './shape/logic';
import type { StringNum } from '../fretboard/tuning';

const p = DEFAULT_PREFERENCES;
const fsm = parseKeyName('F#m')!;
function seeded(seed = 11) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
const opts = (rand = seeded()) => ({ harmony: p.harmony, voicing: voicingOptions(p), rand });
const taps = (v: { notes: readonly { string: StringNum; fret: number }[] }) =>
  new Map(v.notes.map((n) => [n.string, n.fret] as [StringNum, number]));

describe('mode 2: from the tonic', () => {
  it('targets exclude the tonic', () => {
    const cfg = defaultConfig('fromTonic', fsm, p);
    expect(targetDegrees(cfg)).not.toContain(0);
    expect(targetDegrees({ ...cfg, degrees: [0] })).toEqual([3, 4, 1, 5, 6]);
  });
  it('generates a tonic voicing and valid targets in the same region; grades smooth', () => {
    const cfg = defaultConfig('fromTonic', fsm, p);
    const rand = seeded();
    for (let i = 0; i < 30; i++) {
      const q = generateTonicQuestion(cfg, opts(rand))!;
      expect(q.tonic.degree).toBe(0);
      expect(q.target.degree).not.toBe(0);
      expect(q.valid.length).toBeGreaterThan(0);
      expect(q.tonicVoicing.stringSet).toBe(q.region.stringSet);
      for (const v of q.valid)
        expect(movement(q.tonicVoicing, v)).toBeGreaterThanOrEqual(
          movement(q.tonicVoicing, q.smooth[0]),
        );
      const g = gradeTonic(q, taps(q.smooth[0]));
      expect(g).toMatchObject({ correct: true, smooth: true });
      const other = q.valid.find((v) => !q.smooth.includes(v));
      if (other) expect(gradeTonic(q, taps(other))).toMatchObject({ correct: true, smooth: false });
      expect(gradeTonic(q, taps(q.tonicVoicing)).correct).toBe(false);
      expect(tonicItem(q).inversion).toBe(q.tonicVoicing.inversion);
    }
  });
  it('F#m i (1–3 @ 5–7) → iv smooth = B minor at fret 7', () => {
    const cfg = {
      ...defaultConfig('fromTonic', fsm, p),
      degrees: [3 as const],
      stringSets: ['1-3' as const],
      window: { start: 5, width: 4 },
    };
    const q = generateTonicQuestion(cfg, opts())!;
    expect(voicingId(q.tonicVoicing)).toBe('3:6,2:7,1:5');
    expect(q.smooth.map(voicingId)).toEqual(['3:7,2:7,1:7']);
  });
});

describe('mode 3: next / previous shape', () => {
  it('target is the adjacent inversion up or down', () => {
    const cfg = defaultConfig('nextShape', fsm, p);
    const rand = seeded(5);
    for (let i = 0; i < 30; i++) {
      const q = generateShapeQuestion(cfg, opts(rand))!;
      expect(q.target.inversion).not.toBe(q.shown.inversion);
      if (q.direction === 'up') expect(q.target.position).toBeGreaterThan(q.shown.position);
      else expect(q.target.position).toBeLessThan(q.shown.position);
      expect(gradeShape(q, taps(q.target)).correct).toBe(true);
      expect(gradeShape(q, taps(q.shown)).correct).toBe(false);
      const v = shapeView(q);
      expect(v.start).toBeLessThanOrEqual(Math.min(q.shown.position, q.target.position));
      expect(shapeItem(q).variant).toBe(q.direction);
    }
  });
  it('direction variant', () => {
    const cfg = { ...defaultConfig('nextShape', fsm, p), variant: 'down' };
    const rand = seeded(9);
    for (let i = 0; i < 10; i++)
      expect(generateShapeQuestion(cfg, opts(rand))!.direction).toBe('down');
  });
});
