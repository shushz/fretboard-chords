/** Item statistics, mastery, daily log and aggregation (pure). */
import { median } from '../exercises/session';
import { type Attempt, type Item, itemKey, parseItemKey } from './types';
import type { FretWindow } from '../fretboard/regions';

export const RECENT = 10;
export const MAX_BOX = 5;

export interface ItemStats {
  key: string;
  attempts: number;
  correct: number;
  /** Last RECENT results, oldest first. */
  recent: { ok: boolean; ms: number }[];
  firstSeen: number;
  lastSeen: number;
  /** Leitner box 1..5. */
  box: number;
  /** Epoch ms when the item is due again. */
  due: number;
  /**
   * Fret window of the last attempt. A review asks the item there again: a particular
   * shape (inversion, anchor string…) may not exist in other windows.
   */
  window?: FretWindow;
  /**
   * The item can't be asked any more (the mode changed, or a preference turned it off):
   * left out of reviews and the weakest list. Cleared by the next answer to it.
   */
  retired?: boolean;
}

const DAY = 86_400_000;
/**
 * Leitner intervals per box (ms): box 1 is due now (a mistake comes back in the next
 * review), then 1, 3, 7 and 21 days.
 */
export const BOX_INTERVALS = [0, DAY, 3 * DAY, 7 * DAY, 21 * DAY];
/** A right but slow answer moves up, but no further than this box (3 days). */
export const SLOW_MAX_BOX = 3;

/** Answer time that counts as fast: the mastery time for triads or sevenths. */
export interface FastTimes {
  triadMs: number;
  seventhMs: number;
}
const DEFAULT_FAST: FastTimes = { triadMs: 3000, seventhMs: 5000 };

/**
 * Add an answer. Box: wrong → 1; right and fast → one box up (to 5, 21 days); right but
 * slower than the mastery time → one box up but at most SLOW_MAX_BOX, so slow answers keep
 * coming back every few days until they're quick.
 */
export function updateStats(
  prev: ItemStats | undefined,
  a: Attempt,
  fast: FastTimes = DEFAULT_FAST,
): ItemStats {
  const key = itemKey(a.item);
  const base: ItemStats = prev ?? {
    key,
    attempts: 0,
    correct: 0,
    recent: [],
    firstSeen: a.at,
    lastSeen: a.at,
    box: 1,
    due: a.at,
  };
  const quick = a.timeMs <= (a.sevenths ? fast.seventhMs : fast.triadMs);
  const box = !a.correct
    ? 1
    : quick
      ? Math.min(MAX_BOX, base.box + 1)
      : Math.max(base.box, Math.min(SLOW_MAX_BOX, base.box + 1));
  return {
    ...base,
    retired: undefined, // answering it again un-retires it
    attempts: base.attempts + 1,
    correct: base.correct + (a.correct ? 1 : 0),
    recent: [...base.recent, { ok: a.correct, ms: Math.round(a.timeMs) }].slice(-RECENT),
    lastSeen: a.at,
    box,
    due: a.at + BOX_INTERVALS[box - 1],
    window: a.window ?? base.window,
  };
}

export function rollingAccuracy(s: ItemStats): number {
  if (s.recent.length === 0) return 0;
  return s.recent.filter((r) => r.ok).length / s.recent.length;
}

/** Median time of correct recent answers (falls back to all recent). */
export function medianTime(s: ItemStats): number {
  const ok = s.recent.filter((r) => r.ok).map((r) => r.ms);
  return median(ok.length ? ok : s.recent.map((r) => r.ms));
}

export interface MasteryThresholds {
  accuracy: number;
  triadMs: number;
  seventhMs: number;
}

export function isMastered(s: ItemStats, t: MasteryThresholds, sevenths: boolean): boolean {
  return (
    s.recent.length >= RECENT &&
    rollingAccuracy(s) >= t.accuracy &&
    medianTime(s) <= (sevenths ? t.seventhMs : t.triadMs)
  );
}

export function isSeventhItem(item: Item): boolean {
  return ['maj7', '7', 'm7', 'm7b5', 'dim7'].includes(item.quality);
}

// ---------------------------------------------------------------------------
// Daily log
// ---------------------------------------------------------------------------

