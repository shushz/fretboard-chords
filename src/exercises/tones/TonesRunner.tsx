import { BoardFrame } from '../../ui/BoardFrame';
import { formatNote } from '../../theory/notes';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { feedback, playNote, revealSound, strum } from '../../audio/engine';
import { chordNumeral, chordSymbol, toneForPitchClass } from '../../theory/chords';
import { formatKey } from '../../theory/keys';
import type { Role } from '../../theory/roles';
import { formatStringSet } from '../../fretboard/regions';
import { type StringNum, midiAt, pitchClassAt } from '../../fretboard/tuning';
import { fretted } from '../../fretboard/voicings';
import { numeralOptions, symbolOptions } from '../../prefs/model';
import { Fretboard, type Marker } from '../../ui/Fretboard';
import { FeedbackBar } from '../../ui/Feedback';
import { chooseVisibleRange } from '../../ui/fretboardGeometry';
import { chordToneName, noteMarker } from '../../ui/markers';
import { roleColor, roleLabel } from '../../ui/roleStyle';
import { readableTextOn } from '../../ui/contrast';
import { useBoardWidth } from '../../ui/useViewport';
import { Segmented } from '../../ui/controls';
import { type PracticeConfig, voicingOptions } from '../config';
import type { RunnerProps } from '../types';
import {
  type LabelQuestion,
  type TapRoleQuestion,
  type TonesQuestion,
  generateTonesQuestion,
  gradeLabels,
  gradeTapRole,
  roleChoices,
  roleFrets,
  tonesItem,
} from './logic';

