import { describe, expect, it } from 'vitest';
import { MODES } from './modes';

describe('in-app help covers every mode', () => {
  it('each mode has a name, a one-line description and a "How it works" help text', () => {
    for (const m of MODES) {
      expect(m.name.length, m.id).toBeGreaterThan(3);
      expect(m.description.length, m.id).toBeGreaterThan(15);
      expect(m.help.length, m.id).toBeGreaterThan(80);
    }
  });
});
