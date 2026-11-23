import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  EngineError,
  advanceDemo,
  getHint,
  getNextChallenge,
  isIndependentSuccess,
  parseAttempt,
  parseLessonSession,
  submitAttempt,
  summarizeSession,
  type ChallengeView,
  type Lesson,
  type LessonSession,
} from '@/engine';
import {
  T0,
  answerCorrectly,
  answerTo,
  answerWrongFirst,
  dayOf,
  hintThenAnswer,
  newSession,
  play,
  sampleLesson,
  type Player,
} from '../helpers/content';

const lesson = sampleLesson();

function viewOf(session: LessonSession): ChallengeView {
  const view = getNextChallenge(session, lesson);
  if (!view) throw new Error('Expected a challenge.');
  return view;
}

/** Skip demonstrations and answer correctly until the session reaches a step of the wanted stage. */
function reach(stage: 'guided' | 'independent', seed = 7): LessonSession {
  let session = newSession(lesson, seed);
  for (;;) {
    const view = viewOf(session);
    if (view.stage === stage) return session;
    if (view.stage === 'demo') {
      session = advanceDemo(session, lesson, T0);
      continue;
    }
    const result = answer(session, answerTo(view));
    if (!result.accepted) throw new Error(result.reason);
    session = result.session;
  }
}

function answer(session: LessonSession, response: string, extra: { adultAssist?: boolean } = {}) {
  return submitAttempt(session, lesson, {
    key: viewOf(session).key,
    response,
    now: T0 + 1000,
    day: dayOf(T0),
    durationMs: 1800,
    ...extra,
  });
}

function wrongChoice(view: ChallengeView): string {
  const wrong = view.choices.find((c) => c.available && c.choice.id !== answerTo(view));
  if (!wrong) throw new Error('No wrong choice left.');
  return wrong.choice.id;
}

describe('planning a session', () => {
  it('teaches first: demonstration, then guided practice, then independent probes', () => {
    const session = newSession(lesson);
    expect(session.steps.map((step) => step.stage)).toEqual([
      'demo',
      'guided',
      'guided',
      'independent',
      'independent',
      'independent',
    ]);
    expect(session.status).toBe('active');
    expect(session.cursor).toBe(0);
  });

  it('draws the independent probes from the pool and keeps the rest in reserve', () => {
    const session = newSession(lesson);
    const drawn = session.steps.filter((s) => s.stage === 'independent').map((s) => s.challengeId);
    expect(new Set(drawn).size).toBe(3);
    expect([...drawn, ...session.reserve].sort()).toEqual([...lesson.plan.independent.pool].sort());
  });

  it('plans the same session for the same seed, and varies across seeds', () => {
    expect(newSession(lesson, 11)).toEqual(newSession(lesson, 11));
    const plans = new Set(
      Array.from({ length: 30 }, (_, seed) =>
        newSession(lesson, seed)
          .steps.map((step) => step.challengeId)
          .join(','),
      ),
    );
    expect(plans.size).toBeGreaterThan(5);
  });

  it('produces a session that passes the stored-record schema', () => {
    expect(parseLessonSession(newSession(lesson)).ok).toBe(true);
  });
});

describe('getNextChallenge', () => {
  it('is a pure read: asking again changes nothing and returns the same view', () => {
    const session = reach('independent');
    const frozen = structuredClone(session);
    const first = getNextChallenge(session, lesson);
    const second = getNextChallenge(session, lesson);
    expect(second).toEqual(first);
    expect(session).toEqual(frozen);
  });

  it('shows the answer during a demonstration and hides it during a question', () => {
    const demo = viewOf(newSession(lesson));
    expect(demo.stage).toBe('demo');
    expect(demo.shownAnswer).toBe(answerTo(demo));
    expect(demo.hintsAvailable).toBe(0);

    const question = viewOf(reach('guided'));
    expect(question.shownAnswer).toBeNull();
    expect(question.hintsAvailable).toBe(question.challenge.hints.length);
  });

  it('keeps the choice order stable for a step, including after a wrong try', () => {
    const session = reach('independent');
    const before = viewOf(session);
    const result = answer(session, wrongChoice(before));
    if (!result.accepted) throw new Error(result.reason);
    const after = viewOf(result.session);
    expect(after.choices.map((c) => c.choice.id)).toEqual(before.choices.map((c) => c.choice.id));
  });

  it('refuses a lesson the session does not belong to', () => {
    const other: Lesson = { ...lesson, version: lesson.version + 1 };
    expect(() => getNextChallenge(newSession(lesson), other)).toThrow(EngineError);
  });
});

