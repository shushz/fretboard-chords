import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../../prefs/model';
import { parseKeyName } from '../../theory/keys';
import { noteToAscii } from '../../theory/notes';
import { defaultConfig, voicingOptions } from '../config';
import { generateSwitchQuestion, resultNotes, switchItem, tapSwitch } from './logic';

const p = DEFAULT_PREFERENCES;
function seeded(seed = 17) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
const none = { minDim: false, majAug: false, dom7: false };
const opts = (rand = seeded(), extensions = none) => ({
  harmony: p.harmony,
  voicing: voicingOptions(p),
  rand,
  extensions,
});

describe('mode 7: quality switch', () => {
  it('core: only major ↔ minor, moving the third one fret', () => {
    const cfg = {
      ...defaultConfig('qualitySwitch', parseKeyName('C')!, p),
      degrees: [0, 1, 3, 4, 5, 6] as never,
    };
    const rand = seeded();
    for (let i = 0; i < 40; i++) {
      const q = generateSwitchQuestion(cfg, opts(rand))!;
      expect(['maj>min', 'min>maj']).toContain(`${q.def.from}>${q.def.to}`);
      expect(q.source.degree).not.toBe(6); // vii° has no core switch
      expect(['3', 'b3']).toContain(q.moving.role);
      expect(Math.abs(q.toFret - q.moving.fret)).toBe(1);
      const res = resultNotes(q);
      expect(res.some((n) => n.role === (q.def.to === 'min' ? 'b3' : '3'))).toBe(true);
      expect(switchItem(q).variant).toMatch(/s\d$/);
    }
  });
  it('D major → D minor: F# moves down to F', () => {
    const cfg = {
      ...defaultConfig('qualitySwitch', parseKeyName('D')!, p),
      degrees: [0 as const],
      stringSets: ['1-3' as const],
    };
    const q = generateSwitchQuestion(cfg, opts())!;
    expect(noteToAscii(q.target.tones[1].note)).toBe('F');
    expect(tapSwitch(q, q.moving.string, q.moving.fret)).toEqual({ kind: 'select' });
    expect(tapSwitch(q, q.moving.string, q.toFret)).toEqual({ kind: 'correct' });
    expect(tapSwitch(q, q.moving.string, q.toFret - 1).kind).toBe('wrong');
    const other = q.voicing.notes.find((n) => n !== q.moving)!;
    expect(tapSwitch(q, other.string, other.fret)).toEqual({
      kind: 'wrong',
      reason: 'moved-wrong-note',
    });
  });
  it('extensions: dim, aug, V → V7', () => {
    const cfg = {
      ...defaultConfig('qualitySwitch', parseKeyName('Am')!, p),
      degrees: [0, 1, 4] as never,
    };
    const rand = seeded(4);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const q = generateSwitchQuestion(
        cfg,
        opts(rand, { minDim: true, majAug: true, dom7: true }),
      )!;
      seen.add(`${q.def.from}>${q.def.to}`);
      if (q.def.to === '7') {
        expect(q.source.degree).toBe(4);
        expect(q.moving.role).toBe('R');
        expect(q.toFret).toBe(q.moving.fret - 2);
        expect(
          resultNotes(q)
            .map((n) => n.role)
            .sort(),
        ).toEqual(['3', '5', 'b7']);
      }
    }
    expect(seen).toEqual(new Set(['min>maj', 'maj>min', 'min>dim', 'dim>min', 'maj>aug', 'maj>7']));
  });
  it('sevenths: maj7 ↔ 7, m7 ↔ m7b5', () => {
    const cfg = {
      ...defaultConfig('qualitySwitch', parseKeyName('C')!, p),
      sevenths: true,
      stringSets: ['1-4' as const, '2-5' as const],
      degrees: [0, 1, 4, 6] as never,
    };
    const rand = seeded(8);
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const q = generateSwitchQuestion(cfg, opts(rand))!;
      seen.add(`${q.def.from}>${q.def.to}`);
    }
    expect(seen).toEqual(new Set(['maj7>7', '7>maj7', 'm7>m7b5', 'm7b5>m7']));
  });
});
