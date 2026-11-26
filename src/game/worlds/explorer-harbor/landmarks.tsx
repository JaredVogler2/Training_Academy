import type { ReactNode } from 'react';

/**
 * Fifteen famous places, drawn in the manner of this world's story pictures: a small scene with ground under it
 * and sky over it, flat colours, no lettering. Each is a place a great many people would know from its outline;
 * none shows a person. Which place each is, where it is and what its place was checked against is in
 * src/content/explorer-harbor/places.json; a test holds the two lists together.
 */

const INK = '#22304f';
const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const SKY = '#cfeaf7';
const DAWN = '#fde6d8';
const GRASS = '#9fd48a';
const WATER = '#63b9dd';

/** A tile of sky with flat ground along its foot. */
function Tile({ sky = SKY, ground = GRASS }: { sky?: string; ground?: string }) {
  return (
    <>
      <rect x="-32" y="-32" width="64" height="64" rx="9" fill={sky} />
      <path d="M-32 14h64v9a9 9 0 0 1-9 9h-46a9 9 0 0 1-9-9z" fill={ground} />
    </>
  );
}

/** Small waves on water at the foot of a tile. */
function Waves() {
  return (
    <path
      d="M-26 21c2-1.500 4-1.500 6 0M-8 25c2-1.500 4-1.500 6 0M10 21c2-1.500 4-1.500 6 0M20 27c2-1.500 4-1.500 6 0"
      {...line}
      stroke="#a5dcf1"
      strokeWidth="1.300"
    />
  );
}

/** A row of arches along a wall, each a doorway with a round top. */
function Arches({
  y,
  from,
  count,
  step,
}: {
  y: number;
  from: number;
  count: number;
  step: number;
}) {
  return (
    <g fill="#8f6f4a">
      {Array.from({ length: count }, (_, index) => {
        const x = from + index * step;
        return (
          <path
            key={index}
            d={`M${String(x)} ${String(y)}v-3.600a1.800 1.800 0 0 1 3.600 0v3.600z`}
          />
        );
      })}
    </g>
  );
}

