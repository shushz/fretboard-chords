import type { Preferences } from '../prefs/model';
import { type Role, formatRole, memberOf } from '../theory/roles';

export function roleColor(role: Role, p: Preferences): string {
  return p.look.roleColors[memberOf(role)];
}

/** Role label with proper symbols: ♭3, ♭5, ♭7. */
export function roleLabel(role: Role, _p?: Preferences): string {
  return formatRole(role, 'glyph');
}
