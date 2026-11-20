/** Attempt sink. M7 wires this to IndexedDB-backed item stats. */
import type { Attempt } from './types';

type Listener = (a: readonly Attempt[]) => void;
const listeners = new Set<Listener>();

export function onAttempts(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function recordAttempts(a: readonly Attempt[]): void {
  for (const l of listeners) l(a);
}
