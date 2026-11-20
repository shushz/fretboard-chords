import { editPreferences, prefs } from '../prefs/store';
import { Toggle } from '../ui/controls';

/** Setup shortcut for the `practice.givenShapeRoles` preference. */
export function GivenShapeHint() {
  return (
    <Toggle
      label="Show roles on the given shape"
      hint="Off: the shape you're shown has no role labels or colours until you answer"
      checked={prefs.value.practice.givenShapeRoles}
      onChange={(v) => editPreferences((d) => void (d.practice.givenShapeRoles = v))}
    />
  );
}
