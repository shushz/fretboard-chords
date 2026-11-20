import { describe, expect, it } from 'vitest';
import {
  isSessionOver,
  median,
  nextQuestion,
  recordAttempt,
  startSession,
  summarize,
  weightedPick,
} from './session';
import type { Attempt } from '../progress/types';

const att = (correct: boolean, timeMs: number): Attempt => ({
  item: {
    mode: 'find',
    key: 'C',
    degree: 0,
    quality: 'maj',
    stringSet: '1-3',
    inversion: '*',
    anchor: null,
  },
  correct,
  timeMs,
  at: 0,
  sevenths: false,
});

describe('session flow', () => {
  it('runs N questions then finishes', () => {
    let s = startSession({ kind: 'questions', count: 2 }, 'q1', 0);
    s = recordAttempt(s, att(true, 1000));
    expect(s.phase).toBe('feedback');
    s = nextQuestion(s, 'q2', 10);
    expect(s.phase).toBe('answering');
    expect(s.index).toBe(1);
    s = recordAttempt(s, att(false, 3000));
    s = nextQuestion(s, 'q3', 20);
    expect(s.phase).toBe('done');
    const sum = summarize(s.attempts, 20);
    expect(sum).toMatchObject({ total: 2, correct: 1, accuracy: 0.5, medianMs: 1000 }); // correct answers only;
  });
  it('timed sessions', () => {
    const s = startSession({ kind: 'minutes', minutes: 1 }, 'q', 0);
    expect(isSessionOver(s, 59_000)).toBe(false);
    expect(isSessionOver(s, 60_000)).toBe(true);
  });
  it('median and weighted pick', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([])).toBe(0);
    expect(
      weightedPick(
        ['a', 'b'],
        (x) => (x === 'a' ? 0 : 1),
        () => 0.5,
      ),
    ).toBe('b');
  });
});
