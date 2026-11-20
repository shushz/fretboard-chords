/**
 * Notes: a letter plus an accidental. Pitch classes are *derived* from the spelling,
 * never the other way round (CLAUDE.md: spelling matters).
 */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = (typeof LETTERS)[number];

/** Semitone offset of each natural letter from C. */
export const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Accidental in semitones: -2 = 𝄫, -1 = ♭, 0 = natural, 1 = ♯, 2 = 𝄪. */
export type Accidental = -2 | -1 | 0 | 1 | 2;

export interface Note {
  readonly letter: Letter;
  readonly acc: Accidental;
}

export function note(letter: Letter, acc: Accidental = 0): Note {
  return { letter, acc };
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function pitchClass(n: Note): number {
  return mod(LETTER_PC[n.letter] + n.acc, 12);
}

export function letterIndex(l: Letter): number {
  return LETTERS.indexOf(l);
}

export function letterAt(index: number): Letter {
  return LETTERS[mod(index, 7)];
}

export function sameNote(a: Note, b: Note): boolean {
  return a.letter === b.letter && a.acc === b.acc;
}

const ACC_ASCII: Record<Accidental, string> = { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: '##' };
const ACC_GLYPH: Record<Accidental, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };

/** Internal ASCII form, e.g. "F##", "Bbb", "C". */
export function noteToAscii(n: Note): string {
  return n.letter + ACC_ASCII[n.acc];
}

/** Display form. `glyphs` = true → ♯ ♭ 𝄪 𝄫, false → ASCII # b ## bb. */
export function formatNote(n: Note, glyphs = true): string {
  return n.letter + (glyphs ? ACC_GLYPH[n.acc] : ACC_ASCII[n.acc]);
}

function parseAccidental(s: string): Accidental | null {
  const t = s
    .replace(/♯/g, '#')
    .replace(/♭/g, 'b')
    .replace(/𝄪/g, '##')
    .replace(/𝄫/g, 'bb')
    .replace(/x/g, '##');
  switch (t) {
    case '':
      return 0;
    case '#':
      return 1;
    case '##':
      return 2;
    case 'b':
      return -1;
    case 'bb':
      return -2;
    default:
      return null;
  }
}

const ACC_RE = '(?:##|bb|#|b|x|♯|♭|𝄪|𝄫)?';

/**
 * Parse a note name at the start of `input`. Accepts suffix accidentals ("F#", "Ebb",
 * "Fx", "E♭") and, for input aliases, prefix accidentals ("bE", "#F"). Case-insensitive
 * letter. Returns every reading (suffix form first) with the unparsed remainder, because
 * "bEm" is only meaningful as prefix-♭ E + "m".
 */
export function parseNoteCandidates(input: string): { note: Note; rest: string }[] {
  const s = input.trim();
  const out: { note: Note; rest: string }[] = [];
  const post = new RegExp(`^([A-Ga-g])(${ACC_RE})(.*)$`, 'u').exec(s);
  if (post) {
    const acc = parseAccidental(post[2]);
    if (acc !== null) out.push({ note: note(post[1].toUpperCase() as Letter, acc), rest: post[3] });
  }
  const pre = new RegExp(`^(${ACC_RE})([A-Ga-g])(.*)$`, 'u').exec(s);
  if (pre && pre[1] !== '') {
    const acc = parseAccidental(pre[1]);
    if (acc !== null) out.push({ note: note(pre[2].toUpperCase() as Letter, acc), rest: pre[3] });
  }
  return out;
}

export function parseNote(input: string): Note | null {
  const r = parseNoteCandidates(input).find((c) => c.rest.trim() === '');
  return r ? r.note : null;
}

/**
 * Spell the note that is `letterSteps` letters and `semitones` semitones above `root`.
 * E.g. spellAbove(G#, 2, 4) = B# (a major third). Throws if the result would need
 * more than a double accidental.
 */
export function spellAbove(root: Note, letterSteps: number, semitones: number): Note {
  const letter = letterAt(letterIndex(root.letter) + letterSteps);
  const target = pitchClass(root) + semitones;
  let diff = mod(target - LETTER_PC[letter], 12);
  if (diff > 6) diff -= 12;
  if (diff < -2 || diff > 2) {
    throw new Error(
      `Cannot spell ${letterSteps} letters/${semitones} semitones above ${noteToAscii(root)}`,
    );
  }
  return note(letter, diff as Accidental);
}

/** Semitone distance going up from a to b, 0..11. */
export function semitonesUp(a: Note, b: Note): number {
  return mod(pitchClass(b) - pitchClass(a), 12);
}

/** Letter steps going up from a to b, 0..6. */
export function lettersUp(a: Note, b: Note): number {
  return mod(letterIndex(b.letter) - letterIndex(a.letter), 7);
}

/** Position on the circle of fifths: C=0, G=1, F=-1, F#=6, Bb=-2 … */
export function fifths(n: Note): number {
  const base: Record<Letter, number> = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };
  return base[n.letter] + 7 * n.acc;
}
