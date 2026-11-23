import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseProgram, type Command, type ProgramTask } from '@/engine';
import {
  degreesFacing,
  degreesOf,
  emptyTray,
  fixedBy,
  framesOf,
  journeyOf,
  liveStep,
  modeOf,
  oneMoreTime,
  placed,
  programOf,
  taken,
  trailOf,
  trayOf,
  withFixed,
  type Tray,
} from '@/game/worlds/robot-ridge/run';

const ALL: Command[] = ['forward', 'left', 'right'];

/** Two squares by two: from the bottom left, facing up, to the top right. Forward, turn right, forward. */
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

/** Four in a line, with a rock in the third. */
const blocked: ProgramTask = {
  ...corner,
  grid: { columns: 4, rows: 1 },
  start: { at: [0, 0], facing: 'east' },
  goal: [3, 0],
  rocks: [[2, 0]],
  slots: 4,
  solution: 'f',
};

const run = (task: ProgramTask, text: string) => framesOf(task, parseProgram(text));

describe('a run, as frames to show', () => {
  it('starts where the robot starts, and has one frame for each command carried out', () => {
    const { frames, outcome } = run(corner, 'f-r-f');
    expect(outcome).toBe('arrived');
    expect(frames.map((frame) => frame.at)).toEqual([
      [0, 1],
      [0, 0],
      [0, 0],
      [1, 0],
    ]);
    expect(frames.map((frame) => frame.facing)).toEqual(['north', 'north', 'east', 'east']);
    expect(frames[0]?.step).toBeNull();
    expect(frames.slice(1).map((frame) => frame.step?.index)).toEqual([0, 1, 2]);
    expect(frames.every((frame) => !frame.bumped)).toBe(true);
  });

  it('is only the start when there is no program at all', () => {
    const { frames, outcome } = framesOf(corner, null);
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ at: [0, 1], facing: 'north', turned: 0, step: null });
    expect(outcome).toBe('stopped-short');
  });

  it('stops at the frame where the robot was stopped, without moving it', () => {
    const edge = run(corner, 'f-l-f');
    expect(edge.outcome).toBe('left-the-grid');
    expect(edge.frames).toHaveLength(4);
    expect(edge.frames.at(-1)).toMatchObject({ at: [0, 0], facing: 'west', bumped: true });
    expect(edge.frames.at(-1)?.step).toMatchObject({ index: 2, command: 'forward' });

    const rock = run(blocked, 'f-f-f-f');
    expect(rock.outcome).toBe('hit-a-rock');
    // The second forward is the one that could not be carried out; nothing after it is tried.
    expect(rock.frames.map((frame) => frame.bumped)).toEqual([false, false, true]);
    expect(rock.frames.at(-1)?.at).toEqual([1, 0]);
  });

  it('stops where it arrives: what is left of the program is not shown', () => {
    expect(run(corner, 'f-r-f').frames).toHaveLength(4);
    expect(run({ ...corner, slots: 5 }, 'f-r-f-f-f').frames).toHaveLength(4);
  });

  it('says which time round each frame belongs to when a program is done over', () => {
    const line: ProgramTask = {
      ...blocked,
      rocks: [],
      slots: 1,
      repeats: 4,
      solution: 'x3-f',
    };
    const { frames, outcome } = run(line, 'x3-f');
    expect(outcome).toBe('arrived');
    expect(frames.slice(1).map((frame) => frame.step)).toEqual([
      { index: 0, round: 0, command: 'forward' },
      { index: 0, round: 1, command: 'forward' },
      { index: 0, round: 2, command: 'forward' },
    ]);
  });

  it('is the same every time', () => {
    expect(run(corner, 'f-l-f')).toEqual(run(corner, 'f-l-f'));
  });
});

