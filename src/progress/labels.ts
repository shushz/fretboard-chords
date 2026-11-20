import { type DegreeIndex, buildChord, romanNumeral } from '../theory/chords';
import { parseKeyName, formatKey, scale } from '../theory/keys';
import { type Preferences, numeralOptions } from '../prefs/model';
import type { Item, ModeId } from './types';

export const MODE_NAMES: Record<ModeId, string> = {
  find: 'Find the chord',
  fromTonic: 'From the tonic',
  nextShape: 'Next / previous shape',
  nameTones: 'Name the tones',
  progression: 'Progression walk',
  nameChord: 'Name the chord',
  qualitySwitch: 'Quality switch',
};

export function keyLabel(ascii: string, p: Preferences): string {
  const k = parseKeyName(ascii);
  return k ? formatKey(k, p.spelling.glyphs) : ascii;
}

export function degreeLabel(item: Item, p: Preferences): string {
  const k = parseKeyName(item.key);
  if (!k) return String(item.degree + 1);
  const d = item.degree as DegreeIndex;
  const root = scale(k)[d];
  // Use the recorded quality (handles the harmonic V and quality-switch targets).
  const c = buildChord(root, item.quality);
  // Roman numeral accidental is relative to the parallel major; root spelled from the scale
  // is right for every diatonic degree except a raised one (not used by any mode).
  return romanNumeral(k, d, c.root, item.quality, numeralOptions(p));
}

export function itemLabel(item: Item, p: Preferences): string {
  const parts = [keyLabel(item.key, p), degreeLabel(item, p)];
  if (item.stringSet !== '*') parts.push(item.stringSet.replace('-', '–'));
  if (item.inversion !== '*')
    parts.push(item.inversion === 'root' ? 'root pos.' : `${item.inversion} inv.`);
  if (item.anchor) parts.push(`anchor ${item.anchor}`);
  if (item.variant) parts.push(item.variant);
  return parts.join(' · ');
}
