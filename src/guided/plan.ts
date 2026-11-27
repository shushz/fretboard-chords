/**
 * Guided practice: what each question of a session is (pure).
 *
 * A session mixes three kinds of question:
 * - new: the current step, mostly at the start (to learn it) and then spread out;
 * - review: learned things that are weak or haven't come up for a while;
 * - check: random learned things, to see they're still remembered.
 * About 60 / 25 / 15 %. When spot checks and reviews go wrong ("still solid" under 75 %),
 * new material drops to 40 % until the old is solid again. Before anything is learned,
 * every question is new; once the path is done, every question is review or check.
 */
import type { LogEntry } from '../progress/log';
import { CURRICULUM, type Step, type Target, targetId } from './curriculum';
import {
  type GuidedState,
  currentIndex,
  learnedTargets,
  openedAt,
  retention,
  targetState,
} from './progress';

export type SlotKind = 'new' | 'review' | 'check';

export const NEW_SHARE = 0.6;
export const NEW_SHARE_SHAKY = 0.4;
export const SHAKY_BELOW = 0.75;
/** Review : check, among the questions that aren't new. */
const REVIEW_OF_OLD = 25 / 40;
/** New questions asked back to back at the start of a session. */
export const NEW_FIRST = 5;

export function newShare(
  log: readonly LogEntry[],
  s: GuidedState,
  steps: readonly Step[] = CURRICULUM,
): number {
  const done = currentIndex(s, steps) >= steps.length;
  if (done) return 0;
  if (!learnedTargets(s, steps).length) return 1;
  const r = retention(log, s, steps);
  return r !== null && r < SHAKY_BELOW ? NEW_SHARE_SHAKY : NEW_SHARE;
}

/** The kinds of a session's `n` questions, in order. */
export function sessionKinds(n: number, share: number): SlotKind[] {
  const nNew = Math.round(n * share);
  const nReview = Math.round((n - nNew) * REVIEW_OF_OLD);
  const want: Record<SlotKind, number> = { new: nNew, review: nReview, check: n - nNew - nReview };
  const out: SlotKind[] = [];
  const placed: Record<SlotKind, number> = { new: 0, review: 0, check: 0 };
  // Learn first: a block of new questions…
  for (let i = 0; i < Math.min(NEW_FIRST, nNew); i++) {
    out.push('new');
    placed.new++;
  }
  // …then spread the rest evenly: always place the kind that's furthest behind its share.
  const rest = n - out.length;
  for (let i = 0; i < rest; i++) {
    let best: SlotKind | null = null;
    let lag = -Infinity;
    for (const k of ['new', 'review', 'check'] as const) {
      const left = want[k] - placed[k];
      if (left <= 0) continue;
      const l = left / want[k];
      if (l > lag) {
        lag = l;
        best = k;
      }
    }
    out.push(best!);
    placed[best!]++;
  }
  return out;
}

function pickWeighted<T>(xs: readonly T[], w: (x: T) => number, rand: () => number): T {
  const ws = xs.map(w);
  const total = ws.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < xs.length; i++) {
    r -= ws[i];
    if (r < 0) return xs[i];
  }
  return xs[xs.length - 1];
}

const DAY = 86_400_000;

/**
 * The target for one question. `previous`: the target just asked (not asked twice in a
 * row when there's a choice). Falls back to another kind when a pool is empty.
 */
export function chooseTarget(
  kind: SlotKind,
  log: readonly LogEntry[],
  s: GuidedState,
  now: number,
  rand: () => number,
  previous?: string,
  steps: readonly Step[] = CURRICULUM,
): { target: Target; kind: SlotKind } | null {
  const i = currentIndex(s, steps);
  const fresh = i < steps.length ? steps[i].targets : [];
  const learned = learnedTargets(s, steps);
  const k: SlotKind =
    kind === 'new' && !fresh.length ? 'review' : kind !== 'new' && !learned.length ? 'new' : kind;
  const pool = k === 'new' ? fresh : learned;
  if (!pool.length) return null;
  const notPrev = pool.length > 1 ? pool.filter((t) => targetId(t) !== previous) : pool;
  if (k === 'check') return { target: notPrev[Math.floor(rand() * notPrev.length)], kind: k };
  const since = k === 'new' && steps[i].fresh ? openedAt(s, i, steps) : 0;
  const target = pickWeighted(
    notPrev,
    (t) => {
      const st = targetState(log, t, since);
      if (k === 'new') return st.solid ? 1 : 3; // focus on what isn't solid yet
      // review: wrong recent answers and time since last asked (up to two weeks)
      const misses = st.count ? (st.count - st.right) / st.count : 1;
      const stale = st.lastAt ? Math.min(14, (now - st.lastAt) / DAY) / 7 : 1;
      return 0.2 + 3 * misses + stale;
    },
    rand,
  );
  return { target, kind: k };
}
