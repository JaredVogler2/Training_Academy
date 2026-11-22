import { beforeEach, describe, expect, it } from 'vitest';
import { getSkillEvidence, isIndependentSuccess, type Lesson } from '@/engine';
import { LessonRunner, type RunnerDeps, type RunnerState } from '@/game/lessonRunner';
import { MemoryDriver, Repository, StorageError, migrate, type WriteOp } from '@/storage';
import { T0, numberGardenPack, sampleLesson } from '../helpers/content';

const pack = numberGardenPack();
const lesson = sampleLesson();
const PROFILE = 'player-1';

type Playing = Extract<RunnerState, { phase: 'playing' }>;

function playing(runner: LessonRunner): Playing {
  const state = runner.getState();
  if (state.phase !== 'playing') throw new Error(`Expected to be playing, was ${state.phase}.`);
  return state;
}

/** A driver that can be told to fail its next writes. */
class FlakyDriver extends MemoryDriver {
  failWith: Error | null = null;
  writes = 0;

  override write(ops: readonly WriteOp[]): Promise<void> {
    this.writes += 1;
    if (this.failWith) return Promise.reject(this.failWith);
    return super.write(ops);
  }
}

interface World {
  driver: FlakyDriver;
  repository: Repository;
  clock: { now: number };
  errors: unknown[];
  deps(overrides?: Partial<RunnerDeps>): RunnerDeps;
}

async function world(driver: FlakyDriver = new FlakyDriver()): Promise<World> {
  await migrate(driver);
  const clock = { now: T0 };
  let ids = 0;
  let seeds = 100;
  const repository = new Repository({ driver, now: () => clock.now, newId: () => `id-${++ids}` });
  const errors: unknown[] = [];
  return {
    driver,
    repository,
    clock,
    errors,
    deps: (overrides = {}) => ({
      repository,
      pack,
      lesson,
      profileId: PROFILE,
      now: () => (clock.now += 1000),
      newId: () => `session-${++ids}`,
      newSeed: () => ++seeds,
      localDay: (at) => new Date(at).toISOString().slice(0, 10),
      elapsed: () => clock.now,
      onSaveError: (error) => errors.push(error),
      ...overrides,
    }),
  };
}

/** Answer every question correctly at the first try until the lesson ends. */
async function finish(runner: LessonRunner): Promise<void> {
  for (let guard = 0; guard < 50; guard++) {
    const state = runner.getState();
    if (state.phase === 'finished') return;
    if (state.view.stage === 'demo' || state.answered) await runner.next();
    else await runner.answer(state.view.challenge.answer);
  }
  throw new Error('The lesson did not finish.');
}

