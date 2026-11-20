import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { feedback, playNote } from '../../audio/engine';
import { chordNumeral, chordSymbol } from '../../theory/chords';
import { formatKey } from '../../theory/keys';
import { formatStringSet, formatWindow } from '../../fretboard/regions';
import { type StringNum, midiAt, pitchClassAt } from '../../fretboard/tuning';
import { fretted, voicingId } from '../../fretboard/voicings';
import { anchorStringList, numeralOptions, symbolOptions } from '../../prefs/model';
import { toneForPitchClass } from '../../theory/chords';
import { pairAnchors } from '../../fretboard/anchors';
import { Fretboard, type Marker } from '../../ui/Fretboard';
import { FeedbackBar } from '../../ui/Feedback';
import { chooseVisibleRange } from '../../ui/fretboardGeometry';
import { chordToneName, noteMarker } from '../../ui/markers';
import { useViewportWidth } from '../../ui/useViewport';
import { voicingOptions } from '../config';
import type { RunnerProps } from '../types';
import {
  type FindGrade,
  type FindQuestion,
  type Taps,
  applyTap,
  findItem,
  generateFindQuestion,
  gradeFind,
  isComplete,
} from './logic';

export function FindRunner(props: RunnerProps) {
  const { config, prefs: p } = props;
  const q = useMemo<FindQuestion | null>(
    () =>
      generateFindQuestion(config, {
        harmony: p.harmony,
        voicing: voicingOptions(p),
        rand: Math.random,
        itemWeight: props.itemWeight,
        previous: props.prev.current as FindQuestion | null,
      }),
    [],
  );
  const started = useRef(performance.now());
  const [taps, setTaps] = useState<Taps>(new Map());
  const [grade, setGrade] = useState<FindGrade | null>(null);
  const vw = useViewportWidth();

  useEffect(() => {
    if (!q) props.onImpossible();
    else props.prev.current = q;
  }, []);
  if (!q) return null;
  const maxFret = p.fretboard.fretRange;

  const submit = (t: Taps, gaveUp = false) => {
    const g = gaveUp
      ? { correct: false, matched: null, anchorOk: null, wrong: [] }
      : gradeFind(q, t, maxFret);
    setGrade(g);
    const timeMs = performance.now() - started.current;
    const chordMidis = (g.matched ?? q.valid[0]).notes.map((n) => n.midi);
    feedback(g.correct, chordMidis);
    props.onGraded([
      {
        item: findItem(q),
        correct: g.correct,
        timeMs,
        at: Date.now(),
        window: q.region.window,
        sevenths: config.sevenths,
      },
    ]);
  };

  const onTap = (s: StringNum, f: number) => {
    if (grade) return;
    const next = applyTap(q, taps, s, f);
    if (next === taps) return;
    if (next.get(s) === f) playNote(midiAt(s, f));
    setTaps(next);
    if (isComplete(q, next)) submit(next);
  };

  // Markers
  const markers: Marker[] = [];
  const add = (m: Marker) => {
    const i = markers.findIndex((x) => x.string === m.string && x.fret === m.fret);
    if (i >= 0) markers[i] = m;
    else markers.push(m);
  };
  if (grade) {
    if (!grade.correct) {
      for (const v of q.valid)
        for (const n of v.notes) add(noteMarker(n, 'reveal', p, { showRoles: true }));
    }
    const anchorWanted = p.fretboard.anchor === 'ghost' || q.anchorString;
    if (anchorWanted) {
      const shown = grade.matched ? [grade.matched] : q.valid;
      const strings = q.anchorString ? [q.anchorString] : anchorStringList(p);
      for (const a of pairAnchors(q.chord, shown, strings, maxFret, q.region.window)) {
        add(noteMarker(a.anchor.note, 'ghost', p, { showRoles: true }));
      }
    }
    for (const [s, f] of taps) {
      const tone = toneForPitchClass(q.chord, pitchClassAt(s, f));
      const ok =
        grade.matched?.notes.some((n) => n.string === s && n.fret === f) ||
        (s === q.anchorString && grade.anchorOk === true);
      const inAnswer = q.valid.some((v) => v.notes.some((n) => n.string === s && n.fret === f));
      if (tone) {
        add(
          noteMarker(
            { ...fretted(s, f), tone, role: tone.role },
            ok ? 'correct' : inAnswer ? 'reveal' : 'wrong',
            p,
            { showRoles: true, colored: ok || inAnswer },
          ),
        );
      } else {
        add({ string: s, fret: f, kind: 'wrong', label: '✕' });
      }
    }
  } else {
    for (const [s, f] of taps) add({ string: s, fret: f, kind: 'tap' });
  }

  const range = chooseVisibleRange(q.region.window, maxFret, Math.min(vw, 1200) - 24);
  const numeral = chordNumeral(q.chord, numeralOptions(p));
  const symbol = chordSymbol(q.chord, symbolOptions(p));

  return (
    <div class="runner">
      <div class="prompt">
        <div class="prompt-main">
          {formatKey(q.chord.key, p.spelling.glyphs)} · {numeral}
        </div>
        <div class="prompt-sub">
          {formatStringSet(q.region.stringSet)} · {formatWindow(q.region.window)}
        </div>
        {q.anchorString && (
          <div class="prompt-hint">
            Tap the root on string {q.anchorString}, then the chord on{' '}
            {q.region.stringSet.replace('-', '–')}
          </div>
        )}
      </div>
      <div class="board-wrap">
        <Fretboard
          fromFret={range.from}
          toFret={range.to}
          region={q.region}
          markers={markers}
          leftHanded={p.fretboard.leftHanded}
          showFretNumbers={p.fretboard.showFretNumbers}
          onTap={onTap}
          label={`Fretboard: find ${numeral}`}
        />
      </div>
      {grade ? (
        <FeedbackBar state={grade.correct ? 'correct' : 'wrong'} onNext={props.onNext}>
          <strong>{grade.correct ? '✓ Correct' : '✕ Not quite'}</strong>{' '}
          <span>
            {numeral} = {symbol} ({chordToneName(q.chord, p)})
            {grade.matched && ` · ${inversionName(grade.matched.inversion)}`}
            {!grade.correct &&
              ` · ${q.valid.length} valid shape${q.valid.length > 1 ? 's' : ''} shown`}
            {grade.anchorOk === false && ' · anchor root missed'}
          </span>
        </FeedbackBar>
      ) : (
        <div class="actions">
          <button
            type="button"
            class="btn secondary"
            disabled={taps.size === 0}
            onClick={() => setTaps(new Map())}
          >
            Clear
          </button>
          <button type="button" class="btn secondary" onClick={() => submit(taps, true)}>
            Show answer
          </button>
        </div>
      )}
      <span hidden data-testid="valid-voicings">
        {q.valid.map((v) => voicingId(v)).join(' ')}
      </span>
    </div>
  );
}

export function inversionName(i: string): string {
  return i === 'root' ? 'root position' : `${i} inversion`;
}
