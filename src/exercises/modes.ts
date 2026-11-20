import type { ModeId } from '../progress/types';
import type { ModeDef } from './types';
import { FindRunner } from './find/FindRunner';
import { TonicRunner } from './tonic/TonicRunner';
import { ShapeRunner, ShapeSetup } from './shape/ShapeRunner';

export const MODES: ModeDef[] = [
  {
    id: 'find',
    name: 'Find the chord',
    description: 'Tap a diatonic chord in a region of the neck',
    Runner: FindRunner,
  },
  {
    id: 'fromTonic',
    name: 'From the tonic',
    description: 'From a shown I/i shape, find IV, V, vi… nearby',
    Runner: TonicRunner,
  },
  {
    id: 'nextShape',
    name: 'Next / previous shape',
    description: 'Find the next inversion of the same chord up or down the neck',
    Runner: ShapeRunner,
    SetupExtras: ShapeSetup,
  },
];

export function modeDef(id: ModeId): ModeDef | undefined {
  return MODES.find((m) => m.id === id);
}
