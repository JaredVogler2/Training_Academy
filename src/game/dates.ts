const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** A day as it is written for a grown-up: "26 November 2026". (`day` is a local date, YYYY-MM-DD.) */
export function dayInWords(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  const name = MONTHS[(month ?? 0) - 1];
  if (!year || !name || !date) return day;
  return `${String(date)} ${name} ${String(year)}`;
}
