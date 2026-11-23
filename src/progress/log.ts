/**
 * Per-answer log (pure helpers). Item stats keep only the current state (last 10 tries);
 * the log keeps every answer, so we can show improvement over time for any slice
 * (a mode, or one chord function on one string set).
 */
import { parseKeyName } from '../theory/keys';
import type { StringSetId } from '../fretboard/regions';
import { type Attempt, type Item, itemKey } from './types';

export interface LogEntry {
  /** Epoch ms. */
  t: number;
  /** Item key (mode|key|degree|quality|stringSet|inversion|anchor|variant). */
  k: string;
  ok: 0 | 1;
  /** Answer time, ms. */
  ms: number;
}

/**
 * Safety bound on raw answers. Normally the raw log holds only the last RAW_DAYS days
 * (older days are summarised, see history.ts); this only guards against runaway data.
 */
export const LOG_CAP = 100_000;

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
