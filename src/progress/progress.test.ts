import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../prefs/model';
import { makeBackup, parseBackup, withoutKey } from './backup';
import {
  type ItemStats,
  aggAccuracy,
  aggregate,
  dayKey,
  groupBy,
  isMastered,
  medianTime,
  rollingAccuracy,
  streak,
  trend,
  updateDaily,
  updateStats,
  weakest,
} from './stats';
import { type Attempt, type Item, itemKey, parseItemKey } from './types';

const item = (over: Partial<Item> = {}): Item => ({
  mode: 'find',
  key: 'Ebm',
  degree: 3,
  quality: 'min',
  stringSet: '2-4',
  inversion: '*',
  anchor: null,
  ...over,
});
const att = (correct: boolean, timeMs = 2000, at = 1_000_000, it = item()): Attempt => ({
  item: it,
  correct,
  timeMs,
  at,
  sevenths: false,
});
const T = { accuracy: 0.9, triadMs: 3000, seventhMs: 5000 };

describe('item keys', () => {
  it('round-trips', () => {
    const i = item({ anchor: 6, variant: 'maj>min' });
    expect(parseItemKey(itemKey(i))).toEqual(i);
    expect(parseItemKey(itemKey(item()))).toEqual(item());
  });
});

describe('item stats', () => {
  it('counts, rolling accuracy over last 10, median time, Leitner boxes', () => {
    let s: ItemStats | undefined;
    for (let i = 0; i < 12; i++) s = updateStats(s, att(i >= 2, 1000 + i * 100));
    expect(s!.attempts).toBe(12);
    expect(s!.correct).toBe(10);
    expect(s!.recent).toHaveLength(10);
    expect(rollingAccuracy(s!)).toBe(1);
    expect(medianTime(s!)).toBe(1650);
    expect(s!.box).toBe(5);
    expect(isMastered(s!, T, false)).toBe(true);
    s = updateStats(s, att(false));
    expect(s.box).toBe(1);
    expect(isMastered(s, T, false)).toBe(true); // 9/10 = 90 % still counts
    s = updateStats(s, att(false));
    expect(isMastered(s, T, false)).toBe(false);
  });
  it('mastery needs speed', () => {
    let s: ItemStats | undefined;
    for (let i = 0; i < 10; i++) s = updateStats(s, att(true, 4000));
    expect(isMastered(s!, T, false)).toBe(false);
    expect(isMastered(s!, T, true)).toBe(true);
  });
});

describe('daily log', () => {
  const day = 86_400_000;
  const now = new Date(2026, 10, 20, 12).getTime();
  it('streak and trend', () => {
    let d = {};
    d = updateDaily(d, att(true, 2000, now));
    d = updateDaily(d, att(false, 120_000, now - day));
    d = updateDaily(d, att(true, 2000, now - 3 * day));
    expect(streak(d, now)).toBe(2);
    expect(streak(d, now + day)).toBe(2); // not practiced yet today → count from yesterday
    expect(streak(d, now + 2 * day)).toBe(0);
    const t = trend(d, now, 4);
    expect(t.map((x) => x.attempts)).toEqual([1, 0, 1, 1]);
    expect((d as Record<string, { ms: number }>)[dayKey(now - day)].ms).toBe(60_000);
  });
});

describe('aggregation', () => {
  it('groups and finds weakest items', () => {
    const stats: Record<string, ItemStats> = {};
    const add = (it: Item, oks: boolean[], ms = 2000) => {
      let s: ItemStats | undefined;
      for (const ok of oks) s = updateStats(s, att(ok, ms, 1, it));
      stats[s!.key] = s!;
    };
    add(item({ degree: 0 }), [true, true, true]);
    add(item({ degree: 4 }), [false, false, true]);
    add(item({ degree: 5 }), [true, true, true], 9000);
    add(item({ degree: 6 }), [false]);
    const byDeg = groupBy(stats, (i) => String(i.degree));
    expect([...byDeg.keys()].sort()).toEqual(['0', '4', '5', '6']);
    expect(aggAccuracy(aggregate(byDeg.get('4')!))).toBeCloseTo(1 / 3);
    const w = weakest(stats, 2);
    expect(w.map((s) => parseItemKey(s.key).degree)).toEqual([4, 5]);
  });
});

describe('backup', () => {
  it('round-trips and validates', () => {
    const s = updateStats(undefined, att(true));
    const b = makeBackup(
      DEFAULT_PREFERENCES,
      { [s.key]: s },
      { '2026-11-20': { attempts: 1, correct: 1, ms: 2000 } },
      0,
    );
    const r = parseBackup(JSON.stringify(b));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.stats[s.key].attempts).toBe(1);
      expect(r.backup.daily['2026-11-20'].ms).toBe(2000);
      expect(r.skipped).toBe(0);
    }
    expect(parseBackup('nope').ok).toBe(false);
    expect(parseBackup('{"app":"other"}').ok).toBe(false);
    const bad = parseBackup(JSON.stringify({ ...b, stats: { x: { key: 'x' } } }));
    expect(bad.ok && bad.skipped).toBe(1);
  });
  it('reset per key', () => {
    const a = updateStats(undefined, att(true));
    const b = updateStats(undefined, att(true, 1, 1, item({ key: 'C' })));
    expect(Object.keys(withoutKey({ [a.key]: a, [b.key]: b }, 'Ebm'))).toEqual([b.key]);
  });
});
