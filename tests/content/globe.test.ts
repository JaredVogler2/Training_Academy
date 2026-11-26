import { describe, expect, it } from 'vitest';
import atlas from '@/content/explorer-harbor/atlas.json';
import {
  SHAPE_PART,
  SHAPE_REACH,
  SHAPE_ROOM,
  TIP_MOST,
  apart,
  between,
  dragged,
  inside,
  lineSeen,
  outlineSeen,
  pathOf,
  seen,
  shapeOf,
  steady,
  viewOf,
  wrap,
  type LonLat,
} from '@/content/explorer-harbor/globe';

const near = (value: number, want: number) => expect(value).toBeCloseTo(want, 6);

/** A square of land, so many degrees across, with its middle at a place. */
const square = (lon: number, lat: number, across: number): LonLat[] => {
  const half = across / 2;
  const side = (from: LonLat, to: LonLat): LonLat[] =>
    Array.from({ length: 10 }, (_, step): LonLat => [
      from[0] + ((to[0] - from[0]) * step) / 10,
      from[1] + ((to[1] - from[1]) * step) / 10,
    ]);
  const corners: LonLat[] = [
    [lon - half, lat - half],
    [lon + half, lat - half],
    [lon + half, lat + half],
    [lon - half, lat + half],
  ];
  return corners.flatMap((corner, index) => side(corner, corners[(index + 1) % 4] ?? corner));
};

describe('where a place is on the disc', () => {
  it('puts the place that is looked at in the middle, squarely facing', () => {
    for (const view of [
      { lon: 0, lat: 0 },
      { lon: 31, lat: 30 },
      { lon: -120, lat: -40 },
    ]) {
      const at = seen(view, [view.lon, view.lat]);
      near(at.x, 0);
      near(at.y, 0);
      near(at.facing, 1);
    }
  });

  it('puts a quarter of the way round on the edge: east to the right, north at the top', () => {
    const view = { lon: 10, lat: 0 };
    const east = seen(view, [100, 0]);
    near(east.x, 1);
    near(east.y, 0);
    near(east.facing, 0);
    const west = seen(view, [-80, 0]);
    near(west.x, -1);
    const north = seen(view, [10, 90]);
    near(north.x, 0);
    near(north.y, -1);
    near(north.facing, 0);
    const south = seen(view, [10, -90]);
    near(south.y, 1);
  });

  it('puts the other side of the world behind', () => {
    near(seen({ lon: 20, lat: 15 }, [-160, -15]).facing, -1);
    expect(seen({ lon: 0, lat: 0 }, [150, 10]).facing).toBeLessThan(0);
  });

  it('brings the pole towards the middle as the globe is tipped towards it', () => {
    const level = seen({ lon: 0, lat: 0 }, [0, -90]);
    const tipped = seen({ lon: 0, lat: -40 }, [0, -90]);
    near(level.facing, 0);
    expect(tipped.facing).toBeGreaterThan(0.6);
    expect(tipped.y).toBeLessThan(level.y);
    // And never anything off the disc.
    for (const lon of [-170, -60, 0, 45, 133]) {
      for (const lat of [-80, -20, 0, 35, 89]) {
        const at = seen({ lon: 12, lat: -33 }, [lon, lat]);
        expect(Math.hypot(at.x, at.y)).toBeLessThanOrEqual(1 + 1e-9);
        near(at.x * at.x + at.y * at.y + at.facing * at.facing, 1);
      }
    }
  });
});

