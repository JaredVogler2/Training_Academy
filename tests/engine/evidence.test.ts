import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EVIDENCE_POLICY,
  advanceDemo,
  getHint,
  getNextChallenge,
  getSkillEvidence,
  type Attempt,
} from '@/engine';
import {
  DAY_MS,
  T0,
  answerCorrectly,
  attempt,
  hintThenAnswer,
  newSession,
  play,
  sampleLesson,
} from '../helpers/content';

const SKILL = 'math.quantity.match-sets-to-3';
const lesson = sampleLesson();

/** `count` independent successes, cycling through the given variants, all on the day of `at`. */
function successes(count: number, variants: string[], at = T0, sessionId = 's-1'): Attempt[] {
  return Array.from({ length: count }, (_, index) =>
    attempt({
      sessionId,
      seq: index,
      at: at + index * 1000,
      challengeId: `ng-same-amount-01.c${index}`,
      variant: variants[index % variants.length] ?? 'v',
    }),
  );
}

describe('skill evidence', () => {
  it('starts as "not yet observed", which is not a judgement', () => {
    expect(getSkillEvidence([], SKILL)).toMatchObject({
      status: 'not-yet-observed',
      totalAttempts: 0,
      independentSuccesses: 0,
      recentAccuracy: null,
      lastAttemptAt: null,
    });
  });

  it('opening lessons, watching demonstrations and reading hints leave no evidence at all', () => {
    const attempts: Attempt[] = [];
    for (let seed = 0; seed < 40; seed++) {
      let session = newSession(lesson, seed);
      getNextChallenge(session, lesson);
      session = advanceDemo(session, lesson, T0);
      for (let rung = 0; rung < 5; rung++) {
        getNextChallenge(session, lesson);
        session = getHint(session, lesson, T0).session;
      }
      expect(session.nextSeq).toBe(0);
    }
    expect(getSkillEvidence(attempts, SKILL).status).toBe('not-yet-observed');
  });

  it('only wrong or helped answers: "exploring"', () => {
    const evidence = getSkillEvidence(
      [
        attempt({ seq: 0, outcome: 'incorrect', response: 'a' }),
        attempt({ seq: 1, tryIndex: 1 }),
        attempt({ seq: 2, hintLevel: 1, assistance: 'hint' }),
        attempt({ seq: 3, assistance: 'adult' }),
      ],
      SKILL,
    );
    expect(evidence).toMatchObject({
      status: 'exploring',
      totalAttempts: 4,
      independentSuccesses: 0,
      independentMisses: 1,
      assistedSuccesses: 3,
    });
  });

  it('first-try success in supported practice: "guided", not independent', () => {
    const evidence = getSkillEvidence(
      [attempt({ seq: 0, stage: 'guided' }), attempt({ seq: 1, stage: 'guided' })],
      SKILL,
    );
    expect(evidence).toMatchObject({
      status: 'guided',
      guidedSuccesses: 2,
      independentSuccesses: 0,
    });
  });

  it('a little independent success: "practicing"', () => {
    expect(getSkillEvidence(successes(2, ['a', 'b']), SKILL).status).toBe('practicing');
  });

  it('three independent successes over two presentations: "provisionally independent"', () => {
    const evidence = getSkillEvidence(successes(3, ['a', 'b']), SKILL);
    expect(evidence).toMatchObject({
      status: 'provisionally-independent',
      independentSuccesses: 3,
      distinctVariants: 2,
      distinctDays: 1,
      recentAccuracy: 1,
    });
  });

  it('one presentation repeated is not enough, however often it is right', () => {
    expect(getSkillEvidence(successes(9, ['only']), SKILL).status).toBe('practicing');
  });

  it('"consistently independent" needs separate days', () => {
    const oneDay = successes(6, ['a', 'b', 'c']);
    expect(getSkillEvidence(oneDay, SKILL).status).toBe('provisionally-independent');

    const twoDays = [
      ...successes(3, ['a', 'b'], T0, 's-1'),
      ...successes(3, ['c', 'a'], T0 + 2 * DAY_MS, 's-2').map((a, index) => ({
        ...a,
        challengeId: `ng-same-amount-01.d${index}`,
      })),
    ];
    expect(getSkillEvidence(twoDays, SKILL)).toMatchObject({
      status: 'consistently-independent',
      distinctDays: 2,
      distinctSessions: 2,
    });
  });

  it('replaying one lesson all day cannot reach "consistently independent"', () => {
    const attempts: Attempt[] = [];
    for (let round = 0; round < 25; round++) {
      attempts.push(
        ...play(lesson, newSession(lesson, round, `replay-${round}`), answerCorrectly, {
          now: T0 + round * 60_000,
        }).attempts,
      );
    }
    const evidence = getSkillEvidence(attempts, SKILL);
    expect(evidence.distinctDays).toBe(1);
    expect(evidence.status).toBe('provisionally-independent');
    // The same challenge on the same day is counted once.
    expect(evidence.independentSuccesses).toBeLessThanOrEqual(lesson.plan.independent.pool.length);
  });

  it('a lesson played with hints every time stays at "exploring"', () => {
    const attempts: Attempt[] = [];
    for (let round = 0; round < 6; round++) {
      attempts.push(
        ...play(lesson, newSession(lesson, round, `hinted-${round}`), hintThenAnswer, {
          now: T0 + round * DAY_MS,
        }).attempts,
      );
    }
    expect(getSkillEvidence(attempts, SKILL)).toMatchObject({
      status: 'exploring',
      independentSuccesses: 0,
      guidedSuccesses: 0,
    });
  });

  it('recent misses hold the status back', () => {
    const good = successes(5, ['a', 'b'], T0, 's-1');
    const bad = Array.from({ length: 6 }, (_, index) =>
      attempt({
        sessionId: 's-2',
        seq: index,
        at: T0 + 3 * DAY_MS + index,
        outcome: 'incorrect',
        response: 'a',
        challengeId: `ng-same-amount-01.e${index}`,
      }),
    );
    const evidence = getSkillEvidence([...good, ...bad], SKILL);
    expect(evidence.recentAccuracy).toBeCloseTo(2 / 8);
    expect(evidence.status).toBe('practicing');
  });

  it('ignores other skills and attempts that were stored twice', () => {
    const own = successes(3, ['a', 'b']);
    const evidence = getSkillEvidence(
      [...own, ...own, attempt({ sessionId: 'other', skillId: 'math.counting.count-to-5' })],
      SKILL,
    );
    expect(evidence.totalAttempts).toBe(3);
    expect(evidence.independentSuccesses).toBe(3);
  });

  it('does not depend on the order attempts are read back in', () => {
    const attempts = [
      ...successes(4, ['a', 'b']),
      attempt({ sessionId: 's-9', outcome: 'incorrect' }),
    ];
    expect(getSkillEvidence([...attempts].reverse(), SKILL)).toEqual(
      getSkillEvidence(attempts, SKILL),
    );
  });

  it('thresholds are configuration, not constants', () => {
    const strict = {
      ...DEFAULT_EVIDENCE_POLICY,
      provisional: { minIndependentSuccesses: 10, minDistinctVariants: 2, minRecentAccuracy: 0.75 },
    };
    expect(getSkillEvidence(successes(3, ['a', 'b']), SKILL, strict).status).toBe('practicing');
  });
});
