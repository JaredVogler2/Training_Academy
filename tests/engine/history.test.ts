import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { dayByDay } from '@/engine/history';
import type { Attempt } from '@/engine/schema';
import { DAY_MS, T0, attempt } from '../helpers/content';

/**
 * What was done on each day, for a grown-up: practice and success over time, from the record and nothing else.
 */

it('retains calendar order and distinguishes practice, independent answers and duplicate records', () => {
  const first = attempt({ day: '2026-11-25' });
  const later = attempt({ seq: 1, day: '2026-11-27', lessonId: 'ng-give-01' });
  const helped = attempt({ seq: 2, day: later.day, assistance: 'hint' });
  const unclean = attempt({ seq: 3, day: later.day, clean: false });
  const invalid = attempt({ seq: 4, day: '2026-11-31' });
  const record = [later, first, helped, later, invalid, unclean];
  const days = dayByDay(record);
  expect(dayByDay([...record].reverse())).toEqual(days);
  expect(days).toMatchObject([
    {
      day: later.day,
      answers: 3,
      alone: 2,
      aloneRight: 1,
      rightWithHelp: 1,
      firstTimeAlone: new Set(),
    },
    {
      day: first.day,
      answers: 1,
      alone: 1,
      aloneRight: 1,
      rightWithHelp: 0,
      firstTimeAlone: new Set([first.skillId]),
    },
  ]);
  expect(days[0]?.lessons.size).toBe(2);
});

/** An answer on a day counted from 2 November, at the first try and alone unless said otherwise. */
const on = (days: number, seq: number, overrides: Partial<Attempt> = {}): Attempt =>
  attempt({
    at: T0 + days * DAY_MS + seq * 1000,
    seq,
    sessionId: `s-${String(days)}`,
    ...overrides,
  });

describe('day by day', () => {
  it('is nothing for a record with nothing in it', () => {
    expect(dayByDay([])).toEqual([]);
  });

  it('keeps first tries alone apart from every kind of help', () => {
    const [row] = dayByDay([
      on(0, 0),
      on(0, 1, { outcome: 'incorrect', response: 'a' }),
      // A second try is not a first try alone, right or wrong; nor is one with a hint, a grown-up or the guide.
      on(0, 2, { tryIndex: 1 }),
      on(0, 3, { hintLevel: 1, assistance: 'hint' }),
      on(0, 4, { assistance: 'adult' }),
      on(0, 5, { stage: 'guided' }),
      // Pairs found in too many turns: a first try alone that did not show the skill.
      on(0, 6, { clean: false }),
    ]);
    expect(row).toMatchObject({ answers: 7, alone: 3, aloneRight: 1, rightWithHelp: 4 });
  });

  it('says which skills were done alone for the very first time, on the day they were', () => {
    const other = { skillId: 'math.quantity.subitize-to-3', lessonId: 'ng-glance-01' };
    const rows = dayByDay([
      on(0, 0, { outcome: 'incorrect', response: 'a' }),
      on(1, 0),
      on(1, 1, { ...other, challengeId: 'ng-glance-01.c1' }),
      on(3, 0),
      on(3, 1, { ...other, challengeId: 'ng-glance-01.c2' }),
    ]);
    expect(rows.map((row) => [row.day, [...row.firstTimeAlone]])).toEqual([
      ['2026-11-05', []],
      ['2026-11-03', ['math.quantity.match-sets-to-3', 'math.quantity.subitize-to-3']],
      ['2026-11-02', []],
    ]);
    expect([...(rows[1]?.lessons ?? [])]).toEqual(['ng-same-amount-01', 'ng-glance-01']);
  });

  it('is the same whatever order the record is in, and counts every answer once, on its own day', () => {
    const one = fc.record({
      days: fc.integer({ min: 0, max: 9 }),
      outcome: fc.constantFrom<Attempt['outcome']>('correct', 'incorrect'),
      tryIndex: fc.integer({ min: 0, max: 2 }),
      skill: fc.constantFrom('math.quantity.match-sets-to-3', 'math.quantity.subitize-to-3'),
    });
    fc.assert(
      fc.property(fc.array(one, { maxLength: 30 }), fc.integer(), (picks, seed) => {
        const record = picks.map((pick, index) =>
          on(pick.days, index, {
            outcome: pick.outcome,
            response: pick.outcome === 'correct' ? undefined : 'a',
            tryIndex: pick.tryIndex,
            skillId: pick.skill,
          }),
        );
        const shuffled = [...record].sort(
          (a, b) => ((a.seq * 7919 + seed) % 31) - ((b.seq * 7919 + seed) % 31),
        );
        expect(dayByDay(shuffled)).toEqual(dayByDay(record));
        expect(dayByDay(record).reduce((sum, row) => sum + row.answers, 0)).toBe(record.length);
      }),
    );
  });
});
