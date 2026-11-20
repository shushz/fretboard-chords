import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { strum } from '../../audio/engine';
import { chordNumeral, chordSymbol } from '../../theory/chords';
import { formatKey } from '../../theory/keys';
import { formatStringSet, formatWindow } from '../../fretboard/regions';
import type { Voicing } from '../../fretboard/voicings';
import { type Preferences, numeralOptions, symbolOptions } from '../../prefs/model';
import { chordToneName } from '../../ui/markers';
import { Select, Toggle } from '../../ui/controls';
import { prefs } from '../../prefs/store';
import { type PracticeConfig, voicingOptions } from '../config';
import type { RunnerProps } from '../types';
import { TapQuestion } from '../TapQuestion';
import {
  type ProgressionQuestion,
  beatLimitMs,
  generateProgressionQuestion,
  gradeStep,
  progressionsFor,
  stepItem,
  stepStrings,
} from './logic';
import { type DegreeIndex, diatonicChord } from '../../theory/chords';

export function ProgressionRunner(props: RunnerProps) {
  const { config, prefs: p } = props;
  const q = useMemo<ProgressionQuestion | null>(
    () =>
      generateProgressionQuestion(config, {
        harmony: p.harmony,
        voicing: voicingOptions(p),
        rand: Math.random,
        itemWeight: props.itemWeight,
        previous: props.prev.current,
      }),
    [],
  );
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<(boolean | null)[]>([]);
  const played = useRef<Voicing[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!q) props.onImpossible();
    else props.prev.current = q;
  }, []);
  if (!q) return null;
  const no = numeralOptions(p);
  const numerals = q.chords.map((c) => chordNumeral(c, no));
  const prevVoicing = step > 0 ? played.current[step - 1] : null;
  const chord = q.chords[step];
  const last = step === q.chords.length - 1;
  const limit = config.tempo ? beatLimitMs(p.practice.tempoBpm, p.practice.tempoBeats) : undefined;

  const strip = (
    <div class="prog-strip" aria-label="Progression">
      {numerals.map((n, i) => (
        <span
          key={i}
          class={`prog-step${i === step && !finished ? ' current' : ''}${results[i] === true ? ' ok' : results[i] === false ? ' bad' : ''}`}
        >
          {n}
        </span>
      ))}
    </div>
  );

  if (finished) {
    return (
      <div class="runner">
        {strip}
        <div class="feedback correct" role="status">
          <div class="feedback-text">
            <strong>
              {results.filter(Boolean).length}/{results.length}
            </strong>{' '}
            chords found · {numerals.join(' – ')}
          </div>
          <button
            type="button"
            class="btn secondary"
            onClick={() => playProgression(played.current)}
          >
            ▶ Replay
          </button>
          <button type="button" class="btn next" onClick={props.onNext} autoFocus>
            Next
          </button>
        </div>
      </div>
    );
  }

  return (
    <TapQuestion
      key={step}
      prefs={p}
      before={strip}
      label={`Fretboard: progression step ${step + 1}, find ${numerals[step]}`}
      prompt={{
        main: (
          <>
            {formatKey(chord.key, p.spelling.glyphs)} · {numerals[step]}
          </>
        ),
        sub: `${formatStringSet(q.region.stringSet)} · ${formatWindow(q.region.window)}`,
        hint: prevVoicing
          ? `Stay close to the ${numerals[step - 1]} (dimmed).`
          : 'Find the first chord.',
      }}
      chord={chord}
      region={q.region}
      context={prevVoicing?.notes}
      requiredStrings={stepStrings(q)}
      timeLimitMs={limit}
      autoNextMs={last ? undefined : 700}
      nextLabel={last ? 'Finish' : 'Next chord'}
      grade={(taps) => {
        const g = gradeStep(q, step, taps, prevVoicing);
        const reveal = g.smoothest.length ? g.smoothest : q.valid[step];
        return {
          correct: g.correct,
          matched: g.matched,
          reveal,
          message: (
            <>
              {g.smooth && <span class="badge">Smooth ✦</span>} {numerals[step]} ={' '}
              {chordSymbol(chord, symbolOptions(p))} ({chordToneName(chord, p)})
            </>
          ),
        };
      }}
      onGraded={(correct, timeMs, matched) => {
        const g = gradeStep(q, step, new Map(), prevVoicing);
        // remember what the user played (or the closest shape) for the next step
        played.current[step] = matched ?? g.smoothest[0] ?? q.valid[step][0];
        setResults((r) => {
          const n = [...r];
          n[step] = correct;
          return n;
        });
        props.onGraded([
          {
            item: stepItem(q, step),
            correct,
            timeMs,
            at: Date.now(),
            window: q.region.window,
            sevenths: config.sevenths,
          },
        ]);
      }}
      onNext={() => {
        if (last) {
          setFinished(true);
          setTimeout(() => playProgression(played.current), 200);
        } else setStep(step + 1);
      }}
    />
  );
}

function playProgression(vs: readonly Voicing[]): void {
  vs.forEach((v, i) => setTimeout(() => strum(v.notes.map((n) => n.midi)), i * 900));
}

export function ProgressionSetup(props: {
  config: PracticeConfig;
  onChange: (c: PracticeConfig) => void;
}) {
  const c = props.config;
  const p: Preferences = prefs.value;
  const list = progressionsFor(c.key.mode);
  const label = (degrees: number[]) =>
    degrees
      .map((d) =>
        chordNumeral(diatonicChord(c.key, d as DegreeIndex, false, p.harmony), numeralOptions(p)),
      )
      .join('–');
  return (
    <>
      <Select
        label="Progression"
        value={list.some((x) => x.id === c.variant) ? c.variant! : 'random'}
        options={[
          { value: 'random', label: 'Random' },
          ...list.map((x) => ({ value: x.id, label: label(x.degrees) })),
        ]}
        onChange={(variant) => props.onChange({ ...c, variant })}
      />
      <Toggle
        label="Tempo mode"
        hint={`${p.practice.tempoBeats} beats at ${p.practice.tempoBpm} BPM per chord`}
        checked={!!c.tempo}
        onChange={(tempo) => props.onChange({ ...c, tempo })}
      />
    </>
  );
}
