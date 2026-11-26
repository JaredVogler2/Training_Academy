import type { ReactNode } from 'react';
import type { Story } from '@/content/explorer-harbor/storymaker';
import { Animal, PAGE_BOX, Place, type Mood } from './storyParts';

/**
 * The pictures of a made-up story: for each of the six beginnings, what is there when it begins, what is there
 * when each of two things has gone wrong, and what is there when each of those has come right in each of two
 * ways. Forty-two small scenes, each put behind and in front of whichever of the three the story is about, in
 * the place the story happens.
 *
 * A picture shows what its page says and nothing else: the wave that washed the castle away is in the picture
 * of that page and in no other. The one the story is about is glad at the beginning, is not when something has
 * gone wrong, and is glad again at the end, whatever was chosen: no ending is a worse one.
 */

const INK = '#22304f';
const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const SAND = '#e9c877';
const SAND_DARK = '#c9a352';
const WET_SAND = '#d2a850';
const WATER = '#63b9dd';
const SHALLOW = '#a5dcf1';
const DEEP = '#2f7fb5';
const FOAM = '#eef9fe';
const WOOD = '#9a6b3f';
const WOOD_DARK = '#6f4a28';
const RED = '#e2574c';
const BERRY = '#b03a6e';
const LEAF = '#4f9e58';
const LEAF_LIGHT = '#7fbf7a';
const YELLOW = '#ffd35c';
const STONE = '#aeb6c2';
const CLOTH = '#e8695e';

export interface Scene {
  /** Where the one it is about stands (their feet), how they look, and what their paw is doing. */
  x: number;
  y: number;
  mood: Mood;
  turned?: boolean;
  lean?: number;
  hold?: readonly [number, number];
  /** What is drawn behind them, and what in front. */
  behind?: ReactNode;
  front?: ReactNode;
}

const thin = (d: string, stroke = INK, width = 0.6) => (
  <path d={d} {...line} stroke={stroke} strokeWidth={width} />
);

/** Short lines behind something that is moving fast. */
const speed = (x: number, y: number) =>
  thin(
    `M${String(x)} ${String(y)}h9M${String(x - 4)} ${String(y + 6)}h11M${String(x)} ${String(y + 12)}h9`,
    INK,
    0.9,
  );

// ---------------------------------------------------------------------------------------------------------------------
// The beach: a kite, and a sandcastle
// ---------------------------------------------------------------------------------------------------------------------

function Kite({ x, y, tilt = 0 }: { x: number; y: number; tilt?: number }) {
  return (
    <g transform={`translate(${String(x)} ${String(y)}) rotate(${String(tilt)})`}>
      <path d="M0-9.500L6.500 0 0 11-6.500 0z" fill={RED} />
      <path d="M0-9.500L6.500 0H0zM0 11L-6.500 0H0z" fill="#f29488" />
      {thin('M0 11c2 2-2 4 0 6s-2 4 0 6', INK, 0.7)}
      <path
        d="M-1.700 14.300l3.400 1.300-3.400 1.300zM1.700 19.300l-3.400 1.300 3.400 1.300z"
        fill={YELLOW}
      />
    </g>
  );
}

/** A kite up in the sky, and its string down to a paw. */
const flying = (x: number, y: number, tilt: number, toX: number, toY: number) => (
  <>
    {thin(
      `M${String(x)} ${String(y)}Q${String((x + toX) / 2 + 4)} ${String((y + toY) / 2 + 10)} ${String(toX)} ${String(toY)}`,
    )}
    <Kite x={x} y={y} tilt={tilt} />
  </>
);

