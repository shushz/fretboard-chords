import {
  type Key,
  formatKey,
  keyToAscii,
  parseKeyName,
  resolveKey,
  selectableKeys,
} from '../theory/keys';
import {
  SEVENTH_STRING_SETS,
  TRIAD_STRING_SETS,
  type FretWindow,
  type StringSetId,
  windowEnd,
} from '../fretboard/regions';
import type { Preferences } from '../prefs/model';
import { Select, Segmented, Stepper } from './controls';

export function keyFromAscii(s: string, p: Preferences): Key {
  const k = parseKeyName(s) ?? parseKeyName('C')!;
  return resolveKey(k, p.spelling).key;
}

export function KeyPicker(props: { value: Key; prefs: Preferences; onChange: (k: Key) => void }) {
  const keys = selectableKeys(props.prefs.spelling);
  return (
    <Select
      label="Key"
      value={keyToAscii(props.value)}
      options={keys.map((k) => ({ value: keyToAscii(k), label: formatKey(k, true, true) }))}
      onChange={(v) => props.onChange(keyFromAscii(v, props.prefs))}
    />
  );
}

export function StringSetPicker(props: {
  value: StringSetId;
  /** Sevenths: show drop-2 sets and shell sets as two labelled groups. */
  sevenths?: boolean;
  onChange: (s: StringSetId) => void;
}) {
  const opts = (sets: readonly StringSetId[]) =>
    sets.map((s) => ({ value: s, label: s.replace('-', '–') }));
  if (!props.sevenths) {
    return (
      <Segmented
        label="Strings"
        value={props.value}
        options={opts(TRIAD_STRING_SETS)}
        onChange={props.onChange}
      />
    );
  }
  // One choice across both groups: a group shows no selection when the value is in the other.
  return (
    <>
      <Segmented
        label="Drop-2 strings (4 notes)"
        value={props.value}
        options={opts(SEVENTH_STRING_SETS)}
        onChange={props.onChange}
      />
      <Segmented
        label="Shell strings (R–3–7)"
        value={props.value}
        options={opts(TRIAD_STRING_SETS)}
        onChange={props.onChange}
      />
    </>
  );
}

export function WindowPicker(props: {
  value: FretWindow;
  maxFret: number;
  onChange: (w: FretWindow) => void;
}) {
  const w = props.value;
  return (
    <Stepper
      label="Frets"
      value={w.start}
      min={0}
      max={props.maxFret - w.width + 1}
      format={(s) => `${s}–${windowEnd({ start: s, width: w.width })}`}
      onChange={(start) => props.onChange({ ...w, start })}
    />
  );
}
