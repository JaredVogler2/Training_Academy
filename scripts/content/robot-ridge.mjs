// Robot Ridge's content pack: four activities about telling a robot how to get to a star.
//
//   one arrow, one move              each tap is carried out at once: what does this arrow do?
//   two and three steps in order     put the steps in a row first, then run them
//   do it again                      a short row of steps, done over, goes a long way
//   find the step that went wrong    a program with one wrong step: watch it, find the step, change it
//
// Each table row is one journey: the grid, where the robot starts and which way it faces, where the star is, the
// rocks, and a program that gets there. Every row is checked here, with the engine's own interpreter and solver,
// before it is written down: the program must arrive, nothing shorter may exist, a journey meant to need "again"
// must be impossible without it, and a program to mend must be one step away from one that works. A row that fails
// stops the build and says why.
//
// No grid has more than three rows, and no row of steps more than five places (four beside the "again" button):
// that is what can be seen and pressed on a small phone, upright or on its side. The world's rules
// (src/content/rules/robotRidge.ts) hold every journey to it.
//
// Some journeys are not written by hand: `makeJourney` draws one from a seed, and keeps drawing until the solver
// agrees it is exactly as long as was asked for. The same seed always gives the same journey.
//
// The engine is TypeScript and is read as it is, which Node does from version 22.18 on.

import { parseProgram, runProgram, solveProgram, writeProgram } from '../../src/engine/robot.ts';
import { rng } from './lib.mjs';

const ALL = ['forward', 'left', 'right'];
const FACINGS = ['north', 'east', 'south', 'west'];
const STEP = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };

/** Which game a journey is for, from how it is set up. */
const gameOf = (task) =>
  task.live ? 'live' : task.given !== undefined ? 'mend' : task.repeats > 1 ? 'again' : 'plan';

/**
 * The journey as a picture: what the world's page shows for the activity, and what the board is checked against.
 * It says which game it is too, so that the pictures of the four activities do not all look alike.
 */
const scene = (task) => ({
  type: 'scene',
  scene: 'grid',
  of: {
    game: gameOf(task),
    columns: task.grid.columns,
    rows: task.grid.rows,
    start: [...task.start.at],
    facing: task.start.facing,
    goal: [...task.goal],
    rocks: task.rocks.flat(),
  },
});

function fail(name, why) {
  throw new Error(`Robot Ridge, "${name}": ${why}`);
}

/** Everything a journey must be before it is written down. */
function verify(name, task, kind) {
  const shown = parseProgram(task.solution);
  if (!shown) fail(name, `"${task.solution}" is not a program`);
  if (runProgram(task, shown).outcome !== 'arrived')
    fail(name, 'the program shown does not arrive');
  const shortest = solveProgram(task);
  if (!shortest) fail(name, 'the solver finds no way there');
  if (shortest.commands.length !== shown.commands.length) {
    fail(
      name,
      `the solver gets there with ${writeProgram(shortest)}, shorter than ${task.solution}`,
    );
  }
  if (kind === 'repeat') {
    if (shown.times < 2) fail(name, 'the program shown does not do anything again');
    if (solveProgram({ ...task, repeats: 1 })) fail(name, 'it can be done without doing it again');
  }
  if (kind === 'mend') {
    const start = parseProgram(task.given);
    if (!start) fail(name, `"${task.given}" is not a program`);
    if (runProgram(task, start).outcome === 'arrived')
      fail(name, 'the program to mend already works');
    const differing = start.commands.filter((command, at) => command !== shown.commands[at]);
    if (start.commands.length !== shown.commands.length || differing.length !== 1) {
      fail(name, 'the program to mend is not one step away from the one that works');
    }
  }
}

