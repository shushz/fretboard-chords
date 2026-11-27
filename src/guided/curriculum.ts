/**
 * Guided practice: the learning path (pure). Steps are organized by shape, not key: a
 * string set and the tonic's inversion, because a movement between chord shapes is the
 * same in every key. Keys are random on every question.
 *
 * Triads, per string set (major keys): From the tonic from each inversion; Next/previous
 * shape; Name the tones (label, then tap a role); Quality switch; From the tonic without
 * role hints; Find the chord in each inversion (harder: no shape to start from); a
 * progression walk; then optional challenges (tap the root on 6/5 too; progressions
 * against the beat). A theory step (Name the chord) comes early. After strings 2–4, 1–3,
 * 3–5: a shorter block on 4–6, then iii and vii°. Then minor keys the same way, a bit
 * faster. Then seventh chords (drop-2 on 2–5 and 1–4), major then minor.
 */
import type { DegreeIndex } from '../theory/chords';
import type { Mode } from '../theory/keys';
import type { StringSetId } from '../fretboard/regions';
import type { Inversion } from '../fretboard/voicings';

export type GuidedMode =
  'fromTonic' | 'find' | 'nameTones' | 'progression' | 'nextShape' | 'qualitySwitch' | 'nameChord';

/** One thing to get solid: a question kind for one chord, in any key. */
export interface Target {
  mode: GuidedMode;
  keyMode: Mode;
  /** The chord (From the tonic: the chord to find from the tonic). */
  degree: DegreeIndex;
  /** '*' for Name the chord (no fretboard). */
  stringSet: StringSetId | '*';
  /** From the tonic: the tonic's shape; Find the chord: the shape to find. Unset = any. */
  inversion?: Inversion;
  /** From the tonic: role labels on the tonic shape (a hint). */
  roles?: boolean;
  /**
   * Next/previous shape: 'up' | 'down'; Name the tones: 'label' | 'tap'; Quality switch:
   * the switch ('maj>min' | 'min>maj'); Progression walk: 'tempo' (against the beat).
   */
  variant?: string;
  /** Seventh chords (drop-2). */
  sevenths?: boolean;
  /** Find the chord: also tap the root on string 6 or 5. */
  anchor?: boolean;
}

export interface Step {
  id: string;
  title: string;
  /** What the step adds, in a sentence. */
  about: string;
  targets: Target[];
  /**
   * Count only answers given since the step opened (it asks the same items as an earlier
   * step, now without hints, so earlier answers don't show it's learned).
   */
  fresh?: boolean;
  /** A challenge that can be skipped. */
  optional?: boolean;
}

const INV_NAME: Record<Inversion, string> = {
  root: 'root position',
  first: 'first inversion',
  second: 'second inversion',
  third: 'third inversion',
};

function setName(s: StringSetId | '*'): string {
  return s === '*' ? 'no fretboard' : `strings ${s.replace('-', '–')}`;
}

function targets(
  mode: GuidedMode,
  keyMode: Mode,
  degrees: DegreeIndex[],
  stringSet: StringSetId | '*',
  extra: Partial<Target> = {},
): Target[] {
  return degrees.map((degree) => ({ mode, keyMode, degree, stringSet, ...extra }));
}

/** Builds steps with ids and titles for one block (a key mode, a string set, triads or not). */
function stepper(prefix: string, s: StringSetId | '*') {
  return (
    id: string,
    title: string,
    about: string,
    ts: Target[],
    opts: { fresh?: boolean; optional?: boolean } = {},
  ): Step => ({
    id: `${prefix}-${s}-${id}`,
    title: `${title} · ${setName(s)}`,
    about,
    targets: ts,
    ...(opts.fresh ? { fresh: true } : {}),
    ...(opts.optional ? { optional: true } : {}),
  });
}

/** Quality switch of each chord by its own quality: major → minor, minor → major. */
function switches(
  keyMode: Mode,
  majors: DegreeIndex[],
  minors: DegreeIndex[],
  s: StringSetId,
): Target[] {
  return [
    ...targets('qualitySwitch', keyMode, majors, s, { variant: 'maj>min' }),
    ...targets('qualitySwitch', keyMode, minors, s, { variant: 'min>maj' }),
  ];
}

