import { describe, expect, it } from 'vitest';
import {
  EngineError,
  KEPT_AT_LEAST_MS,
  createSession,
  getNextChallenge,
  keptBy,
  summarizeSession,
  type CreateSessionInput,
  type Lesson,
  type LessonSession,
} from '@/engine';
import {
  DAY_MS,
  T0,
  answerCorrectly,
  answerTo,
  answerWrongFirst,
  dayOf,
  play,
  type Player,
} from '../helpers/content';
import { fixtureKeepLesson, fixtureLesson } from '../helpers/fixturePack';

/**
 * What a plan can ask beside the usual: a question that is asked straight after another, about the same things;
 * and something kept from one sitting to the next. Tried on a lesson made for the tests, over many seeds.
 */

const lesson = fixtureKeepLesson();
const then = lesson.plan.then ?? {};
const keep = lesson.plan.keep!;
const SEEDS = Array.from({ length: 60 }, (_, index) => index * 7919 + 3);

const sitting = (seed: number, more: Partial<CreateSessionInput> = {}): LessonSession =>
  createSession(lesson, {
    id: `s-${String(seed)}`,
    profileId: 'p-1',
    seed,
    now: T0,
    contentVersion: 1,
    ...more,
  });

const idsOf = (session: LessonSession) => session.steps.map((step) => step.challengeId);
const kept = (name: string, at: number) => ({
  challengeId: `${lesson.id}.keep-${name}`,
  at,
  day: dayOf(at),
});
/** A sitting begun `after` milliseconds after one that kept `name` was finished. */
const later = (seed: number, name: string, after: number) =>
  sitting(seed, { now: T0 + after, day: dayOf(T0 + after), kept: kept(name, T0) });

/** Answers everything rightly but the challenges named, which get one wrong answer first. */
const missing =
  (...ids: string[]): Player =>
  (view) =>
    ids.includes(view.challenge.id) && view.tryIndex === 0
      ? answerWrongFirst(view)
      : answerCorrectly(view);

describe('a question that is asked straight after another', () => {
  it('comes directly after it in every sitting, in the same part of the lesson', () => {
    for (const seed of SEEDS) {
      const { steps } = sitting(seed);
      steps.forEach((step, index) => {
        const next = then[step.challengeId];
        if (next === undefined) return;
        expect(steps[index + 1], `seed ${String(seed)}`).toEqual({
          stage: step.stage,
          challengeId: next,
        });
      });
    }
  });

  it('is never asked without the one it follows, and is never held in reserve', () => {
    const second = new Set(Object.values(then));
    for (const seed of SEEDS) {
      const session = sitting(seed);
      session.steps.forEach((step, index) => {
        if (!second.has(step.challengeId)) return;
        expect(then[session.steps[index - 1]?.challengeId ?? '']).toBe(step.challengeId);
      });
      expect(session.reserve.some((id) => second.has(id))).toBe(false);
      // Shown, guided, two of the three drawn, each with what follows it; and the thing to keep.
      expect(session.steps).toHaveLength(2 + 2 + 4 + 1);
    }
  });

  it('is asked again together with the one it follows, with other things, when the first needed help', () => {
    const start = sitting(11);
    const [first] = start.steps.filter((step) => step.stage === 'independent');
    const { session } = play(lesson, start, missing(first!.challengeId));
    const again = session.steps.filter((step) => step.reprobeOf !== undefined);
    expect(again).toHaveLength(2);
    expect(again[0]?.reprobeOf).toBe(first!.challengeId);
    expect(again[1]?.reprobeOf).toBe(then[first!.challengeId]);
    expect(then[again[0]!.challengeId]).toBe(again[1]!.challengeId);
    // Other things: the pair that was held back.
    expect(start.reserve).toContain(again[0]!.challengeId);
    expect(session.reserve).toEqual([]);
    expect(session.reprobesUsed).toBe(1);
  });

  it('is asked again as a pair when only the second needed help', () => {
    const start = sitting(11);
    const [first] = start.steps.filter((step) => step.stage === 'independent');
    const second = then[first!.challengeId]!;
    const { session } = play(lesson, start, missing(second));
    const again = session.steps.filter((step) => step.reprobeOf !== undefined);
    expect(again.map((step) => step.reprobeOf)).toEqual([first!.challengeId, second]);
  });

  it('is asked again once, not twice, when both of a pair needed help', () => {
    const start = sitting(11);
    const [first] = start.steps.filter((step) => step.stage === 'independent');
    const second = then[first!.challengeId]!;
    const { session } = play(lesson, start, missing(first!.challengeId, second));
    expect(session.steps.filter((step) => step.reprobeOf !== undefined)).toHaveLength(2);
    expect(session.reprobesUsed).toBe(1);
  });

  it('is asked again once even where there are other things enough to ask it twice', () => {
    // One pair drawn, two held back, and two re-probes allowed: both of the pair needed help.
    const roomy: Lesson = {
      ...lesson,
      plan: {
        ...lesson.plan,
        independent: { ...lesson.plan.independent, count: 1, maxReprobes: 2 },
      },
    };
    const start = createSession(roomy, {
      id: 's-roomy',
      profileId: 'p-1',
      seed: 11,
      now: T0,
      contentVersion: 1,
    });
    expect(start.reserve).toHaveLength(2);
    const [first] = start.steps.filter((step) => step.stage === 'independent');
    const second = then[first!.challengeId]!;
    const { session } = play(roomy, start, missing(first!.challengeId, second));
    const again = session.steps.filter((step) => step.reprobeOf !== undefined);
    expect(again.map((step) => step.reprobeOf)).toEqual([first!.challengeId, second]);
    expect(session.reprobesUsed).toBe(1);
    expect(session.reserve).toHaveLength(1);
  });

  it('counts each of the two on its own: the hinted one being right says nothing of the other', () => {
    const start = sitting(11);
    const [first] = start.steps.filter((step) => step.stage === 'independent');
    const second = then[first!.challengeId]!;
    const { session, attempts } = play(lesson, start, missing(second));
    const of = (id: string) => attempts.filter((attempt) => attempt.challengeId === id);
    expect(of(first!.challengeId).map((attempt) => attempt.outcome)).toEqual(['correct']);
    expect(of(second).map((attempt) => attempt.outcome)).toEqual(['incorrect', 'correct']);
    // Two skills: the first try at the second is the only thing written against the second skill here.
    expect(of(first!.challengeId)[0]?.skillId).not.toBe(of(second)[0]?.skillId);
    expect(summarizeSession(session, lesson).assistedSolves).toBe(1);
  });
});

