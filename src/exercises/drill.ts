/** Build practice configs that target specific items (weak-spot drilling, reviews). */
import type { Preferences } from '../prefs/model';
import { ANCHOR_STRINGS } from '../prefs/model';
import { parseKeyName, resolveKey } from '../theory/keys';
import type { DegreeIndex } from '../theory/chords';
import { type Item, type ModeId, itemKey } from '../progress/types';
import { isSeventhItem } from '../progress/stats';
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
    // An anchored item is drilled anchored, on its string; others without the root tap.
    tapRoot: !!item.anchor,
    anchorStrings: item.anchor ? [item.anchor] : [...ANCHOR_STRINGS],
    variant: variantFor(item),
    recordAs: item.mode === 'progression' ? 'progression' : undefined,
  };
}

/**
 * Order of items for a targeted session: each item `passes` times, shuffled per pass,
 * never the same item twice in a row when there is more than one item.
 */
export function drillQueue(items: readonly Item[], passes: number, rand: () => number): Item[] {
  const out: Item[] = [];
  const shuffle = (xs: Item[]) => {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
  };
  for (let p = 0; p < passes; p++) {
    const pass = shuffle([...items]);
    // don't start a pass with the item that ended the previous one
    if (out.length && pass.length > 1 && itemKey(pass[0]) === itemKey(out[out.length - 1])) {
      [pass[0], pass[1]] = [pass[1], pass[0]];
    }
    out.push(...pass);
  }
  return out;
}

/** How many times the item at `index` already appeared earlier in the queue. */
export function occurrence(queue: readonly Item[], index: number): number {
  const k = itemKey(queue[index]);
  return queue.slice(0, index).filter((x) => itemKey(x) === k).length;
}
