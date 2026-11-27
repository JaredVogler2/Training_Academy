import { describe, expect, it } from 'vitest';
import { getSkillEvidence } from '@/engine';
import type { Reason, SuggestionKind } from '@/engine/recommend';
import { describeEvidence } from '@/parent/text';
import { KIND_IN_WORDS, ago, luckInWords, reasonInWords, type Names } from '@/parent/why';
import { attempt } from '../helpers/content';

/**
 * Why Play offers what it does, in words: one sentence for each reason the engine can give, saying what the
 * reason says and no more. And what can be said of luck.
 */

const names: Names = {
  lesson: (id) => ({ a2: 'Which has more?' })[id] ?? id,
  skill: (id) => ({ 's.count': 'Counts to five', 's.more': 'Sees which has more' })[id] ?? id,
};
const say = (reason: Reason) => reasonInWords(reason, names);
const due = (
  basis: Extract<Reason, { why: 'due' }>['basis'],
  daysSince: number | null,
  waitDays: number,
): Reason => ({
  why: 'due',
  skill: 's.count',
  basis,
  lastDay: daysSince === null ? null : '2026-11-20',
  daysSince,
  waitDays,
});

describe('a reason, in words', () => {
  it('is a sentence for every reason there is, and none says anything about the child but what was done', () => {
    const every: Reason[] = [
      { why: 'begins-here' },
      { why: 'next-in-order' },
      { why: 'chosen-start' },
      { why: 'builds-on', skill: 's.count', shown: true, taken: false },
      { why: 'builds-on', skill: 's.count', shown: false, taken: true },
      { why: 'builds-on', skill: 's.count', shown: false, taken: false },
      { why: 'builds-on-nothing' },
      { why: 'passed-over', lesson: 'a2', skill: 's.count' },
      { why: 'nothing-else-ready' },
      due('not-yet-alone', 1, 1),
      due('missed-last', 2, 1),
      due('practicing', 3, 2),
      due('provisional', 4, 4),
      due('consistent', 30, 14),
      { why: 'mix', before: 2, fresh: 5, share: 0.7, chose: 'before' },
      { why: 'mix', before: 8, fresh: 1, share: 0.7, chose: 'fresh' },
      { why: 'nothing-new' },
      { why: 'nothing-due' },
      { why: 'one-a-day' },
      { why: 'longest-ago', lastDay: '2026-11-02' },
      { why: 'longest-ago', lastDay: null },
      { why: 'calendar-in-doubt' },
    ];
    // Every kind of reason the engine has is among them.
    expect(new Set(every.map((reason) => reason.why)).size).toBe(14);
    for (const reason of every) {
      const sentence = say(reason);
      expect(sentence, reason.why).toMatch(/^[“A-Z].*\.$/);
      // Nothing that grades a child, measures one, or says what they cannot do.
      expect(sentence, reason.why).not.toMatch(
        /cannot|can’t|unable|fail|behind|ahead|slow|clever|bright|struggl|weak|poor|level|score|mastered|abilit|intelligen/i,
      );
      // A name, never an id.
      expect(sentence, reason.why).not.toMatch(/s\.count|a2/);
    }
  });

  it('says what something builds on, and whether the record shows it or a grown-up said it', () => {
    expect(say({ why: 'builds-on', skill: 's.count', shown: true, taken: false })).toBe(
      'It builds on “Counts to five”, which has been done without help.',
    );
    expect(say({ why: 'builds-on', skill: 's.count', shown: false, taken: true })).toBe(
      'It builds on “Counts to five”, which is taken on your word: it is taught before the place you chose. The record does not show it.',
    );
    // What the record shows comes first: it is not put down to a grown-up's word when the child has shown it.
    expect(say({ why: 'builds-on', skill: 's.count', shown: true, taken: true })).toBe(
      'It builds on “Counts to five”, which has been done without help.',
    );
    expect(say({ why: 'builds-on', skill: 's.count', shown: false, taken: false })).toBe(
      'It builds on “Counts to five”, which has not yet been done without help.',
    );
    expect(say({ why: 'passed-over', lesson: 'a2', skill: 's.more' })).toBe(
      '“Which has more?” comes earlier and was passed over for now: it builds on “Sees which has more”, which has not yet been done without help. It is still open on the world’s page.',
    );
  });

  it('says why something played before has come back: what the record holds, when, and the wait', () => {
    expect(say(due('not-yet-alone', 1, 1))).toBe(
      '“Counts to five” has been practised and not yet done without help. It was last practised yesterday, and the game comes back to it after 1 day.',
    );
    expect(say(due('missed-last', 2, 1))).toBe(
      'The last first try without help at “Counts to five” was not right. It was last practised 2 days ago, and the game comes back to it after 1 day.',
    );
    expect(say(due('practicing', 3, 2))).toBe(
      '“Counts to five” has been done without help, not yet often enough to say more. It was last practised 3 days ago, and comes back after 2 days.',
    );
    expect(say(due('provisional', 4, 4))).toBe(
      '“Counts to five” has been done without help several times, close together. It was last practised 4 days ago; coming back after 4 days is what shows whether it has lasted.',
    );
    expect(say(due('consistent', 30, 14))).toBe(
      '“Counts to five” has been done without help on separate days. It was last practised 30 days ago, and is looked at again after 14 days.',
    );
    // With no day the calendar can vouch for, it says so, and makes up no number.
    expect(say(due('practicing', null, 1))).toBe(
      '“Counts to five” has been done without help, not yet often enough to say more. It was last practised on a day this device’s calendar cannot vouch for, and comes back after 1 day.',
    );
  });

  it('says how the two piles were mixed, with the numbers it went by', () => {
    expect(say({ why: 'mix', before: 2, fresh: 5, share: 0.7, chose: 'before' })).toBe(
      'Of the last 7 activities played, 2 had been played before and 5 were new. While anything is due, the game aims for about 7 in 10 to be ones played before, so this time it is one played before.',
    );
    expect(say({ why: 'mix', before: 8, fresh: 1, share: 0.5, chose: 'fresh' })).toBe(
      'Of the last 9 activities played, 8 had been played before and 1 was new. While anything is due, the game aims for about 5 in 10 to be ones played before, so this time it is something new.',
    );
    // Said as a person would: one activity is not "the last 1 activity", and none is not "0".
    expect(say({ why: 'mix', before: 0, fresh: 1, share: 0.7, chose: 'before' })).toMatch(
      /^The last activity played was new\. While anything is due/,
    );
    expect(say({ why: 'mix', before: 1, fresh: 0, share: 0.7, chose: 'fresh' })).toMatch(
      /^The last activity played was one played before\. While anything is due/,
    );
    expect(say({ why: 'mix', before: 0, fresh: 3, share: 0.7, chose: 'before' })).toMatch(
      /^Of the last 3 activities played, none had been played before and 3 were new\./,
    );
    expect(say({ why: 'mix', before: 4, fresh: 0, share: 0.7, chose: 'fresh' })).toMatch(
      /^Of the last 4 activities played, 4 had been played before and none were new\./,
    );
    expect(say({ why: 'mix', before: 0, fresh: 0, share: 0.7, chose: 'before' })).toMatch(
      /^Nothing has been played lately\./,
    );
  });

  it('writes a day as a day, and how long ago as people say it', () => {
    expect(say({ why: 'longest-ago', lastDay: '2026-11-02' })).toBe(
      'Of everything finished here, this is the one played longest ago: on 2 November 2026.',
    );
    expect([ago(0), ago(1), ago(2), ago(40), ago(null)]).toEqual([
      'today',
      'yesterday',
      '2 days ago',
      '40 days ago',
      'on a day this device’s calendar cannot vouch for',
    ]);
  });

  it('has a short label for every kind of thing that is offered', () => {
    const kinds: SuggestionKind[] = [
      'new',
      'reach',
      'again',
      'practice',
      'missed',
      'review',
      'free',
    ];
    expect(Object.keys(KIND_IN_WORDS).sort()).toEqual([...kinds].sort());
    expect(new Set(Object.values(KIND_IN_WORDS)).size).toBe(kinds.length);
  });
});

