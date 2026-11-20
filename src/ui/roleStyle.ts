import type { Preferences } from '../prefs/model';
import { type Role, formatRole, memberOf } from '../theory/roles';

export function roleColor(role: Role, p: Preferences): string {
  return p.look.roleColors[memberOf(role)];
}

export function roleLabel(role: Role, p: Preferences): string {
  return formatRole(role, p.harmony.roleLabels);
}
