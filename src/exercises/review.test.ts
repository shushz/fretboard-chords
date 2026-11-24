/**
 * Reviews must update the item they review. For items that normal practice records, in
 * any fret window, the review question (reviewConfig + reviewWeight) must record that same
 * item; otherwise a review never clears it and "Review due items" never reaches 0.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../prefs/model';
import { selectableKeys } from '../theory/keys';
import type { FretWindow } from '../fretboard/regions';
import { type Item, type ModeId, itemKey, parseItemKey } from '../progress/types';
import { defaultConfig } from './config';
import { recordedItems, reviewConfig, reviewWeight } from './review';

const P = DEFAULT_PREFERENCES;
const KEYS = selectableKeys(P.spelling);

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const VARIANTS: Record<ModeId, (string | undefined)[]> = {
  find: [undefined],
  fromTonic: ['neck', 'window'],
  nextShape: ['up', 'down'],
  nameTones: ['label', 'tap'],
  qualitySwitch: [undefined],
  progression: [undefined],
  nameChord: [undefined],
};

/** Items normal practice records, with the window each was practiced in. */
function practiceItems(mode: ModeId): { item: Item; window: FretWindow }[] {
  const out = new Map<string, { item: Item; window: FretWindow }>();
  const rand = seeded(11);
  for (const key of KEYS.filter((_, i) => i % 3 === 0))
    for (const variant of VARIANTS[mode])
      for (const tapRoot of mode === 'find' ? [false, true] : [false])
        for (let n = 0; n < 8; n++) {
          // practice happens in any fret window, not just the default one
          const window = { start: Math.floor(rand() * 11), width: 5 };
          const cfg = { ...defaultConfig(mode, key, P, rand), variant, tapRoot, window };
          for (const item of recordedItems(cfg, P, rand) ?? [])
            out.set(itemKey(item), { item, window });
        }
  return [...out.values()];
}

describe('a review question updates the item it reviews', () => {
  for (const mode of Object.keys(VARIANTS) as ModeId[]) {
    it(mode, () => {
      const items = practiceItems(mode);
      expect(items.length).toBeGreaterThan(5);
      const misses: string[] = [];
      const rand = seeded(5);
      for (const { item, window } of items) {
        // with the window remembered (new data) and without it (stats saved before)
        for (const stored of [window, undefined]) {
          const cfg = reviewConfig(item, P, stored, rand)!;
          const got = recordedItems(cfg, P, rand, reviewWeight(item));
          if (!got?.some((g) => itemKey(g) === itemKey(item)))
            misses.push(
              `${itemKey(item)} (${stored ? 'stored' : 'no'} window) → ${got?.map(itemKey) ?? 'none'}`,
            );
        }
      }
      expect(misses, `${misses.length} of ${items.length * 2} reviews miss their item`).toEqual([]);
    });
  }
});

describe('items that can no longer be asked', () => {
  it('get no question rather than a different one (Name the chord no longer asks the tonic)', () => {
    const tonic = parseItemKey('nameChord|E|0|maj|*|*|-|forward');
    expect(reviewConfig(tonic, P, undefined, seeded(1))).toBeNull();
    // the vi of the same key is fine
    const vi = parseItemKey('nameChord|E|5|min|*|*|-|forward');
    const cfg = reviewConfig(vi, P, undefined, seeded(1))!;
    expect(recordedItems(cfg, P, seeded(2), reviewWeight(vi))!.map(itemKey)).toEqual([itemKey(vi)]);
  });
});
