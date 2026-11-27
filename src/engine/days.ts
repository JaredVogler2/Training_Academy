/**
 * Calendar days, as arithmetic.
 *
 * The record keeps, with every response, the local calendar day the device said it was (`2026-11-26`). Everything
 * here works on those strings and on whole numbers of days. Nothing here reads a clock or knows a time zone: a
 * day is whatever day the device believed it was when the child answered, and "today" is handed in by the caller.
 * That is what makes the dates a review falls on the same on every run, whatever the device's clock does later.
 */

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whole days from 1970-01-01 to a date of the calendar in use today, reckoned as if it had always been in use. */
function daysFromCivil(year: number, month: number, date: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month > 2 ? month - 3 : month + 9) + 2) / 5) + date - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146_097 + dayOfEra - 719_468;
}

/** The day with a given number (whole days since 1970-01-01), as it is written in the record. */
export function dayOfNumber(number: number): string {
  const shifted = Math.floor(number) + 719_468;
  const era = Math.floor(shifted / 146_097);
  const dayOfEra = shifted - era * 146_097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36_524) -
      Math.floor(dayOfEra / 146_096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
  const date = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
  const month = shiftedMonth < 10 ? shiftedMonth + 3 : shiftedMonth - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  const two = (value: number) => String(value).padStart(2, '0');
  return `${String(year).padStart(4, '0')}-${two(month)}-${two(date)}`;
}

/**
 * The number of a day: whole days since 1970-01-01. `null` for anything that is not a day of the calendar
 * (`2026-02-30`, `2026-13-01`, `soon`): a date that does not read back as it was written was never a day.
 */
export function dayNumber(day: string): number | null {
  const found = DAY.exec(day);
  if (!found) return null;
  const number = daysFromCivil(Number(found[1]), Number(found[2]), Number(found[3]));
  return dayOfNumber(number) === day ? number : null;
}

/** A day so many days after another (or before it, for a negative count). `null` if the day is not a day. */
export function addDays(day: string, count: number): string | null {
  const number = dayNumber(day);
  return number === null ? null : dayOfNumber(number + Math.trunc(count));
}

/** How many days from one day to another: positive when `to` is the later. `null` if either is not a day. */
export function daysBetween(from: string, to: string): number | null {
  const [start, end] = [dayNumber(from), dayNumber(to)];
  return start === null || end === null ? null : end - start;
}
