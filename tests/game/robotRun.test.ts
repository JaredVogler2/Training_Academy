import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseProgram, type Command, type ProgramTask } from '@/engine';
import {
  bridgeLies,
  carriedOver,
  degreesFacing,
  degreesOf,
  emptyTray,
  fixedBy,
  framesOf,
  isFull,
  journeyOf,
  lastOpen,
  liveStep,
  modeOf,
  oneMoreTime,
  placed,
  programOf,
  runsOf,
  standingFor,
  taken,
  trailOf,
  trayOf,
  undone,
  withFixed,
  type Tray,
} from '@/game/worlds/robot-ridge/run';

const ALL: Command[] = ['forward', 'left', 'right'];
const WITH_WAIT: Command[] = [...ALL, 'wait'];

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

/**
 * A river down the screen with a bridge over it. The robot is on the left bank,     . . ~ .
 * facing the bridge, one square from it; the star is on the far bank.               R . = *
 * Forward, wait for the bridge, forward, forward.                                   . . ~ .
 */
const river: ProgramTask = {
  type: 'program',
  grid: { columns: 4, rows: 3 },
  start: { at: [0, 1], facing: 'east' },
  goal: [3, 1],
  rocks: [],
  water: [
    [2, 0],
    [2, 2],
  ],
  bridges: [[2, 1]],
  whenRight: ['down'],
  commands: WITH_WAIT,
  slots: 4,
  repeats: 1,
  live: false,
  solution: 'f-w-f-f',
};

const run = (task: ProgramTask, text: string) => framesOf(task, parseProgram(text));
const commandsOf = (text: string) => parseProgram(text)?.commands ?? [];

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

describe('a run over a bridge', () => {
  it('waits in front of a bridge that is up, in two moments: the robot waiting, then the bridge down', () => {
    const { frames, outcome } = run(river, 'f-w-f-f');
    expect(outcome).toBe('arrived');
    // One frame more than there are commands: waiting for something is two.
    expect(frames).toHaveLength(6);
    expect(frames.map((frame) => frame.waiting)).toEqual([false, false, true, false, false, false]);
    expect(frames.map((frame) => frame.raised)).toEqual([
      [true],
      [true],
      [true],
      [false],
      [false],
      [false],
    ]);
    // Both moments belong to the one step, and the robot stands where it was in both.
    for (const moment of [frames[2], frames[3]]) {
      expect(moment?.step).toEqual({ index: 1, round: 0, command: 'wait' });
      expect(moment?.at).toEqual([1, 1]);
    }
    expect(frames.every((frame) => !frame.bumped)).toBe(true);
  });

  it('passes over the same step when the bridge is down: one moment, and nothing in it changes', () => {
    const { frames, outcome } = framesOf(river, parseProgram('f-w-f-f'), [false]);
    expect(outcome).toBe('arrived');
    expect(frames).toHaveLength(5);
    expect(frames.some((frame) => frame.waiting)).toBe(false);
    expect(frames.every((frame) => frame.raised[0] === false)).toBe(true);
    expect(frames[2]).toMatchObject({
      at: [1, 1],
      step: { index: 1, command: 'wait' },
      bumped: false,
    });
  });

  it('is stopped by a bridge that is up, and by water, without moving', () => {
    const noWait = run(river, 'f-f-f');
    expect(noWait.outcome).toBe('bridge-up');
    expect(noWait.frames).toHaveLength(3);
    expect(noWait.frames.at(-1)).toMatchObject({ at: [1, 1], bumped: true, raised: [true] });
    // Up the bank and into the river.
    const swim = run(river, 'f-l-f-r-f');
    expect(swim.outcome).toBe('reached-water');
    expect(swim.frames.at(-1)).toMatchObject({ at: [1, 0], facing: 'east', bumped: true });
  });

  it('waits for nothing where no bridge is ahead: the step is carried out and nothing changes', () => {
    // The wait comes a square too soon; the bridge is still up when the robot gets to it.
    const { frames, outcome } = run(river, 'w-f-f-f');
    expect(outcome).toBe('bridge-up');
    expect(frames[1]).toMatchObject({ at: [0, 1], waiting: false, bumped: false, raised: [true] });
    expect(frames.some((frame) => frame.waiting)).toBe(false);
  });

  it('is the run a program is judged by when nothing is said of the bridges: every one up', () => {
    expect(run(river, 'f-w-f-f')).toEqual(framesOf(river, parseProgram('f-w-f-f'), [true]));
  });

  it('says nothing of bridges where there are none', () => {
    const { frames } = run(corner, 'f-r-f');
    expect(frames.every((frame) => frame.raised.length === 0 && !frame.waiting)).toBe(true);
  });
});

