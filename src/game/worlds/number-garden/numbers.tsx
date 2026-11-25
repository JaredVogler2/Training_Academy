import type { CSSProperties, ReactNode } from 'react';
import { NumeralStrokes } from '@/art/numerals';
import { readNumberPicture, type ItemKind, type NumberPicture, type Stimulus } from '@/engine';
import type { PictureProps } from '../modules';
import { ITEMS, describeAmount } from './things';
import styles from './numberGarden.module.css';

/**
 * Number Garden's later pictures: the ones that bring numerals in, once an amount means something.
 *
 *   a numeral      drawn large; while it is being counted it shows its amount as dots under it, and at no other time
 *   a tower        blocks standing one on another
 *   a staircase    towers side by side, each one block more than the last, with one of them missing
 *   a frame        five places in a line, or ten in two lines of five, some of them full
 *   a path         stones with the numbers on them in order, one stone bare
 *   a story        some are there, and then some more come, or some go away
 *   a bell         a number to listen to
 *
 * In every one of them the things can be told apart and counted: nothing overlaps, and nothing is too small.
 */

const INK = '#22304f';
const SUN = '#ffd166';
const SUN_DEEP = '#e09a1f';

const turn = (index: number) => ({ '--order': index }) as CSSProperties;

// ---------------------------------------------------------------------------------------------------------------------
// A numeral
// ---------------------------------------------------------------------------------------------------------------------

/** Where a numeral's dots go: up to five in a line, and from six a full line of five with the rest under it. */
export function dotPlaces(value: number): [number, number][] {
  if (value <= 5) {
    return Array.from({ length: value }, (_, index) => [(index - (value - 1) / 2) * 9, 12]);
  }
  return Array.from({ length: value }, (_, index) => [((index % 5) - 2) * 9, index < 5 ? 8 : 16]);
}