export function TonesRunner(props: RunnerProps) {
  const { config, prefs: p } = props;
  const q = useMemo<TonesQuestion | null>(
    () =>
      generateTonesQuestion(config, {
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
  return q.kind === 'label' ? <LabelView q={q} {...props} /> : <TapRoleView q={q} {...props} />;
}

function useTimer() {
  const t = useRef(performance.now());
  return () => performance.now() - t.current;
}

function LabelView(props: RunnerProps & { q: LabelQuestion }) {
  const { q, prefs: p, config } = props;
  const [labels, setLabels] = useState<Role[]>([]);
  const [done, setDone] = useState<ReturnType<typeof gradeLabels> | null>(null);
  const elapsed = useTimer();
  const vw = useBoardWidth();
  const notes = q.voicing.notes; // low → high
  const midis = notes.map((n) => n.midi);

  useEffect(() => strum(midis), []);

  const choose = (r: Role) => {
    if (done) return;
    const next = [...labels, r];
    setLabels(next);
    if (next.length === notes.length) {
      const g = gradeLabels(q, next);
      setDone(g);
      feedback(g.correct, midis);
      props.onGraded([
        {
          item: tonesItem(q),
          correct: g.correct,
          timeMs: elapsed(),
          at: Date.now(),
          window: q.region.window,
          sevenths: config.sevenths,
        },
      ]);
    }
  };

  const markers: Marker[] = notes.map((n, i) => {
    if (done) {
      // Mislabeled notes keep their role color (that's the lesson) with a red ring.
      return noteMarker(n, done.perNote[i] ? 'correct' : 'missed', p, {
        showRoles: true,
        colored: true,
      });
    }
    const l = labels[i];
    return {
      string: n.string,
      fret: n.fret,
      kind: i === labels.length ? 'tap' : 'shown',
      label: l ? roleLabel(l, p) : i === labels.length ? '?' : undefined,
    };
  });
  const range = chooseVisibleRange(q.region.window, p.fretboard.fretRange, vw);
  const current = notes[labels.length];
  const numeral = chordNumeral(q.chord, numeralOptions(p));

  return (
    <div class="runner">
      <div class="prompt">
        <div class="prompt-main">
          Name the tones · {formatKey(q.chord.key)} {numeral}
        </div>
        <div class="prompt-sub">
          {chordSymbol(q.chord, symbolOptions(p))} · {formatStringSet(q.region.stringSet)}
        </div>
        {!done && current && (
          <div class="prompt-hint">What is the note on string {current.string}?</div>
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
          onTap={(s, f) => {
            if (notes.some((n) => n.string === s && n.fret === f)) playNote(midiAt(s, f));
          }}
          label="Fretboard: name the tones"
        />
      </BoardFrame>
      {done ? (
        <FeedbackBar state={done.correct ? 'correct' : 'wrong'} onNext={props.onNext}>
          <strong>{done.correct ? '✓ Correct' : '✕ Not quite'}</strong>{' '}
          <span>
            {chordSymbol(q.chord, symbolOptions(p))}:{' '}
            {notes
              .map(
                (n, i) =>
                  `string ${n.string} = ${roleLabel(n.role, p)} (${formatNote(n.tone.note)})` +
                  (done.perNote[i] ? '' : `, not ${roleLabel(labels[i], p)}`),
              )
              .join(' · ')}
          </span>
        </FeedbackBar>
      ) : (
        <RoleButtons
          roles={roleChoices(q.chord)}
          p={p}
          onPick={choose}
          onUndo={labels.length ? () => setLabels(labels.slice(0, -1)) : undefined}
        />
      )}
    </div>
  );
}

function RoleButtons(props: {
  roles: Role[];
  p: RunnerProps['prefs'];
  onPick: (r: Role) => void;
  onUndo?: () => void;
}) {
  return (
    <div class="role-buttons" role="group" aria-label="Roles">
      {props.roles.map((r) => (
        <button
          type="button"
          key={r}
          class="role-btn"
          style={{
            background: roleColor(r, props.p),
            color: readableTextOn(roleColor(r, props.p)),
          }}
          aria-label={`Role ${r}`}
          onClick={() => props.onPick(r)}
        >
          {roleLabel(r, props.p)}
        </button>
      ))}
      <button type="button" class="role-btn undo" disabled={!props.onUndo} onClick={props.onUndo}>
        Undo
      </button>
    </div>
  );
}

function TapRoleView(props: RunnerProps & { q: TapRoleQuestion }) {
  const { q, prefs: p, config } = props;
  const [tap, setTap] = useState<{ s: StringNum; f: number } | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [shown, setShown] = useState(false);
  const elapsed = useTimer();
  const vw = useBoardWidth();
  const maxFret = p.fretboard.fretRange;
  const range = chooseVisibleRange(q.window, maxFret, vw);
  const numeral = chordNumeral(q.chord, numeralOptions(p));
  const chordMidis = () => {
    const f = roleFrets(
      q.chord,
      'R',
      q.string,
      { start: range.from, width: range.to - range.from + 1 },
      maxFret,
    );
    return f.length ? [midiAt(q.string, f[0])] : [];
  };

  const submit = (s: StringNum, f: number, giveUp = false) => {
    const correct = !giveUp && gradeTapRole(q, s, f);
    setOk(correct);
    setShown(giveUp);
    if (giveUp) revealSound(chordMidis());
    else feedback(correct, correct ? [midiAt(s, f)] : chordMidis());
    props.onGraded([
      {
        item: tonesItem(q),
        correct,
        timeMs: elapsed(),
        at: Date.now(),
        window: q.window,
        sevenths: config.sevenths,
      },
    ]);
  };

  const markers: Marker[] = [];
  if (ok !== null) {
    for (const f of roleFrets(
      q.chord,
      q.role,
      q.string,
      { start: range.from, width: range.to - range.from + 1 },
      maxFret,
    )) {
      const tone = q.chord.tones.find((t) => t.role === q.role)!;
      markers.push(
        noteMarker(
          { ...fretted(q.string, f), tone, role: q.role },
          ok && tap?.f === f ? 'correct' : 'reveal',
          p,
          { showRoles: true, colored: true },
        ),
      );
    }
    if (tap && !ok) {
      const tone = toneForPitchClass(q.chord, pitchClassAt(tap.s, tap.f));
      markers.push(
        tone
          ? noteMarker({ ...fretted(tap.s, tap.f), tone, role: tone.role }, 'wrong', p, {
              showRoles: true,
            })
          : { string: tap.s, fret: tap.f, kind: 'wrong', label: '✕' },
      );
    }
  }

  return (
    <div class="runner">
      <div class="prompt">
        <div class="prompt-main">
          Tap the {roleLabel(q.role, p)} of {numeral}
        </div>
        <div class="prompt-sub">
          {formatKey(q.chord.key)} · on string {q.string}
        </div>
      </div>
      <BoardFrame>
        <Fretboard
          fromFret={range.from}
          toFret={range.to}
          region={{ stringSet: '1-3', window: q.window }}
          regionStrings={[q.string]}
          markers={markers}
          leftHanded={p.fretboard.leftHanded}
          showFretNumbers={p.fretboard.showFretNumbers}
          onTap={(s, f) => {
            if (ok !== null || s !== q.string) return;
            playNote(midiAt(s, f));
            setTap({ s, f });
            submit(s, f);
          }}
          label={`Fretboard: tap the ${q.role} of ${numeral} on string ${q.string}`}
        />
      </BoardFrame>
      {ok !== null ? (
        <FeedbackBar state={ok ? 'correct' : shown ? 'shown' : 'wrong'} onNext={props.onNext}>
          <strong>{ok ? '✓ Correct' : shown ? 'Answer:' : '✕ Not quite'}</strong>{' '}
          <span>
            {numeral} = {chordSymbol(q.chord, symbolOptions(p))} ({chordToneName(q.chord, p)}); the{' '}
            {roleLabel(q.role, p)} is{' '}
            {chordToneName(
              { ...q.chord, tones: q.chord.tones.filter((t) => t.role === q.role) },
              p,
            )}
          </span>
        </FeedbackBar>
      ) : (
        <div class="actions">
          <button type="button" class="btn secondary" onClick={() => submit(q.string, -1, true)}>
            Show answer
          </button>
        </div>
      )}
    </div>
  );
}

export function TonesSetup(props: {
  config: PracticeConfig;
  onChange: (c: PracticeConfig) => void;
}) {
  const v =
    props.config.variant === 'label' || props.config.variant === 'tap'
      ? props.config.variant
      : 'both';
  return (
    <Segmented
      label="Variant"
      value={v}
      options={[
        { value: 'label', label: 'Label the notes' },
        { value: 'tap', label: 'Tap the role' },
        { value: 'both', label: 'Both' },
      ]}
      onChange={(variant) => props.onChange({ ...props.config, variant })}
    />
  );
}
