/**
 * Guided practice: progress (pure). A target is solid when its recent answers, in any key,
 * are mostly right and not slow. A step is passed once all its targets are solid; passing
 * is remembered (forgetting later is handled by reviews, not by taking steps back).
 */
import { parseKeyName } from '../theory/keys';
import { stringsOf } from '../fretboard/regions';
import { median } from '../exercises/session';
import type { LogEntry } from '../progress/log';
import { type Item, parseItemKey } from '../progress/types';
import { CURRICULUM, type Step, type Target, targetId } from './curriculum';

/** Last this many answers to a target decide whether it's solid… */
export const SOLID_LAST = 5;
/** …of which this many must be right… */
export const SOLID_RIGHT = 4;
/**
 * …with right answers this quick (median, ms). Labeling every note takes longer; seventh
 * chords have a fourth note.
 */
export const SOLID_MS = { fretboard: 6000, label: 9000, seventh: 8000, seventhLabel: 12000 };

export function solidMs(t: Target): number {
  const label = t.mode === 'nameTones' && t.variant === 'label';
  if (t.sevenths) return label ? SOLID_MS.seventhLabel : SOLID_MS.seventh;
  return label ? SOLID_MS.label : SOLID_MS.fretboard;
}

const TRIAD = new Set(['maj', 'min', 'dim', 'aug']);
const SEVENTH = new Set(['maj7', '7', 'm7', 'm7b5', 'dim7']);

/** Does an answered item count for `t`? Any key of the target's major/minor mode. */
export function matchesTarget(t: Target, item: Item): boolean {
  if (item.mode !== t.mode || item.degree !== t.degree) return false;
  if (!(t.sevenths ? SEVENTH : TRIAD).has(item.quality)) return false;
  if (parseKeyName(item.key)?.mode !== t.keyMode) return false;
  if (t.inversion && item.inversion !== t.inversion) return false;
  const v = item.variant ?? '';
  switch (t.mode) {
    case 'nameTones':
      if (t.variant === 'tap') {
        // "tap R s3": any role, on a string of the target's string set
        const m = /^tap \S+ s(\d)$/.exec(v);
        return !!m && t.stringSet !== '*' && stringsOf(t.stringSet).includes(Number(m[1]) as 1);
      }
      if (v !== 'label') return false;
      break;
    case 'nextShape':
      if (v !== t.variant) return false;
      break;
    case 'qualitySwitch':
      // "maj>min s3": that switch, the moving note on any string
      if (!v.startsWith(`${t.variant} `)) return false;
      break;
    case 'progression':
      if (t.variant === 'tempo' && v !== 'tempo') return false;
      break;
    case 'find':
      if (t.anchor && item.anchor === null) return false;
      break;
  }
  return item.stringSet === t.stringSet;
}

const parsed = new Map<string, Item>();
function itemOf(k: string): Item {
  let i = parsed.get(k);
  if (!i) parsed.set(k, (i = parseItemKey(k)));
  return i;
}

/** Answers to `t` (oldest first), optionally only those from `since` on. */
export function answersFor(log: readonly LogEntry[], t: Target, since = 0): LogEntry[] {
  return log.filter((e) => e.t >= since && matchesTarget(t, itemOf(e.k)));
}

export interface TargetState {
  /** Right answers among the last SOLID_LAST. */
  right: number;
  /** Answers counted (≤ SOLID_LAST). */
  count: number;
  solid: boolean;
  /** When last answered (0 = never). */
  lastAt: number;
}

export function targetState(log: readonly LogEntry[], t: Target, since = 0): TargetState {
  const all = answersFor(log, t, since);
  const last = all.slice(-SOLID_LAST);
  const right = last.filter((e) => e.ok);
  const limit = solidMs(t);
  return {
    right: right.length,
    count: last.length,
    solid:
      last.length >= SOLID_LAST &&
      right.length >= SOLID_RIGHT &&
      median(right.map((e) => e.ms)) <= limit,
    lastAt: all.length ? all[all.length - 1].t : 0,
  };
}

/** Remembered progress: when each step was passed. */
export interface GuidedState {
  passed: Record<string, number>;
  /** Optional steps the learner skipped (when). Skipped steps aren't reviewed. */
  skipped?: Record<string, number>;
}

export const EMPTY_GUIDED: GuidedState = { passed: {} };