describe('turning the globe', () => {
  it('counts degrees east from -180 to 180', () => {
    expect(wrap(190)).toBe(-170);
    expect(wrap(-190)).toBe(170);
    expect(wrap(540)).toBe(180);
    expect(wrap(-180)).toBe(-180);
    expect(wrap(45)).toBe(45);
  });

  it('is never tipped further than a globe may be', () => {
    expect(steady({ lon: 200, lat: 75 })).toEqual({ lon: -160, lat: TIP_MOST });
    expect(steady({ lon: 0, lat: -90 })).toEqual({ lon: 0, lat: -TIP_MOST });
  });

  it('measures how far apart two places are', () => {
    near(apart([0, 0], [90, 0]), 90);
    near(apart([10, 90], [-70, -90]), 180);
    near(apart([31, 30], [31, 30]), 0);
    near(apart([170, 0], [-170, 0]), 20);
  });

  it('looks at the middle of several places, with every one of them facing', () => {
    const view = viewOf([
      [20, 5],
      [-58, -12],
      [15, 50],
    ]);
    for (const place of [
      [20, 5],
      [-58, -12],
      [15, 50],
    ] as LonLat[]) {
      // Africa, South America and Europe are far apart: each is still more than half way in from the edge.
      expect(seen(view, place).facing).toBeGreaterThan(0.5);
    }
    // Two places either side of a line of longitude: the view is on that line.
    near(
      viewOf([
        [-20, 10],
        [40, 10],
      ]).lon,
      10,
    );
    // Across the date line, the middle is on the date line, not at Greenwich.
    expect(
      Math.abs(
        viewOf([
          [170, 0],
          [-170, 0],
        ]).lon,
      ),
    ).toBeCloseTo(180, 6);
    // Places that cancel out have no middle, and any view will do; and a pole is looked at as tipped as may be.
    expect(
      viewOf([
        [0, 90],
        [0, -90],
      ]),
    ).toEqual({ lon: 0, lat: 0 });
    expect(viewOf([[0, -85]]).lat).toBe(-TIP_MOST);
  });

  it('goes from one view to another the shorter way round', () => {
    const from = { lon: 170, lat: 0 };
    const to = { lon: -170, lat: 20 };
    const half = between(from, to, 0.5);
    expect(Math.abs(half.lon)).toBeCloseTo(180, 6);
    near(half.lat, 10);
    expect(between(from, to, 0)).toEqual(from);
    expect(between(from, to, 1)).toEqual(to);
  });

  it('follows a finger: pulled right the globe turns to show what is west, pulled down what is north', () => {
    const view = { lon: 0, lat: 0 };
    expect(dragged(view, 0.5, 0).lon).toBeLessThan(0);
    expect(dragged(view, -0.5, 0).lon).toBeGreaterThan(0);
    expect(dragged(view, 0, 0.3).lat).toBeGreaterThan(0);
    // The land that was under the finger is under it still: a place at the middle is now half a radius right.
    const after = dragged(view, 0.5, 0);
    expect(seen(after, [0, 0]).x).toBeCloseTo(Math.sin(0.5), 6);
    // And it stops at the most it may be tipped.
    expect(dragged(view, 0, 5).lat).toBe(TIP_MOST);
  });
});

