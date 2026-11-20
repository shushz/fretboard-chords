import { signal } from '@preact/signals';
import type { Item } from '../progress/types';

/** Items queued for a targeted session (set by "Drill these" / "Review due"). */
export const pendingDrill = signal<{ title: string; items: Item[] } | null>(null);