/** Parse untrusted guided state (storage, backup import). */
export function sanitizeGuided(v: unknown): GuidedState {
  const times = (o: unknown) => {
    const out: Record<string, number> = {};
    if (o && typeof o === 'object')
      for (const [k, t] of Object.entries(o)) if (typeof t === 'number') out[k] = t;
    return out;
  };
  const g = v as GuidedState | undefined;
  const skipped = times(g?.skipped);
  return Object.keys(skipped).length
    ? { passed: times(g?.passed), skipped }
    : { passed: times(g?.passed) };
}

/** Passed, or skipped (optional steps). */
export function isDone(s: GuidedState, id: string): boolean {
  return id in s.passed || id in (s.skipped ?? {});
}

/** Skip the current step if it's optional. */
export function skipStep(
  s: GuidedState,
  now: number,
  steps: readonly Step[] = CURRICULUM,
): GuidedState {
  const i = currentIndex(s, steps);
  if (i >= steps.length || !steps[i].optional) return s;
  return { ...s, skipped: { ...(s.skipped ?? {}), [steps[i].id]: now } };
}

/** Index of the first step not passed yet (CURRICULUM.length when the path is done). */
export function currentIndex(s: GuidedState, steps: readonly Step[] = CURRICULUM): number {
  const i = steps.findIndex((st) => !isDone(s, st.id));
  return i < 0 ? steps.length : i;
}

/** When step `i` opened: when the step before it was passed (0 for the first). */
export function openedAt(s: GuidedState, i: number, steps: readonly Step[] = CURRICULUM): number {
  if (i === 0) return 0;
  const prev = steps[i - 1].id;
  return s.passed[prev] ?? s.skipped?.[prev] ?? 0;
}

export interface StepProgress {
  index: number;
  step: Step;
  solid: number;
  total: number;
  states: TargetState[];
}

export function stepProgress(
  log: readonly LogEntry[],
  s: GuidedState,
  i: number,
  steps: readonly Step[] = CURRICULUM,
): StepProgress {
  const step = steps[i];
  const since = step.fresh ? openedAt(s, i, steps) : 0;
  const states = step.targets.map((t) => targetState(log, t, since));
  return {
    index: i,
    step,
    solid: states.filter((x) => x.solid).length,
    total: states.length,
    states,
  };
}

/**
 * Mark the current step passed if all its targets are solid, and any following steps that
 * are already solid too (e.g. from earlier practice). Returns the new state and the steps
 * newly passed.
 */
export function advance(
  log: readonly LogEntry[],
  s: GuidedState,
  now: number,
  steps: readonly Step[] = CURRICULUM,
): { state: GuidedState; passed: Step[] } {
  let state = s;
  const passed: Step[] = [];
  for (let i = currentIndex(state, steps); i < steps.length; i = currentIndex(state, steps)) {
    const p = stepProgress(log, state, i, steps);
    if (p.solid < p.total) break;
    state = { ...state, passed: { ...state.passed, [steps[i].id]: now } };
    passed.push(steps[i]);
  }
  return { state, passed };
}

/** Targets of the passed steps (what reviews and spot checks draw from), without repeats. */
export function learnedTargets(s: GuidedState, steps: readonly Step[] = CURRICULUM): Target[] {
  const seen = new Map<string, Target>();
  for (const st of steps) {
    if (!(st.id in s.passed)) continue;
    for (const t of st.targets) seen.set(targetId(t), t);
  }
  return [...seen.values()];
}

/** How many recent answers "still solid" looks at. */
export const RETENTION_WINDOW = 20;

/**
 * "Still solid": the share of right answers among the latest answers to things already
 * learned (passed steps). Null until there are a few such answers.
 */
export function retention(
  log: readonly LogEntry[],
  s: GuidedState,
  steps: readonly Step[] = CURRICULUM,
): number | null {
  const learned = learnedTargets(s, steps);
  if (!learned.length) return null;
  const recent: LogEntry[] = [];
  for (let i = log.length - 1; i >= 0 && recent.length < RETENTION_WINDOW; i--) {
    const item = itemOf(log[i].k);
    if (learned.some((t) => matchesTarget(t, item))) recent.push(log[i]);
  }
  if (recent.length < 5) return null;
  return recent.filter((e) => e.ok).length / recent.length;
}
