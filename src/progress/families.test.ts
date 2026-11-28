import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../prefs/model';
import { appendLog } from './log';
import { buildFamilies, dueFamilies, familyKey, familyOf, updateFamilies } from './families';
import { type ItemStats, updateStats } from './stats';
import { type Attempt, type Item, itemKey } from './types';
import { reviewConfig, recordedItems, reviewWeight } from '../exercises/review';
import { drillConfig } from '../exercises/drill';
import { keyLabel, itemLabel } from './labels';

const DAY = 86_400_000;
const item = (o: Partial<Item> = {}): Item => ({
  mode: 'fromTonic',
  key: 'E',
  degree: 3,
  quality: 'maj',
  stringSet: '2-4',
  inversion: 'root',
  anchor: null,
  ...o,
});
const att = (it: Item, ok: boolean, at: number, ms = 2000): Attempt => ({
  item: it,
  correct: ok,
  timeMs: ms,
  at,
  sevenths: false,
});

describe('question types (families)', () => {
  it('drop the key, keep major/minor', () => {
    expect(familyKey(item({ key: 'Eb' }))).toBe(familyKey(item({ key: 'A' })));
    expect(familyKey(item({ key: 'Ebm' }))).not.toBe(familyKey(item({ key: 'Eb' })));
    expect(familyOf(item({ key: 'Ebm' }))!.key).toBe('@minor');
    expect(keyLabel('@major')).toBe('major keys');
    expect(itemLabel(familyOf(item())!, DEFAULT_PREFERENCES)).toContain('IV');
  });

  it('answers in any key update one review state', () => {
    const t0 = 1_000_000;
    const log = appendLog(
      [],
      ['C', 'G', 'D', 'A'].map((k, i) => att(item({ key: k }), i !== 3, t0 + i * 1000)),
    );
    const f = buildFamilies(log, {});
    expect(Object.keys(f)).toHaveLength(1);
    const s = Object.values(f)[0];
    expect(s.attempts).toBe(4);
    expect(s.box).toBe(1); // the last one was wrong
    // and the next answer, in yet another key, moves it on
    const next = updateFamilies(f, [att(item({ key: 'F' }), true, t0 + 9000)]);
    expect(Object.values(next)[0].box).toBe(2);
  });

  it('families with no answers in the log start from their latest per-key item', () => {
    const old = updateStats(undefined, att(item({ key: 'Bb' }), true, 5));
    const older = updateStats(undefined, att(item({ key: 'G' }), false, 1));
    const f = buildFamilies([], { [old.key]: old, [older.key]: older });
    const s = f[familyKey(item())!];
    expect(s.lastSeen).toBe(5);
    expect(s.key).toBe(familyKey(item()));
  });

  it('is retired only when every item of it is', () => {
    const a = { ...updateStats(undefined, att(item({ key: 'C' }), false, 1)), retired: true };
    const b = updateStats(undefined, att(item({ key: 'D' }), false, 2));
    expect(buildFamilies([], { [a.key]: a, [b.key]: b })[familyKey(item())!].retired).toBeFalsy();
    const b2 = { ...b, retired: true };
    expect(buildFamilies([], { [a.key]: a, [b2.key]: b2 })[familyKey(item())!].retired).toBe(true);
  });

  it('due list: last answer wrong first (latest first), then most overdue', () => {
    const now = 100 * DAY;
    const mk = (deg: number, ok: boolean, at: number): [string, ItemStats] => {
      const s = updateStats(undefined, att(familyOf(item({ degree: deg }))!, ok, at));
      return [s.key, s];
    };
    const fams = Object.fromEntries([
      mk(1, true, now - 10 * DAY), // right, due long ago
      mk(3, false, now - 5 * DAY), // wrong, older
      mk(4, false, now - 1 * DAY), // wrong, latest
      mk(5, true, now - 3 * DAY), // right, due more recently
    ]);
    expect(dueFamilies(fams, now).map((s) => s.key.split('|')[2])).toEqual(['4', '3', '1', '5']);
  });

  it('a review of a question type is asked in some key, and updates that type', () => {
    const p = DEFAULT_PREFERENCES;
    const fam = familyOf(item({ key: 'Ab' }))!;
    const keys = new Set<string>();
    for (let i = 0; i < 20; i++) keys.add(drillConfig(fam, p)!.key.tonic.letter);
    expect(keys.size).toBeGreaterThan(2);
    const cfg = reviewConfig(fam, p, undefined, Math.random)!;
    const got = recordedItems(cfg, p, Math.random, reviewWeight(fam))!;
    expect(got.map(familyKey)).toContain(itemKey(fam));
  });

  it('turns a week of random-key practice into far fewer reviews', () => {
    // 7 days of the first guided-style questions in random keys, 75 % right
    let seed = 7;
    const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'];
    const t0 = new Date(2026, 10, 20, 18).getTime();
    const attempts: Attempt[] = [];
    for (let d = 0; d < 7; d++)
      for (let q = 0; q < 60; q++) {
        const it = item({
          key: keys[Math.floor(rand() * 12)],
          degree: [3, 4, 1, 5][Math.floor(rand() * 4)],
          inversion: (['root', 'first', 'second'] as const)[Math.floor(rand() * 3)],
        });
        attempts.push(att(it, rand() < 0.75, t0 + d * DAY + q * 60_000));
      }
    const stats: Record<string, ItemStats> = {};
    for (const a of attempts) stats[itemKey(a.item)] = updateStats(stats[itemKey(a.item)], a);
    const now = t0 + 7 * DAY;
    const perKey = Object.values(stats).filter((s) => s.due <= now).length;
    const perType = dueFamilies(buildFamilies(appendLog([], attempts), stats), now).length;
    expect(perType).toBeLessThanOrEqual(12); // 4 chords × 3 shapes
    expect(perKey).toBeGreaterThan(5 * perType);
  });
});