describe('demonstrations', () => {
  it('cannot be answered, are moved past with advanceDemo, and record nothing', () => {
    const session = newSession(lesson);
    const view = viewOf(session);
    const rejected = submitAttempt(session, lesson, {
      key: view.key,
      response: answerTo(view),
      now: T0,
      day: dayOf(T0),
      durationMs: 0,
    });
    expect(rejected).toEqual({ accepted: false, reason: 'not-answerable', session });

    const next = advanceDemo(session, lesson, T0 + 5);
    expect(next.cursor).toBe(1);
    expect(next.nextSeq).toBe(0);
    expect(next.tally).toEqual(session.tally);
  });

  it('advanceDemo does nothing on a question', () => {
    const session = reach('guided');
    expect(advanceDemo(session, lesson, T0)).toBe(session);
  });
});

describe('answering', () => {
  it('a clean run completes the lesson and counts every independent step as independent', () => {
    const { session, attempts } = play(lesson, newSession(lesson), answerCorrectly);
    expect(session.status).toBe('completed');
    expect(session.completedAt).not.toBeNull();
    expect(getNextChallenge(session, lesson)).toBeNull();
    expect(attempts.map((a) => a.stage)).toEqual([
      'guided',
      'guided',
      'independent',
      'independent',
      'independent',
    ]);
    expect(attempts.filter(isIndependentSuccess)).toHaveLength(3);
    expect(summarizeSession(session, lesson)).toEqual({
      completed: true,
      independentProbes: 3,
      independentFirstTryCorrect: 3,
      assistedSolves: 0,
      metSuccessCriteria: true,
    });
  });

  it('a wrong answer is not a dead end: the choice is taken away and the child tries again', () => {
    const session = reach('independent');
    const view = viewOf(session);
    const wrong = wrongChoice(view);
    const result = answer(session, wrong);
    if (!result.accepted) throw new Error(result.reason);

    expect(result.feedback).toMatchObject({
      outcome: 'incorrect',
      independent: false,
      next: 'retry',
    });
    expect(result.feedback.misconception).toBe(
      view.challenge.kind === 'choose-one' ? view.challenge.misconceptions?.[wrong] : undefined,
    );
    expect(result.attempt).toMatchObject({ outcome: 'incorrect', tryIndex: 0, response: wrong });
    expect(result.session.cursor).toBe(session.cursor);

    const retry = viewOf(result.session);
    expect(retry.tryIndex).toBe(1);
    expect(retry.key).not.toBe(view.key);
    expect(retry.choices.find((c) => c.choice.id === wrong)?.available).toBe(false);
    expect(answer(result.session, wrong)).toMatchObject({
      accepted: false,
      reason: 'unavailable-choice',
    });
  });

  it('reveals the answer once it is the only choice left', () => {
    let session = reach('independent');
    let view = viewOf(session);
    while (view.choices.filter((c) => c.available).length > 1) {
      const result = answer(session, wrongChoice(view));
      if (!result.accepted) throw new Error(result.reason);
      session = result.session;
      view = viewOf(session);
    }
    expect(view.shownAnswer).toBe(answerTo(view));
    const last = answer(session, answerTo(view));
    if (!last.accepted) throw new Error(last.reason);
    expect(last.attempt.outcome).toBe('correct');
    expect(last.feedback.independent).toBe(false);
    expect(isIndependentSuccess(last.attempt)).toBe(false);
  });

  it('a correct retry is assisted, never independent', () => {
    const session = reach('independent');
    const first = answer(session, wrongChoice(viewOf(session)));
    if (!first.accepted) throw new Error(first.reason);
    const second = answer(first.session, answerTo(viewOf(first.session)));
    if (!second.accepted) throw new Error(second.reason);

    expect(second.attempt).toMatchObject({ outcome: 'correct', tryIndex: 1, stage: 'independent' });
    expect(second.feedback.independent).toBe(false);
    expect(second.session.tally).toMatchObject({
      independentProbes: 1,
      independentFirstTryCorrect: 0,
      assistedSolves: 1,
    });
  });

  it('adult help is labelled and is never independent evidence', () => {
    const session = reach('independent');
    const result = answer(session, answerTo(viewOf(session)), { adultAssist: true });
    if (!result.accepted) throw new Error(result.reason);
    expect(result.attempt.assistance).toBe('adult');
    expect(result.feedback.independent).toBe(false);
    expect(isIndependentSuccess(result.attempt)).toBe(false);
  });

  it('a guided step is never independent evidence, however it goes', () => {
    const session = reach('guided');
    const result = answer(session, answerTo(viewOf(session)));
    if (!result.accepted) throw new Error(result.reason);
    expect(result.attempt.stage).toBe('guided');
    expect(result.feedback.independent).toBe(false);
    expect(isIndependentSuccess(result.attempt)).toBe(false);
  });

  it('rejects a second submission of the same presentation (double tap)', () => {
    const session = reach('independent');
    const view = viewOf(session);
    const input = {
      key: view.key,
      response: answerTo(view),
      now: T0,
      day: dayOf(T0),
      durationMs: 900,
    };
    const first = submitAttempt(session, lesson, input);
    if (!first.accepted) throw new Error(first.reason);
    const second = submitAttempt(first.session, lesson, input);
    expect(second).toEqual({ accepted: false, reason: 'stale', session: first.session });
  });

  it('rejects a choice that is not part of the challenge', () => {
    const session = reach('guided');
    expect(answer(session, 'zzz')).toMatchObject({ accepted: false, reason: 'unknown-choice' });
  });

  it('rejects everything once the lesson is finished', () => {
    const { session } = play(lesson, newSession(lesson), answerCorrectly);
    const result = submitAttempt(session, lesson, {
      key: 'anything',
      response: 'a',
      now: T0,
      day: dayOf(T0),
      durationMs: 0,
    });
    expect(result).toEqual({ accepted: false, reason: 'completed', session });
    expect(getHint(session, lesson, T0).hint).toBeNull();
  });

  it('clamps response times to a sane range', () => {
    const session = reach('guided');
    const view = viewOf(session);
    const submit = (durationMs: number) =>
      submitAttempt(session, lesson, {
        key: view.key,
        response: answerTo(view),
        now: T0,
        day: dayOf(T0),
        durationMs,
      });
    const long = submit(9 * 60 * 60 * 1000);
    const negative = submit(-50);
    if (!long.accepted || !negative.accepted) throw new Error('rejected');
    expect(long.attempt.durationMs).toBe(10 * 60 * 1000);
    expect(negative.attempt.durationMs).toBe(0);
  });

  it('numbers attempts in order and gives each a stable id', () => {
    const { attempts, session } = play(lesson, newSession(lesson, 3, 'sess'), answerWrongFirst);
    expect(attempts.map((a) => a.seq)).toEqual(attempts.map((_, index) => index));
    expect(attempts.map((a) => a.id)).toEqual(attempts.map((_, index) => `sess:${index}`));
    expect(session.nextSeq).toBe(attempts.length);
  });
});

