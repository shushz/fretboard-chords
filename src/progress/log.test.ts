import { describe, expect, it } from 'vitest';
import {
  LOG_CAP,
  appendLog,
  compareRecent,
  dailyTrend,
  functionKey,
  functionOf,
  sanitizeLog,
} from './log';
import type { Attempt, Item } from './types';

const DAY = 86_400_000;
const t0 = new Date(2026, 10, 1, 12).getTime();
const item = (o: Partial<Item> = {}): Item => ({
  mode: 'fromTonic',
  key: 'F#m',
  degree: 3,
  quality: 'min',
  stringSet: '2-4',
  inversion: 'second',
  anchor: null,
  ...o,
});
const att = (day: number, ok: boolean, ms: number, it = item()): Attempt => ({
  item: it,
  correct: ok,
  timeMs: ms,
  at: t0 + day * DAY,
  sevenths: false,
});

describe('answer log', () => {
  it('appends and caps', () => {
    const big = Array.from({ length: LOG_CAP }, (_, i) => ({
      t: i,
      k: 'a|b|1|min|1-3|*|-|',
      ok: 1 as const,
      ms: 1,
    }));
    const l = appendLog(big, [att(0, true, 500)]);
    expect(l).toHaveLength(LOG_CAP);
    expect(l[l.length - 1].ms).toBe(500);
    expect(l[0].t).toBe(1);
  });

  it('one trend point per practice day, filtered by mode and by chord function', () => {
    let log = appendLog(
      [],
      [att(0, false, 4000), att(0, true, 3000), att(2, true, 2000), att(2, true, 1000)],
    );
    log = appendLog(log, [att(2, false, 9000, item({ mode: 'find' }))]);
    log = appendLog(log, [att(5, true, 1500, item({ key: 'Bbm' }))]); // same function, other key
    const all = dailyTrend(log, {});
    expect(all.map((p) => p.answers)).toEqual([2, 3, 1]);
    const tonic = dailyTrend(log, { mode: 'fromTonic' });
    expect(tonic.map((p) => p.accuracy)).toEqual([0.5, 1, 1]);
    expect(tonic.map((p) => p.medianMs)).toEqual([3000, 1500, 1500]);
    const fn = functionOf(item());
    expect(functionKey(fn)).toBe('minor|3|min|2-4');
    expect(dailyTrend(log, { fn }).map((p) => p.answers)).toEqual([1 + 1, 2 + 1, 1]);
  });

  it('compares recent practice days with earlier ones, weighted by answers', () => {
    const a: Attempt[] = [];
    for (let d = 0; d < 4; d++)
      for (let i = 0; i < 10; i++) a.push(att(d, d >= 2 ? i < 9 : i < 5, d >= 2 ? 1000 : 3000));
    const c = compareRecent(appendLog([], a), {})!;
    expect(c.days).toBe(2);
    expect(c.before.accuracy).toBeCloseTo(0.5);
    expect(c.after.accuracy).toBeCloseTo(0.9);
    expect(c.before.medianMs).toBe(3000);
    expect(c.after.medianMs).toBe(1000);
    expect(compareRecent(appendLog([], [att(0, true, 1)]), {})).toBeNull();
  });

  it('sanitizes imported logs', () => {
    expect(sanitizeLog('x')).toEqual([]);
    expect(
      sanitizeLog([
        { t: 1, k: 'a|b|1|min|1-3|*|-|', ok: true, ms: 5 },
        { t: 'x' },
        { t: 1, k: 'short', ms: 1 },
      ]),
    ).toEqual([{ t: 1, k: 'a|b|1|min|1-3|*|-|', ok: 1, ms: 5 }]);
  });
});
