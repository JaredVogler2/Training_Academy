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

/** What `makeLongJourney` is asked for: all of it is needed. */
export interface LongJourneyAsking {
  columns: number;
  rows: number;
  /** How many commands the one shortest way takes, exactly. */
  steps: number;
  /** How many rocks stand on the ground; they are in the way, or the ground is not kept. */
  rocks: number;
}

/** A longer journey drawn from a seed: a plan whose row can be run a step at a time. */
export interface DrawnLongJourney extends DrawnJourney {
  stepwise: true;
}

export function makeLongJourney(seed: number, asking: LongJourneyAsking): DrawnLongJourney;

/** A little map read into its parts: S the robot, G the star, # a rock, ~ water, = a bridge, a dot for ground. */
export function readMap(lines: string[]): {
  columns: number;
  rows: number;
  start: [number, number];
  goal: [number, number];
  rocks: [number, number][];
  water: [number, number][];
  bridges: [number, number][];
};
