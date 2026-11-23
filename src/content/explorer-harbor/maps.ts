/**
 * The maths of Explorer Harbor's maps. A map is 100 units wide and 64 tall, with its top left corner at 0, 0.
 * Its islands are ovals, so that whether a point is on land can be worked out exactly — by the tests of the
 * content as well as by the drawing, which reads the same numbers.
 *
 * Nothing here is a matter of opinion at the edges: a place counts as on land only well inside a shore, and as on
 * water only well clear of every shore; one place is nearer than another only when it is nearer by a good deal.
 * A map that cannot be read that plainly is refused by the content rules.
 */

export const MAP = { width: 100, height: 64 } as const;

export interface Point {
  x: number;
  y: number;
}

export interface Island extends Point {
  /** Half its width and half its height. */
  rx: number;
  ry: number;
}

const numbers = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((each): each is number => typeof each === 'number') : [];

/** The islands of a map, as its content writes them: x, y, half-width, half-height, one after another. */
export function islandsOf(value: unknown): Island[] {
  const flat = numbers(value);
  const islands: Island[] = [];
  for (let index = 0; index + 3 < flat.length; index += 4) {
    const [x = 0, y = 0, rx = 0, ry = 0] = flat.slice(index, index + 4);
    islands.push({ x, y, rx, ry });
  }
  return islands;
}

/** A place on a map, as its content writes it: x, then y. */
export function pointOf(value: unknown): Point | null {
  const [x, y] = numbers(value);
  return x === undefined || y === undefined ? null : { x, y };
}

/** How far out from the middle of an island a point is: 0 at the middle, 1 on the shore, more out at sea. */
export function reach(island: Island, point: Point): number {
  return Math.hypot((point.x - island.x) / island.rx, (point.y - island.y) / island.ry);
}

/** Well inside the shore: no closer to it than this, measured from the middle. */
export const WELL_ASHORE = 0.62;
/** Well out at sea: at least this far from the middle of every island. */
export const WELL_OUT = 1.5;

export type Standing = 'land' | 'water' | 'unclear';

/** Whether a point is plainly on land, plainly on water, or too near a shore to say. */
export function standing(islands: readonly Island[], point: Point): Standing {
  const nearest = Math.min(...islands.map((island) => reach(island, point)));
  if (nearest <= WELL_ASHORE) return 'land';
  return nearest >= WELL_OUT ? 'water' : 'unclear';
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The nearest place is plainly the nearest when it is no more than this much of the way to the next nearest. */
export const PLAINLY_NEARER = 0.62;
/** The farthest place is plainly the farthest when it is at least this many times as far as the next farthest. */
export const PLAINLY_FARTHER = 1.4;

/**
 * Which of some places is plainly the nearest to a point, or plainly the farthest from it; `null` where two are
 * too alike to call.
 */
export function plainly(
  which: 'near' | 'far',
  from: Point,
  places: readonly Point[],
): number | null {
  if (places.length < 2) return null;
  const ranked = places
    .map((place, index) => ({ index, far: distance(from, place) }))
    .sort((a, b) => a.far - b.far);
  if (which === 'near') {
    const [first, second] = ranked;
    if (!first || !second) return null;
    return first.far <= second.far * PLAINLY_NEARER ? first.index : null;
  }
  const last = ranked.at(-1);
  const before = ranked.at(-2);
  if (!last || !before) return null;
  return last.far >= before.far * PLAINLY_FARTHER ? last.index : null;
}

/**
 * Places have to be this far apart to be pressed apart by a small finger. On the flattest phone the whole map is
 * about 170 points wide, and a place to press is never less than 56 points across: a third of the map.
 */
export const APART = 33;
/** And this far from the edge of the map, so that all of each can be seen and pressed. */
export const FROM_EDGE = { x: 9, y: 11 } as const;

export function onTheMap(point: Point): boolean {
  return (
    point.x >= FROM_EDGE.x &&
    point.x <= MAP.width - FROM_EDGE.x &&
    point.y >= FROM_EDGE.y &&
    point.y <= MAP.height - FROM_EDGE.y
  );
}
