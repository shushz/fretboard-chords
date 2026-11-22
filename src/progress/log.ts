/**
 * Per-answer log (pure helpers). Item stats keep only the current state (last 10 tries);
 * the log keeps every answer, so we can show improvement over time for any slice
 * (a mode, or one chord function on one string set).
 */
import { median } from '../exercises/session';
import { parseKeyName } from '../theory/keys';
import type { StringSetId } from '../fretboard/regions';
import { dayKey } from './stats';
import { type Attempt, type Item, type ModeId, itemKey, parseItemKey } from './types';

export interface LogEntry {
  /** Epoch ms. */
  t: number;
  /** Item key (mode|key|degree|quality|stringSet|inversion|anchor|variant). */
  k: string;
  ok: 0 | 1;
  /** Answer time, ms. */
  ms: number;
}

/** Keep the log bounded (~1–2 MB): the oldest answers go first. */
export const LOG_CAP = 20_000;

export function appendLog(
  log: readonly LogEntry[],
  attempts: readonly Attempt[],
  cap = LOG_CAP,
): LogEntry[] {
  const add = attempts.map((a) => ({
    t: a.at,
    k: itemKey(a.item),
    ok: (a.correct ? 1 : 0) as 0 | 1,
    ms: Math.round(a.timeMs),
  }));
  const out = [...log, ...add];
  return out.length > cap ? out.slice(out.length - cap) : out;
}

/**
 * A chord function: one numeral of major or minor keys (across all keys), on one string
 * set. "iv in minor keys, strings 2–4" — the thing you actually practise; the key matters
 * less than the shape.
 */
export interface ChordFunction {
  keyMode: 'major' | 'minor';
  degree: number;
  quality: string;
  stringSet: StringSetId | '*';
}

export function functionOf(item: Item): ChordFunction {
  return {
    keyMode: parseKeyName(item.key)?.mode ?? 'major',
    degree: item.degree,
    quality: item.quality,
    stringSet: item.stringSet,
  };
}

export function functionKey(f: ChordFunction): string {
  return `${f.keyMode}|${f.degree}|${f.quality}|${f.stringSet}`;
}

export interface TrendFilter {
  mode?: ModeId;
  fn?: ChordFunction;
}

const parsed = new Map<string, Item>();
function itemOf(k: string): Item {
  let i = parsed.get(k);
  if (!i) {
    i = parseItemKey(k);
    parsed.set(k, i);
  }
  return i;
}

export function matchesFilter(item: Item, f: TrendFilter): boolean {
  if (f.mode && item.mode !== f.mode) return false;
  if (f.fn && functionKey(functionOf(item)) !== functionKey(f.fn)) return false;
  return true;
}

export interface TrendPoint {
  day: string;
  answers: number;
  accuracy: number;
  /** Median time of correct answers (ms), null if none. */
  medianMs: number | null;
}

/** One point per practice day (days without practice are skipped), the latest `maxDays`. */
export function dailyTrend(log: readonly LogEntry[], f: TrendFilter, maxDays = 30): TrendPoint[] {
  const days = new Map<string, LogEntry[]>();
  for (const e of log) {
    if (!matchesFilter(itemOf(e.k), f)) continue;
    const d = dayKey(e.t);
    const arr = days.get(d) ?? [];
    arr.push(e);
    days.set(d, arr);
  }
  const pts = [...days.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, es]) => {
      const ok = es.filter((e) => e.ok);
      return {
        day,
        answers: es.length,
        accuracy: ok.length / es.length,
        medianMs: ok.length ? median(ok.map((e) => e.ms)) : null,
      };
    });
  return pts.slice(-maxDays);
}

export interface Comparison {
  /** Practice days in each half. */
  days: number;
  before: { accuracy: number; medianMs: number | null };
  after: { accuracy: number; medianMs: number | null };
}

/**
 * Recent practice vs. earlier practice: the last `n` practice days against the `n`
 * before them (or, with fewer days, the later half against the earlier half).
 * Weighted by answers, so a day with 3 answers doesn't count as much as one with 60.
 */
export function compareRecent(log: readonly LogEntry[], f: TrendFilter, n = 7): Comparison | null {
  const byDay = new Map<string, LogEntry[]>();
  for (const e of log) {
    if (!matchesFilter(itemOf(e.k), f)) continue;
    const d = dayKey(e.t);
    byDay.set(d, [...(byDay.get(d) ?? []), e]);
  }
  const days = [...byDay.keys()].sort();
  if (days.length < 2) return null;
  const half = Math.min(n, Math.floor(days.length / 2));
  const pick = (ds: string[]) => ds.flatMap((d) => byDay.get(d)!);
  const summarize = (es: LogEntry[]) => {
    const ok = es.filter((e) => e.ok);
    return {
      accuracy: ok.length / es.length,
      medianMs: ok.length ? median(ok.map((e) => e.ms)) : null,
    };
  };
  return {
    days: half,
    before: summarize(pick(days.slice(-2 * half, -half))),
    after: summarize(pick(days.slice(-half))),
  };
}

/** Parse untrusted log entries (backup import). Invalid ones are dropped. */
export function sanitizeLog(v: unknown): LogEntry[] {
  if (!Array.isArray(v)) return [];
  const out: LogEntry[] = [];
  for (const e of v) {
    if (!e || typeof e !== 'object') continue;
    const r = e as Record<string, unknown>;
    if (typeof r.t !== 'number' || typeof r.k !== 'string' || typeof r.ms !== 'number') continue;
    if (r.k.split('|').length < 7) continue;
    out.push({ t: r.t, k: r.k, ok: r.ok ? 1 : 0, ms: r.ms });
  }
  return out.slice(-LOG_CAP);
}
