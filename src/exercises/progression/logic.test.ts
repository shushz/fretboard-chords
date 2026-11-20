import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../../prefs/model';
import { parseKeyName } from '../../theory/keys';
import { chordNumeral } from '../../theory/chords';
import type { StringNum } from '../../fretboard/tuning';
import { defaultConfig, voicingOptions } from '../config';
import {
  widenedWindows,
  PROGRESSIONS,
  beatLimitMs,
  generateProgressionQuestion,
  gradeStep,
  progressionsFor,
  stepItem,
} from './logic';

const p = DEFAULT_PREFERENCES;
function seeded(seed = 21) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
const opts = (rand = seeded()) => ({ harmony: p.harmony, voicing: voicingOptions(p), rand });
const no = { glyphs: false, dimStyle: 'symbol' as const };

describe('mode 5: progression walk', () => {
  it('built-ins match SPEC numerals', () => {
    const maj = parseKeyName('C')!;
    const min = parseKeyName('Am')!;
    const names = PROGRESSIONS.map((pr) => {
      const k = pr.mode === 'major' ? maj : min;
      const cfg = { ...defaultConfig('progression', k, p), variant: pr.id };
      const q = generateProgressionQuestion(cfg, opts())!;
      return q.chords.map((c) => chordNumeral(c, no)).join('–');
    });
    expect(names).toEqual([
      'I–vi–ii–V',
      'I–IV–V–I',
      'ii–V–I',
      'I–V–vi–IV',
      'vi–IV–I–V',
      'i–iv–V–i',
      'i–bVI–bVII–i',
      'i–bVII–bVI–V',
      'ii°–V–i',
      'i–iv–bVII–bIII',
    ]);
    expect(progressionsFor('minor')).toHaveLength(5);
  });
  it('every step has a voicing in the region; smooth grading from the previous chord', () => {
    const cfg = defaultConfig('progression', parseKeyName('F#m')!, p);
    const rand = seeded();
    for (let i = 0; i < 20; i++) {
      const q = generateProgressionQuestion(cfg, opts(rand))!;
      expect(q.valid.every((v) => v.length > 0)).toBe(true);
      let prev = null;
      for (let s = 0; s < q.chords.length; s++) {
        const target = prev ? gradeStep(q, s, new Map(), prev).smoothest[0] : q.valid[s][0];
        const taps = new Map(target.notes.map((n) => [n.string, n.fret] as [StringNum, number]));
        const g = gradeStep(q, s, taps, prev);
        expect(g.correct).toBe(true);
        if (prev) expect(g.smooth).toBe(true);
        expect(stepItem(q, s).degree).toBe(q.chords[s].degree);
        prev = g.matched;
      }
    }
  });
  it('widens a short window when a chord has no shape in it', () => {
    const cfg = {
      ...defaultConfig('progression', parseKeyName('F#m')!, p),
      variant: 'i-iv-V-i',
      stringSets: ['1-3' as const],
    };
    const q = generateProgressionQuestion(cfg, opts())!;
    expect(q.region.window.width).toBeGreaterThan(5);
    expect(q.valid.every((v) => v.length > 0)).toBe(true);
    expect(widenedWindows({ start: 5, width: 5 }, 15, 1)).toEqual([
      { start: 5, width: 5 },
      { start: 5, width: 6 },
      { start: 4, width: 6 },
    ]);
  });
  it('tempo limit', () => {
    expect(beatLimitMs(60, 4)).toBe(4000);
    expect(beatLimitMs(120, 2)).toBe(1000);
  });
});
