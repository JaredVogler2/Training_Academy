import type { Command, Facing, Stimulus } from '@/engine';
import { journeyOf } from './run';

/**
 * Words on Robot Ridge's board. They are for the grown-up alongside and for screen readers; the child needs none:
 * every one of these stands beside a picture that says the same.
 */

const WAYS: Record<Facing, string> = {
  north: 'up the screen',
  east: 'to the right',
  south: 'down the screen',
  west: 'to the left',
};

const COMMANDS: Record<Command, string> = {
  forward: 'Forward',
  left: 'Turn left',
  right: 'Turn right',
  wait: 'Wait for the bridge',
};

const square = ([column, row]: readonly [number, number]) =>
  `column ${String(column + 1)}, row ${String(row + 1)}`;

const times = (count: number) =>
  count === 1 ? 'once' : count === 2 ? 'twice' : `${String(count)} times`;

const BRIDGES = { up: 'up', down: 'down', maybe: 'up or down: nobody knows yet' } as const;

export const robotText = {
  command: (command: Command) => COMMANDS[command],
  arrows: 'The arrows',
  go: 'Go',
  /** The whole journey, for someone who cannot see the grid. */
  journey: (journey: {
    columns: number;
    rows: number;
    start: readonly [number, number];
    facing: Facing;
    goal: readonly [number, number];
    rocks: readonly (readonly [number, number])[];
    water?: readonly (readonly [number, number])[];
    bridges?: readonly { at: readonly [number, number]; state: keyof typeof BRIDGES }[];
  }) =>
    `A grid ${String(journey.columns)} squares across and ${String(journey.rows)} down. ` +
    `The robot starts in ${square(journey.start)}, facing ${WAYS[journey.facing]}. ` +
    `The star is in ${square(journey.goal)}.` +
    (journey.rocks.length === 0
      ? ''
      : ` There ${journey.rocks.length === 1 ? 'is a rock' : 'are rocks'} in ${journey.rocks.map(square).join('; ')}.`) +
    ((journey.water ?? []).length === 0
      ? ''
      : ` There is water in ${(journey.water ?? []).map(square).join('; ')}.`) +
    (journey.bridges ?? [])
      .map(
        (bridge) =>
          ` There is a bridge in ${square(bridge.at)}, and it is ${BRIDGES[bridge.state]}.`,
      )
      .join(''),
  /** Where the robot is at this moment. */
  robotNow: (at: readonly [number, number], facing: Facing) =>
    `The robot is in ${square(at)}, facing ${WAYS[facing]}.`,
  stopped: 'The robot cannot go that way.',
  /** What Glim says of a bridge while a run is shown; the same words are the voice's (src/voice/lines.json). */
  waits: 'The bridge is up, so the robot waits.',
  passes: 'Now the bridge is down. There is nothing to wait for.',
  /** A longer plan: its row is looked at, not pressed, and is changed from its end. */
  tile: (place: number, command: Command | null) =>
    command === null
      ? `Step ${String(place)}: empty`
      : `Step ${String(place)}: ${COMMANDS[command].toLowerCase()}`,
  takeOut: 'Take the last step out',
  stepOn: 'One step on',
  stepBack: 'One step back',
  power: (left: number) =>
    left === 1 ? 'Power for 1 more move' : `Power for ${String(left)} more moves`,
  steps: 'The steps',
  step: (place: number, command: Command | null) =>
    command === null
      ? `Step ${String(place)}: empty`
      : `Step ${String(place)}: ${COMMANDS[command].toLowerCase()}. Take it out.`,
  fixedStep: (place: number, command: Command) =>
    `Step ${String(place)}: ${COMMANDS[command].toLowerCase()}`,
  /**
   * The "again" button: how many times now, and what a tap does. After the most there can be, it is once again.
   * (The word "go" is kept out of it: that is the name of another button.)
   */
  again: (count: number, most: number) =>
    `Do the steps ${times(count)}. ${count >= most ? 'Tap to do them once.' : 'Tap for one more time.'}`,
  againFixed: (count: number) => `Do the steps ${times(count)}`,
  scene: (columns: number, rows: number, bridges = 0) =>
    `A robot's journey to a star, on a grid ${String(columns)} by ${String(rows)}` +
    (bridges === 0 ? '' : bridges === 1 ? ', over a bridge' : ', over bridges'),
} as const;

/** A picture of a journey, in words. Nothing, for a picture that is not one. */
export function describe(stimulus: Stimulus): string {
  const journey = stimulus.type === 'scene' ? journeyOf(stimulus.of) : null;
  return journey ? robotText.scene(journey.columns, journey.rows, journey.bridges.length) : '';
}