const HINTS = {
  move: [
    { type: 'model', caption: 'rr.hint.route' },
    { type: 'reveal', caption: 'rr.move.hint.reveal' },
  ],
  steps: (parts) => [
    { type: 'model', caption: 'rr.hint.route' },
    { type: 'step', count: Math.min(1, parts - 1), caption: 'rr.steps.hint.step' },
    { type: 'reveal', caption: 'rr.steps.hint.reveal' },
  ],
  // The first part of a program that is done over is how many times: help gives that, and then the first step.
  repeat: (parts) => [
    { type: 'model', caption: 'rr.hint.route' },
    { type: 'step', count: Math.min(2, parts - 1), caption: 'rr.repeat.hint.step' },
    { type: 'reveal', caption: 'rr.steps.hint.reveal' },
  ],
  mend: [
    { type: 'model', caption: 'rr.mend.hint.model' },
    { type: 'reveal', caption: 'rr.mend.hint.reveal' },
  ],
};

const FEEDBACK = {
  move: { correct: 'rr.move.correct', incorrect: 'rr.move.incorrect' },
  steps: { correct: 'rr.steps.correct', incorrect: 'rr.steps.incorrect' },
  repeat: { correct: 'rr.repeat.correct', incorrect: 'rr.steps.incorrect' },
  mend: { correct: 'rr.mend.correct', incorrect: 'rr.mend.incorrect' },
};

/**
 * One journey as a challenge. `kind` is which activity it belongs to; `row` is the table row:
 * [name, variant, [columns, rows], [column, row, facing], [column, row], rocks, program, extra].
 */
function journey(lesson, skill, kind, row) {
  const [
    name,
    variant,
    [columns, rows],
    [column, line, facing],
    goal,
    rocks,
    solution,
    extra = {},
  ] = row;
  const steps = parseProgram(solution)?.commands.length ?? 0;
  const task = {
    type: 'program',
    grid: { columns, rows },
    start: { at: [column, line], facing },
    goal,
    rocks,
    commands: extra.commands ?? ALL,
    // Live, the places are power: enough for the journey and two moves to spare. Planned, there is at most one
    // place more than the journey needs, so that a plan cannot be padded out with guesses.
    slots:
      extra.slots ?? (kind === 'move' ? steps + 2 : kind === 'steps' ? Math.max(3, steps) : steps),
    repeats: extra.repeats ?? 1,
    live: kind === 'move',
    ...(extra.given ? { given: extra.given } : {}),
    solution,
  };
  verify(name, task, kind);
  const parts = solution.split('-').length;
  const hints = typeof HINTS[kind] === 'function' ? HINTS[kind](parts) : HINTS[kind];
  return {
    id: `${lesson}.${name}`,
    kind: 'make',
    skillId: skill,
    variant,
    prompt: { instruction: `rr.${kind}.instruction`, stimulus: scene(task) },
    task,
    // A program with a single step has nothing to give a part of.
    hints: hints.filter((hint) => hint.type !== 'step' || hint.count > 0),
    feedback: FEEDBACK[kind],
  };
}

