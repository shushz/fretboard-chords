import { BoardFrame } from '../ui/BoardFrame';
import { clockNow } from './answerClock';
/** Shared UI for questions answered by tapping a voicing on the fretboard. */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { feedback, playNote, revealSound, strum } from '../audio/engine';
import { type Chord, toneForPitchClass } from '../theory/chords';
import { type FretWindow, type Region, formatWindow } from '../fretboard/regions';
import { type StringNum, midiAt, pitchClassAt } from '../fretboard/tuning';
import {
  type Voicing,
  type VoicingNote,
  fitsWindow,
  fretted,
  voicingId,
} from '../fretboard/voicings';
import type { Preferences } from '../prefs/model';
import { Fretboard, type Marker } from '../ui/Fretboard';
import { FeedbackBar } from '../ui/Feedback';
import { chooseVisibleRange } from '../ui/fretboardGeometry';
import { noteMarker } from '../ui/markers';
import { useBoardWidth } from '../ui/useViewport';
import { type Taps, applyTapTo } from './taps';
import { voicingOptions } from './config';
import { shapeAnywhere } from './region';

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
  /** `revealed`: the user tapped Show answer (not a mistake, though not right either). */
  onGraded: (correct: boolean, timeMs: number, matched: Voicing | null, revealed: boolean) => void;
  onNext: () => void;
  label: string;
  /** Extra controls rendered next to Clear / Show answer. */
  extraActions?: ComponentChildren;
  /** After answering: names for the faded given shape and the answer, shown as a key. */
  legend?: { given: string; answer: string };
  /** Rendered above the prompt (e.g. a progression strip). */
  before?: ComponentChildren;
  /** Hint notes shown dimmed, with roles, until the answer is graded (e.g. the root on 6/5). */
  hints?: readonly VoicingNote[];
  /** Reference notes always shown dimmed (e.g. the previous chord). */
  context?: readonly VoicingNote[];
  /**
   * The mode accepts shapes near the window, not only inside it (From the tonic, Progression
   * walk): a right chord that still isn't accepted is "too far", not "outside".
   */
  nearby?: boolean;
  /** Tempo mode: time allowed before the question counts as missed. */
  timeLimitMs?: number;
  /** Advance automatically this long after a correct answer. */
  autoNextMs?: number;
  nextLabel?: string;
}

export function TapQuestion(props: TapQuestionProps) {
  const p = props.prefs;
  const started = useRef(clockNow());
  const [taps, setTaps] = useState<Taps>(new Map());
  const [grade, setGrade] = useState<TapGrade | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [shown, setShown] = useState(false);
  // The right chord, played somewhere the question doesn't accept: told apart from a mistake.
  const [elsewhere, setElsewhere] = useState(false);
  const tapsRef = useRef<Taps>(taps);
  tapsRef.current = taps;
  const gradedRef = useRef(false);
  const vw = useBoardWidth();
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

  /** `reveal`: the user tapped Show answer (neutral feedback, still counts as not right). */
  const submit = (t: Taps, gaveUp: boolean, reveal = false) => {
    if (gradedRef.current) return;
    gradedRef.current = true;
    const g0 = props.grade(t);
    const g: TapGrade = gaveUp ? { ...g0, correct: false, matched: null } : g0;
    setGrade(g);
    const timeMs = clockNow() - started.current;
    const v = g.matched ?? g.reveal[0];
    const midis = v ? v.notes.map((n) => n.midi) : [];
    const vo = voicingOptions(p);
    const found =
      !g.correct && !gaveUp ? shapeAnywhere(props.chord, props.region.stringSet, t, vo) : null;
    // Inside the window but still wrong (e.g. a wrong anchor) isn't "elsewhere".
    const away = found && !fitsWindow(found, props.region.window, vo.allowOutside) ? found : null;
    if (reveal) {
      setShown(true);
      revealSound(midis);
    } else if (away) {
      setElsewhere(true);
      revealSound(away.notes.map((n) => n.midi));
    } else feedback(g.correct, midis);
    props.onGraded(g.correct, timeMs, g.matched, reveal);
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
  if (!grade)
    for (const n of props.hints ?? []) add(noteMarker(n, 'ghost', p, { showRoles: true }));
  for (const n of props.shown ?? []) {
    add(
      // After answering, the given shape fades so the answer stands out (key below the board).
      noteMarker(n, grade ? 'given' : 'shown', p, {
        // Before answering, roles *and* role colors are a hint: both follow `shownRoles`.
        showRoles: grade ? true : (props.shownRoles ?? false),
        colored: grade ? true : (props.shownRoles ?? false),
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
            ok ? 'correct' : inAnswer ? 'reveal' : elsewhere ? 'shown' : 'wrong',
            p,
            {
              showRoles: true,
              colored: !!ok || inAnswer || elsewhere,
            },
          ),
        );
      } else add({ string: s, fret: f, kind: 'wrong', label: '✕' });
    }
  } else {
    for (const [s, f] of taps) add({ string: s, fret: f, kind: 'tap' });
  }

  const view = props.view ?? props.region.window;
  const range = chooseVisibleRange(view, maxFret, vw);

  return (
    <div class="runner">
      {props.before}
      <div class="prompt">
        <div class="prompt-main">{props.prompt.main}</div>
        {props.prompt.sub && <div class="prompt-sub">{props.prompt.sub}</div>}
        {props.prompt.hint && <div class="prompt-hint">{props.prompt.hint}</div>}
      </div>
      <BoardFrame>
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
      </BoardFrame>
      {grade && props.legend && props.shown?.length ? (
        <p class="board-legend">
          <span class="legend-dot faded" /> {props.legend.given}
          <span class="legend-dot" /> {props.legend.answer}
        </p>
      ) : null}
      {grade ? (
        <FeedbackBar
          state={grade.correct ? 'correct' : shown || elsewhere ? 'shown' : 'wrong'}
          onNext={props.onNext}
          nextLabel={props.nextLabel}
        >
          <strong>
            {grade.correct
              ? '✓ Correct'
              : shown
                ? 'Answer:'
                : elsewhere
                  ? `Right chord, but ${props.nearby ? 'too far from' : 'outside'} ${formatWindow(props.region.window)}.`
                  : timedOut
                    ? "⏱ Time's up"
                    : '✕ Not quite'}
          </strong>{' '}
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
          <button type="button" class="btn secondary" onClick={() => submit(taps, true, true)}>
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
