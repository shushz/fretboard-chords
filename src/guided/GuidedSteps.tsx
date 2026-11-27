/** Progress screen: the guided path, step by step. */
import { Section } from '../ui/controls';
import { CURRICULUM } from './curriculum';
import { currentIndex } from './progress';
import { guided } from './store';
import { GuidedProgress, SkipChallenge } from './GuidedStatus';

export function GuidedSteps() {
  const s = guided.value;
  const cur = currentIndex(s);
  return (
    <Section title="Guided practice">
      <div class="guided-steps">
        <p class="explain">
          Guided practice follows a path of {CURRICULUM.length} small steps, from the tonic on
          strings 2–4 through every mode, string set, minor keys and seventh chords. Challenge steps
          are optional and can be skipped. A step is passed when each of its questions has been
          right at least 4 of the last 5 times, in any keys, without being slow. <i>Still solid</i>{' '}
          is how often you've been right lately on what's already passed.
        </p>
        <GuidedProgress />
        <SkipChallenge />
        <details>
          <summary>All steps</summary>
          <ol>
            {CURRICULUM.map((st, i) => (
              <li key={st.id} class={i < cur ? 'done' : i === cur ? 'current' : 'later'}>
                {i < cur ? (st.id in (s.skipped ?? {}) ? '– ' : '✓ ') : ''}
                {st.title}
                {st.optional ? ' (optional)' : ''}
              </li>
            ))}
          </ol>
        </details>
      </div>
    </Section>
  );
}
