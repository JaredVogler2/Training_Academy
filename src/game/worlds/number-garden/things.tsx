import type { CSSProperties, ReactNode } from 'react';
import type { Arrangement, ItemKind, QuantityStimulus, Stimulus } from '@/engine';
import type { PictureProps } from '../modules';
import styles from './numberGarden.module.css';

/**
 * Number Garden's pictures: small sets of identical things, drawn so that the only thing that differs between two
 * sets is how many there are. No numerals anywhere.
 */

const INK = '#22304f';

/** Each thing is drawn around (0, 0), about 40 units across. */
export const ITEMS: Record<ItemKind, ReactNode> = {
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
  // The friends: who the things are given to. Each is one creature, looking the way it is going.
  bird: (
    <>
      <path d="M-13 3-22-4l1 12z" fill="#2a6fb5" />
      <path
        d="M-3 17v5M5 17v5"
        fill="none"
        stroke="#c98a4b"
        strokeWidth="2.600"
        strokeLinecap="round"
      />
      <path
        d="M-16 3c0-11 8-18 17-18 9 0 15 6 15 14 0 11-8 19-18 19-8 0-14-6-14-15z"
        fill="#62b4f3"
      />
      <path d="M-4 9c2-8 8-12 15-10-1 8-7 13-15 10z" fill="#2a6fb5" />
      <path d="M14-8l9 3-9 4z" fill="#ffb347" />
      <circle cx="8" cy="-7" r="2.400" fill={INK} />
    </>
  ),
  mouse: (
    <>
      <path
        d="M-16 13c-7 1-9-6-4-10"
        fill="none"
        stroke="#d98a94"
        strokeWidth="2.600"
        strokeLinecap="round"
      />
      <path d="M-18 16c-2-13 7-23 19-23 9 0 15 5 19 12l3 6c1 3-1 5-4 5z" fill="#b6adc9" />
      <circle cx="3" cy="-9" r="8" fill="#9a8fb3" />
      <circle cx="3" cy="-9" r="4.400" fill="#f4b6bf" />
      <circle cx="21" cy="12" r="2.600" fill="#d98a94" />
      <circle cx="12" cy="3" r="2.200" fill={INK} />
    </>
  ),
  frog: (
    <>
      <ellipse cx="-12" cy="18" rx="7" ry="3.500" fill="#2f8440" />
      <ellipse cx="12" cy="18" rx="7" ry="3.500" fill="#2f8440" />
      <circle cx="-9" cy="-10" r="7" fill="#6fcf74" />
      <circle cx="9" cy="-10" r="7" fill="#6fcf74" />
      <path d="M-18 7c0-11 8-17 18-17s18 6 18 17c0 8-8 12-18 12s-18-4-18-12z" fill="#6fcf74" />
      <circle cx="-9" cy="-10" r="3.800" fill="#ffffff" />
      <circle cx="9" cy="-10" r="3.800" fill="#ffffff" />
      <circle cx="-8.500" cy="-10" r="2" fill={INK} />
      <circle cx="9.500" cy="-10" r="2" fill={INK} />
      <path
        d="M-7 6c4 4 10 4 14 0"
        fill="none"
        stroke="#2f8440"
        strokeWidth="2.600"
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

/** Things wherever they fell: no line and no pattern to read the amount from. */
const SCATTERS: Record<number, readonly (readonly [number, number])[]> = {
  1: [[112, 58]],
  2: [
    [58, 78],
    [140, 46],
  ],
  3: [
    [52, 44],
    [118, 34],
    [96, 94],
  ],
  4: [
    [48, 40],
    [112, 32],
    [150, 84],
    [76, 94],
  ],
  5: [
    [45, 34],
    [102, 30],
    [156, 40],
    [72, 90],
    [132, 94],
  ],
  6: [
    [44, 32],
    [98, 36],
    [154, 30],
    [60, 92],
    [112, 96],
    [158, 88],
  ],
};

/** How far a thing in a larger scatter is nudged off its place in a line, so that the lines do not show. */
const NUDGES: readonly (readonly [number, number])[] = [
  [2, -1.5],
  [-2, 1.5],
  [1, 1.5],
  [-1, -1.5],
  [2, 1],
  [-2, -1],
  [0, 1.5],
  [1, -1],
  [-1, 1],
  [0, -1.5],
];

type Size = QuantityStimulus['size'];

/**
 * How large each thing is drawn. Up to six things share one size, so in the early lessons size is never a clue to
 * the amount; larger sets are drawn a little smaller so that they fit without touching, and so are sets laid out
 * five to a line. A set may also be asked for smaller or bigger than usual, so that the room it takes says nothing
 * about how many it holds.
 */
export function thingScale(count: number, arrangement: Arrangement = 'row', size?: Size): number {
  if (size === 'big') return 1.3;
  const usual = arrangement === 'frame' ? 0.72 : count > 6 ? 0.85 : 1.14;
  return size === 'small' ? usual * 0.72 : usual;
}

function rows(count: number, perRow: number, columnGap: number, rowGap: number, flushLeft = false) {
  const lines = Math.ceil(count / perRow);
  return Array.from({ length: count }, (_, index): [number, number] => {
    const row = Math.floor(index / perRow);
    const inRow = flushLeft ? Math.min(perRow, count) : Math.min(perRow, count - row * perRow);
    const x = WIDTH / 2 + (index - row * perRow - (inRow - 1) / 2) * columnGap;
    const y = HEIGHT / 2 + (row - (lines - 1) / 2) * rowGap;
    return [x, y];
  });
}

/** Where each thing goes. Things never touch or overlap, so they can always be told apart. */
export function layout(count: number, arrangement: Arrangement): [number, number][] {
  const fixed =
    arrangement === 'cluster'
      ? CLUSTERS[count]
      : arrangement === 'scatter'
        ? SCATTERS[count]
        : undefined;
  if (fixed) return fixed.map(([x, y]) => [x, y]);

  // Five to a line, the second line filled from the left: the way two hands hold ten.
  if (arrangement === 'frame') return rows(count, 5, 32, 40, true);

  // Rows: up to three across at full size, up to four across when there are more than six.
  const small = count > 6;
  const perRow = count <= 3 ? count : !small || count === 9 ? 3 : 4;
  const lines = Math.ceil(count / perRow);
  const places = rows(count, perRow, small ? 40 : 54, lines >= 3 ? 38 : small ? 46 : 56);
  if (arrangement !== 'scatter') return places;
  return places.map(([x, y], index) => {
    const [dx, dy] = NUDGES[index % NUDGES.length] ?? [0, 0];
    return [x + dx, y + dy];
  });
}

/** One thing on its own, as large as the box it is given: what is given out, taken back and laid in a place. */
export function Thing({ item, className }: { item: ItemKind; className?: string }) {
  return (
    <svg className={className} viewBox="-24 -24 48 50" aria-hidden="true" focusable="false">
      <ellipse cx="1" cy="21" rx="15" ry="3.500" fill={INK} opacity="0.1" />
      {ITEMS[item]}
    </svg>
  );
}

function Quantity({ stimulus, counting }: { stimulus: QuantityStimulus; counting: boolean }) {
  const places = layout(stimulus.count, stimulus.arrangement);
  const scale = thingScale(stimulus.count, stimulus.arrangement, stimulus.size);
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

/**
 * The question, as a picture: two piles of blocks, a tall one and a short one, with a ring round the one that is
 * being asked for. "Which has more?" rings the tall pile; "which has fewer?" rings the short one.
 */
function Sign({ id }: { id: string }) {
  const more = id !== 'fewer';
  const block = (x: number, y: number, fill: string) => (
    <rect key={`${String(x)}-${String(y)}`} x={x} y={y} width="22" height="16" rx="4" fill={fill} />
  );
  return (
    <svg
      className={styles.sign}
      viewBox="0 0 120 96"
      aria-hidden="true"
      focusable="false"
      data-sign={id}
    >
      <ellipse cx="60" cy="88" rx="52" ry="5" fill={INK} opacity="0.1" />
      {[0, 1, 2, 3].map((level) => block(22, 68 - level * 18, more ? '#6fcf74' : '#b9d9bb'))}
      {block(76, 68, more ? '#b9d9bb' : '#6fcf74')}
      <ellipse
        cx={more ? 33 : 87}
        cy={more ? 49 : 76}
        rx={more ? 21 : 20}
        ry={more ? 44 : 16}
        fill="none"
        stroke="#e09a1f"
        strokeWidth="5"
        strokeDasharray="1 9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Picture({ stimulus, counting = false }: PictureProps) {
  if (stimulus.type === 'quantity') return <Quantity stimulus={stimulus} counting={counting} />;
  if (stimulus.type === 'sign') return <Sign id={stimulus.id} />;
  return null;
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
  bird: 'birds',
  mouse: 'mice',
  frog: 'frogs',
};

/** "three snails". */
export function describeAmount(count: number, item: ItemKind): string {
  const amount = NUMBER_WORDS[count] ?? String(count);
  return `${amount} ${count === 1 ? item : PLURALS[item]}`;
}

const SIGNS: Record<string, string> = {
  more: 'Which has more?',
  fewer: 'Which has fewer?',
};

export function describe(stimulus: Stimulus, place?: 'prompt' | 'choice' | 'card'): string {
  if (stimulus.type === 'quantity') {
    const amount = describeAmount(stimulus.count, stimulus.item);
    return place === 'prompt' ? `The group to match: ${amount}` : amount;
  }
  if (stimulus.type === 'sign') return SIGNS[stimulus.id] ?? stimulus.id;
  return '';
}
