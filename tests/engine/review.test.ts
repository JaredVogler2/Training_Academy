import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addDays, dayNumber, dayOfNumber } from '@/engine/days';
import {
  DEFAULT_REVIEW_POLICY,
  attemptsBySkill,
  daysAgo,
  getSkillReview,
  type ReviewPolicy,
} from '@/engine/review';
import { DEFAULT_EVIDENCE_POLICY, type Attempt } from '@/engine';
import { attempt } from '../helpers/content';

const SKILL = 'math.quantity.match-sets-to-3';
const D0 = '2026-11-02';
const day = (offset: number): string => addDays(D0, offset) ?? '';

let made = 0;
/** One answer on a given day. A first try alone and right, unless it is said otherwise. */
function on(dayText: string, overrides: Partial<Attempt> = {}): Attempt {
  made += 1;
  return attempt({
    sessionId: `s-${dayText}`,
    seq: made,
    // The moment is in step with the day unless a test says the clock was not.
    at: (dayNumber(dayText) ?? 0) * 86_400_000 + made * 1000,
    day: dayText,
    challengeId: `ng-same-amount-01.c${made}`,
    variant: made % 2 === 0 ? 'two-as-cluster' : 'three-in-a-row',
    ...overrides,
  });
}
const alone = (dayText: string, count: number): Attempt[] =>
  Array.from({ length: count }, () => on(dayText));
const helped = (dayText: string): Attempt =>
  on(dayText, { tryIndex: 1, assistance: 'hint', hintLevel: 1 });
const missed = (dayText: string): Attempt => on(dayText, { outcome: 'incorrect', response: 'a' });

const review = (attempts: Attempt[], today: string, policy?: ReviewPolicy) =>
  getSkillReview(attempts, SKILL, today, policy);

