/** Remember the last practice setup per device (a convenience, not a preference). */
import type { Preferences } from '../prefs/model';
import { keyToAscii, parseKeyName, resolveKey } from '../theory/keys';
import type { PracticeConfig } from './config';
import { MODES } from './modes';

const KEY = 'fretboard-chords:lastSetup';

export function saveSetup(c: PracticeConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...c, key: keyToAscii(c.key) }));
  } catch {
    /* storage unavailable */
  }
}

export function loadSetup(p: Preferences): PracticeConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Omit<PracticeConfig, 'key'> & { key: string };
    const k = parseKeyName(o.key);
    if (!k || !MODES.some((m) => m.id === o.mode)) return null;
    if (!Array.isArray(o.degrees) || !Array.isArray(o.stringSets) || !o.window) return null;
    return { ...o, key: resolveKey(k, p.spelling).key };
  } catch {
    return null;
  }
}
