import type { CSSProperties, ReactNode } from 'react';
import { testSetup, type Setup } from '@/engine';
import {
  BALL,
  BEAM_STEP,
  DECK,
  FAR_BANK,
  GROUND,
  HELD,
  NEAR_BANK,
  PIVOT,
  POND,
  POND_FLOOR,
  RAMP_FOOT,
  RAMP_LENGTH,
  STREAM,
  SURFACE,
  TEST_TIME,
  TUB_FLOOR,
  balanceShape,
  boatShape,
  bow,
  bridgeShape,
  dropOf,
  rampShape,
  tipOf,
} from './geometry';
import styles from './inventor.module.css';

/**
 * Inventor Island's pictures: a set-up, the test of it, and how it turned out.
 *
 * Each is one drawing with three faces. `before` is the set-up as it stands. `testing` plays the test: the
 * traveller walks out, the ball rolls, the beam is let go. `after` is where it came to rest. What moves and how far
 * is worked out in geometry.ts from what the model says happened, and handed to the stylesheet as a few numbers;
 * the stylesheet does the moving. So a picture can never show something the model did not say.
 *
 * Drawn by hand in the game's own manner: flat shapes, soft colours, no outlines, a little shadow.
 */

export type Phase = 'before' | 'testing' | 'after';

const INK = '#22304f';
const WOOD = '#dba85c';
const WOOD_DEEP = '#b0763c';
const BARK = '#8a5f3f';
const EARTH = '#c98a4b';
const GRASS = '#6fcf74';
const GRASS_DEEP = '#2f8440';
const WATER = '#62b4f3';
const WATER_LIGHT = '#bfe2fb';
const SUN = '#ffcf4a';
const SUN_DEEP = '#e09a1f';
const STONE = '#9aa3b2';
const STONE_LIGHT = '#c7cdd8';
const BLUE = '#62b4f3';
const BLUE_DEEP = '#2a6fb5';
const ORANGE = '#ffb347';
const ORANGE_DEEP = '#d9822b';

interface Drawing {
  /** Numbers for the stylesheet: how far things move in this picture. */
  vars: Record<string, string>;
  body: ReactNode;
}

const px = (value: number) => `${String(Math.round(value * 100) / 100)}px`;
const deg = (value: number) => `${String(Math.round(value * 100) / 100)}deg`;

/** A little pebble, about ten across, with its middle at (0, 0). */
function Pebble({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${String(x)} ${String(y)})`}>
      <path d="M-5 1c0-3 2-5 5-5 3 0 5 2 5 4 0 3-2 4-5 4-3 0-5-1-5-3z" fill={STONE} />
      <path
        d="M-2-2c1-1 2-1 3-1"
        fill="none"
        stroke={STONE_LIGHT}
        strokeWidth="1.400"
        strokeLinecap="round"
      />
    </g>
  );
}

/** A flag on a pole: where the traveller, or the boat, is going. */
function Flag({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${String(x)} ${String(y)})`}>
      <path d="M0 0v-24" stroke={BARK} strokeWidth="2.400" strokeLinecap="round" />
      <path d="M1-24l12 4-12 5z" fill={SUN} />
    </g>
  );
}