function Crab({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${String(x)} ${String(y)})`}>
      {thin('M-3.500 0l-3 2.500M-3 1.500l-2.500 3M3.500 0l3 2.500M3 1.500l2.500 3', '#b83d33', 0.9)}
      {thin('M-3-1.500l-3-3.500M3-1.500l3-3.500', '#b83d33', 1)}
      <path
        d="M-7.500-6.500a2 2 0 1 1 2.800 1.200l-0.800-1.700zM7.500-6.500a2 2 0 1 0-2.800 1.200l0.800-1.700z"
        fill={RED}
      />
      <ellipse rx="4.400" ry="2.900" fill={RED} />
      {thin('M-1.500-2.500v-2M1.500-2.500v-2', '#b83d33', 0.7)}
      <circle cx="-1.500" cy="-4.900" r="0.800" fill={INK} />
      <circle cx="1.500" cy="-4.900" r="0.800" fill={INK} />
    </g>
  );
}

function Castle({
  x,
  y,
  size = 1,
  fill = SAND,
}: {
  x: number;
  y: number;
  size?: number;
  fill?: string;
}) {
  return (
    <g transform={`translate(${String(x)} ${String(y)}) scale(${String(size)})`}>
      <path d="M-10 0v-9h3.500v-3h3v3h7v-3h3v3h3.500v9z" fill={fill} />
      <path d="M-2.500 0v-4.500a2.500 2.500 0 0 1 5 0v4.500z" fill={SAND_DARK} />
      {thin('M0-12v-6.500')}
      <path d="M0-18.500l4.500 1.600-4.500 1.600z" fill={RED} />
    </g>
  );
}

function Bucket({ x, y, full = false }: { x: number; y: number; full?: boolean }) {
  return (
    <g transform={`translate(${String(x)} ${String(y)})`}>
      {thin('M-3.600-6.500a3.600 3.600 0 0 1 7.200 0', INK, 0.7)}
      <path d="M-3.800-6.500h7.600l-1.100 6.500h-5.400z" fill="#4a8fd6" />
      {full && <ellipse cy="-6.500" rx="3.800" ry="1.100" fill={SHALLOW} />}
    </g>
  );
}

function Spade({ x, y, tilt = 0 }: { x: number; y: number; tilt?: number }) {
  return (
    <g transform={`translate(${String(x)} ${String(y)}) rotate(${String(tilt)})`}>
      {thin('M0 0v-9', WOOD_DARK, 1)}
      <path d="M-2 0h4v3.200a2 2 0 0 1-4 0z" fill={RED} />
    </g>
  );
}

const KITE: Scenes = {
  start: {
    x: -18,
    y: 25,
    mood: 'glad',
    hold: [8, -10],
    front: (
      <>
        {thin('M11-2Q2 13-10 15')}
        <Kite x={11} y={-4} tilt={14} />
      </>
    ),
  },
  troubles: {
    'no-wind': {
      scene: {
        x: -20,
        y: 25,
        mood: 'sad',
        behind: (
          <>
            {/* A flag that hangs straight down its pole: there is no wind at all. */}
            {thin('M6 14v-30', WOOD_DARK, 1.2)}
            <path d="M6-16c4 1 5 5 4 10s-3 7-4 8z" fill="#f2a33a" />
          </>
        ),
        front: (
          <>
            {thin('M-12 20c6 9 12 2 18 6s8 2 10 0')}
            <Kite x={22} y={24} tilt={78} />
          </>
        ),
      },
      endings: {
        run: {
          x: -4,
          y: 25,
          mood: 'glad',
          lean: 9,
          hold: [8, -11],
          behind: (
            <>
              {speed(-34, 8)}
              {flying(30, -19, 22, 5.5, 13)}
            </>
          ),
        },
        wait: {
          x: -18,
          y: 25,
          mood: 'glad',
          hold: [8, -11],
          behind: (
            <>
              {thin('M-40-24c5-3 9 1 6 4M-24-14c6-3 10 2 6 5M-4-27c5-3 9 1 6 4', '#ffffff', 1.3)}
              {flying(24, -19, -14, -10, 14)}
            </>
          ),
        },
      },
    },
    tangle: {
      scene: {
        x: -20,
        y: 25,
        mood: 'sad',
        hold: [8, -10],
        front: (
          <>
            {thin('M-12 15c4 2 8 5 12 7')}
            {thin(
              'M0 22c-7-3-7-13 2-13s11 9 4 13-13-1-10-8 12-6 13 0-4 10-9 8-5-8 0-9 6 3 4 5',
              INK,
              1,
            )}
            {thin('M9 16c4-4 8-8 12-14')}
            <Kite x={24} y={-8} tilt={24} />
          </>
        ),
      },
      endings: {
        crab: {
          x: -18,
          y: 25,
          mood: 'glad',
          hold: [8, -11],
          behind: flying(26, -19, 12, -10, 14),
          front: (
            <>
              {thin('M-4 29c1-1 2-1 3 0M10 31c1-1 2-1 3 0M14 26c1-1 2-1 3 0')}
              <Crab x={4} y={27} />
            </>
          ),
        },
        slowly: {
          x: -18,
          y: 25,
          mood: 'glad',
          hold: [8, -11],
          behind: flying(24, -19, 10, -10, 14),
          front: (
            <>
              <rect x="-12" y="12.300" width="4" height="3.400" rx="0.800" fill={YELLOW} />
              {thin('M-12 13.400h4M-12 14.600h4', WOOD_DARK, 0.4)}
            </>
          ),
        },
      },
    },
  },
};

const SANDCASTLE: Scenes = {
  start: {
    x: -22,
    y: 25,
    mood: 'glad',
    hold: [8, -8],
    front: (
      <>
        <Castle x={18} y={28} />
        <Bucket x={-2} y={30} />
        <Spade x={5} y={30} tilt={-64} />
      </>
    ),
  },
  troubles: {
    wave: {
      scene: {
        x: -26,
        y: 25,
        mood: 'sad',
        front: (
          <>
            <path d="M-2 30c3-5 9-6 13-3s5 2 7 3z" fill={SAND} />
            <path d="M50 0c-14-5-27 2-30 14 5-5 11-4 13 1s8 9 17 9z" fill={WATER} />
            {thin('M50 0c-14-5-27 2-30 14 5-5 11-4 13 1', FOAM, 1.6)}
            <path d="M-6 31c8-3 18-3 28 0 8 2 18 2 28-1v4h-56z" fill={SHALLOW} />
          </>
        ),
      },
      endings: {
        higher: {
          x: -24,
          y: 25,
          mood: 'glad',
          behind: (
            <>
              <path d="M-12 8c8 5 18 7 28 5s14-3 20-5z" fill={WATER} />
              {thin('M-12 8c8 5 18 7 28 5s14-3 20-5', FOAM, 1.4)}
            </>
          ),
          front: (
            <>
              <path d="M-6 34c5-12 18-17 30-14s17 8 20 14z" fill="#f0d695" />
              <Castle x={20} y={22} />
            </>
          ),
        },
        ditch: {
          x: -26,
          y: 25,
          mood: 'glad',
          front: (
            <>
              <ellipse cx="16" cy="27" rx="17" ry="6" fill={WATER} />
              <ellipse cx="16" cy="26.500" rx="11.500" ry="3.400" fill="#f6e2a8" />
              <Castle x={16} y={27} size={0.9} />
              <Spade x={-6} y={30} tilt={-64} />
            </>
          ),
        },
      },
    },
    dry: {
      scene: {
        x: -22,
        y: 25,
        mood: 'sad',
        front: (
          <>
            <path d="M4 30c2-5 7-7 12-6s9 3 12 6z" fill={SAND} />
            {thin('M20 23l7-3', INK, 0.6)}
            <path d="M27 20l1.500 4.300 2-3.700z" fill={RED} />
            <g fill={SAND_DARK}>
              <circle cx="2" cy="27" r="0.700" />
              <circle cx="31" cy="27.500" r="0.700" />
              <circle cx="8" cy="22.500" r="0.700" />
              <circle cx="24" cy="26" r="0.700" />
              <circle cx="34" cy="30.500" r="0.700" />
              <circle cx="-1" cy="31" r="0.700" />
            </g>
          </>
        ),
      },
      endings: {
        bucket: {
          x: -24,
          y: 25,
          mood: 'glad',
          hold: [9, -5],
          front: (
            <>
              <Castle x={20} y={29} size={1.25} fill={WET_SAND} />
              <Bucket x={-9} y={29} full />
              <g fill={SHALLOW}>
                <circle cx="-3" cy="26" r="0.800" />
                <circle cx="-1" cy="29" r="0.800" />
                <circle cx="1" cy="25" r="0.800" />
              </g>
            </>
          ),
        },
        dig: {
          x: -26,
          y: 25,
          mood: 'glad',
          front: (
            <>
              <ellipse cx="-4" cy="30" rx="7" ry="2.400" fill="#a57f3c" />
              <path d="M2 31c1-3 4-4 6-3s3 2 4 3z" fill={WET_SAND} />
              <Spade x={7} y={27} tilt={12} />
              <Castle x={26} y={29} size={1.25} fill={WET_SAND} />
            </>
          ),
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// The forest: berries, and a stream
// ---------------------------------------------------------------------------------------------------------------------

const BERRIES_ALL: readonly (readonly [number, number])[] = [
  [-8, -5],
  [-3, -10],
  [2, -4],
  [6, -11],
  [9, -5],
  [-1, -15],
];
const BERRIES_FEW: readonly (readonly [number, number])[] = [
  [-7, -6],
  [8, -5],
];

/** A bush of the height a paw can reach, with its berries where they are given. */
function Bush({
  x,
  y,
  berries,
}: {
  x: number;
  y: number;
  berries: readonly (readonly [number, number])[];
}) {
  return (
    <g transform={`translate(${String(x)} ${String(y)})`}>
      <path d="M-13 0c-5-7 0-15 7-14 2-6 11-6 13 0 7-1 11 7 6 14z" fill={LEAF} />
      <path
        d="M-9-6c1-4 5-5 7-2M2-12c2-3 6-3 7 0"
        {...line}
        stroke={LEAF_LIGHT}
        strokeWidth="1.400"
      />
      <g fill={BERRY}>
        {berries.map(([bx, by]) => (
          <circle key={`${String(bx)} ${String(by)}`} cx={bx} cy={by} r="1.600" />
        ))}
      </g>
    </g>
  );
}

/**
 * A bush too tall to reach the top of, with its berries at the top: the lowest of them is above a paw held up
 * from the ground, and within reach of one held up from a log.
 */
function TallBush({ x, y, bent = false }: { x: number; y: number; bent?: boolean }) {
  return (
    <g transform={`translate(${String(x)} ${String(y)})`}>
      {thin('M0 0v-26', WOOD_DARK, 2.6)}
      <path d="M-14-20c-7-9 0-23 9-21 2-8 13-8 15 0 9-2 13 12 6 21-9 5-21 5-30 0z" fill={LEAF} />
      <path
        d="M-10-31c1-4 5-5 7-2M3-38c2-3 6-3 7 0"
        {...line}
        stroke={LEAF_LIGHT}
        strokeWidth="1.400"
      />
      {!bent && (
        <g fill={BERRY}>
          <circle cx="-6" cy="-35" r="1.800" />
          <circle cx="0" cy="-40" r="1.800" />
          <circle cx="6" cy="-35" r="1.800" />
          <circle cx="-1" cy="-33" r="1.800" />
        </g>
      )}
    </g>
  );
}

function Basket({
  x,
  y,
  full = false,
  leaf = false,
  hole = false,
}: {
  x: number;
  y: number;
  full?: boolean;
  leaf?: boolean;
  hole?: boolean;
}) {
  return (
    <g transform={`translate(${String(x)} ${String(y)})`}>
      {thin('M-4.600-6a4.600 5.400 0 0 1 9.200 0', WOOD_DARK, 0.9)}
      {full && (
        <g fill={BERRY}>
          <circle cx="-2.600" cy="-6.600" r="1.600" />
          <circle cx="0.400" cy="-7.400" r="1.600" />
          <circle cx="3" cy="-6.500" r="1.600" />
        </g>
      )}
      {leaf && (
        <path d="M-6.500-5.600c2-3.400 11-3.400 13 0-4 1.600-9 1.600-13 0z" fill={LEAF_LIGHT} />
      )}
      <path d="M-5.400-6h10.800l-1.600 6h-7.600z" fill="#c99a5b" />
      {thin('M-4.800-4h9.600M-4.200-2h8.400', WOOD_DARK, 0.5)}
      {hole && <ellipse cx="1" cy="-0.800" rx="1.900" ry="1.100" fill={INK} />}
    </g>
  );
}

function Log({
  x,
  y,
  long = 16,
  thick = 5.6,
  tilt = 0,
}: {
  x: number;
  y: number;
  long?: number;
  thick?: number;
  tilt?: number;
}) {
  return (
    <g transform={`translate(${String(x)} ${String(y)}) rotate(${String(tilt)})`}>
      <rect x={-long / 2} y={-thick / 2} width={long} height={thick} rx={thick / 2} fill={WOOD} />
      <ellipse cx={long / 2 - thick / 4} rx={thick / 4} ry={thick / 2 - 0.5} fill="#c69a68" />
      {thin(`M${String(-long / 2 + 3)}-0.800h${String(long / 3)}`, WOOD_DARK, 0.6)}
    </g>
  );
}

const BERRIES: Scenes = {
  start: {
    x: -20,
    y: 25,
    mood: 'glad',
    hold: [8.5, -11],
    behind: <Bush x={18} y={27} berries={BERRIES_ALL} />,
    front: <Basket x={-11.5} y={21} />,
  },
  troubles: {
    high: {
      scene: {
        x: -2,
        y: 25,
        mood: 'sad',
        hold: [8, -23],
        behind: <TallBush x={20} y={27} />,
        front: <Basket x={-22} y={29} />,
      },
      endings: {
        log: {
          x: 4,
          y: 17,
          mood: 'glad',
          hold: [9, -23],
          behind: (
            <>
              <TallBush x={21} y={27} />
              <Log x={4} y={22.5} long={18} thick={8} />
            </>
          ),
          front: <Basket x={-20} y={29} full />,
        },
        stick: {
          x: -14,
          y: 25,
          mood: 'glad',
          hold: [8, -13],
          behind: (
            <>
              <TallBush x={22} y={27} bent />
              {/* The branch the stick has hooked, pulled down to where a paw can reach it. */}
              {thin('M16-10c-8-4-17 2-18 16', LEAF, 2.6)}
              <g fill={BERRY}>
                <circle cx="-1" cy="2" r="1.800" />
                <circle cx="-3" cy="7" r="1.800" />
                <circle cx="3" cy="-3" r="1.800" />
                <circle cx="1" cy="9" r="1.800" />
              </g>
            </>
          ),
          front: (
            <>
              {thin('M-6 12L8-10', WOOD_DARK, 1.2)}
              {thin('M8-10l3 0.500', WOOD_DARK, 1.2)}
              <Basket x={-1} y={29} full />
            </>
          ),
        },
      },
    },
    hole: {
      scene: {
        x: -20,
        y: 25,
        mood: 'sad',
        hold: [8.5, -11],
        behind: <Bush x={18} y={27} berries={BERRIES_FEW} />,
        front: (
          <>
            <Basket x={-11.5} y={21} hole />
            <g fill={BERRY}>
              <circle cx="-10" cy="24" r="1.500" />
              <circle cx="-8" cy="27.500" r="1.500" />
              <circle cx="-5" cy="30.500" r="1.500" />
              <circle cx="-1" cy="30" r="1.500" />
              <circle cx="3" cy="31" r="1.500" />
            </g>
          </>
        ),
      },
      endings: {
        leaf: {
          x: -20,
          y: 25,
          mood: 'glad',
          hold: [8.5, -11],
          behind: <Bush x={18} y={27} berries={BERRIES_FEW} />,
          front: <Basket x={-11.5} y={21} full leaf />,
        },
        eat: {
          x: -18,
          y: 25,
          mood: 'glad',
          hold: [4.5, -13.5],
          behind: <Bush x={18} y={27} berries={BERRIES_FEW} />,
          front: (
            <>
              <g fill={BERRY}>
                <circle cx="-12.500" cy="10.500" r="1.500" />
                <circle cx="-10.600" cy="12.600" r="1.500" />
              </g>
              <Basket x={-2} y={30} hole />
            </>
          ),
        },
      },
    },
  },
};

/** The stream, from the trees to the front of the picture: what has to be got across. */
function Stream({ fill = WATER, wide = false }: { fill?: string; wide?: boolean }) {
  return (
    <>
      <path
        d={
          wide
            ? 'M-10 6c-5 9 5 15-3 28h32c6-12-4-19 1-28z'
            : 'M-4 6c-5 9 5 15-3 28h22c6-12-4-19 1-28z'
        }
        fill={fill}
      />
      {thin(
        'M0 12c2-1.500 4-1.500 6 0M4 20c2-1.500 4-1.500 6 0M-2 28c2-1.500 4-1.500 6 0',
        fill === DEEP ? WATER : FOAM,
        1,
      )}
    </>
  );
}

const STREAM: Scenes = {
  start: {
    x: -28,
    y: 25,
    mood: 'glad',
    behind: <Stream />,
  },
  troubles: {
    broken: {
      scene: {
        x: -30,
        y: 25,
        mood: 'sad',
        behind: (
          <>
            <Stream />
            {thin('M-14 18l10 1 5 5', WOOD, 2.6)}
            {thin('M26 18l-9 1-4 5', WOOD, 2.6)}
            {thin('M-14 18v6M26 18v6', WOOD_DARK, 1.6)}
            {thin('M2 21l2-2M9 21l-2-2M5 18v-2', INK, 0.6)}
          </>
        ),
      },
      endings: {
        stones: {
          x: 32,
          y: 25,
          mood: 'glad',
          behind: (
            <>
              <Stream />
              <g fill="#7f8896">
                <ellipse cx="0" cy="25.600" rx="4.200" ry="2" />
                <ellipse cx="6.500" cy="21.600" rx="4.200" ry="2" />
                <ellipse cx="13" cy="25.600" rx="4.200" ry="2" />
              </g>
              <g fill="#d5dae2">
                <ellipse cx="0" cy="25" rx="4.200" ry="2" />
                <ellipse cx="6.500" cy="21" rx="4.200" ry="2" />
                <ellipse cx="13" cy="25" rx="4.200" ry="2" />
              </g>
            </>
          ),
        },
        log: {
          x: 34,
          y: 25,
          mood: 'glad',
          behind: (
            <>
              <Stream />
              <Log x={6} y={22} long={36} tilt={4} />
            </>
          ),
        },
      },
    },
    deep: {
      scene: {
        x: -32,
        y: 25,
        mood: 'sad',
        behind: (
          <>
            <Stream fill={DEEP} wide />
            {thin('M-16 30v-16', WOOD_DARK, 1)}
            {thin('M-16 16h3M-16 20h3M-16 24h3', WOOD_DARK, 0.6)}
          </>
        ),
      },
      endings: {
        along: {
          x: 6,
          y: 27,
          mood: 'glad',
          behind: (
            <>
              <Stream fill={SHALLOW} />
              <g fill={STONE}>
                <ellipse cx="-1" cy="16" rx="1.800" ry="0.900" />
                <ellipse cx="11" cy="14" rx="1.800" ry="0.900" />
                <ellipse cx="13" cy="30" rx="1.800" ry="0.900" />
                <ellipse cx="-3" cy="31" rx="1.800" ry="0.900" />
              </g>
            </>
          ),
          front: (
            <>
              <ellipse cx="6" cy="27" rx="9" ry="2" fill={FOAM} opacity="0.800" />
              <g fill={FOAM}>
                <circle cx="-5" cy="22" r="1" />
                <circle cx="-7" cy="25" r="0.800" />
                <circle cx="17" cy="22" r="1" />
                <circle cx="19" cy="25" r="0.800" />
              </g>
            </>
          ),
        },
        boat: {
          x: 5,
          y: 24,
          mood: 'glad',
          behind: <Stream fill={DEEP} wide />,
          front: (
            <>
              {thin('M-9 20l-8 8M19 20l8 8', WOOD_DARK, 1)}
              <path d="M-9 19h28c-1 6-5 9-9 9h-10c-4 0-8-3-9-9z" fill={WOOD} />
              {thin('M-7 22h24', WOOD_DARK, 0.7)}
            </>
          ),
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// The garden: a picnic, and an apple
// ---------------------------------------------------------------------------------------------------------------------

function Rug({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${String(x)} ${String(y)})`}>
      <path d="M-15-2l28-3 5 8-30 3z" fill={CLOTH} />
      {thin(
        'M-8-2.800l2.500 8.200M-1-3.500l2.500 8.200M6-4.200l2.500 8.200M-14 1.300l29-3',
        '#fbe9e4',
        0.9,
      )}
    </g>
  );
}

