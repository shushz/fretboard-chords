/**
 * Saving progress: an answer recorded while a save is still writing must be saved too
 * (the day it belongs to stays marked for the next save).
 */
import { describe, expect, it, vi } from 'vitest';

const db = new Map<string, unknown>();
let slow = false;
vi.mock('../storage', () => ({
  kvGet: async (k: string) => db.get(k),
  kvSet: async (k: string, v: unknown) => {
    // a slow write: answers can arrive meanwhile
    if (slow) await new Promise((r) => setTimeout(r, 300));
    db.set(k, JSON.parse(JSON.stringify(v)));
  },
  kvDel: async (k: string) => void db.delete(k),
  localKey: (n: string) => n,
}));

const { installProgressRecorder } = await import('./store');
const { recordAttempts } = await import('./record');
const { dayKey } = await import('./stats');

const attempt = (at: number) => ({
  item: {
    mode: 'find' as const,
    key: 'F#m',
    degree: 0,
    quality: 'min' as const,
    stringSet: '1-3' as const,
    inversion: '*' as const,
    anchor: null,
  },
  correct: true,
  timeMs: 1500,
  at,
  sevenths: false,
});

describe('saving answers', () => {
  it('keeps an answer recorded while a save is in progress', async () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 24, 12) });
    installProgressRecorder();
    slow = true;
    const t = Date.now();
    recordAttempts([attempt(t)]);
    // the save starts at 200 ms and writes stats (300 ms), daily totals (300 ms), then the
    // day's answers: answer again while that last write is under way
    await vi.advanceTimersByTimeAsync(950);
    recordAttempts([attempt(t + 1000)]);
    await vi.advanceTimersByTimeAsync(5000); // both saves finish
    const saved = db.get(`log:${dayKey(t)}`) as unknown[];
    expect(saved).toHaveLength(2);
    vi.useRealTimers();
  });
});
