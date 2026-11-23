import type { BuiltPack } from './packs.d.mts';

export function buildRobotRidgePack(): BuiltPack;

/** What `makeJourney` is asked for. */
export interface JourneyAsking {
  columns: number;
  rows: number;
  /** How many commands the journey takes, exactly. */
  steps: number;
  /** How many rocks stand off the path. */
  rocks?: number;
  /** The shortest way must have a turn in it. */
  turn?: boolean;
}

/** A journey drawn from a seed: a `program` task, as the engine's schema describes one. */
export interface DrawnJourney {
  type: 'program';
  grid: { columns: number; rows: number };
  start: { at: [number, number]; facing: 'north' | 'east' | 'south' | 'west' };
  goal: [number, number];
  rocks: [number, number][];
  commands: ('forward' | 'left' | 'right')[];
  slots: number;
  repeats: number;
  live: boolean;
  solution: string;
}

export function makeJourney(seed: number, asking: JourneyAsking): DrawnJourney;
