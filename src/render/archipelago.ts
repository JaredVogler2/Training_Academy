import { WORLD_IDS, type WorldId } from '@/engine';

/**
 * Where everything in the harbour is, for any shape of screen — in plain arithmetic, with no graphics library.
 *
 * The archipelago is always seen from the same angle through a camera with no perspective, so a point in the world
 * lands on the screen at
 *
 *     across = x                       down = z · sin(pitch) − height · cos(pitch)
 *
 * times a scale, plus an offset. Three things use that one sum and therefore agree to the pixel: the 3D scene's
 * camera, the picture the hub falls back to, and the tappable areas with their labels.
 *
 * The seven places are arranged differently for a tall phone, an upright tablet, a squarish window and a wide
 * screen, so the islands are as large as the screen allows and never hide one another.
 */

/** How far below the horizontal the camera looks. */
export const PITCH = (36 * Math.PI) / 180;
const RISE = Math.cos(PITCH);
const DEPTH = Math.sin(PITCH);

export type PlaceId = 'academy' | WorldId;
export const PLACES: readonly PlaceId[] = ['academy', ...WORLD_IDS];

export interface Extent {
  /** Reach of the shore from the middle, in world units. */
  radius: number;
  /** How tall the place may be drawn: see EXTENTS. */
  height: number;
}

/**
 * Room kept for each place. `height` is how high the place may be drawn above its middle at water level, given as
 * the height of something standing exactly there: a landmark further back is drawn higher for the same height, and
 * must be that much shorter. The models (hub3d/islands) must stay inside these: a test measures that they do.
 */
export const EXTENTS: Readonly<Record<PlaceId, Extent>> = {
  academy: { radius: 2.05, height: 4.55 },
  'reading-cove': { radius: 2.3, height: 3.4 },
  'number-garden': { radius: 2.3, height: 3.4 },
  'robot-ridge': { radius: 2.3, height: 3.4 },
  'memory-forest': { radius: 2.3, height: 3.4 },
  'inventor-island': { radius: 2.3, height: 3.4 },
  'explorer-harbor': { radius: 2.3, height: 3.4 },
};

export interface Spot {
  x: number;
  z: number;
}

export type Arrangement = 'tall' | 'upright' | 'ring' | 'wide';

/** What floats between the islands. Every position is a point on the water. */
export interface Extras {
  /** Where the guide's boat is moored. */
  guide: Spot;
  /** Small sailing boats, each pottering about its own spot. */
  boats: readonly Spot[];
  /** Rocks standing out of the sea. */
  rocks: readonly Spot[];
  /** The point on the water each cloud is seen above. */
  clouds: readonly Spot[];
}