function lesson({ id, skill, kind, title, summary, minutes, demo, guided, pool, count }) {
  const make = (row) => journey(id, skill, kind, row);
  const shown = demo.map(make);
  const supported = guided.map(make);
  const alone = pool.map(make);
  return {
    id,
    version: 1,
    world: 'robot-ridge',
    title,
    summary,
    skillIds: [skill],
    estimatedMinutes: minutes,
    plan: {
      demo: shown.map((challenge) => challenge.id),
      guided: supported.map((challenge) => challenge.id),
      independent: { pool: alone.map((challenge) => challenge.id), count, maxReprobes: 1 },
    },
    successCriteria: { independentFirstTryCorrect: count - 1 },
    challenges: [...shown, ...supported, ...alone],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// A journey from a seed
// ---------------------------------------------------------------------------------------------------------------------

const turned = (facing, command) =>
  FACINGS[(FACINGS.indexOf(facing) + (command === 'right' ? 1 : 3)) % 4];

/**
 * Draw a journey: a grid of the size asked for, a robot somewhere on it, a walk of exactly `steps` commands to a
 * star, and `rocks` rocks off the path. It is kept only if the solver agrees that nothing shorter gets there (and,
 * where a turn is asked for, that the shortest way has one); otherwise another is drawn. The same seed and the same
 * asking always give the same journey.
 */
export function makeJourney(seed, { columns, rows, steps, rocks = 0, turn = false }) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const random = rng(seed * 7919 + attempt);
    const start = { at: [random.int(columns), random.int(rows)], facing: random.pick(FACINGS) };
    // A walk: never off the grid, never a turn that undoes the turn before it, never ending on a turn.
    let pose = { at: [...start.at], facing: start.facing };
    const walked = [`${start.at[0]},${start.at[1]}`];
    const commands = [];
    for (let step = 0; step < steps; step++) {
      const last = commands.at(-1);
      const options = ALL.filter((command) => {
        if (command === 'forward') {
          const [dx, dy] = STEP[pose.facing];
          const [x, y] = [pose.at[0] + dx, pose.at[1] + dy];
          return x >= 0 && y >= 0 && x < columns && y < rows && !walked.includes(`${x},${y}`);
        }
        // Two turns running are never the short way, and the last step has to be a move.
        return step < steps - 1 && last !== 'left' && last !== 'right';
      });
      if (options.length === 0) break;
      const command = random.pick(options);
      commands.push(command);
      if (command === 'forward') {
        const [dx, dy] = STEP[pose.facing];
        pose = { at: [pose.at[0] + dx, pose.at[1] + dy], facing: pose.facing };
        walked.push(`${pose.at[0]},${pose.at[1]}`);
      } else {
        pose = { at: pose.at, facing: turned(pose.facing, command) };
      }
    }
    if (commands.length !== steps || commands.at(-1) !== 'forward') continue;

    const free = [];
    for (let column = 0; column < columns; column++) {
      for (let row = 0; row < rows; row++) {
        if (!walked.includes(`${column},${row}`)) free.push([column, row]);
      }
    }
    if (free.length < rocks) continue;
    const task = {
      type: 'program',
      grid: { columns, rows },
      start,
      goal: pose.at,
      rocks: random
        .shuffle(free)
        .slice(0, rocks)
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]),
      commands: ALL,
      slots: steps,
      repeats: 1,
      live: false,
      solution: writeProgram({ times: 1, commands }),
    };
    const shortest = solveProgram(task);
    if (!shortest || shortest.commands.length !== steps) continue;
    if (turn && shortest.commands.every((command) => command === 'forward')) continue;
    return { ...task, solution: writeProgram(shortest) };
  }
  throw new Error(`No journey could be drawn for seed ${seed}.`);
}

/** A drawn journey as a table row. */
function drawn(name, variant, seed, asking) {
  const task = makeJourney(seed, asking);
  return [
    name,
    variant,
    [task.grid.columns, task.grid.rows],
    [...task.start.at, task.start.facing],
    task.goal,
    task.rocks,
    task.solution,
  ];
}

// ---------------------------------------------------------------------------------------------------------------------
// The four activities
// ---------------------------------------------------------------------------------------------------------------------

const move = () =>
  lesson({
    id: 'rr-move-01',
    skill: 'coding.commands.one-move',
    kind: 'move',
    title: 'One arrow, one move',
    summary:
      'Each tap of an arrow is carried out at once, so your child sees what it does: forward moves the robot one square the way it is facing, a turn only turns it. The robot has power for a few moves more than the journey needs.',
    minutes: 3,
    demo: [
      [
        'demo-two-along',
        'straight',
        [3, 1],
        [0, 0, 'east'],
        [2, 0],
        [],
        'f-f',
        { commands: ['forward'], slots: 2 },
      ],
    ],
    guided: [
      // Only one arrow to tap, and nowhere to go wrong: what does it do?
      [
        'guided-three-along',
        'straight',
        [4, 1],
        [0, 0, 'east'],
        [3, 0],
        [],
        'f-f-f',
        { commands: ['forward'], slots: 4 },
      ],
      [
        'guided-round-the-corner',
        'one-turn',
        [2, 2],
        [0, 1, 'north'],
        [1, 0],
        [],
        'f-r-f',
        { slots: 6 },
      ],
    ],
    pool: [
      ['two-along', 'straight', [3, 1], [0, 0, 'east'], [2, 0], [], 'f-f'],
      ['two-down', 'straight', [2, 3], [1, 0, 'south'], [1, 2], [[0, 1]], 'f-f'],
      ['up-at-the-end', 'one-turn', [3, 2], [0, 1, 'east'], [2, 0], [], 'f-f-l-f'],
      ['along-the-top', 'one-turn', [2, 3], [0, 2, 'north'], [1, 0], [], 'f-f-r-f'],
      ['turn-right-first', 'turn-first', [3, 1], [0, 0, 'north'], [2, 0], [], 'r-f-f'],
      ['turn-left-first', 'turn-first', [2, 3], [1, 0, 'west'], [1, 2], [], 'l-f-f'],
      ['turn-all-the-way-round', 'turn-round', [3, 1], [1, 0, 'west'], [2, 0], [], 'l-l-f'],
    ],
    count: 3,
  });

