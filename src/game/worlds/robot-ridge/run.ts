import {
  parseProgram,
  runProgram,
  type Command,
  type Facing,
  type Program,
  type ProgramTask,
  type RunOutcome,
} from '@/engine';

/**
 * A run of a program, as something to show: where the robot is after each command, how far round it has turned,
 * and which step of the program took it there. Worked out from the engine's own interpreter, so what is shown is
 * exactly what is judged; and worked out all at once, so that a run can be paused, picked up again, or looked at
 * one step at a time without anything being computed twice or differently.
 *
 * Also the small sums of the tray: the places a program is built in, and what a tap on one of them does.
 */

/** How long one command of a run takes on the screen (ms). */
export const STEP_MS = 560;
/** How long one step takes when the way is only being shown, by the robot's shadow (ms). */
export const GHOST_MS = 420;
/** How long the robot stands where a run ended before the run is handed in (ms). */
export const HOLD_MS = 380;

/** Which game a journey belongs to, from how it is set up. */
export type Mode =
  /** Each tap is carried out at once. */
  | 'live'
  /** The steps are put in a row and then run. */
  | 'plan'
  /** The same, with the row done over. */
  | 'again'
  /** A row with one wrong step, to find and change. */
  | 'mend';

export function modeOf(task: ProgramTask): Mode {
  if (task.live) return 'live';
  if (task.given !== undefined) return 'mend';
  return task.repeats > 1 ? 'again' : 'plan';
}

export interface Frame {
  at: [number, number];
  facing: Facing;
  /**
   * Quarter turns since the start: right turns counted up, left turns down. The drawing is turned by this, not by
   * `facing`, so that a turn on the screen always goes the way the robot turned and never the long way round.
   */
  turned: number;
  /** The command that led here: which step of the program, and which time round. `null` for where it starts. */
  step: { index: number; round: number; command: Command } | null;
  /** The robot was told to go forward and could not: a rock, or the edge. It has not moved. */
  bumped: boolean;
}

export interface Showing {
  /** Where the robot starts, and then one frame for each command carried out. */
  frames: Frame[];
  outcome: RunOutcome;
}

const QUARTERS: Record<Facing, number> = { north: 0, east: 1, south: 2, west: 3 };

/** How far the drawing of the robot (which is drawn facing up) is turned to face a way, in degrees. */
export function degreesFacing(facing: Facing): number {
  return QUARTERS[facing] * 90;
}

/** How far the drawing of the robot is turned in a frame, in degrees. */
export function degreesOf(task: ProgramTask, frame: Frame): number {
  return (QUARTERS[task.start.facing] + frame.turned) * 90;
}

/** A journey, as the picture of one describes it: what the world's page draws for an activity. */
export interface Journey {
  /** Which game it is for, where the picture says. */
  game: Mode | null;
  columns: number;
  rows: number;
  start: [number, number];
  facing: Facing;
  goal: [number, number];
  rocks: [number, number][];
}

const isFacing = (value: unknown): value is Facing =>
  value === 'north' || value === 'east' || value === 'south' || value === 'west';

const pairOf = (value: unknown): [number, number] | null => {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const pair: unknown[] = value;
  const [column, row] = pair;
  return typeof column === 'number' && typeof row === 'number' ? [column, row] : null;
};

/**
 * Read a journey from a picture's own description of itself. `null` if it is not a journey: a picture is content,
 * and content is never trusted to be the right shape.
 */
export function journeyOf(of: Readonly<Record<string, unknown>>): Journey | null {
  const { columns, rows, facing } = of;
  const start = pairOf(of.start);
  const goal = pairOf(of.goal);
  const flat: unknown[] = Array.isArray(of.rocks) ? of.rocks : [];
  if (typeof columns !== 'number' || typeof rows !== 'number' || !isFacing(facing)) return null;
  if (!start || !goal || flat.length % 2 !== 0) return null;
  const rocks: [number, number][] = [];
  for (let at = 0; at < flat.length; at += 2) {
    const rock = pairOf([flat[at], flat[at + 1]]);
    if (!rock) return null;
    rocks.push(rock);
  }
  const { game } = of;
  const known = game === 'live' || game === 'plan' || game === 'again' || game === 'mend';
  return { game: known ? game : null, columns, rows, start, facing, goal, rocks };
}