export interface DayStats {
  attempts: number;
  correct: number;
  ms: number;
}

export function dayKey(at: number): string {
  const d = new Date(at);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function updateDaily(daily: Record<string, DayStats>, a: Attempt): Record<string, DayStats> {
  const k = dayKey(a.at);
  const d = daily[k] ?? { attempts: 0, correct: 0, ms: 0 };
  return {
    ...daily,
    [k]: {
      attempts: d.attempts + 1,
      correct: d.correct + (a.correct ? 1 : 0),
      // cap a single answer at 60 s so idle time doesn't inflate "minutes practiced"
      ms: d.ms + Math.min(60_000, a.timeMs),
    },
  };
}

/** Consecutive days with practice, ending today (or yesterday if not yet today). */
export function streak(daily: Record<string, DayStats>, now: number): number {
  // Step by calendar day, not 24 h: a 23-hour day (clocks going forward) would be skipped.
  const d = new Date(now);
  let n = 0;
  if (!daily[dayKey(d.getTime())]) d.setDate(d.getDate() - 1);
  while (daily[dayKey(d.getTime())]?.attempts) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function totalMinutes(daily: Record<string, DayStats>): number {
  return Object.values(daily).reduce((s, d) => s + d.ms, 0) / 60_000;
}

/** Last `days` days (oldest first) for trend charts. */
export function trend(daily: Record<string, DayStats>, now: number, days = 14) {
  const out: { day: string; attempts: number; accuracy: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const k = dayKey(date.getTime());
    const d = daily[k];
    out.push({
      day: k,
      attempts: d?.attempts ?? 0,
      accuracy: d?.attempts ? d.correct / d.attempts : null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export interface Aggregate {
  attempts: number;
  recentCount: number;
  recentCorrect: number;
  times: number[];
}

export function aggregate(stats: Iterable<ItemStats>): Aggregate {
  const a: Aggregate = { attempts: 0, recentCount: 0, recentCorrect: 0, times: [] };
  for (const s of stats) {
    a.attempts += s.attempts;
    a.recentCount += s.recent.length;
    a.recentCorrect += s.recent.filter((r) => r.ok).length;
    a.times.push(...s.recent.filter((r) => r.ok).map((r) => r.ms));
  }
  return a;
}

export function aggAccuracy(a: Aggregate): number | null {
  return a.recentCount ? a.recentCorrect / a.recentCount : null;
}

export function aggMedian(a: Aggregate): number | null {
  return a.times.length ? median(a.times) : null;
}

/** Group stats by a projection of their item. */
export function groupBy(
  stats: Record<string, ItemStats>,
  by: (item: Item) => string | null,
): Map<string, ItemStats[]> {
  const m = new Map<string, ItemStats[]>();
  for (const s of Object.values(stats)) {
    const g = by(parseItemKey(s.key));
    if (g === null) continue;
    const arr = m.get(g) ?? [];
    arr.push(s);
    m.set(g, arr);
  }
  return m;
}

/**
 * Weakness score: low recent accuracy and slow answers rank first. Items with fewer
 * than 3 attempts are skipped (not enough evidence).
 */
export function weakest(stats: Record<string, ItemStats>, n = 10, triadMs = 3000): ItemStats[] {
  return Object.values(stats)
    .filter((s) => s.attempts >= 3 && !s.retired)
    .map((s) => ({
      s,
      score: (1 - rollingAccuracy(s)) * 2 + Math.min(2, medianTime(s) / triadMs / 2),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.s);
}

/**
 * Share of the key's core degrees with at least one mastered triad item (any mode or
 * string set). Used to suggest moving on to sevenths (SPEC §5).
 */
export function triadMasteryForKey(
  stats: Record<string, ItemStats>,
  key: string,
  coreDegrees: readonly number[],
  t: MasteryThresholds,
): number {
  const mastered = new Set<number>();
  for (const s of Object.values(stats)) {
    const item = parseItemKey(s.key);
    if (item.key !== key || isSeventhItem(item)) continue;
    if (isMastered(s, t, false)) mastered.add(item.degree);
  }
  return coreDegrees.filter((d) => mastered.has(d)).length / coreDegrees.length;
}
