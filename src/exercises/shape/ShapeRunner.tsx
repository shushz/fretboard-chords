import { useEffect, useMemo } from 'preact/hooks';
import { chordNumeral, chordSymbol } from '../../theory/chords';
import { formatStringSet } from '../../fretboard/regions';
import { numeralOptions, symbolOptions } from '../../prefs/model';
import { voicingOptions } from '../config';
import type { RunnerProps } from '../types';
import { GivenShapeHint } from '../GivenShapeHint';
import { TapQuestion, inversionName } from '../TapQuestion';
import { Segmented } from '../../ui/controls';
import type { PracticeConfig } from '../config';
import {
  type ShapeQuestion,
  generateShapeQuestion,
  gradeShape,
  shapeItem,
  shapeRequiredStrings,
  shapeView,
} from './logic';
import { formatKey } from '../../theory/keys';

export function ShapeRunner(props: RunnerProps) {
  const { config, prefs: p } = props;
  const q = useMemo<ShapeQuestion | null>(
    () =>
      generateShapeQuestion(config, {
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
  const symbol = chordSymbol(q.chord, symbolOptions(p));
  const numeral = chordNumeral(q.chord, numeralOptions(p));
  const view = shapeView(q);
  const up = q.direction === 'up';

  return (
    <TapQuestion
      prefs={p}
      label={`Fretboard: ${up ? 'next' : 'previous'} shape of ${symbol}`}
      prompt={{
        main: (
          <>
            {symbol} · {up ? 'next shape ↑' : 'previous shape ↓'}
          </>
        ),
        sub: `${formatStringSet(q.stringSet)} · ${numeral} in ${formatKey(q.chord.key)}`,
        hint: `${(config.givenRoles ?? p.practice.givenShapeRoles) ? `This is ${inversionName(q.shown.inversion)}. ` : ''}Find the ${up ? 'next' : 'previous'} shape ${up ? 'up' : 'down'} the neck.`,
      }}
      chord={q.chord}
      region={{ stringSet: q.stringSet, window: view }}
      view={view}
      shown={q.shown.notes}
      shownRoles={config.givenRoles ?? p.practice.givenShapeRoles}
      legend={{ given: 'this shape (given)', answer: up ? 'next shape' : 'previous shape' }}
      playOnShow={q.shown.notes.map((n) => n.midi)}
      requiredStrings={shapeRequiredStrings(q)}
      grade={(taps) => {
        const g = gradeShape(q, taps);
        return {
          correct: g.correct,
          matched: g.matched,
          reveal: [q.target],
          message: (
            <>
              {inversionName(q.shown.inversion)} → {inversionName(q.target.inversion)} at fret{' '}
              {q.target.position}
            </>
          ),
        };
      }}
      onGraded={(correct, timeMs) =>
        props.onGraded([
          { item: shapeItem(q), correct, timeMs, at: Date.now(), sevenths: config.sevenths },
        ])
      }
      onNext={props.onNext}
    />
  );
}

export function ShapeSetup(props: {
  config: PracticeConfig;
  onChange: (c: PracticeConfig) => void;
}) {
  const v =
    props.config.variant === 'up' || props.config.variant === 'down'
      ? props.config.variant
      : 'both';
  return (
    <>
      <Segmented
        label="Direction"
        value={v}
        options={[
          { value: 'up', label: 'Up ↑' },
          { value: 'down', label: 'Down ↓' },
          { value: 'both', label: 'Both' },
        ]}
        onChange={(variant) => props.onChange({ ...props.config, variant })}
      />
      <GivenShapeHint />
    </>
  );
}
