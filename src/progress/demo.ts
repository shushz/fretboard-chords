/**
 * Demo practice history for PR previews: about two weeks of answers across every mode,
 * getting gradually better, with a few weak spots (ii°, ♭VII, string set 2–4). It's fed
 * through the normal attempt pipeline, so stats, reviews and trends come out as they would
 * for a real user. Deterministic apart from being anchored to `now`.
 */
import type { Quality } from '../theory/chords';
import type { StringSetId } from '../fretboard/regions';
import type { Inversion } from '../fretboard/voicings';
import type { Attempt, Item, ModeId } from './types';

const DAY = 86_400_000;

/** Days ago on which "practice" happened (gaps included, ending today). */
const PRACTICE_DAYS = [15, 14, 12, 11, 10, 8, 7, 5, 4, 3, 2, 1, 0];

const MINOR_KEYS = ['F#m', 'Ebm', 'Am', 'G#m'];
const MAJOR_KEYS = ['C', 'Bb', 'D', 'Ab'];
/** degree, quality, extra difficulty */
const MINOR_FNS: [number, Quality, number][] = [
  [0, 'min', 0],
  [3, 'min', 0.05],
  [4, 'maj', 0.05],
  [1, 'dim', 0.25],
  [5, 'maj', 0.1],
  [6, 'maj', 0.2],
];
const MAJOR_FNS: [number, Quality, number][] = [
  [0, 'maj', 0],
  [3, 'maj', 0.05],
  [4, 'maj', 0.05],
  [1, 'min', 0.1],
  [5, 'min', 0.15],
];
const MODES: [ModeId, number][] = [
  ['find', 0.3],
  ['fromTonic', 0.15],
  ['nextShape', 0.1],
  ['nameTones', 0.1],
  ['qualitySwitch', 0.1],
  ['progression', 0.15],
  ['nameChord', 0.1],
];
const INVERSIONS: Inversion[] = ['root', 'first', 'second'];

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function pick<T>(xs: readonly T[], r: () => number): T {
  return xs[Math.floor(r() * xs.length)];
}

function pickWeighted<T>(xs: readonly [T, number][], r: () => number): T {
  let x = r() * xs.reduce((a, [, w]) => a + w, 0);
  for (const [v, w] of xs) if ((x -= w) < 0) return v;
  return xs[xs.length - 1][0];
}

export function makeDemoAttempts(now: number): Attempt[] {
  const r = rng(20261122);
  const out: Attempt[] = [];
  PRACTICE_DAYS.forEach((ago, i) => {
    const skill = i / (PRACTICE_DAYS.length - 1); // 0 → 1 over the period
    const answers = 25 + Math.floor(r() * 25);
    const start = now - ago * DAY - 2 * 3_600_000;
    for (let n = 0; n < answers; n++) {
      const mode = pickWeighted(MODES, r);
      const minor = r() < 0.65;
      const [degree, quality, hard] = pick(minor ? MINOR_FNS : MAJOR_FNS, r);
      const stringSet: StringSetId = r() < 0.55 ? '1-3' : '2-4';
      const boardless = mode === 'nameChord';
      const item: Item = {
        mode,
        key: pick(minor ? MINOR_KEYS : MAJOR_KEYS, r),
        degree: mode === 'nameChord' && degree === 0 ? 3 : degree,
        quality,
        stringSet: boardless ? '*' : stringSet,
        inversion:
          mode === 'fromTonic' || mode === 'nextShape' || mode === 'qualitySwitch'
            ? pick(INVERSIONS, r)
            : '*',
        anchor: null,
        variant:
          mode === 'nextShape'
            ? pick(['up', 'down'], r)
            : mode === 'nameChord'
              ? pick(['forward', 'reverse', 'degree'], r)
              : mode === 'nameTones'
                ? 'label'
                : mode === 'qualitySwitch'
                  ? `${quality === 'min' ? 'min>maj' : 'maj>min'} s${stringSet === '1-3' ? 2 : 3}`
                  : undefined,
      };
      if (mode === 'qualitySwitch' && quality !== 'maj' && quality !== 'min') continue;
      const p = 0.45 + 0.45 * skill - hard - (stringSet === '2-4' ? 0.08 : 0);
      out.push({
        item,
        correct: r() < p,
        timeMs: Math.round(5200 - 2600 * skill + r() * 1800 + hard * 5000),
        at: start + n * 40_000,
        sevenths: false,
      });
    }
  });
  return out;
}
