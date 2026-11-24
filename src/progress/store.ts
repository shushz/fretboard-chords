import { computed, signal } from '@preact/signals';
import { kvDel as del, kvGet as get, kvSet as set } from '../storage';
import { onAttempts, recordAttempts } from './record';
import { IS_PREVIEW } from '../env';
import { prefs } from '../prefs/store';
import { makeDemoAttempts } from './demo';
import { type DayStats, type ItemStats, dayKey, updateDaily, updateStats } from './stats';
import { itemKey } from './types';
import { type LogEntry, appendLog, sanitizeLog } from './log';
import { type History, type Rollup, compact, rawFrom, sanitizeRollups } from './history';

/*
 * Storage layout (IndexedDB, one value per key):
 *   stats, daily         item stats and daily totals
 *   log:YYYY-MM-DD       that day's answers (the last RAW_DAYS days only)
 *   logDays              which log:… keys exist
 *   rollups              per-day summaries of older days
 *   lastBackup           when progress was last exported (epoch ms)
 * A save writes only the days that changed, not the whole history.
 * `log` (a single array) is the old layout, migrated on load.
 */
const STATS_KEY = 'stats';
const DAILY_KEY = 'daily';
const OLD_LOG_KEY = 'log';
const DAYS_KEY = 'logDays';
const ROLLUPS_KEY = 'rollups';
const BACKUP_KEY = 'lastBackup';
const dayLogKey = (d: string) => `log:${d}`;

export const stats = signal<Record<string, ItemStats>>({});
export const daily = signal<Record<string, DayStats>>({});
/** Recent answers, one by one (the last RAW_DAYS days). */
export const answerLog = signal<LogEntry[]>([]);
/** Older days, summarized. */
export const rollups = signal<Rollup[]>([]);
/** Everything the trend charts need. */
export const history = computed<History>(() => ({
  log: answerLog.value,
  rollups: rollups.value,
}));
/** When progress was last exported, or null if never. */
export const lastBackup = signal<number | null>(null);
/** Whether the browser has agreed to keep this data (null: unknown / unsupported). */
export const storagePersisted = signal<boolean | null>(null);
export const progressLoaded = signal(false);

/** Days whose log:… key is in storage. */
let storedDays: string[] = [];
const dirtyDays = new Set<string>();
let rollupsDirty = false;
let dropOldLog = false;

/** Fold days older than RAW_DAYS into rollups; mark what changed. */
function compactNow(now = Date.now()): void {
  const log = answerLog.value;
  if (!log.length || dayKey(log[0].t) >= rawFrom(now)) return;
  const c = compact(log, rollups.value, now);
  answerLog.value = c.log;
  rollups.value = c.rollups;
  rollupsDirty = true;
}

export async function loadProgress(): Promise<void> {
  try {
    const [s, d, days, r, old, lb] = await Promise.all([
      get(STATS_KEY),
      get(DAILY_KEY),
      get(DAYS_KEY),
      get(ROLLUPS_KEY),
      get(OLD_LOG_KEY),
      get(BACKUP_KEY),
    ]);
    if (s && typeof s === 'object') stats.value = s as Record<string, ItemStats>;
    if (d && typeof d === 'object') daily.value = d as Record<string, DayStats>;
    rollups.value = sanitizeRollups(r);
    if (typeof lb === 'number') lastBackup.value = lb;
    storedDays = Array.isArray(days) ? days.filter((x): x is string => typeof x === 'string') : [];
    const perDay = await Promise.all(storedDays.map((x) => get(dayLogKey(x))));
    let log = perDay.flatMap((x) => sanitizeLog(x));
    if (Array.isArray(old)) {
      // Old layout: one array. Split it into days on the next save, then drop it.
      const migrated = sanitizeLog(old);
      for (const e of migrated) dirtyDays.add(dayKey(e.t));
      log = [...migrated, ...log];
      dropOldLog = true;
    }
    answerLog.value = log.sort((a, b) => a.t - b.t);
    compactNow();
    if (dropOldLog || rollupsDirty) persist();
  } catch {
    /* IndexedDB unavailable: in-memory only */
  }
  void checkPersisted();
  progressLoaded.value = true;
  // PR previews start with a demo history so Progress, reviews and drills have data.
  if (IS_PREVIEW && Object.keys(stats.value).length === 0)
    recordAttempts(makeDemoAttempts(Date.now()));
}

