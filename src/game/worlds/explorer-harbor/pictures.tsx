import type { ReactNode } from 'react';
import { PICTURES } from '@/art/pictures';

/**
 * Explorer Harbor's drawings: the pictures its little stories are told in, and the things that make something
 * happen. Hand-written SVG in the game's storybook manner. A picture that is part of a story is a small scene with
 * ground under it and sky over it; a thing that causes something (a ball, a wave) stands alone, like the things of
 * the picture kit.
 *
 * What each one shows, in words, is in the storybook (src/content/explorer-harbor/storybook.json); a test holds the two lists together.
 */

const INK = '#22304f';
const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const SKY = '#cfeaf7';
const GRASS = '#9fd48a';
const RED = '#ef5350';

/** Ground under a sky: what most story pictures are set in. */
function Ground({ sky = SKY, ground = GRASS }: { sky?: string; ground?: string }) {
  return (
    <>
      <rect x="-32" y="-32" width="64" height="64" rx="9" fill={sky} />
      <path
        d="M-32 14c14-5 24-4 34-2s20 2 30-2v13a9 9 0 0 1-9 9h-46a9 9 0 0 1-9-9z"
        fill={ground}
      />
    </>
  );
}

/** The soil cut through, so that what is under the grass can be seen. */
function Soil() {
  return (
    <>
      <rect x="-32" y="-32" width="64" height="64" rx="9" fill={SKY} />
      <path d="M-32 4h64v19a9 9 0 0 1-9 9h-46a9 9 0 0 1-9-9z" fill="#9a6b45" />
      <path d="M-32 4h64v5c-10 3-22-2-32 0s-22 3-32 0z" fill={GRASS} />
      <circle cx="-21" cy="23" r="2.200" fill="#b98a61" />
      <circle cx="20" cy="17" r="1.800" fill="#b98a61" />
      <circle cx="13" cy="27" r="2.400" fill="#b98a61" />
      <circle cx="-13" cy="15" r="1.400" fill="#b98a61" />
    </>
  );
}

function Seed() {
  return (
    <g transform="translate(0 19) rotate(-14)">
      <ellipse rx="6" ry="4.200" fill="#3b3140" />
      <path
        d="M-3-1.500c2-1 4-1 6 0M-2.500 1.500c2 1 3.500 1 5 0"
        {...line}
        stroke="#f4efe4"
        strokeWidth="1.400"
      />
    </g>
  );
}

/** Snow on the ground and in the air. */
function Snowy() {
  return (
    <>
      <Ground sky="#bcdaf0" ground="#f4f9fe" />
      <g fill="#ffffff">
        <circle cx="-22" cy="-20" r="1.700" />
        <circle cx="-8" cy="-26" r="1.400" />
        <circle cx="21" cy="-22" r="1.700" />
        <circle cx="25" cy="-6" r="1.400" />
        <circle cx="-25" cy="-4" r="1.400" />
        <circle cx="10" cy="-27" r="1.200" />
      </g>
    </>
  );
}

function Snowball({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="#ffffff" />
      <path
        d={`M${String(cx - r * 0.7)} ${String(cy + r * 0.45)}a${String(r)} ${String(r)} 0 0 0 ${String(r * 1.5)} ${String(r * 0.15)}`}
        {...line}
        stroke="#d3e4f1"
        strokeWidth="2.400"
      />
    </>
  );
}

function Hat() {
  return (
    <>
      <rect x="-6.500" y="-10" width="13" height="10" rx="2" fill="#e0624d" />
      <rect x="-9.500" y="-1.500" width="19" height="3.400" rx="1.700" fill="#c94f3b" />
      <rect x="-6.500" y="-4.500" width="13" height="2.400" fill="#ffd35c" />
    </>
  );
}

