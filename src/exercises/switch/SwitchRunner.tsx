import { BoardFrame } from '../../ui/BoardFrame';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { feedback, playNote, revealSound, strum } from '../../audio/engine';
import { buildChord, chordSymbol, qualityName } from '../../theory/chords';
import { formatStringSet } from '../../fretboard/regions';
import { type StringNum, midiAt } from '../../fretboard/tuning';
import { symbolOptions } from '../../prefs/model';
import { Fretboard, type Marker } from '../../ui/Fretboard';
import { FeedbackBar } from '../../ui/Feedback';
import { chooseVisibleRange } from '../../ui/fretboardGeometry';
import { chordToneName, noteMarker } from '../../ui/markers';
import { roleLabel } from '../../ui/roleStyle';
import { useBoardWidth } from '../../ui/useViewport';
import { voicingOptions } from '../config';
import type { RunnerProps } from '../types';
import {
  type SwitchQuestion,
  generateSwitchQuestion,
  resultNotes,
  switchItem,
  tapSwitch,
} from './logic';
import { formatNote } from '../../theory/notes';

export function SwitchRunner(props: RunnerProps) {
  const { config, prefs: p } = props;
  const q = useMemo<SwitchQuestion | null>(
    () =>
      generateSwitchQuestion(config, {
        harmony: p.harmony,
        voicing: voicingOptions(p),
        rand: Math.random,
        itemWeight: props.itemWeight,
        previous: props.prev.current,
        extensions: {
          minDim: p.practice.switchMinDim,
          majAug: p.practice.switchMajAug,
          dom7: p.practice.switchDom7,
        },
      }),
    [],
  );
  const started = useRef(performance.now());
  const [selected, setSelected] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    reason?: string;
    tap?: { s: StringNum; f: number };
  } | null>(null);
  const [named, setNamed] = useState<string | null>(null);
  const vw = useBoardWidth();

  useEffect(() => {
    if (!q) {
      props.onImpossible();
      return;
    }
    props.prev.current = q;
    strum(q.voicing.notes.map((n) => n.midi));
  }, []);
  if (!q) return null;
  const so = symbolOptions(p);
  const src = chordSymbol(q.source, so);
  const dst = chordSymbol(q.target, so);
  const after = resultNotes(q);

  const grade = (ok: boolean, reason?: string, tap?: { s: StringNum; f: number }) => {
    setResult({ ok, reason, tap });
    if (reason === 'shown') revealSound(after.map((n) => n.midi));
    else
      feedback(
        ok,
        after.map((n) => n.midi),
      );
    if (!ok && reason !== 'shown') setTimeout(() => strum(after.map((n) => n.midi)), 700);
    props.onGraded([
      {
        item: switchItem(q),
        correct: ok,
        timeMs: performance.now() - started.current,
        at: Date.now(),
        window: q.region.window,
        sevenths: config.sevenths,
      },
    ]);
  };

  const onTap = (s: StringNum, f: number) => {
    if (result) return;
    const r = tapSwitch(q, s, f);
    playNote(midiAt(s, f));
    if (r.kind === 'select') {
      setSelected(true);
      return;
    }
    grade(r.kind === 'correct', r.kind === 'wrong' ? r.reason : undefined, { s, f });
  };

  const markers: Marker[] = [];
  if (!result) {
    for (const n of q.voicing.notes) {
      const m = noteMarker(n, 'shown', p, { showRoles: false, colored: false });
      if (selected && n === q.moving) m.kind = 'tap';
      markers.push(m);
    }
  } else {
    for (const n of after) {
      const isMoved = n.string === q.moving.string;
      markers.push(
        noteMarker(n, isMoved ? (result.ok ? 'correct' : 'reveal') : 'shown', p, {
          showRoles: true,
          colored: true,
        }),
      );
    }
    markers.push(noteMarker(q.moving, 'ghost', p, { showRoles: true }));
    if (!result.ok && result.tap) {
      const t = result.tap;
      if (!markers.some((m) => m.string === t.s && m.fret === t.f))
        markers.push({ string: t.s, fret: t.f, kind: 'wrong', label: '✕' });
      else {
        const m = markers.find((x) => x.string === t.s && x.fret === t.f)!;
        m.kind = 'wrong';
      }
    }
  }
  const range = chooseVisibleRange(q.region.window, p.fretboard.fretRange, vw);
  const moved = q.moving;
  const movedTo = after.find((n) => n.string === moved.string)!;

  const nameOptions = useMemo(() => {
    const r = q.source.root;
    const qs = [q.def.to, q.def.from, ...(['maj', 'min', 'dim', 'aug'] as const)].filter(
      (x, i, a) => a.indexOf(x) === i,
    );
    return qs
      .slice(0, 4)
      .map((x) => chordSymbol(buildChord(r, x), so))
      .sort();
  }, []);

  return (
    <div class="runner">
      <div class="prompt">
        <div class="prompt-main">
          {src} → {qualityName(q.def.to)}
        </div>
        <div class="prompt-sub">{formatStringSet(q.region.stringSet)} · move one note</div>
        {!result && (
          <div class="prompt-hint">
            {selected
              ? 'Now tap where it goes.'
              : 'Tap the note that has to move (or tap straight where it goes).'}
          </div>
        )}
      </div>
      <BoardFrame>
        <Fretboard
          fromFret={range.from}
          toFret={range.to}
          region={q.region}
          markers={markers}
          leftHanded={p.fretboard.leftHanded}
          showFretNumbers={p.fretboard.showFretNumbers}
          onTap={onTap}
          label={`Fretboard: change ${src} to ${qualityName(q.def.to)}`}
        />
      </BoardFrame>
      {result ? (
        <>
          <FeedbackBar
            state={result.ok ? 'correct' : result.reason === 'shown' ? 'shown' : 'wrong'}
            onNext={!p.practice.switchNameChord || named ? props.onNext : undefined}
          >
            <strong>
              {result.ok ? '✓ Correct' : result.reason === 'shown' ? 'Answer:' : '✕ Not quite'}
            </strong>{' '}
            <span>
              {result.reason === 'moved-wrong-note' && 'That note stays. '}
              The {roleLabel(moved.role, p)} on string {moved.string} ({formatNote(moved.tone.note)}
              ) moves {q.def.delta < 0 ? 'down' : 'up'}{' '}
              {Math.abs(q.def.delta) === 1 ? 'a fret' : `${Math.abs(q.def.delta)} frets`} to the{' '}
              {roleLabel(movedTo.role, p)} ({formatNote(movedTo.tone.note)})
              {!p.practice.switchNameChord && (
                <>
                  {' '}
                  → {dst} ({chordToneName(q.target, p)})
                </>
              )}
            </span>
          </FeedbackBar>
          {p.practice.switchNameChord && (
            <div class="name-step">
              <div class="field-label">What chord is it now?</div>
              <div class="segmented">
                {nameOptions.map((o) => (
                  <button
                    type="button"
                    key={o}
                    class={named ? (o === dst ? 'on' : o === named ? 'bad' : '') : ''}
                    disabled={!!named}
                    onClick={() => setNamed(o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
              {named && (
                <p class="muted">
                  {named === dst ? '✓' : '✕'} {src} → {dst}: same root, {qualityName(q.def.from)} →{' '}
                  {qualityName(q.def.to)}.
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <div class="actions">
          <button type="button" class="btn secondary" onClick={() => grade(false, 'shown')}>
            Show answer
          </button>
        </div>
      )}
    </div>
  );
}
