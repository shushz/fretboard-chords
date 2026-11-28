/** Guided practice: labels and the progress block (Home, session summary, Progress). */
import { answerLog } from '../progress/store';
import { CURRICULUM, type Target } from './curriculum';
import { SOLID_LAST, currentIndex, retention, stepProgress } from './progress';
import { guided, skipGuidedStep } from './store';
import type { SlotKind } from './plan';

const NUMERALS = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  minor: ['i', 'ii°', '♭III', 'iv', 'V', '♭VI', '♭VII'],
} as const;
const INV = {
  root: 'root position',
  first: '1st inversion',
  second: '2nd inversion',
  third: '3rd inversion',
};

const SEVENTH_SUFFIX = {
  major: ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'ø7'],
  minor: ['m7', 'ø7', 'maj7', 'm7', '7', 'maj7', '7'],
} as const;

/** "I (root position) → IV · strings 2–4" */
export function targetLabel(t: Target): string {
  const base = NUMERALS[t.keyMode];
  const n = (d: number) => {
    // seventh chords: the numeral with its quality (IVmaj7, V7, iiø7…)
    if (!t.sevenths) return base[d];
    const r = base[d].replace('°', '');
    return `${r}${SEVENTH_SUFFIX[t.keyMode][d]}`;
  };
  const set = t.stringSet === '*' ? 'names only' : `strings ${t.stringSet.replace('-', '–')}`;
  const inv = t.inversion ? ` (${INV[t.inversion]})` : '';
  switch (t.mode) {
    case 'fromTonic':
      return `${n(0)}${inv} → ${n(t.degree)}${t.roles === false ? ', no hints' : ''} · ${set}`;
    case 'find':
      return `Find ${n(t.degree)}${inv}${t.anchor ? ' + its root on 6/5' : ''} · ${set}`;
    case 'nameTones':
      return `${t.variant === 'tap' ? 'Tap a tone of' : 'Name the tones of'} ${n(t.degree)} · ${set}`;
    case 'nextShape':
      return `${n(t.degree)}: ${t.variant === 'down' ? 'previous' : 'next'} shape · ${set}`;
    case 'qualitySwitch':
      return `${n(t.degree)}: ${t.variant === 'min>maj' ? 'minor → major' : 'major → minor'} · ${set}`;
    case 'nameChord':
      return `Name ${n(t.degree)} · ${set}`;
    case 'progression':
      return `Progressions with ${n(t.degree)}${t.variant === 'tempo' ? ', in time' : ''} · ${set}`;
  }
}

export const KIND_LABEL: Record<SlotKind, string> = {
  warmup: 'Warm-up',
  new: 'New',
  review: 'Review',
  check: 'Check',
};

export function pct(x: number | null): string {
  return x === null ? '–' : `${Math.round(x * 100)}%`;
}

/** Current step, its progress bar, and "still solid"; `details`: each question's state. */
export function GuidedProgress(props: { compact?: boolean; details?: boolean }) {
  const s = guided.value;
  const log = answerLog.value;
  const i = currentIndex(s);
  const total = CURRICULUM.length;
  const r = retention(log, s);
  if (i >= total)
    return (
      <div class="guided-progress">
        <span>
          All {total} steps passed. Sessions now keep everything fresh
          {r !== null ? ` · still solid ${pct(r)}` : ''}.
        </span>
      </div>
    );
  const sp = stepProgress(log, s, i);
  return (
    <div class="guided-progress">
      <span class="guided-step">
        Step {i + 1} of {total}: {sp.step.title}
      </span>
      {!props.compact && <span class="muted">{sp.step.about}</span>}
      <span
        class="guided-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={sp.total}
        aria-valuenow={sp.solid}
        aria-label="Solid in this step"
      >
        <span style={{ width: `${(100 * sp.solid) / sp.total}%` }} />
      </span>
      <span class="guided-meta">
        {sp.solid} of {sp.total} solid{r !== null ? ` · still solid ${pct(r)}` : ''}
      </span>
      {props.details && (
        <ul class="guided-targets">
          {sp.step.targets.map((t, k) => {
            const st = sp.states[k];
            return (
              <li key={k} class={st.solid ? 'solid' : ''}>
                <span>{targetLabel(t)}</span>
                <span class="num">
                  {st.solid
                    ? 'solid ✓'
                    : st.count === 0
                      ? 'not asked yet'
                      : st.count < SOLID_LAST
                        ? `${st.right} right of ${st.count} (needs ${SOLID_LAST})`
                        : `${st.right} of last ${st.count} right`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** For an optional challenge step: a way past it. */
export function SkipChallenge() {
  const i = currentIndex(guided.value);
  const step = CURRICULUM[i];
  if (!step?.optional) return null;
  return (
    <button type="button" class="btn secondary skip-challenge" onClick={() => skipGuidedStep()}>
      Skip this challenge
    </button>
  );
}