describe('which way the drawing is turned', () => {
  it('counts quarter turns, right turns up and left turns down, so a turn never goes the long way round', () => {
    const spin = { ...corner, slots: 8 };
    expect(run(spin, 'r-r-r-r').frames.map((frame) => frame.turned)).toEqual([0, 1, 2, 3, 4]);
    expect(run(spin, 'l-l').frames.map((frame) => frame.turned)).toEqual([0, -1, -2]);
    expect(run(spin, 'l-r-r').frames.map((frame) => frame.turned)).toEqual([0, -1, 0, 1]);
  });

  it('starts from the way the robot faces, and goes on past a full turn instead of jumping back', () => {
    expect(degreesFacing('north')).toBe(0);
    expect(degreesFacing('east')).toBe(90);
    expect(degreesFacing('south')).toBe(180);
    expect(degreesFacing('west')).toBe(270);

    const west = { ...corner, start: { at: [1, 1] as [number, number], facing: 'west' as const } };
    const frames = run(west, 'r-l-l').frames;
    // From west a right turn faces north: 360 degrees, not 0, so the drawing turns a quarter and not three.
    expect(frames.map((frame) => degreesOf(west, frame))).toEqual([270, 360, 270, 180]);
    expect(frames.map((frame) => frame.facing)).toEqual(['west', 'north', 'west', 'south']);
  });

  it('agrees with the way the engine says the robot faces, whatever the turns', () => {
    const turns = fc.array(fc.constantFrom('l', 'r'), { minLength: 1, maxLength: 8 });
    const facings = fc.constantFrom(
      'north' as const,
      'east' as const,
      'south' as const,
      'west' as const,
    );
    fc.assert(
      fc.property(turns, facings, (letters, facing) => {
        const task = { ...corner, start: { at: corner.start.at, facing }, slots: 8 };
        for (const frame of run(task, letters.join('-')).frames) {
          const degrees = ((degreesOf(task, frame) % 360) + 360) % 360;
          expect(degrees).toBe(degreesFacing(frame.facing));
        }
      }),
    );
  });
});

describe('the squares the robot has passed over', () => {
  it('are listed in the order it reached them, each once, up to the frame asked for', () => {
    const { frames } = run({ ...corner, slots: 6 }, 'f-r-f');
    expect(trailOf(frames, 0)).toEqual([[0, 1]]);
    expect(trailOf(frames, 2)).toEqual([
      [0, 1],
      [0, 0],
    ]);
    expect(trailOf(frames, 3)).toEqual([
      [0, 1],
      [0, 0],
      [1, 0],
    ]);
  });
});

describe('the row a program is built in', () => {
  const tray = (letters: string, size = 4): Tray => trayOf(letters, size);

  it('takes a step into the first empty place', () => {
    const one = placed(emptyTray(3), 'forward');
    expect(one?.slots).toEqual(['forward', null, null]);
    const two = placed(one!, 'left');
    expect(two?.slots).toEqual(['forward', 'left', null]);
  });

  it('leaves the place of a step taken out, and puts the next step put in there', () => {
    const gap = taken(tray('f-l-f', 3), 1);
    expect(gap.slots).toEqual(['forward', null, 'forward']);
    expect(placed(gap, 'right')?.slots).toEqual(['forward', 'right', 'forward']);
  });

  it('has no room when every place is filled', () => {
    expect(placed(tray('f-l-f', 3), 'forward')).toBeNull();
  });

  it('holds the program its steps make, with gaps passed over, and none while it is empty', () => {
    expect(programOf(emptyTray(3))).toBeNull();
    expect(programOf(taken(tray('f-l-f', 3), 1))).toEqual({
      times: 1,
      commands: ['forward', 'forward'],
    });
    expect(programOf(tray('x3-f-r'))).toEqual({ times: 3, commands: ['forward', 'right'] });
  });

  it('is laid out from the way a program is written down', () => {
    expect(tray('x3-f-l')).toEqual({ slots: ['forward', 'left', null, null], times: 3 });
    expect(tray('f')).toEqual({ slots: ['forward', null, null, null], times: 1 });
    expect(tray('not a program')).toEqual(emptyTray(4));
  });

  it('counts one more time round, and after the most there can be goes back to once', () => {
    const once = emptyTray(1);
    expect(oneMoreTime(once, 3).times).toBe(2);
    expect(oneMoreTime({ ...once, times: 3 }, 3).times).toBe(1);
    expect(oneMoreTime({ ...once, times: 4 }, 4).times).toBe(1);
  });

  it('is put back exactly as it was by taking out what was put in', () => {
    const before = taken(tray('f-l-f', 4), 0);
    const after = placed(before, 'right');
    expect(taken(after!, 0)).toEqual(before);
  });

  it('never loses or makes up a step, whatever is put in and taken out', () => {
    const moves = fc.array(
      fc.oneof(
        fc.record({ put: fc.constantFrom(...ALL) }),
        fc.record({ take: fc.integer({ min: 0, max: 4 }) }),
      ),
      { maxLength: 30 },
    );
    fc.assert(
      fc.property(moves, (list) => {
        let now = emptyTray(5);
        let held = 0;
        for (const move of list) {
          if ('put' in move) {
            const next = placed(now, move.put);
            if (next) {
              held += 1;
              now = next;
            } else {
              expect(held).toBe(5);
            }
          } else {
            if (now.slots[move.take] !== null) held -= 1;
            now = taken(now, move.take);
          }
          expect(now.slots).toHaveLength(5);
          expect(programOf(now)?.commands.length ?? 0).toBe(held);
        }
      }),
    );
  });
});

