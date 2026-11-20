import type { Chord } from '../theory/chords';
import { formatNote } from '../theory/notes';
import type { Preferences } from '../prefs/model';
import type { VoicingNote } from '../fretboard/voicings';
import type { Marker, MarkerKind } from './Fretboard';
import { roleColor, roleLabel } from './roleStyle';

/** Marker for a chord-tone note, labelled per preferences (roles and/or note names). */
export function noteMarker(
  n: VoicingNote,
  kind: MarkerKind,
  p: Preferences,
  opts: { showRoles?: boolean; showNames?: boolean; colored?: boolean } = {},
): Marker {
  const showRoles = opts.showRoles ?? p.fretboard.showRoles;
  const showNames = opts.showNames ?? p.fretboard.showNoteNames;
  const name = formatNote(n.tone.note, p.spelling.glyphs);
  const colored = opts.colored ?? showRoles;
  return {
    string: n.string,
    fret: n.fret,
    kind,
    label: showRoles ? roleLabel(n.role, p) : showNames ? name : undefined,
    sublabel: showRoles && showNames ? name : undefined,
    color: colored ? roleColor(n.role, p) : undefined,
  };
}

export function chordToneName(chord: Chord, p: Preferences): string {
  return chord.tones.map((t) => formatNote(t.note, p.spelling.glyphs)).join('–');
}
