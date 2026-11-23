import type { CSSProperties, ReactNode } from 'react';
import type { Arrangement, ItemKind } from '@/engine';
import type { PictureProps, WorldModule } from '../modules';
import styles from './numberGarden.module.css';

/**
 * Number Garden's pictures: small sets of identical things, drawn so that the only thing that differs between two
 * sets is how many there are. No numerals anywhere.
 */

const INK = '#22304f';

/** Each thing is drawn around (0, 0), about 40 units across. */
const ITEMS: Record<ItemKind, ReactNode> = {
  apple: (
    <>
      <path
        d="M0-9c-9-9-20-2-18 11 2 12 10 19 18 14 8 5 16-2 18-14C20-11 9-18 0-9z"
        fill="#ef5350"
      />
      <path
        d="M-11-2c1-4 4-7 8-8"
        fill="none"
        stroke="#ff9f9a"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M0-9c0-5 2-8 5-10"
        fill="none"
        stroke="#7a5236"
        strokeWidth="2.800"
        strokeLinecap="round"
      />
      <path d="M4-14c3-5 9-6 13-3-3 5-9 6-13 3z" fill="#5fbf64" />
    </>
  ),
  leaf: (
    <>
      <path d="M-16 14C-19-6-4-20 18-17 20 4 6 19-16 14z" fill="#5fbf64" />
      <path
        d="M-15 13C-5 4 6-7 16-15"
        fill="none"
        stroke="#2f8440"
        strokeWidth="2.600"
        strokeLinecap="round"
      />
      <path
        d="M-4 3l-6-5M5-6l-6-5"
        fill="none"
        stroke="#2f8440"
        strokeWidth="2.200"
        strokeLinecap="round"
        opacity="0.7"
      />
    </>
  ),
  snail: (
    <>
      <path
        d="M13-6-11-15M16-6 18-16"
        fill="none"
        stroke="#c98a4b"
        strokeWidth="2.600"
        strokeLinecap="round"
      />
      <circle cx="11" cy="-16" r="2.200" fill={INK} />
      <circle cx="18" cy="-17" r="2.200" fill={INK} />
      <path
        d="M-19 15c0-4 4-5 9-5h18c5 0 6-6 5-12-1-4 6-5 7 0 2 10-1 19-10 19h-25c-3 0-4-1-4-2z"
        fill="#ffd9a8"
      />
      <circle cx="-4" cy="-1" r="13" fill="#f0a55c" />
      <path
        d="M-4-1a3 3 0 1 1 3-3 7 7 0 1 1-7-7"
        fill="none"
        stroke="#b86a2a"
        strokeWidth="2.600"
        strokeLinecap="round"
      />
    </>
  ),
  acorn: (
    <>
      <path d="M0-19v5" stroke="#7a5236" strokeWidth="3" strokeLinecap="round" />
      <path d="M-12-2h24c0 12-6 20-12 21-6-1-12-9-12-21z" fill="#dba85c" />
      <path
        d="M-6 4c0 5 2 9 4 11"
        fill="none"
        stroke="#f0c98a"
        strokeWidth="2.600"
        strokeLinecap="round"
      />
      <path d="M-15-2c0-14 30-14 30 0 0 3-30 3-30 0z" fill="#8a5f3f" />
      <path
        d="M-9-9h3M-1-11h3M7-9h3M-5-5h3M3-5h3"
        stroke="#6b4a2e"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
};

const WIDTH = 200;
const HEIGHT = 130;

const CLUSTERS: Record<number, readonly (readonly [number, number])[]> = {
  1: [[100, 65]],
  2: [
    [74, 42],
    [126, 88],
  ],
  3: [
    [100, 34],
    [64, 94],
    [136, 94],
  ],
  4: [
    [70, 38],
    [130, 38],
    [70, 94],
    [130, 94],
  ],
  5: [
    [62, 34],
    [138, 34],
    [100, 65],
    [62, 96],
    [138, 96],
  ],
};

/**
 * How large each thing is drawn. Up to six things share one size, so in the early lessons size is never a clue to
 * the amount; larger sets are drawn a little smaller so that they fit without touching.
 */
export function thingScale(count: number): number {
  return count > 6 ? 0.85 : 1.14;
}

/** Where each thing goes. Things never touch or overlap, so they can always be told apart. */
export function layout(count: number, arrangement: Arrangement): [number, number][] {
  const cluster = arrangement === 'cluster' ? CLUSTERS[count] : undefined;
  if (cluster) return cluster.map(([x, y]) => [x, y]);

  // Rows: up to three across at full size, up to four across when there are more than six.
  const small = count > 6;
  const perRow = count <= 3 ? count : !small || count === 9 ? 3 : 4;
  const rows = Math.ceil(count / perRow);
  const columnGap = small ? 40 : 54;
  const rowGap = rows >= 3 ? 38 : small ? 46 : 56;
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / perRow);
    const inRow = Math.min(perRow, count - row * perRow);
    const x = WIDTH / 2 + (index - row * perRow - (inRow - 1) / 2) * columnGap;
    const y = HEIGHT / 2 + (row - (rows - 1) / 2) * rowGap;
    return [x, y];
  });
}

function Picture({ stimulus, counting = false }: PictureProps) {
  const places = layout(stimulus.count, stimulus.arrangement);
  const scale = thingScale(stimulus.count);
  return (
    <svg
      className={styles.picture}
      viewBox={`18 6 ${WIDTH - 36} ${HEIGHT - 10}`}
      aria-hidden="true"
      focusable="false"
      data-item={stimulus.item}
      data-count={stimulus.count}
      data-counting={counting}
    >
      {places.map(([x, y], index) => (
        <g key={index} transform={`translate(${x} ${y}) scale(${scale})`}>
          <ellipse cx="1" cy="21" rx="15" ry="3.500" fill={INK} opacity="0.1" />
          <g className={styles.thing} style={{ '--order': index } as CSSProperties}>
            {ITEMS[stimulus.item]}
          </g>
        </g>
      ))}
    </svg>
  );
}

const NUMBER_WORDS = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];
const PLURALS: Record<ItemKind, string> = {
  apple: 'apples',
  leaf: 'leaves',
  snail: 'snails',
  acorn: 'acorns',
};

export function describe(stimulus: PictureProps['stimulus']): string {
  const amount = NUMBER_WORDS[stimulus.count] ?? String(stimulus.count);
  return `${amount} ${stimulus.count === 1 ? stimulus.item : PLURALS[stimulus.item]}`;
}

const numberGarden: WorldModule = {
  Picture,
  describe,
  countable: (stimulus) => stimulus.count,
};
export default numberGarden;
