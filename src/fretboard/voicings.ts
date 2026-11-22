import { type Chord, type ChordTone, isSeventh, toneForPitchClass } from '../theory/chords';
import { pitchClass } from '../theory/notes';
import { type Role, memberOf } from '../theory/roles';
import {
  type FretWindow,
  type Region,
  type StringSetId,
  inWindow,
  stringsOf,
  windowEnd,
} from './regions';
import { type StringNum, fretsForPitchClass, midiAt, pitchClassAt } from './tuning';

export interface FrettedNote {
  readonly string: StringNum;
  readonly fret: number;
  readonly midi: number;
  readonly pc: number;
}

export interface VoicingNote extends FrettedNote {
  readonly tone: ChordTone;
  readonly role: Role;
}

export type Inversion = 'root' | 'first' | 'second' | 'third';

export interface Voicing {
  readonly stringSet: StringSetId;
  /** One note per string, ordered low string → high string (bass first). */
  readonly notes: readonly VoicingNote[];
  readonly inversion: Inversion;
  /** Lowest fret used (the "position"). */
  readonly position: number;
  readonly highestFret: number;
  /** Inclusive fret span: highest − lowest + 1. */
  readonly span: number;
  /** True if this is a 3-note shell (R–3–7, no 5th). */
  readonly shell: boolean;
}

export interface VoicingOptions {
  maxFret: number;
  /** Max inclusive span in frets (SPEC default 4). */
  maxSpan: number;
  /** Seventh chords on 3-string sets: build R–3–7 shells (omit the 5th). */
  shells?: boolean;
  /**
   * Four-note chords on 4-string sets: only drop-2 voicings (default true), with one
   * extra fret of span allowed (drop-2 shapes such as root-position maj7 need 5 frets).
   */
  drop2?: boolean;
}

/**
 * Drop-2: take a close-position voicing and drop its second-highest note an octave.
 * Equivalently, raising the lowest note an octave gives a close voicing (span < 12)
 * in which that note is second from the top.
 */
export function isDrop2(midis: readonly number[]): boolean {
  if (midis.length !== 4) return false;
  const p = [...midis].sort((a, b) => a - b);
  if (p[3] - p[0] < 12) return false; // already close
  const raised = p[0] + 12;
  return raised > p[2] && raised < p[3] && p[3] - p[1] < 12;
}

export const DEFAULT_VOICING_OPTIONS: VoicingOptions = { maxFret: 15, maxSpan: 4 };

export function fretted(string: StringNum, fret: number): FrettedNote {
  return { string, fret, midi: midiAt(string, fret), pc: pitchClassAt(string, fret) };
}

export function voicingId(v: { notes: readonly FrettedNote[] }): string {
  return v.notes.map((n) => `${n.string}:${n.fret}`).join(',');
}

function inversionOf(bass: Role): Inversion {
  switch (memberOf(bass)) {
    case 'root':
      return 'root';
    case 'third':
      return 'first';
    case 'fifth':
      return 'second';
    default:
      return 'third';
  }
}

/** Chord tones a voicing on `stringCount` strings must contain. */
export function requiredTones(chord: Chord, stringCount: number, shells = false): ChordTone[] {
  if (stringCount >= chord.tones.length) return [...chord.tones];
  if (isSeventh(chord.quality) && stringCount === 3 && shells) {
    return chord.tones.filter((t) => memberOf(t.role) !== 'fifth');
  }
  return [];
}

/**
 * Every voicing of `chord` on `stringSet` along the whole neck: exactly one note per
 * string, every required chord tone present, span ≤ maxSpan.
 */
