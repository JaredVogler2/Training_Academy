import { beforeEach, describe, expect, it } from 'vitest';
import {
  KEPT_AT_LEAST_MS,
  getSkillEvidence,
  isIndependentSuccess,
  keptBy,
  type Lesson,
} from '@/engine';
import {
  LessonRunner,
  lastKept,
  resumable,
  type RunnerDeps,
  type RunnerState,
} from '@/game/lessonRunner';
import { MemoryDriver, Repository, StorageError, migrate, type WriteOp } from '@/storage';
import { DAY_MS, T0, answerTo, numberGardenPack, sampleLesson } from '../helpers/content';
import { fixtureKeepLesson, fixturePack } from '../helpers/fixturePack';

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
    else await runner.answer(answerTo(state.view));
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

  it('writes down every answer given while a grown-up is helping as helped, and counts none as the child’s own', async () => {
    const runner = await LessonRunner.start(w.deps({ adultHelping: () => true }));
    await finish(runner);
    const attempts = await w.repository.listAttempts(PROFILE);
    // (One more than the five of a lesson done alone: a check that was helped with is followed by another.)
    expect(attempts.length).toBeGreaterThanOrEqual(5);
    expect(attempts.map((attempt) => attempt.assistance)).toEqual(attempts.map(() => 'adult'));
    expect(attempts.every((attempt) => attempt.outcome === 'correct')).toBe(true);
    expect(attempts.filter(isIndependentSuccess)).toHaveLength(0);
    // The activity is finished all the same; what it does not do is say the child did it alone.
    expect(runner.getState()).toMatchObject({
      phase: 'finished',
      summary: { completed: true, independentFirstTryCorrect: 0, metSuccessCriteria: false },
    });
    const evidence = getSkillEvidence(attempts, 'math.quantity.match-sets-to-3');
    expect(evidence.independentSuccesses).toBe(0);
    expect(evidence.status).not.toMatch(/independent/);
  });

  it('asks whether a grown-up is helping at each answer, so that it can be switched on and off half-way', async () => {
    let helping = false;
    const runner = await LessonRunner.start(w.deps({ adultHelping: () => helping }));
    await runner.next();
    await runner.answer(answerTo(playing(runner).view));
    await runner.next();
    helping = true;
    await runner.answer(answerTo(playing(runner).view));
    await runner.next();
    helping = false;
    await runner.answer(answerTo(playing(runner).view));
    const attempts = await w.repository.listAttempts(PROFILE);
    expect(attempts.map((attempt) => attempt.assistance)).toEqual(['none', 'adult', 'none']);
  });

  it('keeps a correctly answered challenge on screen until the child moves on', async () => {
    const runner = await LessonRunner.start(w.deps());
    await runner.next();
    const before = playing(runner);
    await runner.answer(answerTo(before.view));
    const after = playing(runner);
    expect(after.answered).toBe(true);
    expect(after.picked).toBe(answerTo(before.view));
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
    const wrong = before.view.choices.find((c) => c.choice.id !== answerTo(before.view))!;
    await runner.answer(wrong.choice.id);

    const after = playing(runner);
    expect(after.answered).toBe(false);
    expect(after.feedback).toMatchObject({ outcome: 'incorrect', next: 'retry' });
    expect(after.picked).toBe(wrong.choice.id);
    expect(after.view.choices.find((c) => c.choice.id === wrong.choice.id)?.available).toBe(false);
    expect(after.view.tryIndex).toBe(1);

    await runner.answer(answerTo(after.view));
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
      runner.answer(answerTo(view)),
      runner.answer(answerTo(view)),
      runner.answer(answerTo(view)),
    ]);
    await runner.answer(answerTo(view));
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

    await runner.answer(answerTo(state.view));
    const [attempt] = await w.repository.listAttempts(PROFILE);
    expect(attempt).toMatchObject({ hintLevel: 1, assistance: 'hint', outcome: 'correct' });
  });

  it('resumes after a reload at the same question, in the same order, with the same help showing', async () => {
    const first = await LessonRunner.start(w.deps());
    await first.next();
    await first.answer(answerTo(playing(first).view));
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
    await first.answer(answerTo(playing(first).view));
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

  it('takes a sitting up where it was left when the world has gained activities since, and records what follows against the content as it now is', async () => {
    const first = await LessonRunner.start(w.deps());
    await first.next();
    await first.answer(answerTo(playing(first).view));
    await first.next();
    const before = playing(first);
    const begun = (await w.repository.findActiveSession(PROFILE, lesson.id))!;
    expect(begun.contentVersion).toBe(pack.contentVersion);

    // The same lesson, in a pack that has had lessons added to it: a new content version, the lesson untouched.
    const grown = { ...pack, contentVersion: pack.contentVersion + 1 };
    const second = await LessonRunner.start(w.deps({ pack: grown }));
    const after = playing(second);
    // The same sitting, at the same step: not back at Glim's showing.
    expect(after.view).toEqual(before.view);
    expect(after.view.stage).not.toBe('demo');
    const sessions = await w.repository.listSessions(PROFILE);
    expect(sessions.map((s) => s.id)).toEqual([begun.id]);
    expect(sessions[0]?.contentVersion).toBe(grown.contentVersion);

    // What was answered before the update keeps the version it was answered in; what comes after has the new.
    await finish(second);
    const attempts = await w.repository.listAttempts(PROFILE);
    expect(new Set(attempts.map((a) => a.sessionId))).toEqual(new Set([begun.id]));
    expect(attempts[0]?.contentVersion).toBe(pack.contentVersion);
    expect(attempts.at(-1)?.contentVersion).toBe(grown.contentVersion);
  });

  it('does not take up a sitting whose challenges the lesson no longer has', async () => {
    const first = await LessonRunner.start(w.deps());
    await first.next();
    const begun = (await w.repository.findActiveSession(PROFILE, lesson.id))!;
    // A lesson that lost a challenge without being given a new version: the build refuses that, and the runner
    // does not rely on it.
    const gone = begun.steps.at(-1)?.challengeId;
    const cut: Lesson = {
      ...lesson,
      challenges: lesson.challenges.filter((challenge) => challenge.id !== gone),
    };
    expect(resumable(begun, lesson)).toBe(true);
    expect(resumable(begun, cut)).toBe(false);
    expect(resumable(begun, { ...lesson, version: lesson.version + 1 })).toBe(false);
    expect(resumable(begun, { ...lesson, id: 'ng-other-01' })).toBe(false);
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
    await there.answer(answerTo(view));
    await there.next();
    // This tab, still showing the old question, answers wrongly.
    const wrong = view.choices.find((c) => c.choice.id !== answerTo(view))!;
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
    await runner.answer(answerTo(playing(runner).view));
    const [attempt] = await w.repository.listAttempts(PROFILE);
    expect(attempt?.durationMs).toBeGreaterThanOrEqual(6500);
    expect(attempt?.durationMs).toBeLessThan(9000);
  });
});

