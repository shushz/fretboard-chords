import { describe, expect, it } from 'vitest';
import { dayKey, streak } from './stats';

describe('day streak across a clock change', () => {
  it('counts the 23-hour day when clocks go forward (Europe/Berlin, 29 Mar 2026)', () => {
    const before = process.env.TZ;
    process.env.TZ = 'Europe/Berlin';
    try {
      const day = (d: string) => ({ [d]: { attempts: 5, correct: 5, ms: 1000 } });
      const daily = {
        ...day('2026-03-27'),
        ...day('2026-03-28'),
        ...day('2026-03-29'),
        ...day('2026-03-30'),
      };
      // 00:30 local on 30 March, the day after the change
      const now = new Date(2026, 2, 30, 0, 30).getTime();
      expect(dayKey(now)).toBe('2026-03-30');
      expect(streak(daily, now)).toBe(4);
    } finally {
      process.env.TZ = before;
    }
  });
});
