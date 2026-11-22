import { describe, expect, it } from 'vitest';
import { makeDemoAttempts } from './demo';
import { median } from '../exercises/session';
import { parseItemKey, itemKey } from './types';
import { drillConfig } from '../exercises/drill';
import { DEFAULT_PREFERENCES } from '../prefs/model';

describe('demo data for previews', () => {
  const now = new Date(2026, 10, 22, 18).getTime();
  const a = makeDemoAttempts(now);
  it('covers every mode, two weeks, ends today, deterministic', () => {
    expect(new Set(a.map((x) => x.item.mode)).size).toBe(7);
    expect(a.length).toBeGreaterThan(300);
    expect(Math.max(...a.map((x) => x.at))).toBeLessThanOrEqual(now);
    expect(new Date(Math.max(...a.map((x) => x.at))).getDate()).toBe(22);
    expect(makeDemoAttempts(now)).toEqual(a);
  });
  it('shows improvement', () => {
    const cut = (days: number) => now - days * 86_400_000;
    const early = a.filter((x) => x.at < cut(9));
    const late = a.filter((x) => x.at > cut(4));
    const acc = (xs: typeof a) => xs.filter((x) => x.correct).length / xs.length;
    const med = (xs: typeof a) => median(xs.filter((x) => x.correct).map((x) => x.timeMs));
    expect(acc(late)).toBeGreaterThan(acc(early) + 0.15);
    expect(med(late)).toBeLessThan(med(early) - 500);
  });
  it('every item can be drilled', () => {
    for (const k of new Set(a.map((x) => itemKey(x.item)))) {
      expect(drillConfig(parseItemKey(k), DEFAULT_PREFERENCES)).not.toBeNull();
    }
  });
});