function Numeral({
  value,
  counting,
  sounding,
}: {
  value: number;
  counting: boolean;
  sounding: boolean;
}) {
  return (
    <svg
      className={styles.picture}
      viewBox="-40 -48 80 68"
      aria-hidden="true"
      focusable="false"
      data-scene="numeral"
      data-numeral={value}
      data-counting={counting}
      data-sounding={sounding}
    >
      <g className={styles.digit}>
        <NumeralStrokes value={value} />
      </g>
      {/* Its amount, shown only while it is counted: at any other time the numeral has to be read. */}
      {counting &&
        dotPlaces(value).map(([x, y], index) => (
          <circle
            key={index}
            className={styles.thing}
            style={turn(index)}
            cx={x}
            cy={y}
            r="3.400"
            fill={SUN_DEEP}
            data-dot=""
          />
        ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Blocks: a tower, and a staircase of towers
// ---------------------------------------------------------------------------------------------------------------------

const BLOCK_WIDE = 30;
const BLOCK_HIGH = 15;
const BLOCK_APART = 3;
/** Where the lowest block stands. */
const GROUND = 120;

function Blocks({ x, count, sun = false }: { x: number; count: number; sun?: boolean }) {
  const [fill, edge] = sun ? [SUN, SUN_DEEP] : ['#6fcf74', '#3f9c4a'];
  return (
    <>
      {Array.from({ length: count }, (_, level) => {
        const y = GROUND - (level + 1) * (BLOCK_HIGH + BLOCK_APART) + BLOCK_APART;
        return (
          <g key={level} className={styles.thing} style={turn(level)} data-block="">
            <rect
              x={x - BLOCK_WIDE / 2}
              y={y}
              width={BLOCK_WIDE}
              height={BLOCK_HIGH}
              rx="4"
              fill={fill}
            />
            <path
              d={`M${String(x - BLOCK_WIDE / 2 + 5)} ${String(y + BLOCK_HIGH - 3)}h${String(BLOCK_WIDE - 10)}`}
              stroke={edge}
              strokeWidth="2.400"
              strokeLinecap="round"
              opacity="0.6"
            />
          </g>
        );
      })}
    </>
  );
}

function Tower({ count, counting }: { count: number; counting: boolean }) {
  return (
    <svg
      className={styles.picture}
      // As narrow as a tower is, and always as tall as the tallest: towers on different cards can be compared.
      viewBox="10 0 50 130"
      aria-hidden="true"
      focusable="false"
      data-scene="tower"
      data-count={count}
      data-counting={counting}
    >
      <ellipse cx="35" cy={GROUND + 3} rx="22" ry="3.500" fill={INK} opacity="0.1" />
      <Blocks x={35} count={count} />
    </svg>
  );
}

function Stairs({
  picture,
  part,
  solved,
}: {
  picture: Extract<NumberPicture, { kind: 'stairs' }>;
  part: number | undefined;
  solved: boolean;
}) {
  const { heights, gap } = picture;
  const x = (index: number) => 100 + (index - (heights.length - 1) / 2) * 38;
  // The picture is cut to its towers. There is always room for one a block taller than the tallest that is
  // standing, whether or not the missing one is that tall: the room says nothing about what is missing.
  const standing = Math.max(...heights.filter((_, index) => index !== gap));
  const top = GROUND - Math.min(standing + 1, 6) * (BLOCK_HIGH + BLOCK_APART) - 12;
  const left = x(0) - 26;
  return (
    <svg
      className={styles.picture}
      viewBox={`${String(left)} ${String(top)} ${String(x(heights.length - 1) + 26 - left)} ${String(GROUND + 8 - top)}`}
      aria-hidden="true"
      focusable="false"
      data-scene="stairs"
      data-heights={heights.map((height, index) => (index === gap ? 0 : height)).join('-')}
      data-solved={solved}
    >
      {heights.map((height, index) => (
        <g
          key={index}
          className={styles.step}
          data-lit={part === index}
          data-gap={index === gap || undefined}
        >
          <ellipse cx={x(index)} cy={GROUND + 3} rx="19" ry="3" fill={INK} opacity="0.1" />
          {index !== gap ? (
            <Blocks x={x(index)} count={height} />
          ) : solved ? (
            <Blocks x={x(index)} count={height} sun />
          ) : (
            // Where the missing one stands: a mark on the ground, which says nothing of how tall it is.
            <rect
              className={styles.mark}
              x={x(index) - BLOCK_WIDE / 2}
              y={GROUND - 6}
              width={BLOCK_WIDE}
              height="6"
              rx="3"
              fill="#fff3c4"
              stroke={SUN_DEEP}
              strokeWidth="2.400"
              strokeDasharray="1 5.500"
              strokeLinecap="round"
            />
          )}
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// A frame of five, or of ten
// ---------------------------------------------------------------------------------------------------------------------

const CELL = 36;

function Frame({
  picture,
  counting,
  solved,
}: {
  picture: Extract<NumberPicture, { kind: 'frame' }>;
  counting: boolean;
  solved: boolean;
}) {
  const { places, item, asks } = picture;
  const lines = places.length / 5;
  const left = 100 - (5 * CELL) / 2;
  const top = 65 - (lines * CELL) / 2;
  // What is counted: the things in it, or — where the question is how many more would fill it — its empty places.
  const counted = places.map((held) => held === (asks === 'filled'));
  const order = counted.map(
    (_, index) => counted.slice(0, index).filter((isCounted) => isCounted).length,
  );
  return (
    <svg
      className={styles.picture}
      // Only the frame, and the room a thing needs to hop in: the less empty picture, the larger the things.
      viewBox={`${String(left - 6)} ${String(top - 12)} ${String(5 * CELL + 12)} ${String(lines * CELL + 20)}`}
      aria-hidden="true"
      focusable="false"
      data-scene="frame"
      data-places={places.map((held) => (held ? 1 : 0)).join('')}
      data-item={item}
      data-counting={counting}
      data-solved={solved}
    >
      <rect
        x={left}
        y={top}
        width={5 * CELL}
        height={lines * CELL}
        rx="9"
        fill="#ffffff"
        stroke={INK}
        strokeWidth="3.500"
      />
      <path
        d={[
          ...[1, 2, 3, 4].map(
            (line) => `M${String(left + line * CELL)} ${String(top)}v${String(lines * CELL)}`,
          ),
          ...(lines === 2 ? [`M${String(left)} ${String(top + CELL)}h${String(5 * CELL)}`] : []),
        ].join('')}
        stroke={INK}
        strokeWidth="2.400"
        opacity="0.4"
      />
      {places.map((held, index) => {
        const cx = left + ((index % 5) + 0.5) * CELL;
        const cy = top + (Math.floor(index / 5) + 0.5) * CELL;
        if (held || (solved && asks === 'empty')) {
          return (
            <g
              key={index}
              transform={`translate(${String(cx)} ${String(cy)}) scale(0.6)`}
              data-full-place=""
            >
              {/* What the answer filled it with stands on a sun-coloured mark. */}
              {!held && <circle r="24" fill="#ffe9a8" data-filled-in="" />}
              <g
                className={held && counted[index] ? styles.thing : undefined}
                style={turn(order[index] ?? 0)}
              >
                {ITEMS[item]}
              </g>
            </g>
          );
        }
        if (!counting || !counted[index]) return null;
        return (
          <circle
            key={index}
            className={styles.thing}
            style={turn(order[index] ?? 0)}
            cx={cx}
            cy={cy}
            r="11"
            fill="#fff3c4"
            stroke={SUN_DEEP}
            strokeWidth="2.600"
            strokeDasharray="1 5.500"
            strokeLinecap="round"
            data-empty-place=""
          />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// A path of numbered stones
// ---------------------------------------------------------------------------------------------------------------------

function Path({
  picture,
  part,
  solved,
}: {
  picture: Extract<NumberPicture, { kind: 'path' }>;
  part: number | undefined;
  solved: boolean;
}) {
  const { numbers, gap } = picture;
  const x = (index: number) => 100 + (index - (numbers.length - 1) / 2) * 39;
  const left = x(0) - 23;
  return (
    <svg
      className={styles.picture}
      // Only the stones, and the room one needs to be lifted in.
      viewBox={`${String(left)} 12 ${String(x(numbers.length - 1) + 23 - left)} 54`}
      aria-hidden="true"
      focusable="false"
      data-scene="path"
      data-numbers={numbers.map((number, index) => (index === gap ? 'x' : number)).join('-')}
      data-solved={solved}
    >
      <path
        d={`M${String(x(0))} 40H${String(x(numbers.length - 1))}`}
        stroke="#c9bda0"
        strokeWidth="4"
        strokeDasharray="1 9"
        strokeLinecap="round"
      />
      {numbers.map((number, index) => {
        const bare = index === gap;
        return (
          <g
            key={index}
            className={styles.step}
            data-lit={part === index}
            data-gap={bare || undefined}
          >
            <ellipse cx={x(index)} cy="59" rx="14" ry="3" fill={INK} opacity="0.1" />
            <ellipse
              cx={x(index)}
              cy="40"
              rx="17.500"
              ry="16"
              fill={bare ? '#fff8e0' : '#ece4d2'}
              stroke={bare ? SUN_DEEP : '#c9bda0'}
              strokeWidth="3"
              strokeLinecap="round"
              {...(bare && !solved ? { strokeDasharray: '1 6.500' } : {})}
            />
            {(!bare || solved) && (
              <g transform={`translate(${String(x(index))} 51) scale(0.58)`}>
                <NumeralStrokes value={number} stroke={bare ? '#a05f00' : INK} weight={6.5} />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// A story: some come, or some go
// ---------------------------------------------------------------------------------------------------------------------

/** How a group of so many stands in a story: up to three in a line (or two, in two lines), more in two lines. */
function standing(count: number, narrow = false): { across: number; lines: number } {
  if (count === 0) return { across: 0, lines: 0 };
  if (count <= (narrow ? 2 : 3)) return { across: count, lines: 1 };
  return { across: Math.ceil(count / 2), lines: 2 };
}

/** The most places across that a story takes, so that nobody in it is too small to count on a narrow phone. */
const ACROSS_MOST = 6;
/** The room between those who stay and those who come or go, in places. */
const BETWEEN = 0.9;
/** One place: a thing is drawn 30 across in it. */
const PLACE = 36;
const THING = 0.74;
const LINE = PLACE * 1.14;

/**
 * Where everyone in a story stands: those who stay on the left, those who come or go on the right with room
 * between, so that the two groups can be told apart at a look. Everyone is drawn the same size whatever the
 * story; `box` is the part of the drawing they take up, which the picture is cut to, so that a story of two is
 * drawn as large as its place on the screen allows and a story of ten still fits.
 */
export function storyPlaces(
  staying: number,
  moving: number,
): {
  stay: [number, number][];
  move: [number, number][];
  box: { x: number; y: number; width: number; height: number };
} {
  // Three stand in a line where there is room, and two over one where the other group is a wide one.
  const narrow = standing(staying).across + standing(moving).across > ACROSS_MOST;
  const left = standing(staying, narrow);
  const right = standing(moving, narrow);
  const lines = Math.max(left.lines, right.lines);
  const place = (group: { across: number; lines: number }, index: number, from: number) => {
    const line = Math.floor(index / group.across);
    const column = index % group.across;
    return [(from + column + 0.5) * PLACE, (line - (group.lines - 1) / 2) * LINE] as [
      number,
      number,
    ];
  };
  const across = left.across + right.across + BETWEEN;
  // Room at each side for the little lines in the air, above for a hop, and below for a shadow.
  const height = lines * LINE + 22;
  return {
    stay: Array.from({ length: staying }, (_, index) => place(left, index, 0)),
    move: Array.from({ length: moving }, (_, index) => place(right, index, left.across + BETWEEN)),
    box: { x: -14, y: -height / 2 - 2, width: across * PLACE + 28, height },
  };
}

function Story({
  picture,
  counting,
  part,
}: {
  picture: Extract<NumberPicture, { kind: 'story' }>;
  counting: boolean;
  part: number | undefined;
}) {
  const { change, item, start, moved, result } = picture;
  const staying = change === 'join' ? start : result;
  const { stay, move, box } = storyPlaces(staying, moved);
  const thing = (place: [number, number], index: number, counted: boolean): ReactNode => (
    <g
      key={index}
      transform={`translate(${String(place[0])} ${String(place[1])}) scale(${String(THING)})`}
      data-thing=""
      data-counted={counted || undefined}
    >
      <ellipse cx="1" cy="21" rx="15" ry="3.500" fill={INK} opacity="0.1" />
      <g className={counted ? styles.thing : undefined} style={turn(index)}>
        {ITEMS[item]}
      </g>
    </g>
  );
  // Little lines in the air beside the ones on the move, on the side they come from: behind them as they go.
  const across = move.map(([x]) => x);
  const lines =
    change === 'join' ? Math.max(...across) + PLACE * 0.5 : Math.min(...across) - PLACE * 0.5 - 9;
  return (
    <svg
      className={styles.picture}
      viewBox={`${String(box.x)} ${String(box.y)} ${String(box.width)} ${String(box.height)}`}
      aria-hidden="true"
      focusable="false"
      data-scene="story"
      data-change={change}
      data-item={item}
      data-start={start}
      data-moved={moved}
      data-counting={counting}
    >
      <g data-staying="">{stay.map((place, index) => thing(place, index, true))}</g>
      {/*
        While the story is told, the first part of it shows how things stood before anyone moved: those who will
        come are not there yet, and those who will go are still with the others.
      */}
      <g
        className={styles.movers}
        style={{ '--back': `${String(-BETWEEN * PLACE)}px` } as CSSProperties}
        data-change={change}
        data-told={part === 0 ? 'before' : 'after'}
        data-moving=""
      >
        {move.map((place, index) => thing(place, staying + index, change === 'join'))}
        <path
          className={styles.wind}
          d={[-12, 0, 12].map((y) => `M${String(lines)} ${String(y)}h9`).join('')}
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// A number to listen to
// ---------------------------------------------------------------------------------------------------------------------

function Bell({
  clip,
  sounding,
  onAgain,
}: {
  clip: string;
  sounding: boolean;
  onAgain?: (() => void) | undefined;
}) {
  const drawing = (
    <svg
      className={styles.bell}
      viewBox="-36 -34 72 68"
      aria-hidden="true"
      focusable="false"
      data-sounding={sounding}
      data-clip={clip}
    >
      <ellipse cy="29" rx="18" ry="3.500" fill={INK} opacity="0.08" />
      <path d="M0-28v7" stroke="#8a5a2b" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M-19 14c2-8 3-16 4-22 2-10 8-14 15-14s13 4 15 14c1 6 2 14 4 22z"
        fill={SUN}
        stroke={SUN_DEEP}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M-21 14h42" stroke={SUN_DEEP} strokeWidth="5" strokeLinecap="round" />
      <circle cy="21" r="4.500" fill={SUN_DEEP} />
      <path
        d="M-9-10c1-4 3-6 6-7"
        fill="none"
        stroke="#fff3c4"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g
        className={styles.waves}
        fill="none"
        stroke={SUN_DEEP}
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M24-9c3 4 3 10 0 14" />
        <path d="M30-14c5 7 5 17 0 24" opacity="0.6" />
        <path d="M-24-9c-3 4-3 10 0 14" />
        <path d="M-30-14c-5 7-5 17 0 24" opacity="0.6" />
      </g>
    </svg>
  );
  if (!onAgain) return drawing;
  return (
    <button
      type="button"
      className={styles.listen}
      aria-label={numberText.hearAgain}
      onClick={onAgain}
    >
      {drawing}
    </button>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// All of them
// ---------------------------------------------------------------------------------------------------------------------

/** One of Number Garden's number pictures, or nothing where the stimulus is not one. */
export function NumberPictureView({
  stimulus,
  counting = false,
  sounding = false,
  place,
  part,
  solved = false,
  onAgain,
}: PictureProps) {
  const picture = readNumberPicture(stimulus);
  if (!picture) return null;
  switch (picture.kind) {
    case 'group':
      return null;
    case 'numeral':
      return <Numeral value={picture.value} counting={counting} sounding={sounding} />;
    case 'spoken':
      return (
        <Bell
          clip={stimulus.type === 'sound' ? stimulus.clip : ''}
          sounding={sounding}
          onAgain={place === 'prompt' ? onAgain : undefined}
        />
      );
    case 'tower':
      return <Tower count={picture.count} counting={counting} />;
    case 'stairs':
      return <Stairs picture={picture} part={part} solved={solved} />;
    case 'frame':
      return <Frame picture={picture} counting={counting} solved={solved} />;
    case 'path':
      return <Path picture={picture} part={part} solved={solved} />;
    case 'story':
      return <Story picture={picture} counting={counting} part={part} />;
  }
}

const NUMBER_WORDS = [
  'zero',
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
const word = (value: number) => NUMBER_WORDS[value] ?? String(value);
const list = (parts: readonly string[]) =>
  parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1) ?? ''}`;

export const numberText = {
  hearAgain: 'Hear it again',
  spoken: 'A number to listen to',
  numeral: (value: number) => `The number ${String(value)}`,
  tower: (count: number) => `A tower of ${word(count)} ${count === 1 ? 'block' : 'blocks'}`,
  stairs: (heights: readonly number[], gap: number) =>
    `Towers in a row: ${list(heights.map((height, index) => (index === gap ? 'one missing' : `${word(height)} high`)))}`,
  frame: (places: number, filled: string, asks: 'filled' | 'empty') =>
    asks === 'empty'
      ? `A frame with ${word(places)} places, holding ${filled}. Some places are empty`
      : `A frame with ${word(places)} places, holding ${filled}`,
  path: (numbers: readonly number[], gap: number) =>
    `Stones in a row, numbered ${list(numbers.map((number, index) => (index === gap ? 'a bare stone' : String(number))))}`,
  story: (start: string, moved: number, change: 'join' | 'leave') =>
    change === 'join'
      ? `${start}, and ${word(moved)} more ${moved === 1 ? 'comes' : 'come'}`
      : `${start}, and ${word(moved)} ${moved === 1 ? 'goes' : 'go'} away`,
};

const none: Record<ItemKind, string> = {
  apple: 'no apples',
  leaf: 'no leaves',
  snail: 'no snails',
  acorn: 'no acorns',
  bird: 'no birds',
  mouse: 'no mice',
  frog: 'no frogs',
};

/** One of Number Garden's number pictures in words, or `null` where the stimulus is not one. */
export function describeNumberPicture(stimulus: Stimulus): string | null {
  const picture = readNumberPicture(stimulus);
  if (!picture) return null;
  switch (picture.kind) {
    case 'group':
      return null;
    case 'numeral':
      return numberText.numeral(picture.value);
    case 'spoken':
      return numberText.spoken;
    case 'tower':
      return numberText.tower(picture.count);
    case 'stairs':
      return numberText.stairs(picture.heights, picture.gap);
    case 'frame':
      return numberText.frame(
        picture.places.length,
        picture.filled === 0 ? none[picture.item] : describeAmount(picture.filled, picture.item),
        picture.asks,
      );
    case 'path':
      return numberText.path(picture.numbers, picture.gap);
    case 'story':
      return numberText.story(
        describeAmount(picture.start, picture.item),
        picture.moved,
        picture.change,
      );
  }
}
