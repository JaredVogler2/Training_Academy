/**
 * Numerals, drawn rather than typed, in the same hand as the letters (letters.tsx): the shapes a child will be
 * taught to write — an open 4, a 7 with no bar through it, a 9 with a straight stick — and the same on every
 * device whatever fonts it has. Each is a few strokes on a grid: the line they stand on is 0, their tops are −38.
 */

const DIGITS: readonly { width: number; path: string }[] = [
  { width: 24, path: 'M11-19a11 19 0 1 0-22 0 11 19 0 0 0 22 0' },
  { width: 12, path: 'M-5-30L2-38V0' },
  { width: 22, path: 'M-9-28C-9-41 10-41 10-28 10-18-4-10-9 0H11' },
  {
    width: 22,
    path: 'M-9-32C-5-40 9-40 9-29 9-23 4-19.500-2-19.500 5-19.500 10-16 10-9.500 10 2-5 3-10-5',
  },
  { width: 24, path: 'M-2-38L-11-11H11M6-24V0' },
  { width: 22, path: 'M9-38H-7L-9-21C-3-25 10-24 10-12 10 1-5 3-10-4' },
  {
    width: 22,
    path: 'M7-38C-3-33-10-22-10-10.500a10 10.500 0 1 0 20 0 10 10.500 0 1 0-20 0',
  },
  { width: 22, path: 'M-10-38H10L-3 0' },
  {
    width: 22,
    path: 'M8-28.500a8 9.500 0 1 0-16 0 8 9.500 0 0 0 16 0M10-9.500a10 9.500 0 1 0-20 0 10 9.500 0 0 0 20 0',
  },
  { width: 22, path: 'M10-27.500a10 10.500 0 1 0-20 0 10 10.500 0 0 0 20 0M10-27.500V0' },
];

/** The largest number there is a numeral for here. */
export const NUMERAL_MOST = 10;

const GAP = 6;

/** How wide a number is when it is drawn, on the grid its strokes are written on. */
export function numeralWidth(value: number): number {
  const digits = Array.from(String(value), (digit) => DIGITS[Number(digit)]?.width ?? 0);
  return digits.reduce((total, width) => total + width, 0) + GAP * (digits.length - 1);
}

/**
 * The strokes of a number, to be put inside a picture: centred on x = 0, standing on y = 0. The colour and the
 * weight of the stroke are the picture's to choose.
 */
export function NumeralStrokes({
  value,
  stroke = '#22304f',
  weight = 5.5,
}: {
  value: number;
  stroke?: string;
  weight?: number;
}) {
  const digits = Array.from(String(value), (digit) => DIGITS[Number(digit)]).flatMap((digit) =>
    digit ? [digit] : [],
  );
  let x = -numeralWidth(value) / 2;
  return (
    <>
      {digits.map((digit, index) => {
        const centre = x + digit.width / 2;
        x += digit.width + GAP;
        return (
          <path
            key={index}
            transform={`translate(${String(centre)} 0)`}
            d={digit.path}
            fill="none"
            stroke={stroke}
            strokeWidth={weight}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </>
  );
}