describe('when a skill is worth coming back to', () => {
  it('has nothing to come back to where nothing is recorded', () => {
    expect(review([], D0)).toMatchObject({
      basis: 'not-yet-observed',
      due: false,
      lastDay: null,
      daysSince: null,
      waitDays: null,
      overdueDays: null,
      dueOn: null,
      calendarInDoubt: false,
    });
  });

  it('offers another go, on another day, at what has only been done with help', () => {
    const record = [helped(D0), on(D0, { stage: 'guided' }), missed(D0)];
    expect(review(record, D0)).toMatchObject({
      basis: 'not-yet-alone',
      due: false,
      daysSince: 0,
      waitDays: 1,
      overdueDays: -1,
      dueOn: day(1),
    });
    expect(review(record, day(1))).toMatchObject({ due: true, overdueDays: 0, dueOn: day(1) });
  });

  it('comes back the next day to what has been done alone once or twice', () => {
    const record = alone(D0, 2);
    expect(review(record, D0)).toMatchObject({ basis: 'practicing', due: false, waitDays: 1 });
    expect(review(record, day(1))).toMatchObject({ basis: 'practicing', due: true });
  });

  it('waits two days for what is independent so far', () => {
    const record = alone(D0, 3);
    expect(review(record, D0).evidence.status).toBe('provisionally-independent');
    expect(review(record, day(1))).toMatchObject({
      basis: 'provisional',
      due: false,
      dueOn: day(2),
    });
    expect(review(record, day(2))).toMatchObject({
      basis: 'provisional',
      due: true,
      overdueDays: 0,
    });
    expect(review(record, day(5))).toMatchObject({ due: true, overdueDays: 3, dueOn: day(2) });
  });

  it('waits two weeks, then a month, then two, for what is independent across days', () => {
    const twoDays = [...alone(D0, 3), ...alone(day(2), 2)];
    expect(review(twoDays, day(2)).evidence.status).toBe('consistently-independent');
    expect(review(twoDays, day(15))).toMatchObject({
      basis: 'consistent',
      waitDays: 14,
      due: false,
    });
    expect(review(twoDays, day(16))).toMatchObject({ due: true, dueOn: day(16) });

    const threeDays = [...twoDays, ...alone(day(16), 1)];
    expect(review(threeDays, day(45))).toMatchObject({ waitDays: 30, due: false, dueOn: day(46) });
    expect(review(threeDays, day(46))).toMatchObject({ due: true });

    const fourDays = [...threeDays, ...alone(day(46), 1)];
    expect(review(fourDays, day(105))).toMatchObject({
      waitDays: 60,
      due: false,
      dueOn: day(106),
    });
    const fiveDays = [...fourDays, ...alone(day(106), 1)];
    expect(review(fiveDays, day(106))).toMatchObject({ waitDays: 60, dueOn: day(166) });
  });

  it('waits longer for what stays at "practising" on one day after another', () => {
    // One first try alone that was right each day, and one that was not before it: never steady enough to say more.
    const once = (offset: number): Attempt[] => [
      on(day(offset), { outcome: 'incorrect', response: 'a', at: offset * 86_400_000 + 1000 }),
      on(day(offset), { at: offset * 86_400_000 + 2000 }),
    ];
    const days = [0, 1, 3, 7, 14];
    const waits = [1, 2, 4, 7, 7];
    days.forEach((_, tried) => {
      const record = days.slice(0, tried + 1).flatMap(once);
      const last = day(days[tried] ?? 0);
      expect(review(record, last)).toMatchObject({
        basis: 'practicing',
        troubleDays: 0,
        waitDays: waits[tried],
      });
    });
  });

  it('waits longer for what stays at "independent so far" on one day after another', () => {
    // The same three questions, right each day: never five different successes, so never "across days".
    const three = (offset: number): Attempt[] =>
      [0, 1, 2].map((index) =>
        on(day(offset), {
          challengeId: `ng-same-amount-01.same-${String(index)}`,
          variant: index === 0 ? 'two-as-cluster' : 'three-in-a-row',
        }),
      );
    const policy = {
      ...DEFAULT_EVIDENCE_POLICY,
      consistent: { ...DEFAULT_EVIDENCE_POLICY.consistent, minIndependentSuccesses: 99 },
    };
    const days = [0, 2, 6, 13];
    const waits = [2, 4, 7, 7];
    days.forEach((_, tried) => {
      const record = days.slice(0, tried + 1).flatMap(three);
      const last = day(days[tried] ?? 0);
      const found = getSkillReview(record, SKILL, last, DEFAULT_REVIEW_POLICY, policy);
      expect(found).toMatchObject({ basis: 'provisional', waitDays: waits[tried] });
    });
  });

  it('comes back the next day when the last day ended with a first try alone that was not right, whatever went before', () => {
    const record = [...alone(D0, 3), ...alone(day(2), 2), missed(day(9))];
    expect(review(record, day(9))).toMatchObject({
      basis: 'missed-last',
      waitDays: 1,
      due: false,
      dueOn: day(10),
    });
    // Right again alone the next day: it is back to the long wait.
    const again = [...record, ...alone(day(10), 1)];
    expect(review(again, day(10)).basis).toBe('consistent');
  });

  it('counts from the last day it was practised in any way: with help today is still today', () => {
    const record = [...alone(D0, 3), helped(day(2))];
    expect(review(record, day(2))).toMatchObject({ lastDay: day(2), daysSince: 0, due: false });
  });

  it('is not put off by a second helping on the same day: the wait is in days, not sittings', () => {
    const record = [...alone(D0, 1), ...alone(D0, 1), ...alone(D0, 1), ...alone(D0, 1)];
    expect(review(record, D0).due).toBe(false);
    expect(review(record, day(2)).due).toBe(true);
  });

  it('looks only at the skill asked about', () => {
    const others = [on(day(5), { skillId: 'math.counting.give-to-5' })];
    const record = alone(D0, 1);
    expect(review([...record, ...others], day(1))).toEqual(review(record, day(1)));
    expect(getSkillReview(record, 'math.counting.give-to-5', day(1)).basis).toBe(
      'not-yet-observed',
    );
  });

  it('sorts a record into one list for each skill', () => {
    const record = [...alone(D0, 2), on(D0, { skillId: 'math.counting.give-to-5' })];
    const sorted = attemptsBySkill(record);
    expect([...sorted.keys()]).toEqual([SKILL, 'math.counting.give-to-5']);
    expect(sorted.get(SKILL)).toHaveLength(2);
    expect(review(sorted.get(SKILL) ?? [], day(1))).toEqual(review(record, day(1)));
  });
});

