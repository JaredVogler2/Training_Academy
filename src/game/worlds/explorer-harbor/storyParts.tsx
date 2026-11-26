import type { ReactNode } from 'react';

/**
 * The parts a made-up story's pictures are put together from: three places, three animals, and for each of six
 * beginnings what is there at the start, when something has gone wrong, and when it has come right. Flat colours,
 * no lettering, in the manner of this world's story pictures. A page is a place with an animal in it and what
 * the story is about beside them; nothing is drawn that the words do not say.
 *
 * Everything is drawn in one box, 100 wide and 68 high with its middle at the middle: x from -50 to 50, y from -34
 * (the top) to 34. The ground begins at y = 6. An animal stands with its feet at the point it is put at.
 */

export const PAGE_BOX = '-50 -34 100 68';

const INK = '#22304f';
const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

// ---------------------------------------------------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------------------------------------------------

function Beach() {
  return (
    <>
      <rect x="-50" y="-34" width="100" height="68" fill="#cfeaf7" />
      <circle cx="36" cy="-22" r="7" fill="#ffd35c" />
      <rect x="-50" y="-4" width="100" height="12" fill="#63b9dd" />
      <path
        d="M-44 0c3-2 6-2 9 0M-20 3c3-2 6-2 9 0M6 0c3-2 6-2 9 0M30 3c3-2 6-2 9 0"
        {...line}
        stroke="#a5dcf1"
        strokeWidth="1.200"
      />
      <path d="M-50 8c16-3 34 2 50 0s34-3 50 0v26h-100z" fill="#f6e2a8" />
      <path d="M-40 24h4M-12 29h5M20 26h4M38 30h4" {...line} stroke="#e2c67e" strokeWidth="1.200" />
    </>
  );
}

function Forest() {
  return (
    <>
      <rect x="-50" y="-34" width="100" height="68" fill="#d8efe0" />
      <path
        d="M-50 6v-22c6-10 14-10 18 0 3-12 13-13 17-1 4-13 15-12 18 1 4-11 14-11 17 1 4-12 14-12 17 0 3-8 9-9 13-3v24z"
        fill="#7fbf7a"
      />
      <path
        d="M-38 6v-12M-8 6v-14M24 6v-12M44 6v-10"
        {...line}
        stroke="#8a6a44"
        strokeWidth="2.400"
      />
      <path d="M-50 6c18-3 34 2 50 0s34-3 50 0v28h-100z" fill="#9fd48a" />
      <path
        d="M-42 22l1-3 1 3M-14 28l1-3 1 3M22 24l1-3 1 3M40 29l1-3 1 3"
        {...line}
        stroke="#6fb56a"
        strokeWidth="1.200"
      />
    </>
  );
}

function Garden() {
  return (
    <>
      <rect x="-50" y="-34" width="100" height="68" fill="#cfeaf7" />
      <path d="M-44-24c2-4 9-4 10 0 4-1 6 4 2 5h-13c-4-1-3-5 1-5z" fill="#ffffff" />
      <path d="M-50 6c18-3 34 2 50 0s34-3 50 0v28h-100z" fill="#a8d98a" />
      {/* A fence along the back of it. */}
      <g fill="#f3e3c2">
        {[-46, -36, -26, -16, -6, 4, 14, 24, 34, 44].map((x) => (
          <path key={x} d={`M${String(x - 2)} 6v-9l2-2.500 2 2.500v9z`} />
        ))}
        <rect x="-50" y="-2" width="100" height="1.600" />
      </g>
      <g>
        {[
          [-40, 26, '#f08a9a'],
          [-10, 30, '#ffd35c'],
          [34, 28, '#f08a9a'],
        ].map(([x, y, colour]) => (
          <g key={String(x)}>
            <path d={`M${String(x)} ${String(y)}v-4`} {...line} stroke="#6fb56a" strokeWidth="1" />
            <circle cx={Number(x)} cy={Number(y) - 5} r="1.800" fill={String(colour)} />
          </g>
        ))}
      </g>
    </>
  );
}

const PLACES: Readonly<Record<string, () => ReactNode>> = {
  beach: Beach,
  forest: Forest,
  garden: Garden,
};

