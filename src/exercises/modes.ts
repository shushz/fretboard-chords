import type { ModeId } from '../progress/types';
import type { ModeDef } from './types';
import { FindRunner } from './find/FindRunner';
import { TonicRunner } from './tonic/TonicRunner';
import { ShapeRunner, ShapeSetup } from './shape/ShapeRunner';
import { TonesRunner, TonesSetup } from './tones/TonesRunner';
import { SwitchRunner } from './switch/SwitchRunner';

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
  {
    id: 'nameTones',
    name: 'Name the tones',
    description: 'Label each note of a shape R / 3 / 5 / 7 — or tap a given chord tone',
    Runner: TonesRunner,
    SetupExtras: TonesSetup,
  },
  {
    id: 'qualitySwitch',
    name: 'Quality switch',
    description: 'Turn major into minor (and back) by moving just the 3rd',
    Runner: SwitchRunner,
  },
];

export function modeDef(id: ModeId): ModeDef | undefined {
  return MODES.find((m) => m.id === id);
}
