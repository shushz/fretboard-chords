/**
 * Guided practice: the learning path (pure). Steps are organized by shape, not key: a
 * string set and the tonic's inversion, because a movement between chord shapes is the
 * same in every key. Keys are random on every question.
 *
 * Per string set (major keys): From the tonic from root position (IV, V, then ii, vi),
 * from first and second inversion, Name the tones of those chords, From the tonic without
 * role hints, Find the chord in each inversion (harder: no shape to start from), then a
 * progression walk. Then the same for minor keys, a bit faster (the shapes are known).
 */
import type { DegreeIndex } from '../theory/chords';
import type { Mode } from '../theory/keys';
import type { StringSetId } from '../fretboard/regions';
import type { Inversion } from '../fretboard/voicings';

export type GuidedMode = 'fromTonic' | 'find' | 'nameTones' | 'progression';

/** One thing to get solid: a question kind for one chord, in any key. */
export interface Target {
  mode: GuidedMode;
  keyMode: Mode;
  /** The chord (From the tonic: the chord to find from the tonic). */
  degree: DegreeIndex;
  stringSet: StringSetId;
  /** From the tonic: the tonic's shape; Find the chord: the shape to find. Unset = any. */
  inversion?: Inversion;
  /** From the tonic: role labels on the tonic shape (a hint). */
  roles?: boolean;
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
}

const MAJOR: Record<string, DegreeIndex> = { IV: 3, V: 4, ii: 1, vi: 5 };
const MINOR: Record<string, DegreeIndex> = { iv: 3, V: 4, '♭VI': 5, '♭VII': 6, 'ii°': 1 };
const SETS: StringSetId[] = ['2-4', '1-3', '3-5'];
const INV_NAME: Record<Inversion, string> = {
  root: 'root position',
  first: 'first inversion',
  second: 'second inversion',
  third: 'third inversion',
};

function set(s: StringSetId): string {
  return `strings ${s.replace('-', '–')}`;
}

function targets(
  mode: GuidedMode,
  keyMode: Mode,
  degrees: DegreeIndex[],
  stringSet: StringSetId,
  extra: Partial<Target> = {},
): Target[] {
  return degrees.map((degree) => ({ mode, keyMode, degree, stringSet, ...extra }));
}

function majorSteps(s: StringSetId): Step[] {
  const { IV, V, ii, vi } = MAJOR;
  const all = [IV, V, ii, vi];
  const out: Step[] = [];
  const t = (id: string, title: string, about: string, ts: Target[], fresh = false): Step => ({
    id: `maj-${s}-${id}`,
    title: `${title} · ${set(s)}`,
    about,
    targets: ts,
    ...(fresh ? { fresh } : {}),
  });
  out.push(
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
      'tones',
      'Name the tones',
      'Label every note of the I, IV, V, ii and vi shapes: R, 3 or 5.',
      targets('nameTones', 'major', [0, ...all], s),
    ),
    t(
      'tonic-bare',
      'From I, without hints',
      'The I chord is shown without role labels or colors: you know its shape now.',
      targets('fromTonic', 'major', all, s, { roles: false }),
      true,
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
  );
  return out;
}

function minorSteps(s: StringSetId): Step[] {
  const { iv, V } = MINOR;
  const rest = [MINOR['♭VI'], MINOR['♭VII'], MINOR['ii°']];
  const all = [iv, V, ...rest];
  const t = (id: string, title: string, about: string, ts: Target[], fresh = false): Step => ({
    id: `min-${s}-${id}`,
    title: `${title} · ${set(s)}`,
    about,
    targets: ts,
    ...(fresh ? { fresh } : {}),
  });
  return [
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
      'tonic-bare',
      'Minor keys: from i, without hints',
      'The i chord without role labels or colors.',
      targets('fromTonic', 'minor', all, s, { roles: false }),
      true,
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
  ];
}

/** The whole path, in order. */
export const CURRICULUM: readonly Step[] = [
  ...SETS.flatMap(majorSteps),
  ...SETS.flatMap(minorSteps),
];

export function targetId(t: Target): string {
  return [t.mode, t.keyMode, t.degree, t.stringSet, t.inversion ?? '*', t.roles ?? '*'].join('|');
}
