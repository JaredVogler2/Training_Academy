import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import robotRidge from '@/content/packs/robot-ridge.v1.json';
import {
  fitsTask,
  parseContentPack,
  parseProgram,
  runProgram,
  solveProgram,
  type Challenge,
  type Lesson,
  type ProgramTask,
  type Stage,
} from '@/engine';
import { framesOf, modeOf } from '@/game/worlds/robot-ridge/run';
import { robotScript, type RobotSituation } from '@/game/worlds/robot-ridge/script';
import { makeJourney, type JourneyAsking } from '../../scripts/content/robot-ridge.mjs';

/**
 * Robot Ridge's journeys, each run for real: with the engine's own interpreter and solver, not with the lint. The
 * ones written by hand, the ones drawn from seeds, and the thing that draws them.
 */

const parsed = parseContentPack(robotRidge);
if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
const pack = parsed.value;

interface Journey {
  lesson: Lesson;
  challenge: Challenge;
  task: ProgramTask;
  stage: Stage;
  name: string;
}

const journeys: Journey[] = pack.lessons.flatMap((lesson) =>
  lesson.challenges.flatMap((challenge) => {
    if (challenge.kind !== 'make' || challenge.task.type !== 'program') return [];
    const stage: Stage = lesson.plan.demo.includes(challenge.id)
      ? 'demo'
      : lesson.plan.guided.includes(challenge.id)
        ? 'guided'
        : 'independent';
    const name = challenge.id.split('.')[1] ?? challenge.id;
    return [{ lesson, challenge, task: challenge.task, stage, name }];
  }),
);
const each = journeys.map((journey): [string, Journey] => [journey.challenge.id, journey]);

const sameSquare = (a: readonly number[], b: readonly number[]) => a[0] === b[0] && a[1] === b[1];