function Cake({ x, y, cut = false }: { x: number; y: number; cut?: boolean }) {
  return (
    <g transform={`translate(${String(x)} ${String(y)})`}>
      <path d="M-4.500 0v-4.500h9v4.500z" fill="#f4d7a1" />
      <ellipse cy="-4.500" rx="4.500" ry="1.500" fill="#f4a6b5" />
      <circle cy="-6" r="1.100" fill={RED} />
      {cut && <path d="M1.500 0v-5.200l3 0.600v4.600z" fill="#fff4e3" />}
    </g>
  );
}

/** A line of ants, the first of them at a point, each a step behind the one before; with a crumb each, or not. */
function Ants({
  x,
  y,
  count,
  step,
  crumbs = false,
}: {
  x: number;
  y: number;
  count: number;
  step: number;
  crumbs?: boolean;
}) {
  return (
    <g>
      {Array.from({ length: count }, (_, index) => {
        const ax = x + index * step;
        const ay = y + (index % 2) * 1.2;
        return (
          <g key={index} transform={`translate(${String(ax)} ${String(ay)})`}>
            {thin('M-1.400 0.500l-0.800 1.500M0 0.600v1.600M1.400 0.500l0.800 1.500', INK, 0.4)}
            <circle cx="-1.500" r="0.900" fill={INK} />
            <circle r="0.800" fill={INK} />
            <circle cx="1.500" r="1" fill={INK} />
            {crumbs && <circle cy="-1.900" r="1.100" fill="#f4d7a1" />}
          </g>
        );
      })}
    </g>
  );
}