export function enumerateVoicings(
  chord: Chord,
  stringSet: StringSetId,
  opts: VoicingOptions = DEFAULT_VOICING_OPTIONS,
): Voicing[] {
  const strings = stringsOf(stringSet).slice().reverse(); // low → high
  const required = requiredTones(chord, strings.length, opts.shells);
  if (required.length === 0 || required.length !== strings.length) return [];
  const perString = strings.map((s) =>
    required.flatMap((t) =>
      fretsForPitchClass(s, pitchClass(t.note), opts.maxFret).map((f) => ({ s, f, t })),
    ),
  );
  const out: Voicing[] = [];
  const pick: { s: StringNum; f: number; t: ChordTone }[] = [];
  const rec = (i: number) => {
    if (i === strings.length) {
      const roles = new Set(pick.map((p) => p.t.role));
      if (roles.size !== required.length) return;
      const frets = pick.map((p) => p.f);
      const lo = Math.min(...frets);
      const hi = Math.max(...frets);
      const fourNote = required.length === 4;
      const drop2 = fourNote && opts.drop2 !== false;
      if (hi - lo + 1 > opts.maxSpan + (drop2 ? 1 : 0)) return;
      if (drop2 && !isDrop2(pick.map((p) => midiAt(p.s, p.f)))) return;
      const notes = pick.map((p) => ({ ...fretted(p.s, p.f), tone: p.t, role: p.t.role }));
      out.push({
        stringSet,
        notes,
        inversion: inversionOf(notes[0].role),
        position: lo,
        highestFret: hi,
        span: hi - lo + 1,
        shell: required.length < chord.tones.length,
      });
      return;
    }
    for (const c of perString[i]) {
      pick.push(c);
      rec(i + 1);
      pick.pop();
    }
  };
  rec(0);
  return out.sort((a, b) => averageFret(a) - averageFret(b));
}

export function averageFret(v: { notes: readonly FrettedNote[] }): number {
  return v.notes.reduce((s, n) => s + n.fret, 0) / v.notes.length;
}

/**
 * Does the voicing fit the window? With `allowOutside`, at most one note may sit one
 * fret outside the window (SPEC §4 setting).
 */
export function fitsWindow(v: Voicing, w: FretWindow, allowOutside = false): boolean {
  let outside = 0;
  for (const n of v.notes) {
    if (inWindow(n.fret, w)) continue;
    if (!allowOutside) return false;
    const off = n.fret < w.start ? w.start - n.fret : n.fret - windowEnd(w);
    if (off > 1) return false;
    outside++;
  }
  return outside <= 1;
}

export function voicingsInRegion(
  chord: Chord,
  region: Region,
  opts: VoicingOptions & { allowOutside?: boolean } = DEFAULT_VOICING_OPTIONS,
): Voicing[] {
  return enumerateVoicings(chord, region.stringSet, opts).filter((v) =>
    fitsWindow(v, region.window, opts.allowOutside),
  );
}

/** Classify a set of tapped notes against a chord: role per note or null. */
export function classifyNotes(
  chord: Chord,
  notes: readonly FrettedNote[],
): { note: FrettedNote; tone: ChordTone | null }[] {
  return notes.map((n) => ({ note: n, tone: toneForPitchClass(chord, n.pc) }));
}

/**
 * Grade an answer: does the tapped set (one note per string of the set) form a valid
 * voicing of the chord in the region? Returns the matching voicing or null.
 */
export function matchVoicing(
  answer: readonly FrettedNote[],
  valid: readonly Voicing[],
): Voicing | null {
  const id = voicingId({ notes: sortLowToHigh(answer) });
  return valid.find((v) => voicingId(v) === id) ?? null;
}

export function sortLowToHigh<T extends FrettedNote>(notes: readonly T[]): T[] {
  return [...notes].sort((a, b) => b.string - a.string);
}

/** Frets between a voicing and a window (0 when they overlap). */
export function distanceToWindow(v: Voicing, w: FretWindow): number {
  return Math.max(0, w.start - v.highestFret, v.position - (w.start + w.width - 1));
}

/**
 * Voicings that don't fit the window, nearest first (ties: lower position first).
 * Used to point at the closest shapes when none fits.
 */
export function nearestOutside(
  all: readonly Voicing[],
  w: FretWindow,
  allowOutside = false,
): Voicing[] {
  return all
    .filter((v) => !fitsWindow(v, w, allowOutside))
    .sort((a, b) => distanceToWindow(a, w) - distanceToWindow(b, w) || a.position - b.position);
}
