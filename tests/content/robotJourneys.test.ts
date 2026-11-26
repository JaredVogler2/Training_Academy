import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import robotRidge from '@/content/packs/robot-ridge.v2.json';
import { shortestWays } from '@/content/robot-ridge/ways';
import { kindOf } from '@/content/rules/robotRidge';
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
import { framesOf, modeOf, runsOf } from '@/game/worlds/robot-ridge/run';
import {
  robotScript,
  situationOf as situationFor,
  type RobotSituation,
} from '@/game/worlds/robot-ridge/script';
import {
  makeJourney,
  makeLongJourney,
  readMap,
  type JourneyAsking,
  type LongJourneyAsking,
} from '../../scripts/content/robot-ridge.mjs';

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
    // The four the world first went live with come first, in their order; what was added comes after them.
    expect(pack.lessons.map((lesson) => lesson.id)).toEqual([
      'rr-move-01',
      'rr-steps-01',
      'rr-repeat-01',
      'rr-mend-01',
      'rr-plan-01',
      'rr-bridge-01',
      'rr-plan-02',
    ]);
  });

  it('are each as long as two ways of finding out say: by trying programs, and by walking the ground', () => {
    const once = journeys.filter(({ task }) => task.repeats === 1);
    expect(once.length).toBeGreaterThan(50);
    for (const { task, name } of once) {
      expect(shortestWays(task)?.steps, name).toBe(solveProgram(task)?.commands.length);
    }
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

describe('a longer plan', () => {
  const longs = journeys.filter(({ task }) => kindOf(task) === 'long');
  const stepsOf = ({ task }: Journey) => parseProgram(task.solution)?.commands ?? [];

  it('is in two activities: four to six steps, and seven to ten, with every length among those done alone', () => {
    const lengths = (lesson: string, stage: Stage) =>
      longs
        .filter((journey) => journey.lesson.id === lesson && journey.stage === stage)
        .map((journey) => stepsOf(journey).length)
        .sort((a, b) => a - b);
    expect(lengths('rr-plan-01', 'demo')).toEqual([4]);
    expect(lengths('rr-plan-01', 'guided')).toEqual([4, 5]);
    expect(new Set(lengths('rr-plan-01', 'independent'))).toEqual(new Set([4, 5, 6]));
    expect(lengths('rr-plan-02', 'demo')).toEqual([7]);
    expect(lengths('rr-plan-02', 'guided')).toEqual([7, 8]);
    expect(new Set(lengths('rr-plan-02', 'independent'))).toEqual(new Set([7, 8, 9, 10]));
    expect(longs).toHaveLength(20);
  });

  it('has a row exactly as long as its way, one way only that short, and a corner in it', () => {
    for (const journey of longs) {
      const { task, name } = journey;
      expect(task.stepwise, name).toBe(true);
      expect(task.slots, name).toBe(stepsOf(journey).length);
      expect(shortestWays(task), name).toMatchObject({ steps: task.slots, count: 1 });
      expect(
        stepsOf(journey).some((command) => command !== 'forward'),
        name,
      ).toBe(true);
      // Nothing but the three arrows: no doing again, nothing given, no bridge.
      expect(task.commands, name).toEqual(['forward', 'left', 'right']);
      expect(task.repeats, name).toBe(1);
    }
  });

  it('is longer because of its rocks: with them gone the star would be nearer', () => {
    const drawn = longs.filter(({ stage }) => stage === 'independent');
    expect(drawn).toHaveLength(14);
    for (const { task, name } of drawn) {
      expect(shortestWays({ ...task, rocks: [] })?.steps ?? 0, name).toBeLessThan(task.slots);
    }
  });

  it('is never the same ground twice in one activity', () => {
    for (const lesson of ['rr-plan-01', 'rr-plan-02']) {
      const grounds = longs
        .filter((journey) => journey.lesson.id === lesson)
        .map(({ task }) => JSON.stringify([task.grid, task.start, task.goal, task.rocks]));
      expect(new Set(grounds).size).toBe(grounds.length);
    }
  });

  it('gives, as help, the first two steps and never the whole of the way', () => {
    for (const { challenge, task, name } of longs) {
      const step = challenge.hints.find((hint) => hint.type === 'step');
      expect(step, name).toMatchObject({ count: 2 });
      expect(task.slots, name).toBeGreaterThan(2);
    }
  });
});

describe('over a bridge', () => {
  const overs = journeys.filter(({ task }) => kindOf(task) === 'bridge');
  const everyStand = (bridges: number): boolean[][] =>
    Array.from({ length: 2 ** bridges }, (_, bits) =>
      Array.from({ length: bridges }, (_unused, bridge) => (bits & (1 << bridge)) !== 0),
    );

  it('is one activity of ten journeys, each with a river, a bridge and the step that waits', () => {
    expect(overs).toHaveLength(10);
    expect(new Set(overs.map(({ lesson }) => lesson.id))).toEqual(new Set(['rr-bridge-01']));
    for (const { task, name } of overs) {
      expect(task.commands, name).toEqual(['forward', 'left', 'right', 'wait']);
      expect(task.bridges?.length, name).toBe(1);
      expect(task.water?.length ?? 0, name).toBeGreaterThan(0);
      expect(task.whenRight, name).toHaveLength(1);
    }
  });

  it('is got over by the program shown however the bridge stands, waiting once, just in front of it', () => {
    for (const { task, name } of overs) {
      const shown = parseProgram(task.solution)!;
      for (const stand of everyStand(task.bridges?.length ?? 0)) {
        expect(runProgram(task, shown, stand).outcome, `${name} ${String(stand)}`).toBe('arrived');
      }
      // With the bridge up, the wait is the step that brings it down: it is where it belongs.
      const waits = runProgram(task, shown).moves.filter((move) => move.command === 'wait');
      expect(waits, name).toHaveLength(1);
      expect(waits[0]?.lowered, name).toBe(0);
    }
  });

  it('cannot be got over without waiting, and cannot be gone round', () => {
    for (const { task, name } of overs) {
      const without: ProgramTask = { ...task, commands: ['forward', 'left', 'right'], slots: 8 };
      expect(solveProgram(without), name).toBeNull();
      expect(shortestWays(without), name).toBeNull();
      // Leaving the wait out of the program shown is stopped at the bridge.
      const shown = parseProgram(task.solution)!;
      const hasty = { times: 1, commands: shown.commands.filter((command) => command !== 'wait') };
      expect(runProgram(task, hasty).outcome, name).toBe('bridge-up');
    }
  });

  it('shows the wait both ways: with support first up and then down, and alone some of each', () => {
    const stood = (stage: Stage) =>
      overs.filter((journey) => journey.stage === stage).map(({ task }) => task.whenRight?.[0]);
    // The demonstration runs it both ways whatever it says; with support, up first, so the wait is seen to be
    // for something, and then down, so it is seen to be passed over.
    expect(stood('guided')).toEqual(['up', 'down']);
    const alone = stood('independent');
    expect(alone.filter((state) => state === 'up').length).toBeGreaterThanOrEqual(3);
    expect(alone.filter((state) => state === 'down').length).toBeGreaterThanOrEqual(3);
  });

  it('has the wait in more places than one: first, in the middle, after a turn', () => {
    const places = new Set(
      overs.map(({ task }) => (parseProgram(task.solution)?.commands ?? []).indexOf('wait')),
    );
    expect(places).toEqual(new Set([0, 1, 2]));
    expect(new Set(overs.map(({ challenge }) => challenge.variant)).size).toBeGreaterThanOrEqual(4);
  });

  it('gives, as help, the steps as far as the one that waits: that is where it goes', () => {
    for (const { challenge, task, name } of overs) {
      const at = (parseProgram(task.solution)?.commands ?? []).indexOf('wait');
      expect(
        challenge.hints.find((hint) => hint.type === 'step'),
        name,
      ).toMatchObject({
        count: at + 1,
      });
      // Never the whole of the answer.
      expect(at + 1, name).toBeLessThan(task.solution.split('-').length);
    }
  });
});

describe('what is shown of each journey', () => {
  /** The situation the board hands the script for a journey, at the stage the lesson gives it. */
  function situationOf({ task, stage }: Journey, event: RobotSituation['event']): RobotSituation {
    return situationFor(task, runsOf(task), {
      stage,
      event,
      again: false,
      lines: { instruction: 'i', feedback: 'f', hint: 'h' },
      seconds: () => 0,
    });
  }

  it('is told to the script as it is: a long row run a step at a time, a bridge waited for and passed over', () => {
    const named = (name: string) => {
      const found = journeys.find((journey) => journey.name === name);
      if (!found) throw new Error(`No journey called ${name}.`);
      return situationOf(found, 'new');
    };
    // The long way's demonstration: seven steps, each a part to put in, and nothing of bridges.
    expect(named('demo-seven')).toMatchObject({
      mode: 'plan',
      stepwise: true,
      way: 7,
      parts: 7,
      waits: [],
      down: 0,
      passes: [],
    });
    // The bridge's: forward, wait, forward, forward. With the bridge up that is five moments, the robot waiting
    // at the second; with it down it is four, and the step that waits is the second of them.
    expect(named('demo-across')).toMatchObject({
      mode: 'plan',
      stepwise: false,
      way: 5,
      parts: 4,
      waits: [2],
      down: 4,
      passes: [2],
    });
    // And a short plan is neither.
    expect(named('guided-two-along')).toMatchObject({
      stepwise: false,
      waits: [],
      down: 0,
      passes: [],
    });
  });

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

  it('is what the pack’s drawn journeys are, the longer ones too', () => {
    const drawn = (name: string) => journeys.find((journey) => journey.name === name)?.task;
    const asked: [string, number, LongJourneyAsking][] = [
      ['four-one', 3, { columns: 3, rows: 3, steps: 4, rocks: 2 }],
      ['five-two', 4, { columns: 4, rows: 3, steps: 5, rocks: 3 }],
      ['six-three', 5, { columns: 4, rows: 3, steps: 6, rocks: 3 }],
      ['seven-one', 2, { columns: 5, rows: 3, steps: 7, rocks: 4 }],
      ['eight-two', 4, { columns: 5, rows: 3, steps: 8, rocks: 4 }],
      ['nine-one', 2, { columns: 6, rows: 3, steps: 9, rocks: 5 }],
      ['ten-two', 3, { columns: 6, rows: 3, steps: 10, rocks: 5 }],
    ];
    for (const [name, seed, asking] of asked) {
      expect(drawn(name), name).toEqual(makeLongJourney(seed, asking));
    }
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

describe('a longer journey drawn from a seed', () => {
  const askings: LongJourneyAsking[] = [
    { columns: 3, rows: 3, steps: 4, rocks: 2 },
    { columns: 4, rows: 3, steps: 5, rocks: 3 },
    { columns: 4, rows: 3, steps: 6, rocks: 3 },
    { columns: 5, rows: 3, steps: 7, rocks: 4 },
  ];

  it('is the same journey every time the same seed is asked for, and not the same for every seed', () => {
    for (const asking of askings) {
      expect(makeLongJourney(11, asking)).toEqual(makeLongJourney(11, asking));
    }
    const some = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
      JSON.stringify(makeLongJourney(seed, askings[1]!)),
    );
    expect(new Set(some).size).toBeGreaterThan(4);
  });

  it('is exactly as long as was asked for, by one way only, round rocks that are in the way', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3000 }),
        fc.constantFrom(...askings),
        (seed, asking) => {
          const task: ProgramTask = makeLongJourney(seed, asking);
          expect(task.grid).toEqual({ columns: asking.columns, rows: asking.rows });
          expect(task.rocks).toHaveLength(asking.rocks);
          expect(task.stepwise).toBe(true);
          expect(task.slots).toBe(asking.steps);

          // On the ground, each square one thing, the robot and the star on none of the rocks.
          const taken = [task.start.at, task.goal, ...task.rocks].map((square) => square.join(','));
          expect(new Set(taken).size).toBe(taken.length);
          for (const [column, row] of [task.start.at, task.goal, ...task.rocks]) {
            expect(column >= 0 && row >= 0 && column < asking.columns && row < asking.rows).toBe(
              true,
            );
          }

          // The way shown arrives; trying every program finds nothing shorter; walking the ground finds no other.
          const shown = parseProgram(task.solution)!;
          expect(shown.commands).toHaveLength(asking.steps);
          expect(runProgram(task, shown).outcome).toBe('arrived');
          expect(solveProgram(task)?.commands).toHaveLength(asking.steps);
          expect(shortestWays(task)).toMatchObject({ steps: asking.steps, count: 1 });

          // It winds: two corners at least. It does not begin by turning right round. And the rocks are why it is
          // as long as it is.
          expect(
            shown.commands.filter((command) => command !== 'forward').length,
          ).toBeGreaterThanOrEqual(2);
          expect(shown.commands.slice(0, 2)).toContain('forward');
          expect(shortestWays({ ...task, rocks: [] })?.steps ?? 0).toBeLessThan(asking.steps);
        },
      ),
      { numRuns: 60 },
    );
  });

  it('can be as long as a row holds: ten steps, checked by trying every program', () => {
    const task: ProgramTask = makeLongJourney(1, { columns: 6, rows: 3, steps: 10, rocks: 5 });
    expect(solveProgram(task)?.commands).toHaveLength(10);
    expect(shortestWays(task)).toMatchObject({ steps: 10, count: 1 });
  });

  it('says so, instead of drawing something else, when what is asked for cannot be', () => {
    // Nine steps do not fit on four squares.
    expect(() => makeLongJourney(1, { columns: 2, rows: 2, steps: 9, rocks: 1 })).toThrow(
      /No long journey/,
    );
  });
});

describe('a journey written as a little map', () => {
  it('is read mark by mark: the robot, the star, rocks, water, a bridge and plain ground', () => {
    expect(readMap(['S.#', '~=G'])).toEqual({
      columns: 3,
      rows: 2,
      start: [0, 0],
      goal: [2, 1],
      rocks: [[2, 0]],
      water: [[0, 1]],
      bridges: [[1, 1]],
    });
  });

  it.each([
    ['rows of different lengths', ['S..', '.G']],
    ['a mark that means nothing', ['S.?', '..G']],
    ['no robot', ['...', '..G']],
    ['no star', ['S..', '...']],
  ])('is refused when it has %s', (_what, lines) => {
    expect(() => readMap(lines)).toThrow(/A map/);
  });
});
