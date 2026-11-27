import { describe, expect, it } from 'vitest';
import { loadPack } from '@/content';
import {
  advanceDemo,
  createSession,
  designOf,
  getNextChallenge,
  judgeTask,
  submitAttempt,
  tokensOf,
  writeTokens,
  type ChallengeView,
  type Lesson,
  type LessonSession,
  type MakeChallenge,
} from '@/engine';
import { T0, answerTo, dayOf } from '../helpers/content';

/** Play on, answering rightly, until what is shown is what is waited for, or the activity ends. */
function advancePast(
  lesson: Lesson,
  start: LessonSession,
  until: (view: ChallengeView) => boolean,
): LessonSession {
  let session = start;
  for (let moves = 0; moves < 200; moves++) {
    const view = getNextChallenge(session, lesson);
    if (!view || until(view)) return session;
    if (view.stage === 'demo') {
      session = advanceDemo(session, lesson, T0);
      continue;
    }
    const result = submitAttempt(session, lesson, {
      key: view.key,
      response: answerTo(view),
      now: T0,
      day: dayOf(T0),
      durationMs: 1000,
    });
    if (!result.accepted) throw new Error(`Move rejected: ${result.reason}`);
    session = result.session;
  }
  throw new Error('The activity did not end.');
}

/**
 * A design is written down as the option chosen for each part that can be changed. One of the shelter's parts
 * is the prop, and one of its options is to have none: "none", which is also the word an answer with nothing
 * in it is written as. A wall tested with no prop was read back as no answer at all, the engine refused it, and
 * the press that tested it did nothing.
 */

async function shelter(): Promise<Lesson> {
  const pack = await loadPack('inventor-island');
  const lesson = pack.lessons.find((each) => each.id === 'ii-shelter-01');
  if (!lesson) throw new Error('There is no shelter.');
  return lesson;
}

/** The shelter's benches with one part to change: the prop. */
async function onePart(): Promise<MakeChallenge[]> {
  return (await shelter()).challenges.flatMap((challenge) =>
    challenge.kind === 'make' &&
    challenge.task.type === 'design' &&
    challenge.task.controls.length === 1
      ? [challenge]
      : [],
  );
}

describe('a wall with no prop', () => {
  it('is something the shelter lets a child try, on every bench where the prop is the one thing to change', async () => {
    const benches = await onePart();
    expect(benches.length).toBeGreaterThanOrEqual(4);
    for (const { task } of benches) {
      if (task.type !== 'design') continue;
      expect(task.controls[0]?.id).toBe('prop');
      expect(task.controls[0]?.options).toContain('none');
    }
  });

  it('is written as it always was, and is read back as one choice, not as nothing', () => {
    expect(writeTokens(['none'])).toBe('none');
    expect(designOf('none')).toEqual(['none']);
    expect(designOf('low-none')).toEqual(['low', 'none']);
    // An answer of cards, with none picked, is still nothing.
    expect(tokensOf('none')).toEqual([]);
  });

  it('is judged: in a gust the wall goes over, and that is a wrong answer and not no answer', async () => {
    for (const challenge of await onePart()) {
      const { task } = challenge;
      if (task.type !== 'design') continue;
      const judged = judgeTask(task, 'none');
      expect(judged, challenge.id).not.toBeNull();
      expect(judged?.correct, challenge.id).toBe(false);
      expect(judged?.misconception, challenge.id).toBe('blew-over');
      // And each of the other two is judged as it was.
      expect(judgeTask(task, 'left')).not.toBeNull();
      expect(judgeTask(task, 'right')).not.toBeNull();
      expect(judgeTask(task, task.solution.join('-'))?.correct).toBe(true);
    }
  });

  it('is taken as an answer by a sitting, and written down', async () => {
    const lesson = await shelter();
    let found = 0;
    for (let seed = 1; seed <= 12; seed++) {
      let session = createSession(lesson, {
        id: `s-${String(seed)}`,
        profileId: 'p-1',
        seed,
        now: T0,
        contentVersion: 2,
      });
      // On to the first bench of this sitting with the prop as its one part, answering rightly on the way.
      session = advancePast(lesson, session, (view) => {
        const { challenge } = view;
        return (
          challenge.kind === 'make' &&
          challenge.task.type === 'design' &&
          challenge.task.controls.length === 1 &&
          view.stage !== 'demo'
        );
      });
      const view = getNextChallenge(session, lesson);
      if (!view) continue;
      found += 1;
      const result = submitAttempt(session, lesson, {
        key: view.key,
        response: 'none',
        now: T0 + 5000,
        day: dayOf(T0),
        durationMs: 3000,
      });
      expect(result.accepted, view.challenge.id).toBe(true);
      if (!result.accepted) continue;
      expect(result.attempt).toMatchObject({ response: 'none', outcome: 'incorrect' });
      expect(result.feedback).toMatchObject({ outcome: 'incorrect', next: 'retry' });
    }
    expect(found).toBeGreaterThan(5);
  });

  it('is no answer to a bench with two parts: a design has a choice for every part', async () => {
    const two = (await shelter()).challenges.find(
      (challenge) =>
        challenge.kind === 'make' &&
        challenge.task.type === 'design' &&
        challenge.task.controls.length === 2,
    );
    if (two?.kind !== 'make') throw new Error('There is no bench with two parts.');
    expect(judgeTask(two.task, 'none')).toBeNull();
    expect(judgeTask(two.task, 'low-none')).not.toBeNull();
  });
});