// ---------------------------------------------------------------------------------------------------------------------
// Animals
// ---------------------------------------------------------------------------------------------------------------------

export type Mood = 'plain' | 'glad' | 'sad';

function Face({ mood, y }: { mood: Mood; y: number }) {
  return (
    <>
      <circle cx="-2.600" cy={y - 3.2} r="0.950" fill={INK} />
      <circle cx="2.600" cy={y - 3.2} r="0.950" fill={INK} />
      {mood === 'sad' && (
        <path
          // Brows that go up towards the middle: worried, not cross.
          d={`M-4.500 ${String(y - 4.9)}l2.400-1.200M4.500 ${String(y - 4.9)}l-2.400-1.200`}
          {...line}
          stroke={INK}
          strokeWidth="0.700"
        />
      )}
      <path
        d={
          mood === 'glad'
            ? `M-1.900 ${String(y + 1.8)}q1.900 2.200 3.800 0`
            : mood === 'sad'
              ? `M-1.700 ${String(y + 2.8)}q1.700-1.700 3.400 0`
              : `M-1.300 ${String(y + 2.2)}h2.600`
        }
        {...line}
        stroke={INK}
        strokeWidth="0.800"
      />
    </>
  );
}

function Fox({ mood }: { mood: Mood }) {
  return (
    <>
      <path d="M5-4c9 1 12-6 10-13-3 5-7 6-11 6z" fill="#e8873a" />
      <path
        d="M13.600-12.500c1.200-1.400 1.700-3 1.400-4.500-1.400 2.300-2.800 3.500-4.400 4.300z"
        fill="#fff4e3"
      />
      <rect x="-5" y="-3" width="3.600" height="3.600" rx="1.500" fill="#c96f2a" />
      <rect x="1.400" y="-3" width="3.600" height="3.600" rx="1.500" fill="#c96f2a" />
      <ellipse cy="-8.500" rx="6.400" ry="7.600" fill="#e8873a" />
      <ellipse cy="-7" rx="3.500" ry="5.200" fill="#fff4e3" />
      <path d="M-6.500-21l0.800-7.500 5 4.500zM6.500-21l-0.800-7.500-5 4.500z" fill="#e8873a" />
      <path
        d="M-5.300-23l0.500-3.400 2.400 2.200zM5.300-23l-0.500-3.400-2.400 2.200z"
        fill="#5a3a22"
      />
      <ellipse cy="-19" rx="7" ry="5.800" fill="#e8873a" />
      <path d="M-6.200-17.500c2 6.500 10.400 6.500 12.400 0-4-2-8.400-2-12.400 0z" fill="#fff4e3" />
      <ellipse cy="-16.400" rx="1.200" ry="0.900" fill={INK} />
      <Face mood={mood} y={-17.2} />
    </>
  );
}

function Bear({ mood }: { mood: Mood }) {
  return (
    <>
      <rect x="-6" y="-3.400" width="4.400" height="4" rx="1.800" fill="#7d5531" />
      <rect x="1.600" y="-3.400" width="4.400" height="4" rx="1.800" fill="#7d5531" />
      <ellipse cy="-9" rx="7.800" ry="8.200" fill="#9a6b3f" />
      <ellipse cy="-7.500" rx="4.400" ry="5.400" fill="#c69a68" />
      <circle cx="-5.800" cy="-25" r="2.800" fill="#9a6b3f" />
      <circle cx="5.800" cy="-25" r="2.800" fill="#9a6b3f" />
      <circle cx="-5.800" cy="-25" r="1.300" fill="#c69a68" />
      <circle cx="5.800" cy="-25" r="1.300" fill="#c69a68" />
      <ellipse cy="-19.500" rx="7.400" ry="6.400" fill="#9a6b3f" />
      <ellipse cy="-16.800" rx="3.800" ry="3" fill="#e8cfa6" />
      <ellipse cy="-17.800" rx="1.300" ry="1" fill={INK} />
      <Face mood={mood} y={-17.6} />
    </>
  );
}