describe('the journeys of the pack', () => {
  it('are all journeys: Robot Ridge asks nothing else', () => {
    const all = pack.lessons.reduce((total, lesson) => total + lesson.challenges.length, 0);
    expect(journeys).toHaveLength(all);
    expect(pack.lessons.map((lesson) => lesson.id)).toEqual([
      'rr-move-01',
      'rr-steps-01',
      'rr-repeat-01',
      'rr-mend-01',
    ]);
  });

  it('include at least ten written by hand, and some drawn from seeds', () => {
    const drawn = journeys.filter((journey) => journey.name.startsWith('drawn-'));
    expect(drawn.length).toBeGreaterThanOrEqual(3);
    expect(journeys.length - drawn.length).toBeGreaterThanOrEqual(10);
  });

  it.each(each)('%s can be made, and the way shown is as short as any', (_id, { task }) => {
    const shown = parseProgram(task.solution);
    expect(shown).not.toBeNull();
    expect(fitsTask(task, shown!)).toBe(true);
    expect(runProgram(task, shown!).outcome).toBe('arrived');
    const shortest = solveProgram(task);
    expect(shortest?.commands.length).toBe(shown!.commands.length);
  });

  it.each(each)('%s keeps its rocks off the start and off the star', (_id, { task }) => {
    expect(sameSquare(task.start.at, task.goal)).toBe(false);
    for (const rock of task.rocks) {
      expect(sameSquare(rock, task.start.at)).toBe(false);
      expect(sameSquare(rock, task.goal)).toBe(false);
      expect(rock[0]).toBeLessThan(task.grid.columns);
      expect(rock[1]).toBeLessThan(task.grid.rows);
    }
  });

  it('one tap at a time: there is power for the journey, and never for much more', () => {
    const live = journeys.filter(({ task }) => modeOf(task) === 'live');
    expect(live.length).toBeGreaterThanOrEqual(8);
    for (const { task, name } of live) {
      const needed = solveProgram(task)?.commands.length ?? Infinity;
      expect(task.slots, name).toBeGreaterThanOrEqual(needed);
      expect(task.slots - needed, name).toBeLessThanOrEqual(3);
    }
  });

  it('a child who knows no letter can do the first journey: it is two taps of the one arrow there is', () => {
    const first = journeys.find(
      ({ stage, lesson }) => stage === 'guided' && lesson.id === 'rr-move-01',
    );
    expect(first?.task.commands).toEqual(['forward']);
    // Whatever is tapped, and however often, the robot can only get nearer: it cannot be done wrong.
    const { task } = first!;
    expect(solveProgram(task)?.commands.every((command) => command === 'forward')).toBe(true);
    expect(task.slots).toBeGreaterThanOrEqual(solveProgram(task)!.commands.length);
  });

  it('done again: none can be made without doing it again, so doing it again is what is shown', () => {
    const again = journeys.filter(({ task }) => modeOf(task) === 'again');
    expect(again.length).toBeGreaterThanOrEqual(8);
    for (const { task, name } of again) {
      expect(solveProgram({ ...task, repeats: 1 }), name).toBeNull();
      expect(parseProgram(task.solution)?.times, name).toBeGreaterThan(1);
    }
    // More than one shape of journey: a line, stairs, round a pond.
    expect(new Set(again.map(({ challenge }) => challenge.variant)).size).toBeGreaterThanOrEqual(4);
  });

  it('to be mended: each goes wrong as it stands, and is one step away from going right', () => {
    const mend = journeys.filter(({ task }) => modeOf(task) === 'mend');
    expect(mend.length).toBeGreaterThanOrEqual(8);
    const faults = new Set<string>();
    for (const { task, name } of mend) {
      const faulty = parseProgram(task.given ?? '')!;
      const right = parseProgram(task.solution)!;
      const run = runProgram(task, faulty);
      expect(run.outcome, name).not.toBe('arrived');
      faults.add(run.outcome);
      expect(faulty.commands, name).toHaveLength(right.commands.length);
      const differing = faulty.commands.filter((command, at) => command !== right.commands[at]);
      expect(differing, name).toHaveLength(1);
      expect(task.slots, name).toBe(faulty.commands.length);
    }
    // Every way a row can go wrong is there to be found: off the edge, into a rock, and simply somewhere else.
    expect([...faults].sort()).toEqual(['hit-a-rock', 'left-the-grid', 'stopped-short']);
  });

  it('a plan has room for the journey and at most one step more', () => {
    for (const { task, name } of journeys.filter(({ task }) => modeOf(task) === 'plan')) {
      const needed = solveProgram(task)?.commands.length ?? Infinity;
      expect(task.slots - needed, name).toBeGreaterThanOrEqual(0);
      expect(task.slots - needed, name).toBeLessThanOrEqual(1);
    }
  });
});

describe('what is shown of each journey', () => {
  /** The situation the board hands the script for a journey, at the stage the lesson gives it. */
  function situationOf({ task, stage }: Journey, event: RobotSituation['event']): RobotSituation {
    const mode = modeOf(task);
    const answer = parseProgram(task.solution);
    const way = framesOf(task, answer);
    const fault = task.given === undefined ? null : framesOf(task, parseProgram(task.given));
    return {
      stage,
      event,
      again: false,
      mode,
      way: way.frames.length - 1,
      parts:
        mode === 'live'
          ? (answer?.commands.length ?? 0)
          : mode === 'mend'
            ? 1
            : task.solution.split('-').length,
      fault: fault ? fault.frames.length - 1 : 0,
      faultBumps: fault?.frames.at(-1)?.bumped === true,
      lines: { instruction: 'i', feedback: 'f', hint: 'h' },
      seconds: () => 0,
    };
  }

  it('never takes longer than a small child will watch: under ten seconds with nothing said', () => {
    for (const journey of journeys) {
      const events: RobotSituation['event'][] =
        journey.stage === 'demo' ? ['new'] : ['new', 'hint-model', 'correct', 'incorrect'];
      for (const event of events) {
        const script = robotScript(situationOf(journey, event));
        expect(script.length, `${journey.challenge.id} ${event}`).toBeLessThan(10_000);
      }
    }
  });

  it('every demonstration ends with the robot on the star', () => {
    for (const journey of journeys.filter(({ stage }) => stage === 'demo')) {
      const script = robotScript(situationOf(journey, 'new'));
      expect(script.settled).toEqual({ show: 'same' });
      const way = framesOf(journey.task, parseProgram(journey.task.solution));
      expect(way.outcome).toBe('arrived');
    }
  });
});