const RAIN =
  'M-44-12l-2 5M-36-18l-2 5M-30-8l-2 5M-22-16l-2 5M-14-9l-2 5M-6-17l-2 5M2-10l-2 5M10-18l-2 5M18-9l-2 5M26-16l-2 5M34-10l-2 5M42-17l-2 5';

function Cloud({ x, y }: { x: number; y: number }) {
  return (
    <path
      transform={`translate(${String(x)} ${String(y)})`}
      d="M-16 4c-6 0-7-8-1-9 0-6 9-8 12-3 3-5 12-3 12 3 6 0 6 9 0 9z"
      fill="#aab4c2"
    />
  );
}

const PICNIC: Scenes = {
  start: {
    x: -26,
    y: 25,
    mood: 'glad',
    front: (
      <>
        <Rug x={10} y={26} />
        <Cake x={14} y={26} />
        <Basket x={2} y={27} />
      </>
    ),
  },
  troubles: {
    rain: {
      scene: {
        x: -26,
        y: 25,
        mood: 'sad',
        behind: (
          <>
            <Cloud x={-20} y={-20} />
            <Cloud x={16} y={-21} />
            {thin(RAIN, '#5d9fd0', 1)}
            {thin(
              'M-40 2l-2 5M-18 3l-2 5M6 2l-2 5M30 3l-2 5M-6 12l-2 5M22 12l-2 5M40 11l-2 5',
              '#5d9fd0',
              1,
            )}
          </>
        ),
        front: (
          <>
            <Rug x={10} y={26} />
            <Cake x={14} y={26} />
            <Basket x={2} y={27} />
          </>
        ),
      },
      endings: {
        tree: {
          x: 0,
          y: 26,
          mood: 'glad',
          behind: (
            <>
              <Cloud x={-30} y={-20} />
              {thin(
                'M-46-14l-2 5M-40-4l-2 5M-34-16l-2 5M-44 8l-2 5M-36 4l-2 5M-30 14l-2 5M-42 20l-2 5',
                '#5d9fd0',
                1,
              )}
              <path d="M26 26v-26h7v26z" fill={WOOD} />
              <path
                d="M-20-8c-6-12 6-24 18-20 6-8 24-8 30 0 12-4 22 8 16 20-18 8-46 8-64 0z"
                fill={LEAF}
              />
              <path
                d="M-10-18c2-5 8-6 11-2M12-24c3-4 9-4 11 0"
                {...line}
                stroke={LEAF_LIGHT}
                strokeWidth="1.600"
              />
            </>
          ),
          front: (
            <>
              <Rug x={18} y={29} />
              <Cake x={22} y={29} />
            </>
          ),
        },
        umbrella: {
          x: -6,
          y: 26,
          mood: 'glad',
          behind: (
            <>
              <Cloud x={-24} y={-21} />
              <Cloud x={32} y={-21} />
              {thin(
                'M-44-14l-2 5M-36-8l-2 5M-40 4l-2 5M-44 16l-2 5M40-14l-2 5M44-2l-2 5M42 12l-2 5',
                '#5d9fd0',
                1,
              )}
              {thin('M8 28v-30', WOOD_DARK, 1.2)}
              <path d="M-22-2a30 20 0 0 1 60 0z" fill={RED} />
              <path d="M-7-2a15 20 0 0 1 15-20v20zM23-2a15 20 0 0 0-15-20v20z" fill="#fbe9e4" />
            </>
          ),
          front: (
            <>
              <Rug x={20} y={29} />
              <Cake x={24} y={29} />
            </>
          ),
        },
      },
    },
    ants: {
      scene: {
        x: -26,
        y: 25,
        mood: 'sad',
        front: (
          <>
            <Rug x={6} y={26} />
            <Cake x={8} y={26} />
            <Ants x={18} y={27} count={6} step={5} />
          </>
        ),
      },
      endings: {
        share: {
          x: -26,
          y: 25,
          mood: 'glad',
          hold: [9, -7],
          front: (
            <>
              <Rug x={6} y={26} />
              <Cake x={8} y={26} cut />
              <Ants x={20} y={29} count={6} step={5} crumbs />
            </>
          ),
        },
        move: {
          x: 4,
          y: 15,
          mood: 'glad',
          behind: <path d="M-24 34c6-22 24-30 40-26s24 14 30 26z" fill="#b9e29c" />,
          front: (
            <>
              <Rug x={26} y={17} />
              <Cake x={28} y={17} />
              <Ants x={-46} y={30} count={5} step={4.5} />
            </>
          ),
        },
      },
    },
  },
};