const steps = () =>
  lesson({
    id: 'rr-steps-01',
    skill: 'coding.sequence.plan-short',
    kind: 'steps',
    title: 'Two and three steps in order',
    summary:
      'Now the steps are put in a row first and run afterwards. Your child plans two or three commands, presses go, and watches the robot carry them out one by one. A plan that does not arrive is changed and run again.',
    minutes: 3,
    // Shown from the far end, and then asked from the near one: forward is the way the robot is looking, whichever
    // way that is on the screen. (This journey is also the activity's picture on the world's page; one row of
    // ground keeps it large there.)
    demo: [['demo-two-back', 'two-steps', [3, 1], [2, 0, 'west'], [0, 0], [], 'f-f']],
    guided: [
      ['guided-two-along', 'two-steps', [3, 1], [0, 0, 'east'], [2, 0], [], 'f-f'],
      ['guided-round-the-corner', 'three-steps', [2, 2], [0, 1, 'north'], [1, 0], [], 'f-r-f'],
    ],
    pool: [
      ['two-up', 'two-steps', [2, 3], [0, 2, 'north'], [0, 0], [[1, 1]], 'f-f'],
      ['two-down', 'two-steps', [2, 3], [1, 0, 'south'], [1, 2], [], 'f-f'],
      ['turn-then-go', 'turn-and-go', [3, 2], [0, 0, 'north'], [1, 0], [], 'r-f'],
      ['left-then-go', 'turn-and-go', [2, 2], [1, 1, 'north'], [0, 1], [], 'l-f'],
      ['corner-to-the-left', 'three-steps', [2, 2], [1, 1, 'north'], [0, 0], [], 'f-l-f'],
      ['corner-to-the-right', 'three-steps', [2, 2], [0, 0, 'east'], [1, 1], [], 'f-r-f'],
      ['three-along', 'three-straight', [4, 1], [0, 0, 'east'], [3, 0], [], 'f-f-f'],
      ['turn-and-two', 'three-steps', [3, 2], [0, 1, 'north'], [2, 1], [], 'r-f-f'],
      // Three drawn from seeds: three steps with a turn among them, on a grid with rocks to go round.
      drawn('drawn-one', 'three-steps-rocks', 5, {
        columns: 3,
        rows: 3,
        steps: 3,
        rocks: 2,
        turn: true,
      }),
      drawn('drawn-two', 'three-steps-rocks', 8, {
        columns: 3,
        rows: 3,
        steps: 3,
        rocks: 2,
        turn: true,
      }),
      drawn('drawn-three', 'three-steps-rocks', 42, {
        columns: 4,
        rows: 2,
        steps: 3,
        rocks: 1,
        turn: true,
      }),
    ],
    count: 3,
  });

