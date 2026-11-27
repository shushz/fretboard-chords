import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../prefs/model';
import { itemKey, type Item } from '../progress/types';
import type { LogEntry } from '../progress/log';
import { recordedItems } from '../exercises/review';
import { CURRICULUM, type Target, targetId } from './curriculum';
import { guidedConfig, keysFor } from './config';
import {
  EMPTY_GUIDED,
  advance,
  currentIndex,
  learnedTargets,
  matchesTarget,
  retention,
  stepProgress,
  targetState,
} from './progress';
import { NEW_FIRST, chooseTarget, newShare, sessionKinds } from './plan';

const P = DEFAULT_PREFERENCES;

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** A log entry for an item matching `t` in key `key`. */
function answer(t: Target, ok: boolean, at: number, ms = 2000, key = 'E'): LogEntry {
  const item: Item = {
    mode: t.mode,
    key: t.keyMode === 'minor' ? `${key}m` : key,
    degree: t.degree,
    quality: 'maj',
    stringSet: t.stringSet,
    inversion: t.inversion ?? 'root',
    anchor: null,
    variant: t.mode === 'nameTones' ? 'label' : undefined,
  };
  return { t: at, k: itemKey(item), ok: ok ? 1 : 0, ms };
}

describe('the path', () => {
  it('has unique steps and targets, starting from the tonic on strings 2–4', () => {
    const ids = CURRICULUM.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of CURRICULUM) {
      expect(s.targets.length).toBeGreaterThan(0);
      expect(new Set(s.targets.map(targetId)).size).toBe(s.targets.length);
    }
    expect(CURRICULUM[0].targets.every((t) => t.mode === 'fromTonic')).toBe(true);
    expect(CURRICULUM[0].targets[0]).toMatchObject({ stringSet: '2-4', inversion: 'root' });
    // From the tonic comes before Find the chord on every string set
    for (const set of ['2-4', '1-3', '3-5']) {
      const first = (m: string) =>
        CURRICULUM.findIndex((s) => s.targets.some((t) => t.mode === m && t.stringSet === set));
      expect(first('fromTonic')).toBeLessThan(first('nameTones'));
      expect(first('nameTones')).toBeLessThan(first('find'));
    }
  });

  it('every target can be asked, in random keys, and its answer counts for it', () => {
    const misses: string[] = [];
    for (const step of CURRICULUM)
      for (const t of step.targets)
        for (let seed = 1; seed <= 6; seed++) {
          const rand = seeded(seed * 31 + t.degree);
          const cfg = guidedConfig(t, P, rand);
          const got = recordedItems(cfg, P, rand);
          if (!got?.some((i) => matchesTarget(t, i))) misses.push(`${step.id} ${targetId(t)}`);
        }
    expect(misses).toEqual([]);
  });

  it('asks in many keys', () => {
    const t = CURRICULUM[0].targets[0];
    const keys = new Set<string>();
    const rand = seeded(9);
    for (let i = 0; i < 60; i++) keys.add(guidedConfig(t, P, rand).key.tonic.letter);
    expect(keys.size).toBeGreaterThan(4);
    expect(keysFor(t, P).every((k) => k.mode === 'major')).toBe(true);
  });
});

