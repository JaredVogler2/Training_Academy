import { describe, expect, it } from 'vitest';
import { loadPack } from '@/content';
import {
  createSession,
  getSkillEvidence,
  isIndependentProbe,
  isIndependentSuccess,
  parseAttempt,
  showsTheSkill,
  summarizeSession,
  type Attempt,
  type Lesson,
} from '@/engine';
import { getSkillReview } from '@/engine/review';
import { T0, attempt, dayOf, play, type Player } from '../helpers/content';

/**
 * An answer can be right without showing the skill in one kind of task: pairs, all found in the end by anyone who
 * goes on turning cards over. Such a game was once written into the record as done alone at the first try, which
 * it was not. These hold that it is marked when it is written, and that nothing counts it.
 */

const SKILL = 'memory.recognition.find-pairs';

async function pairsLesson(): Promise<Lesson> {
  const pack = await loadPack('memory-forest');
  const lesson = pack.lessons.find((each) => each.id === 'mf-pairs-01');
  if (!lesson) throw new Error('There is no lesson of pairs.');
  return lesson;
}

/** Every board finished in so many turns for each of its cards: one is the fewest there could be. */
const inTurns =
  (perCard: number): Player =>
  (view) => {
    const { challenge } = view;
    if (challenge.kind !== 'make' || challenge.task.type !== 'pairs') {
      throw new Error('Not a game of pairs.');
    }
    return { type: 'answer', response: String(challenge.task.cards.length * perCard) };
  };

async function sitting(perCard: number, seed = 5, at = T0) {
  const lesson = await pairsLesson();
  const session = createSession(lesson, {
    id: `s-${String(perCard)}-${String(seed)}`,
    profileId: 'p-1',
    seed,
    now: at,
    contentVersion: 2,
    day: dayOf(at),
  });
  return { lesson, ...play(lesson, session, inTurns(perCard), { now: at }) };
}

describe('a game of pairs that took far more turns than remembering needs', () => {
  it('is written down as right, and as not showing the skill', async () => {
    const { attempts } = await sitting(10);
    expect(attempts.length).toBeGreaterThan(4);
    for (const answer of attempts) {
      expect(answer.outcome).toBe('correct');
      expect(answer.clean).toBe(false);
      expect(showsTheSkill(answer)).toBe(false);
      expect(parseAttempt(answer).ok).toBe(true);
    }
  });

  it('is a first try alone, and is not a success alone', async () => {
    const { attempts } = await sitting(10);
    const alone = attempts.filter((answer) => answer.stage === 'independent');
    expect(alone.length).toBeGreaterThan(0);
    for (const answer of alone) {
      expect(isIndependentProbe(answer)).toBe(true);
      expect(isIndependentSuccess(answer)).toBe(false);
    }
  });

  it('counts for nothing in what the record says: no success alone, none with the guide, and every try alone a miss', async () => {
    const { attempts, session, lesson } = await sitting(10);
    const evidence = getSkillEvidence(attempts, SKILL);
    const alone = attempts.filter((answer) => answer.stage === 'independent').length;
    expect(evidence).toMatchObject({
      status: 'exploring',
      independentSuccesses: 0,
      independentMisses: alone,
      guidedSuccesses: 0,
      assistedSuccesses: 0,
      recentAccuracy: 0,
      lastIndependentSuccessAt: null,
    });
    // The record and the sitting's own count now say the same thing.
    expect(summarizeSession(session, lesson).independentFirstTryCorrect).toBe(0);
  });

  it('stays at "exploring" however many days it is played on like that', async () => {
    const attempts: Attempt[] = [];
    for (let day = 0; day < 6; day++) {
      attempts.push(...(await sitting(10, 20 + day, T0 + day * 86_400_000)).attempts);
    }
    expect(getSkillEvidence(attempts, SKILL).status).toBe('exploring');
  });

  it('is trouble to come back to, not something that went well', async () => {
    const { attempts } = await sitting(10);
    const review = getSkillReview(attempts, SKILL, dayOf(T0));
    expect(review).toMatchObject({ basis: 'not-yet-alone', troubleDays: 1 });
    // And after a good day, a day that ends with such a game is a day that ended badly.
    const good = (await sitting(1, 7, T0 - 86_400_000)).attempts;
    expect(getSkillReview([...good, ...attempts], SKILL, dayOf(T0))).toMatchObject({
      basis: 'missed-last',
      troubleDays: 1,
    });
  });
});

describe('a game of pairs that took few turns', () => {
  it('is written down with no mark, and counts as it always did', async () => {
    const { attempts, session, lesson } = await sitting(1);
    for (const answer of attempts) {
      expect(answer.outcome).toBe('correct');
      expect('clean' in answer).toBe(false);
      expect(showsTheSkill(answer)).toBe(true);
    }
    const evidence = getSkillEvidence(attempts, SKILL);
    expect(evidence.independentSuccesses).toBe(
      summarizeSession(session, lesson).independentFirstTryCorrect,
    );
    expect(evidence.independentSuccesses).toBeGreaterThan(2);
    expect(evidence.status).toBe('provisionally-independent');
  });

  it('is clean up to the turns its board allows, and not one turn beyond', async () => {
    const lesson = await pairsLesson();
    const boards = lesson.challenges.flatMap((challenge) =>
      challenge.kind === 'make' && challenge.task.type === 'pairs' ? [challenge.task] : [],
    );
    expect(boards.length).toBeGreaterThan(5);
    const { judgeTask } = await import('@/engine');
    for (const board of boards) {
      expect(judgeTask(board, String(board.par))).toEqual({ correct: true, clean: true });
      expect(judgeTask(board, String(board.par + 1))).toEqual({ correct: true, clean: false });
    }
  });
});

describe('the mark on an answer', () => {
  it('is only ever "not clean": an answer cannot be written down as clean, and a wrong one has none', () => {
    expect(parseAttempt(attempt({ clean: false })).ok).toBe(true);
    expect(parseAttempt(attempt()).ok).toBe(true);
    expect(parseAttempt({ ...attempt(), clean: true }).ok).toBe(false);
    expect(parseAttempt({ ...attempt(), clean: 'no' }).ok).toBe(false);
    // A wrong answer is wrong, whatever else is said of it.
    const wrong = attempt({ outcome: 'incorrect' });
    expect(showsTheSkill(wrong)).toBe(false);
    expect(showsTheSkill({ ...wrong, clean: false })).toBe(false);
  });

  it('takes a guided answer out of the count of those right with the guide', () => {
    const guided = [
      attempt({ seq: 1, stage: 'guided' }),
      attempt({ seq: 2, stage: 'guided', clean: false }),
    ];
    expect(getSkillEvidence(guided, 'math.quantity.match-sets-to-3').guidedSuccesses).toBe(1);
  });

  it('counts as a miss among the latest tries alone', () => {
    const answers = [
      attempt({ seq: 1, challengeId: 'ng-same-amount-01.a' }),
      attempt({ seq: 2, challengeId: 'ng-same-amount-01.b', variant: 'other' }),
      attempt({ seq: 3, challengeId: 'ng-same-amount-01.c', clean: false }),
      attempt({ seq: 4, challengeId: 'ng-same-amount-01.d', clean: false }),
    ];
    const evidence = getSkillEvidence(answers, 'math.quantity.match-sets-to-3');
    expect(evidence).toMatchObject({
      independentSuccesses: 2,
      independentMisses: 2,
      recentAccuracy: 0.5,
      status: 'practicing',
    });
  });
});