describe('the outline of a land, as much of it as faces us', () => {
  const view = { lon: 0, lat: 0 };

  it('is all there when all of it faces, and not there at all when none does', () => {
    const land = square(10, 10, 30);
    expect(outlineSeen(view, land)).toHaveLength(land.length);
    expect(outlineSeen(view, square(180, 0, 30))).toEqual([]);
    expect(pathOf(view, [square(180, 0, 30)], 100)).toBe('');
  });

  it('is cut at the edge of the disc and joined up along it, in short stretches', () => {
    // A land that straddles the edge: a quarter of the way round, 40 degrees across.
    const points = outlineSeen(view, square(90, 0, 40));
    expect(points.length).toBeGreaterThan(10);
    const onEdge = points.filter(([x, y]) => Math.abs(Math.hypot(x, y) - 1) < 1e-6);
    // Where it goes behind, where it comes back, and the stretch of edge between them.
    expect(onEdge.length).toBeGreaterThanOrEqual(2 + Math.floor(40 / 6) - 1);
    for (const [x, y] of points) {
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(1 + 1e-9);
      // All of it on the right-hand side, where the land is: its near side is 70 degrees round, 20 up or down.
      expect(x).toBeGreaterThan(0.88);
    }
    // No straight stretch along the edge cuts a corner off the sea: each is six degrees of the circle or less.
    for (let index = 1; index < onEdge.length; index++) {
      const [ax, ay] = onEdge[index - 1] ?? [0, 0];
      const [bx, by] = onEdge[index] ?? [0, 0];
      const turn = Math.abs(Math.atan2(by, bx) - Math.atan2(ay, ax)) * (180 / Math.PI);
      expect(turn).toBeLessThanOrEqual(6 + 1e-6);
    }
  });

  it('joins up the shorter way round the edge, for a land at the foot of the globe', () => {
    // A cap round the south pole, seen with the globe tipped a little towards it.
    const cap: LonLat[] = Array.from({ length: 36 }, (_, step): LonLat => [step * 10 - 180, -65]);
    const points = outlineSeen({ lon: 0, lat: -20 }, cap);
    expect(points.length).toBeGreaterThan(8);
    // All of it in the lower part of the disc: nothing is drawn round the top.
    for (const [, y] of points) expect(y).toBeGreaterThan(0.5);
  });

  it('is written as one closed path for each outline, in the units asked for', () => {
    const d = pathOf(view, [square(0, 0, 20), square(40, 20, 10)], 100);
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d.match(/Z/g)).toHaveLength(2);
    // Its first corner, ten degrees west and ten south: a little left of the middle and a little below.
    expect(d.startsWith('M-17.1 17.4L')).toBe(true);
    // Nothing further from the middle than the globe's own radius.
    const numbers = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    expect(Math.max(...numbers.map(Math.abs))).toBeLessThanOrEqual(100);
  });

  it('draws a line round the globe only where it faces, in pieces', () => {
    const equator: LonLat[] = Array.from({ length: 37 }, (_, step): LonLat => [step * 10 - 180, 0]);
    const d = lineSeen(view, equator, 100);
    // One piece, from the left edge to the right edge.
    expect(d.match(/M/g)).toHaveLength(1);
    expect(d.startsWith('M-100.0 0.0')).toBe(true);
    expect(d.endsWith('L100.0 0.0')).toBe(true);
    // Seen from the date line it is the other half of the same line, which this list of places gives in two
    // pieces, since the list begins and ends there.
    expect(lineSeen({ lon: 180, lat: 0 }, equator, 100).match(/M/g)).toHaveLength(2);
  });
});

describe('whether a place is inside an outline', () => {
  it('says so for a square of land', () => {
    const land = square(20, 10, 20);
    expect(inside([20, 10], land)).toBe(true);
    expect(inside([29, 19], land)).toBe(true);
    expect(inside([31, 10], land)).toBe(false);
    expect(inside([20, 21], land)).toBe(false);
    expect(inside([-20, 10], land)).toBe(false);
  });
});

