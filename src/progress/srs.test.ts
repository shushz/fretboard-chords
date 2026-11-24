import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../prefs/model';
import { type ItemStats, updateStats } from './stats';
import { dueItems, makeItemWeight, matchesItem, srsWeight } from './srs';
import type { Attempt, Item } from './types';
import { drillConfig, drillQueue, occurrence } from '../exercises/drill';
import { reviewConfig, reviewWeight } from '../exercises/review';
import { itemKey } from './types';

const item = (o: Partial<Item> = {}): Item => ({
  mode: 'find',
  key: 'Ebm',
  degree: 3,
  quality: 'min',
  stringSet: '2-4',
  inversion: '*',
  anchor: null,
  ...o,
});
const run = (results: boolean[], ms = 1500, at = 0, it = item()) => {
  let s: ItemStats | undefined;
  results.forEach((ok, i) => {
    const a: Attempt = { item: it, correct: ok, timeMs: ms, at: at + i, sevenths: false };
    s = updateStats(s, a);
  });
  return s!;
};
const o = {
  now: 1_000,
  thresholds: { accuracy: 0.9, triadMs: 3000, seventhMs: 5000 },
  freshShare: 0.2,
};

describe('spaced repetition', () => {
  it('weak and due items weigh more than mastered ones', () => {
    const weak = run([false, false, true]);
    const mastered = run(Array(10).fill(true), 1500, 0);
    const masteredNotDue = { ...mastered, due: o.now + 1e9 };
    expect(srsWeight(undefined, item(), o)).toBe(1);
    expect(srsWeight(weak, item(), o)).toBeGreaterThan(3);
    expect(srsWeight(masteredNotDue, item(), o)).toBe(0.25);
    expect(srsWeight({ ...mastered, due: 0 }, item(), o)).toBeGreaterThan(1);
    const slow = run(Array(10).fill(true), 9000);
    expect(srsWeight({ ...slow, due: o.now + 1e9 }, item(), o)).toBeGreaterThan(1);
  });
  it('fresh share switches to uniform weights', () => {
    const weak = run([false, false]);
    const stats = { [weak.key]: weak };
    expect(makeItemWeight(stats, o, () => 0.1)(item())).toBe(1);
    expect(makeItemWeight(stats, o, () => 0.5)(item())).toBeGreaterThan(1);
  });
  it('due list and matching', () => {
    const a = { ...run([true]), due: 5 };
    const b = { ...run([true], 1, 0, item({ degree: 1 })), due: 2 };
    expect(dueItems({ [a.key]: a, [b.key]: b }, 10).map((s) => s.key)).toEqual([b.key, a.key]);
    expect(matchesItem(item({ inversion: '*' }), item({ inversion: 'first' }))).toBe(true);
    expect(matchesItem(item(), item({ degree: 1 }))).toBe(false);
  });
});

describe('drilling', () => {
  const p = DEFAULT_PREFERENCES;
  it('builds a targeted config per item', () => {
    const c = drillConfig(item({ anchor: 6 }), p)!;
    expect(c.degrees).toEqual([3]);
    expect(c.stringSets).toEqual(['2-4']);
    expect(c.tapRoot).toBe(true);
    expect(c.anchorStrings).toEqual([6]);
    const t = drillConfig(item({ mode: 'nameTones', stringSet: '*', variant: 'tap b3 s2' }), p)!;
    expect(t.variant).toBe('tap');
    expect(t.stringSets).toEqual(['1-3', '2-4']);
    expect(drillConfig(item({ mode: 'progression' }), p)!.mode).toBe('find');
    expect(drillConfig(item({ key: 'Gbm' }), p)!.key.tonic.letter).toBe('G');
  });
  it('review weight only accepts the exact item', () => {
    const target = item({ mode: 'fromTonic', inversion: 'first' });
    const w = reviewWeight(target);
    expect(w(target)).toBe(1);
    expect(w({ ...target, inversion: 'root' })).toBe(0);
    const tw = reviewWeight(item({ mode: 'nameTones', stringSet: '*', variant: 'tap b3 s2' }));
    expect(tw(item({ mode: 'nameTones', stringSet: '*', variant: 'tap b3 s2' }))).toBe(1);
    expect(tw(item({ mode: 'nameTones', stringSet: '*', variant: 'tap R s2' }))).toBe(0);
    // a progression step is asked as Find the chord but recorded as a progression step
    const prog = drillConfig(item({ mode: 'progression', inversion: '*' }), p)!;
    expect(prog.mode).toBe('find');
    expect(prog.recordAs).toBe('progression');
    expect(
      reviewWeight(item({ mode: 'progression', inversion: '*' }))(item({ inversion: '*' })),
    ).toBe(1);
  });
});

describe('drill queues', () => {
  const a = item({ degree: 0 });
  const b = item({ degree: 3 });
  const c = item({ degree: 4 });
  function seeded(seed = 3) {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  }
  it('review asks each item once; no padding with repeats', () => {
    expect(drillQueue([a], 1, seeded())).toEqual([a]);
    expect(drillQueue([a, b, c], 1, seeded())).toHaveLength(3);
  });
  it('drill asks each item twice, never back to back', () => {
    for (let seed = 1; seed < 50; seed++) {
      const q = drillQueue([a, b, c], 2, seeded(seed));
      expect(q).toHaveLength(6);
      for (let i = 1; i < q.length; i++) expect(q[i]).not.toBe(q[i - 1]);
      expect(occurrence(q, q.lastIndexOf(a))).toBe(1);
    }
  });
  it('first review in the stored window; a repeat in a different window that still fits', () => {
    const p = DEFAULT_PREFERENCES;
    const it = item({ mode: 'find', inversion: '*', degree: 0 });
    expect(reviewConfig(it, p, { start: 2, width: 5 }, seeded())!.window).toEqual({
      start: 2,
      width: 5,
    });
    expect(reviewConfig(it, p, undefined, seeded())!.window).toEqual(p.fretboard.window);
    for (let seed = 1; seed < 20; seed++) {
      const w = reviewConfig(it, p, { start: 2, width: 5 }, seeded(seed), 2)!.window;
      expect(w.start).not.toBe(2);
      expect(w.start + w.width - 1).toBeLessThanOrEqual(p.fretboard.fretRange);
    }
    expect(itemKey(it)).toContain('find|');
  });
});
