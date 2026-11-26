/**
 * The arithmetic of a globe that is looked at from far away: where a place on the earth is on the disc, whether
 * it is on the side that faces us, and what the outline of a land looks like when part of it has gone round the
 * edge. Pure functions of numbers; the drawing is in `Globe.tsx`.
 *
 * Places are in degrees: east is positive, north is positive. The disc is a circle of radius 1 with its middle
 * at (0, 0), x to the right and y down the screen, so that it can be laid straight onto a picture.
 */

/** A place on the earth: degrees east, degrees north. */
export type LonLat = readonly [lon: number, lat: number];

/** The place that is in the middle of the disc. */
export interface View {
  lon: number;
  lat: number;
}

/** Where a place is on the disc, and how squarely it faces us: 1 in the middle, 0 at the edge, below 0 behind. */
export interface Seen {
  x: number;
  y: number;
  facing: number;
}

/** How far the globe may be tipped towards either pole: beyond this the lands are too squashed to know. */
export const TIP_MOST = 40;

/** How squarely the pin of every land to choose between must face: 1 is the middle of the disc, 0 its edge. */
export const FACING_LEAST = 0.5;
/**
 * How far apart two pins must be, in globe radii. On the smallest globe there is (106 pixels across with its
 * edge, on the narrowest phone held sideways) this is 56 pixels: room for a small finger on each, with neither
 * finger on the other's pin.
 */
export const PINS_APART = 1.1;
/** How squarely the land that is asked for must face, at its middle: most of it has to be there to be known by. */
export const WANTED_FACING = 0.6;
/**
 * How squarely a pin must face to be in sight, once a child has turned the globe: nearer the edge of the disc
 * than this, it is not drawn and cannot be pressed. (As a question is put, every pin faces far more squarely.)
 */
export const IN_SIGHT = 0.2;

const RAD = Math.PI / 180;

/** Degrees east brought into -180 to 180. */
export function wrap(lon: number): number {
  const turned = ((((lon + 180) % 360) + 360) % 360) - 180;
  // -180 and 180 are the same line; keep the one a list of places is likelier to hold.
  return turned === -180 && lon > 0 ? 180 : turned;
}

/** A view that the globe can really take: its tip kept within bounds, its turn brought into range. */
export function steady(view: View): View {
  return { lon: wrap(view.lon), lat: Math.max(-TIP_MOST, Math.min(TIP_MOST, view.lat)) };
}

/** Where a place is on the disc when `view` is in the middle of it. */
export function seen(view: View, [lon, lat]: LonLat): Seen {
  const across = (lon - view.lon) * RAD;
  const up = lat * RAD;
  const tip = view.lat * RAD;
  // The place as it would be with the equator across the middle: x to the right, y up, z towards us.
  const x = Math.cos(up) * Math.sin(across);
  const y = Math.sin(up);
  const z = Math.cos(up) * Math.cos(across);
  // Then the whole globe tipped, so that the view's own latitude comes to the middle.
  return {
    x,
    y: -(y * Math.cos(tip) - z * Math.sin(tip)),
    facing: y * Math.sin(tip) + z * Math.cos(tip),
  };
}

/** Whether a place is in sight: on the side that faces us, and not at the very edge. */
export const inSight = (view: View, place: LonLat): boolean => seen(view, place).facing >= IN_SIGHT;

/** How far apart two places are, as an angle at the middle of the earth, in degrees. */
export function apart([lonA, latA]: LonLat, [lonB, latB]: LonLat): number {
  const a = latA * RAD;
  const b = latB * RAD;
  const cosine =
    Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos((lonB - lonA) * RAD);
  return Math.acos(Math.max(-1, Math.min(1, cosine))) / RAD;
}

/**
 * The view that looks most squarely at several places at once: the middle of them, on the globe itself. Tipped no
 * further than a globe may be.
 */
export function viewOf(places: readonly LonLat[]): View {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const [lon, lat] of places) {
    x += Math.cos(lat * RAD) * Math.sin(lon * RAD);
    y += Math.sin(lat * RAD);
    z += Math.cos(lat * RAD) * Math.cos(lon * RAD);
  }
  const length = Math.hypot(x, y, z);
  // Places that cancel each other out (the two poles, say) have no middle: any view is as good.
  if (length < 1e-9) return { lon: 0, lat: 0 };
  return steady({ lon: Math.atan2(x, z) / RAD, lat: Math.asin(y / length) / RAD });
}

/** The view part of the way from one to another, turning the shorter way round. */
export function between(from: View, to: View, share: number): View {
  const turn = wrap(to.lon - from.lon);
  return steady({ lon: from.lon + turn * share, lat: from.lat + (to.lat - from.lat) * share });
}