// Major keys: I ii iii IV V vi vii° → 0 1 2 3 4 5 6
const IV = 3,
  V = 4,
  ii = 1,
  vi = 5,
  iii = 2,
  vii = 6;
const MAJOR_CORE: DegreeIndex[] = [IV, V, ii, vi];
// Minor keys: i ii° ♭III iv V ♭VI ♭VII
const iv = 3,
  bVI = 5,
  bVII = 6,
  iio = 1,
  bIII = 2;
const MINOR_CORE: DegreeIndex[] = [iv, V, bVI, bVII, iio];

function majorTriads(s: StringSetId, opts: { theory?: boolean } = {}): Step[] {
  const t = stepper('maj', s);
  const all = MAJOR_CORE;
  const out: Step[] = [
    t(
      'tonic-root-IV-V',
      'From I (root position) to IV and V',
      'Find IV and V near the I chord in root position.',
      targets('fromTonic', 'major', [IV, V], s, { inversion: 'root', roles: true }),
    ),
    t(
      'tonic-root-ii-vi',
      'From I (root position) to ii and vi',
      'Add the minor chords ii and vi.',
      targets('fromTonic', 'major', [ii, vi], s, { inversion: 'root', roles: true }),
    ),
  ];
  if (opts.theory)
    out.push(
      stepper('maj', '*')(
        'name-chord',
        'Name the chord: major keys',
        'Chord names and numerals, no fretboard: “In E, what is vi?”, and the reverse.',
        targets('nameChord', 'major', all, '*'),
      ),
    );
  for (const inv of ['first', 'second'] as const)
    out.push(
      t(
        `tonic-${inv}`,
        `From I (${INV_NAME[inv]})`,
        `The same chords, starting from the I chord in ${INV_NAME[inv]}.`,
        targets('fromTonic', 'major', all, s, { inversion: inv, roles: true }),
      ),
    );
  out.push(
    t(
      'shapes',
      'Next and previous shape',
      'Move one chord to its next shape up, or down, the neck: the three shapes connect.',
      [
        ...targets('nextShape', 'major', [0, IV, V], s, { variant: 'up' }),
        ...targets('nextShape', 'major', [0, IV, V], s, { variant: 'down' }),
      ],
    ),
    t(
      'tones',
      'Name the tones',
      'Label every note of the I, IV, V, ii and vi shapes: R, 3 or 5.',
      targets('nameTones', 'major', [0, ...all], s, { variant: 'label' }),
    ),
    t(
      'tones-tap',
      'Tap a chord tone',
      'The reverse: “tap the 3 of V on string 3”.',
      targets('nameTones', 'major', [0, ...all], s, { variant: 'tap' }),
    ),
    t(
      'switch',
      'Quality switch',
      'Turn a major chord minor, or a minor chord major, by moving its 3rd one fret.',
      switches('major', [0, IV, V], [ii, vi], s),
    ),
    t(
      'tonic-bare',
      'From I, without hints',
      'The I chord is shown without role labels or colors: you know its shape now.',
      targets('fromTonic', 'major', all, s, { roles: false }),
      { fresh: true },
    ),
  );
  for (const inv of ['root', 'first', 'second'] as const)
    out.push(
      t(
        `find-${inv}`,
        `Find the chord in ${INV_NAME[inv]}`,
        `No shape to start from: find I, IV, V, ii and vi in ${INV_NAME[inv]}.`,
        targets('find', 'major', [0, ...all], s, { inversion: inv }),
      ),
    );
  out.push(
    t(
      'progression',
      'Progression walk',
      'Real progressions chord by chord, staying close to the last shape.',
      targets('progression', 'major', [0, ...all], s),
    ),
    ...challenges(t, 'major', [0, ...all], s),
  );
  return out;
}