/** A room: a warm wall and a floor. */
function Room() {
  return (
    <>
      <rect x="-32" y="-32" width="64" height="64" rx="9" fill="#fde9c9" />
      <path d="M-32 14h64v9a9 9 0 0 1-9 9h-46a9 9 0 0 1-9-9z" fill="#d9b98a" />
      <path d="M-32 14h64" {...line} stroke="#c9a674" strokeWidth="1.600" />
    </>
  );
}

const BLOCKS = [RED, '#4f8fe0', '#ffd35c', '#5fbf64'] as const;

function Block({ colour }: { colour: string }) {
  return (
    <>
      <rect x="-5.500" y="-5.500" width="11" height="11" rx="2" fill={colour} />
      <path d="M-3-2.500v-1h4" {...line} stroke="#ffffff" strokeWidth="1.400" opacity="0.7" />
    </>
  );
}

/** A beach: sky, a band of sea, and sand. */
function Beach() {
  return (
    <>
      <rect x="-32" y="-32" width="64" height="64" rx="9" fill={SKY} />
      <path d="M-32-4h64v14h-64z" fill="#6fc0e0" />
      <path
        d="M-30 1c4-2 7 2 11 0M4-1c4-2 7 2 11 0"
        {...line}
        stroke="#b9e3f3"
        strokeWidth="1.600"
      />
      <path
        d="M-32 8c12-3 22 2 32 0s20-3 32 0v15a9 9 0 0 1-9 9h-46a9 9 0 0 1-9-9z"
        fill="#f3dfa6"
      />
    </>
  );
}

/** A path running away over the grass. */
function Path({ sky = SKY }: { sky?: string }) {
  return (
    <>
      <Ground sky={sky} />
      <path d="M-17 32c2-8 8-14 15-20h7c-4 6-6 12-6 20z" fill="#ecd9a5" />
      <path
        d="M-24 22l2-4 2 4M22 20l2-4 2 4M16 27l2-4 2 4"
        {...line}
        stroke="#6fb866"
        strokeWidth="1.800"
      />
    </>
  );
}

function Cloud({ fill }: { fill: string }) {
  return (
    <g transform="translate(0 -11)">
      <path d="M-18 4c-10 0-12-14-2-16 0-12 18-14 22-4 8-6 20 0 16 10 8 2 6 10-2 10z" fill={fill} />
      <path d="M-10-10c2-6 8-8 12-6" {...line} stroke="#ffffff" strokeWidth="2.600" opacity="0.5" />
    </g>
  );
}

function Nest() {
  return (
    <>
      <path d="M-24 8c0 12 10 17 24 17s24-5 24-17c-10 5-38 5-48 0z" fill="#b07a45" />
      <path
        d="M-19 13c7 5 12 0 19 5s12-2 17 0M-13 20c7 3 17 3 25 0"
        {...line}
        stroke="#7a5236"
        strokeWidth="2.200"
      />
    </>
  );
}

function Leaf() {
  return (
    <>
      <path d="M-28 12c8-18 34-24 56-12-8 18-36 24-56 12z" fill="#5fbf64" />
      <path d="M-26 11c16-4 34-8 52-10" {...line} stroke="#2f8440" strokeWidth="2" />
    </>
  );
}

function Cheese({ nibbled }: { nibbled: boolean }) {
  return (
    <>
      <Room />
      <ellipse cx="0" cy="21" rx="27" ry="5" fill="#ffffff" />
      <ellipse cx="0" cy="20" rx="27" ry="5" fill="#f1f4f9" />
      {nibbled ? (
        <>
          <path d="M-22 4l22-12 5 6a5 5 0 0 0-1 6z" fill="#ffe08a" />
          <path
            d="M-22 4h26a5.500 5.500 0 0 0 3 7.500 5.500 5.500 0 0 0-5 7.500h-24z"
            fill="#ffd35c"
          />
          <circle cx="12" cy="18" r="1.700" fill="#ffd35c" />
          <circle cx="18" cy="15" r="1.400" fill="#ffd35c" />
          <circle cx="16" cy="20.500" r="1.200" fill="#ffd35c" />
          <circle cx="22" cy="19" r="1" fill="#ffd35c" />
        </>
      ) : (
        <>
          <path d="M-22 4l22-12 22 12z" fill="#ffe08a" />
          <path d="M-22 4h44v15h-44z" fill="#ffd35c" />
          <circle cx="13" cy="11" r="2.600" fill="#f0b93a" />
        </>
      )}
      <circle cx="-12" cy="11" r="3.400" fill="#f0b93a" />
      <circle cx="0" cy="14" r="2.200" fill="#f0b93a" />
      <circle cx="-3" cy="7" r="1.600" fill="#f0b93a" />
    </>
  );
}