describe('how the bridges stand in the run that is shown', () => {
  it('is every bridge up for a program that does not work: that is the run it fails in', () => {
    for (const whenRight of [['up'], ['down']] as const) {
      expect(standingFor({ ...river, whenRight: [...whenRight] }, parseProgram('f-f-f')!)).toEqual([
        true,
      ]);
    }
  });

  it('is as the journey says for one that works: up to see the wait, down to see it passed over', () => {
    const works = parseProgram('f-w-f-f')!;
    expect(standingFor({ ...river, whenRight: ['up'] }, works)).toEqual([true]);
    expect(standingFor({ ...river, whenRight: ['down'] }, works)).toEqual([false]);
  });

  it('is nothing at all where there is no bridge', () => {
    expect(standingFor(corner, parseProgram('f-r-f')!)).toEqual([]);
  });
});

describe('the runs there are to show of a journey', () => {
  it('are the answer’s, the answer’s again with every bridge down, and the faulty row’s', () => {
    const over = runsOf(river);
    expect(over.answer).toEqual(parseProgram('f-w-f-f'));
    expect(over.way).toEqual(run(river, 'f-w-f-f'));
    expect(over.down).toEqual(framesOf(river, parseProgram('f-w-f-f'), [false]));
    expect(over.fault).toBeNull();
    // A row to mend: forward, a wrong turn, and off the side of the grid.
    const mend = runsOf({ ...corner, given: 'f-l-f' });
    expect(mend.down).toBeNull();
    expect(mend.fault?.outcome).toBe('left-the-grid');
    expect(mend.way.outcome).toBe('arrived');
  });
});

describe('which way a bridge lies', () => {
  const ground = { columns: 4, rows: 3, rocks: [], water: [], bridges: [] };

  it('across, where the river runs up and down the screen', () => {
    expect(
      bridgeLies(
        {
          ...ground,
          water: [
            [2, 0],
            [2, 2],
          ],
          bridges: [[2, 1]],
        },
        [2, 1],
      ),
    ).toBe('across');
    // Another bridge is over water too.
    expect(
      bridgeLies(
        {
          ...ground,
          bridges: [
            [2, 0],
            [2, 1],
          ],
        },
        [2, 1],
      ),
    ).toBe('across');
  });

  it('down, where the river runs across it', () => {
    expect(
      bridgeLies(
        {
          ...ground,
          water: [
            [0, 1],
            [2, 1],
            [3, 1],
          ],
          bridges: [[1, 1]],
        },
        [1, 1],
      ),
    ).toBe('down');
  });

  it('the way there is ground to reach it from, where no water is beside it', () => {
    // One row: there is ground to the left and to the right.
    expect(bridgeLies({ ...ground, rows: 1, bridges: [[2, 0]] }, [2, 0])).toBe('across');
    // One column: the only ground is above and below.
    expect(bridgeLies({ ...ground, columns: 1, bridges: [[0, 1]] }, [0, 1])).toBe('down');
    // A rock at each side: it can only be reached from above and below.
    expect(
      bridgeLies(
        {
          ...ground,
          rocks: [
            [0, 1],
            [2, 1],
          ],
          bridges: [[1, 1]],
        },
        [1, 1],
      ),
    ).toBe('down');
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

describe('a row that is changed from its end', () => {
  const row = (text: string, size = 6) => trayOf(text, size);

  it('is full when every place is used', () => {
    expect(isFull(row('f-f-r', 3))).toBe(true);
    expect(isFull(row('f-f', 3))).toBe(false);
    expect(isFull(taken(row('f-f-r', 3), 1))).toBe(false);
    expect(isFull(emptyTray(2))).toBe(false);
  });

  it('gives up its last step, and never one that help put there', () => {
    expect(lastOpen(row('f-r-f'), 0)).toBe(2);
    expect(undone(row('f-r-f'), 0)).toEqual(row('f-r'));
    // The first two places are help's: the third can go, and then there is nothing to take.
    expect(lastOpen(row('f-r-f'), 2)).toBe(2);
    expect(undone(row('f-r-f'), 2)).toEqual(row('f-r'));
    expect(lastOpen(row('f-r'), 2)).toBe(-1);
    expect(undone(row('f-r'), 2)).toBeNull();
    expect(undone(emptyTray(4), 0)).toBeNull();
  });

  it('passes over an empty place to find its last step', () => {
    // A gap in the middle (the answer being shown leaves them): the last step is still the last.
    const holed = taken(row('f-r-f-f', 4), 1);
    expect(lastOpen(holed, 0)).toBe(3);
    expect(undone(holed, 0)?.slots).toEqual(['forward', null, 'forward', null]);
  });

  it('takes steps off one at a time until none is left, whatever the row', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom<Command | null>(...ALL, null), { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 10 }),
        (slots, fixed) => {
          let tray: Tray | null = { slots, times: 1 };
          const open = slots.filter((slot, place) => slot !== null && place >= fixed).length;
          let taken = 0;
          for (;;) {
            const next: Tray | null = undone(tray, fixed);
            if (!next) break;
            // One step fewer each time, and nothing that help put there is touched.
            expect(next.slots.slice(0, fixed)).toEqual(tray.slots.slice(0, fixed));
            expect(next.slots.filter((slot) => slot !== null)).toHaveLength(
              tray.slots.filter((slot) => slot !== null).length - 1,
            );
            tray = next;
            taken += 1;
            if (taken > slots.length) throw new Error('It never stopped.');
          }
          expect(taken).toBe(open);
        },
      ),
    );
  });
});

