import { describe, expect, it } from 'vitest';
import { appendLog, functionKey, functionOf } from './log';
import {
  RAW_DAYS,
  compact,
  compare,
  rawFrom,
  rollUp,
  sanitizeRollups,
  trend,
  weekOf,
  weightedMedian,
} from './history';
import { dayKey } from './stats';
import type { Attempt, Item } from './types';

const DAY = 86_400_000;
const t0 = new Date(2026, 0, 5, 12).getTime(); // a Monday
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

/** A year of daily practice: 40 answers a day, getting better and faster. */
function year(): Attempt[] {
  const out: Attempt[] = [];
  for (let d = 0; d < 365; d++)
    for (let i = 0; i < 40; i++) {
      const it = item({ mode: i % 2 ? 'find' : 'fromTonic', degree: (i % 4) as 0 | 1 | 2 | 3 });
      out.push(att(d, i < 20 + d / 20, 5000 - d * 8 + (i % 7) * 100, it));
    }
  return out;
}

describe('weighted median', () => {
  it('is the plain median with unit weights', () => {
    expect(weightedMedian([1, 3, 2].map((v) => ({ v, w: 1 })))).toBe(2);
    expect(weightedMedian([1, 2, 3, 4].map((v) => ({ v, w: 1 })))).toBe(2.5);
    expect(weightedMedian([])).toBeNull();
  });
  it('respects weights', () => {
    expect(
      weightedMedian([
        { v: 1, w: 1 },
        { v: 10, w: 5 },
      ]),
    ).toBe(10);
  });
});

describe('rollups', () => {
  it('summarize a day per mode and chord function', () => {
    const log = appendLog(
      [],
      [
        att(0, true, 1000),
        att(0, false, 9000),
        att(0, true, 3000),
        att(0, true, 2000, item({ mode: 'find' })),
      ],
    );
    const r = rollUp(log);
    expect(r).toHaveLength(2);
    const tonic = r.find((x) => x.m === 'fromTonic')!;
    expect(tonic).toMatchObject({ d: dayKey(t0), n: 3, ok: 2, q: [1000, 3000] });
    expect(tonic.f).toBe(functionKey(functionOf(item())));
  });

  it('keep the last RAW_DAYS days raw and summarize the rest, once', () => {
    const log = appendLog([], year());
    const now = t0 + 364 * DAY;
    const c = compact(log, [], now);
    expect(new Set(c.log.map((e) => dayKey(e.t))).size).toBe(RAW_DAYS);
    expect(c.log.every((e) => dayKey(e.t) >= rawFrom(now))).toBe(true);
    expect(new Set(c.rollups.map((r) => r.d)).size).toBe(365 - RAW_DAYS);
    // compacting again changes nothing
    const again = compact(c.log, c.rollups, now);
    expect(again.rollups).toHaveLength(c.rollups.length);
    expect(again.log).toHaveLength(c.log.length);
    // a year stays small: well under 1 MB as JSON
    expect(JSON.stringify(c.rollups).length).toBeLessThan(400_000);
  });

  it('give the same daily answers and accuracy as the raw log, and close medians', () => {
    const log = appendLog([], year());
    const now = t0 + 364 * DAY;
    const raw = trend({ log, rollups: [] }, {});
    const c = compact(log, [], now);
    const mixed = trend(c, {});
    expect(mixed.map((p) => p.day)).toEqual(raw.map((p) => p.day));
    expect(mixed.map((p) => p.answers)).toEqual(raw.map((p) => p.answers));
    mixed.forEach((p, i) => {
      expect(p.accuracy).toBeCloseTo(raw[i].accuracy, 10);
      expect(Math.abs(p.medianMs! - raw[i].medianMs!)).toBeLessThanOrEqual(300);
    });
    // filters work on summaries too
    const fn = functionKey(functionOf(item({ degree: 1 })));
    expect(trend(c, { fn })[0].answers).toBe(10);
    expect(trend(c, { mode: 'find' })[0].answers).toBe(20);
  });
});

describe('long trends', () => {
  it('group by week (Monday) and compare the last weeks with the first ones', () => {
    expect(weekOf(dayKey(t0))).toBe(dayKey(t0));
    expect(weekOf(dayKey(t0 + 6 * DAY))).toBe(dayKey(t0));
    expect(weekOf(dayKey(t0 + 7 * DAY))).toBe(dayKey(t0 + 7 * DAY));
    const c = compact(appendLog([], year()), [], t0 + 364 * DAY);
    const weeks = trend(c, {}, 'week');
    expect(weeks).toHaveLength(53);
    const cmp = compare(c, {}, 4, 'week', 'first')!;
    expect(cmp.count).toBe(4);
    expect(cmp.after.accuracy).toBeGreaterThan(cmp.before.accuracy + 0.3);
    expect(cmp.after.medianMs!).toBeLessThan(cmp.before.medianMs! - 2000);
  });
});

describe('sanitizeRollups', () => {
  it('keeps valid summaries only', () => {
    expect(sanitizeRollups('x')).toEqual([]);
    const ok = { d: '2026-01-05', m: 'find', f: 'minor|3|min|2-4', n: 3, ok: 2, q: [1, 'x', 2] };
    expect(
      sanitizeRollups([ok, { ...ok, d: 'yesterday' }, { ...ok, ok: 5 }, { ...ok, f: 'x' }]),
    ).toEqual([{ ...ok, q: [1, 2] }]);
  });
});