describe('re-probing after help', () => {
  it('adds one different challenge for the same skill at the end of the lesson', () => {
    const session = reach('independent');
    const missed = viewOf(session).challenge;
    const first = answer(session, wrongChoice(viewOf(session)));
    if (!first.accepted) throw new Error(first.reason);
    let current = first.session;
    // Finish the missed challenge.
    for (;;) {
      const view = viewOf(current);
      if (view.challenge.id !== missed.id) break;
      const result = answer(current, answerTo(view));
      if (!result.accepted) throw new Error(result.reason);
      current = result.session;
    }

    expect(current.steps).toHaveLength(session.steps.length + 1);
    const reprobe = current.steps.at(-1);
    expect(reprobe).toMatchObject({ stage: 'independent', reprobeOf: missed.id });
    expect(reprobe?.challengeId).not.toBe(missed.id);
    expect(session.reserve).toContain(reprobe?.challengeId);
    expect(current.reserve).not.toContain(reprobe?.challengeId);
    expect(current.reprobesUsed).toBe(1);

    const added = lesson.challenges.find((c) => c.id === reprobe?.challengeId);
    expect(added?.skillId).toBe(missed.skillId);
    expect(added?.variant).not.toBe(missed.variant);
  });

  it('never exceeds the lesson limit, so a struggling child is not kept in a loop', () => {
    const { session } = play(lesson, newSession(lesson), answerWrongFirst);
    expect(session.status).toBe('completed');
    expect(session.reprobesUsed).toBe(lesson.plan.independent.maxReprobes);
    expect(session.steps).toHaveLength(6 + lesson.plan.independent.maxReprobes);
    expect(summarizeSession(session, lesson)).toMatchObject({
      independentFirstTryCorrect: 0,
      metSuccessCriteria: false,
    });
  });

  it('does not re-probe guided steps', () => {
    const session = reach('guided');
    const first = answer(session, wrongChoice(viewOf(session)));
    if (!first.accepted) throw new Error(first.reason);
    const second = answer(first.session, answerTo(viewOf(first.session)));
    if (!second.accepted) throw new Error(second.reason);
    expect(second.session.steps).toHaveLength(session.steps.length);
  });
});

