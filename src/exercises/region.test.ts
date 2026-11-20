import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../prefs/model';
import { DEGREES, diatonicChord } from '../theory/chords';
import { parseKeyName, selectableKeys } from '../theory/keys';
import { TRIAD_STRING_SETS } from '../fretboard/regions';
import { fitsWindow } from '../fretboard/voicings';
import { defaultConfig, voicingOptions } from './config';
import { MAX_WIDEN, fittingRegion } from './region';
import { generateFindQuestion } from './find/logic';
import { generateTonicQuestion } from './tonic/logic';
import { generateShapeQuestion } from './shape/logic';
import { generateTonesQuestion } from './tones/logic';
import { generateSwitchQuestion } from './switch/logic';

const p = DEFAULT_PREFERENCES;
const vo = voicingOptions(p);
function seeded(seed = 41) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('no chord is silently skipped', () => {
  it('every diatonic triad fits every 5-fret window on every triad string set (widened ≤ MAX_WIDEN frets, mostly ≤ 1)', () => {
    const widened: number[] = [];
    const primaryMax = { v: 0 };
    for (const k of selectableKeys(p.spelling)) {
      for (const d of DEGREES) {
        const c = diatonicChord(k, d, false, p.harmony);
        for (const set of TRIAD_STRING_SETS) {
          for (let start = 0; start <= 11; start++) {
            const fit = fittingRegion([c], set, { start, width: 5 }, vo);
            expect(fit, `${c.root.letter} ${set} @${start}`).not.toBeNull();
            expect(fit!.region.window.width - 5).toBeLessThanOrEqual(MAX_WIDEN);
            expect(fit!.region.window.start).toBeLessThanOrEqual(start);
            if (fit!.widened) widened.push(fit!.region.window.width - 5);
            if (set === '1-3' || set === '2-4')
              primaryMax.v = Math.max(primaryMax.v, fit!.region.window.width - 5);
          }
        }
      }
    }
    // on the default sets (1–3, 2–4) widening stays small; most widenings are 1 fret
    expect(primaryMax.v).toBeLessThanOrEqual(2);
    expect(widened.filter((x) => x === 1).length / widened.length).toBeGreaterThan(0.6);
  });
  it('keeps the window when a shape fits, widens minimally otherwise', () => {
    const fsm = parseKeyName('F#m')!;
    const i = diatonicChord(fsm, 0);
    const V = diatonicChord(fsm, 4);
    const w = { start: 5, width: 5 };
    expect(fittingRegion([i], '1-3', w, vo)!.widened).toBe(false);
    const fit = fittingRegion([V], '1-3', w, vo)!;
    expect(fit.widened).toBe(true);
    expect(fit.region.window).toEqual({ start: 5, width: 6 }); // frets 5–10 → shape 9–10
  });
  it('F♯m V on strings 1–3, frets 5–9 is asked in every mode that uses the window', () => {
    const cfg = {
      ...defaultConfig('find', parseKeyName('F#m')!, p),
      degrees: [4 as const],
      stringSets: ['1-3' as const],
    };
    const o = { harmony: p.harmony, voicing: vo, rand: seeded() };
    const f = generateFindQuestion(cfg, o)!;
    expect(f.chord.degree).toBe(4);
    expect(f.region.window.width).toBeGreaterThan(5);
    expect(f.valid.every((v) => fitsWindow(v, f.region.window))).toBe(true);
    expect(generateShapeQuestion({ ...cfg, mode: 'nextShape' }, o)!.chord.degree).toBe(4);
    const t = generateTonesQuestion({ ...cfg, mode: 'nameTones', variant: 'label' }, o)!;
    expect(t.chord.degree).toBe(4);
    const tonic = generateTonicQuestion({ ...cfg, mode: 'fromTonic', variant: 'window' }, o)!;
    expect(tonic.target.degree).toBe(4);
    expect(fitsWindow(tonic.tonicVoicing, tonic.region.window)).toBe(true);
    const sw = generateSwitchQuestion(
      { ...cfg, mode: 'qualitySwitch' },
      { ...o, extensions: { minDim: false, majAug: false, dom7: false } },
    )!;
    expect(sw.source.degree).toBe(4);
  });
  it('F minor i and ♭VI on strings 1–3, frets 5–9', () => {
    const cfg = {
      ...defaultConfig('find', parseKeyName('Fm')!, p),
      stringSets: ['1-3' as const],
    };
    for (const d of [0, 5] as const) {
      const q = generateFindQuestion(
        { ...cfg, degrees: [d] },
        { harmony: p.harmony, voicing: vo, rand: seeded() },
      );
      expect(q?.chord.degree).toBe(d);
    }
  });
});
