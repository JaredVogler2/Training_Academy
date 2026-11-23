/**
 * Letters, drawn rather than typed. A child meeting a letter for the first time should meet the shape they will be
 * taught to write: a round "a" with a stick, not the two-storey "a" of a book face, and the same on every device
 * whatever fonts it has. Each is a few strokes on a grid: the line they sit on is 0, the top of a small letter is
 * −20, the top of a tall one −38, the bottom of a tail +16.
 */

const GLYPHS: Readonly<Record<string, { width: number; path: string; dot?: [number, number] }>> = {
  a: { width: 26, path: 'M9.500-10a9.500 9.500 0 1 0-19 0 9.500 9.500 0 0 0 19 0M9.500-20V0' },
  c: { width: 24, path: 'M8-16.500a10 10 0 1 0 0 13' },
  e: { width: 26, path: 'M-9.500-10h19a9.500 9.500 0 1 0-3 7' },
  f: { width: 20, path: 'M8-35c-5-4-10-1-10 5V0M-9-20H6' },
  h: { width: 24, path: 'M-8-38V0M-8-12c0-10 16-10 16 0V0' },
  i: { width: 10, path: 'M0-20V0', dot: [0, -30] },
  l: { width: 10, path: 'M0-38V0' },
  m: { width: 38, path: 'M-14-20V0M-14-12c0-10 14-10 14 0V0M0-12c0-10 14-10 14 0V0' },
  n: { width: 24, path: 'M-8-20V0M-8-12c0-10 16-10 16 0V0' },
  o: { width: 26, path: 'M10-10a10 10 0 1 0-20 0 10 10 0 0 0 20 0' },
  p: { width: 26, path: 'M-9.500-20V16M-9.500-10a9.500 9.500 0 1 0 19 0 9.500 9.500 0 0 0-19 0' },
  r: { width: 18, path: 'M-5-20V0M-5-12c0-7 7-9 12-6' },
  s: { width: 22, path: 'M8-16.500c-4-4.500-16-4.500-16 1.500s16 4 16 10-12 6-16.500 1.500' },
  t: { width: 20, path: 'M0-34V-6c0 6 4 6.500 8 4.500M-8-20H8' },
  u: { width: 24, path: 'M-8-20v12c0 10 16 10 16 0M8-20V0' },
};

export const LETTERS = Object.keys(GLYPHS);

/** One or two letters as a picture, as large as the box it is given. */
export function Letters({ letters, className }: { letters: string; className?: string }) {
  const glyphs = Array.from(letters, (letter) => GLYPHS[letter]).flatMap((glyph) =>
    glyph ? [glyph] : [],
  );
  const gap = 5;
  const width = glyphs.reduce((total, glyph) => total + glyph.width, 0) + gap * (glyphs.length - 1);
  let x = -width / 2;
  return (
    <svg
      className={className}
      viewBox={`${String(-Math.max(34, width / 2 + 8))} -46 ${String(Math.max(68, width + 16))} 70`}
      aria-hidden="true"
      focusable="false"
      data-letters={letters}
    >
      {glyphs.map((glyph, index) => {
        const centre = x + glyph.width / 2;
        x += glyph.width + gap;
        return (
          <g key={index} transform={`translate(${String(centre)} 0)`}>
            <path
              d={glyph.path}
              fill="none"
              stroke="#22304f"
              strokeWidth="5.500"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {glyph.dot && <circle cx={glyph.dot[0]} cy={glyph.dot[1]} r="3.400" fill="#22304f" />}
          </g>
        );
      })}
    </svg>
  );
}