const DRAWINGS: Record<string, ReactNode> = {
  pyramids: (
    <>
      <Tile sky="#fbe3b0" ground="#edc97a" />
      <circle cx="21" cy="-19" r="6" fill="#ffd35c" />
      <path d="M-30 14L-11-15 8 14z" fill="#e0b25a" />
      <path d="M-11-15L8 14h-10z" fill="#c8963f" />
      <path d="M4 14L15-3 26 14z" fill="#e7bf6c" />
      <path d="M15-3L26 14h-6z" fill="#cfa04a" />
    </>
  ),
  kilimanjaro: (
    <>
      <Tile ground="#d8c56b" />
      <path d="M-30 14L-9-11c3-3.500 9-3.500 12 0L24 14z" fill="#8f879c" />
      <path
        d="M-13-6l4-5c3-3.500 9-3.500 12 0l4.500 5.400-3.500 2-3-3.400-3 4-3.500-3-3 3.500-2.500-2.500z"
        fill="#ffffff"
      />
      <path d="M19 14v-10" {...line} stroke="#6b4a2b" strokeWidth="1.700" />
      <path d="M19 4l-4-3M19 5l4-3" {...line} stroke="#6b4a2b" strokeWidth="1.200" />
      <ellipse cx="19" cy="-0.500" rx="9" ry="2.800" fill="#5f9a4a" />
    </>
  ),
  'table-mountain': (
    <>
      <Tile ground={WATER} />
      <path d="M-30 14l7-18h7l3-6h26l3 6h7l7 18z" fill="#8d9aa8" />
      <path d="M-13-10h26l3 6h-32z" fill="#a3aebb" />
      <path
        d="M-17-11c5-3 11-2 17-2s12-2 17 1c1 2-1 3-4 3-5-1-8 1-13 1s-8-2-13-1c-3 0-5-1-4-2z"
        fill="#ffffff"
      />
      <Waves />
    </>
  ),
  'eiffel-tower': (
    <>
      <Tile />
      <path
        d="M-13 14c6-10 9.500-22 10.500-40h5c1 18 4.500 30 10.500 40h-5.500c-2.500-5-4.500-9-7.500-9s-5 4-7.500 9z"
        fill="#6b7280"
      />
      <rect x="-8.500" y="-3" width="17" height="2.600" rx="1" fill="#535a66" />
      <rect x="-5.500" y="-13" width="11" height="2.200" rx="1" fill="#535a66" />
      <path d="M0-26v-4.500" {...line} stroke="#6b7280" strokeWidth="1.500" />
    </>
  ),
  colosseum: (
    <>
      <Tile sky="#fbe9c9" ground="#d9c9a3" />
      <path d="M-27 14v-12c0-3 3-6 7-6h14v-7c0-2 2-4 4-4h25c2 0 4 2 4 4v25z" fill="#e3c08f" />
      <path d="M-27 4h54M-6-4h33" {...line} stroke="#c9a373" strokeWidth="1.200" />
      <Arches y={13} from={-24} count={7} step={7} />
      <Arches y={3} from={-24} count={7} step={7} />
      <Arches y={-6} from={-3} count={4} step={7} />
    </>
  ),
  'big-ben': (
    <>
      <Tile />
      <rect x="-6" y="-9" width="12" height="23" fill="#d0aa62" />
      <path d="M-2-6v20M2-6v20" {...line} stroke="#b8924a" strokeWidth="1" />
      <rect x="-7.500" y="-20" width="15" height="12" rx="1" fill="#c39a4e" />
      <circle cy="-14" r="4.600" fill="#ffffff" />
      <path d="M0-14v-3M0-14l2.200 1.200" {...line} stroke={INK} strokeWidth="1" />
      <path d="M-7.500-20L0-31l7.500 11z" fill="#5b6470" />
    </>
  ),
  'great-wall': (
    <>
      <Tile ground="#8fc97a" />
      <path d="M-32 14c8-13 18-15 26-7s16 6 22-2 11-7 16-3v12z" fill="#7ab868" />
      <path
        d="M-29 3c7-8 14-9 22-2s15 6 22-1 9-7 14-5"
        {...line}
        stroke="#b9a98c"
        strokeWidth="4.400"
      />
      <path
        d="M-29 1c7-8 14-9 22-2s15 6 22-1 9-7 14-5"
        {...line}
        stroke="#d8cbb0"
        strokeWidth="1.300"
        strokeDasharray="2 2"
      />
      <rect x="-13" y="-11" width="9" height="11" fill="#b9a98c" />
      <path
        d="M-14-11h11v-2.600h-2.200v1.300h-2.200v-1.300h-2.200v1.300h-2.200v-1.300h-2.200z"
        fill="#a39479"
      />
      <rect x="-9.700" y="-6" width="2.400" height="3.400" rx="1" fill="#7d7260" />
    </>
  ),
  'taj-mahal': (
    <>
      <Tile sky={DAWN} />
      <rect x="-25" y="8" width="50" height="6" fill="#efe9df" />
      <rect x="-12" y="-5" width="24" height="13" fill="#ffffff" />
      <path d="M-7.500-5c0-8 4.500-9.500 7.500-14 3 4.500 7.500 6 7.500 14z" fill="#ffffff" />
      <path d="M0-19v-4.500" {...line} stroke="#d9b24c" strokeWidth="1.300" />
      <path
        d="M-12-5c0-3 1.600-3.800 3.200-5.400 1.600 1.600 3.200 2.400 3.200 5.400zM5.600-5c0-3 1.600-3.800 3.200-5.400 1.600 1.600 3.200 2.400 3.200 5.400z"
        fill="#f1ece3"
      />
      <path d="M-23.500 8v-18h3.200v18zM20.300 8v-18h3.200v18z" fill="#ffffff" />
      <path d="M-24.200-10h4.600l-2.300-3.600zM19.600-10h4.600l-2.300-3.600z" fill="#f1ece3" />
      <path d="M-3.200 8v-6.500a3.200 3.200 0 0 1 6.400 0v6.500z" fill="#c7d7e6" />
    </>
  ),
  'mount-fuji': (
    <>
      <Tile sky="#dbeafe" ground="#7fb2e0" />
      <path d="M-30 14L-6-15c2-2.400 10-2.400 12 0L30 14z" fill="#6f86b8" />
      <path
        d="M-11.500-8.500l5.500-6.500c2-2.400 10-2.400 12 0l5.500 6.500-3.200 2.200-3-3.400-2.800 4-2.500-3.200-2.800 4-3.200-3.600-2.600 1.800z"
        fill="#ffffff"
      />
      <path d="M-32-12c5 1 9-1 13-5" {...line} stroke="#7a5a3c" strokeWidth="1.500" />
      <g fill="#f7a8c0">
        <circle cx="-25" cy="-15" r="3" />
        <circle cx="-19" cy="-20" r="2.600" />
        <circle cx="-27" cy="-21.500" r="2.200" />
      </g>
    </>
  ),
  'statue-of-liberty': (
    <>
      <Tile ground={WATER} />
      <path d="M-9 14v-9h18v9z" fill="#c9b79a" />
      <rect x="-11" y="3" width="22" height="3" rx="1" fill="#b3a084" />
      <path d="M-5.500 3l2-15h7l2 15z" fill="#7fb7a3" />
      <circle cy="-15.500" r="3.200" fill="#7fb7a3" />
      <path
        d="M-3.200-17.500l-1.600-3M0-18.700v-3.500M3.200-17.500l1.600-3"
        {...line}
        stroke="#7fb7a3"
        strokeWidth="1.300"
      />
      <path d="M2.500-11l5-10.500" {...line} stroke="#7fb7a3" strokeWidth="2.600" />
      <path d="M-3-9l-3.500 4" {...line} stroke="#7fb7a3" strokeWidth="2.400" />
      <rect x="6.200" y="-23.500" width="2.800" height="2.400" rx="0.600" fill="#7fb7a3" />
      <path d="M7.600-23.500c-2.400-2-0.400-4 0-6.200 2 2 3 4.200 0 6.200z" fill="#ffd35c" />
      <Waves />
    </>
  ),
  'chichen-itza': (
    <>
      <Tile ground="#8fc97a" />
      <path d="M-27 14v-5h4v-5h4v-5h4v-5h4v-5h22v5h4v5h4v5h4v5h4v5z" fill="#d2c6a8" />
      <path d="M-4.500 14l2-25h5l2 25z" fill="#e8dfc8" />
      <rect x="-6.500" y="-17.500" width="13" height="6.500" fill="#c2b594" />
      <rect x="-1.600" y="-15.500" width="3.200" height="4.500" fill="#6b5a3e" />
    </>
  ),
  'machu-picchu': (
    <>
      <Tile ground="#7ab868" />
      <path d="M3 14c2-15 6-27 11-31 6 5 11 17 15 31z" fill="#5f9a59" />
      <path d="M-30 14v-6h18v-5.500h14v-5.500h11v17z" fill="#8fc97a" />
      <path d="M-30 8h18M-12 2.500h14M2-3h11" {...line} stroke="#a8a08c" strokeWidth="2.400" />
      <path d="M-25 7v-4.500h5.500v4.500zM-7.500 1.500v-4.500h5.500v4.500z" fill="#b8b09c" />
      <path
        d="M-26 2.500l3.800-3.300 3.800 3.300zM-8.500-3l3.800-3.300 3.800 3.300z"
        fill="#9c8f72"
      />
    </>
  ),
  'angel-falls': (
    <>
      <Tile ground="#4f9a55" />
      <path d="M-26 14v-25c0-2 2-4 4-4h42c2 0 4 2 4 4v25z" fill="#b08d63" />
      <path d="M-26-11c0-2 2-4 4-4h42c2 0 4 2 4 4v2.500h-50z" fill="#6aa85e" />
      <path d="M-15-5v13M11-4v11M19-7v9M-21-3v8" {...line} stroke="#967650" strokeWidth="1.300" />
      <path d="M-2-13v24" {...line} stroke="#ffffff" strokeWidth="3.600" />
      <path d="M-2-13v24" {...line} stroke="#dff1fa" strokeWidth="1.200" />
      <ellipse cx="-2" cy="12.500" rx="9" ry="3.200" fill="#e8f4fb" />
    </>
  ),
  'sydney-opera-house': (
    <>
      <Tile ground={WATER} />
      <path d="M-27 14v-4.500h54v4.500z" fill="#d9cbb8" />
      <path
        d="M-23 9.500c2-10 8-16.500 15-18.500 0 8.500-2.500 14.500-6.500 18.500z"
        fill="#ffffff"
      />
      <path
        d="M-11 9.500c2-12.500 9.500-20.500 17-22.500 0 10.500-3.500 17.500-8.500 22.500z"
        fill="#ffffff"
      />
      <path d="M4 9.500c2-9.500 7.500-15 13-17 0 7.500-2.500 13-6 17z" fill="#f1ece3" />
      <path
        d="M15 9.500c1.200-6 4.500-9.500 8.500-10.500 0 4.500-1.200 7.500-3.500 10.500z"
        fill="#ffffff"
      />
      <path
        d="M-23 9.500c2-10 8-16.500 15-18.500M-11 9.500c2-12.500 9.500-20.500 17-22.500M4 9.500c2-9.500 7.500-15 13-17"
        {...line}
        stroke="#c9d2dc"
        strokeWidth="0.900"
      />
      <Waves />
    </>
  ),
  uluru: (
    <>
      <Tile sky={DAWN} ground="#e3a36b" />
      <path
        d="M-28 14c0-9 6-16.500 14-18.500 8-2 20-2 28 0 8 2 14 9.500 14 18.500z"
        fill="#c8553a"
      />
      <path
        d="M-15-2.500v15M-5-5.500v18M7-5.500v18M17-2v14.500"
        {...line}
        stroke="#a9432c"
        strokeWidth="1.400"
      />
      <path
        d="M-25 21l1.800-4 1.800 4M21 23l1.800-4 1.800 4M-6 25l1.800-4 1.800 4"
        {...line}
        stroke="#8a8f4a"
        strokeWidth="1.300"
      />
    </>
  ),
};

export const LANDMARK_PICTURES: readonly string[] = Object.keys(DRAWINGS);

/** One of the famous places, as large as the box it is given. Nothing, for one there is no drawing of. */
export function LandmarkPicture({ id, className }: { id: string; className?: string }) {
  if (!Object.hasOwn(DRAWINGS, id)) return null;
  return (
    <svg
      className={className}
      viewBox="-34 -34 68 68"
      aria-hidden="true"
      focusable="false"
      data-landmark={id}
    >
      {DRAWINGS[id]}
    </svg>
  );
}