describe('the shape of a land, alone', () => {
  const rings = atlas.continents as unknown as Record<string, LonLat[][]>;
  /** How wide and how tall an outline is, in the picture. */
  const spanOf = (outline: [number, number][]) => {
    const xs = outline.map(([x]) => x);
    const ys = outline.map(([, y]) => y);
    return {
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      bottom: Math.max(...ys),
    };
  };
  /** Whether a place that is on a land in the atlas is on that land's picture too: inside an outline it draws. */
  const drawnAt = (land: string, place: LonLat): boolean => {
    expect(
      (rings[land] ?? []).some((ring) => inside(place, ring)),
      `${place.join(', ')} is on ${land}`,
    ).toBe(true);
    const { from, outlines } = shapeOf(rings[land] ?? []);
    const at = seen(from, place);
    return outlines.some((outline) => inside([at.x, at.y], outline));
  };

  it('is seen from above the middle of its largest part, wherever that is', () => {
    const land = shapeOf([square(20, 10, 20), square(60, 10, 4)]);
    near(land.from.lon, 20);
    expect(Math.abs(land.from.lat - 10)).toBeLessThan(0.2);
    // Antarctica from under the world, which is not a way a globe can be turned.
    const ice = shapeOf(rings.antarctica ?? []);
    expect(ice.from.lat).toBeLessThan(-85);
    expect(ice.from.lat).toBeLessThan(-TIP_MOST);
  });

  it('is held by a square box, with a little room on every side', () => {
    for (const land of Object.keys(rings)) {
      const { outlines, box } = shapeOf(rings[land] ?? []);
      const spans = outlines.map(spanOf);
      const left = Math.min(...spans.map((span) => span.left));
      const right = Math.max(...spans.map((span) => span.right));
      const top = Math.min(...spans.map((span) => span.top));
      const bottom = Math.max(...spans.map((span) => span.bottom));
      const room = box.side * SHAPE_ROOM;
      // Nothing that is drawn is nearer an edge than the room, and the longer way of it is exactly that near.
      expect(left - box.x, land).toBeGreaterThan(room - 1e-9);
      expect(box.x + box.side - right, land).toBeGreaterThan(room - 1e-9);
      expect(top - box.y, land).toBeGreaterThan(room - 1e-9);
      expect(box.y + box.side - bottom, land).toBeGreaterThan(room - 1e-9);
      near(Math.max(right - left, bottom - top), box.side * (1 - 2 * SHAPE_ROOM));
      // And it is in the middle of its box.
      near((left + right) / 2, box.x + box.side / 2);
      near((top + bottom) / 2, box.y + box.side / 2);
    }
  });

  it('has its size set by the parts that are a hundredth of it or more, and leaves out what is far and small', () => {
    const mainland = square(20, 10, 30);
    // A hundredth of the mainland's area is a square a tenth as wide: 3 degrees.
    const far = (across: number) => square(75, 10, across);
    const speck = shapeOf([mainland, far(2)]);
    expect(speck.outlines).toHaveLength(1);
    const part = shapeOf([mainland, far(4)]);
    expect(part.outlines).toHaveLength(2);
    expect(part.box.side).toBeGreaterThan(speck.box.side * 1.5);
    // A speck that is near is drawn all the same, and the box is made to hold it.
    const near2 = shapeOf([mainland, square(37, 10, 2)]);
    expect(near2.outlines).toHaveLength(2);
    expect(near2.box.side).toBeGreaterThan(speck.box.side);
    expect(near2.box.side).toBeLessThan(speck.box.side * 1.2);
    // The largest is drawn first.
    const [first, second] = part.outlines.map(spanOf);
    expect((first?.right ?? 0) - (first?.left ?? 0)).toBeGreaterThan(
      (second?.right ?? 0) - (second?.left ?? 0),
    );
    expect(SHAPE_PART).toBe(0.01);
    expect(SHAPE_REACH).toBe(0.1);
  });

  it('shows each of the seven lands large: its largest part is most of the picture', () => {
    const drawn = Object.fromEntries(
      Object.keys(rings).map((land) => {
        const { outlines, box } = shapeOf(rings[land] ?? []);
        const [largest] = outlines.map(spanOf);
        const across = Math.max(
          (largest?.right ?? 0) - (largest?.left ?? 0),
          (largest?.bottom ?? 0) - (largest?.top ?? 0),
        );
        expect(across / box.side, land).toBeGreaterThan(0.6);
        return [land, `${String(outlines.length)} of ${String(rings[land]?.length ?? 0)}`];
      }),
    );
    expect(drawn).toEqual({
      africa: '2 of 2',
      antarctica: '8 of 8',
      asia: '37 of 37',
      europe: '10 of 14',
      'north-america': '40 of 41',
      oceania: '14 of 17',
      'south-america': '3 of 3',
    });
  });

  it('keeps New Zealand in Oceania and Iceland in Europe, and leaves Hawaii and Svalbard to the globe', () => {
    expect(drawnAt('oceania', [172.5, -43.5])).toBe(true);
    expect(drawnAt('oceania', [176, -38.7])).toBe(true);
    expect(drawnAt('oceania', [-155.5, 19.6])).toBe(false);
    expect(drawnAt('europe', [-19, 65])).toBe(true);
    expect(drawnAt('europe', [-1.9, 52.5])).toBe(true);
    expect(drawnAt('europe', [16, 78.5])).toBe(false);
    // Nothing is left out of a land that is all in one place.
    expect(drawnAt('africa', [47.5, -18.9])).toBe(true);
  });
});
