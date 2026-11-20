import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../prefs/model';
import { parseKeyName } from '../theory/keys';
import { voicingId } from '../fretboard/voicings';
import { movement } from '../fretboard/movement';
import { defaultConfig, voicingOptions } from './config';
import {
  generateTonicQuestion,
  gradeTonic,
  sameTonicQuestion,
  targetDegrees,
  tonicItem,
  tonicPlacement,
  windowAround,
} from './tonic/logic';
import { fitsWindow } from '../fretboard/voicings';
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
      variant: 'window',
    };
    const q = generateTonicQuestion(cfg, opts())!;
    expect(voicingId(q.tonicVoicing)).toBe('3:6,2:7,1:5');
    expect(q.smooth.map(voicingId)).toEqual(['3:7,2:7,1:7']);
  });
  it('by default the tonic shape is random across the neck, with the region around it', () => {
    const cfg = defaultConfig('fromTonic', fsm, p);
    expect(tonicPlacement(cfg)).toBe('neck');
    const rand = seeded(3);
    const shapes = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const q = generateTonicQuestion(cfg, opts(rand))!;
      shapes.add(`${q.region.stringSet} ${voicingId(q.tonicVoicing)}`);
      expect(fitsWindow(q.tonicVoicing, q.region.window)).toBe(true);
      expect(q.region.window.width).toBeGreaterThanOrEqual(cfg.window.width);
    }
    // both string sets, several positions/inversions
    expect(shapes.size).toBeGreaterThanOrEqual(6);
    expect([...shapes].some((s) => s.startsWith('1-3'))).toBe(true);
    expect([...shapes].some((s) => s.startsWith('2-4'))).toBe(true);
  });
  it('windowAround keeps the window on the neck', () => {
    const all = generateTonicQuestion(
      { ...defaultConfig('fromTonic', fsm, p), stringSets: ['1-3' as const] },
      opts(),
    )!;
    const w = windowAround(all.tonicVoicing, 5, 15);
    expect(w.start).toBeGreaterThanOrEqual(0);
    expect(w.start + w.width - 1).toBeLessThanOrEqual(15);
    expect(fitsWindow(all.tonicVoicing, w)).toBe(true);
  });
  it('two consecutive questions never repeat (same tonic shape and same target)', () => {
    for (const variant of ['neck', 'window']) {
      for (const degrees of [[3], [3, 4], [0, 3, 4, 1, 5, 6]] as const) {
        const cfg = { ...defaultConfig('fromTonic', fsm, p), variant, degrees: [...degrees] };
        const rand = seeded(7);
        let prev = generateTonicQuestion(cfg, opts(rand))!;
        for (let i = 0; i < 40; i++) {
          const q = generateTonicQuestion(cfg, { ...opts(rand), previous: prev })!;
          expect(sameTonicQuestion(q, prev)).toBe(false);
          prev = q;
        }
      }
    }
  });
  it('with several targets, both the tonic shape and the target change', () => {
    const cfg = defaultConfig('fromTonic', fsm, p);
    const rand = seeded(11);
    let prev = generateTonicQuestion(cfg, opts(rand))!;
    for (let i = 0; i < 40; i++) {
      const q = generateTonicQuestion(cfg, { ...opts(rand), previous: prev })!;
      expect(q.target.degree).not.toBe(prev.target.degree);
      expect(voicingId(q.tonicVoicing)).not.toBe(voicingId(prev.tonicVoicing));
      prev = q;
    }
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
