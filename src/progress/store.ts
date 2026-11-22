import { signal } from '@preact/signals';
import { get, set } from 'idb-keyval';
import { onAttempts } from './record';
import { type DayStats, type ItemStats, updateDaily, updateStats } from './stats';
import { itemKey } from './types';
import { type LogEntry, appendLog } from './log';

const STATS_KEY = 'stats';
const DAILY_KEY = 'daily';
const LOG_KEY = 'log';

export const stats = signal<Record<string, ItemStats>>({});
export const daily = signal<Record<string, DayStats>>({});
/** Every answer (bounded), for trends over time. */
export const answerLog = signal<LogEntry[]>([]);
export const progressLoaded = signal(false);

export async function loadProgress(): Promise<void> {
  try {
    const [s, d, l] = await Promise.all([get(STATS_KEY), get(DAILY_KEY), get(LOG_KEY)]);
    if (s && typeof s === 'object') stats.value = s as Record<string, ItemStats>;
    if (d && typeof d === 'object') daily.value = d as Record<string, DayStats>;
    if (Array.isArray(l)) answerLog.value = l as LogEntry[];
  } catch {
    /* IndexedDB unavailable: in-memory only */
  }
  progressLoaded.value = true;
}

let pending: ReturnType<typeof setTimeout> | undefined;
function persist(): void {
  clearTimeout(pending);
  pending = setTimeout(() => {
    set(STATS_KEY, stats.value).catch(() => undefined);
    set(DAILY_KEY, daily.value).catch(() => undefined);
    set(LOG_KEY, answerLog.value).catch(() => undefined);
  }, 200);
}

export function installProgressRecorder(): void {
  onAttempts((attempts) => {
    let s = stats.value;
    let d = daily.value;
    for (const a of attempts) {
      const k = itemKey(a.item);
      s = { ...s, [k]: updateStats(s[k], a) };
      d = updateDaily(d, a);
    }
    stats.value = s;
    daily.value = d;
    answerLog.value = appendLog(answerLog.value, attempts);
    persist();
  });
}

export function replaceProgress(
  s: Record<string, ItemStats>,
  d: Record<string, DayStats>,
  log: LogEntry[] = answerLog.value,
): void {
  stats.value = s;
  daily.value = d;
  answerLog.value = log;
  persist();
}