describe('a lesson that keeps something for next time', () => {
  const keepPack = fixturePack();
  const keepLesson = fixtureKeepLesson();
  const id = (name: string) => `${keepLesson.id}.${name}`;
  let w: World;
  beforeEach(async () => {
    w = await world();
  });
  const deps = (overrides: Partial<RunnerDeps> = {}) =>
    w.deps({ pack: keepPack, lesson: keepLesson, ...overrides });
  const first = (runner: LessonRunner) => playing(runner).view;
  /** A sitting played to its end, and what it kept, by name: "keep-b". */
  async function sitting(): Promise<string> {
    const runner = await LessonRunner.start(deps());
    await finish(runner);
    const sessions = await w.repository.listSessions(PROFILE);
    const last = sessions
      .filter((each) => each.completedAt !== null)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];
    const kept = last ? keptBy(last, keepLesson) : null;
    if (kept === null) throw new Error('The sitting kept nothing.');
    return kept.replace(`${keepLesson.id}.`, '');
  }
  const backFor = (kept: string, when: string) => id(`${kept.replace('keep-', 'back-')}-${when}`);

  it('asks nothing about last time at a first sitting, and ends it with something to keep', async () => {
    const runner = await LessonRunner.start(deps());
    expect(first(runner).stage).toBe('demo');
    await finish(runner);
    const attempts = await w.repository.listAttempts(PROFILE);
    expect(attempts.at(-1)?.challengeId).toMatch(/\.keep-[abc]$/);
    expect(attempts.some((attempt) => attempt.challengeId.includes('.back-'))).toBe(false);
  });

  it('begins the next sitting with what the last one kept, once ten minutes have gone by', async () => {
    const kept = await sitting();
    w.clock.now += KEPT_AT_LEAST_MS;
    const runner = await LessonRunner.start(deps());
    expect(first(runner).challenge.id).toBe(backFor(kept, 'same-day'));
    expect(first(runner).stage).toBe('independent');
    // Nothing is shown first: it is the first thing on the screen, and it is answered alone.
    expect(first(runner).stepIndex).toBe(0);
    await runner.answer(answerTo(first(runner)));
    const attempts = await w.repository.listAttempts(PROFILE);
    expect(attempts.at(-1)).toMatchObject({
      challengeId: backFor(kept, 'same-day'),
      skillId: 'memory.fixture.kept',
      stage: 'independent',
      assistance: 'none',
      outcome: 'correct',
    });
  });

  it('does so after the page has been closed and opened again: it is read from what is stored', async () => {
    const kept = await sitting();
    // Everything in memory is gone: a new repository over the same storage, with the clock a day on.
    const later = await world(w.driver);
    later.clock.now = w.clock.now + DAY_MS;
    const runner = await LessonRunner.start(later.deps({ pack: keepPack, lesson: keepLesson }));
    expect(first(runner).challenge.id).toBe(backFor(kept, 'later-day'));
  });

  it('asks the question for another day on another day, and the one for the same day on the same day', async () => {
    const kept = await sitting();
    w.clock.now += 2 * 60 * 60 * 1000;
    expect((await lastKept(deps()))?.challengeId).toBe(id(kept));
    const sameDay = await LessonRunner.start(deps({ newId: () => 'same-day' }));
    expect(first(sameDay).challenge.id).toBe(backFor(kept, 'same-day'));
    await w.repository.discardSession('same-day');
    w.clock.now += DAY_MS;
    const nextDay = await LessonRunner.start(deps({ newId: () => 'next-day' }));
    expect(first(nextDay).challenge.id).toBe(backFor(kept, 'later-day'));
  });

  it('does not ask a moment later, and does not keep the same things twice running', async () => {
    const kept = await sitting();
    w.clock.now += KEPT_AT_LEAST_MS - 60_000;
    const runner = await LessonRunner.start(deps());
    expect(first(runner).stage).toBe('demo');
    await finish(runner);
    const attempts = await w.repository.listAttempts(PROFILE);
    expect(attempts.some((attempt) => attempt.challengeId.includes('.back-'))).toBe(false);
    expect(attempts.at(-1)?.challengeId).not.toBe(id(kept));
    expect(attempts.at(-1)?.challengeId).toMatch(/\.keep-[abc]$/);
  });

  it('goes by the sitting that was finished last, and takes an unfinished one up where it was left', async () => {
    const kept = await sitting();
    w.clock.now += DAY_MS;
    const second = await LessonRunner.start(deps());
    expect(first(second).challenge.id).toBe(backFor(kept, 'later-day'));
    await second.answer(answerTo(first(second)));
    await second.next();
    // Left there. Another day on, it is the same sitting, past the question it began with: asked once.
    w.clock.now += DAY_MS;
    const resumed = await LessonRunner.start(deps());
    expect(first(resumed).stepIndex).toBe(1);
    expect(first(resumed).stage).toBe('demo');
    await finish(resumed);
    const asked = (await w.repository.listAttempts(PROFILE)).filter((attempt) =>
      attempt.challengeId.includes('.back-'),
    );
    expect(asked).toHaveLength(1);
  });

  it('"again", after a sitting, plans the new one knowing what that sitting kept', async () => {
    const runner = await LessonRunner.start(deps());
    await finish(runner);
    const kept = keptBy((await w.repository.listSessions(PROFILE))[0]!, keepLesson)!;
    // At once: nothing is asked about what was kept a moment ago.
    await runner.restart();
    expect(first(runner).stage).toBe('demo');
    // A quarter of an hour on, "again" from the end of that one begins with what it kept.
    await finish(runner);
    const sessions = await w.repository.listSessions(PROFILE);
    const second = sessions.find((each) => keptBy(each, keepLesson) !== kept)!;
    w.clock.now += 15 * 60 * 1000;
    await runner.restart();
    expect(first(runner).challenge.id).toBe(
      `${keptBy(second, keepLesson)!.replace('.keep-', '.back-')}-same-day`,
    );
  });

  it('takes a sitting that was left before its end to have kept nothing: what it would have kept was never shown', async () => {
    const runner = await LessonRunner.start(deps());
    await runner.next();
    await runner.answer(answerTo(first(runner)));
    // A day on, "again" from the middle of it: a new sitting, and nothing to ask about.
    w.clock.now += DAY_MS;
    expect(await lastKept(deps())).toBeUndefined();
    await runner.restart();
    expect(first(runner).stage).toBe('demo');
    expect(first(runner).stepIndex).toBe(0);
  });

  it('asks nothing about last time when what is stored cannot be read, and says it is not saving', async () => {
    await sitting();
    w.clock.now += DAY_MS;
    const broken = Object.assign(Object.create(w.repository) as typeof w.repository, {
      listSessions: () => Promise.reject(new StorageError('unavailable', 'Storage is gone.')),
    });
    const runner = await LessonRunner.start(deps({ repository: broken }));
    expect(first(runner).stage).toBe('demo');
    expect(playing(runner).saved).toBe(false);
  });

  it('has nothing kept for a lesson that keeps nothing, however many sittings of it there are', async () => {
    const runner = await LessonRunner.start(w.deps());
    await finish(runner);
    expect(await lastKept(w.deps())).toBeUndefined();
  });
});
