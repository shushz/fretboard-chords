import { signal } from '@preact/signals';
import { get, set } from 'idb-keyval';
import {
  DEFAULT_PREFERENCES,
  type Preferences,
  mergePreferences,
  updatePreferences,
} from './model';

const KEY = 'preferences';

export const prefs = signal<Preferences>(DEFAULT_PREFERENCES);
export const prefsLoaded = signal(false);

export async function loadPreferences(): Promise<void> {
  try {
    const stored: unknown = await get(KEY);
    if (stored !== undefined) prefs.value = mergePreferences(stored);
  } catch {
    // IndexedDB unavailable (private mode etc.): keep defaults in memory.
  }
  prefsLoaded.value = true;
}

let pending: ReturnType<typeof setTimeout> | undefined;

export function setPreferences(next: Preferences): void {
  prefs.value = next;
  clearTimeout(pending);
  pending = setTimeout(() => {
    set(KEY, prefs.value).catch(() => undefined);
  }, 150);
}

export function editPreferences(fn: (draft: Preferences) => void): void {
  setPreferences(updatePreferences(prefs.value, fn));
}

export function resetPreferences(): void {
  setPreferences(DEFAULT_PREFERENCES);
}