/** A run as frames. With no program at all, the robot only stands where it starts. */
export function framesOf(task: ProgramTask, program: Program | null): Showing {
  const start: Frame = {
    at: [task.start.at[0], task.start.at[1]],
    facing: task.start.facing,
    turned: 0,
    step: null,
    bumped: false,
  };
  if (!program) return { frames: [start], outcome: 'stopped-short' };
  const run = runProgram(task, program);
  const frames = [start];
  let turned = 0;
  for (const move of run.moves) {
    if (move.command === 'left') turned -= 1;
    else if (move.command === 'right') turned += 1;
    frames.push({
      at: [move.pose.at[0], move.pose.at[1]],
      facing: move.pose.facing,
      turned,
      step: { index: move.index, round: move.round, command: move.command },
      bumped: !move.moved,
    });
  }
  return { frames, outcome: run.outcome };
}

/** The squares the robot has stood on up to a frame, in the order it reached them, each once. */
export function trailOf(frames: readonly Frame[], upTo: number): [number, number][] {
  const seen = new Set<string>();
  const trail: [number, number][] = [];
  for (const frame of frames.slice(0, upTo + 1)) {
    const key = `${String(frame.at[0])},${String(frame.at[1])}`;
    if (seen.has(key)) continue;
    seen.add(key);
    trail.push([frame.at[0], frame.at[1]]);
  }
  return trail;
}

// ---------------------------------------------------------------------------------------------------------------------
// The tray: the places a program is built in
// ---------------------------------------------------------------------------------------------------------------------

/** One place of the tray: a command, or nothing yet. */
export type Slot = Command | null;

export interface Tray {
  slots: Slot[];
  /** How many times the whole row is done. */
  times: number;
}

export function emptyTray(size: number): Tray {
  return { slots: Array.from({ length: size }, () => null), times: 1 };
}

/** A program laid out in a tray of `size` places, from the way it is written down. */
export function trayOf(text: string, size: number): Tray {
  const program = parseProgram(text);
  const commands = program?.commands ?? [];
  return {
    slots: Array.from({ length: size }, (_, place) => commands[place] ?? null),
    times: program?.times ?? 1,
  };
}

/** The program a tray holds: its commands in order, gaps passed over. `null` while it holds none. */
export function programOf(tray: Tray): Program | null {
  const commands = tray.slots.filter((slot): slot is Command => slot !== null);
  return commands.length === 0 ? null : { times: tray.times, commands };
}

/** A command put in the first empty place. `null` when there is none. */
export function placed(tray: Tray, command: Command): Tray | null {
  const gap = tray.slots.indexOf(null);
  if (gap < 0) return null;
  return { ...tray, slots: tray.slots.map((slot, place) => (place === gap ? command : slot)) };
}

/** A place emptied. The others stay where they are: a gap is filled by the next command put in. */
export function taken(tray: Tray, place: number): Tray {
  return { ...tray, slots: tray.slots.map((slot, at) => (at === place ? null : slot)) };
}

/** One more time round; after the most there can be, back to once. */
export function oneMoreTime(tray: Tray, most: number): Tray {
  return { ...tray, times: tray.times >= most ? 1 : tray.times + 1 };
}

/**
 * What help has put in the tray and fixed there: the first parts of the answer, as the engine gives them. The first
 * part of a program that is done over is how many times ("x3"); the rest are its commands, by their first letter.
 */
export function fixedBy(given: readonly string[]): { times: number | null; commands: Command[] } {
  const [first, ...rest] = given;
  const counted = first?.startsWith('x') === true;
  const letters = counted ? rest : given;
  const program = letters.length === 0 ? null : parseProgram(letters.join('-'));
  return {
    times: counted ? Number(first.slice(1)) : null,
    commands: program?.commands ?? [],
  };
}

/** The tray with what help has fixed laid over it. */
export function withFixed(tray: Tray, given: readonly string[]): Tray {
  const fixed = fixedBy(given);
  return {
    slots: tray.slots.map((slot, place) => fixed.commands[place] ?? slot),
    times: fixed.times ?? tray.times,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// One tap at a time
// ---------------------------------------------------------------------------------------------------------------------

export interface LiveStep {
  /** The commands carried out so far, with this one if it could be. */
  commands: Command[];
  /** The robot could not go that way. Nothing was spent and nothing is written down. */
  bumped: boolean;
  /** It is standing on the star. */
  arrived: boolean;
  /** It has no power left and is somewhere else. */
  spent: boolean;
}

/**
 * What one more command does when each is carried out as it is tapped. A command the robot cannot carry out — into
 * a rock, off the grid — costs nothing and is not part of the journey: it shows what is in the way, and that is all.
 */
export function liveStep(task: ProgramTask, done: readonly Command[], command: Command): LiveStep {
  const commands = [...done, command];
  const run = runProgram(task, { times: 1, commands });
  if (run.moves.at(-1)?.moved === false) {
    return { commands: [...done], bumped: true, arrived: false, spent: false };
  }
  const arrived = run.outcome === 'arrived';
  return { commands, bumped: false, arrived, spent: !arrived && commands.length >= task.slots };
}
