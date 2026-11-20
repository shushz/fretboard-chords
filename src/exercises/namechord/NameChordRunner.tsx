import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { feedback } from '../../audio/engine';
import { chordNumeral, chordSymbol } from '../../theory/chords';
import { formatKey } from '../../theory/keys';
import { enumerateVoicings } from '../../fretboard/voicings';
import { numeralOptions, symbolOptions } from '../../prefs/model';
import { FeedbackBar } from '../../ui/Feedback';
import { Segmented } from '../../ui/controls';
import { chordToneName } from '../../ui/markers';
import type { PracticeConfig } from '../config';
import type { RunnerProps } from '../types';
import { type NameChordQuestion, generateNameChordQuestion, nameChordItem } from './logic';

export function NameChordRunner(props: RunnerProps) {
  const { config, prefs: p } = props;
  const q = useMemo<NameChordQuestion | null>(
    () =>
      generateNameChordQuestion(config, {
        harmony: p.harmony,
        symbol: symbolOptions(p),
        numeral: numeralOptions(p),
        rand: Math.random,
        itemWeight: props.itemWeight,
        previous: props.prev.current,
      }),
    [],
  );
  const started = useRef(performance.now());
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    if (!q) props.onImpossible();
    else props.prev.current = q;
  }, []);
  if (!q) return null;
  const keyName = formatKey(q.chord.key);
  const numeral = chordNumeral(q.chord, numeralOptions(p));
  const symbol = chordSymbol(q.chord, symbolOptions(p));

  const pick = (o: string) => {
    if (picked) return;
    setPicked(o);
    const ok = o === q.answer;
    const v =
      enumerateVoicings(q.chord, q.chord.tones.length > 3 ? '2-5' : '2-4', {
        maxFret: p.fretboard.fretRange,
        maxSpan: p.fretboard.maxSpan,
      }).find((x) => x.position >= config.window.start) ?? null;
    feedback(ok, v ? v.notes.map((n) => n.midi) : []);
    props.onGraded([
      {
        item: nameChordItem(q),
        correct: ok,
        timeMs: performance.now() - started.current,
        at: Date.now(),
        sevenths: config.sevenths,
      },
    ]);
  };

  return (
    <div class="runner">
      <div class="prompt">
        <div class="prompt-main">
          {q.direction === 'forward' ? (
            <>
              In {keyName}, what is {numeral}?
            </>
          ) : (
            <>
              {symbol} is which degree in {keyName}?
            </>
          )}
        </div>
      </div>
      <div class="choices" role="group" aria-label="Answers">
        {q.options.map((o) => (
          <button
            type="button"
            key={o}
            class={`choice${picked ? (o === q.answer ? ' right' : o === picked ? ' wrong' : ' dim') : ''}`}
            disabled={!!picked}
            onClick={() => pick(o)}
          >
            {o}
          </button>
        ))}
      </div>
      {picked && (
        <FeedbackBar state={picked === q.answer ? 'correct' : 'wrong'} onNext={props.onNext}>
          <strong>{picked === q.answer ? '✓ Correct' : '✕ Not quite'}</strong>{' '}
          <span>
            {numeral} in {keyName} = {symbol} ({chordToneName(q.chord, p)})
          </span>
        </FeedbackBar>
      )}
    </div>
  );
}

export function NameChordSetup(props: {
  config: PracticeConfig;
  onChange: (c: PracticeConfig) => void;
}) {
  const v =
    props.config.variant === 'forward' || props.config.variant === 'reverse'
      ? props.config.variant
      : 'both';
  return (
    <Segmented
      label="Direction"
      value={v}
      options={[
        { value: 'forward', label: 'Degree → chord' },
        { value: 'reverse', label: 'Chord → degree' },
        { value: 'both', label: 'Both' },
      ]}
      onChange={(variant) => props.onChange({ ...props.config, variant })}
    />
  );
}
