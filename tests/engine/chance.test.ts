import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hasPack, loadPack } from '@/content';
import {
  DEFAULT_EVIDENCE_POLICY,
  WORLD_IDS,
  createRng,
  createSession,
  getSkillEvidence,
  judgeTask,
  parseAttempt,
  type Attempt,
  type Challenge,
} from '@/engine';
import { chanceOf, luckAmong, luckOf } from '@/engine/chance';
import {
  T0,
  answerCorrectly,
  answerWrongFirst,
  attempt,
  hintThenAnswer,
  play,
} from '../helpers/content';

const everyChallenge = async (): Promise<Challenge[]> => {
  const packs = await Promise.all(WORLD_IDS.filter(hasPack).map((world) => loadPack(world)));
  return packs.flatMap((pack) => pack.lessons.flatMap((lesson) => lesson.challenges));
};
/** A challenge by its id; or, given the id of an activity, the one that activity shows first. */
const find = async (id: string): Promise<Challenge> => {
  const all = await everyChallenge();
  const found =
    all.find((challenge) => challenge.id === id) ??
    all.find((challenge) => challenge.id.startsWith(`${id}.`));
  if (!found) throw new Error(`There is no ${id}.`);
  return found;
};

describe('how likely an answer given without looking is to be right', () => {
  it('is one in as many pictures as there are to choose from', async () => {
    for (const challenge of await everyChallenge()) {
      if (challenge.kind !== 'choose-one') continue;
      expect(chanceOf(challenge)).toBe(1 / challenge.choices.length);
    }
    // Which more? is one of two; most questions with pictures are one of three.
    expect(chanceOf(await find('ng-more-01'))).toBe(0.5);
    const sizes = new Set(
      (await everyChallenge()).flatMap((challenge) =>
        challenge.kind === 'choose-one' ? [challenge.choices.length] : [],
      ),
    );
    expect([...sizes].sort()).toEqual([2, 3]);
  });

  it('is between none and one for every challenge there is, and none for a plan or a beat', async () => {
    for (const challenge of await everyChallenge()) {
      const chance = chanceOf(challenge);
      expect(chance, challenge.id).toBeGreaterThanOrEqual(0);
      expect(chance, challenge.id).toBeLessThanOrEqual(1);
      if (challenge.kind !== 'make') continue;
      if (challenge.task.type === 'program' || challenge.task.type === 'beat') {
        expect(chance, challenge.id).toBe(0);
      }
    }
  });

  it('is one in the amounts there are to give, the orders there are to put things in, and the handfuls there are to pick', async () => {
    const give = await find('ng-give-01');
    if (give.kind !== 'make' || give.task.type !== 'give') throw new Error('not a give');
    expect(chanceOf(give)).toBe(1 / give.task.pile);
    const order = await find('eh-story-01');
    if (order.kind !== 'make' || order.task.type !== 'order') throw new Error('not an order');
    expect(order.task.cards).toHaveLength(3);
    expect(chanceOf(order)).toBeCloseTo(1 / 6);
    const select = (await everyChallenge()).find(
      (challenge) => challenge.kind === 'make' && challenge.task.type === 'select',
    );
    if (select?.kind !== 'make' || select.task.type !== 'select') throw new Error('not a select');
    expect(chanceOf(select)).toBeCloseTo(1 / (2 ** select.task.cards.length - 1));
    const echo = (await everyChallenge()).find(
      (challenge) => challenge.kind === 'make' && challenge.task.type === 'echo',
    );
    if (echo?.kind !== 'make' || echo.task.type !== 'echo') throw new Error('not an echo');
    expect(chanceOf(echo)).toBeCloseTo(1 / echo.task.cards.length ** echo.task.solution.length);
  });

  it('is, for a thing to build, the share of all the ways of building it that work', async () => {
    for (const challenge of await everyChallenge()) {
      if (challenge.kind !== 'make' || challenge.task.type !== 'design') continue;
      const { task } = challenge;
      // Every way, tried one by one here as well.
      let ways = 0;
      let work = 0;
      const walk = (chosen: string[]): void => {
        const control = task.controls[chosen.length];
        if (!control) {
          ways += 1;
          if (judgeTask(task, chosen.join('-'))?.correct) work += 1;
          return;
        }
        for (const option of control.options) walk([...chosen, option]);
      };
      walk([]);
      expect(chanceOf(challenge), challenge.id).toBeCloseTo(work / ways);
      // At least the one the content shows works, and never all of them: there is something to find.
      expect(work, challenge.id).toBeGreaterThan(0);
      expect(work, challenge.id).toBeLessThan(ways);
    }
  });

  it('is, for a tune to make, the share of all the tunes there could be that have the shape', async () => {
    const tune = await find('ml-tune-01.guided-up');
    if (tune.kind !== 'make' || tune.task.type !== 'tune') throw new Error('not a tune');
    const { task } = tune;
    // Three notes from five bars: tried here by drawing a great many at random.
    const rng = createRng(11);
    let right = 0;
    const draws = 20_000;
    for (let draw = 0; draw < draws; draw++) {
      const notes = Array.from(
        { length: task.length },
        () => task.notes[rng.int(task.notes.length)] ?? '',
      );
      if (judgeTask(task, notes.join('-'))?.correct) right += 1;
    }
    expect(chanceOf(tune)).toBeGreaterThan(0);
    expect(Math.abs(chanceOf(tune) - right / draws)).toBeLessThan(0.01);
  });

  it('is, for pairs, how often turning cards over at random finds them all in the turns allowed', async () => {
    const pairs = await find('mf-pairs-01.animals');
    if (pairs.kind !== 'make' || pairs.task.type !== 'pairs') throw new Error('not pairs');
    const { cards, par } = pairs.task;
    // Played out a great many times by someone who remembers nothing.
    const rng = createRng(7);
    const games = 40_000;
    let within = 0;
    for (let game = 0; game < games; game++) {
      let left = cards.length;
      let turns = 0;
      while (left > 0 && turns < par) {
        turns += 1;
        // Two of the cards still down: the second matches the first one time in (twice what is left, less one).
        if (rng.int(2 * left - 1) === 0) left -= 1;
      }
      if (left === 0) within += 1;
    }
    expect(Math.abs(chanceOf(pairs) - within / games)).toBeLessThan(0.01);
    // It is a lot: three pairs in six turns comes off more than one time in three without remembering a thing.
    expect(chanceOf(pairs)).toBeGreaterThan(0.33);
    expect(chanceOf(pairs)).toBeLessThan(0.45);
  });
});

