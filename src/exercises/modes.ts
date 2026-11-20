import type { ModeId } from '../progress/types';
import type { ModeDef } from './types';
import { FindRunner } from './find/FindRunner';

export const MODES: ModeDef[] = [
  {
    id: 'find',
    name: 'Find the chord',
    description: 'Tap a diatonic chord in a region of the neck',
    Runner: FindRunner,
  },
];

export function modeDef(id: ModeId): ModeDef | undefined {
  return MODES.find((m) => m.id === id);
}
