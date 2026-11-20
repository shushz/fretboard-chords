import {
  type Key,
  formatKey,
  keyToAscii,
  parseKeyName,
  resolveKey,
  selectableKeys,
} from '../theory/keys';
import {
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
  const g = props.prefs.spelling.glyphs;
  return (
    <Select
      label="Key"
      value={keyToAscii(props.value)}
      options={keys.map((k) => ({ value: keyToAscii(k), label: formatKey(k, g, true) }))}
      onChange={(v) => props.onChange(keyFromAscii(v, props.prefs))}
    />
  );
}

export function StringSetPicker(props: {
  value: StringSetId;
  sets?: readonly StringSetId[];
  onChange: (s: StringSetId) => void;
}) {
  const sets = props.sets ?? TRIAD_STRING_SETS;
  return (
    <Segmented
      label="Strings"
      value={props.value}
      options={sets.map((s) => ({ value: s, label: s.replace('-', '–') }))}
      onChange={props.onChange}
    />
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
