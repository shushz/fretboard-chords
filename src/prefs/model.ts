/**
 * Preferences model (SPEC §7.1). Every musical choice with more than one valid option
 * lives here with a default; nothing else in the app hard-codes such choices.
 */
import type { HarmonyOptions, NumeralOptions, SymbolOptions } from '../theory/chords';
import { DEFAULT_SPELLING, type SpellingOptions } from '../theory/keys';
import type { RoleLabelStyle } from '../theory/roles';
import type { FretWindow, StringSetId } from '../fretboard/regions';
import type { FretRange } from '../fretboard/tuning';
import type { ChordMember } from '../theory/roles';

export type AnchorMode = 'off' | 'ghost' | 'required';
export type AnchorStrings = '6' | '5' | 'both';
export type Theme = 'system' | 'light' | 'dark';
export type SessionLength =
  { kind: 'questions'; count: number } | { kind: 'minutes'; minutes: number };

export interface Preferences {
  version: 1;
  spelling: SpellingOptions & {
    /** ♯ ♭ 𝄪 𝄫 glyphs (true) vs ASCII # b (false). */
    glyphs: boolean;
  };
  harmony: HarmonyOptions & {
    /** ° / ø vs dim / 7♭5. */
    dimStyle: 'symbol' | 'text';
    /** b3 / ♭3 / m3 role labels. */
    roleLabels: RoleLabelStyle;
  };
  fretboard: {
    /** Enabled triad string sets. */
    stringSets: StringSetId[];
    fretRange: FretRange;
    window: FretWindow;
    /** Pick a random window for each session instead of the default one. */
    randomWindow: boolean;
    allowOutside: boolean;
    maxSpan: number;
    anchor: AnchorMode;
    anchorStrings: AnchorStrings;
    leftHanded: boolean;
    showNoteNames: boolean;
    showRoles: boolean;
    showFretNumbers: boolean;
  };
  sevenths: {
    enabled: boolean;
    drop2Sets: StringSetId[];
    shells: boolean;
  };
  practice: {
    sessionLength: SessionLength;
    masteryAccuracy: number;
    masteryTimeTriadMs: number;
    masteryTimeSeventhMs: number;
    freshShare: number;
    tempoBpm: number;
    tempoBeats: number;
    /** Quality-switch extensions (SPEC §5.7) and the "name the new chord" step. */
    switchMinDim: boolean;
    switchMajAug: boolean;
    switchDom7: boolean;
    switchNameChord: boolean;
  };
  sound: {
    volume: number;
    muted: boolean;
    strumMs: number;
  };
  look: {
    theme: Theme;
    roleColors: Record<ChordMember, string>;
  };
}

export const DEFAULT_ROLE_COLORS: Record<ChordMember, string> = {
  root: '#e5484d',
  third: '#3e8ef7',
  fifth: '#f5a524',
  seventh: '#a35bf0',
};

export const DEFAULT_PREFERENCES: Preferences = {
  version: 1,
  spelling: { ...DEFAULT_SPELLING, pairs: { ...DEFAULT_SPELLING.pairs }, glyphs: true },
  harmony: { minorV: 'harmonic', dimStyle: 'symbol', roleLabels: 'ascii' },
  fretboard: {
    stringSets: ['1-3', '2-4'],
    fretRange: 15,
    window: { start: 5, width: 5 },
    randomWindow: false,
    allowOutside: false,
    maxSpan: 4,
    anchor: 'ghost',
    anchorStrings: 'both',
    leftHanded: false,
    showNoteNames: false,
    showRoles: true,
    showFretNumbers: true,
  },
  sevenths: { enabled: false, drop2Sets: ['1-4', '2-5'], shells: false },
  practice: {
    sessionLength: { kind: 'questions', count: 20 },
    masteryAccuracy: 0.9,
    masteryTimeTriadMs: 3000,
    masteryTimeSeventhMs: 5000,
    freshShare: 0.2,
    tempoBpm: 60,
    tempoBeats: 4,
    switchMinDim: false,
    switchMajAug: false,
    switchDom7: false,
    switchNameChord: false,
  },
  sound: { volume: 0.8, muted: false, strumMs: 30 },
  look: { theme: 'system', roleColors: { ...DEFAULT_ROLE_COLORS } },
};

type Json = unknown;

function isObj(v: Json): v is Record<string, Json> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Merge stored (possibly partial, older or corrupt) preferences onto the defaults.
 * Unknown keys are dropped; values of the wrong type fall back to the default.
 */
export function mergePreferences(
  stored: Json,
  base: Preferences = DEFAULT_PREFERENCES,
): Preferences {
  return mergeValue(base, stored) as Preferences;
}

function mergeValue(def: Json, val: Json): Json {
  if (val === undefined) return clone(def);
  if (isObj(def)) {
    if (!isObj(val)) return clone(def);
    // Discriminated unions (sessionLength): accept the stored object if its kind is known.
    if ('kind' in def) return isValidSessionLength(val) ? { ...val } : clone(def);
    const out: Record<string, Json> = {};
    for (const k of Object.keys(def)) out[k] = mergeValue(def[k], val[k]);
    return out;
  }
  if (Array.isArray(def)) {
    if (!Array.isArray(val)) return clone(def);
    const sample = def[0];
    return val.filter((x) => sample === undefined || typeof x === typeof sample);
  }
  return typeof val === typeof def ? val : def;
}

function isValidSessionLength(v: Record<string, Json>): boolean {
  return (
    (v.kind === 'questions' && typeof v.count === 'number' && v.count > 0) ||
    (v.kind === 'minutes' && typeof v.minutes === 'number' && v.minutes > 0)
  );
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Derived option bundles for the theory layer. */
export function symbolOptions(p: Preferences): SymbolOptions {
  return { glyphs: p.spelling.glyphs, dimStyle: p.harmony.dimStyle };
}

export function numeralOptions(p: Preferences): NumeralOptions {
  return { glyphs: p.spelling.glyphs, dimStyle: p.harmony.dimStyle };
}

export function anchorStringList(p: Preferences): (5 | 6)[] {
  const s = p.fretboard.anchorStrings;
  return s === 'both' ? [6, 5] : s === '6' ? [6] : [5];
}

/** Immutable deep update helper: `update(p, (d) => { d.sound.muted = true; })`. */
export function updatePreferences(p: Preferences, fn: (draft: Preferences) => void): Preferences {
  const d = clone(p);
  fn(d);
  return d;
}
