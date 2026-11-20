import { prefs, editPreferences, resetPreferences } from '../../prefs/store';
import { ENHARMONIC_PAIRS, type EnharmonicPairId } from '../../theory/keys';
import { FRET_RANGES } from '../../fretboard/tuning';
import { SEVENTH_STRING_SETS, TRIAD_STRING_SETS } from '../../fretboard/regions';
import { formatNote } from '../../theory/notes';
import type { ChordMember } from '../../theory/roles';
import { MultiToggle, Section, Segmented, Select, Stepper, Toggle } from '../controls';

const MEMBER_LABEL: Record<ChordMember, string> = {
  root: 'Root',
  third: '3rd',
  fifth: '5th',
  seventh: '7th',
};

export function PreferencesScreen() {
  const p = prefs.value;
  const pairLabel = (id: EnharmonicPairId) => {
    const d = ENHARMONIC_PAIRS.find((x) => x.id === id)!;
    const m = d.mode === 'minor' ? 'm' : '';
    return { flat: formatNote(d.flat) + m, sharp: formatNote(d.sharp) + m };
  };
  const sl = p.practice.sessionLength;

  return (
    <div class="prefs">
      <Section title="Spelling">
        {ENHARMONIC_PAIRS.map((pair) => {
          const l = pairLabel(pair.id);
          return (
            <Segmented
              key={pair.id}
              label={`${l.flat} / ${l.sharp}`}
              value={p.spelling.pairs[pair.id] === 'sharp' ? 'sharp' : 'flat'}
              options={[
                { value: 'flat', label: l.flat },
                { value: 'sharp', label: l.sharp },
              ]}
              onChange={(v) => editPreferences((d) => void (d.spelling.pairs[pair.id] = v))}
            />
          );
        })}
        <Toggle
          label="Allow theoretical keys"
          hint="e.g. G♭m, D♯ major, spelled with double accidentals"
          checked={p.spelling.allowTheoretical}
          onChange={(v) => editPreferences((d) => void (d.spelling.allowTheoretical = v))}
        />
      </Section>

      <Section title="Harmony">
        <Segmented
          label="Minor-key V"
          value={p.harmony.minorV}
          options={[
            { value: 'harmonic', label: 'V / V7 (harmonic)' },
            { value: 'natural', label: 'v / v7 (natural)' },
          ]}
          onChange={(v) => editPreferences((d) => void (d.harmony.minorV = v))}
        />
      </Section>

      <Section title="Fretboard">
        <MultiToggle
          label="Triad string sets"
          values={p.fretboard.stringSets}
          options={TRIAD_STRING_SETS.map((s) => ({ value: s, label: s.replace('-', '–') }))}
          onChange={(v) => editPreferences((d) => void (d.fretboard.stringSets = v))}
        />
        <Select
          label="Frets on the neck"
          value={p.fretboard.fretRange}
          options={FRET_RANGES.map((f) => ({ value: f, label: String(f) }))}
          onChange={(v) => editPreferences((d) => void (d.fretboard.fretRange = v))}
        />
        <Stepper
          label="Default window start"
          value={p.fretboard.window.start}
          min={0}
          max={p.fretboard.fretRange - p.fretboard.window.width + 1}
          onChange={(v) => editPreferences((d) => void (d.fretboard.window.start = v))}
        />
        <Stepper
          label="Window width (frets)"
          value={p.fretboard.window.width}
          min={3}
          max={8}
          onChange={(v) => editPreferences((d) => void (d.fretboard.window.width = v))}
        />
        <Toggle
          label="Random window each session"
          checked={p.fretboard.randomWindow}
          onChange={(v) => editPreferences((d) => void (d.fretboard.randomWindow = v))}
        />
        <Toggle
          label="Allow one note outside the window"
          checked={p.fretboard.allowOutside}
          onChange={(v) => editPreferences((d) => void (d.fretboard.allowOutside = v))}
        />
        <Stepper
          label="Max span (frets)"
          value={p.fretboard.maxSpan}
          min={3}
          max={6}
          onChange={(v) => editPreferences((d) => void (d.fretboard.maxSpan = v))}
        />
        <Segmented
          label="Root anchor"
          value={p.fretboard.anchor}
          options={[
            { value: 'off', label: 'Off' },
            { value: 'ghost', label: 'Ghost' },
            { value: 'required', label: 'Required' },
          ]}
          onChange={(v) => editPreferences((d) => void (d.fretboard.anchor = v))}
        />
        <Segmented
          label="Anchor string"
          value={p.fretboard.anchorStrings}
          options={[
            { value: '6', label: '6' },
            { value: '5', label: '5' },
            { value: 'both', label: 'Both' },
          ]}
          onChange={(v) => editPreferences((d) => void (d.fretboard.anchorStrings = v))}
        />
        <Toggle
          label="Left-handed"
          checked={p.fretboard.leftHanded}
          onChange={(v) => editPreferences((d) => void (d.fretboard.leftHanded = v))}
        />
      </Section>

      <Section title="Labels & hints">
        <Toggle
          label="Role labels in the chord explorer"
          checked={p.fretboard.showRoles}
          onChange={(v) => editPreferences((d) => void (d.fretboard.showRoles = v))}
        />
        <Toggle
          label="Note names under role labels"
          checked={p.fretboard.showNoteNames}
          onChange={(v) => editPreferences((d) => void (d.fretboard.showNoteNames = v))}
        />
        <Toggle
          label="Fret numbers"
          checked={p.fretboard.showFretNumbers}
          onChange={(v) => editPreferences((d) => void (d.fretboard.showFretNumbers = v))}
        />
        <Toggle
          label="Show roles on the given shape"
          hint="Hint in From the tonic and Next / previous shape: role labels and colours on the shape you're shown, before you answer"
          checked={p.practice.givenShapeRoles}
          onChange={(v) => editPreferences((d) => void (d.practice.givenShapeRoles = v))}
        />
      </Section>

      <Section title="Sevenths">
        <Toggle
          label="Practice seventh chords"
          checked={p.sevenths.enabled}
          onChange={(v) => editPreferences((d) => void (d.sevenths.enabled = v))}
        />
        <MultiToggle
          label="Drop-2 string sets"
          values={p.sevenths.drop2Sets}
          options={SEVENTH_STRING_SETS.map((s) => ({ value: s, label: s.replace('-', '–') }))}
          min={0}
          onChange={(v) => editPreferences((d) => void (d.sevenths.drop2Sets = v))}
        />
        <Toggle
          label="3-note shells (R–3–7)"
          checked={p.sevenths.shells}
          onChange={(v) => editPreferences((d) => void (d.sevenths.shells = v))}
        />
      </Section>

      <Section title="Practice">
        <Segmented
          label="Session length"
          value={sl.kind}
          options={[
            { value: 'questions', label: 'Questions' },
            { value: 'minutes', label: 'Minutes' },
          ]}
          onChange={(v) =>
            editPreferences(
              (d) =>
                void (d.practice.sessionLength =
                  v === 'questions'
                    ? { kind: 'questions', count: 20 }
                    : { kind: 'minutes', minutes: 5 }),
            )
          }
        />
        {sl.kind === 'questions' ? (
          <Stepper
            label="Questions per session"
            value={sl.count}
            min={5}
            max={100}
            step={5}
            onChange={(v) =>
              editPreferences(
                (d) => void (d.practice.sessionLength = { kind: 'questions', count: v }),
              )
            }
          />
        ) : (
          <Stepper
            label="Minutes per session"
            value={sl.minutes}
            min={1}
            max={60}
            onChange={(v) =>
              editPreferences(
                (d) => void (d.practice.sessionLength = { kind: 'minutes', minutes: v }),
              )
            }
          />
        )}
        <Stepper
          label="Mastery accuracy"
          value={p.practice.masteryAccuracy}
          min={0.5}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)} %`}
          onChange={(v) => editPreferences((d) => void (d.practice.masteryAccuracy = v))}
        />
        <Stepper
          label="Mastery time, triads"
          value={p.practice.masteryTimeTriadMs}
          min={1000}
          max={10000}
          step={500}
          format={(v) => `${(v / 1000).toFixed(1)} s`}
          onChange={(v) => editPreferences((d) => void (d.practice.masteryTimeTriadMs = v))}
        />
        <Stepper
          label="Mastery time, sevenths"
          value={p.practice.masteryTimeSeventhMs}
          min={1000}
          max={15000}
          step={500}
          format={(v) => `${(v / 1000).toFixed(1)} s`}
          onChange={(v) => editPreferences((d) => void (d.practice.masteryTimeSeventhMs = v))}
        />
        <Stepper
          label="Fresh items"
          value={p.practice.freshShare}
          min={0}
          max={0.5}
          step={0.05}
          format={(v) => `${Math.round(v * 100)} %`}
          onChange={(v) => editPreferences((d) => void (d.practice.freshShare = v))}
        />
        <Stepper
          label="Progression tempo (BPM)"
          value={p.practice.tempoBpm}
          min={30}
          max={160}
          step={5}
          onChange={(v) => editPreferences((d) => void (d.practice.tempoBpm = v))}
        />
        <Stepper
          label="Beats per chord"
          value={p.practice.tempoBeats}
          min={1}
          max={8}
          onChange={(v) => editPreferences((d) => void (d.practice.tempoBeats = v))}
        />
      </Section>

      <Section title="Quality switch">
        <Toggle
          label="Minor ↔ diminished (move the 5th)"
          checked={p.practice.switchMinDim}
          onChange={(v) => editPreferences((d) => void (d.practice.switchMinDim = v))}
        />
        <Toggle
          label="Major → augmented (move the 5th)"
          checked={p.practice.switchMajAug}
          onChange={(v) => editPreferences((d) => void (d.practice.switchMajAug = v))}
        />
        <Toggle
          label="V → V7 (root down to ♭7)"
          checked={p.practice.switchDom7}
          onChange={(v) => editPreferences((d) => void (d.practice.switchDom7 = v))}
        />
        <Toggle
          label="Name the new chord afterwards"
          checked={p.practice.switchNameChord}
          onChange={(v) => editPreferences((d) => void (d.practice.switchNameChord = v))}
        />
      </Section>

      <Section title="Sound & look">
        <Toggle
          label="Mute"
          checked={p.sound.muted}
          onChange={(v) => editPreferences((d) => void (d.sound.muted = v))}
        />
        <Stepper
          label="Volume"
          value={p.sound.volume}
          min={0}
          max={1}
          step={0.1}
          format={(v) => `${Math.round(v * 100)} %`}
          onChange={(v) => editPreferences((d) => void (d.sound.volume = v))}
        />
        <Stepper
          label="Strum speed (ms between strings)"
          value={p.sound.strumMs}
          min={0}
          max={120}
          step={10}
          onChange={(v) => editPreferences((d) => void (d.sound.strumMs = v))}
        />
        <Segmented
          label="Theme"
          value={p.look.theme}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={(v) => editPreferences((d) => void (d.look.theme = v))}
        />
        <div class="field">
          <span class="field-label">Role colours</span>
          <div class="colors">
            {(Object.keys(MEMBER_LABEL) as ChordMember[]).map((m) => (
              <label key={m} class="color-swatch">
                <input
                  type="color"
                  value={p.look.roleColors[m]}
                  onInput={(e) => {
                    const v = (e.currentTarget as HTMLInputElement).value;
                    editPreferences((d) => void (d.look.roleColors[m] = v));
                  }}
                />
                <span>{MEMBER_LABEL[m]}</span>
              </label>
            ))}
          </div>
        </div>
      </Section>

      <button type="button" class="btn secondary wide" onClick={() => resetPreferences()}>
        Reset all preferences
      </button>
    </div>
  );
}
