import { signal } from '@preact/signals';

/** A running practice session's status, shown in the top bar (saves a row of height). */
export interface SessionHeader {
  /** "3 / 20", "5 / 20 chords", "4 min left" */
  progress: string;
  correct: number;
  /** Drill or review title, shown instead of "Practice". */
  title?: string;
  /** End the session now and show its summary. */
  finish: () => void;
}

export const sessionHeader = signal<SessionHeader | null>(null);
