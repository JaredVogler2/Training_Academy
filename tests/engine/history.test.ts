import { expect, it } from 'vitest';
import { dayByDay } from '@/engine/history';
import { attempt } from '../helpers/content';

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