const repeat = () =>
  lesson({
    id: 'rr-repeat-01',
    skill: 'coding.repeat.do-again',
    kind: 'repeat',
    title: 'Do it again',
    summary:
      'The star is too far for the few steps there is room for. Your child makes a short row of steps and uses the again button, which shows how many times as dots, to have the robot do them over. None of these can be done without it.',
    minutes: 4,
    demo: [
      [
        'demo-a-long-way',
        'one-step-many-times',
        [5, 1],
        [0, 0, 'east'],
        [4, 0],
        [],
        'x4-f',
        { repeats: 4 },
      ],
    ],
    guided: [
      [
        'guided-three-along',
        'one-step-many-times',
        [4, 1],
        [0, 0, 'east'],
        [3, 0],
        [],
        'x3-f',
        { repeats: 4 },
      ],
      [
        'guided-two-twice',
        'two-steps-twice',
        [5, 1],
        [4, 0, 'west'],
        [0, 0],
        [],
        'x2-f-f',
        { repeats: 2 },
      ],
    ],
    pool: [
      // One step, and how many times: four, three and two. Too many drives the robot at the edge.
      [
        'four-back',
        'one-step-many-times',
        [5, 2],
        [4, 0, 'west'],
        [0, 0],
        [[2, 1]],
        'x4-f',
        { repeats: 4 },
      ],
      [
        'three-back',
        'one-step-many-times',
        [4, 2],
        [3, 1, 'west'],
        [0, 1],
        [[1, 0]],
        'x3-f',
        { repeats: 4 },
      ],
      [
        'two-down',
        'one-step-many-times',
        [2, 3],
        [1, 0, 'south'],
        [1, 2],
        [],
        'x2-f',
        { repeats: 4 },
      ],
      [
        'two-twice-along',
        'two-steps-twice',
        [5, 1],
        [0, 0, 'east'],
        [4, 0],
        [],
        'x2-f-f',
        { repeats: 2 },
      ],
      [
        'stairs-up',
        'stairs',
        [3, 3],
        [0, 2, 'east'],
        [2, 0],
        [[2, 2]],
        'x2-f-l-f-r',
        { repeats: 2 },
      ],
      [
        'stairs-down',
        'stairs',
        [3, 3],
        [0, 0, 'east'],
        [2, 2],
        [[2, 0]],
        'x2-f-r-f-l',
        { repeats: 2 },
      ],
      [
        'round-the-pond',
        'round-and-round',
        [3, 3],
        [0, 2, 'north'],
        [2, 2],
        [
          [1, 1],
          [1, 2],
        ],
        'x3-f-f-r',
        { repeats: 3 },
      ],
    ],
    count: 3,
  });

const mend = () =>
  lesson({
    id: 'rr-mend-01',
    skill: 'coding.debug.mend-one-step',
    kind: 'mend',
    title: 'Find the step that went wrong',
    summary:
      'A row of steps is already there, and one of them is wrong. The robot runs it and your child sees where it goes astray, takes out the one wrong step and puts the right one in. Finding the step is the point: one change mends each of these.',
    minutes: 4,
    demo: [
      [
        'demo-wrong-turn',
        'wrong-turn',
        [2, 2],
        [0, 1, 'north'],
        [1, 0],
        [],
        'f-r-f',
        { given: 'f-l-f' },
      ],
    ],
    guided: [
      [
        'guided-turned-too-soon',
        'turned-instead',
        [4, 2],
        [0, 1, 'east'],
        [3, 1],
        [],
        'f-f-f',
        { given: 'f-l-f' },
      ],
      [
        'guided-wrong-way-first',
        'wrong-turn',
        [2, 3],
        [1, 0, 'west'],
        [1, 2],
        [],
        'l-f-f',
        { given: 'r-f-f' },
      ],
    ],
    pool: [
      [
        'left-for-right',
        'wrong-turn',
        [3, 2],
        [0, 1, 'north'],
        [2, 0],
        [],
        'f-r-f-f',
        { given: 'f-l-f-f' },
      ],
      [
        'right-for-left',
        'wrong-turn',
        [3, 3],
        [2, 2, 'north'],
        [0, 0],
        [],
        'f-f-l-f-f',
        { given: 'f-f-r-f-f' },
      ],
      [
        'turned-instead-of-going-on',
        'turned-instead',
        [4, 2],
        [0, 0, 'east'],
        [3, 0],
        [],
        'f-f-f',
        { given: 'f-r-f' },
      ],
      [
        'went-straight-off-the-edge',
        'went-straight',
        [3, 3],
        [0, 2, 'north'],
        [2, 0],
        [[1, 1]],
        'f-f-r-f-f',
        { given: 'f-f-f-f-f' },
      ],
      [
        'went-straight-into-a-rock',
        'went-straight',
        [3, 2],
        [0, 1, 'east'],
        [1, 0],
        [[2, 1]],
        'f-l-f',
        { given: 'f-f-f' },
      ],
      [
        'turned-at-the-last',
        'turned-instead',
        [2, 3],
        [0, 2, 'north'],
        [1, 0],
        [],
        'f-f-r-f',
        { given: 'f-f-r-r' },
      ],
    ],
    count: 3,
  });

