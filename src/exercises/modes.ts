import type { ModeId } from '../progress/types';
import type { ModeDef } from './types';
import { FindRunner } from './find/FindRunner';
import { TonicRunner, TonicSetup } from './tonic/TonicRunner';
import { ShapeRunner, ShapeSetup } from './shape/ShapeRunner';
import { TonesRunner, TonesSetup } from './tones/TonesRunner';
import { SwitchRunner } from './switch/SwitchRunner';
import { ProgressionRunner, ProgressionSetup } from './progression/ProgressionRunner';
import { NameChordRunner, NameChordSetup } from './namechord/NameChordRunner';

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
    SetupExtras: TonicSetup,
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
  {
    id: 'progression',
    name: 'Progression walk',
    description: 'Find each chord of a real progression, staying close to the last one',
    Runner: ProgressionRunner,
    SetupExtras: ProgressionSetup,
  },
  {
    id: 'nameChord',
    name: 'Name the chord',
    description: '"In E♭m, what is iv?", "what chord is on the 4th degree?" and the reverse',
    Runner: NameChordRunner,
    SetupExtras: NameChordSetup,
  },
];

export function modeDef(id: ModeId): ModeDef | undefined {
  return MODES.find((m) => m.id === id);
}
