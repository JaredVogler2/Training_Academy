import {
  allRaised,
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
  /** The robot was told to go forward and could not: a rock, water, a bridge that is up, or the edge. */
  bumped: boolean;
  /** Which of the task's bridges are up at this moment, one for each. */
  raised: boolean[];
  /**
   * The robot is waiting in front of a bridge that is up. Waiting for something is two moments, this one and the
   * next, in which the bridge has come down; waiting for nothing is one, and nothing in it changes.
   */
  waiting: boolean;
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

/**
 * Which game a picture of a journey is for: the four ways of playing, and two that are a plan with something
 * more to it (a long one, and one with a bridge on the way).
 */
export type Game = Mode | 'long' | 'bridge';

const GAMES: readonly Game[] = ['live', 'plan', 'again', 'mend', 'long', 'bridge'];

/** A journey, as the picture of one describes it: what the world's page draws for an activity. */
export interface Journey {
  /** Which game it is for, where the picture says. */
  game: Game | null;
  columns: number;
  rows: number;
  start: [number, number];
  facing: Facing;
  goal: [number, number];
  rocks: [number, number][];
  water: [number, number][];
  bridges: [number, number][];
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
  if (typeof columns !== 'number' || typeof rows !== 'number' || !isFacing(facing)) return null;
  if (!start || !goal) return null;
  // Squares are written one after another, a column and then a row: [1, 0, 2, 2] is two of them.
  const squares = (value: unknown): [number, number][] | null => {
    const flat: unknown[] = Array.isArray(value) ? value : [];
    if (flat.length % 2 !== 0) return null;
    const found: [number, number][] = [];
    for (let at = 0; at < flat.length; at += 2) {
      const square = pairOf([flat[at], flat[at + 1]]);
      if (!square) return null;
      found.push(square);
    }
    return found;
  };
  const rocks = squares(of.rocks);
  const water = squares(of.water);
  const bridges = squares(of.bridges);
  if (!rocks || !water || !bridges) return null;
  const game = GAMES.find((each) => each === of.game) ?? null;
  return { game, columns, rows, start, facing, goal, rocks, water, bridges };
}

const same = (a: readonly [number, number], b: readonly [number, number]) =>
  a[0] === b[0] && a[1] === b[1];

/**
 * Which way a bridge lies: across the screen, or up and down it. A bridge joins the two banks of a river, so it
 * lies across the way the water runs: with water (or another bridge) above or below it, the river runs up and down
 * the screen and the bridge lies across. With no water beside it at all, it lies the way there is ground to
 * reach it from.
 */
export function bridgeLies(
  journey: {
    columns: number;
    rows: number;
    rocks: readonly (readonly [number, number])[];
    water: readonly (readonly [number, number])[];
    bridges: readonly (readonly [number, number])[];
  },
  bridge: readonly [number, number],
): 'across' | 'down' {
  const wet = (column: number, row: number) =>
    [...journey.water, ...journey.bridges].some((square) => same(square, [column, row]));
  const [column, row] = bridge;
  if (wet(column, row - 1) || wet(column, row + 1)) return 'across';
  if (wet(column - 1, row) || wet(column + 1, row)) return 'down';
  const ground = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < journey.columns &&
    y < journey.rows &&
    !journey.rocks.some((rock) => same(rock, [x, y]));
  return ground(column - 1, row) || ground(column + 1, row) ? 'across' : 'down';
}

/**
 * How the bridges stand in the run that is shown for a program. One that works however they stand is shown the
 * way its journey says (`whenRight`): up, to see the robot wait, or down, to see that the same step is then passed
 * over. One that does not work is shown the run it fails in, which is the one with every bridge up.
 */
export function standingFor(task: ProgramTask, program: Program): boolean[] {
  const up = allRaised(task);
  if (runProgram(task, program, up).outcome !== 'arrived') return up;
  return up.map((_, bridge) => task.whenRight?.[bridge] !== 'down');
}

/**
 * A run as frames. With no program at all, the robot only stands where it starts. `raised` says which bridges are
 * up when the run begins; where nothing is said they all are, which is the run a program is judged by.
 */
export function framesOf(
  task: ProgramTask,
  program: Program | null,
  raised: readonly boolean[] = allRaised(task),
): Showing {
  let up = allRaised(task).map((_, bridge) => raised[bridge] !== false);
  const start: Frame = {
    at: [task.start.at[0], task.start.at[1]],
    facing: task.start.facing,
    turned: 0,
    step: null,
    bumped: false,
    raised: up,
    waiting: false,
  };
  if (!program) return { frames: [start], outcome: 'stopped-short' };
  const run = runProgram(task, program, up);
  const frames = [start];
  let turned = 0;
  for (const move of run.moves) {
    if (move.command === 'left') turned -= 1;
    else if (move.command === 'right') turned += 1;
    const step = { index: move.index, round: move.round, command: move.command };
    const at: [number, number] = [move.pose.at[0], move.pose.at[1]];
    // Waiting for a bridge that is up: first the robot waiting, with the bridge still up; then the bridge down.
    if (move.lowered !== undefined) {
      frames.push({
        at,
        facing: move.pose.facing,
        turned,
        step,
        bumped: false,
        raised: up,
        waiting: true,
      });
    }
    up = move.raised;
    frames.push({
      at,
      facing: move.pose.facing,
      turned,
      step,
      bumped: !move.moved,
      raised: up,
      waiting: false,
    });
  }
  return { frames, outcome: run.outcome };
}

/**
 * The runs there are to show of a journey, whoever shows them: the answer's (with every bridge up, where there are
 * bridges, which is the run it is judged by), the answer's again with every bridge down, and the run of the row
 * that is given to be mended.
 */
export interface Runs {
  answer: Program | null;
  way: Showing;
  /** `null` where there is no bridge. */
  down: Showing | null;
  /** `null` where nothing is given to mend. */
  fault: Showing | null;
}

export function runsOf(task: ProgramTask): Runs {
  const answer = parseProgram(task.solution);
  return {
    answer,
    way: framesOf(task, answer),
    down:
      task.bridges === undefined
        ? null
        : framesOf(
            task,
            answer,
            task.bridges.map(() => false),
          ),
    fault: task.given === undefined ? null : framesOf(task, parseProgram(task.given)),
  };
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

/** Whether every place of the row is used. */
export function isFull(tray: Tray): boolean {
  return !tray.slots.includes(null);
}

/**
 * The last step that can be taken out of a row that is changed from its end: the last place that is filled and
 * was not put there by help (`fixed` places, from the start, are help's). `-1` where there is none.
 */
export function lastOpen(tray: Tray, fixed: number): number {
  for (let place = tray.slots.length - 1; place >= fixed; place--) {
    if (tray.slots[place] !== null) return place;
  }
  return -1;
}

/** The row with that last step taken out. `null` where there is none to take. */
export function undone(tray: Tray, fixed: number): Tray | null {
  const place = lastOpen(tray, fixed);
  return place < 0 ? null : taken(tray, place);
}

/**
 * Where a run that was part-way along stands once the row has been changed. Whatever the two rows begin alike
 * with has been carried out already and is not undone: a step put on the end leaves the robot where it is, and a
 * step taken off the end brings it back only if it had carried that step out. `at` is the frame it had reached,
 * `frames` the changed row's run.
 */
export function carriedOver(
  at: number,
  before: readonly Command[],
  after: readonly Command[],
  frames: readonly Frame[],
): number {
  let alike = 0;
  while (alike < before.length && alike < after.length && before[alike] === after[alike]) {
    alike += 1;
  }
  // The last frame that only steps the two rows share led to.
  let reached = 0;
  for (const [index, frame] of frames.entries()) {
    if (frame.step !== null && (frame.step.round > 0 || frame.step.index >= alike)) break;
    reached = index;
  }
  return Math.min(at, reached);
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