describe('something kept from one sitting to the next', () => {
  it('is asked last of all, after everything else, in every sitting', () => {
    for (const seed of SEEDS) {
      const ids = idsOf(sitting(seed));
      expect(keep.pool).toContain(ids.at(-1));
      expect(ids.filter((id) => keep.pool.includes(id))).toHaveLength(1);
    }
  });

  it('is told by `keptBy`, for a sitting of a lesson that keeps something', () => {
    const session = sitting(5);
    expect(keptBy(session, lesson)).toBe(idsOf(session).at(-1));
    const plain = fixtureLesson();
    const other = createSession(plain, {
      id: 's',
      profileId: 'p-1',
      seed: 5,
      now: T0,
      contentVersion: 1,
    });
    expect(keptBy(other, plain)).toBeNull();
  });

  it('is not what the sitting before kept: that is being asked about', () => {
    const names = ['a', 'b', 'c'];
    const drawn = new Set<string>();
    for (const seed of SEEDS) {
      for (const name of names) {
        const last = idsOf(later(seed, name, DAY_MS)).at(-1);
        expect(last).not.toBe(`${lesson.id}.keep-${name}`);
        drawn.add(`${name}>${String(last)}`);
      }
    }
    // And either of the other two can be drawn: it is a draw, not a fixed turn.
    expect(drawn.size).toBe(6);
  });

  it('begins the next sitting, before anything is shown, with the question for a later day', () => {
    const session = later(3, 'b', DAY_MS);
    expect(session.steps[0]).toEqual({
      stage: 'independent',
      challengeId: `${lesson.id}.back-b-later-day`,
    });
    expect(session.steps[1]?.stage).toBe('demo');
    expect(getNextChallenge(session, lesson)?.challenge.id).toBe(`${lesson.id}.back-b-later-day`);
    expect(session.steps).toHaveLength(1 + 2 + 2 + 4 + 1);
  });

  it('asks the question for the same day when it is still the same day, however late', () => {
    // T0 is nine in the morning: fourteen hours on is eleven at night.
    expect(idsOf(later(3, 'b', 14 * 60 * 60 * 1000))[0]).toBe(`${lesson.id}.back-b-same-day`);
    expect(idsOf(later(3, 'b', KEPT_AT_LEAST_MS))[0]).toBe(`${lesson.id}.back-b-same-day`);
    // Sixteen hours on is one in the morning of the next day.
    expect(idsOf(later(3, 'b', 16 * 60 * 60 * 1000))[0]).toBe(`${lesson.id}.back-b-later-day`);
  });

  it('does not ask at all about something kept only a moment ago', () => {
    const session = later(3, 'b', KEPT_AT_LEAST_MS - 1);
    expect(session.steps[0]?.stage).toBe('demo');
    expect(idsOf(session).some((id) => id.includes('.back-'))).toBe(false);
    // It is still not kept a second time running.
    expect(idsOf(session).at(-1)).not.toBe(`${lesson.id}.keep-b`);
  });

  it('asks nothing where nothing was kept, or where what was kept is not something the lesson keeps', () => {
    expect(sitting(3).steps[0]?.stage).toBe('demo');
    const strange = sitting(3, {
      now: T0 + DAY_MS,
      day: dayOf(T0 + DAY_MS),
      kept: { challengeId: `${lesson.id}.keep-z`, at: T0, day: dayOf(T0) },
    });
    expect(strange.steps[0]?.stage).toBe('demo');
  });

  it('takes a clock that has been put back for the same day, not a later one', () => {
    const session = sitting(3, {
      now: T0 + DAY_MS,
      day: dayOf(T0 - DAY_MS),
      kept: kept('a', T0),
    });
    expect(idsOf(session)[0]).toBe(`${lesson.id}.back-a-same-day`);
  });

  it('refuses to be told what was kept without being told what day it is', () => {
    expect(() => sitting(3, { now: T0 + DAY_MS, kept: kept('a', T0) })).toThrow(EngineError);
  });

  it('is answered alone, and what was kept before is counted under its own skill', () => {
    const start = later(3, 'c', DAY_MS);
    const { session, attempts } = play(lesson, start, answerCorrectly, { now: T0 + DAY_MS });
    expect(session.status).toBe('completed');
    const [first] = attempts;
    expect(first?.challengeId).toBe(`${lesson.id}.back-c-later-day`);
    expect(first?.stage).toBe('independent');
    expect(first?.assistance).toBe('none');
    expect(first?.day).toBe(dayOf(T0 + DAY_MS));
    // Back, two pairs and the thing to keep: six questions answered alone.
    expect(summarizeSession(session, lesson).independentProbes).toBe(6);
  });

  it('puts a question that is asked again before the thing to keep, never after it', () => {
    const start = later(11, 'a', DAY_MS);
    const first = start.steps.find(
      (step) => step.stage === 'independent' && step.challengeId in then,
    );
    const { session } = play(lesson, start, missing(first!.challengeId), { now: T0 + DAY_MS });
    const ids = idsOf(session);
    const again = session.steps.findIndex((step) => step.reprobeOf !== undefined);
    expect(again).toBeGreaterThan(0);
    expect(keep.pool).toContain(ids.at(-1));
    expect(again).toBeLessThan(ids.length - 2);
  });

  it('does not ask again for what was kept: there is nothing else like it to ask', () => {
    const start = later(3, 'c', DAY_MS);
    const back = start.steps[0]!.challengeId;
    const { session } = play(lesson, start, missing(back, idsOf(start).at(-1)!), {
      now: T0 + DAY_MS,
    });
    expect(session.steps.filter((step) => step.reprobeOf !== undefined)).toEqual([]);
    expect(session.status).toBe('completed');
  });
});

describe('a lesson that asks none of this', () => {
  it('is planned exactly as it was', () => {
    const plain: Lesson = fixtureLesson();
    const session = createSession(plain, {
      id: 's',
      profileId: 'p-1',
      seed: 9,
      now: T0,
      contentVersion: 1,
      // Told what day it is and what was "kept", it still has nothing to ask about it.
      day: dayOf(T0),
      kept: { challengeId: 'fx-make-01.give-four', at: T0 - DAY_MS, day: dayOf(T0 - DAY_MS) },
    });
    expect(session.steps).toHaveLength(1 + 2 + 11);
    expect(session.steps[0]?.stage).toBe('demo');
    expect(answerTo(getNextChallenge(session, plain)!)).toBe('3');
  });
});