describe('hints', () => {
  it('walks the ladder in authored order and ends by revealing the answer', () => {
    let session = reach('independent');
    const challenge = viewOf(session).challenge;
    const given: string[] = [];
    for (;;) {
      const result = getHint(session, lesson, T0);
      if (!result.hint) break;
      given.push(result.hint.type);
      session = result.session;
    }
    expect(given).toEqual(challenge.hints.map((hint) => hint.type));
    expect(given.at(-1)).toBe('reveal');

    const view = viewOf(session);
    expect(view.shownAnswer).toBe(answerTo(view));
    expect(view.choices.filter((c) => c.available).map((c) => c.choice.id)).toEqual([
      answerTo(view),
    ]);
    expect(view.hintsAvailable).toBe(0);
    expect(getHint(session, lesson, T0)).toMatchObject({ hint: null, hintsAvailable: 0 });
  });

  it('never takes the right answer away', () => {
    for (let seed = 0; seed < 25; seed++) {
      let session = reach('independent', seed);
      for (let rung = 0; rung < 6; rung++) session = getHint(session, lesson, T0).session;
      expect(session.presentation.eliminated).not.toContain(answerTo(viewOf(session)));
    }
  });

  it('marks the answer that follows as assisted, even when it is right first time', () => {
    const session = reach('independent');
    const hinted = getHint(session, lesson, T0);
    expect(hinted.hint?.type).toBe('model');
    expect(hinted.hintsUsed).toBe(1);

    const result = answer(hinted.session, answerTo(viewOf(hinted.session)));
    if (!result.accepted) throw new Error(result.reason);
    expect(result.attempt).toMatchObject({
      outcome: 'correct',
      tryIndex: 0,
      hintLevel: 1,
      assistance: 'hint',
    });
    expect(result.feedback.independent).toBe(false);
    expect(isIndependentSuccess(result.attempt)).toBe(false);
    expect(result.session.tally.independentFirstTryCorrect).toBe(0);
  });

  it('asking for a hint does not use up the presentation key or record an attempt', () => {
    const session = reach('independent');
    const before = viewOf(session);
    const hinted = getHint(session, lesson, T0).session;
    expect(viewOf(hinted).key).toBe(before.key);
    expect(hinted.nextSeq).toBe(session.nextSeq);
  });

  it('offers nothing during a demonstration', () => {
    const session = newSession(lesson);
    expect(getHint(session, lesson, T0)).toEqual({
      session,
      hint: null,
      hintsUsed: 0,
      hintsAvailable: 0,
    });
  });

  it('a session played with a hint before every answer earns no independent evidence', () => {
    const { session, attempts } = play(lesson, newSession(lesson), hintThenAnswer);
    expect(session.status).toBe('completed');
    expect(attempts.every((a) => a.outcome === 'correct')).toBe(true);
    expect(attempts.filter(isIndependentSuccess)).toHaveLength(0);
    expect(summarizeSession(session, lesson).metSuccessCriteria).toBe(false);
  });
});

