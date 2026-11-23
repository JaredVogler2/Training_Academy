import { BOATS, COUNTS, PLACES, PLANKS, POSTS, rampReach, type Setup } from '@/engine';

/**
 * Where things are in Inventor Island's pictures, and how far they move when a set-up is tested. Every picture is
 * drawn in a box 200 wide and 120 high. Kept apart from the drawing so that it can be checked: that a ball stops
 * where the model says it stops, that a post stands under the plank, that nothing is drawn outside the box.
 *
 * Nothing here says what happens — the models in src/engine/models.ts do. This says where to draw it.
 */

export const WIDTH = 200;
export const HEIGHT = 120;

/** How long a test takes to watch, in milliseconds. The stylesheet is given this; the scripts wait for it. */
export const TEST_TIME = 2600;

// ---------------------------------------------------------------------------------------------------------------------
// The bridge
// ---------------------------------------------------------------------------------------------------------------------

/** One length of a gap, across the picture. */
const BRIDGE_LENGTH = 26;
/** The top of the banks, and of the plank lying across them. */
export const DECK = 66;
/** The surface of the water under the bridge. */
export const STREAM = 84;
/** How far the plank reaches onto each bank. */
const OVERLAP = 9;

/** How wide each traveller is drawn: the heavier, the bigger. */
export const TRAVELLER_WIDTH: Readonly<Record<string, number>> = { rabbit: 18, goat: 26, bear: 34 };

export interface BridgeShape {
  /** Where the near and the far bank end. */
  near: number;
  far: number;
  /** How thick the plank is drawn. */
  thick: number;
  /** Where each post stands, from the near bank. */
  posts: number[];
  /** Where the plank is held up, from the near bank to the far one: the banks and every post. */
  rests: number[];
  /** Where the plank's own ends are. */
  from: number;
  to: number;
  /** Where the traveller waits, and how far it walks to be across. */
  wait: number;
  across: number;
  /** How far it walks to be in the middle of the first stretch, and how far that stretch dips under it. */
  middle: number;
  dip: number;
  /** Half of the first stretch: the piece of plank that turns as it dips. */
  half: number;
}

export function bridgeShape(setup: Setup): BridgeShape {
  const reach = Number(setup.gap) * BRIDGE_LENGTH;
  const near = WIDTH / 2 - reach / 2;
  const far = WIDTH / 2 + reach / 2;
  const count = POSTS[String(setup.posts)] ?? 0;
  const posts = Array.from(
    { length: count },
    (_, index) => near + (reach * (index + 1)) / (count + 1),
  );
  const rests = [near, ...posts, far];
  const width = TRAVELLER_WIDTH[String(setup.traveller)] ?? 18;
  const wait = near - OVERLAP - width / 2 - 2;
  const half = ((rests[1] ?? far) - near) / 2;
  return {
    near,
    far,
    thick: (PLANKS[String(setup.plank)] ?? 1) * 4,
    posts,
    rests,
    from: near - OVERLAP,
    to: far + OVERLAP,
    wait,
    across: far + OVERLAP + width / 2 + 2 - wait,
    middle: near + half - wait,
    // As far as the water, or a little over half the piece that turns: a short stretch cannot dip far.
    dip: Math.min(STREAM - DECK - 2, half * 0.55),
    half,
  };
}

/** The angle a half of the stretch turns through to dip by `dip`, in degrees, and how much longer it is drawn so that the two halves still meet. */
export function bow(half: number, dip: number): { degrees: number; stretch: number } {
  const angle = Math.atan2(dip, half);
  return { degrees: (angle * 180) / Math.PI, stretch: 1 / Math.cos(angle) };
}

// ---------------------------------------------------------------------------------------------------------------------
// The ramp
// ---------------------------------------------------------------------------------------------------------------------

/** The ground the ball rolls along, and where the ramp meets it. */
export const GROUND = 96;
export const RAMP_FOOT = 58;
/** One of the equal lengths the ground is marked off in. */
export const RAMP_LENGTH = 22;
export const BALL = 6;

const RAMP_RISE: Readonly<Record<string, number>> = { low: 20, mid: 40, high: 60 };

/** The middle of the `length`-th length of ground (1 is nearest the ramp). */
export function lengthMiddle(length: number): number {
  return RAMP_FOOT + RAMP_LENGTH * length - RAMP_LENGTH / 2;
}

export interface RampShape {
  /** How high the top of the ramp is above the ground. */
  rise: number;
  /** Where the ball is let go: its middle. */
  top: [number, number];
  /** How far the ball moves to reach the foot of the ramp: across, and down. */
  toFoot: [number, number];
  /** How far across it has moved when it stops. */
  toRest: number;
  /** Where the star stands. */
  star: number;
  /** How many times the ball turns over on the way, near enough. */
  turns: number;
}

/**
 * Where the ball's middle is when it has stopped. Tested, it stops where the model says. A picture of a way it
 * might have turned out and did not — "it rolls too far", offered as a guess — shows it a length off the star on
 * that side, which is all such a picture has to say.
 */
export function ballRest(setup: Setup, outcome: string | null): number {
  const reach = rampReach(String(setup.height), String(setup.surface));
  const target = Number(setup.target);
  const tested = reach === target ? 'landed' : reach < target ? 'rolled-short' : 'rolled-past';
  if (outcome === null || outcome === tested) return lengthMiddle(reach);
  if (outcome === 'landed') return lengthMiddle(target);
  if (outcome === 'rolled-short') return target === 1 ? RAMP_FOOT + 3 : lengthMiddle(target - 1);
  return Math.min(WIDTH - BALL - 2, lengthMiddle(target + 1));
}

