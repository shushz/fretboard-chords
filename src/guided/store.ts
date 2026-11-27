/** Guided practice: which steps are passed (saved), and starting a guided session. */
import { signal } from '@preact/signals';
import { kvGet, kvSet } from '../storage';
import { answerLog } from '../progress/store';
import type { Step } from './curriculum';
import { EMPTY_GUIDED, type GuidedState, advance, sanitizeGuided } from './progress';

const KEY = 'guided';

export const guided = signal<GuidedState>(EMPTY_GUIDED);
/** Set by the Guided practice button; Practice picks it up when it opens. */
export const pendingGuided = signal(false);

export async function loadGuided(): Promise<void> {
  try {
    guided.value = sanitizeGuided(await kvGet(KEY));
  } catch {
    /* storage unavailable: start from the beginning, in memory */
  }
}

export function setGuided(s: GuidedState): void {
  guided.value = s;
  kvSet(KEY, s).catch(() => undefined);
}

/**
 * Pass the current step (and any after it) if its targets are solid. Called after each
 * guided answer, and when a guided session starts (practice elsewhere counts too).
 * Returns the steps passed just now.
 */
export function advanceGuided(now = Date.now()): Step[] {
  const r = advance(answerLog.value, guided.value, now);
  if (r.passed.length) setGuided(r.state);
  return r.passed;
}