function Rabbit({ mood }: { mood: Mood }) {
  return (
    <>
      <circle cx="6.200" cy="-3.500" r="2.400" fill="#ffffff" />
      <rect x="-5" y="-3" width="3.800" height="3.600" rx="1.600" fill="#bdb8ae" />
      <rect x="1.200" y="-3" width="3.800" height="3.600" rx="1.600" fill="#bdb8ae" />
      <ellipse cy="-8.200" rx="6" ry="7.400" fill="#d9d5cc" />
      <ellipse cy="-6.800" rx="3.400" ry="5" fill="#ffffff" />
      <path
        d="M-4.600-22c-2.600-5-2.200-10.500 0.400-11.500 2.200 1.500 2.800 6.500 2 11zM4.600-22c2.600-5 2.200-10.500-0.400-11.500-2.200 1.500-2.800 6.500-2 11z"
        fill="#d9d5cc"
      />
      <path
        d="M-3.900-23c-1.300-3.600-1.100-7 0.100-8.400 0.900 1.800 1.200 5 0.900 8zM3.900-23c1.300-3.600 1.100-7-0.100-8.400-0.900 1.800-1.200 5-0.900 8z"
        fill="#f4b9c0"
      />
      <ellipse cy="-18.600" rx="6.400" ry="5.600" fill="#d9d5cc" />
      <ellipse cy="-16.300" rx="3" ry="2.300" fill="#ffffff" />
      <path d="M-0.900-17.200h1.800l-0.900 1.100z" fill="#e58a98" />
      <Face mood={mood} y={-17} />
    </>
  );
}

interface Kind {
  draw: (props: { mood: Mood }) => ReactNode;
  /** The colour of an arm and a paw. */
  arm: string;
}

const ANIMALS: Readonly<Record<string, Kind>> = {
  fox: { draw: Fox, arm: '#c96f2a' },
  bear: { draw: Bear, arm: '#7d5531' },
  rabbit: { draw: Rabbit, arm: '#bdb8ae' },
};

/** Where a paw is when it is doing nothing: at the side, a little below the middle. */
const AT_REST: readonly [number, number] = [6.8, -6.5];

/**
 * One of the three, standing with its feet at a point. `hold` is where its front paw is, measured from its feet,
 * when it is holding or reaching for something; `lean` tips it forward, in degrees, as when it runs; `turned`
 * has it the other way about.
 */
export function Animal({
  who,
  mood = 'plain',
  x = 0,
  y = 0,
  turned = false,
  lean = 0,
  hold,
}: {
  who: string;
  mood?: Mood;
  x?: number;
  y?: number;
  turned?: boolean;
  lean?: number;
  hold?: readonly [number, number] | undefined;
}) {
  const kind = Object.hasOwn(ANIMALS, who) ? ANIMALS[who] : undefined;
  if (!kind) return null;
  const Drawn = kind.draw;
  const [holdX, holdY] = hold ?? AT_REST;
  const arm = (toX: number, toY: number) => (
    <>
      <path
        d={`M${String(toX < 0 ? -4.6 : 4.6)}-12.500L${String(toX)} ${String(toY)}`}
        {...line}
        stroke={kind.arm}
        strokeWidth="2.800"
      />
      <circle cx={toX} cy={toY} r="1.900" fill={kind.arm} />
    </>
  );
  return (
    <g
      transform={`translate(${String(x)} ${String(y)})${turned ? ' scale(-1 1)' : ''}${
        lean === 0 ? '' : ` rotate(${String(lean)})`
      }`}
      data-animal={who}
      data-mood={mood}
    >
      <ellipse cy="0.600" rx="8" ry="1.800" fill={INK} opacity="0.120" />
      {/* The arm that is doing nothing is behind the body; the one that holds is in front of everything. */}
      {arm(-AT_REST[0], AT_REST[1])}
      {hold === undefined && arm(AT_REST[0], AT_REST[1])}
      <Drawn mood={mood} />
      {hold !== undefined && arm(holdX, holdY)}
    </g>
  );
}

/** One of the three places, filling the box. */
export function Place({ where }: { where: string }) {
  const Drawn = Object.hasOwn(PLACES, where) ? PLACES[where] : undefined;
  return Drawn ? <g data-place={where}>{<Drawn />}</g> : null;
}

export const ANIMAL_IDS: readonly string[] = Object.keys(ANIMALS);
export const PLACE_IDS: readonly string[] = Object.keys(PLACES);