export interface Layout {
  arrangement: Arrangement;
  spots: Readonly<Record<PlaceId, Spot>>;
  extras: Extras;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Screen room one world takes from its near shore to the top of its landmark, in world units. */
const WORLD = EXTENTS['number-garden'];
const BODY = WORLD.radius * DEPTH + WORLD.height * RISE;

/**
 * A tall phone: two columns, zig-zagging away from the viewer like stepping stones, with the lighthouse at the far
 * end. The nearest island is the first in teaching order; the first step is longer, which leaves the guide a
 * mooring beside it.
 */
function tall(): Omit<Layout, 'arrangement'> {
  const column = 2.95;
  const step = 4.7;
  const firstStep = 5.75;
  const order: readonly WorldId[] = [
    'reading-cove',
    'number-garden',
    'robot-ridge',
    'memory-forest',
    'inventor-island',
    'explorer-harbor',
  ];
  const spots: Partial<Record<PlaceId, Spot>> = {};
  for (const [index, world] of order.entries()) {
    spots[world] = {
      x: index % 2 === 0 ? -column : column,
      z: index === 0 ? 0 : -(firstStep + (index - 1) * step),
    };
  }
  const far = -(firstStep + (order.length - 2) * step) - 6.8;
  spots.academy = { x: 0, z: far };
  return {
    spots: spots as Layout['spots'],
    extras: {
      guide: { x: 3.0, z: 0.75 },
      boats: [{ x: 3.75, z: far - 0.4 }],
      rocks: [{ x: -4.3, z: far + 1.2 }],
      clouds: [
        { x: -3.7, z: far - 3.6 },
        { x: 3.9, z: far - 4.4 },
      ],
    },
  };
}

/** An upright tablet: two columns of three, the lighthouse in the middle. Rows spread to use the height. */
function upright(aspect: number): Omit<Layout, 'arrangement'> {
  const column = 4.7;
  const width = column * 2 + WORLD.radius * 2;
  const rows = clamp((width / aspect - BODY - 1) / (2 * DEPTH), 8.7, 10.2);
  return {
    spots: {
      academy: { x: 0, z: 0.3 },
      'inventor-island': { x: -column, z: -rows },
      'explorer-harbor': { x: column, z: -rows },
      'robot-ridge': { x: -column, z: 0 },
      'memory-forest': { x: column, z: 0 },
      'reading-cove': { x: -column, z: rows },
      'number-garden': { x: column, z: rows },
    },
    extras: {
      guide: { x: 0, z: rows - 0.4 },
      boats: [
        { x: 0.3, z: -rows + 0.6 },
        { x: -0.4, z: rows * 0.52 },
      ],
      rocks: [{ x: -0.9, z: -rows * 0.62 }],
      clouds: [
        { x: -0.2, z: -rows - 3.4 },
        { x: 8.3, z: -rows * 0.5 - 1.0 },
      ],
    },
  };
}

/** A squarish window: the six worlds on a ring around the lighthouse. */
function ring(): Omit<Layout, 'arrangement'> {
  return {
    spots: {
      academy: { x: 0, z: 0 },
      'inventor-island': { x: -4.1, z: -7.0 },
      'explorer-harbor': { x: 4.1, z: -7.0 },
      'robot-ridge': { x: -8.9, z: 0 },
      'memory-forest': { x: 8.9, z: 0 },
      'reading-cove': { x: -4.1, z: 7.0 },
      'number-garden': { x: 4.1, z: 7.0 },
    },
    extras: {
      guide: { x: 0, z: 6.3 },
      boats: [
        { x: -4.6, z: 0.9 },
        { x: 0.2, z: -7.4 },
        { x: 8.6, z: 5.6 },
      ],
      rocks: [
        { x: 4.5, z: 1.0 },
        { x: -8.9, z: -6.4 },
        { x: -8.7, z: 6.0 },
      ],
      clouds: [
        { x: -9.0, z: -9.4 },
        { x: 9.2, z: -9.0 },
        { x: 0.2, z: -11.0 },
      ],
    },
  };
}

/** A wide screen, or a phone on its side: a low, broad ring. */
function wide(): Omit<Layout, 'arrangement'> {
  const back = -5.1;
  const front = 4.7;
  return {
    spots: {
      academy: { x: 0, z: -0.2 },
      'inventor-island': { x: -4.5, z: back },
      'explorer-harbor': { x: 4.5, z: back },
      'robot-ridge': { x: -9.4, z: -0.2 },
      'memory-forest': { x: 9.4, z: -0.2 },
      'reading-cove': { x: -4.5, z: front },
      'number-garden': { x: 4.5, z: front },
    },
    extras: {
      guide: { x: 0, z: front + 0.2 },
      boats: [
        { x: -4.7, z: 0.0 },
        { x: 9.6, z: front + 0.1 },
        { x: 0.3, z: back - 0.7 },
      ],
      rocks: [
        { x: -9.6, z: front - 0.1 },
        { x: -9.9, z: back - 0.3 },
        { x: 9.9, z: back - 0.5 },
      ],
      clouds: [
        { x: -9.6, z: back - 3.1 },
        { x: 9.9, z: back - 2.5 },
        { x: 0.2, z: back - 4.7 },
      ],
    },
  };
}

/** Choose the arrangement for a free area of the given width-to-height ratio. */
export function arrange(aspect: number): Layout {
  if (aspect < 0.62) return { arrangement: 'tall', ...tall() };
  if (aspect < 1.3) return { arrangement: 'upright', ...upright(aspect) };
  if (aspect < 1.9) return { arrangement: 'ring', ...ring() };
  return { arrangement: 'wide', ...wide() };
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Frame {
  layout: Layout;
  /** CSS pixels to the world unit. */
  scale: number;
  /** Where the world's origin, at water level, lands on the stage. */
  origin: { x: number; y: number };
  /** The point on the water that lands in the middle of the stage: where the 3D camera looks. */
  target: Spot;
  stage: { width: number; height: number };
}

/**
 * Each island's name sits under it. The type is sized from the islands themselves, so that on a small phone held
 * sideways the names still fit under islands a hundred pixels wide.
 */
export function labelSize(scale: number): number {
  return clamp(0.34 * scale + 4.5, 12, 17);
}

/** Height in CSS pixels kept under each island for its name, at a given number of pixels to the world unit. */
export function labelRoom(scale: number): number {
  return Math.round(labelSize(scale) * 2.05 + 6);
}

/** The most room a name ever takes: what the fitting allows for before it knows the scale. */
export const LABEL_ROOM_MOST = labelRoom(1000);
/** Islands are never drawn larger than this, however big the screen. */
export const MAX_SCALE = 92;

const MARGIN = { side: 0.03, top: 10, bottom: 10 };

/** Across-and-up position of a world point, in world units on the screen plane. */
function flat(x: number, y: number, z: number): { u: number; v: number } {
  return { u: x, v: y * RISE - z * DEPTH };
}

/**
 * Fit the archipelago into the part of the stage nothing else covers.
 * `free` is that part, in the stage's own coordinates.
 */
export function frameFor(stage: { width: number; height: number }, free: Box): Frame {
  const layout = arrange(free.width / Math.max(free.height, 1));
  let left = Infinity;
  let right = -Infinity;
  let top = -Infinity;
  let bottom = Infinity;
  for (const place of PLACES) {
    const spot = layout.spots[place];
    const extent = EXTENTS[place];
    const centre = flat(spot.x, 0, spot.z);
    left = Math.min(left, centre.u - extent.radius);
    right = Math.max(right, centre.u + extent.radius);
    top = Math.max(top, centre.v + Math.max(extent.radius * DEPTH, extent.height * RISE));
    bottom = Math.min(bottom, centre.v - extent.radius * DEPTH);
  }

  const roomAcross = free.width * (1 - 2 * MARGIN.side);
  const roomDown = free.height - MARGIN.top - MARGIN.bottom - LABEL_ROOM_MOST;
  const scale = Math.max(
    1,
    Math.min(roomAcross / (right - left), roomDown / (top - bottom), MAX_SCALE),
  );

  const spare = roomDown - (top - bottom) * scale;
  const origin = {
    x: free.left + free.width / 2 - (scale * (left + right)) / 2,
    y: free.top + MARGIN.top + spare / 2 + scale * top,
  };
  const acrossAtCentre = (stage.width / 2 - origin.x) / scale;
  const upAtCentre = (origin.y - stage.height / 2) / scale;
  return {
    layout,
    scale,
    origin,
    target: { x: acrossAtCentre, z: -upAtCentre / DEPTH },
    stage: { width: stage.width, height: stage.height },
  };
}

/** Where a point in the world is drawn on the stage, in CSS pixels. */
export function project(frame: Frame, x: number, y: number, z: number): { x: number; y: number } {
  const { u, v } = flat(x, y, z);
  return { x: frame.origin.x + frame.scale * u, y: frame.origin.y - frame.scale * v };
}

export interface Hotspot {
  place: PlaceId;
  /** The whole tappable area: the island, its landmark and its name. */
  box: Box;
  /** The middle of the island at water level. */
  anchor: { x: number; y: number };
  /** The island's width on screen. */
  span: number;
}

export function hotspotFor(frame: Frame, place: PlaceId): Hotspot {
  const spot = frame.layout.spots[place];
  const extent = EXTENTS[place];
  const anchor = project(frame, spot.x, 0, spot.z);
  const up = Math.max(extent.radius * DEPTH, extent.height * RISE) * frame.scale;
  const down = extent.radius * DEPTH * frame.scale + labelRoom(frame.scale);
  const half = extent.radius * frame.scale;
  return {
    place,
    box: { left: anchor.x - half, top: anchor.y - up, width: half * 2, height: up + down },
    anchor,
    span: half * 2,
  };
}

/**
 * What a place covers on screen, as two boxes: the island itself, and the column its landmark stands in.
 * (A landmark stands near the middle of its island: within `LANDMARK_REACH` of the radius to either side.)
 */
export const LANDMARK_REACH = 0.65;

export function drawnBoxes(frame: Frame, place: PlaceId): [island: Box, landmark: Box] {
  const spot = frame.layout.spots[place];
  const extent = EXTENTS[place];
  const anchor = project(frame, spot.x, 0, spot.z);
  const half = extent.radius * frame.scale;
  const deep = extent.radius * DEPTH * frame.scale;
  const tall = extent.height * RISE * frame.scale;
  return [
    { left: anchor.x - half, top: anchor.y - deep, width: half * 2, height: deep * 2 },
    {
      left: anchor.x - half * LANDMARK_REACH,
      top: anchor.y - tall,
      width: half * 2 * LANDMARK_REACH,
      height: tall,
    },
  ];
}

/** The square patch of water, in world units, that the sun's shadow map has to cover. */
export function shadowBounds(layout: Layout): { centre: Spot; reach: number } {
  let left = Infinity;
  let right = -Infinity;
  let far = Infinity;
  let near = -Infinity;
  for (const place of PLACES) {
    const spot = layout.spots[place];
    const radius = EXTENTS[place].radius + 1.2;
    left = Math.min(left, spot.x - radius);
    right = Math.max(right, spot.x + radius);
    far = Math.min(far, spot.z - radius);
    near = Math.max(near, spot.z + radius);
  }
  return {
    centre: { x: (left + right) / 2, z: (far + near) / 2 },
    reach: Math.max(right - left, near - far) / 2 + 1,
  };
}

/** Where a place's name goes: the strip under its island. */
export function labelBox(frame: Frame, place: PlaceId): Box {
  const spot = frame.layout.spots[place];
  const extent = EXTENTS[place];
  const anchor = project(frame, spot.x, 0, spot.z);
  const half = extent.radius * frame.scale;
  return {
    left: anchor.x - half,
    top: anchor.y + extent.radius * DEPTH * frame.scale,
    width: half * 2,
    height: labelRoom(frame.scale),
  };
}

/** The guide is drawn this many world units wide, and never smaller than `GUIDE_MIN` CSS pixels. */
export const GUIDE_SPAN = 2.0;
export const GUIDE_MIN = 64;

/** The square the guide and their boat are drawn in. */
export function guideBox(frame: Frame): Box {
  const spot = frame.layout.extras.guide;
  const anchor = project(frame, spot.x, 0, spot.z);
  const size = Math.max(GUIDE_MIN, GUIDE_SPAN * frame.scale);
  // The boat sits on the water at the anchor; most of the guide is above it.
  return { left: anchor.x - size / 2, top: anchor.y - size * 0.72, width: size, height: size };
}

/**
 * Where something floating at `height` must be for it to be seen above the point `over` on the water: further
 * towards the viewer, by as much as the camera's angle hides.
 */
export function aloft(over: Spot, height: number): { x: number; y: number; z: number } {
  return { x: over.x, y: height, z: over.z + (height * RISE) / DEPTH };
}

/** The far and near edges of what is on screen, as world z on the water. */
export function visibleDepth(frame: Frame): { far: number; near: number } {
  return {
    far: -(frame.origin.y / frame.scale) / DEPTH,
    near: (frame.stage.height - frame.origin.y) / frame.scale / DEPTH,
  };
}