/** The view after a finger has pulled the globe by so much of its own radius. */
export function dragged(view: View, dx: number, dy: number): View {
  // The land under the finger goes with the finger: pulled right, the view turns west; pulled down, north.
  return steady({ lon: view.lon - dx / RAD, lat: view.lat + dy / RAD });
}

/** No straight stretch along the edge of the disc is longer than this, in degrees of the circle. */
const EDGE_STEP = 6;

/**
 * The part of an outline that faces us, as points on the disc, in order. Where the outline goes round the edge
 * of the globe it is cut there, and joined up along the edge, the shorter way: right for any land smaller than
 * half the world, which every continent is. Empty when none of it faces us.
 */
export function outlineSeen(view: View, ring: readonly LonLat[]): [number, number][] {
  const points = ring.map((place) => seen(view, place));
  const first = points.findIndex((point) => point.facing >= 0);
  if (first === -1) return [];
  const out: [number, number][] = [];
  /** Where the outline last went behind, as an angle round the disc. */
  let wentBehind: number | null = null;

  /** Where the straight line between two places, one facing and one not, meets the edge of the disc. */
  const edge = (a: Seen, b: Seen): [number, number] => {
    const share = a.facing / (a.facing - b.facing);
    const x = a.x + (b.x - a.x) * share;
    const y = a.y + (b.y - a.y) * share;
    const length = Math.hypot(x, y) || 1;
    return [x / length, y / length];
  };

  for (let step = 0; step < points.length; step++) {
    const a = points[(first + step) % points.length];
    const b = points[(first + step + 1) % points.length];
    if (!a || !b) continue;
    if (step === 0) out.push([a.x, a.y]);
    const aFaces = a.facing >= 0;
    const bFaces = b.facing >= 0;
    if (aFaces && bFaces) {
      out.push([b.x, b.y]);
    } else if (aFaces) {
      const [x, y] = edge(a, b);
      out.push([x, y]);
      wentBehind = Math.atan2(y, x);
    } else if (bFaces) {
      const [x, y] = edge(b, a);
      if (wentBehind !== null) {
        // Along the edge of the disc from where it went behind to where it comes back, the shorter way.
        const back = Math.atan2(y, x);
        let turn = back - wentBehind;
        while (turn > Math.PI) turn -= 2 * Math.PI;
        while (turn < -Math.PI) turn += 2 * Math.PI;
        const steps = Math.floor(Math.abs(turn) / (EDGE_STEP * RAD));
        for (let k = 1; k <= steps; k++) {
          const angle = wentBehind + (turn * k) / (steps + 1);
          out.push([Math.cos(angle), Math.sin(angle)]);
        }
      }
      out.push([x, y]);
      out.push([b.x, b.y]);
      wentBehind = null;
    }
  }
  // The walk ends where it began: the last point is the first again.
  out.pop();
  return out;
}

/** Outlines as one SVG path on a disc of the given radius: only what faces us. */
export function pathOf(view: View, rings: readonly (readonly LonLat[])[], radius: number): string {
  let d = '';
  for (const ring of rings) {
    const points = outlineSeen(view, ring);
    if (points.length < 3) continue;
    d += `M${points.map(([x, y]) => `${(x * radius).toFixed(1)} ${(y * radius).toFixed(1)}`).join('L')}Z`;
  }
  return d;
}

/**
 * A line round the globe (a line of latitude, or of longitude), as SVG path pieces of what faces us. A line
 * is not joined up along the edge: where it goes behind, it stops.
 */
export function lineSeen(view: View, line: readonly LonLat[], radius: number): string {
  let d = '';
  let drawing = false;
  for (const place of line) {
    const point = seen(view, place);
    if (point.facing < 0) {
      drawing = false;
      continue;
    }
    d += `${drawing ? 'L' : 'M'}${(point.x * radius).toFixed(1)} ${(point.y * radius).toFixed(1)}`;
    drawing = true;
  }
  return d;
}

/** How much of a land an outline must be, to help set the size of the land's picture: a hundredth of it. */
export const SHAPE_PART = 0.01;
/** How far outside the box of those outlines another may lie and still be drawn: a share of the box's side. */
export const SHAPE_REACH = 0.1;
/** The room left round the shape in its picture: a share of the picture's side, on every side. */
export const SHAPE_ROOM = 0.06;

/** The shape of a land, alone: its outlines on a flat picture, and the square box that holds them. */
export interface Shape {
  /** From above where it is looked at. Not a view a globe can take: Antarctica is seen from under the world. */
  from: View;
  /** The outlines that are drawn, largest first, in globe radii: x to the right, y down. */
  outlines: [number, number][][];
  /** The square that holds them, with a little room. */
  box: { x: number; y: number; side: number };
}