describe('after trouble', () => {
  const at = (dayText: string, second: number, overrides: Partial<Attempt> = {}): Attempt =>
    on(dayText, { at: (dayNumber(dayText) ?? 0) * 86_400_000 + second * 1000, ...overrides });
  const miss = (dayText: string, second: number): Attempt =>
    at(dayText, second, { outcome: 'incorrect', response: 'a' });

  it('waits longer each day that something never yet done alone is tried again', () => {
    const days = [0, 1, 3, 7, 14, 28];
    const waits = [1, 2, 4, 7, 14, 14];
    days.forEach((_, tried) => {
      const record = days.slice(0, tried + 1).map((offset) => helped(day(offset)));
      const last = day(days[tried] ?? 0);
      expect(review(record, last)).toMatchObject({
        basis: 'not-yet-alone',
        troubleDays: tried + 1,
        waitDays: waits[tried],
        dueOn: addDays(last, waits[tried] ?? 0),
      });
    });
  });

  it('counts a day once for that, however many times it was tried on it', () => {
    const record = [helped(D0), helped(D0), missed(D0), helped(D0)];
    expect(review(record, D0)).toMatchObject({ troubleDays: 1, waitDays: 1 });
  });

  it('goes by how the day ended: a miss and then a right one is a good day, a right one and then a miss is not', () => {
    const before = alone(day(-3), 2);
    const endedWell = [...before, miss(D0, 1), at(D0, 2)];
    // Three right of four: independent so far, and no trouble.
    expect(review(endedWell, D0)).toMatchObject({ basis: 'provisional', troubleDays: 0 });
    const endedBadly = [...before, at(D0, 1), miss(D0, 2)];
    expect(review(endedBadly, D0)).toMatchObject({
      basis: 'missed-last',
      troubleDays: 1,
      waitDays: 1,
    });
    // Whatever order they are written down in.
    expect(review([...endedBadly].reverse(), D0)).toEqual(review(endedBadly, D0));
  });

  it('waits longer each day running that ends badly, and a day that ends well puts an end to it', () => {
    const before = alone(day(-3), 2);
    const two = [...before, miss(D0, 1), miss(day(1), 1)];
    expect(review(two, day(1))).toMatchObject({
      basis: 'missed-last',
      troubleDays: 2,
      waitDays: 2,
    });
    const three = [...two, miss(day(3), 1)];
    expect(review(three, day(3))).toMatchObject({ troubleDays: 3, waitDays: 4, dueOn: day(7) });
    const well = [...three, at(day(7), 1)];
    // Done alone on two days now, and not steadily: the second rung of that ladder.
    expect(review(well, day(7))).toMatchObject({
      basis: 'practicing',
      troubleDays: 0,
      waitDays: 2,
    });
    // And one bad day after that is one, not four.
    expect(review([...well, miss(day(8), 1)], day(8))).toMatchObject({
      troubleDays: 1,
      waitDays: 1,
    });
  });

  it('passes by a day on which nothing was tried alone: it neither adds to the trouble nor ends it', () => {
    const record = [...alone(day(-3), 2), miss(D0, 1), helped(day(1)), miss(day(2), 1)];
    expect(review(record, day(2))).toMatchObject({ basis: 'missed-last', troubleDays: 2 });
    // The helped day is still the last day it was practised.
    expect(review(record.slice(0, 4), day(1))).toMatchObject({ troubleDays: 1, lastDay: day(1) });
  });

  it('leaves out of the count a day that is not a day', () => {
    const record = [helped(D0), on('2026-02-31', { tryIndex: 1 })];
    expect(review(record, D0)).toMatchObject({ troubleDays: 1, waitDays: 1 });
  });
});