/** Optional challenges at the end of a string set. */
function challenges(
  t: ReturnType<typeof stepper>,
  keyMode: Mode,
  degrees: DegreeIndex[],
  s: StringSetId,
): Step[] {
  const out: Step[] = [];
  // The root on 6 or 5 needs those strings below the set.
  if (s === '1-3' || s === '2-4' || s === '3-5')
    out.push(
      t(
        'challenge-root',
        'Challenge: tap the root too',
        'Find the chord and also its root on string 6 or 5, the bass note you know best.',
        targets('find', keyMode, degrees, s, { anchor: true }),
        { optional: true },
      ),
    );
  out.push(
    t(
      'challenge-tempo',
      'Challenge: progressions in time',
      'The progression walk against the beat: a few beats per chord.',
      targets('progression', keyMode, degrees, s, { variant: 'tempo' }),
      { optional: true },
    ),
  );
  return out;
}

/** A shorter block for a string set once the main ones are known (4–6). */
function shortBlock(keyMode: Mode, core: DegreeIndex[], s: StringSetId, roman: string): Step[] {
  const t = stepper(keyMode === 'major' ? 'maj' : 'min', s);
  return [
    t(
      'tonic',
      `From ${roman} to the other chords`,
      'The low strings: the same moves, from the tonic in any shape.',
      targets('fromTonic', keyMode, core, s, { roles: true }),
    ),
    t(
      'tones',
      'Name the tones',
      'Label every note of the shapes on the low strings.',
      targets('nameTones', keyMode, [0, ...core], s, { variant: 'label' }),
    ),
    t(
      'tonic-bare',
      `From ${roman}, without hints`,
      'No role labels on the tonic.',
      targets('fromTonic', keyMode, core, s, { roles: false }),
      { fresh: true },
    ),
    t(
      'find',
      'Find the chord',
      'Any shape, no shape to start from.',
      targets('find', keyMode, [0, ...core], s),
    ),
    t(
      'progression',
      'Progression walk',
      'Progressions on the low strings.',
      targets('progression', keyMode, [0, ...core], s),
    ),
  ];
}

/** The less common chords: iii and vii° (major), ♭III (minor). */
function rareBlock(keyMode: Mode): Step[] {
  const degrees = keyMode === 'major' ? [iii, vii] : [bIII];
  const names = keyMode === 'major' ? 'iii and vii°' : '♭III';
  const roman = keyMode === 'major' ? 'I' : 'i';
  const out: Step[] = [];
  for (const s of ['2-4', '1-3'] as const) {
    const t = stepper(keyMode === 'major' ? 'maj' : 'min', s);
    out.push(
      t(
        'rare-tonic',
        `From ${roman} to ${names}`,
        `The less common chords of the key: ${names}.`,
        targets('fromTonic', keyMode, degrees as DegreeIndex[], s, { roles: true }),
      ),
      t(
        'rare-find',
        `Find ${names}`,
        `Find ${names} with no shape to start from.`,
        targets('find', keyMode, degrees as DegreeIndex[], s),
      ),
    );
  }
  return out;
}

function minorTriads(s: StringSetId, opts: { theory?: boolean } = {}): Step[] {
  const t = stepper('min', s);
  const rest: DegreeIndex[] = [bVI, bVII, iio];
  const all = MINOR_CORE;
  const out: Step[] = [];
  if (opts.theory)
    out.push(
      stepper('min', '*')(
        'name-chord',
        'Name the chord: minor keys',
        'Minor-key chord names and numerals, no fretboard: “In E♭m, what is iv?”.',
        targets('nameChord', 'minor', all, '*'),
      ),
    );
  out.push(
    t(
      'tonic-iv-V',
      'Minor keys: from i to iv and V',
      'Minor keys, from the i chord in any shape.',
      targets('fromTonic', 'minor', [iv, V], s, { roles: true }),
    ),
    t(
      'tonic-rest',
      'Minor keys: from i to ♭VI, ♭VII and ii°',
      'The rest of the minor key’s chords.',
      targets('fromTonic', 'minor', rest, s, { roles: true }),
    ),
    t(
      'switch',
      'Minor keys: quality switch',
      'Turn i and iv major, and ♭VI and ♭VII minor, by moving the 3rd.',
      switches('minor', [bVI, bVII], [0, iv], s),
    ),
    t(
      'tonic-bare',
      'Minor keys: from i, without hints',
      'The i chord without role labels or colors.',
      targets('fromTonic', 'minor', all, s, { roles: false }),
      { fresh: true },
    ),
    t(
      'find',
      'Minor keys: find the chord',
      'Find i, iv, V, ♭VI, ♭VII and ii° with no shape to start from.',
      targets('find', 'minor', [0, ...all], s),
    ),
    t(
      'progression',
      'Minor keys: progression walk',
      'Minor-key progressions chord by chord.',
      targets('progression', 'minor', [0, ...all], s),
    ),
  );
  return out;
}