/** A kite: a red diamond with its two sticks and a tail of bows. */
function Kite() {
  return (
    <>
      <path d="M0-17l12 13-12 21-12-21z" fill={RED} />
      <path d="M0-17v34M-12-4h24" {...line} stroke="#b93a37" strokeWidth="1.600" />
    </>
  );
}

const DRAWINGS: Record<string, ReactNode> = {
  // ---- A seed grows ---------------------------------------------------------------------------------------------
  seed1: (
    <>
      <Soil />
      <Seed />
    </>
  ),
  seed2: (
    <>
      <Soil />
      <path d="M0 22c-1 3 1.500 5 0 9" {...line} stroke="#ead9b6" strokeWidth="1.800" />
      <path d="M0 16V-5" {...line} stroke="#4fae5a" strokeWidth="3" />
      <path d="M0-5c-8 0-12-4-13-11 8 0 12 4 13 11z" fill="#5fbf64" />
      <path d="M0-5c8 0 12-4 13-11-8 0-12 4-13 11z" fill="#74cc72" />
      <Seed />
    </>
  ),
  seed3: (
    <>
      <Soil />
      <path
        d="M0 14c-1 5 1 8 0 16M0 17c-4 3-7 4-10 9M0 17c4 3 7 5 10 8"
        {...line}
        stroke="#ead9b6"
        strokeWidth="1.800"
      />
      <path d="M0 15V-12" {...line} stroke="#4fae5a" strokeWidth="3" />
      <path d="M0 4c-8 0-12-3-14-9 8-1 12 2 14 9z" fill="#5fbf64" />
      <path d="M0-1c8 0 12-3 14-9-8-1-12 2-14 9z" fill="#74cc72" />
      <g transform="translate(0 -17)" fill="#ff8fab">
        <circle cx="0" cy="-7" r="5" />
        <circle cx="6.600" cy="-2.200" r="5" />
        <circle cx="4.100" cy="5.700" r="5" />
        <circle cx="-4.100" cy="5.700" r="5" />
        <circle cx="-6.600" cy="-2.200" r="5" />
        <circle r="4.600" fill="#ffd35c" />
      </g>
    </>
  ),

  // ---- A hen and her egg ----------------------------------------------------------------------------------------
  egg1: (
    <>
      <Ground />
      <path d="M-17-3c-7-4-9-11-6-17 6 2 10 7 11 13z" fill="#f4e3c2" />
      <ellipse cx="-2" cy="1" rx="18" ry="14" fill="#fff6e6" />
      <circle cx="13" cy="-13" r="8.500" fill="#fff6e6" />
      <path d="M8-22c0-5 4-5 4-1 0-5 5-5 5 0 2-3 5 0 2 3z" fill={RED} />
      <path d="M20.500-13.500l7.500 3-7.500 3z" fill="#f5a623" />
      <circle cx="15" cy="-14.500" r="1.600" fill={INK} />
      <path d="M-11 0c4 6 12 6 16 0" {...line} stroke="#e6d2ac" strokeWidth="2.400" />
      <Nest />
    </>
  ),
  egg2: (
    <>
      <Ground />
      <path d="M0-24c9 0 15 13 15 23 0 10-7 17-15 17s-15-7-15-17c0-10 6-23 15-23z" fill="#f7e3bd" />
      <path d="M-6-15c1.500-4 4-6 7-7" {...line} stroke="#fff6e6" strokeWidth="3" />
      <path d="M-14-3l5-4 4 5 5-6 4 6 5-5 4 3" {...line} stroke={INK} strokeWidth="1.800" />
      <path d="M-1-9l5-6 4 6-4 4z" fill="#3b3140" />
      <path d="M2-9l4-2.500v5z" fill="#f5a623" />
      <path d="M17-20l4-4M21-13h5M12-26l1-5" {...line} stroke="#f5a623" strokeWidth="2" />
      <Nest />
    </>
  ),
  egg3: (
    <>
      <Ground />
      <path d="M-25 9l3-9 4 5 4-7 3 6 2 5z" fill="#f7e3bd" />
      <path d="M25 9l-3-9-4 5-4-7-3 6-2 5z" fill="#f7e3bd" />
      <ellipse cx="0" cy="0" rx="11" ry="10.500" fill="#ffd95e" />
      <circle cx="0" cy="-14" r="8" fill="#ffd95e" />
      <path d="M-1-22c-1-3 0-5 1-6 1 2 2 4 1 6z" fill="#f2b632" />
      <path d="M7-15l6.500 2-6.500 2.500z" fill="#f5a623" />
      <circle cx="3" cy="-16" r="1.500" fill={INK} />
      <path d="M-7-1c2 4 6 4 8 0" {...line} stroke="#f2b632" strokeWidth="2.200" />
      <Nest />
    </>
  ),

  // ---- A snowman ------------------------------------------------------------------------------------------------
  snow1: (
    <>
      <Snowy />
      <ellipse cx="-7" cy="23" rx="15" ry="3.400" fill="#d3e4f1" />
      <ellipse cx="16" cy="24" rx="9" ry="2.600" fill="#d3e4f1" />
      <Snowball cx={-8} cy={9} r={14} />
      <Snowball cx={15} cy={15} r={8.5} />
    </>
  ),
  snow2: (
    <>
      <Snowy />
      <path
        d="M-11 6l-11-9M11 6l11-9M-22-3l-1-5M22-3l1-5"
        {...line}
        stroke="#7a5236"
        strokeWidth="2.200"
      />
      <ellipse cx="0" cy="25" rx="14" ry="3.200" fill="#d3e4f1" />
      <Snowball cx={0} cy={12} r={13} />
      <Snowball cx={0} cy={-7} r={9.5} />
      <circle cx="-3.200" cy="-9.500" r="1.400" fill={INK} />
      <circle cx="3.200" cy="-9.500" r="1.400" fill={INK} />
      <path d="M0-7l8.500 2-8.500 2z" fill="#f5a623" />
      <circle cx="0" cy="7" r="1.400" fill={INK} />
      <circle cx="0" cy="13" r="1.400" fill={INK} />
      <g transform="translate(0 -16)">
        <Hat />
      </g>
    </>
  ),
  snow3: (
    <>
      <Ground />
      <ellipse cx="-22" cy="24" rx="6" ry="2.600" fill="#f4f9fe" />
      <ellipse cx="23" cy="15" rx="5" ry="2.200" fill="#f4f9fe" />
      <ellipse cx="0" cy="19" rx="23" ry="7.500" fill="#a8d9ef" />
      <path d="M-13 17c5-2 10-2 14-1" {...line} stroke="#d8f0fa" strokeWidth="2" />
      <path d="M-20 20l-9-5M14 24l11 2" {...line} stroke="#7a5236" strokeWidth="2.200" />
      <path d="M5 19l9.500 1.500-9 2.500z" fill="#f5a623" />
      <g transform="translate(-5 14) rotate(-14)">
        <Hat />
      </g>
    </>
  ),

  // ---- A balloon ------------------------------------------------------------------------------------------------
  balloon1: (
    <>
      <Ground />
      <path d="M-15 21c1-6 10-9 17-6 5 2 7 5 6 8-7 3-19 3-23-2z" fill="#e0524a" />
      <path d="M-9 19c3-2 7-2 10-1" {...line} stroke="#f08b84" strokeWidth="1.800" />
      <path d="M8 22l5-1-1 4z" fill="#c9403a" />
      <path d="M12 23c4 3 7-2 11 1s2 5 6 4" {...line} stroke={INK} strokeWidth="1.400" />
    </>
  ),
  balloon2: (
    <>
      <Ground />
      <path d="M0 12c-3 5 3 9 0 16" {...line} stroke={INK} strokeWidth="1.400" />
      <ellipse cx="0" cy="-9" rx="16" ry="19" fill={RED} />
      <path d="M-3 9l3-3 3 3-3 3z" fill="#c9403a" />
      <path d="M-8-19c2-4 5-6 9-7" {...line} stroke="#ff9f9a" strokeWidth="3" />
    </>
  ),
  balloon3: (
    <>
      <Ground />
      <path
        d="M0-27v6M0 3v6M-19-9h6M13-9h6M-13-22l4 4M9-4l4 4M-13 4l4-4M9-14l4-4"
        {...line}
        stroke="#f5a623"
        strokeWidth="2.600"
      />
      <path d="M-25-20l8 2-5 6z" fill={RED} />
      <path d="M24-22l-7 4 6 4z" fill={RED} />
      <path d="M-24 4l7-3-1 8z" fill="#e0524a" />
      <path d="M22 2l-8-1 4 7z" fill="#e0524a" />
      <path d="M0 13c-3 4 3 8 0 14" {...line} stroke={INK} strokeWidth="1.400" />
      <path d="M-4 12c1-4 6-5 8-1l-3 4z" fill="#c9403a" />
    </>
  ),

  // ---- A tower of blocks ----------------------------------------------------------------------------------------
  tower1: (
    <>
      <Room />
      <g transform="translate(0 16)">
        <Block colour={BLOCKS[0]} />
      </g>
    </>
  ),
  tower2: (
    <>
      <Room />
      {BLOCKS.map((colour, index) => (
        <g
          key={colour}
          transform={`translate(${String(index % 2 === 0 ? 0 : 1)} ${String(16 - index * 11)})`}
        >
          <Block colour={colour} />
        </g>
      ))}
    </>
  ),
  tower3: (
    <>
      <Room />
      <g transform="translate(-19 15) rotate(-20)">
        <Block colour={BLOCKS[1]} />
      </g>
      <g transform="translate(-5 17) rotate(27)">
        <Block colour={BLOCKS[0]} />
      </g>
      <g transform="translate(7 9) rotate(-38)">
        <Block colour={BLOCKS[3]} />
      </g>
      <g transform="translate(20 18) rotate(14)">
        <Block colour={BLOCKS[2]} />
      </g>
      <path d="M-27 3l3 4M26 2l-3 4M-2-4v5" {...line} stroke="#c9a674" strokeWidth="1.800" />
    </>
  ),

  // ---- A sandcastle ---------------------------------------------------------------------------------------------
  castle1: (
    <>
      <Beach />
      <path d="M0 24c2-9 7-13 12-13s10 4 12 13z" fill="#e3c67e" />
      <path d="M-24 10h16l-2.500 14h-11z" fill="#e0524a" />
      <rect x="-25.500" y="8" width="19" height="3.400" rx="1.700" fill="#c9403a" />
      <path d="M-24 9c2-9 14-9 16 0" {...line} stroke="#8792ac" strokeWidth="1.800" />
      <path d="M-2 26L4 9" {...line} stroke="#a86a2e" strokeWidth="2.400" />
      <path d="M1 6l6 2-2 7c-3 1-6 0-6-2z" fill="#4f8fe0" />
    </>
  ),
  castle2: (
    <>
      <Beach />
      <path d="M0-12v-13" {...line} stroke="#a86a2e" strokeWidth="1.800" />
      <path d="M0-25l9 3-9 3.500z" fill={RED} />
      <path d="M-7 6v-18h4v3h6v-3h4v18z" fill="#f0d898" />
      <path d="M-19 24V5h6v4h6V5h14v4h6V5h6v19z" fill="#e3c67e" />
      <path d="M-4 24v-8a4 4 0 0 1 8 0v8z" fill="#c2a156" />
      <path d="M-14 15h3M11 14h3M-1-4h2" {...line} stroke="#c2a156" strokeWidth="1.800" />
    </>
  ),
  castle3: (
    <>
      <Beach />
      <ellipse cx="0" cy="22" rx="27" ry="7" fill="#d9bd76" />
      <path d="M-18 23c4-6 10-8 18-8s14 2 18 8z" fill="#c9ab60" />
      <path
        d="M-30 13c5-2 8 2 13 0s8-2 13 0 8 2 13 0 8-2 12 0"
        {...line}
        stroke="#ffffff"
        strokeWidth="2.200"
      />
      <path d="M-3 17l15-5" {...line} stroke="#a86a2e" strokeWidth="1.800" />
      <path d="M12 12l5 6-9 0z" fill={RED} />
    </>
  ),

  // ---- Rain -----------------------------------------------------------------------------------------------------
  path: (
    <>
      <Path />
      <path d="M-22-18c3-3 8-3 10 0 4-1 7 2 6 5h-17c-3 0-3-5 1-5z" fill="#ffffff" opacity="0.85" />
    </>
  ),
  rain1: (
    <>
      <Path sky="#c2d2df" />
      <Cloud fill="#8f9db3" />
    </>
  ),
  rain2: (
    <>
      <Path sky="#c2d2df" />
      <path
        d="M-15-2l-3.500 10M-4-2l-3.500 10M7-2l-3.500 10M18-2l-3.500 10M-10 13l-3 9M2 13l-3 9M14 13l-3 9"
        {...line}
        stroke="#3fa9c9"
        strokeWidth="3"
      />
      <Cloud fill="#8f9db3" />
    </>
  ),
  rain3: (
    <>
      <Path />
      <ellipse cx="-4" cy="23" rx="15" ry="5.500" fill="#7fc8e8" />
      <path d="M-13 22c4-2 8-2 11-1" {...line} stroke="#d8f0fa" strokeWidth="1.800" />
      <path d="M17 12c-2 3-2 5 0 5s2-2 0-5zM-24 9c-2 3-2 5 0 5s2-2 0-5z" fill="#7fc8e8" />
    </>
  ),

  // ---- A caterpillar --------------------------------------------------------------------------------------------
  fly1: (
    <>
      <Ground />
      <Leaf />
      <circle cx="-17" cy="5" r="4" fill={SKY} />
      <g fill="#b6dd52">
        <circle cx="-9" cy="-1" r="5" />
        <circle cx="5" cy="-5" r="5" />
      </g>
      <g fill="#93c93f">
        <circle cx="-2" cy="-3.500" r="5" />
        <circle cx="12" cy="-6" r="5" />
      </g>
      <circle cx="19" cy="-8" r="6" fill="#b6dd52" />
      <circle cx="21" cy="-9.500" r="1.400" fill={INK} />
      <path d="M17-13l-2-5M21-14l1-5" {...line} stroke={INK} strokeWidth="1.400" />
      <path d="M20-5.500c1 1 2 1 3 0" {...line} stroke={INK} strokeWidth="1.200" />
    </>
  ),
  fly2: (
    <>
      <Ground />
      <path d="M-30-21c14 4 34 3 60-2" {...line} stroke="#8a5f3f" strokeWidth="4" />
      <path d="M-18-19c-2-7 3-11 9-11 1 6-3 10-9 11z" fill="#5fbf64" />
      <path d="M0-20v5" {...line} stroke="#8a5f3f" strokeWidth="1.800" />
      <path d="M0-16c8 3 10 15 6 26-2 5-4 8-6 9-2-1-4-4-6-9-4-11-2-23 6-26z" fill="#a9bb5e" />
      <path
        d="M-6-5c4 2 8 2 12 0M-6 3c4 2 8 2 12 0M-4 11c3 1.500 5 1.500 8 0"
        {...line}
        stroke="#7e9140"
        strokeWidth="1.800"
      />
    </>
  ),
  fly3: (
    <>
      <Ground />
      <path d="M0-3c-6-17-25-19-27-6-1 9 9 14 27 10z" fill="#f5a623" />
      <path d="M0-3c6-17 25-19 27-6 1 9-9 14-27 10z" fill="#f5a623" />
      <path d="M0 2c-11 0-21 4-19 14 2 8 15 6 19-9z" fill="#ffca61" />
      <path d="M0 2c11 0 21 4 19 14-2 8-15 6-19-9z" fill="#ffca61" />
      <circle cx="-16" cy="-7" r="3.400" fill="#fff1c9" />
      <circle cx="16" cy="-7" r="3.400" fill="#fff1c9" />
      <circle cx="-11" cy="12" r="2.600" fill="#f5a623" />
      <circle cx="11" cy="12" r="2.600" fill="#f5a623" />
      <path d="M-1-9c-2-5-5-8-8-9M1-9c2-5 5-8 8-9" {...line} stroke="#5b4636" strokeWidth="1.600" />
      <ellipse cx="0" cy="1" rx="2.600" ry="11" fill="#5b4636" />
    </>
  ),

  // ---- A kite ---------------------------------------------------------------------------------------------------
  kite1: (
    <>
      <Ground />
      <ellipse cx="-5" cy="22" rx="21" ry="5" fill="#6fb866" opacity="0.5" />
      <g transform="translate(-6 19) scale(1.3 0.6) rotate(-68)">
        <Kite />
      </g>
      <path d="M13 23c4 3 6-2 9 1s3 4 7 3" {...line} stroke={INK} strokeWidth="1.400" />
      <path d="M17 22l2 4M24 24l2 4" {...line} stroke="#ffd35c" strokeWidth="2.600" />
    </>
  ),
  kite2: (
    <>
      <Ground />
      <path d="M2-6C-8 6-18 18-26 30" {...line} stroke={INK} strokeWidth="1.200" />
      <path d="M12 5c6 4 0 9 6 13s2 7 6 9" {...line} stroke={INK} strokeWidth="1.400" />
      <path d="M12 9l5 2M15 18l5-1" {...line} stroke="#ffd35c" strokeWidth="2.800" />
      <g transform="translate(4 -9) rotate(22)">
        <Kite />
      </g>
    </>
  ),

  // ---- Cheese ---------------------------------------------------------------------------------------------------
  cheese1: <Cheese nibbled={false} />,
  cheese2: <Cheese nibbled />,

  // ---- Things that make something happen ------------------------------------------------------------------------
  sun: PICTURES.sun.draw,
  pin: PICTURES.pin.draw,
  rain: PICTURES.rain.draw,
  ball: (
    <>
      <ellipse cy="26" rx="17" ry="3.500" fill={INK} opacity="0.08" />
      <circle r="20" fill="#4f8fe0" />
      <path d="M-19-6c12-6 26-6 38 0v12c-12-6-26-6-38 0z" fill="#ffffff" />
      <path d="M-8-14c2-3 5-4 8-4" {...line} stroke="#a9cbf5" strokeWidth="3" />
    </>
  ),
  wateringcan: (
    <>
      <ellipse cy="27" rx="20" ry="3.500" fill={INK} opacity="0.08" />
      <path d="M-14 2c-12 0-12 18 0 18" {...line} stroke="#3f9a4b" strokeWidth="4" />
      <path d="M4 6l18-14 4 5-16 15z" fill="#3f9a4b" />
      <rect x="-16" y="-6" width="24" height="30" rx="4" fill="#4fae5a" />
      <path d="M-16 0h24" {...line} stroke="#3f9a4b" strokeWidth="2.400" />
      <ellipse cx="25" cy="-6" rx="4" ry="6" transform="rotate(38 25 -6)" fill="#2f8440" />
      <path
        d="M29 0c-1.500 2.500-1.500 4 0 4s1.500-1.500 0-4zM33 7c-1.500 2.500-1.500 4 0 4s1.500-1.500 0-4zM26 9c-1.500 2.500-1.500 4 0 4s1.500-1.500 0-4z"
        fill="#3fa9c9"
        transform="translate(-3 2)"
      />
    </>
  ),
  wave: (
    <>
      <path
        d="M-30 22c0-26 14-40 31-40 13 0 22 9 22 19 0 7-5 12-11 12 4-5 2-11-4-13-11-3-20 7-20 22z"
        fill="#3f9fd4"
      />
      <path
        d="M-30 22c8-5 16-5 24 0s16 5 24 0 8-3 12-3v6c0 3-3 5-6 5h-48c-3 0-6-2-6-5z"
        fill="#62b8e4"
      />
      <path d="M-2-18c8-1 16 3 19 10" {...line} stroke="#ffffff" strokeWidth="4" />
      <circle cx="21" cy="-3" r="2.600" fill="#ffffff" />
      <circle cx="24" cy="5" r="1.800" fill="#ffffff" />
      <path d="M-22 6c3-10 9-17 16-20" {...line} stroke="#8fd0ee" strokeWidth="2.600" />
    </>
  ),
  mouse: (
    <>
      <ellipse cy="24" rx="20" ry="3.500" fill={INK} opacity="0.08" />
      <path d="M-20 12c-9 2-11-8-5-12" {...line} stroke="#f08fa0" strokeWidth="2.600" />
      <ellipse cx="-4" cy="10" rx="17" ry="12" fill="#b9c0cf" />
      <path d="M2 2c5-9 16-8 21 1l7 8c-3 5-10 8-18 8z" fill="#b9c0cf" />
      <circle cx="6" cy="-5" r="8" fill="#b9c0cf" />
      <circle cx="6" cy="-5" r="4.600" fill="#f4b6c2" />
      <circle cx="19" cy="5" r="1.800" fill={INK} />
      <circle cx="30" cy="11.500" r="2.200" fill="#f08fa0" />
      <path d="M24 13l7 4M24 15l5 6" {...line} stroke="#8792ac" strokeWidth="1.200" />
      <path d="M-10 21h6M4 21h6" {...line} stroke="#f08fa0" strokeWidth="2.600" />
    </>
  ),
  wind: (
    <>
      <path
        d="M-28-10h30a8 8 0 1 0-8-8M-28 3h44a7.500 7.500 0 1 1-7.500 7.500M-20 16h18a6 6 0 1 1-6 6"
        {...line}
        stroke="#6fb3d9"
        strokeWidth="4.400"
      />
      <path d="M20-22c4-4 9-3 11 1-4 4-9 3-11-1z" fill="#5fbf64" />
      <path d="M24 20c0-5 4-8 8-7 0 5-4 8-8 7z" fill="#93c93f" />
    </>
  ),
};

export function isStoryPicture(id: string): boolean {
  return Object.hasOwn(DRAWINGS, id);
}

export const STORY_PICTURES: readonly string[] = Object.keys(DRAWINGS);

/** One of this world's drawings, as large as the box it is given. Nothing, for one it does not have. */
export function StoryPicture({ id, className }: { id: string; className?: string }) {
  if (!isStoryPicture(id)) return null;
  return (
    <svg
      className={className}
      viewBox="-34 -34 68 68"
      aria-hidden="true"
      focusable="false"
      data-picture={id}
    >
      {DRAWINGS[id]}
    </svg>
  );
}