describe('a journey drawn from a seed', () => {
  const askings: JourneyAsking[] = [
    { columns: 3, rows: 3, steps: 3, rocks: 2, turn: true },
    { columns: 4, rows: 2, steps: 3, rocks: 1, turn: true },
    { columns: 3, rows: 1, steps: 2 },
    { columns: 4, rows: 4, steps: 5, rocks: 3, turn: true },
    { columns: 5, rows: 3, steps: 4, rocks: 2 },
  ];

  it('is the same journey every time the same seed is asked for', () => {
    for (const asking of askings) {
      expect(makeJourney(17, asking)).toEqual(makeJourney(17, asking));
    }
    const some = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
      JSON.stringify(makeJourney(seed, askings[0]!)),
    );
    // Different seeds do not all draw the same one.
    expect(new Set(some).size).toBeGreaterThan(3);
  });

  it('can always be made, is exactly as long as was asked for, and keeps to what was asked', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5000 }),
        fc.constantFrom(...askings),
        (seed, asking) => {
          const drawn = makeJourney(seed, asking);
          const task: ProgramTask = drawn;
          expect(task.grid).toEqual({ columns: asking.columns, rows: asking.rows });
          expect(task.rocks).toHaveLength(asking.rocks ?? 0);
          expect(task.slots).toBe(asking.steps);

          // On the grid, start and star apart, no rock on either or on another rock.
          const on = ([column, row]: readonly number[]) =>
            column! >= 0 && row! >= 0 && column! < asking.columns && row! < asking.rows;
          expect(on(task.start.at) && on(task.goal)).toBe(true);
          expect(sameSquare(task.start.at, task.goal)).toBe(false);
          for (const rock of task.rocks) {
            expect(on(rock)).toBe(true);
            expect(sameSquare(rock, task.start.at) || sameSquare(rock, task.goal)).toBe(false);
          }
          expect(new Set(task.rocks.map((rock) => rock.join(','))).size).toBe(task.rocks.length);

          // The way shown arrives, nothing shorter does, and a turn is needed where one was asked for.
          const shown = parseProgram(task.solution)!;
          expect(runProgram(task, shown).outcome).toBe('arrived');
          expect(shown.commands).toHaveLength(asking.steps);
          const shortest = solveProgram(task)!;
          expect(shortest.commands).toHaveLength(asking.steps);
          if (asking.turn)
            expect(shortest.commands.some((command) => command !== 'forward')).toBe(true);
        },
      ),
      { numRuns: 150 },
    );
  });

  it('says so, instead of drawing something else, when what is asked for cannot be', () => {
    // Five steps do not fit on two squares.
    expect(() => makeJourney(1, { columns: 2, rows: 1, steps: 5 })).toThrow(/No journey/);
    // No room for nine rocks beside a walk of three squares on a grid of nine.
    expect(() => makeJourney(1, { columns: 3, rows: 3, steps: 2, rocks: 9 })).toThrow(/No journey/);
  });

  it('is what the pack’s drawn journeys are', () => {
    const drawn = (name: string) => journeys.find((journey) => journey.name === name)?.task;
    expect(drawn('drawn-one')).toEqual(
      makeJourney(5, { columns: 3, rows: 3, steps: 3, rocks: 2, turn: true }),
    );
    expect(drawn('drawn-two')).toEqual(
      makeJourney(8, { columns: 3, rows: 3, steps: 3, rocks: 2, turn: true }),
    );
    expect(drawn('drawn-three')).toEqual(
      makeJourney(42, { columns: 4, rows: 2, steps: 3, rocks: 1, turn: true }),
    );
  });
});
