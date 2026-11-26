import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { shortestWays } from '@/content/robot-ridge/ways';
import { runProgram, solveProgram, type Command, type Facing, type ProgramTask } from '@/engine';

/**
 * The ways to the star, found by walking the ground (src/content/robot-ridge/ways.ts). It is the second opinion on
 * how long every journey is, and what lets a long journey be drawn from a seed; so it is held to the first opinion,
 * the engine's own trying of every program, on grounds of every shape.
 */

const ALL: Command[] = ['forward', 'left', 'right'];
const WITH_WAIT: Command[] = [...ALL, 'wait'];

/** Two squares by two: from the bottom left, facing up, to the top right. */
const corner: ProgramTask = {
  type: 'program',
  grid: { columns: 2, rows: 2 },
  start: { at: [0, 1], facing: 'north' },
  goal: [1, 0],
  rocks: [],
  commands: ALL,
  slots: 3,
  repeats: 1,
  live: false,
  solution: 'f-r-f',
};

/** A river down the screen, a bridge over it, the robot one square from the bridge and facing it. */
const river: ProgramTask = {
  ...corner,
  grid: { columns: 4, rows: 3 },
  start: { at: [0, 1], facing: 'east' },
  goal: [3, 1],
  water: [
    [2, 0],
    [2, 2],
  ],
  bridges: [[2, 1]],
  whenRight: ['up'],
  commands: WITH_WAIT,
  slots: 4,
  solution: 'f-w-f-f',
};

/** Every program of exactly `length` commands that arrives, by trying them all. */
function arriving(task: ProgramTask, length: number): Command[][] {
  const found: Command[][] = [];
  const each = (commands: Command[]) => {
    if (commands.length === length) {
      if (runProgram(task, { times: 1, commands }).outcome === 'arrived') found.push(commands);
      return;
    }
    for (const command of task.commands) each([...commands, command]);
  };
  each([]);
  return found;
}

describe('the ways to the star, found by walking the ground', () => {
  it('finds the shortest way, says how many are as short, and gives one of them', () => {
    expect(shortestWays(corner)).toEqual({
      steps: 3,
      count: 1,
      one: ['forward', 'right', 'forward'],
    });
  });

  it('counts both ways round a rock that is straight ahead', () => {
    const round: ProgramTask = {
      ...corner,
      grid: { columns: 3, rows: 3 },
      start: { at: [1, 2], facing: 'north' },
      goal: [1, 0],
      rocks: [[1, 1]],
      slots: 7,
      solution: 'l-f-r-f-f-r-f',
    };
    const ways = shortestWays(round);
    expect(ways).toMatchObject({ steps: 7, count: 2 });
    expect(arriving(round, 7)).toHaveLength(2);
    // The one it gives is one of the two, and it arrives.
    expect(runProgram(round, { times: 1, commands: ways?.one ?? [] }).outcome).toBe('arrived');
  });

  it('finds none where there is none, and none where the only way is longer than it may look', () => {
    const walled: ProgramTask = {
      ...corner,
      rocks: [
        [0, 0],
        [1, 1],
      ],
    };
    expect(shortestWays(walled)).toBeNull();
    expect(shortestWays(corner, 2)).toBeNull();
    expect(shortestWays(corner, 3)?.steps).toBe(3);
  });

  it('knows that a bridge is up, and has to be waited for', () => {
    expect(shortestWays(river)).toEqual({
      steps: 4,
      count: 1,
      one: ['forward', 'wait', 'forward', 'forward'],
    });
    // With no way to wait there is no way over.
    expect(shortestWays({ ...river, commands: ALL })).toBeNull();
    // And the water is no way either: with the bridge gone it would have to be swum.
    expect(
      shortestWays({ ...river, bridges: undefined, water: [...(river.water ?? []), [2, 1]] }),
    ).toBeNull();
  });

  it('agrees with trying every program, on any ground: how long, how many, and that its own way arrives', () => {
    const squares = (columns: number, rows: number) =>
      Array.from({ length: columns * rows }, (_, at): [number, number] => [
        at % columns,
        Math.floor(at / columns),
      ]);
    const grounds = fc
      .record({
        columns: fc.integer({ min: 2, max: 4 }),
        rows: fc.integer({ min: 1, max: 3 }),
        facing: fc.constantFrom<Facing>('north', 'east', 'south', 'west'),
        rocks: fc.integer({ min: 0, max: 3 }),
        water: fc.integer({ min: 0, max: 2 }),
        bridges: fc.integer({ min: 0, max: 2 }),
        order: fc.array(fc.nat(1000), { minLength: 12, maxLength: 12 }),
      })
      .map(({ columns, rows, facing, rocks, water, bridges, order }): ProgramTask => {
        // The squares in an order of their own: the robot, the star, and then whatever else there is room for.
        const mixed = squares(columns, rows)
          .map((square, at): [number, [number, number]] => [order[at] ?? 0, square])
          .sort((a, b) => a[0] - b[0])
          .map(([, square]) => square);
        const [start, goal, ...rest] = mixed;
        if (!start || !goal) throw new Error('A ground of one square.');
        const bridged = rest.slice(rocks + water, rocks + water + bridges);
        return {
          type: 'program',
          grid: { columns, rows },
          start: { at: start, facing },
          goal,
          rocks: rest.slice(0, rocks),
          ...(water > 0 && rest.length > rocks ? { water: rest.slice(rocks, rocks + water) } : {}),
          ...(bridged.length > 0
            ? { bridges: bridged, whenRight: bridged.map(() => 'up' as const), commands: WITH_WAIT }
            : { commands: ALL }),
          slots: 6,
          repeats: 1,
          live: false,
          solution: 'f',
        };
      });
    let found = 0;
    let bridged = 0;
    fc.assert(
      fc.property(grounds, (task) => {
        const tried = solveProgram(task);
        const walked = shortestWays(task, task.slots);
        expect(walked?.steps ?? null).toBe(tried?.commands.length ?? null);
        if (!walked) return;
        found += 1;
        if (walked.one.includes('wait')) bridged += 1;
        expect(runProgram(task, { times: 1, commands: walked.one }).outcome).toBe('arrived');
        expect(walked.count).toBe(arriving(task, walked.steps).length);
      }),
      { numRuns: 300 },
    );
    // Most grounds have a way, and some of the ways are over a bridge: the agreement is not for want of cases.
    expect(found).toBeGreaterThan(100);
    expect(bridged).toBeGreaterThan(5);
  });
});