describe('LessonRunner', () => {
  let w: World;
  beforeEach(async () => {
    w = await world();
  });

  it('starts a new sitting with the demonstration and saves it at once', async () => {
    const runner = await LessonRunner.start(w.deps());
    const state = playing(runner);
    expect(state.view.stage).toBe('demo');
    expect(state).toMatchObject({ feedback: null, hint: null, answered: false, saved: true });
    expect(await w.repository.findActiveSession(PROFILE, lesson.id)).not.toBeNull();
  });

  it('plays a whole lesson, saving a record of every answer', async () => {
    const runner = await LessonRunner.start(w.deps());
    await finish(runner);
    const state = runner.getState();
    expect(state).toMatchObject({
      phase: 'finished',
      saved: true,
      summary: { completed: true, independentFirstTryCorrect: 3, metSuccessCriteria: true },
    });
    const attempts = await w.repository.listAttempts(PROFILE);
    expect(attempts).toHaveLength(5);
    expect(attempts.filter(isIndependentSuccess)).toHaveLength(3);
    expect(await w.repository.findActiveSession(PROFILE, lesson.id)).toBeNull();
    expect(getSkillEvidence(attempts, 'math.quantity.match-sets-to-3').status).toBe(
      'provisionally-independent',
    );
  });

  it('keeps a correctly answered challenge on screen until the child moves on', async () => {
    const runner = await LessonRunner.start(w.deps());
    await runner.next();
    const before = playing(runner);
    await runner.answer(before.view.challenge.answer);
    const after = playing(runner);
    expect(after.answered).toBe(true);
    expect(after.picked).toBe(before.view.challenge.answer);
    expect(after.feedback).toMatchObject({ outcome: 'correct', next: 'advance' });
    expect(after.view.challenge.id).toBe(before.view.challenge.id);

    await runner.next();
    expect(playing(runner).view.challenge.id).not.toBe(before.view.challenge.id);
    expect(playing(runner).answered).toBe(false);
  });

  it('after a wrong answer, takes that choice away and lets the child try again straight away', async () => {
    const runner = await LessonRunner.start(w.deps());
    await runner.next();
    const before = playing(runner);
    const wrong = before.view.choices.find((c) => c.choice.id !== before.view.challenge.answer)!;
    await runner.answer(wrong.choice.id);

    const after = playing(runner);
    expect(after.answered).toBe(false);
    expect(after.feedback).toMatchObject({ outcome: 'incorrect', next: 'retry' });
    expect(after.picked).toBe(wrong.choice.id);
    expect(after.view.choices.find((c) => c.choice.id === wrong.choice.id)?.available).toBe(false);
    expect(after.view.tryIndex).toBe(1);

    await runner.answer(after.view.challenge.answer);
    expect(playing(runner).answered).toBe(true);
    const attempts = await w.repository.listAttempts(PROFILE);
    expect(attempts.map((a) => a.outcome)).toEqual(['incorrect', 'correct']);
    expect(attempts.some(isIndependentSuccess)).toBe(false);
  });

  it('ignores a second tap on an answered challenge, and taps during a demonstration', async () => {
    const runner = await LessonRunner.start(w.deps());
    await runner.answer('a');
    expect(await w.repository.listAttempts(PROFILE)).toHaveLength(0);

    await runner.next();
    const view = playing(runner).view;
    await Promise.all([
      runner.answer(view.challenge.answer),
      runner.answer(view.challenge.answer),
      runner.answer(view.challenge.answer),
    ]);
    await runner.answer(view.challenge.answer);
    expect(await w.repository.listAttempts(PROFILE)).toHaveLength(1);
  });

  it('"next" does nothing until the question has been answered', async () => {
    const runner = await LessonRunner.start(w.deps());
    await runner.next();
    const question = playing(runner).view.challenge.id;
    await runner.next();
    await runner.next();
    expect(playing(runner).view.challenge.id).toBe(question);
  });

  it('gives hints, and remembers they were given', async () => {
    const runner = await LessonRunner.start(w.deps());
    await runner.next();
    await runner.hint();
    const state = playing(runner);
    expect(state.hint?.type).toBe('model');
    expect(state.view.hintsUsed).toBe(1);

    await runner.answer(state.view.challenge.answer);
    const [attempt] = await w.repository.listAttempts(PROFILE);
    expect(attempt).toMatchObject({ hintLevel: 1, assistance: 'hint', outcome: 'correct' });
  });

  it('resumes after a reload at the same question, in the same order, with the same help showing', async () => {
    const first = await LessonRunner.start(w.deps());
    await first.next();
    await first.answer(playing(first).view.challenge.answer);
    await first.next();
    await first.hint();
    const before = playing(first);

    // The page is closed and opened again.
    const second = await LessonRunner.start(w.deps());
    const after = playing(second);
    expect(after.view).toEqual(before.view);
    expect(after.view.hintsUsed).toBe(1);
    expect(await w.repository.listSessions(PROFILE)).toHaveLength(1);

    await finish(second);
    const attempts = await w.repository.listAttempts(PROFILE);
    expect(new Set(attempts.map((a) => a.sessionId)).size).toBe(1);
    expect(attempts.map((a) => a.seq)).toEqual([0, 1, 2, 3, 4]);
  });

  it('does not resume a sitting of an older version of the lesson', async () => {
    const first = await LessonRunner.start(w.deps());
    await first.next();
    await first.answer(playing(first).view.challenge.answer);
    const oldSession = (await w.repository.findActiveSession(PROFILE, lesson.id))!;

    const revised: Lesson = { ...lesson, version: lesson.version + 1 };
    const second = await LessonRunner.start(w.deps({ lesson: revised }));
    expect(playing(second).view.stage).toBe('demo');
    const sessions = await w.repository.listSessions(PROFILE);
    expect(sessions.map((s) => s.id)).not.toContain(oldSession.id);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.lessonVersion).toBe(revised.version);
    // What was answered in the old sitting is still part of the record.
    expect(await w.repository.listAttempts(PROFILE)).toHaveLength(1);
  });

  it('starts over with a new sitting and a new seed', async () => {
    const runner = await LessonRunner.start(w.deps());
    await finish(runner);
    await runner.restart();
    expect(playing(runner).view.stage).toBe('demo');
    const sessions = await w.repository.listSessions(PROFILE);
    expect(sessions).toHaveLength(2);
    expect(new Set(sessions.map((s) => s.seed)).size).toBe(2);
  });

  it('keeps the lesson going when saving fails, and says that it is not saved', async () => {
    const runner = await LessonRunner.start(w.deps());
    w.driver.failWith = new StorageError('quota', 'The device is full.');
    await runner.next();
    expect(playing(runner)).toMatchObject({ saved: false });
    await finish(runner);
    expect(runner.getState()).toMatchObject({
      phase: 'finished',
      saved: false,
      summary: { independentFirstTryCorrect: 3 },
    });
    expect(w.errors.length).toBeGreaterThan(0);
    expect(w.errors.every((error) => error instanceof StorageError)).toBe(true);
  });

  it('still starts when storage is broken from the outset', async () => {
    w.driver.failWith = new StorageError('unavailable', 'Storage is gone.');
    const runner = await LessonRunner.start(w.deps());
    expect(playing(runner)).toMatchObject({ saved: false });
    expect(playing(runner).view.stage).toBe('demo');
  });

  it('follows the saved sitting when another tab has already answered', async () => {
    const here = await LessonRunner.start(w.deps());
    await here.next();
    const there = await LessonRunner.start(w.deps());
    const view = playing(there).view;
    expect(playing(here).view.key).toBe(view.key);

    // The other tab answers correctly and moves on.
    await there.answer(view.challenge.answer);
    await there.next();
    // This tab, still showing the old question, answers wrongly.
    const wrong = view.choices.find((c) => c.choice.id !== view.challenge.answer)!;
    await here.answer(wrong.choice.id);

    expect(playing(here).view).toEqual(playing(there).view);
    const attempts = await w.repository.listAttempts(PROFILE);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.outcome).toBe('correct');
  });

  it('measures response time from when the question appeared', async () => {
    const runner = await LessonRunner.start(w.deps());
    await runner.next();
    w.clock.now += 6500;
    await runner.answer(playing(runner).view.challenge.answer);
    const [attempt] = await w.repository.listAttempts(PROFILE);
    expect(attempt?.durationMs).toBeGreaterThanOrEqual(6500);
    expect(attempt?.durationMs).toBeLessThan(9000);
  });
});
