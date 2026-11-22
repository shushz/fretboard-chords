import type { Preferences } from '../prefs/model';
import type { Attempt, Item, ModeId } from '../progress/types';
import type { PracticeConfig } from './config';
import type { FunctionComponent } from 'preact';

export interface RunnerProps {
  config: PracticeConfig;
  prefs: Preferences;
  /** Previous question of this session (for "avoid repeats" and continuity). */
  prev: { current: unknown };
  /** Weight per item (spaced repetition hook); 1 when absent. */
  itemWeight?: (item: Item) => number;
  /** Report graded attempt(s) for the current question. */
  onGraded: (a: Attempt[]) => void;
  /** Move to the next question. */
  onNext: () => void;
  /** No question can be generated for this config. */
  onImpossible: () => void;
}

export interface ModeDef {
  id: ModeId;
  name: string;
  description: string;
  /** A few sentences on how the mode works, for setup and Help. */
  help: string;
  Runner: FunctionComponent<RunnerProps>;
  /** Mode-specific setup controls. */
  SetupExtras?: FunctionComponent<{
    config: PracticeConfig;
    onChange: (c: PracticeConfig) => void;
  }>;
}
