import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addDays, dayNumber, dayOfNumber, daysBetween } from '@/engine/days';

/** What the platform says the day is, for comparison: only a test may ask it. */
const platformDay = (number: number): string =>
  new Date(number * 86_400_000).toISOString().slice(0, 10);

describe('a calendar day as a number', () => {
  it('counts whole days from the first of January 1970', () => {
    expect(dayNumber('1970-01-01')).toBe(0);
    expect(dayNumber('1970-01-02')).toBe(1);
    expect(dayNumber('1969-12-31')).toBe(-1);
    expect(dayNumber('2026-11-26')).toBe(Date.UTC(2026, 10, 26) / 86_400_000);
  });

  it('agrees with the platform on every day from 1900 to 2200, there and back', () => {
    const first = Date.UTC(1900, 0, 1) / 86_400_000;
    const last = Date.UTC(2200, 0, 1) / 86_400_000;
    for (let number = first; number <= last; number++) {
      const day = platformDay(number);
      expect(dayOfNumber(number)).toBe(day);
      expect(dayNumber(day)).toBe(number);
    }
  });

  it('knows the leap years: 2024 and 2000 have a 29th of February, 2026 and 1900 do not', () => {
    expect(dayNumber('2024-02-29')).not.toBeNull();
    expect(dayNumber('2000-02-29')).not.toBeNull();
    expect(dayNumber('2026-02-29')).toBeNull();
    expect(dayNumber('1900-02-29')).toBeNull();
  });

  it.each([
    '2026-02-30',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-11-00',
    '2026-11-32',
    '26-11-2026',
    '2026-1-5',
    '2026-11-26T09:00',
    ' 2026-11-26',
    'soon',
    '',
  ])('says that %j is not a day', (text) => {
    expect(dayNumber(text)).toBeNull();
    expect(addDays(text, 1)).toBeNull();
    expect(daysBetween(text, '2026-11-26')).toBeNull();
    expect(daysBetween('2026-11-26', text)).toBeNull();
  });

  it('reads a year before 100 as that year, and not as one in the 1900s', () => {
    // The platform's own date arithmetic takes a two-digit year for 19xx; nothing here uses it.
    expect(daysBetween('0099-12-31', '0100-01-01')).toBe(1);
    expect(dayOfNumber(dayNumber('0026-03-01') ?? Number.NaN)).toBe('0026-03-01');
  });
});

describe('days added and days between', () => {
  it('crosses the ends of months and years', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-11-26', 0)).toBe('2026-11-26');
  });

  it('is not put out by a day on which the clocks change: a day is a day, of whatever length', () => {
    // 29 March 2026 has 23 hours where summer time begins; 25 October has 25. No hour is counted here.
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('counts backwards as a negative number', () => {
    expect(daysBetween('2026-11-26', '2026-11-20')).toBe(-6);
    expect(daysBetween('2026-11-20', '2026-11-26')).toBe(6);
    expect(daysBetween('2026-11-26', '2026-11-26')).toBe(0);
  });

  it('takes a part of a day added as no day added', () => {
    expect(addDays('2026-11-26', 1.9)).toBe('2026-11-27');
    expect(addDays('2026-11-26', -1.9)).toBe('2026-11-25');
  });

  it('adding and counting undo one another, for any day and any count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -200_000, max: 200_000 }),
        fc.integer({ min: -50_000, max: 50_000 }),
        (number, count) => {
          const day = dayOfNumber(number);
          const later = addDays(day, count);
          expect(later).not.toBeNull();
          expect(daysBetween(day, later ?? '')).toBe(count);
          expect(dayNumber(later ?? '')).toBe(number + count);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('puts days in the order their text sorts in, for any two days of four-digit years', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -719_162, max: 2_932_896 }),
        fc.integer({ min: -719_162, max: 2_932_896 }),
        (a, b) => {
          const [first, second] = [dayOfNumber(a), dayOfNumber(b)];
          expect(Math.sign(first.localeCompare(second))).toBe(Math.sign(a - b));
        },
      ),
      { numRuns: 500 },
    );
  });
});
