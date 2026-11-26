import type { Command, Facing, ProgramTask } from './schema';

/**
 * A robot on a grid, and the programs it is given. Pure and deterministic: the same program on the same grid always
 * does the same thing, which is what lets a child find the step that went wrong.
 *
 * A program is a list of commands, done in order, and optionally done over a number of times:
 *
 *   forward   one square the way the robot is facing
 *   left      a quarter turn to the left, where it stands
 *   right     a quarter turn to the right
 *   wait      if a bridge is up in front of it, wait there until the bridge has come down; otherwise nothing
 *
 * The robot stops as soon as it stands on the square it was going to: that is arriving, and whatever is left of the
 * program is not needed. It also stops if it is told to drive into a rock, into water, onto a bridge that is up, or
 * off the grid: it stays where it is, and the run is over. That is not a punishment; it is what shows which step
 * to change.
 *
 * A bridge is up or down when a run begins. `wait` is the one command that depends on what the robot finds: the
 * same step waits when the bridge is up and passes on when it is down. A program that arrives with every bridge
 * up arrives however they stand (a test holds that), so that is the run a program is judged by.
 */

export interface Program {
  /** How many times the commands are done. */
  times: number;
  commands: Command[];
}

export interface Pose {
  at: [number, number];
  facing: Facing;
}

/** One command carried out (or not). */
export interface Move {
  /** Which command of the program this was, counted from nought. */
  index: number;
  /** Which time round, counted from nought. */
  round: number;
  command: Command;
  /** Where the robot is afterwards. */
  pose: Pose;
  /** False when the robot could not move: a rock, water, a bridge that is up, or the edge. */
  moved: boolean;
  /** For a wait that had something to wait for: which of the task's bridges came down. */
  lowered?: number;
  /** Which bridges are up once this command has been carried out, one for each of the task's bridges. */
  raised: boolean[];
}

export type RunOutcome =
  /** It stands on the square it was going to. */
  | 'arrived'
  /** The program ended somewhere else. */
  | 'stopped-short'
  /** It was told to drive into a rock. */
  | 'hit-a-rock'
  /** It was told to drive off the grid. */
  | 'left-the-grid'
  /** It was told to drive into water. */
  | 'reached-water'
  /** It was told to drive onto a bridge that was up. */
  | 'bridge-up';

export interface Run {
  moves: Move[];
  outcome: RunOutcome;
  /** Where it ended up. */
  pose: Pose;
}

const LETTERS: Record<string, Command> = { f: 'forward', l: 'left', r: 'right', w: 'wait' };
const ORDER: readonly Facing[] = ['north', 'east', 'south', 'west'];
const STEP: Record<Facing, [number, number]> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
};

/** Read a program from the way it is written down ("x3-f-l-f"). `null` if it is not one. */
export function parseProgram(text: string): Program | null {
  if (!/^(?:x[2-4]-)?[flrw](?:-[flrw])*$/.test(text)) return null;
  const tokens = text.split('-');
  const first = tokens[0] ?? '';
  const times = first.startsWith('x') ? Number(first.slice(1)) : 1;
  const letters = first.startsWith('x') ? tokens.slice(1) : tokens;
  return { times, commands: letters.map((letter) => LETTERS[letter] as Command) };
}

export function writeProgram(program: Program): string {
  const letters = program.commands.map((command) => command.charAt(0));
  return [...(program.times > 1 ? [`x${String(program.times)}`] : []), ...letters].join('-');
}

function turn(facing: Facing, command: 'left' | 'right'): Facing {
  const at = ORDER.indexOf(facing) + (command === 'right' ? 1 : 3);
  return ORDER[at % 4] as Facing;
}

const keyOf = ([column, row]: readonly [number, number]) => `${String(column)},${String(row)}`;

/** Every bridge of a task up: the run a program is judged by. */
export function allRaised(task: ProgramTask): boolean[] {
  return (task.bridges ?? []).map(() => true);
}

/**
 * Carry a program out on a task's grid, from its start. `raised` says which of the task's bridges are up when the
 * run begins, one for each; where nothing is said they all are.
 */
export function runProgram(
  task: ProgramTask,
  program: Program,
  raised: readonly boolean[] = allRaised(task),
): Run {
  const rocks = new Set(task.rocks.map(keyOf));
  const water = new Set((task.water ?? []).map(keyOf));
  const bridges = (task.bridges ?? []).map(keyOf);
  let up = bridges.map((_, index) => raised[index] !== false);
  let pose: Pose = { at: [task.start.at[0], task.start.at[1]], facing: task.start.facing };
  const moves: Move[] = [];
  const there = () => pose.at[0] === task.goal[0] && pose.at[1] === task.goal[1];
  const ahead = (): [number, number] => {
    const [dx, dy] = STEP[pose.facing];
    return [pose.at[0] + dx, pose.at[1] + dy];
  };

  for (let round = 0; round < program.times; round++) {
    for (const [index, command] of program.commands.entries()) {
      if (command === 'left' || command === 'right') {
        pose = { at: pose.at, facing: turn(pose.facing, command) };
        moves.push({ index, round, command, pose, moved: true, raised: up });
        continue;
      }
      const next = ahead();
      const bridge = bridges.indexOf(keyOf(next));
      if (command === 'wait') {
        // Something to wait for only when a bridge is up right in front of the robot: then it comes down.
        if (bridge >= 0 && up[bridge] === true) {
          up = up.map((state, at) => (at === bridge ? false : state));
          moves.push({ index, round, command, pose, moved: true, lowered: bridge, raised: up });
        } else {
          moves.push({ index, round, command, pose, moved: true, raised: up });
        }
        continue;
      }
      const outside =
        next[0] < 0 || next[1] < 0 || next[0] >= task.grid.columns || next[1] >= task.grid.rows;
      const stopped: RunOutcome | null = outside
        ? 'left-the-grid'
        : rocks.has(keyOf(next))
          ? 'hit-a-rock'
          : water.has(keyOf(next))
            ? 'reached-water'
            : bridge >= 0 && up[bridge] === true
              ? 'bridge-up'
              : null;
      if (stopped) {
        moves.push({ index, round, command, pose, moved: false, raised: up });
        return { moves, outcome: stopped, pose };
      }
      pose = { at: next, facing: pose.facing };
      moves.push({ index, round, command, pose, moved: true, raised: up });
      if (there()) return { moves, outcome: 'arrived', pose };
    }
  }
  return { moves, outcome: there() ? 'arrived' : 'stopped-short', pose };
}

/** Whether a program is one this task lets a child build: its commands, no more of them than there are slots. */
export function fitsTask(task: ProgramTask, program: Program): boolean {
  return (
    program.commands.length <= task.slots &&
    program.times <= task.repeats &&
    program.commands.every((command) => task.commands.includes(command))
  );
}

/**
 * The shortest program that gets there, by trying every program in order of length: there are few enough. With
 * `repeats` above 1, programs done over are tried too, and the fewest commands wins. Where there are bridges, a
 * program gets there only if it does so with every bridge up. `null` if nothing gets there.
 */
export function solveProgram(task: ProgramTask): Program | null {
  for (let length = 1; length <= task.slots; length++) {
    const count = task.commands.length ** length;
    for (let times = 1; times <= task.repeats; times++) {
      for (let code = 0; code < count; code++) {
        const commands: Command[] = [];
        let rest = code;
        for (let place = 0; place < length; place++) {
          commands.push(task.commands[rest % task.commands.length] as Command);
          rest = Math.floor(rest / task.commands.length);
        }
        const program = { times, commands };
        if (runProgram(task, program).outcome === 'arrived') return program;
      }
    }
  }
  return null;
}
