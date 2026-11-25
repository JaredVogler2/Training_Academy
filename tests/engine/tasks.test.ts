import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_TRIES,
  cardIdsOf,
  getHint,
  getNextChallenge,
  judgeTask,
  parseProgram,
  readDesign,
  runProgram,
  solutionOf,
  solutionParts,
  solveProgram,
  submitAttempt,
  testDesign,
  tokensOf,
  writeProgram,
  writeTokens,
  type ChallengeView,
  type LessonSession,
  type ProgramTask,
  type Task,
} from '@/engine';
import { T0, answerTo, dayOf, newSession, play, wrongAnswerTo } from '../helpers/content';
import { fixtureLesson } from '../helpers/fixturePack';

const lesson = fixtureLesson();

function taskOf(name: string): Task {
  const challenge = lesson.challenges.find((candidate) => candidate.id.endsWith(`.${name}`));
  if (challenge?.kind !== 'make') throw new Error(`No thing to make called ${name}.`);
  return challenge.task;
}

describe('writing an answer down', () => {
  it('joins the parts with a hyphen and splits them again', () => {
    expect(writeTokens(['seed', 'sprout', 'flower'])).toBe('seed-sprout-flower');
    expect(tokensOf('seed-sprout-flower')).toEqual(['seed', 'sprout', 'flower']);
  });

  it('writes an answer with nothing in it as a word, so that it is still an answer', () => {
    expect(writeTokens([])).toBe('none');
    expect(tokensOf('none')).toEqual([]);
  });
});

describe('giving out so many', () => {
  const task = taskOf('give-four');

  it('is right when exactly as many are given as there are friends', () => {
    expect(judgeTask(task, '4')).toEqual({ correct: true, clean: true });
    expect(solutionOf(task)).toBe('4');
  });

  it('says how far off a wrong amount was', () => {
    expect(judgeTask(task, '5')?.misconception).toBe('one-more');
    expect(judgeTask(task, '3')?.misconception).toBe('one-fewer');
    expect(judgeTask(task, '7')?.misconception).toBe('many-more');
    expect(judgeTask(task, '1')?.misconception).toBe('many-fewer');
    expect(judgeTask(task, '0')?.correct).toBe(false);
  });

  it('refuses an answer that could not have been given', () => {
    expect(judgeTask(task, '8')).toBeNull(); // more than the pile holds
    expect(judgeTask(task, 'four')).toBeNull();
    expect(judgeTask(task, '-1')).toBeNull();
    expect(judgeTask(task, '04')).toBeNull();
  });

  it('can be given one at a time by a hint', () => {
    expect(solutionParts(task)).toEqual(['1', '2', '3', '4']);
  });
});

describe('putting cards in order', () => {
  const task = taskOf('order-three');

  it('is right only in the one order', () => {
    expect(judgeTask(task, 'seed-sprout-flower')).toEqual({ correct: true, clean: true });
    expect(judgeTask(task, 'sprout-seed-flower')?.correct).toBe(false);
  });

  it('says which cards of a wrong order are already in their places', () => {
    expect(judgeTask(task, 'seed-flower-sprout')).toMatchObject({
      correct: false,
      misconception: 'start-right',
      right: ['seed'],
    });
    expect(judgeTask(task, 'sprout-seed-flower')).toMatchObject({
      misconception: 'end-right',
      right: ['flower'],
    });
    expect(judgeTask(task, 'flower-seed-sprout')).toMatchObject({
      misconception: 'out-of-order',
      right: [],
    });
  });

  it('refuses an order that leaves a card out, uses one twice or uses one that is not there', () => {
    expect(judgeTask(task, 'seed-sprout')).toBeNull();
    expect(judgeTask(task, 'seed-seed-flower')).toBeNull();
    expect(judgeTask(task, 'seed-sprout-tree')).toBeNull();
    expect(judgeTask(task, 'none')).toBeNull();
  });
});

