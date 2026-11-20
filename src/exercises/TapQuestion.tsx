/** Shared UI for questions answered by tapping a voicing on the fretboard. */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { feedback, playNote, strum } from '../audio/engine';
import { type Chord, toneForPitchClass } from '../theory/chords';
import type { FretWindow, Region } from '../fretboard/regions';
import { type StringNum, midiAt, pitchClassAt } from '../fretboard/tuning';
import { type Voicing, type VoicingNote, fretted, voicingId } from '../fretboard/voicings';
import type { Preferences } from '../prefs/model';
import { Fretboard, type Marker } from '../ui/Fretboard';
import { FeedbackBar } from '../ui/Feedback';
import { chooseVisibleRange } from '../ui/fretboardGeometry';
import { noteMarker } from '../ui/markers';
import { useViewportWidth } from '../ui/useViewport';
import { type Taps, applyTapTo } from './taps';

export type { Taps };

export interface TapGrade {
  correct: boolean;
  /** The valid voicing the answer matched, if any. */
  matched: Voicing | null;
  /** Voicings to reveal when wrong. */
  reveal: readonly Voicing[];
  /** Extra notes to show after grading (ghost anchors). */
  ghosts?: readonly VoicingNote[];
  /** Tapped positions that count as correct beyond `matched` (e.g. anchor root). */
  okPositions?: readonly { string: StringNum; fret: number }[];
  message: ComponentChildren;
}

export interface TapQuestionProps {
  prefs: Preferences;
  prompt: { main: ComponentChildren; sub?: ComponentChildren; hint?: ComponentChildren };
  chord: Chord;
  region: Region;
  /** Frets that must be visible (defaults to the region window). */
  view?: FretWindow;
  /** Given notes (e.g. the tonic voicing), shown before and after answering. */
  shown?: readonly VoicingNote[];
  /** Show role labels on the given notes before answering. */
  shownRoles?: boolean;
  /** Play these notes as a strum when the question appears. */
  playOnShow?: readonly number[];
  requiredStrings: readonly StringNum[];
  grade: (taps: Taps) => TapGrade;
  onGraded: (correct: boolean, timeMs: number, matched: Voicing | null) => void;
  onNext: () => void;
  label: string;
  /** Extra controls rendered next to Clear / Show answer. */
  extraActions?: ComponentChildren;
  /** Rendered above the prompt (e.g. a progression strip). */
  before?: ComponentChildren;
  /** Reference notes always shown dimmed (e.g. the previous chord). */
  context?: readonly VoicingNote[];
  /** Tempo mode: time allowed before the question counts as missed. */
  timeLimitMs?: number;
  /** Advance automatically this long after a correct answer. */
  autoNextMs?: number;
  nextLabel?: string;
}

