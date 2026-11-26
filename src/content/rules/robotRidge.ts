import { parseProgram, solveProgram, type ProgramTask, type Stimulus } from '@/engine';
import { shortestWays } from '../robot-ridge/ways';
import type { Report, WorldRules } from './types';

/**
 * Robot Ridge's answers are journeys, so its rules are about journeys. That the program shown arrives, that it is
 * as short as any, and that everything is on the grid is checked for every pack (src/content/lint.ts). What is
 * checked here is that each journey teaches what its activity says it teaches:
 *
 *   one tap at a time    power for the journey and a little over: not so much that any wandering gets there
 *   a plan               room for the journey and at most one step more: a plan cannot be padded with guesses
 *   done again           cannot be done without doing it again, and the program shown does
 *   to be mended         one step away from a program that works, and exactly as long
 *   a longer plan        four steps or more, a row exactly as long as the way, and only one way that short: help
 *                        that shows "the" way must not take a child's own good steps out of the row
 *   over a bridge        cannot be done without waiting, and the program shown waits once for each bridge
 *
 * that the picture of the journey, which is what the world's page shows, is the journey; and that the journey can
 * be played on a phone: a grid low enough to be seen on one held sideways, a row short enough to be pressed.
 */

type Kind = 'live' | 'plan' | 'again' | 'mend' | 'long' | 'bridge';

/** What a journey is for, from how it is set up. */
export function kindOf(task: ProgramTask): Kind {
  if (task.live) return 'live';
  if (task.given !== undefined) return 'mend';
  if (task.repeats > 1) return 'again';
  if (task.bridges !== undefined) return 'bridge';
  return task.stepwise === true ? 'long' : 'plan';
}

/** The skill each kind of journey is evidence of: the beginning of its id. */
const SKILLS: Record<Kind, string> = {
  live: 'coding.commands.',
  plan: 'coding.sequence.',
  again: 'coding.repeat.',
  mend: 'coding.debug.',
  long: 'coding.sequence.',
  bridge: 'coding.condition.',
};

/** The most moves a robot may have to spare when each tap is carried out at once. */
export const POWER_TO_SPARE = 3;

/**
 * The most rows a grid may have. A phone held sideways leaves a board about a hundred pixels of height: with
 * three rows a square of ground is some thirty pixels across there, and the robot can still be seen to face one
 * way or another. With more it cannot.
 */
export const MOST_ROWS = 3;

/**
 * The most places a row of steps may have: each is something to press, and on a phone 360 pixels wide five of them
 * side by side are as narrow as that may be. Where the "again" button stands beside the row there is room for four.
 */
export const MOST_PLACES = 5;
export const MOST_PLACES_AGAIN = 4;

/**
 * A longer plan: from four steps, which is one more than a short plan has, to ten, which is all a row holds. Its
 * steps are small tiles that are looked at and not pressed, in two lines on a phone.
 */
export const LONG_FROM = 4;
export const LONG_TO = 10;

/** The journey as its picture should describe it: the grid, and which game it is for. */
export function sceneOf(task: ProgramTask): Extract<Stimulus, { type: 'scene' }> {
  return {
    type: 'scene',
    scene: 'grid',
    of: {
      game: kindOf(task),
      columns: task.grid.columns,
      rows: task.grid.rows,
      start: [...task.start.at],
      facing: task.start.facing,
      goal: [...task.goal],
      rocks: task.rocks.flat(),
      ...(task.water ? { water: task.water.flat() } : {}),
      ...(task.bridges ? { bridges: task.bridges.flat() } : {}),
    },
  };
}

/** Whether a picture says what a journey's picture should, whatever order it says it in. */
function sameScene(shown: Stimulus | undefined, wanted: ReturnType<typeof sceneOf>): boolean {
  if (shown?.type !== 'scene' || shown.scene !== wanted.scene) return false;
  const keys = Object.keys(wanted.of);
  return (
    Object.keys(shown.of).length === keys.length &&
    keys.every((key) => JSON.stringify(shown.of[key]) === JSON.stringify(wanted.of[key]))
  );
}

function lintLive(task: ProgramTask, shortest: number, report: Report): void {
  if (task.repeats > 1 || task.given !== undefined) {
    report('robot-live-plain', 'a journey taken one tap at a time has nothing to mend or do again');
  }
  const spare = task.slots - shortest;
  if (spare > POWER_TO_SPARE) {
    report(
      'robot-live-power',
      `power for ${String(spare)} moves more than the journey needs: wandering would get there`,
    );
  }
}