describe('determinism', () => {
  it('the same seed and the same moves give the same session and the same record', () => {
    const run = () => play(lesson, newSession(lesson, 99, 'same'), answerWrongFirst);
    expect(run()).toEqual(run());
  });
});

describe('invariants under arbitrary play', () => {
  /** A player driven by a list of numbers: each one picks among "hint" and the choices still available. */
  const scripted =
    (script: readonly number[]): Player =>
    (view) => {
      const available = view.choices.filter((c) => c.available).map((c) => c.choice.id);
      const options = view.hintsAvailable > 0 ? ['hint', ...available] : available;
      const pick =
        options[
          (script[view.stepIndex * 7 + view.tryIndex + view.hintsUsed] ?? 0) % options.length
        ];
      return pick === 'hint' || pick === undefined
        ? { type: 'hint' }
        : { type: 'answer', response: pick };
    };

  it('always finishes, never over-counts, and only ever writes valid records', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.array(fc.nat(50), { minLength: 0, maxLength: 80 }),
        (seed, script) => {
          const start = newSession(lesson, seed);
          const { session, attempts, moves } = play(lesson, start, scripted(script));

          // It ends, and quickly: a bounded number of tries and hints per step.
          expect(session.status).toBe('completed');
          expect(moves).toBeLessThanOrEqual(session.steps.length * 8);

          // The plan only ever grows by the allowed re-probes, and never repeats a challenge.
          const { demo, guided, independent } = lesson.plan;
          const baseSteps = demo.length + guided.length + independent.count;
          expect(session.steps.length).toBeGreaterThanOrEqual(baseSteps);
          expect(session.steps.length).toBeLessThanOrEqual(baseSteps + independent.maxReprobes);
          const ids = session.steps.map((step) => step.challengeId);
          expect(new Set(ids).size).toBe(ids.length);

          // Records are valid, ordered and unique.
          expect(parseLessonSession(JSON.parse(JSON.stringify(session))).ok).toBe(true);
          for (const [index, a] of attempts.entries()) {
            expect(parseAttempt(JSON.parse(JSON.stringify(a))).ok).toBe(true);
            expect(a.seq).toBe(index);
          }
          expect(new Set(attempts.map((a) => a.id)).size).toBe(attempts.length);

          // Exactly one correct attempt per answered step, and it is the last one for that step.
          const answered = session.steps.filter((step) => step.stage !== 'demo');
          expect(attempts.filter((a) => a.outcome === 'correct')).toHaveLength(answered.length);

          // Help of any kind never counts as independence.
          for (const a of attempts) {
            if (isIndependentSuccess(a)) {
              expect(a.stage).toBe('independent');
              expect(a.tryIndex).toBe(0);
              expect(a.hintLevel).toBe(0);
              expect(a.assistance).toBe('none');
            }
          }
          const independentSteps = session.steps.filter((s) => s.stage === 'independent').length;
          expect(session.tally.independentProbes).toBe(independentSteps);
          expect(session.tally.independentFirstTryCorrect).toBe(
            attempts.filter(isIndependentSuccess).length,
          );
          expect(session.tally.independentFirstTryCorrect).toBeLessThanOrEqual(independentSteps);
          expect(session.tally.independentFirstTryCorrect + session.tally.assistedSolves).toBe(
            answered.length -
              attempts.filter(
                (a) =>
                  a.stage === 'guided' &&
                  a.outcome === 'correct' &&
                  a.tryIndex === 0 &&
                  a.hintLevel === 0,
              ).length,
          );
        },
      ),
      { numRuns: 300 },
    );
  });
});