describe('where the robot stands when its row is changed part-way through a run', () => {
  /** Five across and two down, and far enough to go that nothing here arrives by accident. */
  const far: ProgramTask = {
    ...corner,
    grid: { columns: 5, rows: 2 },
    start: { at: [0, 0], facing: 'east' },
    goal: [4, 1],
    slots: 6,
    solution: 'f-f-f-f-r-f',
  };
  const stands = (task: ProgramTask, at: number, before: string, after: string) =>
    carriedOver(at, commandsOf(before), commandsOf(after), run(task, after).frames);

  it('stays where it is when a step is put on the end', () => {
    expect(stands(far, 2, 'f-f', 'f-f-f')).toBe(2);
    expect(stands(far, 1, 'f-f', 'f-f-f')).toBe(1);
    expect(stands(far, 0, 'f-f', 'f-f-f')).toBe(0);
  });

  it('comes back for a step taken off the end only if it had carried that step out', () => {
    expect(stands(far, 3, 'f-f-f', 'f-f')).toBe(2);
    expect(stands(far, 2, 'f-f-f', 'f-f')).toBe(2);
    expect(stands(far, 1, 'f-f-f', 'f-f')).toBe(1);
  });

  it('goes back to where the two rows part, when a step in the middle is another now', () => {
    expect(stands(far, 4, 'f-f-f-f', 'f-r-f-f')).toBe(1);
    expect(stands(far, 4, 'f-f-f-f', 'l-f-f-f')).toBe(0);
  });

  it('counts both moments of a wait as the one step they are', () => {
    // Waiting for the bridge is two frames; a step put on after it leaves the robot at the second of them.
    expect(stands(river, 3, 'f-w', 'f-w-f')).toBe(3);
    // And taking the step after it off again brings the robot back to the bridge, down.
    expect(stands(river, 4, 'f-w-f', 'f-w')).toBe(3);
    // Taking the wait itself off brings it back to before it waited.
    expect(stands(river, 3, 'f-w', 'f')).toBe(1);
  });

  it('is always a moment the two runs share, and never further on than the robot was', () => {
    const rows = fc.array(fc.constantFrom(...ALL), { minLength: 1, maxLength: 6 });
    fc.assert(
      fc.property(rows, rows, fc.nat(6), (before, after, at) => {
        const text = (row: Command[]) => row.map((command) => command.charAt(0)).join('-');
        const was = run(far, text(before)).frames;
        const now = run(far, text(after)).frames;
        const from = Math.min(at, was.length - 1);
        const stood = carriedOver(from, before, after, now);
        expect(stood).toBeLessThanOrEqual(from);
        expect(stood).toBeLessThan(now.length);
        // Everything up to there is the same in both runs: the robot is where it was at that moment.
        expect(now.slice(0, stood + 1)).toEqual(was.slice(0, stood + 1));
        // And it has not come back further than it must: a row that only grew leaves it where it was.
        if (after.length >= before.length && before.every((step, place) => after[place] === step)) {
          expect(stood).toBe(from);
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
      water: [],
      bridges: [],
    });
    expect(journeyOf({ ...picture, rocks: [] })?.rocks).toEqual([]);
    expect(journeyOf({ ...picture, game: 'juggling' })?.game).toBeNull();
  });

  it('is read with its river and its bridges, where it has them', () => {
    const over = journeyOf({
      ...picture,
      game: 'bridge',
      rocks: [],
      water: [1, 0],
      bridges: [1, 1],
    });
    expect(over).toMatchObject({ game: 'bridge', rocks: [], water: [[1, 0]], bridges: [[1, 1]] });
    // Every game there is has a name a picture may say.
    for (const game of ['live', 'plan', 'again', 'mend', 'long', 'bridge']) {
      expect(journeyOf({ ...picture, game })?.game).toBe(game);
    }
  });

  it.each([
    ['no way to face', { ...picture, facing: 'up' }],
    ['a start that is not a square', { ...picture, start: [0] }],
    ['a star that is not a square', { ...picture, goal: 'far' }],
    ['half a rock', { ...picture, rocks: [1, 1, 2] }],
    ['a rock that is not on any square', { ...picture, rocks: [1, 'one'] }],
    ['half a square of water', { ...picture, water: [1] }],
    ['a bridge that is not on any square', { ...picture, bridges: ['over', 'there'] }],
    ['no size', { ...picture, columns: 'three' }],
  ])('is refused when it has %s', (_what, broken) => {
    expect(journeyOf(broken)).toBeNull();
  });
});
