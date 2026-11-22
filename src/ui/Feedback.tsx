import type { ComponentChildren } from 'preact';

export function FeedbackBar(props: {
  /** `shown`: the user asked to see the answer — neutral, not a mistake. */
  state: 'correct' | 'wrong' | 'shown' | null;
  children?: ComponentChildren;
  onNext?: () => void;
  nextLabel?: string;
}) {
  if (!props.state) return null;
  return (
    <div class={`feedback ${props.state}`} role="status">
      <div class="feedback-text">{props.children}</div>
      {props.onNext && (
        <button type="button" class="btn next" onClick={props.onNext} autoFocus>
          {props.nextLabel ?? 'Next'}
        </button>
      )}
    </div>
  );
}
