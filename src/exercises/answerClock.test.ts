import { afterEach, describe, expect, it, vi } from 'vitest';
import { clockNow, pauseClock, resumeClock } from './answerClock';

describe('answer clock', () => {
  afterEach(() => vi.useRealTimers());
  it('stands still while paused, for any number of overlapping reasons', () => {
    vi.useFakeTimers();
    const t0 = clockNow();
    vi.advanceTimersByTime(1000);
    expect(clockNow() - t0).toBeCloseTo(1000, -1);
    pauseClock('route');
    vi.advanceTimersByTime(30_000);
    pauseClock('page');
    vi.advanceTimersByTime(5000);
    resumeClock('route');
    vi.advanceTimersByTime(5000);
    expect(clockNow() - t0).toBeCloseTo(1000, -1); // still paused by 'page'
    resumeClock('page');
    vi.advanceTimersByTime(500);
    expect(clockNow() - t0).toBeCloseTo(1500, -1);
    resumeClock('page'); // not paused: no effect
    expect(clockNow() - t0).toBeCloseTo(1500, -1);
  });
});