export function rampShape(setup: Setup, outcome: string | null = null): RampShape {
  const rise = RAMP_RISE[String(setup.height)] ?? 20;
  const top: [number, number] = [12, GROUND - rise - BALL];
  const rest = ballRest(setup, outcome);
  const rolled = Math.hypot(RAMP_FOOT - top[0], rise) + (rest - RAMP_FOOT);
  return {
    rise,
    top,
    toFoot: [RAMP_FOOT - top[0], rise],
    toRest: rest - top[0],
    star: lengthMiddle(Number(setup.target)),
    turns: rolled / (2 * Math.PI * BALL),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The balance
// ---------------------------------------------------------------------------------------------------------------------

/** Where the beam rests on its middle. */
export const PIVOT: readonly [number, number] = [100, 71];
/** One step out along the beam. */
export const BEAM_STEP = 27;
/** How far the beam turns when one side goes down, in degrees. */
export const TIP = 10;

export interface BalanceShape {
  /** Blocks on each side, and how far out from the middle each stack stands (left is negative). */
  left: { blocks: number; at: number };
  right: { blocks: number; at: number };
}

export function balanceShape(setup: Setup): BalanceShape {
  return {
    left: { blocks: Number(setup.leftWeight), at: -Number(setup.leftAt) * BEAM_STEP },
    right: {
      blocks: COUNTS[String(setup.weight)] ?? 0,
      at: (PLACES[String(setup.at)] ?? 0) * BEAM_STEP,
    },
  };
}

/** How far the beam turns for each way it can end up: clockwise is the right side going down. */
export function tipOf(outcome: string): number {
  return outcome === 'tipped-left' ? -TIP : outcome === 'tipped-right' ? TIP : 0;
}

// ---------------------------------------------------------------------------------------------------------------------
// The tub, and things dropped in it
// ---------------------------------------------------------------------------------------------------------------------

/** The surface of the water in the tub, and its floor. */
export const SURFACE = 56;
export const TUB_FLOOR = 108;
/** Where a thing is held before it is let go: its middle. */
export const HELD: readonly [number, number] = [100, 26];

/**
 * How each thing is drawn: half its height, and how it sits when it floats — how far its middle rides below the
 * surface, as a share of that half height (less than nothing is riding high, mostly out of the water).
 */
export const THING_SHAPES: Readonly<Record<string, { half: number; rides: number }>> = {
  log: { half: 11, rides: 0.25 },
  ball: { half: 16, rides: -0.6 },
  cork: { half: 8, rides: -0.45 },
  'wooden-spoon': { half: 6, rides: 0.1 },
  brick: { half: 10, rides: 0 },
  pebble: { half: 6, rides: 0 },
  key: { half: 6, rides: 0 },
  'metal-spoon': { half: 6, rides: 0 },
};

/** How far a thing falls from where it is held to where it comes to rest. */
export function dropOf(thing: string, outcome: string): { toSurface: number; toRest: number } {
  const shape = THING_SHAPES[thing] ?? { half: 8, rides: 0 };
  const toSurface = SURFACE + shape.half * shape.rides - HELD[1];
  const toFloor = TUB_FLOOR - shape.half - 1 - HELD[1];
  return { toSurface, toRest: outcome === 'sank' ? toFloor : toSurface };
}

// ---------------------------------------------------------------------------------------------------------------------
// The boat
// ---------------------------------------------------------------------------------------------------------------------

/** The surface of the pond, its floor, and where the banks end. */
export const POND = 72;
export const POND_FLOOR = 114;
export const NEAR_BANK = 40;
export const FAR_BANK = 160;

/** How each boat is drawn: how wide, and how deep its side is. */
export const HULLS: Readonly<Record<string, { wide: number; deep: number }>> = {
  shell: { wide: 24, deep: 12 },
  bark: { wide: 36, deep: 14 },
  raft: { wide: 50, deep: 14 },
};

export interface BoatShape {
  hull: { wide: number; deep: number };
  /** Stones aboard, and stones still waiting on the bank. */
  aboard: number;
  waiting: number;
  /** Where the boat lies before it sets off: its middle, at the waterline. */
  at: number;
  /** How far under the waterline the boat sits, loaded as it is: the more aboard, the lower. */
  low: number;
  /** How far it sails to reach the far bank. */
  sail: number;
  /** How far down it goes if it sinks. */
  down: number;
}

export function boatShape(setup: Setup): BoatShape {
  const hull = HULLS[String(setup.boat)] ?? { wide: 24, deep: 12 };
  const aboard = COUNTS[String(setup.cargo)] ?? 0;
  const carries = BOATS[String(setup.boat)] ?? 1;
  const at = NEAR_BANK + 4 + hull.wide / 2;
  // The more aboard, the lower it sits: a boat with one stone of the three it can carry rides high, and a full
  // one has a quarter of its side showing. One with too much aboard, still tied up at the bank, sits only a
  // little lower than that — what happens to it is found out by sending it off, not by looking.
  const share = Math.min(1.1, aboard / carries);
  const low = hull.deep * (0.25 + 0.5 * share);
  return {
    hull,
    aboard,
    waiting: Math.max(0, Number(setup.need) - aboard),
    at,
    low,
    sail: FAR_BANK - 4 - hull.wide / 2 - at,
    down: POND_FLOOR - POND - low,
  };
}
