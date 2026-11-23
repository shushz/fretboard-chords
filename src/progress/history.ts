/**
 * Long-term answer history (pure). Recent answers are kept one by one; older days are folded
 * into compact per-day summaries ("rollups"), one per mode × chord function, so years of
 * practice stay small while the trend charts (one point per day or week) keep working.
 */
import { parseItemKey, type ModeId } from './types';
import { dayKey } from './stats';
import { type LogEntry, functionKey, functionOf } from './log';

/** Answers younger than this many days are kept one by one. */
export const RAW_DAYS = 60;

/** Correct-answer times kept per summary: these quantiles of the day's times. */
const QUANTILES = [0.1, 0.3, 0.5, 0.7, 0.9];

/** One day × mode × chord function, summarised. */
export interface Rollup {
  /** Day, YYYY-MM-DD (local). */
  d: string;
  m: ModeId;
  /** functionKey(functionOf(item)). */
  f: string;
  /** Answers. */
  n: number;
  /** Right answers. */
  ok: number;
  /** Times (ms) of right answers: all of them when few, else the QUANTILES. */
  q: number[];
}

/** A group of answers with weighted sample times (raw: weight 1 each). */
interface Cell {
  d: string;
  m: ModeId;
  f: string;
  n: number;
  ok: number;
  times: number[];
  /** Weight of each sample time. */
  w: number;
}

const parsedKeys = new Map<string, { m: ModeId; f: string }>();
function keyInfo(k: string): { m: ModeId; f: string } {
  let v = parsedKeys.get(k);
  if (!v) {
    const item = parseItemKey(k);
    v = { m: item.mode, f: functionKey(functionOf(item)) };
    parsedKeys.set(k, v);
  }
  return v;
}

function quantile(sorted: readonly number[], p: number): number {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo));
}

/** Group raw answers by day × mode × chord function. */
function rawCells(log: readonly LogEntry[]): Cell[] {
  const m = new Map<string, Cell>();
  for (const e of log) {
    const { m: mode, f } = keyInfo(e.k);
    const d = dayKey(e.t);
    const id = `${d}#${mode}#${f}`;
    let c = m.get(id);
    if (!c) {
      c = { d, m: mode, f, n: 0, ok: 0, times: [], w: 1 };
      m.set(id, c);
    }
    c.n++;
    if (e.ok) {
      c.ok++;
      c.times.push(e.ms);
    }
  }
  return [...m.values()];
}

/** Summarise raw answers (whole days) into rollups. */
export function rollUp(log: readonly LogEntry[]): Rollup[] {
  return rawCells(log).map((c) => {
    const s = [...c.times].sort((a, b) => a - b);
    return {
      d: c.d,
      m: c.m,
      f: c.f,
      n: c.n,
      ok: c.ok,
      q: s.length <= QUANTILES.length ? s : QUANTILES.map((p) => quantile(s, p)),
    };
  });
}

/** The first day kept raw: days before it are rolled up. */
export function rawFrom(now: number, rawDays = RAW_DAYS): string {
  const d = new Date(now);
  d.setDate(d.getDate() - (rawDays - 1));
  return dayKey(d.getTime());
}

/**
 * Split answers into those kept raw (from `rawFrom(now)` on) and rollups for older whole
 * days, merged with existing rollups. Days already summarised are not summarised again.
 */
export function compact(
  log: readonly LogEntry[],
  rollups: readonly Rollup[],
  now: number,
  rawDays = RAW_DAYS,
): { log: LogEntry[]; rollups: Rollup[] } {
  const from = rawFrom(now, rawDays);
  const old = log.filter((e) => dayKey(e.t) < from);
  if (!old.length) return { log: [...log], rollups: [...rollups] };
  const have = new Set(rollups.map((r) => r.d));
  const fresh = rollUp(old.filter((e) => !have.has(dayKey(e.t))));
  return {
    log: log.filter((e) => dayKey(e.t) >= from),
    rollups: [...rollups, ...fresh].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)),
  };
}

export interface TrendFilter {
  mode?: ModeId;
  /** functionKey of one chord function. */
  fn?: string;
}

export interface History {
  log: readonly LogEntry[];
  rollups: readonly Rollup[];
}