describe('a calendar that has moved', () => {
  it('takes a day or two ahead of today as today: a journey west', () => {
    const record = alone(day(2), 2);
    for (const today of [day(1), D0]) {
      expect(review(record, today)).toMatchObject({
        lastDay: day(2),
        daysSince: 0,
        due: false,
        calendarInDoubt: false,
      });
    }
  });

  it('does not count from a day further ahead than that, and says the calendar is in doubt', () => {
    // Played on the 2nd; then, with the clock wrong, "in 2031"; then the clock was put right.
    const record = [...alone(D0, 1), ...alone('2031-01-01', 1)];
    // (It was done alone on two days, whenever the second was: the wait is two.)
    expect(review(record, day(1))).toMatchObject({
      lastDay: D0,
      daysSince: 1,
      waitDays: 2,
      due: false,
      calendarInDoubt: true,
    });
    expect(review(record, day(2))).toMatchObject({ lastDay: D0, due: true, dueOn: day(2) });
  });

  it('offers it again now when every day recorded is after today, and counts from today once it is', () => {
    // The clock has gone back to the day the device was made.
    const record = alone(D0, 3);
    const reset = '2020-01-01';
    expect(review(record, reset)).toMatchObject({
      lastDay: null,
      daysSince: null,
      due: true,
      overdueDays: 0,
      dueOn: reset,
      calendarInDoubt: true,
    });
    const played = [...record, ...alone(reset, 1)];
    expect(review(played, reset)).toMatchObject({ lastDay: reset, daysSince: 0, due: false });
    // And when the clock is put right, the days written while it was wrong are simply long ago.
    expect(review(played, day(1))).toMatchObject({
      lastDay: D0,
      daysSince: 1,
      calendarInDoubt: false,
    });
  });

  it('stops offering it for want of a date once today is near enough to the date for it to be believed', () => {
    const record = alone(day(3), 1);
    // Three days ahead cannot be believed: it is offered now. Two days ahead is a journey: it was "today".
    expect(review(record, D0)).toMatchObject({ due: true, calendarInDoubt: true });
    expect(review(record, day(1))).toMatchObject({
      due: false,
      daysSince: 0,
      calendarInDoubt: false,
    });
    expect(review(record, day(4))).toMatchObject({ due: true, daysSince: 1 });
  });

  it('finds everything due on a day far in the future, and nothing breaks', () => {
    const record = [...alone(D0, 3), ...alone(day(2), 2)];
    const far = review(record, '2099-12-31');
    expect(far.due).toBe(true);
    expect(far.overdueDays).toBe((dayNumber('2099-12-31') ?? 0) - (dayNumber(day(2)) ?? 0) - 14);
    expect(far.dueOn).toBe(day(16));
  });

  it('does not count from text that is not a day, and still counts the answer', () => {
    const record = [...alone(D0, 1), on('2026-02-31')];
    const found = review(record, day(1));
    expect(found.evidence.independentSuccesses).toBe(2);
    expect(found).toMatchObject({ lastDay: D0, daysSince: 1, calendarInDoubt: false });
  });

  it('offers nothing when today is not a day: there is no calendar to go by', () => {
    expect(review(alone(D0, 3), 'today')).toMatchObject({
      due: false,
      daysSince: null,
      dueOn: null,
      overdueDays: null,
      calendarInDoubt: true,
    });
  });

  it('says how long ago a day was, as far as today can vouch for it', () => {
    expect(daysAgo(D0, day(3))).toBe(3);
    expect(daysAgo(D0, D0)).toBe(0);
    expect(daysAgo(day(2), D0)).toBe(0);
    expect(daysAgo(day(3), D0)).toBe('after-today');
    expect(daysAgo(day(3), D0, 5)).toBe(0);
    expect(daysAgo(day(1), D0, 0)).toBe('after-today');
    expect(daysAgo('soon', D0)).toBe('not-a-day');
    expect(daysAgo(D0, 'soon')).toBe('not-a-day');
  });
});