function lintMend(task: ProgramTask, given: string, report: Report): void {
  const start = parseProgram(given);
  const shown = parseProgram(task.solution);
  if (!start || !shown) return;
  if (task.repeats > 1 || start.times > 1) {
    report('robot-mend-again', 'a program to mend is not done over: one fault at a time');
  }
  if (task.slots !== start.commands.length) {
    report(
      'robot-mend-slots',
      `${String(task.slots)} places for a program of ${String(start.commands.length)} steps: mending is changing a step, not adding one`,
    );
  }
  const differing = start.commands.filter((command, at) => command !== shown.commands[at]).length;
  if (start.commands.length !== shown.commands.length || differing !== 1) {
    report('robot-mend-distance', 'the program to mend is not one step away from the one shown');
  }
}

function lintLong(task: ProgramTask, shortest: number, report: Report): void {
  if (shortest < LONG_FROM) {
    report(
      'robot-long-short',
      `a way of ${String(shortest)} steps is not a long one: it belongs with the short plans`,
    );
  }
  // The row says how long the way is, and a full row is how a long plan is known to be finished.
  if (task.slots !== shortest) {
    report(
      'robot-long-places',
      `${String(task.slots)} places for a way of ${String(shortest)} steps: a long plan's row is exactly as long as its way`,
    );
  }
  const ways = shortestWays(task);
  if (ways && ways.steps === shortest && ways.count !== 1) {
    report(
      'robot-long-many-ways',
      `there are ${String(ways.count)} ways as short as the one shown: help that shows the way would take a child's own good steps out of the row`,
    );
  }
}

function lintBridge(task: ProgramTask, report: Report): void {
  const waits = (parseProgram(task.solution)?.commands ?? []).filter(
    (command) => command === 'wait',
  ).length;
  if (waits !== (task.bridges?.length ?? 0)) {
    report('robot-bridge-waits', 'the program shown does not wait once for each bridge');
  }
  const without = task.commands.filter((command) => command !== 'wait');
  if (without.length > 0 && solveProgram({ ...task, commands: without })) {
    report('robot-bridge-unneeded', 'the star can be reached without waiting for any bridge');
  }
}

export const robotRidgeRules: WorldRules = (challenge, _lesson, report) => {
  if (challenge.kind !== 'make' || challenge.task.type !== 'program') {
    report('robot-question', 'Robot Ridge asks only for programs');
    return;
  }
  const { task } = challenge;
  const kind = kindOf(task);

  if (!sameScene(challenge.prompt.stimulus, sceneOf(task))) {
    report('robot-scene', 'the picture of the journey is not the journey');
  }
  if (!task.commands.includes('forward')) {
    report('robot-no-forward', 'there is no way to move: forward is not among the commands');
  }
  if (!challenge.skillId.startsWith(SKILLS[kind])) {
    report('robot-skill', `a journey of this kind is not evidence of ${challenge.skillId}`);
  }
  // A journey that is not planned has no first steps to be given, and one to be mended has them already.
  if (
    (kind === 'live' || kind === 'mend') &&
    challenge.hints.some((hint) => hint.type === 'step')
  ) {
    report('robot-step-hint', 'help cannot give the first steps of this kind of journey');
  }
  if (task.grid.rows > MOST_ROWS) {
    report(
      'robot-too-tall',
      `a grid of ${String(task.grid.rows)} rows: on a phone held sideways its squares are too small to see which way the robot is facing`,
    );
  }
  // Taken one tap at a time, the places are power, which is only looked at; in a longer plan they are small tiles,
  // looked at too; otherwise each is a step to press.
  const places = kind === 'again' ? MOST_PLACES_AGAIN : kind === 'long' ? LONG_TO : MOST_PLACES;
  if (kind !== 'live' && task.slots > places) {
    report(
      'robot-row-too-long',
      kind === 'long'
        ? `a row of ${String(task.slots)} places: a row holds ${String(places)} at most`
        : `a row of ${String(task.slots)} places: on a narrow phone each would be too small to press (at most ${String(places)} here)`,
    );
  }

  const shortest = solveProgram(task);
  // With no way there at all, the general lint has said so already.
  if (!shortest) return;
  if (kind === 'live') lintLive(task, shortest.commands.length, report);
  else if (kind === 'long') lintLong(task, shortest.commands.length, report);
  else if (task.slots > shortest.commands.length + 1) {
    report(
      'robot-slots-loose',
      `${String(task.slots)} places for a journey of ${String(shortest.commands.length)} steps: a plan could be padded out`,
    );
  }
  if (kind === 'again') {
    if ((parseProgram(task.solution)?.times ?? 1) < 2) {
      report('robot-again-not-shown', 'the program shown does nothing again');
    }
    if (solveProgram({ ...task, repeats: 1 })) {
      report('robot-again-unneeded', 'the journey can be made without doing anything again');
    }
  }
  if (kind === 'mend' && task.given !== undefined) lintMend(task, task.given, report);
  if (kind === 'bridge') lintBridge(task, report);
};
