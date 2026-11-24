/**
 * The clock answer times are measured on. It pauses while practice isn't on screen
 * (Preferences or Help open on top of a question, the app in the background), so a look
 * at the settings doesn't make an answer count as slow.
 */
let pausedTotal = 0;
let pausedAt: number | null = null;
const reasons = new Set<string>();

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function pauseClock(reason: string): void {
  if (reasons.has(reason)) return;
  if (reasons.size === 0) pausedAt = now();
  reasons.add(reason);
}

export function resumeClock(reason: string): void {
  if (!reasons.delete(reason)) return;
  if (reasons.size === 0 && pausedAt !== null) {
    pausedTotal += now() - pausedAt;
    pausedAt = null;
  }
}

/** Current time on the answer clock (ms); stands still while paused. */
export function clockNow(): number {
  return (pausedAt ?? now()) - pausedTotal;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () =>
    document.hidden ? pauseClock('page') : resumeClock('page'),
  );
}
