import { describe, expect, it } from 'vitest';
import { DEFAULT_ROLE_COLORS } from '../prefs/model';
import { contrastRatio, readableTextOn } from './contrast';

describe('readable text on role colors', () => {
  it('every default role color gets text with at least 3:1 contrast (bold labels)', () => {
    for (const c of Object.values(DEFAULT_ROLE_COLORS)) {
      expect(contrastRatio(c, readableTextOn(c))).toBeGreaterThanOrEqual(3);
    }
  });
  it('picks dark text on amber and white on deep colors', () => {
    expect(readableTextOn('#f5a524')).toBe('#14181f');
    expect(readableTextOn('#1d2430')).toBe('#ffffff');
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21);
  });
  it('any user-picked color stays readable', () => {
    for (let i = 0; i < 4096; i += 7) {
      const hex =
        '#' +
        [i >> 8, (i >> 4) & 15, i & 15].map((v) => (v * 17).toString(16).padStart(2, '0')).join('');
      expect(contrastRatio(hex, readableTextOn(hex))).toBeGreaterThanOrEqual(3); // bold labels
    }
  });
});