describe('how likely a run of answers was to be luck', () => {
  it('is the chance of doing at least as well by chance alone', () => {
    expect(luckOf(1, 1, 0.5)).toBeCloseTo(0.5);
    expect(luckOf(4, 4, 0.5)).toBeCloseTo(1 / 16);
    expect(luckOf(3, 4, 0.5)).toBeCloseTo(5 / 16);
    expect(luckOf(6, 6, 0.5)).toBeCloseTo(1 / 64);
    expect(luckOf(7, 8, 0.5)).toBeCloseTo(9 / 256);
    expect(luckOf(4, 4, 1 / 3)).toBeCloseTo(1 / 81);
    expect(luckOf(3, 4, 1 / 3)).toBeCloseTo(9 / 81);
    expect(luckOf(3, 3, 1 / 3)).toBeCloseTo(1 / 27);
  });

  it('is one when nothing was right, and none where chance has no part', () => {
    expect(luckOf(0, 5, 0.5)).toBe(1);
    expect(luckOf(0, 0, 0)).toBe(1);
    expect(luckOf(3, 4, 0)).toBe(0);
    expect(luckOf(1, 1, 0)).toBe(0);
    expect(luckOf(2, 2, 1)).toBe(1);
    expect(luckOf(5, 4, 0.5)).toBe(0);
  });

  it('never grows when more were right, and never shrinks when the chance is greater', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        fc.double({ min: 0.01, max: 0.99, noNaN: true }),
        fc.double({ min: 0.01, max: 0.99, noNaN: true }),
        (tries, a, b) => {
          const [low, high] = a < b ? [a, b] : [b, a];
          let before = 1;
          for (let right = 0; right <= tries; right++) {
            const luck = luckOf(right, tries, low);
            expect(luck).toBeGreaterThanOrEqual(0);
            expect(luck).toBeLessThanOrEqual(1);
            expect(luck).toBeLessThanOrEqual(before + 1e-12);
            expect(luckOf(right, tries, high)).toBeGreaterThanOrEqual(luck - 1e-12);
            before = luck;
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('how likely a run of answers to different questions was to be luck', () => {
  it('is the same as for one question asked over, when every question is as easy to guess', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 10 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (tries, successes, chance) => {
          const each = Array.from({ length: tries }, () => chance);
          expect(luckAmong(successes, each)).toBeCloseTo(luckOf(successes, tries, chance), 9);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('goes by each question’s own chance', () => {
    // One of two and one of three, both right: a sixth.
    expect(luckAmong(2, [1 / 2, 1 / 3])).toBeCloseTo(1 / 6);
    // At least one of them right: all but both wrong.
    expect(luckAmong(1, [1 / 2, 1 / 3])).toBeCloseTo(1 - (1 / 2) * (2 / 3));
    // A question that cannot be guessed makes a clean sweep impossible by luck, however easy the others.
    expect(luckAmong(3, [0.5, 0.5, 0])).toBe(0);
    expect(luckAmong(2, [0.5, 0.5, 0])).toBeCloseTo(0.25);
    // Order is nothing.
    expect(luckAmong(2, [0.9, 0.1, 0.4])).toBeCloseTo(luckAmong(2, [0.4, 0.9, 0.1]));
  });

  it('is one when nothing was right, none when more were right than were asked, and takes a number that is none as none', () => {
    expect(luckAmong(0, [0.5, 0.5])).toBe(1);
    expect(luckAmong(0, [])).toBe(1);
    expect(luckAmong(3, [0.5, 0.5])).toBe(0);
    expect(luckAmong(1, [Number.NaN])).toBe(0);
    expect(luckAmong(1, [7])).toBe(1);
    expect(luckAmong(1, [-1])).toBe(0);
  });
});

describe('the chance that is written down with an answer', () => {
  it('is on every first try that had no hint, and on no other', async () => {
    const pack = await loadPack('number-garden');
    const lesson = pack.lessons.find((each) => each.id === 'ng-more-01');
    if (!lesson) throw new Error('There is no such activity.');
    const session = createSession(lesson, {
      id: 's-chance',
      profileId: 'p-1',
      seed: 3,
      now: T0,
      contentVersion: pack.contentVersion,
    });
    // Wrong first, wherever there is a wrong answer to give; then right.
    const { attempts } = play(lesson, session, answerWrongFirst);
    const first = attempts.filter((answer) => answer.tryIndex === 0 && answer.hintLevel === 0);
    const later = attempts.filter((answer) => answer.tryIndex > 0 || answer.hintLevel > 0);
    expect(first.length).toBeGreaterThan(3);
    expect(later.length).toBeGreaterThan(3);
    for (const answer of first) {
      const challenge = lesson.challenges.find((each) => each.id === answer.challengeId);
      if (!challenge) throw new Error('An answer to nothing.');
      expect(answer.chance).toBeCloseTo(chanceOf(challenge), 4);
      expect(parseAttempt(answer).ok).toBe(true);
    }
    for (const answer of later) expect('chance' in answer).toBe(false);
    // Asking for a hint first leaves the answer with none either.
    const hinted = play(lesson, session, hintThenAnswer).attempts;
    expect(hinted.length).toBeGreaterThan(3);
    for (const answer of hinted) expect('chance' in answer).toBe(false);
  });

  it('is to four places, and is none for a robot’s plan', async () => {
    const pack = await loadPack('robot-ridge');
    const [lesson] = pack.lessons;
    if (!lesson) throw new Error('There is no such activity.');
    const session = createSession(lesson, {
      id: 's-plan',
      profileId: 'p-1',
      seed: 3,
      now: T0,
      contentVersion: pack.contentVersion,
    });
    const { attempts } = play(lesson, session, answerCorrectly);
    expect(attempts.length).toBeGreaterThan(3);
    for (const answer of attempts) expect(answer.chance).toBe(0);
    const garden = await loadPack('number-garden');
    const same = garden.lessons[0];
    if (!same) throw new Error('There is no such activity.');
    const played = play(
      same,
      createSession(same, {
        id: 's-third',
        profileId: 'p-1',
        seed: 3,
        now: T0,
        contentVersion: 3,
      }),
      answerCorrectly,
    ).attempts;
    expect(played.some((answer) => answer.chance === 0.3333)).toBe(true);
  });

  it('must be a share: an answer cannot say its chance was more than certain or less than none', () => {
    expect(parseAttempt(attempt({ chance: 0.5 })).ok).toBe(true);
    expect(parseAttempt(attempt({ chance: 0 })).ok).toBe(true);
    expect(parseAttempt(attempt({ chance: 1 })).ok).toBe(true);
    expect(parseAttempt({ ...attempt(), chance: 1.5 }).ok).toBe(false);
    expect(parseAttempt({ ...attempt(), chance: -0.1 }).ok).toBe(false);
    expect(parseAttempt({ ...attempt(), chance: 'half' }).ok).toBe(false);
  });
});

describe('what the record says, when the questions are easy to guess', () => {
  const SKILL = 'math.quantity.match-sets-to-3';
  /** So many first tries alone, the first `right` of them right, on one day or on two. */
  const tries = (count: number, right: number, days = 1): Attempt[] =>
    Array.from({ length: count }, (_, index) =>
      attempt({
        seq: index,
        at: Date.UTC(2026, 10, 2 + (index % days), 9, 0, index),
        day: `2026-11-0${String(2 + (index % days))}`,
        challengeId: `ng-same-amount-01.c${String(index)}`,
        variant: index % 2 === 0 ? 'a' : 'b',
        outcome: index < right ? 'correct' : 'incorrect',
      }),
    );
  const status = (answers: Attempt[], chance: number) =>
    getSkillEvidence(answers, SKILL, DEFAULT_EVIDENCE_POLICY, chance).status;

  it('says nothing new where chance has no part: every rule is as it was', () => {
    expect(status(tries(3, 3), 0)).toBe('provisionally-independent');
    expect(status(tries(4, 3), 0)).toBe('provisionally-independent');
    expect(status(tries(6, 6, 2), 0)).toBe('consistently-independent');
    const evidence = getSkillEvidence(tries(4, 3), SKILL);
    expect(evidence).toMatchObject({ chance: 0, luck: 0, heldByLuck: false });
  });

  it('with three to choose from, three of three is "independent so far" and three of four is not: that is one time in nine by luck', () => {
    expect(status(tries(3, 3), 1 / 3)).toBe('provisionally-independent');
    expect(status(tries(4, 4), 1 / 3)).toBe('provisionally-independent');
    expect(status(tries(4, 3), 1 / 3)).toBe('practicing');
    expect(getSkillEvidence(tries(4, 3), SKILL, DEFAULT_EVIDENCE_POLICY, 1 / 3)).toMatchObject({
      heldByLuck: true,
      chance: 1 / 3,
    });
    expect(getSkillEvidence(tries(4, 3), SKILL, DEFAULT_EVIDENCE_POLICY, 1 / 3).luck).toBeCloseTo(
      1 / 9,
    );
  });

  it('with two to choose from, wants five in a row, and all of the last eight for "across days"', () => {
    expect(status(tries(4, 4), 0.5)).toBe('practicing');
    expect(status(tries(5, 5), 0.5)).toBe('provisionally-independent');
    // Seven of eight, on two days: good enough to be called independent so far, and not yet across days.
    const sevenOfEight = [...tries(8, 8, 2).slice(0, 7), ...tries(8, 0, 2).slice(7)];
    expect(getSkillEvidence(sevenOfEight, SKILL, DEFAULT_EVIDENCE_POLICY, 0.5)).toMatchObject({
      status: 'provisionally-independent',
      recentAccuracy: 0.875,
      distinctDays: 2,
    });
    // Six in a row on two days is one time in sixty-four by luck, and seven is one in a hundred and
    // twenty-eight: a child who taps without looking gets there too often for "across days" to be said of it.
    expect(status(tries(6, 6, 2), 0.5)).toBe('provisionally-independent');
    expect(status(tries(7, 7, 2), 0.5)).toBe('provisionally-independent');
    expect(getSkillEvidence(tries(7, 7, 2), SKILL, DEFAULT_EVIDENCE_POLICY, 0.5).luck).toBeCloseTo(
      1 / 128,
    );
    // All of the last eight: one time in two hundred and fifty-six.
    expect(status(tries(8, 8, 2), 0.5)).toBe('consistently-independent');
    expect(status(tries(9, 9, 2), 0.5)).toBe('consistently-independent');
  });

  it('with three to choose from, wants five of five for "across days", or seven of the last eight', () => {
    const third = 1 / 3;
    // Five of five on two days: one time in two hundred and forty-three.
    expect(status(tries(5, 5, 2), third)).toBe('consistently-independent');
    // With one of them not right: five of six is two times in a hundred by luck, six of seven is seven in a
    // thousand. Independent so far, and no more said than that.
    expect(status(tries(6, 5, 2), third)).toBe('provisionally-independent');
    expect(status(tries(7, 6, 2), third)).toBe('provisionally-independent');
    // Seven of eight: under three in a thousand.
    expect(status(tries(8, 7, 2), third)).toBe('consistently-independent');
    expect(
      getSkillEvidence(tries(8, 7, 2), SKILL, DEFAULT_EVIDENCE_POLICY, third).luck,
    ).toBeCloseTo(17 / 6561);
  });

  it('says how sure it asks to be: one time in twenty for "so far", one in two hundred for "across days"', () => {
    expect(DEFAULT_EVIDENCE_POLICY.provisional.maxLuck).toBe(0.05);
    expect(DEFAULT_EVIDENCE_POLICY.consistent.maxLuck).toBe(0.005);
  });

  it('is never called independent for answers no better than tapping without looking, on any number of days', () => {
    // Half right of two to choose from, for a month.
    const coin = Array.from({ length: 120 }, (_, index) =>
      attempt({
        seq: index,
        at: Date.UTC(2026, 10, 2 + Math.floor(index / 4), 9, 0, index),
        day: new Date(Date.UTC(2026, 10, 2 + Math.floor(index / 4))).toISOString().slice(0, 10),
        challengeId: `ng-same-amount-01.c${String(index % 9)}`,
        variant: index % 2 === 0 ? 'a' : 'b',
        outcome: index % 2 === 0 ? 'correct' : 'incorrect',
      }),
    );
    for (let upTo = 4; upTo <= coin.length; upTo += 4) {
      expect(status(coin.slice(0, upTo), 0.5)).toBe('practicing');
    }
  });

  it('goes by what each answer says of its own question, before what the caller says of the skill', () => {
    // Four of four. The caller says the skill's questions are one of two; the answers say theirs were one of three.
    const answers = tries(4, 4).map((answer) => ({ ...answer, chance: 0.3333 }));
    const evidence = getSkillEvidence(answers, SKILL, DEFAULT_EVIDENCE_POLICY, 0.5);
    expect(evidence.status).toBe('provisionally-independent');
    expect(evidence.chance).toBe(0.3333);
    expect(evidence.luck).toBeCloseTo(0.3333 ** 4);
    // The same four with nothing said of them are taken at the caller's word: not yet.
    expect(status(tries(4, 4), 0.5)).toBe('practicing');
    // And a mixture is reckoned question by question.
    const mixed = tries(4, 4).map((answer, index) =>
      index < 2 ? { ...answer, chance: 0.1 } : answer,
    );
    expect(getSkillEvidence(mixed, SKILL, DEFAULT_EVIDENCE_POLICY, 0.5).luck).toBeCloseTo(
      0.1 * 0.1 * 0.5 * 0.5,
    );
  });

  it('says of a bridge that five of six ways hold: right every time is still not much to go on', () => {
    const easy = tries(8, 8, 2).map((answer) => ({ ...answer, chance: 0.8333 }));
    const evidence = getSkillEvidence(easy, SKILL, DEFAULT_EVIDENCE_POLICY);
    expect(evidence.luck).toBeCloseTo(0.8333 ** 8);
    expect(evidence).toMatchObject({ status: 'practicing', heldByLuck: true });
  });

  it('the numbers are configuration: with luck allowed, the rules are the old ones', () => {
    const lax = {
      ...DEFAULT_EVIDENCE_POLICY,
      provisional: { ...DEFAULT_EVIDENCE_POLICY.provisional, maxLuck: 1 },
      consistent: { ...DEFAULT_EVIDENCE_POLICY.consistent, maxLuck: 1 },
    };
    expect(getSkillEvidence(tries(4, 3), SKILL, lax, 0.5).status).toBe('provisionally-independent');
    expect(getSkillEvidence(tries(6, 5, 2), SKILL, lax, 0.5).status).toBe(
      'consistently-independent',
    );
  });
});
