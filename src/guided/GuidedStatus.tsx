/** Guided practice: labels and the progress block (Home, session summary, Progress). */
import { answerLog } from '../progress/store';
import { CURRICULUM, type Target } from './curriculum';
import { currentIndex, retention, stepProgress } from './progress';
import { guided } from './store';
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

/** "I (root position) → IV · strings 2–4" */
export function targetLabel(t: Target): string {
  const n = NUMERALS[t.keyMode];
  const set = `strings ${t.stringSet.replace('-', '–')}`;
  const inv = t.inversion ? ` (${INV[t.inversion]})` : '';
  switch (t.mode) {
    case 'fromTonic':
      return `${n[0]}${inv} → ${n[t.degree]}${t.roles === false ? ', no hints' : ''} · ${set}`;
    case 'find':
      return `Find ${n[t.degree]}${inv} · ${set}`;
    case 'nameTones':
      return `Name the tones of ${n[t.degree]} · ${set}`;
    case 'progression':
      return `Progressions with ${n[t.degree]} · ${set}`;
  }
}

export const KIND_LABEL: Record<SlotKind, string> = {
  new: 'New',
  review: 'Review',
  check: 'Check',
};

export function pct(x: number | null): string {
  return x === null ? '–' : `${Math.round(x * 100)}%`;
}

/** Current step, its progress bar, and "still solid". */
export function GuidedProgress(props: { compact?: boolean }) {
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
    </div>
  );
}