describe('the waits', () => {
  it('are numbers that can be changed', () => {
    const slow: ReviewPolicy = {
      afterDays: { trouble: [2, 6], practicing: [3], provisional: [5], consistent: [10] },
      calendarSlackDays: 0,
    };
    expect(review(alone(D0, 1), day(2), slow)).toMatchObject({ waitDays: 3, due: false });
    expect(review(alone(D0, 3), day(5), slow)).toMatchObject({ waitDays: 5, due: true });
    expect(review([helped(D0)], day(1), slow)).toMatchObject({ waitDays: 2, due: false });
    expect(review([helped(D0), helped(day(2))], day(4), slow)).toMatchObject({ waitDays: 6 });
    expect(review([...alone(D0, 2), missed(D0)], day(2), slow)).toMatchObject({
      basis: 'missed-last',
      waitDays: 2,
      due: true,
    });
    const across = [...alone(D0, 3), ...alone(day(1), 2), ...alone(day(2), 1), ...alone(day(3), 1)];
    expect(review(across, day(3), slow)).toMatchObject({ basis: 'consistent', waitDays: 10 });
    expect(review(alone(day(1), 1), D0, slow)).toMatchObject({
      lastDay: null,
      calendarInDoubt: true,
    });
  });

  it('are never shorter than a day, whatever they are set to', () => {
    for (const bad of [0, -3, 0.2, Number.NaN, Number.NEGATIVE_INFINITY]) {
      const policy: ReviewPolicy = {
        afterDays: { trouble: [bad], practicing: [bad], provisional: [bad], consistent: [bad] },
        calendarSlackDays: 2,
      };
      for (const record of [
        [helped(D0)],
        alone(D0, 1),
        alone(D0, 3),
        [...alone(day(-2), 3), ...alone(D0, 2)],
        [...alone(D0, 2), missed(D0)],
      ]) {
        expect(review(record, D0, policy)).toMatchObject({ waitDays: 1, due: false });
        expect(review(record, day(1), policy).due).toBe(true);
      }
    }
  });

  it('fall back on a day where a list of them is empty', () => {
    const policy: ReviewPolicy = {
      ...DEFAULT_REVIEW_POLICY,
      afterDays: { trouble: [], practicing: [], provisional: [], consistent: [] },
    };
    const record = [...alone(D0, 3), ...alone(day(2), 2)];
    expect(review(record, day(2), policy)).toMatchObject({ basis: 'consistent', waitDays: 1 });
    expect(review([helped(D0), helped(day(1))], day(1), policy)).toMatchObject({ waitDays: 1 });
    expect(review(alone(D0, 1), D0, policy)).toMatchObject({ basis: 'practicing', waitDays: 1 });
    expect(review(alone(D0, 3), D0, policy)).toMatchObject({ basis: 'provisional', waitDays: 1 });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Any record at all
// ---------------------------------------------------------------------------------------------------------------------

const BASE = dayNumber('2026-11-26') ?? 0;

/** An answer of any kind, on a day up to two months before a fixed day or twelve days after, at any moment. */
const anyAnswer = fc.record({
  dayOffset: fc.integer({ min: -60, max: 12 }),
  // The moment is drawn apart from the day: a clock that has been wrong puts them out of step.
  at: fc.integer({ min: 0, max: 2_000_000_000_000 }),
  stage: fc.constantFrom<'guided' | 'independent'>('guided', 'independent'),
  tryIndex: fc.integer({ min: 0, max: 2 }),
  hintLevel: fc.integer({ min: 0, max: 2 }),
  assistance: fc.constantFrom<'none' | 'hint' | 'adult'>('none', 'hint', 'adult'),
  outcome: fc.constantFrom<'correct' | 'incorrect'>('correct', 'incorrect'),
  challenge: fc.integer({ min: 0, max: 5 }),
  variant: fc.constantFrom('a', 'b', 'c'),
  session: fc.integer({ min: 0, max: 6 }),
  other: fc.boolean(),
});

const anyRecord = fc.array(anyAnswer, { maxLength: 40 }).map((answers) =>
  answers.map((answer, index) =>
    attempt({
      sessionId: `s-${answer.session}`,
      seq: index,
      at: answer.at,
      day: dayOfNumber(BASE + answer.dayOffset),
      stage: answer.stage,
      tryIndex: answer.tryIndex,
      hintLevel: answer.hintLevel,
      assistance: answer.assistance,
      outcome: answer.outcome,
      challengeId: `ng-same-amount-01.c${answer.challenge}`,
      variant: answer.variant,
      skillId: answer.other ? 'math.counting.give-to-5' : SKILL,
    }),
  ),
);

const anyToday = fc.integer({ min: -70, max: 80 }).map((offset) => dayOfNumber(BASE + offset));

describe('for any record', () => {
  it('the answer is the same whatever order the record is in, and with answers written twice', () => {
    fc.assert(
      fc.property(anyRecord, anyToday, fc.integer(), (record, today, seed) => {
        const shuffled = fc.sample(fc.shuffledSubarray(record, { minLength: record.length }), {
          seed,
          numRuns: 1,
        })[0];
        const doubled = [...(shuffled ?? []), ...record.slice(0, record.length / 2)];
        expect(review(doubled, today)).toEqual(review(record, today));
      }),
      { numRuns: 300 },
    );
  });

  it('nothing is due on a day it was practised, or on the day or two a journey could take back', () => {
    fc.assert(
      fc.property(anyRecord, (record) => {
        for (const answer of record) {
          if (answer.skillId !== SKILL) continue;
          for (const back of [0, 1, 2]) {
            const today = addDays(answer.day, -back) ?? '';
            expect(review(record, today).due).toBe(false);
          }
        }
      }),
      { numRuns: 300 },
    );
  });

  it('what is due stays due, and the day it fell due does not move, while nothing new is recorded', () => {
    fc.assert(
      fc.property(anyRecord, anyToday, fc.integer({ min: 1, max: 400 }), (record, today, later) => {
        const now = review(record, today);
        const then = review(record, addDays(today, later) ?? '');
        // (Where the calendar is in doubt it is another matter: a day too far ahead to be believed comes to be
        // believed as today draws near it, and what was offered for want of any date is then not due.)
        if (now.due && !now.calendarInDoubt) expect(then.due).toBe(true);
        // Once today is past every day in the record, the day it falls due is fixed.
        const last = Math.max(...record.map((answer) => dayNumber(answer.day) ?? 0), 0);
        if (record.length > 0 && (dayNumber(today) ?? 0) >= last) {
          expect(then.dueOn).toBe(now.dueOn);
          expect(then.basis).toBe(now.basis);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('it is due exactly from the day it says it falls due', () => {
    fc.assert(
      fc.property(anyRecord, anyToday, (record, today) => {
        const found = review(record, today);
        if (found.basis === 'not-yet-observed') {
          expect(found.due).toBe(false);
          return;
        }
        expect(found.dueOn).not.toBeNull();
        expect(found.due).toBe((found.dueOn ?? '') <= today);
        expect(found.overdueDays).toBe(
          (dayNumber(today) ?? 0) - (dayNumber(found.dueOn ?? '') ?? 0),
        );
      }),
      { numRuns: 300 },
    );
  });

  it('answers with help change nothing for a skill that has been done alone, and never make one count as done alone', () => {
    fc.assert(
      fc.property(anyRecord, anyToday, (record, today) => {
        const own = record.filter((answer) => answer.skillId === SKILL);
        const aloneOnly = own.filter(
          (answer) =>
            answer.stage === 'independent' &&
            answer.tryIndex === 0 &&
            answer.hintLevel === 0 &&
            answer.assistance === 'none',
        );
        const withHelp = review(own, today);
        const without = review(aloneOnly, today);
        if (without.evidence.independentSuccesses > 0) {
          // The wait, and what it is reckoned from, are what the first tries alone make them.
          expect(withHelp.waitDays).toBe(without.waitDays);
          expect(withHelp.basis).toBe(without.basis);
          expect(withHelp.troubleDays).toBe(without.troubleDays);
        } else if (own.length > 0) {
          expect(withHelp.basis).toBe('not-yet-alone');
        }
      }),
      { numRuns: 300 },
    );
  });
});