describe('what help puts in the row', () => {
  it('is the first steps of the answer, and how many times where the answer is done over', () => {
    expect(fixedBy([])).toEqual({ times: null, commands: [] });
    expect(fixedBy(['f', 'r'])).toEqual({ times: null, commands: ['forward', 'right'] });
    expect(fixedBy(['x3'])).toEqual({ times: 3, commands: [] });
    expect(fixedBy(['x3', 'f'])).toEqual({ times: 3, commands: ['forward'] });
  });

  it('is laid over whatever the child had there', () => {
    const mine = trayOf('l-l-f', 3);
    expect(withFixed(mine, ['f'])).toEqual({ slots: ['forward', 'left', 'forward'], times: 1 });
    expect(withFixed(mine, ['x2', 'f'])).toEqual({
      slots: ['forward', 'left', 'forward'],
      times: 2,
    });
    expect(withFixed(mine, [])).toEqual(mine);
  });
});

describe('one tap at a time', () => {
  const live: ProgramTask = { ...corner, live: true, slots: 5 };

  it('carries a command out and counts it', () => {
    expect(liveStep(live, [], 'forward')).toEqual({
      commands: ['forward'],
      bumped: false,
      arrived: false,
      spent: false,
    });
  });

  it('does not count a command the robot could not carry out, and says it was stopped', () => {
    // Facing up in the top row: forward is off the edge.
    expect(liveStep(live, ['forward'], 'forward')).toEqual({
      commands: ['forward'],
      bumped: true,
      arrived: false,
      spent: false,
    });
    // However many times it is tried, it never costs anything.
    expect(liveStep(live, ['forward', 'left'], 'forward').commands).toEqual(['forward', 'left']);
  });

  it('knows when the robot is on the star', () => {
    expect(liveStep(live, ['forward', 'right'], 'forward')).toMatchObject({
      arrived: true,
      spent: false,
    });
  });

  it('knows when the power has run out somewhere else', () => {
    const wandering: Command[] = ['left', 'left', 'left', 'left'];
    expect(liveStep(live, wandering, 'left')).toMatchObject({
      commands: [...wandering, 'left'],
      arrived: false,
      spent: true,
    });
    // Arriving on the last of the power is arriving.
    const tight = { ...live, slots: 3 };
    expect(liveStep(tight, ['forward', 'right'], 'forward')).toMatchObject({
      arrived: true,
      spent: false,
    });
  });

  it('never writes down a journey the engine would not accept', () => {
    const taps = fc.array(fc.constantFrom(...ALL), { maxLength: 20 });
    fc.assert(
      fc.property(taps, (list) => {
        let done: Command[] = [];
        for (const command of list) {
          const step = liveStep(live, done, command);
          done = step.commands;
          expect(done.length).toBeLessThanOrEqual(live.slots);
          // What is written down has no stopped step in it: run again, every command moves.
          if (done.length > 0) {
            expect(framesOf(live, { times: 1, commands: done }).frames.some((f) => f.bumped)).toBe(
              false,
            );
          }
          if (step.arrived || step.spent) break;
        }
      }),
    );
  });
});

describe('which game a journey is for', () => {
  it('is told from how it is set up', () => {
    expect(modeOf({ ...corner, live: true })).toBe('live');
    expect(modeOf(corner)).toBe('plan');
    expect(modeOf({ ...corner, repeats: 3 })).toBe('again');
    expect(modeOf({ ...corner, given: 'f-l-f' })).toBe('mend');
  });
});

describe('a picture of a journey', () => {
  const picture = {
    game: 'plan',
    columns: 3,
    rows: 2,
    start: [0, 1],
    facing: 'east',
    goal: [2, 0],
    rocks: [1, 1, 2, 1],
  };

  it('is read into the grid, the robot, the star and the rocks', () => {
    expect(journeyOf(picture)).toEqual({
      game: 'plan',
      columns: 3,
      rows: 2,
      start: [0, 1],
      facing: 'east',
      goal: [2, 0],
      rocks: [
        [1, 1],
        [2, 1],
      ],
    });
    expect(journeyOf({ ...picture, rocks: [] })?.rocks).toEqual([]);
    expect(journeyOf({ ...picture, game: 'juggling' })?.game).toBeNull();
  });

  it.each([
    ['no way to face', { ...picture, facing: 'up' }],
    ['a start that is not a square', { ...picture, start: [0] }],
    ['a star that is not a square', { ...picture, goal: 'far' }],
    ['half a rock', { ...picture, rocks: [1, 1, 2] }],
    ['a rock that is not on any square', { ...picture, rocks: [1, 'one'] }],
    ['no size', { ...picture, columns: 'three' }],
  ])('is refused when it has %s', (_what, broken) => {
    expect(journeyOf(broken)).toBeNull();
  });
});
