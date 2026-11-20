/** Generic session flow: setup → questions → summary. Pure, DOM-free. */
import type { SessionLength } from '../prefs/model';
import type { Attempt } from '../progress/types';

export interface SessionState<Q> {
  length: SessionLength;
  startedAt: number;
  question: Q | null;
  questionStartedAt: number;
  index: number;
  attempts: Attempt[];
  /** 'answering' → user is working on `question`; 'feedback' → graded; 'done' → summary. */
  phase: 'answering' | 'feedback' | 'done';
}

export function startSession<Q>(length: SessionLength, first: Q, now: number): SessionState<Q> {
  return {
    length,
    startedAt: now,
    question: first,
    questionStartedAt: now,
    index: 0,
    attempts: [],
    phase: 'answering',
  };
}

export function recordAttempt<Q>(s: SessionState<Q>, a: Attempt | Attempt[]): SessionState<Q> {
  return { ...s, attempts: [...s.attempts, ...(Array.isArray(a) ? a : [a])], phase: 'feedback' };
}

/**
 * `countAttempts`: a session of N "questions" counts graded attempts instead of
 * questions (the progression walk grades every chord of a progression).
 */
export function isSessionOver<Q>(s: SessionState<Q>, now: number, countAttempts = false): boolean {
  if (s.length.kind === 'questions') {
    return countAttempts ? s.attempts.length >= s.length.count : s.index + 1 >= s.length.count;
  }
  return now - s.startedAt >= s.length.minutes * 60_000;
}

export function nextQuestion<Q>(s: SessionState<Q>, q: Q | null, now: number): SessionState<Q> {
  if (q === null || isSessionOver(s, now)) return { ...s, question: null, phase: 'done' };
  return { ...s, question: q, index: s.index + 1, questionStartedAt: now, phase: 'answering' };
}

export function finishSession<Q>(s: SessionState<Q>): SessionState<Q> {
  return { ...s, question: null, phase: 'done' };
}

export interface SessionSummary {
  total: number;
  correct: number;
  accuracy: number;
  medianMs: number;
  durationMs: number;
}

export function median(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function summarize(attempts: readonly Attempt[], durationMs: number): SessionSummary {
  const correct = attempts.filter((a) => a.correct).length;
  return {
    total: attempts.length,
    correct,
    accuracy: attempts.length ? correct / attempts.length : 0,
    // Time of correct answers only (a skipped or wrong answer isn't a measure of speed),
    // consistent with the Progress screen.
    medianMs: median(attempts.filter((a) => a.correct).map((a) => a.timeMs)),
    durationMs,
  };
}

/** Weighted random pick. `rand` returns [0, 1). */
export function weightedPick<T>(
  items: readonly T[],
  weight: (t: T) => number,
  rand: () => number,
): T {
  const ws = items.map(weight);
  const total = ws.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}