export function TapQuestion(props: TapQuestionProps) {
  const p = props.prefs;
  const started = useRef(performance.now());
  const [taps, setTaps] = useState<Taps>(new Map());
  const [grade, setGrade] = useState<TapGrade | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const tapsRef = useRef<Taps>(taps);
  tapsRef.current = taps;
  const gradedRef = useRef(false);
  const vw = useViewportWidth();
  const maxFret = p.fretboard.fretRange;

  useEffect(() => {
    if (props.playOnShow?.length) strum(props.playOnShow);
    if (!props.timeLimitMs) return;
    const id = setTimeout(() => {
      if (gradedRef.current) return;
      setTimedOut(true);
      submit(tapsRef.current, true);
    }, props.timeLimitMs);
    return () => clearTimeout(id);
    // once per question
  }, []);

  useEffect(() => {
    if (!grade?.correct || !props.autoNextMs) return;
    const id = setTimeout(props.onNext, props.autoNextMs);
    return () => clearTimeout(id);
  }, [grade]);

  const submit = (t: Taps, gaveUp: boolean) => {
    if (gradedRef.current) return;
    gradedRef.current = true;
    const g0 = props.grade(t);
    const g: TapGrade = gaveUp ? { ...g0, correct: false, matched: null } : g0;
    setGrade(g);
    const timeMs = performance.now() - started.current;
    const v = g.matched ?? g.reveal[0];
    feedback(g.correct, v ? v.notes.map((n) => n.midi) : []);
    props.onGraded(g.correct, timeMs, g.matched);
  };

  const onTap = (s: StringNum, f: number) => {
    if (grade) return;
    const next = applyTapTo(props.requiredStrings, taps, s, f);
    if (next === taps) return;
    if (next.get(s) === f) playNote(midiAt(s, f));
    setTaps(next);
    if (props.requiredStrings.every((x) => next.has(x))) submit(next, false);
  };

  const markers: Marker[] = [];
  const add = (m: Marker) => {
    const i = markers.findIndex((x) => x.string === m.string && x.fret === m.fret);
    if (i >= 0) markers[i] = m;
    else markers.push(m);
  };
  for (const n of props.context ?? [])
    add(noteMarker(n, 'ghost', p, { showRoles: false, colored: false }));
  for (const n of props.shown ?? []) {
    add(
      noteMarker(n, 'shown', p, {
        showRoles: grade ? true : (props.shownRoles ?? false),
        colored: true,
      }),
    );
  }
  if (grade) {
    if (!grade.correct)
      for (const v of grade.reveal)
        for (const n of v.notes) add(noteMarker(n, 'reveal', p, { showRoles: true }));
    for (const n of grade.ghosts ?? []) add(noteMarker(n, 'ghost', p, { showRoles: true }));
    const answer = new Set(
      grade.reveal.flatMap((v) => v.notes.map((n) => `${n.string}:${n.fret}`)),
    );
    for (const [s, f] of taps) {
      const tone = toneForPitchClass(props.chord, pitchClassAt(s, f));
      const ok =
        grade.matched?.notes.some((n) => n.string === s && n.fret === f) ||
        grade.okPositions?.some((o) => o.string === s && o.fret === f);
      const inAnswer = answer.has(`${s}:${f}`);
      if (tone) {
        add(
          noteMarker(
            { ...fretted(s, f), tone, role: tone.role },
            ok ? 'correct' : inAnswer ? 'reveal' : 'wrong',
            p,
            {
              showRoles: true,
              colored: !!ok || inAnswer,
            },
          ),
        );
      } else add({ string: s, fret: f, kind: 'wrong', label: '✕' });
    }
  } else {
    for (const [s, f] of taps) add({ string: s, fret: f, kind: 'tap' });
  }

  const view = props.view ?? props.region.window;
  const range = chooseVisibleRange(view, maxFret, Math.min(vw, 1200) - 24);

  return (
    <div class="runner">
      {props.before}
      <div class="prompt">
        <div class="prompt-main">{props.prompt.main}</div>
        {props.prompt.sub && <div class="prompt-sub">{props.prompt.sub}</div>}
        {props.prompt.hint && <div class="prompt-hint">{props.prompt.hint}</div>}
      </div>
      <div class="board-wrap">
        <Fretboard
          fromFret={range.from}
          toFret={range.to}
          region={props.region}
          markers={markers}
          leftHanded={p.fretboard.leftHanded}
          showFretNumbers={p.fretboard.showFretNumbers}
          onTap={onTap}
          label={props.label}
        />
      </div>
      {grade ? (
        <FeedbackBar
          state={grade.correct ? 'correct' : 'wrong'}
          onNext={props.onNext}
          nextLabel={props.nextLabel}
        >
          <strong>{grade.correct ? '✓ Correct' : timedOut ? "⏱ Time's up" : '✕ Not quite'}</strong>{' '}
          <span>{grade.message}</span>
        </FeedbackBar>
      ) : (
        <div class="actions">
          {props.timeLimitMs ? (
            <div class="tempo-bar" aria-hidden="true">
              <span style={{ animationDuration: `${props.timeLimitMs}ms` }} />
            </div>
          ) : null}
          <button
            type="button"
            class="btn secondary"
            disabled={taps.size === 0}
            onClick={() => setTaps(new Map())}
          >
            Clear
          </button>
          {props.extraActions}
          <button type="button" class="btn secondary" onClick={() => submit(taps, true)}>
            Show answer
          </button>
        </div>
      )}
      <span hidden data-testid="valid-voicings">
        {(grade?.reveal ?? []).map((v) => voicingId(v)).join(' ')}
      </span>
    </div>
  );
}

export function inversionName(i: string): string {
  return i === 'root' ? 'root position' : `${i} inversion`;
}