/** Seventh chords (drop-2 on four strings), after the triads. */
function sevenths(keyMode: Mode, s: StringSetId): Step[] {
  const t = stepper(keyMode === 'major' ? 'maj7' : 'min7', s);
  const core = keyMode === 'major' ? MAJOR_CORE : MINOR_CORE;
  const roman = keyMode === 'major' ? 'Imaj7' : 'im7';
  const first: DegreeIndex[] = keyMode === 'major' ? [IV, V] : [iv, V];
  const rest = core.filter((d) => !first.includes(d)) as DegreeIndex[];
  const x = { sevenths: true };
  return [
    t(
      'tonic-a',
      `Sevenths: from ${roman} (root position) to ${keyMode === 'major' ? 'IVmaj7 and V7' : 'ivm7 and V7'}`,
      'Seventh chords on four strings, from the tonic in root position.',
      targets('fromTonic', keyMode, first, s, { ...x, inversion: 'root', roles: true }),
    ),
    t(
      'tonic-b',
      `Sevenths: from ${roman} to the other chords`,
      'The rest of the key’s seventh chords, from the tonic in any shape.',
      targets('fromTonic', keyMode, rest, s, { ...x, roles: true }),
    ),
    t(
      'tones',
      'Sevenths: name the tones',
      'Label every note: R, 3, 5 or 7 (♭3, ♭5, ♭7 where they are).',
      targets('nameTones', keyMode, [0, ...core], s, { ...x, variant: 'label' }),
    ),
    t(
      'tonic-bare',
      `Sevenths: from ${roman}, without hints`,
      'No role labels on the tonic.',
      targets('fromTonic', keyMode, core, s, { ...x, roles: false }),
      { fresh: true },
    ),
    t(
      'find',
      'Sevenths: find the chord',
      'Find each seventh chord with no shape to start from.',
      targets('find', keyMode, [0, ...core], s, x),
    ),
    t(
      'progression',
      'Sevenths: progression walk',
      'Progressions with seventh chords.',
      targets('progression', keyMode, [0, ...core], s, x),
    ),
  ];
}

/** The whole path, in order. */
export const CURRICULUM: readonly Step[] = [
  ...majorTriads('2-4', { theory: true }),
  ...majorTriads('1-3'),
  ...majorTriads('3-5'),
  ...shortBlock('major', MAJOR_CORE, '4-6', 'I'),
  ...rareBlock('major'),
  ...minorTriads('2-4', { theory: true }),
  ...minorTriads('1-3'),
  ...minorTriads('3-5'),
  ...shortBlock('minor', MINOR_CORE, '4-6', 'i'),
  ...rareBlock('minor'),
  ...sevenths('major', '2-5'),
  ...sevenths('major', '1-4'),
  ...sevenths('minor', '2-5'),
  ...sevenths('minor', '1-4'),
];

export function targetId(t: Target): string {
  return [
    t.mode,
    t.keyMode,
    t.degree,
    t.stringSet,
    t.inversion ?? '*',
    t.roles ?? '*',
    t.variant ?? '*',
    t.sevenths ? 7 : 3,
    t.anchor ? 'a' : '-',
  ].join('|');
}
