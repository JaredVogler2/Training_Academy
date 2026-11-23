import { describe as group, expect, it } from 'vitest';
import type { Stimulus } from '@/engine';
import { describe, robotText } from '@/game/worlds/robot-ridge/text';

/**
 * The words on Robot Ridge's board. A child needs none of them; a screen reader, and the grown-up alongside, have
 * nothing else to go on.
 */

group('a journey in words', () => {
  it('says the grid, where the robot starts and faces, and where the star is, counting from one', () => {
    expect(
      robotText.journey({
        columns: 3,
        rows: 2,
        start: [0, 1],
        facing: 'north',
        goal: [2, 0],
        rocks: [],
      }),
    ).toBe(
      'A grid 3 squares across and 2 down. The robot starts in column 1, row 2, facing up the screen. ' +
        'The star is in column 3, row 1.',
    );
  });

  it('says where the rocks are, one or several', () => {
    const journey = {
      columns: 3,
      rows: 3,
      start: [0, 0] as const,
      facing: 'east' as const,
      goal: [2, 2] as const,
    };
    expect(robotText.journey({ ...journey, rocks: [[1, 1]] })).toMatch(
      / There is a rock in column 2, row 2\.$/,
    );
    expect(
      robotText.journey({
        ...journey,
        rocks: [
          [1, 1],
          [2, 0],
        ],
      }),
    ).toMatch(/ There are rocks in column 2, row 2; column 3, row 1\.$/);
  });

  it('says which way the robot faces as a way on the screen, not as a point of the compass', () => {
    const facing = (way: 'north' | 'east' | 'south' | 'west') => robotText.robotNow([0, 0], way);
    expect(facing('north')).toBe('The robot is in column 1, row 1, facing up the screen.');
    expect(facing('east')).toMatch(/facing to the right\.$/);
    expect(facing('south')).toMatch(/facing down the screen\.$/);
    expect(facing('west')).toMatch(/facing to the left\.$/);
  });
});

group('what there is to press, by name', () => {
  it('names each arrow by what it does', () => {
    expect(robotText.command('forward')).toBe('Forward');
    expect(robotText.command('left')).toBe('Turn left');
    expect(robotText.command('right')).toBe('Turn right');
  });

  it('names a place of the row by its number and what is in it, and says what a tap will do', () => {
    expect(robotText.step(1, null)).toBe('Step 1: empty');
    expect(robotText.step(2, 'left')).toBe('Step 2: turn left. Take it out.');
    // A step help has put in stays: it is named, and nothing is promised of a tap.
    expect(robotText.fixedStep(1, 'forward')).toBe('Step 1: forward');
  });

  it('names the again button by how many times, and by what the next tap does', () => {
    expect(robotText.again(1, 4)).toBe('Do the steps once. Tap for one more time.');
    expect(robotText.again(2, 4)).toBe('Do the steps twice. Tap for one more time.');
    expect(robotText.again(3, 4)).toBe('Do the steps 3 times. Tap for one more time.');
    // After the most there can be, a tap makes it once, and the name says so.
    expect(robotText.again(4, 4)).toBe('Do the steps 4 times. Tap to do them once.');
    expect(robotText.again(2, 2)).toBe('Do the steps twice. Tap to do them once.');
    expect(robotText.againFixed(3)).toBe('Do the steps 3 times');
  });

  it('keeps the name of the button that runs the row to itself', () => {
    // "Go" is found by its name — by a test, by someone speaking to the screen — and must be the only one.
    const others = [
      ...[1, 2, 3, 4].flatMap((count) => [robotText.again(count, 4), robotText.againFixed(count)]),
      ...(['forward', 'left', 'right'] as const).flatMap((command) => [
        robotText.command(command),
        robotText.step(1, command),
        robotText.fixedStep(1, command),
      ]),
      robotText.step(1, null),
    ];
    for (const name of others) expect(name).not.toMatch(/\bgo\b/i);
  });

  it('counts the power that is left, and one move is one move', () => {
    expect(robotText.power(1)).toBe('Power for 1 more move');
    expect(robotText.power(4)).toBe('Power for 4 more moves');
    expect(robotText.power(0)).toBe('Power for 0 more moves');
  });
});

group('a picture of a journey', () => {
  type Scene = Extract<Stimulus, { type: 'scene' }>;
  const scene = (of: Scene['of']): Stimulus => ({ type: 'scene', scene: 'grid', of });

  it('is described by what it is of', () => {
    expect(
      describe(
        scene({
          game: 'plan',
          columns: 4,
          rows: 2,
          start: [0, 0],
          facing: 'east',
          goal: [3, 1],
          rocks: [1, 1],
        }),
      ),
    ).toBe("A robot's journey to a star, on a grid 4 by 2");
  });

  it('has nothing to say of a picture that is not a journey', () => {
    expect(describe(scene({ columns: 4 }))).toBe('');
    expect(describe({ type: 'picture', id: 'sun' })).toBe('');
  });
});
