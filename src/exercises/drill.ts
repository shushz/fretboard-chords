/** Build practice configs that target specific items (weak-spot drilling, reviews). */
import type { Preferences } from '../prefs/model';
import { anchorStringList } from '../prefs/model';
import { parseKeyName, resolveKey } from '../theory/keys';
import type { DegreeIndex } from '../theory/chords';
import type { Item, ModeId } from '../progress/types';
import { isSeventhItem } from '../progress/stats';
import { matchesItem } from '../progress/srs';
import { type PracticeConfig, stringSetsFor } from './config';

/** Modes whose runner can be driven for an item. Progression steps are drilled as "find". */
export function drillMode(m: ModeId): ModeId {
  return m === 'progression' ? 'find' : m;
}

function variantFor(item: Item): string | undefined {
  switch (item.mode) {
    case 'nextShape':
    case 'nameChord':
      return item.variant;
    case 'nameTones':
      return item.variant?.startsWith('tap') ? 'tap' : 'label';
    default:
      return undefined;
  }
}

export function drillConfig(item: Item, p: Preferences): PracticeConfig | null {
  const k = parseKeyName(item.key);
  if (!k) return null;
  const key = resolveKey(k, { ...p.spelling, allowTheoretical: true }).key;
  const sevenths = isSeventhItem(item);
  return {
    mode: drillMode(item.mode),
    key,
    degrees: [item.degree as DegreeIndex],
    stringSets: item.stringSet === '*' ? stringSetsFor(p, sevenths) : [item.stringSet],
    window: { ...p.fretboard.window },
    sevenths,
    anchor: item.anchor
      ? 'required'
      : p.fretboard.anchor === 'required'
        ? 'ghost'
        : p.fretboard.anchor,
    anchorStrings: item.anchor ? [item.anchor] : anchorStringList(p),
    variant: variantFor(item),
  };
}

/** Strongly prefer candidates that match the drilled item (inversion, variant…). */
export function drillWeight(target: Item): (item: Item) => number {
  const t: Item = { ...target, mode: drillMode(target.mode) };
  return (item) => (matchesItem(t, item) ? 1 : 0.001);
}