describe('what can be said of luck', () => {
  const SKILL = 'math.quantity.match-sets-to-3';
  /** So many first tries alone, each right, each with so much to be had by luck. */
  const right = (count: number, chance: number) =>
    Array.from({ length: count }, (_, index) =>
      attempt({
        seq: index,
        challengeId: `q${String(index)}`,
        variant: index % 2 === 0 ? 'one' : 'two',
        chance,
      }),
    );

  it('is nothing where nothing has been tried alone, and where luck has no part in the questions', () => {
    expect(luckInWords(getSkillEvidence([], SKILL))).toBeNull();
    expect(luckInWords(getSkillEvidence(right(5, 0), SKILL))).toBeNull();
    expect(
      luckInWords(getSkillEvidence([attempt({ outcome: 'incorrect', chance: 0.5 })], SKILL)),
    ).toBeNull();
  });

  it('says so when first tries could still be luck, and that more of the same will tell', () => {
    // Four right of two pictures each: one time in sixteen by luck, which is not rare enough.
    const evidence = getSkillEvidence(right(4, 0.5), SKILL);
    expect(evidence.status).toBe('practicing');
    expect(evidence.heldByLuck).toBe(true);
    expect(luckInWords(evidence)).toBe(
      'Its questions can be got right by luck, about 1 time in 2, and the latest first tries could still be that. More of the same will tell.',
    );
    expect(describeEvidence(evidence)).toBe(
      '4 independent successes in 2 kinds of question on 1 day. ' +
        'Its questions can be got right by luck, about 1 time in 2, and the latest first tries could still be that. More of the same will tell.',
    );
  });

  it('says how often luck alone would do as well, once more has been said of a skill', () => {
    // Five of two pictures: one time in thirty-two.
    const five = getSkillEvidence(right(5, 0.5), SKILL);
    expect(five.status).toBe('provisionally-independent');
    expect(luckInWords(five)).toBe(
      'Its questions can be got right by luck, about 1 time in 2; first tries as good as the latest would come by luck alone about 3 times in 100.',
    );
    // Three of three pictures: one time in twenty-seven.
    expect(luckInWords(getSkillEvidence(right(3, 1 / 3), SKILL))).toBe(
      'Its questions can be got right by luck, about 1 time in 3; first tries as good as the latest would come by luck alone about 4 times in 100.',
    );
    // As the record keeps it, to four places: still one time in three, not four.
    expect(luckInWords(getSkillEvidence(right(3, 0.3333), SKILL))).toMatch(
      /^Its questions can be got right by luck, about 1 time in 3;/,
    );
    // A game of pairs that comes off by blind turning nearly two times in five.
    expect(luckInWords(getSkillEvidence(right(5, 0.378), SKILL))).toMatch(
      /^Its questions can be got right by luck, about 1 time in 3;/,
    );
    // Eight of three pictures: far less than one time in a hundred.
    expect(luckInWords(getSkillEvidence(right(8, 1 / 3), SKILL))).toBe(
      'Its questions can be got right by luck, about 1 time in 3; first tries as good as the latest would come by luck alone less than 1 time in 100.',
    );
  });

  it('says nothing of luck where too little has been done alone for anything to be said', () => {
    // Two right: "practising" for want of a third, not for luck.
    const evidence = getSkillEvidence(right(2, 0.5), SKILL);
    expect(evidence.heldByLuck).toBe(false);
    expect(luckInWords(evidence)).toBeNull();
  });
});