// ---------------------------------------------------------------------------------------------------------------------
// The pack
// ---------------------------------------------------------------------------------------------------------------------

const SKILLS = [
  {
    id: 'coding.commands.one-move',
    world: 'robot-ridge',
    strand: 'coding',
    title: 'Know what each arrow does',
    objective:
      'Takes the robot to a goal one command at a time: knows that forward moves it one square the way it is facing, and that a turn changes the way it faces without moving it.',
    prerequisites: [],
  },
  {
    id: 'coding.sequence.plan-short',
    world: 'robot-ridge',
    strand: 'coding',
    title: 'Plan two or three steps',
    objective:
      'Puts two or three commands in order before any of them is carried out, so that the robot reaches the goal when the program is run.',
    prerequisites: ['coding.commands.one-move'],
  },
  {
    id: 'coding.repeat.do-again',
    world: 'robot-ridge',
    strand: 'coding',
    title: 'Make steps happen again',
    objective:
      'Uses "do it again" so that a short program takes the robot a long way, on journeys that are too long for the program without it.',
    prerequisites: ['coding.sequence.plan-short'],
  },
  {
    id: 'coding.debug.mend-one-step',
    world: 'robot-ridge',
    strand: 'coding',
    title: 'Find and mend a wrong step',
    objective:
      'Watches a program go wrong, finds the one step that sends the robot the wrong way, and changes that step so that the robot arrives.',
    prerequisites: ['coding.sequence.plan-short'],
  },
];

const STRINGS = {
  'rr.hint.route': 'Watch the way to the star.',
  'rr.move.instruction': 'Tap an arrow. Take the robot to the star.',
  'rr.move.correct': 'Yes. The robot is at the star.',
  'rr.move.incorrect': 'The robot has run out of power. Back to the start.',
  'rr.move.hint.reveal': 'Tap the arrow I point to.',
  'rr.steps.instruction': 'Put the arrows in order. Then press go.',
  'rr.steps.correct': 'Yes. Your steps took the robot to the star.',
  'rr.steps.incorrect': 'Not at the star yet. Change a step and try again.',
  'rr.steps.hint.step': 'Here is the first step.',
  'rr.steps.hint.reveal': 'Here are all the steps. Put them in.',
  'rr.repeat.instruction': 'The star is far away. Make your steps. Then tap the again button.',
  'rr.repeat.correct': 'Yes. The same steps, again and again.',
  'rr.repeat.hint.step': 'Here is how to start.',
  'rr.mend.instruction': 'One step is wrong. Watch the robot. Then change that step.',
  'rr.mend.correct': 'Yes. You found the wrong step and changed it.',
  'rr.mend.incorrect': 'Still not at the star. Look for the step that went wrong.',
  'rr.mend.hint.model': 'Watch again. Where does it go wrong?',
  'rr.mend.hint.reveal': 'This is the step to change.',
};

export function buildRobotRidgePack() {
  return {
    format: 'training-academy.content-pack',
    schemaVersion: 1,
    id: 'robot-ridge',
    world: 'robot-ridge',
    contentVersion: 1,
    strings: { en: STRINGS },
    skills: SKILLS,
    lessons: [move(), steps(), repeat(), mend()],
  };
}