/** Previews only: replace everything with a fresh demo history. */
export function resetDemoData(): void {
  replaceProgress({}, {}, [], []);
  recordAttempts(makeDemoAttempts(Date.now()));
}

let pending: ReturnType<typeof setTimeout> | undefined;
/** Saves run one after another, never overlapping. */
let saving: Promise<void> = Promise.resolve();
function persist(): void {
  clearTimeout(pending);
  pending = setTimeout(() => {
    saving = saving.then(flush);
  }, 200);
}

async function flush(): Promise<void> {
  try {
    await set(STATS_KEY, stats.value);
    await set(DAILY_KEY, daily.value);
    const byDay = new Map<string, LogEntry[]>();
    for (const e of answerLog.value) {
      const d = dayKey(e.t);
      const arr = byDay.get(d);
      if (arr) arr.push(e);
      else byDay.set(d, [e]);
    }
    const days = [...byDay.keys()].sort();
    for (const d of dirtyDays) if (byDay.has(d)) await set(dayLogKey(d), byDay.get(d));
    dirtyDays.clear();
    if (rollupsDirty) await set(ROLLUPS_KEY, rollups.value);
    rollupsDirty = false;
    if (days.join() !== storedDays.join()) await set(DAYS_KEY, days);
    // Only now that the new keys are written: remove what's no longer needed.
    for (const d of storedDays) if (!byDay.has(d)) await del(dayLogKey(d));
    storedDays = days;
    if (dropOldLog) await del(OLD_LOG_KEY);
    dropOldLog = false;
  } catch {
    /* storage full or unavailable: keep going in memory */
  }
}

/** Ask the browser to keep this data (it may clear it when space runs low otherwise). */
let askedPersist = false;
async function askPersist(): Promise<void> {
  if (askedPersist) return;
  askedPersist = true;
  try {
    if (navigator.storage?.persist) storagePersisted.value = await navigator.storage.persist();
  } catch {
    /* not supported */
  }
}
async function checkPersisted(): Promise<void> {
  try {
    if (navigator.storage?.persisted) storagePersisted.value = await navigator.storage.persisted();
  } catch {
    /* not supported */
  }
}

export function installProgressRecorder(): void {
  onAttempts((attempts) => {
    let s = stats.value;
    let d = daily.value;
    for (const a of attempts) {
      const k = itemKey(a.item);
      s = {
        ...s,
        [k]: updateStats(s[k], a, {
          triadMs: prefs.value.practice.masteryTimeTriadMs,
          seventhMs: prefs.value.practice.masteryTimeSeventhMs,
        }),
      };
      d = updateDaily(d, a);
      dirtyDays.add(dayKey(a.at));
    }
    stats.value = s;
    daily.value = d;
    answerLog.value = appendLog(answerLog.value, attempts);
    compactNow();
    persist();
    if (!IS_PREVIEW) void askPersist();
  });
}

export function replaceProgress(
  s: Record<string, ItemStats>,
  d: Record<string, DayStats>,
  log: LogEntry[] = answerLog.value,
  rolls: Rollup[] = rollups.value,
): void {
  stats.value = s;
  daily.value = d;
  answerLog.value = [...log].sort((a, b) => a.t - b.t);
  rollups.value = rolls;
  for (const e of answerLog.value) dirtyDays.add(dayKey(e.t));
  rollupsDirty = true;
  compactNow();
  persist();
}

/** Remember that progress was just exported. */
export function markBackedUp(now = Date.now()): void {
  lastBackup.value = now;
  set(BACKUP_KEY, now).catch(() => undefined);
}
