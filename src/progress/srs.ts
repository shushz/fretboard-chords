/** Spaced-repetition weighting for question selection (pure). SPEC §6. */
import {
  type ItemStats,
  isMastered,
  isSeventhItem,
  medianTime,
  rollingAccuracy,
  type MasteryThresholds,
} from './stats';
import { type Item, itemKey } from './types';

export interface SrsOptions {
  now: number;
  thresholds: MasteryThresholds;
  /** Share of questions picked without SRS bias (fresh/random), e.g. 0.2. */
  freshShare: number;
}

/**
 * Selection weight of an item: unseen items 1; seen items grow with error rate,
 * slowness and being due; mastered items that aren't due drop to 0.25.
 */
export function srsWeight(s: ItemStats | undefined, item: Item, o: SrsOptions): number {
  if (!s) return 1;
  const sevenths = isSeventhItem(item);
  const due = s.due <= o.now;
  if (!due && isMastered(s, o.thresholds, sevenths)) return 0.25;
  const target = sevenths ? o.thresholds.seventhMs : o.thresholds.triadMs;
  const err = 1 - rollingAccuracy(s);
  const slow = Math.max(0, Math.min(2, medianTime(s) / target - 1));
  return 1 + 4 * err + slow + (due ? 1.5 : 0);
}

/**
 * Build the item-weight function for one question: with probability `freshShare` every
 * item weighs the same (fresh/random pick), otherwise SRS weights apply.
 */
export function makeItemWeight(
  stats: Record<string, ItemStats>,
  o: SrsOptions,
  rand: () => number,
): (item: Item) => number {
  if (rand() < o.freshShare) return () => 1;
  return (item) => srsWeight(stats[itemKey(item)], item, o);
}

/** Does `item` match `pattern`? '*' in the pattern's string set / inversion matches anything. */
export function matchesItem(pattern: Item, item: Item): boolean {
  return (
    pattern.mode === item.mode &&
    pattern.key === item.key &&
    pattern.degree === item.degree &&
    pattern.quality === item.quality &&
    (pattern.stringSet === '*' || pattern.stringSet === item.stringSet) &&
    (pattern.inversion === '*' || pattern.inversion === item.inversion) &&
    (pattern.anchor ?? null) === (item.anchor ?? null) &&
    (pattern.variant ?? '') === (item.variant ?? '')
  );
}

/** Items that are due now, most overdue first. */
export function dueItems(stats: Record<string, ItemStats>, now: number): ItemStats[] {
  return Object.values(stats)
    .filter((s) => s.due <= now && !s.retired)
    .sort((a, b) => a.due - b.due);
}
