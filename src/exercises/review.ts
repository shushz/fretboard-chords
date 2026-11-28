/**
 * Reviews and drills of one item (pure). The question must be able to produce *that* item:
 * a particular shape (inversion, anchor string, the note that moves…) exists only in some
 * fret windows, so the window is chosen where it does. Otherwise the answer is recorded
 * under a different item and the reviewed one never stops being due.
 */
import type { Preferences } from '../prefs/model';
import { numeralOptions, symbolOptions } from '../prefs/model';
import type { FretWindow } from '../fretboard/regions';
import { type Item, itemKey } from '../progress/types';
import { matchesItem } from '../progress/srs';
import { familyKey, isFamilyKey } from '../progress/families';
import { type PracticeConfig, voicingOptions } from './config';
import { drillConfig, drillMode } from './drill';
import { findItem, generateFindQuestion } from './find/logic';
import { generateTonicQuestion, tonicItem } from './tonic/logic';
import { generateShapeQuestion, shapeItem } from './shape/logic';
import { generateTonesQuestion, tonesItem } from './tones/logic';
import { generateSwitchQuestion, switchItem } from './switch/logic';
import { generateProgressionQuestion, stepItem } from './progression/logic';
import { generateNameChordQuestion, nameChordItem } from './namechord/logic';

/** The items a question of `cfg` records (the same generators the runners use), or null. */
export function recordedItems(
  cfg: PracticeConfig,
  p: Preferences,
  rand: () => number,
  itemWeight?: (i: Item) => number,
): Item[] | null {
  const base = { harmony: p.harmony, voicing: voicingOptions(p), rand, itemWeight };
  switch (cfg.mode) {
    case 'find': {
      const q = generateFindQuestion(cfg, base);
      return q && [findItem(q, cfg.recordAs ?? 'find', cfg.recordVariant)];
    }
    case 'fromTonic': {
      const q = generateTonicQuestion(cfg, base);
      return q && [tonicItem(q)];
    }
    case 'nextShape': {
      const q = generateShapeQuestion(cfg, base);
      return q && [shapeItem(q)];
    }
    case 'nameTones': {
      const q = generateTonesQuestion(cfg, base);
      return q && [tonesItem(q)];
    }
    case 'qualitySwitch': {
      const q = generateSwitchQuestion(cfg, {
        ...base,
        extensions: {
          minDim: p.practice.switchMinDim,
          majAug: p.practice.switchMajAug,
          dom7: p.practice.switchDom7,
        },
      });
      return q && [switchItem(q)];
    }
    case 'progression': {
      const q = generateProgressionQuestion(cfg, base);
      return q && q.chords.map((_, i) => stepItem(q, i, !!cfg.tempo));
    }
    case 'nameChord': {
      const q = generateNameChordQuestion(cfg, {
        harmony: p.harmony,
        symbol: symbolOptions(p),
        numeral: numeralOptions(p),
        rand,
        itemWeight,
      });
      return q && [nameChordItem(q)];
    }
  }
}

/** Only candidates that are the reviewed item (as asked in its drill mode). */
export function reviewWeight(target: Item): (item: Item) => number {
  const t: Item = { ...target, mode: drillMode(target.mode) };
  return (item) => (matchesItem(t, item) ? 1 : 0);
}

/** Can a question of `cfg` record `item`? */
export function canAsk(cfg: PracticeConfig, item: Item, p: Preferences): boolean {
  const k = itemKey(item);
  const family = isFamilyKey(item.key);
  // Picks are random among matching candidates; a couple of tries settles it.
  for (let i = 0; i < 2; i++) {
    const got = recordedItems(cfg, p, Math.random, reviewWeight(item));
    if (got?.some((g) => (family ? familyKey(g) : itemKey(g)) === k)) return true;
  }
  return false;
}

function isWindow(w: unknown): w is FretWindow {
  const o = w as FretWindow | undefined;
  return (
    !!o && Number.isInteger(o.start) && Number.isInteger(o.width) && o.start >= 0 && o.width > 0
  );
}

/**
 * The practice config for one review/drill question of `item`. Window: where the item was
 * last practiced (`stored`) for its first appearance, else the default window, else the
 * nearest other window in which the item can be asked. A repeat of the item in the same
 * session (`avoidStart` = the window it just had) gets a different such window. Null when
 * the item can't be asked in any window (see `retireItem`).
 */
export function reviewConfig(
  item: Item,
  p: Preferences,
  stored: unknown,
  rand: () => number,
  avoidStart?: number,
): PracticeConfig | null {
  // A question type is asked in a random key; if that key can't ask it, try a few others
  // before deciding it can't be asked at all.
  if (isFamilyKey(item.key)) {
    for (let i = 0; i < 6; i++) {
      const c = reviewConfigIn(item, drillConfig(item, p, rand), p, stored, rand, avoidStart);
      if (c) return c;
    }
    return null;
  }
  return reviewConfigIn(item, drillConfig(item, p, rand), p, stored, rand, avoidStart);
}

function reviewConfigIn(
  item: Item,
  c: PracticeConfig | null,
  p: Preferences,
  stored: unknown,
  rand: () => number,
  avoidStart?: number,
): PracticeConfig | null {
  if (!c) return null;
  const def = p.fretboard.window;
  const width = isWindow(stored) ? stored.width : def.width;
  const last = p.fretboard.fretRange - width + 1;
  const starts: number[] = [];
  const push = (s: number) => {
    if (s >= 0 && s <= last && s !== avoidStart && !starts.includes(s)) starts.push(s);
  };
  if (avoidStart === undefined) {
    if (isWindow(stored)) push(stored.start);
    push(def.start);
    for (let d = 1; d <= last; d++) {
      push(def.start - d);
      push(def.start + d);
    }
  } else {
    // a repeat: somewhere else, in random order
    const rest = Array.from({ length: last + 1 }, (_, s) => s);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    rest.forEach(push);
  }
  for (const start of starts) {
    const cfg = { ...c, window: { start, width } };
    if (canAsk(cfg, item, p)) return cfg;
  }
  // The item can't be asked any more (e.g. Name the chord no longer asks about the tonic,
  // or a quality-switch extension is off): no question, rather than a different one that
  // would be recorded under another item.
  return null;
}