describe('progress', () => {
  const t = CURRICULUM[0].targets[0];
  it('a target is solid at 4 of the last 5 right, in any keys, and not slow', () => {
    const keys = ['C', 'G', 'D', 'A', 'E'];
    const good = keys.map((k, i) => answer(t, i !== 2, i, 2000, k));
    expect(targetState(good, t).solid).toBe(true);
    expect(targetState(good.slice(1), t).solid).toBe(false); // only 4 answers
    const slow = keys.map((k, i) => answer(t, true, i, 9000, k));
    expect(targetState(slow, t).solid).toBe(false);
    const shaky = keys.map((k, i) => answer(t, i % 2 === 0, i, 2000, k));
    expect(targetState(shaky, t).solid).toBe(false);
  });

  it('passes the step when all its targets are solid, and stays passed', () => {
    const step = CURRICULUM[0];
    const log = step.targets.flatMap((x, j) =>
      [0, 1, 2, 3, 4].map((i) => answer(x, true, 100 * j + i)),
    );
    expect(stepProgress(log, EMPTY_GUIDED, 0).solid).toBe(step.targets.length);
    const { state, passed } = advance(log, EMPTY_GUIDED, 1000);
    expect(passed.map((s) => s.id)).toEqual([step.id]);
    expect(currentIndex(state)).toBe(1);
    // forgetting later doesn't take the step back
    const later = [...log, ...[0, 1, 2, 3, 4].map((i) => answer(step.targets[0], false, 2000 + i))];
    expect(advance(later, state, 3000).state).toEqual(state);
    expect(learnedTargets(state).map(targetId)).toEqual(step.targets.map(targetId));
  });

  it('a step without hints counts only answers given since it opened', () => {
    const i = CURRICULUM.findIndex((s) => s.fresh);
    const step = CURRICULUM[i];
    const passed = Object.fromEntries(CURRICULUM.slice(0, i).map((s) => [s.id, 5000]));
    const s = { passed };
    const old = step.targets.flatMap((x) => [0, 1, 2, 3, 4].map((k) => answer(x, true, 10 + k)));
    expect(stepProgress(old, s, i).solid).toBe(0);
    const fresh = step.targets.flatMap((x) =>
      [0, 1, 2, 3, 4].map((k) => answer(x, true, 6000 + k)),
    );
    expect(stepProgress([...old, ...fresh], s, i).solid).toBe(step.targets.length);
  });

  it('"still solid" is the share right among recent answers to learned things', () => {
    const step = CURRICULUM[0];
    const s = { passed: { [step.id]: 1 } };
    expect(retention([], s)).toBeNull();
    const log = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => answer(step.targets[i % 2], i < 6, i));
    expect(retention(log, s)).toBeCloseTo(6 / 8);
    expect(retention(log, EMPTY_GUIDED)).toBeNull();
  });
});

describe('sessions', () => {
  it('mix: about 60 / 25 / 15, new material first, then spread out', () => {
    const k = sessionKinds(20, 0.6);
    expect(k).toHaveLength(20);
    expect(k.filter((x) => x === 'new')).toHaveLength(12);
    expect(k.filter((x) => x === 'review')).toHaveLength(5);
    expect(k.filter((x) => x === 'check')).toHaveLength(3);
    expect(k.slice(0, NEW_FIRST).every((x) => x === 'new')).toBe(true);
    // no long runs of old material after the start
    const tail = k.slice(NEW_FIRST).join(',');
    expect(tail).not.toMatch(/review,review,review/);
    expect(sessionKinds(20, 1).every((x) => x === 'new')).toBe(true);
  });

  it('all new at first; less new when old material is shaky; none when the path is done', () => {
    expect(newShare([], EMPTY_GUIDED)).toBe(1);
    const step = CURRICULUM[0];
    const s = { passed: { [step.id]: 1 } };
    const good = [0, 1, 2, 3, 4, 5].map((i) => answer(step.targets[i % 2], true, i));
    expect(newShare(good, s)).toBe(0.6);
    const bad = [0, 1, 2, 3, 4, 5].map((i) => answer(step.targets[i % 2], i < 2, i));
    expect(newShare(bad, s)).toBe(0.4);
    const done = { passed: Object.fromEntries(CURRICULUM.map((x) => [x.id, 1])) };
    expect(newShare([], done)).toBe(0);
  });

  it('picks new targets from the current step, old ones from passed steps, never twice in a row', () => {
    const step = CURRICULUM[0];
    const s = { passed: { [step.id]: 1 } };
    const rand = seeded(4);
    const cur = new Set(CURRICULUM[1].targets.map(targetId));
    const old = new Set(step.targets.map(targetId));
    let prev: string | undefined;
    for (let i = 0; i < 30; i++) {
      const n = chooseTarget('new', [], s, 0, rand, prev)!;
      expect(cur.has(targetId(n.target))).toBe(true);
      expect(targetId(n.target)).not.toBe(prev);
      prev = targetId(n.target);
      const r = chooseTarget(i % 2 ? 'review' : 'check', [], s, 0, rand)!;
      expect(old.has(targetId(r.target))).toBe(true);
    }
    // nothing learned yet: review falls back to new
    expect(chooseTarget('review', [], EMPTY_GUIDED, 0, rand)!.kind).toBe('new');
  });
});
