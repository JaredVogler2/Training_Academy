import { describe as group, expect, it } from 'vitest';
import type { Stimulus } from '@/engine';
import { BRIDGE_LINES } from '@/game/worlds/robot-ridge/script';
import { describe, robotText } from '@/game/worlds/robot-ridge/text';
import lines from '@/voice/lines.json';

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

  it('says where the water is, and where each bridge is and how it stands', () => {
    const journey = {
      columns: 4,
      rows: 3,
      start: [0, 1] as const,
      facing: 'east' as const,
      goal: [3, 1] as const,
      rocks: [],
      water: [
        [2, 0],
        [2, 2],
      ] as const,
    };
    const with_ = (state: 'up' | 'down' | 'maybe') =>
      robotText.journey({ ...journey, bridges: [{ at: [2, 1], state }] });
    expect(with_('up')).toMatch(
      / There is water in column 3, row 1; column 3, row 3\. There is a bridge in column 3, row 2, and it is up\.$/,
    );
    expect(with_('down')).toMatch(/ and it is down\.$/);
    // Before a run begins nobody knows, and the words say so too.
    expect(with_('maybe')).toMatch(/ and it is up or down: nobody knows yet\.$/);
    // Nothing is said of water or bridges where there are none.
    expect(robotText.journey({ ...journey, water: [], bridges: [] })).not.toMatch(/water|bridge/);
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
    expect(robotText.command('wait')).toBe('Wait for the bridge');
  });

  it('names a step of a longer row by its number and what is in it, and promises nothing of a tap', () => {
    // The tiles of a longer row are looked at, not pressed.
    expect(robotText.tile(1, null)).toBe('Step 1: empty');
    expect(robotText.tile(7, 'right')).toBe('Step 7: turn right');
    expect(robotText.tile(2, 'wait')).toBe('Step 2: wait for the bridge');
    expect(robotText.tile(3, 'left')).not.toMatch(/take/i);
  });

  it('says of the bridge what the voice says of it, word for word', () => {
    const spoken: Record<string, string> = lines.groups.common.lines;
    expect(robotText.waits).toBe(spoken[BRIDGE_LINES.waits]);
    expect(robotText.passes).toBe(spoken[BRIDGE_LINES.passes]);
    expect(robotText.waits).not.toBe(robotText.passes);
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
      ...(['forward', 'left', 'right', 'wait'] as const).flatMap((command) => [
        robotText.command(command),
        robotText.step(1, command),
        robotText.fixedStep(1, command),
        robotText.tile(1, command),
      ]),
      robotText.step(1, null),
      robotText.tile(1, null),
      robotText.takeOut,
      robotText.stepOn,
      robotText.stepBack,
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
    // A bridge on the way is part of what it is a picture of.
    const over = (bridges: number[]) =>
      describe(
        scene({
          game: 'bridge',
          columns: 4,
          rows: 3,
          start: [0, 1],
          facing: 'east',
          goal: [3, 1],
          rocks: [],
          water: [2, 0, 2, 2],
          bridges,
        }),
      );
    expect(over([2, 1])).toBe("A robot's journey to a star, on a grid 4 by 3, over a bridge");
    expect(over([2, 1, 2, 0])).toBe("A robot's journey to a star, on a grid 4 by 3, over bridges");
  });

  it('has nothing to say of a picture that is not a journey', () => {
    expect(describe(scene({ columns: 4 }))).toBe('');
    expect(describe({ type: 'picture', id: 'sun' })).toBe('');
  });
});
