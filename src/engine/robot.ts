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
 *
 * The robot stops as soon as it stands on the square it was going to: that is arriving, and whatever is left of the
 * program is not needed. It also stops if it is told to drive into a rock or off the grid: it stays where it is,
 * and the run is over. That is not a punishment; it is what shows which step to change.
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
  /** False when the robot could not move: a rock, or the edge. */
  moved: boolean;
}

export type RunOutcome =
  /** It stands on the square it was going to. */
  | 'arrived'
  /** The program ended somewhere else. */
  | 'stopped-short'
  /** It was told to drive into a rock. */
  | 'hit-a-rock'
  /** It was told to drive off the grid. */
  | 'left-the-grid';

export interface Run {
  moves: Move[];
  outcome: RunOutcome;
  /** Where it ended up. */
  pose: Pose;
}

const LETTERS: Record<string, Command> = { f: 'forward', l: 'left', r: 'right' };
const ORDER: readonly Facing[] = ['north', 'east', 'south', 'west'];
const STEP: Record<Facing, [number, number]> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
};

/** Read a program from the way it is written down ("x3-f-l-f"). `null` if it is not one. */
export function parseProgram(text: string): Program | null {
  if (!/^(?:x[2-4]-)?[flr](?:-[flr])*$/.test(text)) return null;
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

/** Carry a program out on a task's grid, from its start. */
export function runProgram(task: ProgramTask, program: Program): Run {
  const blocked = new Set(task.rocks.map(([column, row]) => `${String(column)},${String(row)}`));
  let pose: Pose = { at: [task.start.at[0], task.start.at[1]], facing: task.start.facing };
  const moves: Move[] = [];
  const there = () => pose.at[0] === task.goal[0] && pose.at[1] === task.goal[1];

  for (let round = 0; round < program.times; round++) {
    for (const [index, command] of program.commands.entries()) {
      if (command !== 'forward') {
        pose = { at: pose.at, facing: turn(pose.facing, command) };
        moves.push({ index, round, command, pose, moved: true });
        continue;
      }
      const [dx, dy] = STEP[pose.facing];
      const next: [number, number] = [pose.at[0] + dx, pose.at[1] + dy];
      const outside =
        next[0] < 0 || next[1] < 0 || next[0] >= task.grid.columns || next[1] >= task.grid.rows;
      if (outside || blocked.has(`${String(next[0])},${String(next[1])}`)) {
        moves.push({ index, round, command, pose, moved: false });
        return { moves, outcome: outside ? 'left-the-grid' : 'hit-a-rock', pose };
      }
      pose = { at: next, facing: pose.facing };
      moves.push({ index, round, command, pose, moved: true });
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
 * `repeats` above 1, programs done over are tried too, and the fewest commands wins. `null` if nothing gets there.
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