/** A bank of earth with grass on top, from `from` to `to` across, its top at `top`. */
function Bank({ from, to, top, lean }: { from: number; to: number; top: number; lean: number }) {
  const inner = lean > 0 ? to : from;
  const outer = lean > 0 ? from : to;
  return (
    <>
      <path
        d={`M${String(outer)} ${String(top)}H${String(inner)}L${String(inner - lean * 5)} 120H${String(outer)}Z`}
        fill={EARTH}
      />
      <rect x={from} y={top - 2} width={to - from} height="7" rx="3.500" fill={GRASS} />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// The bridge
// ---------------------------------------------------------------------------------------------------------------------

/** Who has to cross. Each stands with its feet at (0, 0), looking the way it is going; the heavier, the bigger. */
const TRAVELLERS: Readonly<Record<string, ReactNode>> = {
  rabbit: (
    <>
      <ellipse cx="2" cy="-28" rx="2.200" ry="7" fill="#cfc6dc" transform="rotate(-8 2 -22)" />
      <ellipse cx="6" cy="-28" rx="2.200" ry="7" fill="#bdb2cf" transform="rotate(8 6 -22)" />
      <circle cx="-8" cy="-8" r="3" fill="#ffffff" />
      <ellipse cx="-1" cy="-8" rx="8" ry="7.500" fill="#cfc6dc" />
      <circle cx="5" cy="-17" r="6" fill="#cfc6dc" />
      <circle cx="7.500" cy="-18" r="1.300" fill={INK} />
      <circle cx="10.500" cy="-15.500" r="1.100" fill="#f4b6bf" />
      <ellipse cx="3" cy="-1" rx="4" ry="1.800" fill="#bdb2cf" />
    </>
  ),
  goat: (
    <>
      <path d="M-9-6v6M-4-6v6M4-6v6M9-6v6" stroke="#c9a877" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="-1" cy="-12" rx="12" ry="7.500" fill="#f0e2c4" />
      <path
        d="M-13-13c-3-1-4 1-3 3"
        fill="none"
        stroke="#f0e2c4"
        strokeWidth="2.600"
        strokeLinecap="round"
      />
      <path
        d="M9-27c-1-5-5-6-7-4M12-27c1-5 5-5 6-2"
        fill="none"
        stroke={BARK}
        strokeWidth="2.200"
        strokeLinecap="round"
      />
      <ellipse cx="11" cy="-20" rx="5.500" ry="6.500" fill="#f0e2c4" />
      <path d="M12-13l1 5 2-5z" fill="#c9a877" />
      <path d="M6-23l-4-2 3 5z" fill="#e2cfa6" />
      <circle cx="13" cy="-21" r="1.300" fill={INK} />
    </>
  ),
  bear: (
    <>
      <path
        d="M-11-5v5M-4-5v5M5-5v5M11-5v5"
        stroke="#7d553a"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <ellipse cx="-1" cy="-15" rx="16" ry="11.500" fill="#9a6b4b" />
      <circle cx="9" cy="-32" r="3.400" fill="#7d553a" />
      <circle cx="19" cy="-32" r="3.400" fill="#7d553a" />
      <circle cx="14" cy="-24" r="9" fill="#9a6b4b" />
      <ellipse cx="19" cy="-21.500" rx="4.400" ry="3.400" fill="#e1c19c" />
      <circle cx="21.500" cy="-22.500" r="1.500" fill={INK} />
      <circle cx="14" cy="-26.500" r="1.400" fill={INK} />
    </>
  ),
};

function bridge(setup: Setup): Drawing {
  const shape = bridgeShape(setup);
  const full = bow(shape.half, shape.dip);
  const settled = bow(shape.half, shape.dip * 0.55);
  const { thick } = shape;
  const middle = DECK + thick / 2;
  const first = shape.rests[1] ?? shape.far;
  return {
    vars: {
      '--far': px(shape.across),
      '--mid': px(shape.middle),
      '--dip': px(shape.dip),
      '--sag': deg(full.degrees),
      '--stretch': String(Math.round(full.stretch * 1000) / 1000),
      '--rest-dip': px(shape.dip * 0.55),
      '--rest-sag': deg(settled.degrees),
      '--rest-stretch': String(Math.round(settled.stretch * 1000) / 1000),
    },
    body: (
      <>
        <rect
          x={shape.near - 8}
          y={STREAM}
          width={shape.far - shape.near + 16}
          height={120 - STREAM}
          fill={WATER}
        />
        <path
          d={`M${String(shape.near + 6)} ${String(STREAM + 9)}q5-3 10 0t10 0M${String(shape.far - 30)} ${String(STREAM + 20)}q5-3 10 0t10 0`}
          fill="none"
          stroke={WATER_LIGHT}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <Bank from={0} to={shape.near} top={DECK} lean={1} />
        <Bank from={shape.far} to={200} top={DECK} lean={-1} />
        <Flag x={shape.far + 5} y={DECK} />
        {shape.posts.map((post) => (
          <g key={post}>
            <rect
              x={post - 3.5}
              y={DECK + thick}
              width="7"
              height={120 - DECK - thick}
              fill={BARK}
            />
            <rect x={post - 5} y={DECK + thick} width="10" height="3" rx="1.500" fill={WOOD_DEEP} />
          </g>
        ))}
        {/* The plank: its two ends lying on the banks, and a piece for each stretch between the rests. */}
        <rect
          x={shape.from}
          y={DECK}
          width={shape.near - shape.from}
          height={thick}
          rx="1.500"
          fill={WOOD}
        />
        <rect
          x={shape.far}
          y={DECK}
          width={shape.to - shape.far}
          height={thick}
          rx="1.500"
          fill={WOOD}
        />
        {shape.rests.slice(1, -1).map((from, index) => (
          <rect
            key={from}
            x={from}
            y={DECK}
            width={(shape.rests[index + 2] ?? shape.far) - from}
            height={thick}
            fill={WOOD}
          />
        ))}
        {/* The first stretch is in two halves, each hinged where it rests, so that it can bow. */}
        <g transform={`translate(${String(shape.near)} ${String(middle)})`}>
          <rect
            className={styles.bowNear}
            x="0"
            y={-thick / 2}
            width={shape.half}
            height={thick}
            fill={WOOD}
          />
        </g>
        <g transform={`translate(${String(first)} ${String(middle)})`}>
          <rect
            className={styles.bowFar}
            x={-shape.half}
            y={-thick / 2}
            width={shape.half}
            height={thick}
            fill={WOOD}
          />
        </g>
        <g transform={`translate(${String(shape.near + shape.half)} ${String(middle)})`}>
          <circle className={styles.joint} r={thick / 2} fill={WOOD} />
        </g>
        <path
          d={`M${String(shape.from + 2)} ${String(DECK + 1)}H${String(shape.near)}M${String(shape.far)} ${String(DECK + 1)}H${String(shape.to - 2)}`}
          stroke="#f0c98a"
          strokeWidth="1.400"
          strokeLinecap="round"
        />
        <g transform={`translate(${String(shape.wait)} ${String(DECK)})`}>
          <g className={styles.walker}>
            <g className={styles.hop}>
              <ellipse cx="0" cy="0.500" rx="9" ry="2" fill={INK} opacity="0.12" />
              {TRAVELLERS[String(setup.traveller)]}
            </g>
          </g>
        </g>
      </>
    ),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The ramp
// ---------------------------------------------------------------------------------------------------------------------

/** A five-pointed star about (0, 0), seven from its middle to each point. */
const STAR = Array.from({ length: 10 }, (_, corner) => {
  const reach = corner % 2 === 0 ? 7 : 3;
  const turn = (Math.PI / 5) * corner - Math.PI / 2;
  return `${(reach * Math.cos(turn)).toFixed(2)},${(reach * Math.sin(turn)).toFixed(2)}`;
}).join(' ');

function ramp(setup: Setup, outcome: string | null): Drawing {
  const shape = rampShape(setup, outcome);
  const rough = setup.surface === 'rough';
  const lengths = [0, 1, 2, 3, 4, 5, 6];
  return {
    vars: {
      '--fx': px(shape.toFoot[0]),
      '--fy': px(shape.toFoot[1]),
      '--rx': px(shape.toRest),
      '--spin': deg(shape.turns * 360),
    },
    body: (
      <>
        <rect x="0" y={GROUND} width="200" height={120 - GROUND} fill={rough ? GRASS : '#e9c58a'} />
        {rough ? (
          // Rough ground: grass, with tufts standing up along it.
          <path
            d={lengths
              .flatMap((length) =>
                [5, 14].map((offset) => RAMP_FOOT + RAMP_LENGTH * length + offset),
              )
              .filter((x) => x < 198)
              .map((x) => `M${String(x - 3)} ${String(GROUND + 1)}l1.500-4 1.500 4 1.500-5 1.500 5`)
              .join('')}
            fill="none"
            stroke={GRASS_DEEP}
            strokeWidth="1.600"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          // Smooth ground: boards, laid end to end.
          <path d={`M0 ${String(GROUND + 1)}H200`} stroke="#f6dcae" strokeWidth="2" />
        )}
        {/* The ground is marked off in equal lengths, so that how far is something that can be seen. */}
        <path
          d={lengths
            .map((length) => `M${String(RAMP_FOOT + RAMP_LENGTH * length)} ${String(GROUND + 5)}v9`)
            .join('')}
          stroke={rough ? GRASS_DEEP : WOOD_DEEP}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d={`M4 ${String(GROUND)}V${String(GROUND - shape.rise)}H13L${String(RAMP_FOOT)} ${String(GROUND)}Z`}
          fill="#ffc45a"
        />
        <path
          d={`M13 ${String(GROUND - shape.rise)}L${String(RAMP_FOOT)} ${String(GROUND)}`}
          stroke="#a86a00"
          strokeWidth="2.400"
          strokeLinecap="round"
        />
        <path
          d={`M9 ${String(GROUND)}V${String(GROUND - shape.rise + 4)}`}
          stroke="#e0a53c"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* The star: a mat on the ground to stop on, and a star on a stick so that it shows from anywhere. */}
        <ellipse cx={shape.star} cy={GROUND + 1.5} rx="10" ry="3" fill={SUN} />
        <g transform={`translate(${String(shape.star)} ${String(GROUND)})`}>
          <g className={styles.star}>
            <path d="M0 0v-27" stroke={SUN_DEEP} strokeWidth="2" strokeLinecap="round" />
            <polygon
              points={STAR}
              transform="translate(0 -32)"
              fill={SUN}
              stroke={SUN_DEEP}
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </g>
        </g>
        <g transform={`translate(${String(shape.top[0])} ${String(shape.top[1])})`}>
          <g className={styles.ball}>
            <g className={styles.spin}>
              <circle r={BALL} fill="#ef5350" />
              <path
                d="M-2.500-3.200a4 4 0 0 1 4-1"
                fill="none"
                stroke="#ff9f9a"
                strokeWidth="1.800"
                strokeLinecap="round"
              />
            </g>
          </g>
        </g>
      </>
    ),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The balance
// ---------------------------------------------------------------------------------------------------------------------

function stack(at: number, blocks: number, fill: string, edge: string): ReactNode {
  return Array.from({ length: blocks }, (_, level) => (
    <g key={level}>
      <rect
        x={at - 8}
        y={-6 - 12 * (level + 1) + 1}
        width="16"
        height="11"
        rx="2.500"
        fill={fill}
      />
      <path
        d={`M${String(at - 5)} ${String(-6 - 12 * (level + 1) + 4)}h6`}
        stroke={edge}
        strokeWidth="1.600"
        strokeLinecap="round"
        opacity="0.55"
      />
    </g>
  ));
}

function balance(setup: Setup, outcome: string | null): Drawing {
  const shape = balanceShape(setup);
  const [pivotX, pivotY] = PIVOT;
  return {
    vars: { '--tip': deg(tipOf(outcome ?? 'balanced')) },
    body: (
      <>
        <rect x="0" y="104" width="200" height="16" fill="#f1dcae" />
        <ellipse cx={pivotX} cy="105" rx="30" ry="3" fill={INK} opacity="0.1" />
        {/* Two stands hold the beam level until it is let go. */}
        {[pivotX - 78, pivotX + 78].map((x) => (
          <g key={x} className={styles.prop}>
            <rect
              x={x - 2.5}
              y={pivotY + 3}
              width="5"
              height={104 - pivotY - 3}
              rx="2"
              fill="#b9c8ff"
            />
            <path
              d={`M${String(x - 6)} ${String(pivotY + 1)}q6 5 12 0`}
              fill="none"
              stroke="#8fa2ee"
              strokeWidth="2.400"
              strokeLinecap="round"
            />
          </g>
        ))}
        <path d={`M${String(pivotX)} ${String(pivotY + 1)}l-14 33h28z`} fill={BARK} />
        <path
          d={`M${String(pivotX - 4)} ${String(pivotY + 12)}l-6 16`}
          stroke="#a57a57"
          strokeWidth="2.400"
          strokeLinecap="round"
        />
        <g transform={`translate(${String(pivotX)} ${String(pivotY)})`}>
          <g className={styles.beam}>
            <rect x="-88" y="-6" width="176" height="6" rx="3" fill={WOOD} />
            {/* A notch at every place a stack can stand, the same on both sides. */}
            <path
              d={[-3, -2, -1, 1, 2, 3].map((step) => `M${String(step * BEAM_STEP)}-6v6`).join('')}
              stroke={WOOD_DEEP}
              strokeWidth="1.600"
              opacity="0.7"
            />
            {stack(shape.left.at, shape.left.blocks, BLUE, BLUE_DEEP)}
            {stack(shape.right.at, shape.right.blocks, ORANGE, ORANGE_DEEP)}
          </g>
        </g>
      </>
    ),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The tub, and things dropped in it
// ---------------------------------------------------------------------------------------------------------------------

/** Things to drop. Each is drawn about (0, 0), to the size geometry.ts says it is. */
const THINGS: Readonly<Record<string, ReactNode>> = {
  log: (
    <>
      <rect x="-30" y="-11" width="60" height="22" rx="11" fill={WOOD_DEEP} />
      <path
        d="M-22-4h20M-16 4h26"
        stroke={BARK}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <ellipse cx="22" cy="0" rx="7" ry="10" fill="#e2b77e" />
      <ellipse
        cx="22"
        cy="0"
        rx="3.500"
        ry="5"
        fill="none"
        stroke={WOOD_DEEP}
        strokeWidth="1.600"
      />
    </>
  ),
  ball: (
    <>
      <circle r="16" fill="#ffffff" />
      <path d="M0-16C-12-9-12 9 0 16C-5 7-5-7 0-16z" fill="#ef5350" />
      <path d="M0-16C12-9 12 9 0 16C5 7 5-7 0-16z" fill={BLUE} />
      <path d="M0-16C-5-7-5 7 0 16C5 7 5-7 0-16z" fill={SUN} />
      <circle r="16" fill="none" stroke={INK} strokeWidth="1" opacity="0.12" />
    </>
  ),
  cork: (
    <>
      <path d="M-6-8h12l2 16h-16z" fill="#e0b98a" />
      <path
        d="M-3-3h2M2 1h2M-2 4h1.500"
        stroke="#b98d5c"
        strokeWidth="1.600"
        strokeLinecap="round"
      />
    </>
  ),
  'wooden-spoon': (
    <>
      <rect x="-23" y="-2.200" width="30" height="4.400" rx="2.200" fill={WOOD} />
      <ellipse cx="13" cy="0" rx="10" ry="6" fill={WOOD} />
      <ellipse cx="13.500" cy="0" rx="6.500" ry="3.600" fill="#f0c98a" />
    </>
  ),
  'metal-spoon': (
    <>
      <rect x="-23" y="-2.200" width="30" height="4.400" rx="2.200" fill="#b7c0cc" />
      <ellipse cx="13" cy="0" rx="10" ry="6" fill="#b7c0cc" />
      <ellipse cx="13.500" cy="0" rx="6.500" ry="3.600" fill="#e6ebf2" />
      <path d="M-19-.800h18" stroke="#e6ebf2" strokeWidth="1.200" strokeLinecap="round" />
    </>
  ),
  brick: (
    <>
      <rect x="-20" y="-10" width="40" height="20" rx="2.500" fill="#c8553d" />
      <rect x="-14" y="-4" width="7" height="8" rx="2" fill="#9c3f2c" />
      <rect x="-3.500" y="-4" width="7" height="8" rx="2" fill="#9c3f2c" />
      <rect x="7" y="-4" width="7" height="8" rx="2" fill="#9c3f2c" />
    </>
  ),
  pebble: (
    <>
      <path d="M-8 1c0-5 4-7 9-7 5 0 8 3 8 6 0 4-4 6-9 6-5 0-8-2-8-5z" fill={STONE} />
      <path
        d="M-3-3c2-1 4-1 6-1"
        fill="none"
        stroke={STONE_LIGHT}
        strokeWidth="1.800"
        strokeLinecap="round"
      />
    </>
  ),
  key: (
    <>
      <circle cx="-9" cy="0" r="5" fill="none" stroke="#e0b23c" strokeWidth="3.200" />
      <path
        d="M-4 0h18M9 0v5M13.500 0v4"
        fill="none"
        stroke="#e0b23c"
        strokeWidth="3.200"
        strokeLinecap="round"
      />
    </>
  ),
};

function tub(setup: Setup, outcome: string | null): Drawing {
  const thing = String(setup.thing);
  const fall = dropOf(thing, outcome ?? 'floated');
  return {
    vars: { '--surf': px(fall.toSurface), '--rest': px(fall.toRest) },
    body: (
      <>
        <path d={`M36 44L45 ${String(TUB_FLOOR + 2)}H155L164 44Z`} fill="#fff7e6" />
        <g transform={`translate(${String(HELD[0])} ${String(HELD[1])})`}>
          <g className={styles.thing}>{THINGS[thing]}</g>
        </g>
        {/* Bubbles come up when a thing goes down. */}
        <g className={styles.bubbles}>
          <circle cx="92" cy={TUB_FLOOR - 16} r="2.200" fill="#ffffff" />
          <circle cx="104" cy={TUB_FLOOR - 24} r="1.600" fill="#ffffff" />
          <circle cx="110" cy={TUB_FLOOR - 12} r="2" fill="#ffffff" />
        </g>
        {/* The water lies over whatever is in it, so that what is under the surface looks under it. */}
        <path
          d={`M38.500 ${String(SURFACE)}L45.500 ${String(TUB_FLOOR + 1)}H154.500L161.500 ${String(SURFACE)}Z`}
          fill={WATER}
          opacity="0.6"
        />
        <path
          d={`M40 ${String(SURFACE)}H160`}
          stroke={WATER_LIGHT}
          strokeWidth="2.400"
          strokeLinecap="round"
        />
        <path
          className={styles.splash}
          d={`M88 ${String(SURFACE - 3)}q-5-8-10-6M112 ${String(SURFACE - 3)}q5-8 10-6M100 ${String(SURFACE - 6)}v-7`}
          fill="none"
          stroke={WATER_LIGHT}
          strokeWidth="2.400"
          strokeLinecap="round"
        />
        <path
          d={`M34 44L44 ${String(TUB_FLOOR + 4)}H156L166 44`}
          fill="none"
          stroke={BARK}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={`M36.500 62H42M158 62h5.500M39.500 86H45.500M154.500 86h6`}
          stroke={WOOD_DEEP}
          strokeWidth="2.400"
          strokeLinecap="round"
        />
      </>
    ),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The boat
// ---------------------------------------------------------------------------------------------------------------------

/** A boat, drawn about its own middle at the waterline: its side `deep` high, its floor `low` under the water. */
function hull(boat: string, wide: number, deep: number, low: number): ReactNode {
  const rim = low - deep;
  const half = wide / 2;
  if (boat === 'raft') {
    return (
      <>
        <path d={`M3 ${String(rim)}v-17`} stroke={BARK} strokeWidth="2.200" strokeLinecap="round" />
        <path d={`M4 ${String(rim - 16)}c9 1 12 6 11 12-5-1-9-3-11-6z`} fill={GRASS} />
        <rect x={-half} y={rim} width={wide} height={deep} rx="4" fill={WOOD} />
        <path
          d={`M${String(-half + 4)} ${String(rim + 4)}H${String(half - 4)}M${String(-half + 4)} ${String(rim + 8)}H${String(half - 4)}`}
          stroke={WOOD_DEEP}
          strokeWidth="1.600"
          strokeLinecap="round"
          opacity="0.7"
        />
      </>
    );
  }
  if (boat === 'bark') {
    return (
      <>
        <path
          d={`M${String(-half - 3)} ${String(rim)}L${String(-half + 6)} ${String(low)}H${String(half - 6)}L${String(half + 3)} ${String(rim)}Z`}
          fill={BARK}
        />
        <path
          d={`M${String(-half)} ${String(rim + 1.5)}H${String(half)}`}
          stroke="#a57a57"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </>
    );
  }
  return (
    <>
      <path
        d={`M${String(-half)} ${String(rim)}Q${String(-half)} ${String(low)} ${String(-half / 2)} ${String(low)}H${String(half / 2)}Q${String(half)} ${String(low)} ${String(half)} ${String(rim)}Z`}
        fill={EARTH}
      />
      <path
        d={`M${String(-half + 1)} ${String(rim + 1.5)}H${String(half - 1)}`}
        stroke="#e2b77e"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  );
}

function boat(setup: Setup): Drawing {
  const shape = boatShape(setup);
  const rim = shape.low - shape.hull.deep;
  return {
    vars: { '--sail': px(shape.sail), '--down': px(shape.down) },
    body: (
      <>
        <rect
          x={NEAR_BANK - 6}
          y={POND}
          width={FAR_BANK - NEAR_BANK + 12}
          height={120 - POND}
          fill={WATER}
        />
        <rect
          x={NEAR_BANK - 6}
          y={POND_FLOOR}
          width={FAR_BANK - NEAR_BANK + 12}
          height={120 - POND_FLOOR}
          fill="#3f8fd0"
        />
        <Bank from={0} to={NEAR_BANK} top={POND - 8} lean={1} />
        <Bank from={FAR_BANK} to={200} top={POND - 8} lean={-1} />
        <Flag x={FAR_BANK + 22} y={POND - 8} />
        {/* The stones still waiting on the bank. */}
        {Array.from({ length: shape.waiting }, (_, index) => (
          <Pebble key={index} x={9 + index * 11} y={POND - 12} />
        ))}
        <g transform={`translate(${String(shape.at)} ${String(POND)})`}>
          <g className={styles.vessel}>
            <g className={styles.bob}>
              {hull(String(setup.boat), shape.hull.wide, shape.hull.deep, shape.low)}
              {Array.from({ length: shape.aboard }, (_, index) => (
                <Pebble
                  key={index}
                  x={(index - (shape.aboard - 1) / 2) * 9.5 - (setup.boat === 'raft' ? 9 : 0)}
                  y={rim - 2.5}
                />
              ))}
            </g>
          </g>
        </g>
        <g className={styles.bubbles}>
          <circle cx={shape.at + 6} cy={POND + 14} r="2.200" fill="#ffffff" />
          <circle cx={shape.at + 16} cy={POND + 22} r="1.600" fill="#ffffff" />
          <circle cx={shape.at + 22} cy={POND + 10} r="2" fill="#ffffff" />
        </g>
        {/* The water lies over the part of the boat that is under it. */}
        <rect
          x={NEAR_BANK - 1}
          y={POND}
          width={FAR_BANK - NEAR_BANK + 2}
          height={120 - POND}
          fill={WATER}
          opacity="0.32"
        />
        <path
          d={`M${String(NEAR_BANK + 2)} ${String(POND)}H${String(FAR_BANK - 2)}`}
          stroke={WATER_LIGHT}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </>
    ),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Any of them
// ---------------------------------------------------------------------------------------------------------------------

function draw(scene: string, setup: Setup, outcome: string | null): Drawing | null {
  switch (scene) {
    case 'bridge':
      return bridge(setup);
    case 'ramp':
      return ramp(setup, outcome);
    case 'balance':
      return balance(setup, outcome);
    case 'tub':
      return tub(setup, outcome);
    case 'boat':
      return boat(setup);
    default:
      return null;
  }
}

export interface SceneProps {
  scene: string;
  setup: Setup;
  phase?: Phase;
  /**
   * How it turns out. Left out, it is what the model says happens when this set-up is tested. Given, it is drawn
   * as given: that is how a picture of a guess — one way it might turn out — is made.
   */
  outcome?: string | undefined;
}

export function SceneView({ scene, setup, phase = 'before', outcome }: SceneProps) {
  const happens = outcome ?? testSetup(scene, setup)?.outcome ?? null;
  const drawing = draw(scene, setup, phase === 'before' ? null : happens);
  if (!drawing) return null;
  return (
    <svg
      className={styles.scene}
      viewBox="0 0 200 120"
      aria-hidden="true"
      focusable="false"
      data-scene={scene}
      data-phase={phase}
      data-outcome={phase === 'before' ? undefined : (happens ?? undefined)}
      data-setup={JSON.stringify(setup)}
      style={{ '--t': `${String(TEST_TIME)}ms`, ...drawing.vars } as CSSProperties}
    >
      {drawing.body}
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// The parts a child can change, each as a small picture
// ---------------------------------------------------------------------------------------------------------------------

const RISES: Readonly<Record<string, number>> = { low: 6, mid: 11, high: 16 };
const AMOUNTS: Readonly<Record<string, number>> = { none: 0, one: 1, two: 2, three: 3 };
const REACH: Readonly<Record<string, number>> = { near: 1, mid: 2, far: 3 };

function optionBody(control: string, option: string): ReactNode {
  const amount = AMOUNTS[option] ?? 0;
  switch (control) {
    case 'plank': {
      const thick = option === 'thick' ? 8 : 3.5;
      return (
        <>
          <rect x="0" y="16" width="10" height="16" rx="2" fill={EARTH} />
          <rect x="38" y="16" width="10" height="16" rx="2" fill={EARTH} />
          <rect x="4" y="13" width="40" height={thick} rx="1.500" fill={WOOD} />
        </>
      );
    }
    case 'posts':
      return (
        <>
          <rect x="0" y="16" width="9" height="16" rx="2" fill={EARTH} />
          <rect x="39" y="16" width="9" height="16" rx="2" fill={EARTH} />
          <rect x="9" y="24" width="30" height="8" fill={WATER} />
          {(amount === 1 ? [24] : amount === 2 ? [18, 30] : []).map((x) => (
            <rect key={x} x={x - 2.5} y="16" width="5" height="16" fill={BARK} />
          ))}
          <rect x="3" y="12" width="42" height="4.500" rx="1.500" fill={WOOD} />
        </>
      );
    case 'height': {
      const rise = RISES[option] ?? 8;
      return (
        <>
          <rect x="0" y="27" width="48" height="5" rx="2" fill="#e9c58a" />
          <path d={`M5 27V${String(27 - rise)}H9L38 27Z`} fill="#ffc45a" />
          <path
            d={`M9 ${String(27 - rise)}L38 27`}
            stroke="#a86a00"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="9" cy={27 - rise - 4.5} r="4.500" fill="#ef5350" />
        </>
      );
    }
    case 'surface':
      return option === 'rough' ? (
        <>
          <rect x="2" y="15" width="44" height="13" rx="3" fill={GRASS} />
          <path
            d="M6 16l2-6 2 6 2-7 2 7M20 16l2-6 2 6 2-7 2 7M34 16l2-6 2 6 2-7 2 7"
            fill="none"
            stroke={GRASS_DEEP}
            strokeWidth="1.800"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <rect x="2" y="15" width="44" height="13" rx="3" fill="#e9c58a" />
          <path d="M4 16.500h40" stroke="#f6dcae" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M17 19v8M31 19v8"
            stroke={WOOD_DEEP}
            strokeWidth="1.600"
            strokeLinecap="round"
            opacity="0.7"
          />
        </>
      );
    case 'weight':
      return (
        <>
          <rect x="6" y="27" width="36" height="4" rx="2" fill={WOOD} />
          {Array.from({ length: amount }, (_, level) => (
            <rect
              key={level}
              x="17"
              y={27 - 8 * (level + 1) + 0.5}
              width="14"
              height="7"
              rx="2"
              fill={ORANGE}
            />
          ))}
        </>
      );
    case 'at': {
      const reach = REACH[option] ?? 1;
      return (
        <>
          <path d="M8 22l-5 10h10z" fill={BARK} />
          <rect x="4" y="18" width="42" height="4" rx="2" fill={WOOD} />
          {[1, 2, 3].map((step) => (
            <circle key={step} cx={8 + step * 11} cy="20" r="1.300" fill={WOOD_DEEP} />
          ))}
          <rect x={8 + reach * 11 - 5.5} y="9" width="11" height="9" rx="2" fill={ORANGE} />
        </>
      );
    }
    case 'boat': {
      const wide = option === 'raft' ? 38 : option === 'bark' ? 26 : 16;
      const deep = option === 'raft' ? 8 : option === 'bark' ? 8 : 7;
      return (
        <>
          <rect x="0" y="21" width="48" height="11" rx="3" fill={WATER} />
          <g transform="translate(24 21)">{hull(option, wide, deep, 4)}</g>
        </>
      );
    }
    case 'cargo':
      return (
        <>
          {Array.from({ length: amount }, (_, index) => (
            <g
              key={index}
              transform={`translate(${String(24 + (index - (amount - 1) / 2) * 13)} 18) scale(1.250)`}
            >
              <path d="M-5 1c0-3 2-5 5-5 3 0 5 2 5 4 0 3-2 4-5 4-3 0-5-1-5-3z" fill={STONE} />
              <path
                d="M-2-2c1-1 2-1 3-1"
                fill="none"
                stroke={STONE_LIGHT}
                strokeWidth="1.400"
                strokeLinecap="round"
              />
            </g>
          ))}
        </>
      );
    default:
      return null;
  }
}

/** One value a part can take, as a picture small enough to go on a button. */
export function OptionPicture({ control, option }: { control: string; option: string }) {
  return (
    <svg className={styles.option} viewBox="0 0 48 32" aria-hidden="true" focusable="false">
      {optionBody(control, option)}
    </svg>
  );
}
