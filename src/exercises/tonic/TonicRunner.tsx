import { useEffect, useMemo } from 'preact/hooks';
import { chordNumeral, chordSymbol } from '../../theory/chords';
import { formatKey } from '../../theory/keys';
import { formatStringSet, formatWindow } from '../../fretboard/regions';
import { numeralOptions, symbolOptions } from '../../prefs/model';
import { chordToneName } from '../../ui/markers';
import { type PracticeConfig, voicingOptions } from '../config';
import { Segmented } from '../../ui/controls';
import type { RunnerProps } from '../types';
import { GivenShapeHint } from '../GivenShapeHint';
import { TapQuestion, inversionName } from '../TapQuestion';
import {
  type TonicQuestion,
  generateTonicQuestion,
  gradeTonic,
  tonicItem,
  tonicPlacement,
  tonicRequiredStrings,
} from './logic';

export function TonicRunner(props: RunnerProps) {
  const { config, prefs: p } = props;
  const q = useMemo<TonicQuestion | null>(
    () =>
      generateTonicQuestion(config, {
        harmony: p.harmony,
        voicing: voicingOptions(p),
        rand: Math.random,
        itemWeight: props.itemWeight,
        previous: props.prev.current,
      }),
    [],
  );
  useEffect(() => {
    if (!q) props.onImpossible();
    else props.prev.current = q;
  }, []);
  if (!q) return null;
  const no = numeralOptions(p);
  const tonicNum = chordNumeral(q.tonic, no);
  const numeral = chordNumeral(q.target, no);

  return (
    <TapQuestion
      prefs={p}
      label={`Fretboard: from ${tonicNum} find ${numeral}`}
      prompt={{
        main: (
          <>
            {formatKey(q.target.key)} · {tonicNum} → {numeral}
          </>
        ),
        sub: `${formatStringSet(q.region.stringSet)} · ${formatWindow(q.region.window)}`,
        hint: p.practice.givenShapeRoles
          ? `Here's the ${tonicNum} (${inversionName(q.tonicVoicing.inversion)}). Find the ${numeral} nearby.`
          : `Here's the ${tonicNum}. Find the ${numeral} nearby.`,
      }}
      chord={q.target}
      region={q.region}
      shown={q.tonicVoicing.notes}
      shownRoles={p.practice.givenShapeRoles}
      legend={{ given: `${tonicNum} (given)`, answer: numeral }}
      playOnShow={q.tonicVoicing.notes.map((n) => n.midi)}
      requiredStrings={tonicRequiredStrings(q)}
      grade={(taps) => {
        const g = gradeTonic(q, taps);
        return {
          correct: g.correct,
          matched: g.matched,
          reveal: q.smooth,
          message: (
            <>
              {g.smooth && <span class="badge">Smooth ✦</span>} {numeral} ={' '}
              {chordSymbol(q.target, symbolOptions(p))} ({chordToneName(q.target, p)})
              {g.correct && !g.smooth && ' · a closer shape exists'}
              {!g.correct && ' · closest shape shown'}
            </>
          ),
        };
      }}
      onGraded={(correct, timeMs) =>
        props.onGraded([
          {
            item: tonicItem(q),
            correct,
            timeMs,
            at: Date.now(),
            window: q.region.window,
            sevenths: config.sevenths,
          },
        ])
      }
      onNext={props.onNext}
    />
  );
}

export function TonicSetup(props: {
  config: PracticeConfig;
  onChange: (c: PracticeConfig) => void;
}) {
  return (
    <>
      <Segmented
        label="Tonic shape"
        value={tonicPlacement(props.config)}
        options={[
          { value: 'neck', label: 'Anywhere on the neck' },
          { value: 'window', label: 'Inside the fret window' },
        ]}
        onChange={(variant) => props.onChange({ ...props.config, variant })}
      />
      <GivenShapeHint />
    </>
  );
}
