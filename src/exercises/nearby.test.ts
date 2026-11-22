import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../prefs/model';
import { diatonicChord } from '../theory/chords';
import { parseKeyName } from '../theory/keys';
import { inWindow } from '../fretboard/regions';
import type { StringNum } from '../fretboard/tuning';
import { voicingId, voicingsInRegion } from '../fretboard/voicings';
import { defaultConfig, voicingOptions } from './config';
import { nearbyWindow, shapeAnywhere } from './region';
import { generateTonicQuestion, gradeTonic } from './tonic/logic';
import { generateProgressionQuestion, gradeStep } from './progression/logic';

const p = DEFAULT_PREFERENCES;
const vo = voicingOptions(p);
const rand = () => 0;
const taps = (t: Record<number, number>) =>
  new Map(Object.entries(t).map(([s, f]) => [Number(s) as StringNum, f]));
const bm = parseKeyName('Bm')!;
const em = diatonicChord(bm, 3, false, p.harmony); // iv in B minor

describe('open strings and fret windows', () => {
  it('fret 0 counts as inside a window starting at fret 1, not at 2', () => {
    expect(inWindow(0, { start: 1, width: 5 })).toBe(true);
    expect(inWindow(0, { start: 2, width: 5 })).toBe(false);
    expect(inWindow(0, { start: 0, width: 5 })).toBe(true);
  });
  it('the open Em shape is valid on strings 1–3 in frets 1–5', () => {
    const vs = voicingsInRegion(em, { stringSet: '1-3', window: { start: 1, width: 5 } }, vo);
    expect(vs.some((v) => v.notes.every((n) => n.fret === 0))).toBe(true);
  });
});

describe('nearby answers (From the tonic, Progression walk)', () => {
  it('nearbyWindow grows 2 frets each side, kept on the neck', () => {
    expect(nearbyWindow({ start: 5, width: 5 }, 15)).toEqual({ start: 3, width: 9 });
    expect(nearbyWindow({ start: 1, width: 5 }, 15)).toEqual({ start: 0, width: 8 });
    expect(nearbyWindow({ start: 11, width: 5 }, 15)).toEqual({ start: 9, width: 7 });
  });

  const cfg = {
    ...defaultConfig('fromTonic', bm, p),
    variant: 'window',
    degrees: [3 as const],
    stringSets: ['1-3' as const],
    window: { start: 5, width: 5 },
  };
  it('From the tonic accepts a shape just outside the window, not a far one', () => {
    const q = generateTonicQuestion(cfg, { harmony: p.harmony, voicing: vo, rand })!;
    expect(q.region.window).toEqual({ start: 5, width: 5 });
    // Em at frets 3–5 (G, E, B on strings 1, 2, 3): outside 5–9 but within 2 frets
    expect(gradeTonic(q, taps({ 1: 3, 2: 5, 3: 4 })).correct).toBe(true);
    // inside the window
    expect(gradeTonic(q, taps({ 1: 7, 2: 8, 3: 9 })).correct).toBe(true);
    // open Em: right chord, too far
    expect(gradeTonic(q, taps({ 1: 0, 2: 0, 3: 0 })).correct).toBe(false);
    const ids = q.accepted.map(voicingId);
    expect(q.valid.every((v) => ids.includes(voicingId(v)))).toBe(true);
  });
  it('Progression walk accepts nearby shapes for every step', () => {
    const q = generateProgressionQuestion(
      {
        ...defaultConfig('progression', bm, p),
        variant: 'i-iv-V-i',
        stringSets: ['1-3'],
        window: { start: 5, width: 5 },
      },
      { harmony: p.harmony, voicing: vo, rand },
    )!;
    q.valid.forEach((v, i) => {
      const ids = q.accepted[i].map(voicingId);
      expect(v.every((x) => ids.includes(voicingId(x)))).toBe(true);
      expect(q.accepted[i].length).toBeGreaterThanOrEqual(v.length);
    });
    const step = q.chords.findIndex((c) => c.degree === 3);
    expect(step).toBe(1);
    expect(gradeStep(q, step, taps({ 1: 3, 2: 5, 3: 4 }), null).correct).toBe(true);
  });
});

describe('shapeAnywhere', () => {
  it('finds the right chord anywhere on the neck, and nothing for a wrong chord', () => {
    expect(shapeAnywhere(em, '1-3', taps({ 1: 0, 2: 0, 3: 0 }), vo)).not.toBeNull();
    expect(shapeAnywhere(em, '1-3', taps({ 1: 12, 2: 12, 3: 12 }), vo)).not.toBeNull();
    // F♯–D–B (Bm) is not Em
    expect(shapeAnywhere(em, '1-3', taps({ 1: 7, 2: 7, 3: 7 }), vo)).toBeNull();
    // incomplete
    expect(shapeAnywhere(em, '1-3', taps({ 1: 0, 2: 0 }), vo)).toBeNull();
  });
});