function Apple({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${String(x)} ${String(y)}) scale(${String(size)})`}>
      <circle r="3.400" fill={RED} />
      <circle cx="-1.200" cy="-1.200" r="0.900" fill="#f29488" />
      {thin('M0-3.200c0-1.200 0.600-2 1.400-2.400', WOOD_DARK, 0.7)}
      <path
        d="M1.200-4.800c1.600-1.400 3.400-1 3.800 0.200-1.400 0.800-2.800 0.800-3.800-0.200z"
        fill={LEAF}
      />
    </g>
  );
}

function AppleTree({ x, apple = true }: { x: number; apple?: boolean }) {
  return (
    <g transform={`translate(${String(x)} 0)`}>
      <path d="M-3.500 27v-24h7v24z" fill={WOOD} />
      <path
        d="M-18-6c-6-10 2-22 12-20 4-8 18-8 22 0 10-2 16 10 10 20-12 8-32 8-44 0z"
        fill={LEAF}
      />
      <path
        d="M-10-14c2-5 7-6 10-2M6-22c3-4 8-4 10 0"
        {...line}
        stroke={LEAF_LIGHT}
        strokeWidth="1.600"
      />
      {apple && <Apple x={2} y={-22} />}
    </g>
  );
}

const APPLE: Scenes = {
  start: {
    x: -18,
    y: 25,
    mood: 'glad',
    behind: <AppleTree x={18} />,
  },
  troubles: {
    high: {
      scene: {
        x: 0,
        y: 25,
        mood: 'sad',
        hold: [8, -23],
        behind: <AppleTree x={20} />,
      },
      endings: {
        ladder: {
          x: -20,
          y: 25,
          mood: 'glad',
          hold: [8, -11],
          behind: (
            <>
              <AppleTree x={20} apple={false} />
              {thin('M0 27L12-12M7 27L19-12', WOOD_DARK, 1.3)}
              {thin('M2 20h7M4.400 12h7M6.800 4h7M9.200-4h7', WOOD_DARK, 1.1)}
            </>
          ),
          front: <Apple x={-11.5} y={12.5} />,
        },
        shake: {
          x: 2,
          y: 25,
          mood: 'glad',
          hold: [10, -10],
          behind: (
            <>
              <AppleTree x={20} apple={false} />
              {thin('M-3-22c-3 4-3 10 0 14M45-22c3 4 3 10 0 14', INK, 0.9)}
              <path
                d="M36 2c1.500-1 3-0.600 3.400 0.400-1.200 0.700-2.500 0.600-3.400-0.400zM10 8c1.500-1 3-0.600 3.400 0.400-1.200 0.700-2.500 0.600-3.400-0.400z"
                fill={LEAF_LIGHT}
              />
            </>
          ),
          front: (
            <>
              <Apple x={-20} y={29} />
              {thin('M-26 27l-2-2M-14 27l2-2M-20 24v-2.500', INK, 0.7)}
            </>
          ),
        },
      },
    },
    rolled: {
      scene: {
        x: -8,
        y: 23,
        mood: 'sad',
        behind: (
          <>
            <AppleTree x={-30} apple={false} />
            <path d="M-50 20L50 34h-100z" fill="#8ccb78" />
          </>
        ),
        front: (
          <>
            {thin('M6 22c3-2 6-2 8 0M16 24c3-2 6-2 8 0', INK, 0.9)}
            <Apple x={32} y={28} />
          </>
        ),
      },
      endings: {
        chase: {
          x: 4,
          y: 25,
          mood: 'glad',
          lean: 8,
          hold: [9, -8],
          behind: (
            <>
              <ellipse cx="-22" cy="13" rx="15" ry="4.500" fill={WATER} />
              {thin('M-28 13c2-1.500 4-1.500 6 0M-18 12c2-1.500 4-1.500 6 0', FOAM, 0.9)}
              {speed(-30, 20)}
              {thin('M30 28v-16M44 28v-16', WOOD_DARK, 1.8)}
              {thin('M30 15h14M30 21h14M30 15l14 6', WOOD, 1.4)}
            </>
          ),
          front: <Apple x={21} y={29} />,
        },
        duck: {
          x: -28,
          y: 25,
          mood: 'glad',
          hold: [9, -5],
          behind: (
            <>
              <ellipse cx="18" cy="23" rx="26" ry="9" fill={WATER} />
              {thin(
                'M8 20c2-1.500 4-1.500 6 0M26 26c2-1.500 4-1.500 6 0M30 19c2-1.500 4-1.500 6 0',
                FOAM,
                0.9,
              )}
            </>
          ),
          front: (
            <>
              <Apple x={-9} y={27} />
              <path d="M2 26c0-5 6-7 10-5l5-3c1 5-1 9-6 9-4 1-8 1-9-1z" fill="#ffffff" />
              <circle cx="0" cy="20.500" r="3.200" fill="#ffffff" />
              <path d="M-3 20.500l-4 1.200 4 1z" fill="#f2a33a" />
              <circle cx="-0.600" cy="19.800" r="0.600" fill={INK} />
              {thin('M6 24c2 1 4 1 5 0', STONE, 0.7)}
            </>
          ),
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// Putting a page together
// ---------------------------------------------------------------------------------------------------------------------

interface Scenes {
  start: Scene;
  troubles: Readonly<Record<string, { scene: Scene; endings: Readonly<Record<string, Scene>> }>>;
}

/** The scenes of each beginning, under the names `storymaker.json` gives the beginnings, troubles and endings. */
export const SCENES: Readonly<Record<string, Scenes>> = {
  kite: KITE,
  sandcastle: SANDCASTLE,
  berries: BERRIES,
  stream: STREAM,
  picnic: PICNIC,
  apple: APPLE,
};

const pick = <T,>(from: Readonly<Record<string, T>> | undefined, key: string | undefined) =>
  from !== undefined && key !== undefined && Object.hasOwn(from, key) ? from[key] : undefined;

/**
 * The scene of one page of a story, as far as the story has been chosen. The first page is put together as it
 * is chosen: someone on a blank page, then in a place, then with what they want. A page that has not been
 * reached has no scene.
 */
export function sceneOf(story: Story, page: number): Scene | null {
  const scenes = pick(SCENES, story.seed);
  if (page === 1) {
    if (scenes) return scenes.start;
    return story.where === undefined
      ? { x: 0, y: 24, mood: 'glad' }
      : { x: -18, y: 25, mood: 'glad' };
  }
  const trouble = pick(scenes?.troubles, story.trouble);
  if (page === 2) return trouble?.scene ?? null;
  if (page === 3) return pick(trouble?.endings, story.ending) ?? null;
  return null;
}

/** A page with nothing on it yet: paper, and a line where the ground will be. */
function Paper() {
  return (
    <>
      <rect x="-50" y="-34" width="100" height="68" fill="#fff8ec" />
      <path d="M-38 26h76" {...line} stroke="#ead9bd" strokeWidth="1.200" strokeDasharray="2 4" />
    </>
  );
}

/** The picture of one page of a story: the place, and in it the one it is about and what the page says. */
export function StoryPicture({
  story,
  page,
  className,
}: {
  story: Story;
  page: number;
  className?: string | undefined;
}) {
  const scene = sceneOf(story, page);
  return (
    <svg
      viewBox={PAGE_BOX}
      className={className}
      aria-hidden="true"
      focusable="false"
      data-story-page={page}
      data-drawn={scene !== null}
    >
      {story.where === undefined ? <Paper /> : <Place where={story.where} />}
      {scene?.behind}
      {scene && story.who !== undefined && (
        <Animal
          who={story.who}
          mood={scene.mood}
          x={scene.x}
          y={scene.y}
          turned={scene.turned ?? false}
          lean={scene.lean ?? 0}
          hold={scene.hold}
        />
      )}
      {scene?.front}
    </svg>
  );
}