function cells(h: History, f: TrendFilter): Cell[] {
  const all: Cell[] = [
    ...h.rollups.map((r) => ({
      d: r.d,
      m: r.m,
      f: r.f,
      n: r.n,
      ok: r.ok,
      times: r.q,
      w: r.q.length ? r.ok / r.q.length : 0,
    })),
    ...rawCells(h.log),
  ];
  return all.filter((c) => (!f.mode || c.m === f.mode) && (!f.fn || c.f === f.fn));
}

/** Median of samples with weights (exact when every weight is 1). */
export function weightedMedian(samples: readonly { v: number; w: number }[]): number | null {
  const s = samples.filter((x) => x.w > 0).sort((a, b) => a.v - b.v);
  const total = s.reduce((a, x) => a + x.w, 0);
  if (!total) return null;
  let acc = 0;
  for (let i = 0; i < s.length; i++) {
    acc += s[i].w;
    if (acc > total / 2 + 1e-9) return s[i].v;
    // exactly half: average with the next sample (the usual median of an even count)
    if (Math.abs(acc - total / 2) < 1e-9) return (s[i].v + s[i + 1].v) / 2;
  }
  return s[s.length - 1].v;
}

export interface Summary {
  answers: number;
  accuracy: number;
  /** Median time of right answers (ms), null if none. */
  medianMs: number | null;
}

function summarize(cs: readonly Cell[]): Summary {
  const n = cs.reduce((a, c) => a + c.n, 0);
  const ok = cs.reduce((a, c) => a + c.ok, 0);
  return {
    answers: n,
    accuracy: n ? ok / n : 0,
    medianMs: weightedMedian(cs.flatMap((c) => c.times.map((v) => ({ v, w: c.w })))),
  };
}

/** Monday of the day's week, YYYY-MM-DD. */
export function weekOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return dayKey(dt.getTime());
}

export type Period = 'day' | 'week';

export interface TrendPoint extends Summary {
  /** The day, or the Monday of the week. */
  day: string;
}

/** One point per day (or week) with practice, oldest first. */
export function trend(h: History, f: TrendFilter, period: Period = 'day'): TrendPoint[] {
  const groups = new Map<string, Cell[]>();
  for (const c of cells(h, f)) {
    const k = period === 'day' ? c.d : weekOf(c.d);
    const arr = groups.get(k);
    if (arr) arr.push(c);
    else groups.set(k, [c]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, cs]) => ({ day, ...summarize(cs) }));
}

export interface Comparison {
  /** Periods (practice days or weeks) in each half. */
  count: number;
  before: Summary;
  after: Summary;
}

/**
 * Compare the last `n` periods with practice against the `n` before them (`against:
 * 'previous'`) or against the first `n` ever (`'first'`). With fewer periods, the later half
 * against the earlier half. Weighted by answers.
 */
export function compare(
  h: History,
  f: TrendFilter,
  n: number,
  period: Period = 'day',
  against: 'previous' | 'first' = 'previous',
): Comparison | null {
  const groups = new Map<string, Cell[]>();
  for (const c of cells(h, f)) {
    const k = period === 'day' ? c.d : weekOf(c.d);
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }
  const keys = [...groups.keys()].sort();
  if (keys.length < 2) return null;
  const half = Math.min(n, Math.floor(keys.length / 2));
  const pick = (ks: string[]) => ks.flatMap((k) => groups.get(k)!);
  const before = against === 'first' ? keys.slice(0, half) : keys.slice(-2 * half, -half);
  return {
    count: half,
    before: summarize(pick(before)),
    after: summarize(pick(keys.slice(-half))),
  };
}

/** Parse untrusted rollups (backup import). Invalid ones are dropped. */
export function sanitizeRollups(v: unknown): Rollup[] {
  if (!Array.isArray(v)) return [];
  const out: Rollup[] = [];
  const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
  for (const e of v) {
    if (!e || typeof e !== 'object') continue;
    const r = e as Record<string, unknown>;
    if (typeof r.d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.d)) continue;
    if (typeof r.m !== 'string' || typeof r.f !== 'string' || r.f.split('|').length !== 4) continue;
    if (!num(r.n) || !num(r.ok) || r.ok > r.n || r.n <= 0) continue;
    const q = Array.isArray(r.q) ? r.q.filter(num) : [];
    out.push({ d: r.d, m: r.m as ModeId, f: r.f, n: r.n, ok: r.ok, q });
  }
  return out;
}