describe('doing again what was shown', () => {
  const task = taskOf('echo-three');

  it('is right when the same things are tapped in the same order', () => {
    expect(judgeTask(task, 'bee-owl-bat')).toEqual({ correct: true, clean: true });
  });

  it('tells the right things in the wrong order from the wrong things', () => {
    expect(judgeTask(task, 'owl-bee-bat')?.misconception).toBe('right-things-wrong-order');
    expect(judgeTask(task, 'bee-owl-fox')?.misconception).toBe('wrong-things');
  });

  it('refuses a different number of taps, or a tap on something that is not there', () => {
    expect(judgeTask(task, 'bee-owl')).toBeNull();
    expect(judgeTask(task, 'bee-owl-bat-fox')).toBeNull();
    expect(judgeTask(task, 'bee-owl-cat')).toBeNull();
  });
});

describe('picking out the ones that belong', () => {
  const task = taskOf('select-two');

  it('is right whatever order they were picked in', () => {
    expect(judgeTask(task, 'cat-hat')?.correct).toBe(true);
    expect(judgeTask(task, 'hat-cat')?.correct).toBe(true);
    expect(solutionOf(task)).toBe('cat-hat');
  });

  it('says what was wrong with a wrong pick, and which of the picks did belong', () => {
    expect(judgeTask(task, 'cat')).toMatchObject({ misconception: 'some-missed', right: ['cat'] });
    expect(judgeTask(task, 'cat-dog-hat')).toMatchObject({
      misconception: 'too-many',
      right: ['cat', 'hat'],
    });
    expect(judgeTask(task, 'cat-dog')).toMatchObject({ misconception: 'mixed-up', right: ['cat'] });
  });

  it('refuses nothing at all, a card picked twice, or one that is not there', () => {
    expect(judgeTask(task, 'none')).toBeNull();
    expect(judgeTask(task, 'cat-cat')).toBeNull();
    expect(judgeTask(task, 'cat-fish')).toBeNull();
  });
});

describe('finding the pairs', () => {
  const task = taskOf('pairs-three');

  it('is always right once every pair is found, and clean only if few turns were needed', () => {
    expect(judgeTask(task, '3')).toEqual({ correct: true, clean: true });
    expect(judgeTask(task, '6')).toEqual({ correct: true, clean: true });
    expect(judgeTask(task, '7')).toEqual({ correct: true, clean: false });
  });

  it('refuses fewer turns than there are pairs: nobody can have found them', () => {
    expect(judgeTask(task, '2')).toBeNull();
  });

  it('has no answer to show, and lays out two of every card', () => {
    expect(solutionOf(task)).toBeNull();
    expect(solutionParts(task)).toEqual([]);
    expect(cardIdsOf(task).sort()).toEqual(['moon', 'moon', 'star', 'star', 'sun', 'sun']);
  });
});

