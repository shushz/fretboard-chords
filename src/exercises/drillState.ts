import { signal } from '@preact/signals';
import type { Item } from '../progress/types';

/** Items queued for a targeted session (set by "Drill these" / "Review due"). */
export interface PendingDrill {
  title: string;
  items: Item[];
  /** How many times each item is asked (review: 1, weak-spot drill: 2). */
  passes: number;
}

export const pendingDrill = signal<PendingDrill | null>(null);
