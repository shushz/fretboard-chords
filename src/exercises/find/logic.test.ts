import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../../prefs/model';
import { parseKeyName } from '../../theory/keys';
import { defaultConfig, voicingOptions } from '../config';
import { applyTap, gradeFind, generateFindQuestion, isComplete, requiredStrings } from './logic';
import type { StringNum } from '../../fretboard/tuning';

const p = DEFAULT_PREFERENCES;
const fsm = parseKeyName('F#m')!;
function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
const opts = (rand = seeded()) => ({ harmony: p.harmony, voicing: voicingOptions(p), rand });

describe('find the chord', () => {
  it('generates questions within the configured degrees and sets, with valid voicings', () => {
    const cfg = defaultConfig('find', fsm, p);
    const rand = seeded();
    for (let i = 0; i < 50; i++) {
      const q = generateFindQuestion(cfg, opts(rand))!;
      expect(cfg.degrees).toContain(q.chord.degree);
      expect(cfg.stringSets).toContain(q.region.stringSet);
      expect(q.valid.length).toBeGreaterThan(0);
      expect(q.anchorString).toBeNull();
    }
  });
  it('avoids repeating the previous degree+set', () => {
    const cfg = defaultConfig('find', fsm, p);
    const rand = seeded(3);
    let prev = generateFindQuestion(cfg, opts(rand));
    for (let i = 0; i < 30; i++) {
      const q = generateFindQuestion(cfg, { ...opts(rand), previous: prev })!;
      expect(
        q.chord.degree === prev!.chord.degree && q.region.stringSet === prev!.region.stringSet,
      ).toBe(false);
      prev = q;
    }
  });
  it('grades the SPEC example F#m on 1–3, any tap order', () => {
    const cfg = {
      ...defaultConfig('find', fsm, p),
      degrees: [0 as const],
      stringSets: ['1-3' as const],
    };
    const q = generateFindQuestion(cfg, opts())!;
    let taps: ReadonlyMap<StringNum, number> = new Map();
    taps = applyTap(q, taps, 1, 5);
    taps = applyTap(q, taps, 3, 6);
    expect(isComplete(q, taps)).toBe(false);
    taps = applyTap(q, taps, 4, 7); // ignored: not in set
    expect(taps.has(4)).toBe(false);
    taps = applyTap(q, taps, 2, 7);
    expect(isComplete(q, taps)).toBe(true);
    const g = gradeFind(q, taps, 15);
    expect(g.correct).toBe(true);
    expect(g.matched?.inversion).toBe('second');
    const wrong = gradeFind(q, applyTap(q, taps, 2, 6), 15);
    expect(wrong.correct).toBe(false);
    expect(wrong.wrong).toHaveLength(3);
    // tapping again removes
    expect(applyTap(q, taps, 2, 7).has(2)).toBe(false);
  });
  it('anchored variant requires the root on string 6/5 within window ± 2', () => {
    const cfg = {
      ...defaultConfig('find', fsm, p),
      degrees: [0 as const],
      stringSets: ['2-4' as const],
      tapRoot: true,
      anchorStrings: [5 as const],
    };
    const q = generateFindQuestion(cfg, opts())!;
    expect(q.anchorString).toBe(5);
    expect(requiredStrings(q)).toEqual([2, 3, 4, 5]);
    // F#m on 2–4 in frets 5–9: strings 4:7 (A), 3:6 (C#), 2:7 (F#)
    let taps: ReadonlyMap<StringNum, number> = new Map([
      [4, 7],
      [3, 6],
      [2, 7],
    ]);
    expect(isComplete(q, taps)).toBe(false);
    taps = applyTap(q, taps, 5, 9); // F# on string 5
    const g = gradeFind(q, taps, 15);
    expect(g.anchorOk).toBe(true);
    expect(g.correct).toBe(true);
    const bad = gradeFind(q, applyTap(q, taps, 5, 7), 15);
    expect(bad.anchorOk).toBe(false);
    expect(bad.correct).toBe(false);
  });
  it('no anchor possible on 4–6 → skipped when required', () => {
    const cfg = {
      ...defaultConfig('find', fsm, p),
      stringSets: ['4-6' as const],
      tapRoot: true,
    };
    expect(generateFindQuestion(cfg, opts())).toBeNull();
  });
});
