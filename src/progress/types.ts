import type { Inversion } from '../fretboard/voicings';
import type { StringSetId } from '../fretboard/regions';
import type { FretWindow } from '../fretboard/regions';
import type { Quality } from '../theory/chords';

export type ModeId =
  'find' | 'fromTonic' | 'nextShape' | 'nameTones' | 'progression' | 'nameChord' | 'qualitySwitch';

/**
 * Identity of a practice item (SPEC §6). The fret window is recorded with each attempt
 * but is not part of the identity. '*' = not applicable / any.
 */
export interface Item {
  mode: ModeId;
  /** ASCII key name, e.g. "Ebm". */
  key: string;
  degree: number;
  quality: Quality;
  stringSet: StringSetId | '*';
  inversion: Inversion | '*';
  anchor: 5 | 6 | null;
  /** Mode-specific extra identity (e.g. quality switch "maj>min@3", variant). */
  variant?: string;
}

export function itemKey(i: Item): string {
  return [
    i.mode,
    i.key,
    i.degree,
    i.quality,
    i.stringSet,
    i.inversion,
    i.anchor ?? '-',
    i.variant ?? '',
  ].join('|');
}

export function parseItemKey(k: string): Item {
  const [mode, key, degree, quality, stringSet, inversion, anchor, variant] = k.split('|');
  return {
    mode: mode as ModeId,
    key,
    degree: Number(degree),
    quality: quality as Quality,
    stringSet: stringSet as StringSetId | '*',
    inversion: inversion as Inversion | '*',
    anchor: anchor === '-' ? null : (Number(anchor) as 5 | 6),
    variant: variant || undefined,
  };
}

export interface Attempt {
  item: Item;
  correct: boolean;
  timeMs: number;
  /** Epoch ms. */
  at: number;
  window?: FretWindow;
  sevenths: boolean;
}
