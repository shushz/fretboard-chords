/** Chord-tone roles relative to the chord root (SPEC §3.4). */
export const ROLES = ['R', 'b3', '3', 'b5', '5', '#5', 'bb7', 'b7', '7'] as const;
export type Role = (typeof ROLES)[number];

/** Which chord member a role is (third, fifth…), used for "move the 3rd" logic. */
export type ChordMember = 'root' | 'third' | 'fifth' | 'seventh';

export function memberOf(role: Role): ChordMember {
  switch (role) {
    case 'R':
      return 'root';
    case 'b3':
    case '3':
      return 'third';
    case 'b5':
    case '5':
    case '#5':
      return 'fifth';
    default:
      return 'seventh';
  }
}

/** Role from chord member (letter steps above root: 0/2/4/6) and semitones above root. */
export function roleFromInterval(letterSteps: number, semitones: number): Role {
  const key = `${letterSteps}:${semitones}`;
  const table: Record<string, Role> = {
    '0:0': 'R',
    '2:3': 'b3',
    '2:4': '3',
    '4:6': 'b5',
    '4:7': '5',
    '4:8': '#5',
    '6:9': 'bb7',
    '6:10': 'b7',
    '6:11': '7',
  };
  const r = table[key];
  if (!r) throw new Error(`No role for interval ${key}`);
  return r;
}

export type RoleLabelStyle = 'ascii' | 'glyph' | 'interval';

/** Display label: "b3" (ascii), "♭3" (glyph) or "m3" (interval-name style). */
export function formatRole(role: Role, style: RoleLabelStyle = 'ascii'): string {
  if (style === 'ascii') return role;
  if (style === 'glyph') return role.replace(/bb/g, '𝄫').replace(/b/g, '♭').replace(/#/g, '♯');
  const m: Record<Role, string> = {
    R: 'R',
    b3: 'm3',
    '3': 'M3',
    b5: 'd5',
    '5': 'P5',
    '#5': 'A5',
    bb7: 'd7',
    b7: 'm7',
    '7': 'M7',
  };
  return m[role];
}
