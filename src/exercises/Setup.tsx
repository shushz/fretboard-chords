import {
  CORE_DEGREES,
  DEGREES,
  type DegreeIndex,
  chordNumeral,
  diatonicChord,
} from '../theory/chords';
import { numeralOptions, type Preferences } from '../prefs/model';
import {
  SEVENTH_STRING_SETS,
  type StringSetId,
  TRIAD_STRING_SETS,
  randomWindow,
} from '../fretboard/regions';
import { KeyPicker, WindowPicker } from '../ui/pickers';
import { Segmented } from '../ui/controls';
import { type PracticeConfig, degreesForMode, stringSetsFor } from './config';
import { MODES } from './modes';
import { stats } from '../progress/store';
import { triadMasteryForKey } from '../progress/stats';
import { type Key, type Mode, formatKey, key, keyToAscii } from '../theory/keys';
import { note } from '../theory/notes';

/** Suggest sevenths when this share of the key's core triads is mastered. */
const SEVENTHS_SUGGESTION = 0.8;

export function Setup(props: {
  config: PracticeConfig;
  prefs: Preferences;
  onChange: (c: PracticeConfig) => void;
  onStart: () => void;
}) {
  const { config: c, prefs: p } = props;
  const set = (patch: Partial<PracticeConfig>) => props.onChange({ ...c, ...patch });
  const toggleSet = (s: StringSetId) => {
    const on = c.stringSets.includes(s);
    if (on && c.stringSets.length === 1) return;
    set({ stringSets: on ? c.stringSets.filter((x) => x !== s) : [...c.stringSets, s] });
  };
  const sl = p.practice.sessionLength;
  const triadMastery =
    c.sevenths || c.randomKey
      ? 0
      : triadMasteryForKey(stats.value, keyToAscii(c.key), CORE_DEGREES[c.key.mode], {
          accuracy: p.practice.masteryAccuracy,
          triadMs: p.practice.masteryTimeTriadMs,
          seventhMs: p.practice.masteryTimeSeventhMs,
        });

  return (
    <div class="setup">
      <section class="card">
        <h2>Mode</h2>
        <div class="mode-list" role="radiogroup" aria-label="Mode">
          {MODES.map((m) => (
            <button
              type="button"
              key={m.id}
              role="radio"
              aria-checked={c.mode === m.id}
              class={`mode-item${c.mode === m.id ? ' on' : ''}`}
              onClick={() => set({ mode: m.id })}
            >
              {m.name}
            </button>
          ))}
        </div>
        <p class="mode-desc">{MODES.find((m) => m.id === c.mode)?.description}</p>
        <details class="mode-help">
          <summary>How it works</summary>
          <p>{MODES.find((m) => m.id === c.mode)?.help}</p>
        </details>
        {(() => {
          const Extras = MODES.find((m) => m.id === c.mode)?.SetupExtras;
          return Extras ? <Extras config={c} onChange={props.onChange} /> : null;
        })()}
      </section>
      {triadMastery >= SEVENTHS_SUGGESTION && (
        <div class="suggest" role="note">
          <span>You've mastered the core triads in {formatKey(c.key)} — ready for sevenths?</span>
          <button
            type="button"
            class="btn"
            onClick={() => set({ sevenths: true, stringSets: stringSetsFor(p, true) })}
          >
            Try sevenths
          </button>
        </div>
      )}
      <section class="card">
        <h2>Key & chords</h2>
        <Segmented
          label="Key choice"
          value={c.randomKey ? 'random' : 'fixed'}
          options={[
            { value: 'fixed', label: 'One key' },
            { value: 'random', label: 'Random key' },
          ]}
          onChange={(v) =>
            v === 'fixed'
              ? set({ randomKey: undefined, degrees: degreesForMode(c, c.key.mode) })
              : set({
                  randomKey: c.randomKey ?? c.key.mode,
                  degreesByMode: {
                    major: c.key.mode === 'major' ? c.degrees : degreesForMode(c, 'major'),
                    minor: c.key.mode === 'minor' ? c.degrees : degreesForMode(c, 'minor'),
                  },
                })
          }
        />
        {c.randomKey ? (
          <>
            <Segmented
              label="Random keys from"
              value={c.randomKey}
              options={[
                { value: 'major', label: 'Major' },
                { value: 'minor', label: 'Minor' },
                { value: 'both', label: 'Both' },
              ]}
              onChange={(randomKey) => set({ randomKey })}
            />
            <p class="hint">
              A new key every question
              {c.mode === 'progression' ? ' (every progression)' : ''}, never the same twice in a
              row.
            </p>
            {(['major', 'minor'] as const)
              .filter((m) => c.randomKey === 'both' || c.randomKey === m)
              .map((m) => (
                <ChordRow
                  key={m}
                  label={
                    c.randomKey === 'both'
                      ? `${m === 'major' ? 'Major' : 'Minor'}-key chords`
                      : 'Chords'
                  }
                  refKey={REF_KEYS[m]}
                  degrees={degreesForMode(c, m)}
                  sevenths={c.sevenths}
                  prefs={p}
                  onChange={(d) => set({ degreesByMode: { ...c.degreesByMode, [m]: d } })}
                />
              ))}
          </>
        ) : (
          <>
            <KeyPicker
              value={c.key}
              prefs={p}
              onChange={(key) =>
                set({
                  key,
                  degrees: key.mode === c.key.mode ? c.degrees : [...CORE_DEGREES[key.mode]],
                })
              }
            />
            <ChordRow
              label="Chords"
              refKey={c.key}
              degrees={c.degrees}
              sevenths={c.sevenths}
              prefs={p}
              onChange={(degrees) => set({ degrees })}
            />
          </>
        )}
        <Segmented
          label="Chord type"
          value={c.sevenths ? 'sevenths' : 'triads'}
          options={[
            { value: 'triads', label: 'Triads' },
            { value: 'sevenths', label: 'Sevenths' },
          ]}
          onChange={(v) => {
            const sevenths = v === 'sevenths';
            set({ sevenths, stringSets: stringSetsFor(p, sevenths) });
          }}
        />
      </section>
      <section class="card">
        <h2>Region</h2>
        {(c.sevenths
          ? [
              { label: 'Strings', sub: 'Drop-2 (4 notes)', sets: SEVENTH_STRING_SETS },
              ...(p.sevenths.shells
                ? [{ label: 'Shell strings', sub: 'Shells (R–3–7)', sets: TRIAD_STRING_SETS }]
                : []),
            ]
          : [{ label: 'Strings', sub: null, sets: TRIAD_STRING_SETS }]
        ).map((g) => (
          <div class="field" key={g.label}>
            <span class="field-label">{g.sub ?? g.label}</span>
            <div class="segmented multi" role="group" aria-label={g.label}>
              {g.sets.map((s) => {
                const on = c.stringSets.includes(s);
                return (
                  <button
                    type="button"
                    key={s}
                    aria-pressed={on}
                    class={on ? 'on' : ''}
                    onClick={() => toggleSet(s)}
                  >
                    {s.replace('-', '–')}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div class="window-row">
          <WindowPicker
            value={c.window}
            maxFret={p.fretboard.fretRange}
            onChange={(window) => set({ window })}
          />
          <button
            type="button"
            class="btn secondary"
            onClick={() =>
              set({ window: randomWindow(c.window.width, p.fretboard.fretRange, Math.random) })
            }
          >
            Random
          </button>
        </div>
        <Segmented
          label="Root anchor"
          value={c.anchor}
          options={[
            { value: 'off', label: 'Off' },
            { value: 'ghost', label: 'Ghost' },
            { value: 'required', label: 'Required' },
          ]}
          onChange={(anchor) => set({ anchor })}
        />
      </section>
      <button type="button" class="btn wide start" onClick={props.onStart}>
        Start · {sl.kind === 'questions' ? `${sl.count} questions` : `${sl.minutes} min`}
      </button>
    </div>
  );
}

/** Numerals don't depend on the tonic, so random-key rows use C / A minor for labels. */
const REF_KEYS: Record<Mode, Key> = {
  major: key(note('C'), 'major'),
  minor: key(note('A'), 'minor'),
};

function ChordRow(props: {
  label: string;
  refKey: Key;
  degrees: DegreeIndex[];
  sevenths: boolean;
  prefs: Preferences;
  onChange: (d: DegreeIndex[]) => void;
}) {
  const { degrees, prefs: p } = props;
  const toggle = (d: DegreeIndex) => {
    const on = degrees.includes(d);
    if (on && degrees.length === 1) return;
    props.onChange(on ? degrees.filter((x) => x !== d) : [...degrees, d].sort());
  };
  return (
    <div class="field">
      <span class="field-label">{props.label}</span>
      <div class="segmented multi" role="group" aria-label={props.label}>
        {DEGREES.map((d) => {
          const on = degrees.includes(d);
          return (
            <button
              type="button"
              key={d}
              aria-pressed={on}
              class={on ? 'on' : ''}
              onClick={() => toggle(d)}
            >
              {chordNumeral(
                diatonicChord(props.refKey, d, props.sevenths, p.harmony),
                numeralOptions(p),
              )}
            </button>
          );
        })}
      </div>
      <div class="row-links">
        <button
          type="button"
          class="link"
          onClick={() => props.onChange([...CORE_DEGREES[props.refKey.mode]])}
        >
          Core set
        </button>
        <button type="button" class="link" onClick={() => props.onChange([...DEGREES])}>
          All seven
        </button>
      </div>
    </div>
  );
}