describe("a robot's program", () => {
  const task = taskOf('round-the-rock');
  if (task.type !== 'program') throw new Error('Expected a program.');

  it('is read from the way it is written, and written back the same', () => {
    expect(parseProgram('f-f-r-f')).toEqual({
      times: 1,
      commands: ['forward', 'forward', 'right', 'forward'],
    });
    expect(parseProgram('x3-f-l')).toEqual({ times: 3, commands: ['forward', 'left'] });
    for (const text of ['f', 'x2-f', 'l-r-f-f', 'x4-f-f-r']) {
      expect(writeProgram(parseProgram(text)!)).toBe(text);
    }
    for (const text of ['', 'none', 'x1-f', 'x5-f', 'f-', 'f--l', 'forward', 'x3', 'F']) {
      expect(parseProgram(text), text).toBeNull();
    }
  });

  it('is right when it gets the robot there, by whatever road', () => {
    expect(judgeTask(task, 'f-f-r-f-f')).toEqual({ correct: true, clean: true });
    // The other way round the rock is as good.
    expect(judgeTask(task, 'r-f-f-l-f-f')).toEqual({ correct: true, clean: true });
  });

  it('says what went wrong with a program that does not get there', () => {
    expect(judgeTask(task, 'f-f')).toMatchObject({
      correct: false,
      misconception: 'stopped-short',
    });
    expect(judgeTask(task, 'f-r-f')).toMatchObject({ correct: false, misconception: 'hit-a-rock' });
    expect(judgeTask(task, 'f-f-f')).toMatchObject({
      correct: false,
      misconception: 'left-the-grid',
    });
  });

  it('refuses a program the task gives no way to build', () => {
    expect(judgeTask(task, 'f-f-f-f-f-f-f')).toBeNull(); // more commands than there are places
    expect(judgeTask(task, 'x2-f-r')).toBeNull(); // this task has no doing it again
    expect(judgeTask(task, 'jump')).toBeNull();
  });

  it('stops where it arrives: what is left of the program is not needed', () => {
    const run = runProgram(task, parseProgram('f-f-r-f-f-f')!);
    expect(run.outcome).toBe('arrived');
    expect(run.moves).toHaveLength(5);
    expect(run.pose).toEqual({ at: [2, 0], facing: 'east' });
  });

  it('stops at a rock or the edge without moving, so the step that went wrong is the last one shown', () => {
    const rock = runProgram(task, parseProgram('f-r-f-f')!);
    expect(rock.outcome).toBe('hit-a-rock');
    expect(rock.moves.at(-1)).toMatchObject({ index: 2, moved: false, pose: { at: [0, 1] } });
    const edge = runProgram(task, parseProgram('l-f')!);
    expect(edge.outcome).toBe('left-the-grid');
    expect(edge.pose.at).toEqual([0, 2]);
  });

  it('does a program over as many times as it is told to', () => {
    const stairs: ProgramTask = {
      type: 'program',
      grid: { columns: 4, rows: 4 },
      start: { at: [0, 3], facing: 'east' },
      goal: [3, 0],
      rocks: [],
      commands: ['forward', 'left', 'right'],
      slots: 4,
      repeats: 3,
      live: false,
      solution: 'x3-f-l-f-r',
    };
    const run = runProgram(stairs, parseProgram('x3-f-l-f-r')!);
    expect(run.outcome).toBe('arrived');
    expect(run.moves.map((move) => move.round)).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2]);
    expect(judgeTask(stairs, 'f-l-f-r')?.misconception).toBe('stopped-short');
    // Twelve steps do not fit in four places: only doing it again gets there. (Straight along and straight up,
    // twice over, is as good as the staircase.)
    const found = solveProgram(stairs)!;
    expect(found.times).toBeGreaterThan(1);
    expect(found.commands).toHaveLength(4);
    expect(runProgram(stairs, found).outcome).toBe('arrived');
    expect(solveProgram({ ...stairs, repeats: 1 })).toBeNull();
  });

  it('can be solved, and the answer the task shows is as short as any', () => {
    expect(solveProgram(task)?.commands).toHaveLength(5);
    const walled = {
      ...task,
      rocks: [
        [0, 1],
        [1, 2],
      ] as [number, number][],
    };
    expect(solveProgram(walled)).toBeNull();
  });

  it('never throws and never runs for ever, whatever program it is given', () => {
    const programs = fc
      .record({
        times: fc.integer({ min: 1, max: 4 }),
        commands: fc.array(fc.constantFrom('forward' as const, 'left' as const, 'right' as const), {
          minLength: 1,
          maxLength: 8,
        }),
      })
      .map(writeProgram);
    fc.assert(
      fc.property(programs, (text) => {
        const program = parseProgram(text)!;
        const run = runProgram(task, program);
        expect(run.moves.length).toBeLessThanOrEqual(program.times * program.commands.length);
        const [column, row] = run.pose.at;
        expect(column >= 0 && column < 3 && row >= 0 && row < 3).toBe(true);
        expect(run.pose.at).not.toEqual([1, 1]);
      }),
    );
  });
});

