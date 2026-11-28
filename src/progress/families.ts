/**
 * Review by question type (pure). A *family* is an item with the key left out, only
 * whether it's major or minor: "I (root position) → IV on strings 2–4, major keys". Answers
 * in any key update it, and a review asks it in a random key. Shapes and moves are the same
 * in every key, so this is what's being learned; per-key items multiplied the review list
 * (a week of random-key practice: ~190 due items, ~40 families).
 *
 * Family state isn't stored: it's rebuilt from the answer log (plus per-key stats for days
 * older than the raw log), so it can't drift from the history.
 */
import { parseKeyName } from '../theory/keys';
import type { LogEntry } from './log';
import { type FastTimes, type ItemStats, isSeventhItem, updateStats } from './stats';
import { type Attempt, type Item, itemKey, parseItemKey } from './types';

/** Key field of a family item: '@major' or '@minor'. */
export function isFamilyKey(key: string): boolean {
  return key === '@major' || key === '@minor';
}

/** The family of an item (null for a key that doesn't parse). */
export function familyOf(item: Item): Item | null {
  if (isFamilyKey(item.key)) return item;
  const k = parseKeyName(item.key);
  return k ? { ...item, key: `@${k.mode}` } : null;
}

export function familyKey(item: Item): string | null {
  const f = familyOf(item);
  return f ? itemKey(f) : null;
}

const parsed = new Map<string, string | null>();
function familyKeyOf(k: string): string | null {
  let f = parsed.get(k);
  if (f === undefined) {
    f = familyKey(parseItemKey(k));
    parsed.set(k, f);
  }
  return f;
}

/**
 * Family stats from the history: the answer log replayed in order; families with no
 * answer in the log start from their most recently practiced per-key item. A family is
 * retired when all its items are.
 */
export function buildFamilies(
  log: readonly LogEntry[],
  stats: Record<string, ItemStats>,
  fast?: FastTimes,
): Record<string, ItemStats> {
  const out: Record<string, ItemStats> = {};
  for (const e of log) {
    const f = familyKeyOf(e.k);
    if (!f) continue;
    const item = parseItemKey(f);
    out[f] = updateStats(
      out[f],
      { item, correct: !!e.ok, timeMs: e.ms, at: e.t, sevenths: isSeventhItem(item) },
      fast,
    );
  }
  const latest: Record<string, ItemStats> = {};
  const allRetired: Record<string, boolean> = {};
  for (const s of Object.values(stats)) {
    const f = familyKeyOf(s.key);
    if (!f) continue;
    allRetired[f] = (allRetired[f] ?? true) && !!s.retired;
    if (!out[f] && (!latest[f] || s.lastSeen > latest[f].lastSeen)) latest[f] = s;
  }
  for (const [f, s] of Object.entries(latest)) out[f] = { ...s, key: f, window: undefined };
  for (const f of Object.keys(out)) {
    if (allRetired[f]) out[f] = { ...out[f], retired: true };
    else if (out[f].retired) out[f] = { ...out[f], retired: undefined };
  }
  return out;
}

/** Add answers to family stats (after recording them as per-key items). */
export function updateFamilies(
  families: Record<string, ItemStats>,
  attempts: readonly Attempt[],
  fast?: FastTimes,
): Record<string, ItemStats> {
  let out = families;
  for (const a of attempts) {
    const f = familyOf(a.item);
    if (!f) continue;
    const k = itemKey(f);
    out = { ...out, [k]: updateStats(out[k], { ...a, item: f, window: undefined }, fast) };
  }
  return out;
}

/**
 * Due families, most important first: the ones whose last answer was wrong (latest
 * first), then the most overdue.
 */
export function dueFamilies(families: Record<string, ItemStats>, now: number): ItemStats[] {
  const due = Object.values(families).filter((s) => s.due <= now && !s.retired);
  const missed = (s: ItemStats) => s.recent.length > 0 && !s.recent[s.recent.length - 1].ok;
  return due.sort((a, b) => {
    const ma = missed(a);
    const mb = missed(b);
    if (ma !== mb) return ma ? -1 : 1;
    return ma ? b.lastSeen - a.lastSeen : a.due - b.due;
  });
}

/** How many review questions are left for today, given those already answered. */
export function reviewsLeftToday(cap: number, answeredToday: number): number {
  return Math.max(0, cap - answeredToday);
}
