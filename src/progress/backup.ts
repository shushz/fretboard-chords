/** JSON export/import of progress + preferences (pure validation). */
import { type Preferences, mergePreferences } from '../prefs/model';
import type { DayStats, ItemStats } from './stats';
import { parseItemKey } from './types';
import { type LogEntry, sanitizeLog } from './log';
import { type Rollup, sanitizeRollups } from './history';

export interface Backup {
  app: 'fretboard-chords';
  version: 1;
  exportedAt: string;
  preferences: Preferences;
  stats: Record<string, ItemStats>;
  daily: Record<string, DayStats>;
  /** Answer log (optional: backups from before it existed have none). */
  log?: LogEntry[];
  /** Per-day summaries of older practice (optional: older backups have none). */
  rollups?: Rollup[];
}

export function makeBackup(
  preferences: Preferences,
  stats: Record<string, ItemStats>,
  daily: Record<string, DayStats>,
  now: number,
  log: LogEntry[] = [],
  rollups: Rollup[] = [],
): Backup {
  return {
    app: 'fretboard-chords',
    version: 1,
    exportedAt: new Date(now).toISOString(),
    preferences,
    stats,
    daily,
    log,
    rollups,
  };
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function validStats(v: unknown): v is ItemStats {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.key === 'string' &&
    s.key.split('|').length >= 7 &&
    isNum(s.attempts) &&
    isNum(s.correct) &&
    Array.isArray(s.recent) &&
    isNum(s.lastSeen) &&
    isNum(s.box) &&
    isNum(s.due)
  );
}

export type ParseResult =
  { ok: true; backup: Backup; skipped: number } | { ok: false; error: string };

export function parseBackup(text: string): ParseResult {
  let o: unknown;
  try {
    o = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Not a valid JSON file.' };
  }
  if (typeof o !== 'object' || o === null) return { ok: false, error: 'Unexpected file content.' };
  const b = o as Record<string, unknown>;
  if (b.app !== 'fretboard-chords')
    return { ok: false, error: 'This is not a Fretboard Chords backup.' };
  if (b.version !== 1)
    return { ok: false, error: `Unsupported backup version ${String(b.version)}.` };
  const stats: Record<string, ItemStats> = {};
  let skipped = 0;
  if (typeof b.stats === 'object' && b.stats !== null) {
    for (const [k, v] of Object.entries(b.stats)) {
      if (validStats(v) && v.key === k) {
        parseItemKey(k);
        stats[k] = { ...v, firstSeen: isNum(v.firstSeen) ? v.firstSeen : v.lastSeen };
      } else skipped++;
    }
  }
  const daily: Record<string, DayStats> = {};
  if (typeof b.daily === 'object' && b.daily !== null) {
    for (const [k, v] of Object.entries(b.daily as Record<string, unknown>)) {
      const d = v as Record<string, unknown>;
      if (
        /^\d{4}-\d{2}-\d{2}$/.test(k) &&
        isNum(d?.attempts) &&
        isNum(d?.correct) &&
        isNum(d?.ms)
      ) {
        daily[k] = { attempts: d.attempts, correct: d.correct, ms: d.ms };
      } else skipped++;
    }
  }
  return {
    ok: true,
    skipped,
    backup: {
      app: 'fretboard-chords',
      version: 1,
      exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : '',
      preferences: mergePreferences(b.preferences),
      stats,
      daily,
      log: sanitizeLog(b.log),
      rollups: sanitizeRollups(b.rollups),
    },
  };
}

/** Remove all stats for one key (ASCII name), e.g. reset "Ebm". */
export function withoutKey(
  stats: Record<string, ItemStats>,
  key: string,
): Record<string, ItemStats> {
  const out: Record<string, ItemStats> = {};
  for (const [k, v] of Object.entries(stats)) if (parseItemKey(k).key !== key) out[k] = v;
  return out;
}