describe('a design on a workbench', () => {
  const task = taskOf('ramp');
  if (task.type !== 'design') throw new Error('Expected a design.');

  it('is right when the model says it works, and says what happened when it does not', () => {
    expect(judgeTask(task, 'mid')).toEqual({ correct: true, clean: true });
    expect(judgeTask(task, 'low')).toMatchObject({ correct: false, misconception: 'rolled-short' });
    expect(judgeTask(task, 'high')).toMatchObject({ correct: false, misconception: 'rolled-past' });
  });

  it('does the same thing every time, and changes with what is fixed', () => {
    expect(testDesign(task, ['mid'])).toEqual(testDesign(task, ['mid']));
    const rough = { ...task, given: { surface: 'rough', target: 2 } };
    expect(testDesign(rough, ['mid'])).toEqual({ works: true, outcome: 'landed' });
    expect(testDesign(rough, ['low'])?.outcome).toBe('rolled-short');
  });

  it('refuses a choice the controls do not offer', () => {
    expect(judgeTask(task, 'huge')).toBeNull();
    expect(judgeTask(task, 'mid-mid')).toBeNull();
    expect(judgeTask(task, 'none')).toBeNull();
    expect(readDesign(task, ['mid'])).toEqual({ height: 'mid' });
  });
});

describe('every kind of task', () => {
  const tasks = lesson.challenges.flatMap((challenge) =>
    challenge.kind === 'make' ? [challenge.task] : [],
  );

  it('judges its own answer right', () => {
    for (const task of tasks) {
      const solution = solutionOf(task);
      if (solution !== null) expect(judgeTask(task, solution)?.correct, task.type).toBe(true);
    }
  });

  it('never throws, whatever it is handed', () => {
    fc.assert(
      fc.property(fc.constantFrom(...tasks), fc.string(), (task, response) => {
        const judged = judgeTask(task, response);
        expect(judged === null || typeof judged.correct === 'boolean').toBe(true);
      }),
    );
  });

  it('gives its answer back whole when all of its parts are joined', () => {
    for (const task of tasks) {
      const solution = solutionOf(task);
      if (solution === null || task.type === 'give') continue;
      expect(writeTokens(solutionParts(task))).toBe(solution);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// A sitting of a lesson made of things to make
// ---------------------------------------------------------------------------------------------------------------------

function viewOf(session: LessonSession): ChallengeView {
  const view = getNextChallenge(session, lesson);
  if (!view) throw new Error('Expected a challenge.');
  return view;
}

function answer(session: LessonSession, response: string) {
  return submitAttempt(session, lesson, {
    key: viewOf(session).key,
    response,
    now: T0 + 1000,
    day: dayOf(T0),
    durationMs: 1800,
  });
}

/** A session moved on until it shows the challenge with this name. */
function reach(name: string, seed = 3): LessonSession {
  let session = newSession(lesson, seed);
  for (let guard = 0; guard < 40; guard++) {
    const view = viewOf(session);
    if (view.challenge.id.endsWith(`.${name}`)) return session;
    const result = play(
      lesson,
      session,
      (shown) => ({ type: 'answer', response: answerTo(shown) }),
      {
        maxMoves: 1,
      },
    );
    session = result.session;
  }
  throw new Error(`Never reached ${name}.`);
}

describe('a thing to make, in a lesson', () => {
  it('is shown being made in a demonstration: the whole answer is there to show', () => {
    const view = viewOf(newSession(lesson));
    expect(view.stage).toBe('demo');
    expect(view.shownAnswer).toBe('3');
    expect(view.choices).toEqual([]);
  });

  it('shows no answer and gives no part of it when it is asked', () => {
    const view = viewOf(reach('order-three'));
    expect(view.shownAnswer).toBeNull();
    expect(view.given).toEqual([]);
  });

  it('deals cards to be put in order in some other order, the same every time', () => {
    for (let seed = 0; seed < 40; seed++) {
      const session = reach('order-three', seed);
      const { cards } = viewOf(session);
      expect([...cards].sort()).toEqual(['flower', 'seed', 'sprout']);
      expect(cards).not.toEqual(['seed', 'sprout', 'flower']);
      expect(viewOf(session).cards).toEqual(cards);
    }
  });

  it('leaves what is to be echoed in the places it was shown in', () => {
    expect(viewOf(reach('echo-two')).cards).toEqual(['owl', 'fox', 'bat']);
  });

  it('lets a wrong answer be changed and tried again, and keeps the right parts of it', () => {
    const session = reach('order-three');
    const wrong = answer(session, 'seed-flower-sprout');
    if (!wrong.accepted) throw new Error(wrong.reason);
    expect(wrong.feedback).toMatchObject({ outcome: 'incorrect', next: 'retry', right: ['seed'] });
    expect(wrong.attempt).toMatchObject({ outcome: 'incorrect', response: 'seed-flower-sprout' });
    expect(wrong.session.cursor).toBe(session.cursor);
    expect(viewOf(wrong.session).tryIndex).toBe(1);

    const right = answer(wrong.session, 'seed-sprout-flower');
    if (!right.accepted) throw new Error(right.reason);
    expect(right.feedback.outcome).toBe('correct');
    // Right at the second try is a solve with help, never independent evidence.
    expect(right.feedback.independent).toBe(false);
    expect(right.session.tally.assistedSolves).toBe(1);
  });

  it('shows the answer after a few wrong tries, so that nobody is ever stuck', () => {
    let session = reach('give-four');
    for (let attempt = 0; attempt < DEFAULT_MAX_TRIES; attempt++) {
      expect(viewOf(session).shownAnswer).toBeNull();
      const result = answer(session, '2');
      if (!result.accepted) throw new Error(result.reason);
      expect(result.feedback.revealed).toBe(attempt === DEFAULT_MAX_TRIES - 1);
      session = result.session;
    }
    expect(viewOf(session).shownAnswer).toBe('4');
    const last = answer(session, '4');
    if (!last.accepted) throw new Error(last.reason);
    expect(last.feedback).toMatchObject({ outcome: 'correct', independent: false });
  });

  it('gives the answer part by part as help is asked for, and then whole', () => {
    let session = reach('order-four');
    const ladder = ['model', 'step', 'reveal'];
    const given: string[][] = [];
    for (const rung of ladder) {
      const result = getHint(session, lesson, T0);
      expect(result.hint?.type).toBe(rung);
      session = result.session;
      given.push(viewOf(session).given);
    }
    expect(given).toEqual([[], ['egg'], ['egg']]);
    expect(viewOf(session).shownAnswer).toBe('egg-chick-hen-nest');
    expect(getHint(session, lesson, T0).hint).toBeNull();

    const result = answer(session, 'egg-chick-hen-nest');
    if (!result.accepted) throw new Error(result.reason);
    expect(result.attempt).toMatchObject({ assistance: 'hint', hintLevel: 3 });
    expect(result.feedback.independent).toBe(false);
  });

  it('refuses an answer the task could not be given, and records nothing', () => {
    const session = reach('order-three');
    expect(answer(session, 'seed-sprout')).toMatchObject({ accepted: false, reason: 'malformed' });
    expect(answer(session, 'a')).toMatchObject({ accepted: false, reason: 'malformed' });
  });

  it('counts pairs found with a great many turns as done, but not as independent evidence', () => {
    const session = reach('pairs-three');
    expect(viewOf(session).stage).toBe('independent');
    const slow = answer(session, '9');
    if (!slow.accepted) throw new Error(slow.reason);
    expect(slow.feedback).toMatchObject({ outcome: 'correct', independent: false });
    expect(slow.session.tally.assistedSolves).toBe(1);

    const quick = answer(session, '5');
    if (!quick.accepted) throw new Error(quick.reason);
    expect(quick.feedback).toMatchObject({ outcome: 'correct', independent: true });
  });

  it('can be played from end to end by answering every step rightly, or wrongly first', () => {
    const clean = play(lesson, newSession(lesson, 11), (view) => ({
      type: 'answer',
      response: answerTo(view),
    }));
    expect(clean.session.status).toBe('completed');
    expect(clean.session.tally.independentFirstTryCorrect).toBe(11);

    const stumbling = play(lesson, newSession(lesson, 12), (view) => ({
      type: 'answer',
      response: (view.tryIndex === 0 ? wrongAnswerTo(view) : null) ?? answerTo(view),
    }));
    expect(stumbling.session.status).toBe('completed');
    // Pairs cannot be answered wrongly; everything else was.
    expect(stumbling.session.tally.independentFirstTryCorrect).toBe(1);
  });
});
