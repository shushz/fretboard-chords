import type { ModeId } from '../progress/types';
import type { ModeDef } from './types';
import { FindRunner, FindSetup } from './find/FindRunner';
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
    description: 'Find a chord of the key on part of the neck',
    Runner: FindRunner,
    SetupExtras: FindSetup,
    help: 'You get a chord (e.g. “F♯m · iv · strings 2–4 · frets 5–9”). Tap its notes, one per string, inside the dashed region. Any correct shape inside it counts; the right chord somewhere else is pointed out but doesn’t count. A miss shows every right shape with its roles. With “Also tap the root on string 6 or 5” on, tap the chord’s root on a bass string first.',
  },
  {
    id: 'fromTonic',
    name: 'From the tonic',
    description: 'From a shown I/i shape, find IV, V, vi… nearby',
    Runner: TonicRunner,
    help: "You're shown and played the key's home chord (I or i). Find another chord of the key, e.g. the iv, close to it. Any correct shape in or within 2 frets of the dashed region counts; the one with the least movement earns Smooth ✦. This trains moving between chords instead of jumping around the neck.",
    SetupExtras: TonicSetup,
  },
  {
    id: 'nextShape',
    name: 'Next / previous shape',
    description: 'Find the next inversion of the same chord up or down the neck',
    Runner: ShapeRunner,
    help: "You're shown one shape of a chord. Find the next shape of the same chord further up (or down) the neck, on the same strings. This links the three shapes of each chord along the neck.",
    SetupExtras: ShapeSetup,
  },
  {
    id: 'nameTones',
    name: 'Name the tones',
    description: 'Label each note of a shape R / 3 / 5 / 7 — or tap a given chord tone',
    Runner: TonesRunner,
    help: 'Label each note of a shown shape with its role (R, ♭3, 3, 5…), from the lowest string up. Or the reverse: “tap the ♭3 of V on string 2”. This builds the habit of knowing what every finger is playing.',
    SetupExtras: TonesSetup,
  },
  {
    id: 'qualitySwitch',
    name: 'Quality switch',
    description: 'Turn major into minor (and back) by moving just the 3rd',
    Runner: SwitchRunner,
    help: 'A shape is shown and played. Change its quality by moving just one note: major → minor moves the 3rd down a fret, minor → major moves it up. Tap the note that moves, then where it goes; tapping a note that should stay counts as a mistake.',
  },
  {
    id: 'progression',
    name: 'Progression walk',
    description: 'Find each chord of a real progression, staying close to the last one',
    Runner: ProgressionRunner,
    help: 'A real progression (e.g. i–iv–V–i) is played chord by chord: find each one, ideally close to the one before (it stays dimmed on the board). Shapes in or within 2 frets of the dashed region count. At the end you hear the progression as you played it. Tempo mode gives you a few beats per chord.',
    SetupExtras: ProgressionSetup,
  },
  {
    id: 'nameChord',
    name: 'Name the chord',
    description: '"In E♭m, what is iv?", "what chord is on the 4th degree?" and the reverse',
    Runner: NameChordRunner,
    help: 'No fretboard: chord names and numerals. “In E♭m, what is iv?”, “what chord is on the 4th degree?” (major or minor?), or the reverse, “A♭m is which degree?”. Every option is plausible, so you have to know the key.',
    SetupExtras: NameChordSetup,
  },
];

export function modeDef(id: ModeId): ModeDef | undefined {
  return MODES.find((m) => m.id === id);
}