const areaOf = (outline: readonly (readonly [number, number])[]): number => {
  let twice = 0;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i];
    const b = outline[j];
    if (a && b) twice += b[0] * a[1] - a[0] * b[1];
  }
  return Math.abs(twice) / 2;
};

const boxOf = (outlines: readonly (readonly (readonly [number, number])[])[]) => {
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const outline of outlines) {
    for (const [x, y] of outline) {
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return { left, right, top, bottom };
};

/**
 * The shape of a land by itself: what a child is given, to find that land on the globe. It is the land as it
 * looks from straight above the middle of its largest part, so that it is as little squashed as a land on a ball
 * can be.
 *
 * Not every outline of a land is in its shape. The outlines that are each a hundredth of the land or more set
 * the size of the picture (Australia, New Guinea and the two islands of New Zealand, for Oceania), and of the
 * rest only those that lie in or near that box are drawn. Without this, a few far islands set the size (Svalbard
 * and Franz Josef Land for Europe, Hawaii for Oceania) and the part a land is known by is small in a corner of
 * its own picture. The globe itself leaves nothing out.
 *
 * `rings` are the land's outlines with the largest first, as the atlas keeps them.
 */
export function shapeOf(rings: readonly (readonly LonLat[])[]): Shape {
  // The middle of the largest outline, on the globe itself.
  let x = 0;
  let y = 0;
  let z = 0;
  for (const [lon, lat] of rings[0] ?? []) {
    x += Math.cos(lat * RAD) * Math.sin(lon * RAD);
    y += Math.sin(lat * RAD);
    z += Math.cos(lat * RAD) * Math.cos(lon * RAD);
  }
  const length = Math.hypot(x, y, z);
  const from: View =
    length < 1e-9
      ? { lon: 0, lat: 0 }
      : { lon: Math.atan2(x, z) / RAD, lat: Math.asin(y / length) / RAD };

  const seenFrom = rings
    .map((ring) => outlineSeen(from, ring))
    .filter((outline) => outline.length > 2)
    .map((outline) => ({ outline, area: areaOf(outline) }))
    .sort((a, b) => b.area - a.area);
  const whole = seenFrom.reduce((sum, each) => sum + each.area, 0);

  // The parts that are large enough to be known by; the largest always is.
  const chief = seenFrom
    .filter(({ area }, index) => index === 0 || area >= whole * SHAPE_PART)
    .map(({ outline }) => outline);
  const core = boxOf(chief);
  const reach = Math.max(core.right - core.left, core.bottom - core.top) * SHAPE_REACH;
  const outlines = seenFrom
    .map(({ outline }) => outline)
    .filter((outline) => {
      const own = boxOf([outline]);
      const midX = (own.left + own.right) / 2;
      const midY = (own.top + own.bottom) / 2;
      return (
        midX >= core.left - reach &&
        midX <= core.right + reach &&
        midY >= core.top - reach &&
        midY <= core.bottom + reach
      );
    });

  const all = boxOf(outlines);
  const side = Math.max(all.right - all.left, all.bottom - all.top) / (1 - 2 * SHAPE_ROOM);
  return {
    from,
    outlines,
    box: {
      x: (all.left + all.right) / 2 - side / 2,
      y: (all.top + all.bottom) / 2 - side / 2,
      side,
    },
  };
}

/** How far apart two places are on the disc, in globe radii, when `view` is in the middle of it. */
export function apartOnDisc(view: View, a: LonLat, b: LonLat): number {
  const first = seen(view, a);
  const second = seen(view, b);
  return Math.hypot(first.x - second.x, first.y - second.y);
}

/**
 * How far a place is from a land, in degrees: 0 inside it, else as far as its nearest corner. (The outlines are
 * coarse, and a famous place may stand on a shore or on an island too small to be drawn.)
 */
export function awayFrom(place: LonLat, rings: readonly (readonly LonLat[])[]): number {
  let least = Infinity;
  for (const ring of rings) {
    if (inside(place, ring)) return 0;
    for (const corner of ring) least = Math.min(least, apart(place, corner));
  }
  return least;
}

/** Whether a place is inside an outline, on a flat map: good enough away from the poles and the date line. */
export function inside([lon, lat]: LonLat, ring: readonly LonLat[]): boolean {
  let within = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const crosses =
      a[1] > lat !== b[1] > lat && lon < ((b[0] - a[0]) * (lat - a[1])) / (b[1] - a[1]) + a[0];
    if (crosses) within = !within;
  }
  return within;
}
