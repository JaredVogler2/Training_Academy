import { describe, expect, it } from 'vitest';
import { WORLD_IDS } from '@/engine';
import {
  EXTENTS,
  MAX_SCALE,
  PLACES,
  aloft,
  arrange,
  drawnBoxes,
  frameFor,
  guideBox,
  labelBox,
  hotspotFor,
  labelRoom,
  labelSize,
  labelWidth,
  project,
  visibleDepth,
  type Box,
} from '@/render/archipelago';

/** What a notch (at each side, on a phone held sideways) and a home bar take from the screen, in CSS pixels. */
interface Taken {
  sides?: number;
  bottom?: number;
}

/**
 * Screens the game must fit, as [name, width, height, height of the top bar], then — for the few that have them —
 * what the phone itself takes from the edges, and the narrowest an island's tap area may be there if not 96 pixels.
 */
type Screen = readonly [string, number, number, number, Taken?, number?];

const SCREENS: readonly Screen[] = [
  ['phone 390×844', 390, 844, 64],
  ['small phone 360×740', 360, 740, 64],
  ['tiny phone 320×568', 320, 568, 64],
  ['phone on its side 844×390', 844, 390, 52],
  ['small phone on its side 667×375', 667, 375, 52],
  ['tablet 768×1024', 768, 1024, 64],
  ['tablet on its side 1024×768', 1024, 768, 64],
  ['laptop 1366×768', 1366, 768, 64],
  ['desktop 1920×1080', 1920, 1080, 64],
  ['square window 900×900', 900, 900, 64],
  // What a phone's browser actually gives a page while its own bars are showing: a good deal less than the screen.
  ['iPhone 13 in Safari 390×664', 390, 664, 64],
  ['iPhone SE in Safari 375×553', 375, 553, 64],
  ['iPhone 13 on its side in Safari 750×342', 750, 342, 52],
  ['iPhone SE on its side in Safari 667×331', 667, 331, 52],
  ['Pixel 7 in Chrome 412×839', 412, 839, 64],
  ['Pixel 7 on its side in Chrome 863×360', 863, 360, 52],
  ['small Android in Chrome 360×592', 360, 592, 64],
  ['iPad in Safari 810×1010', 810, 1010, 64],
  // A phone on its side as it really is. An iPhone gives the page its whole screen, and says how much of each side
  // the notch needs and how much of the bottom the home bar does; the game keeps out of both.
  [
    'iPhone 13 on its side, inside its notch and home bar 844×342',
    844,
    342,
    52,
    { sides: 47, bottom: 21 },
  ],
  [
    'iPhone 15 on its side, inside its notch and home bar 852×345',
    852,
    345,
    52,
    { sides: 59, bottom: 21 },
  ],
  // The smallest iPhone with a notch: 254 pixels of height are left, and an island is 90 wide by 112 high.
  [
    'iPhone 13 mini on its side, inside its notch and home bar 812×327',
    812,
    327,
    52,
    { sides: 50, bottom: 21 },
    90,
  ],
  // An Android phone 360 pixels wide, the commonest size there is, has 360 of height on its side; the status bar
  // and Chrome's own bar leave a page 280 of them, or about 264 where a gesture bar is kept clear as well.
  ['Galaxy A on its side in Chrome 800×280', 800, 280, 52],
  ['Galaxy A on its side in Chrome, above a gesture bar 800×264', 800, 264, 52],
  ['Pixel 7 on its side in Chrome 915×332', 915, 332, 52],
  // The narrowest of them: seven places side by side in 640 pixels are 81 wide each, by 103 high.
  ['small Android on its side in Chrome 640×256', 640, 256, 52, {}, 80],
];

const freeOf = (width: number, height: number, bar: number, taken: Taken = {}): Box => ({
  left: taken.sides ?? 0,
  top: bar,
  width: width - 2 * (taken.sides ?? 0),
  height: height - bar - (taken.bottom ?? 0),
});

const overlap = (a: Box, b: Box): number => {
  const across = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const down = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return across > 0 && down > 0 ? across * down : 0;
};

describe('choosing an arrangement', () => {
  it('goes from stepping stones on a tall phone to a broad ring on a wide screen', () => {
    expect(arrange(390 / 780).arrangement).toBe('tall');
    expect(arrange(768 / 960).arrangement).toBe('upright');
    expect(arrange(900 / 836).arrangement).toBe('upright');
    expect(arrange(1024 / 704).arrangement).toBe('ring');
    expect(arrange(1366 / 704).arrangement).toBe('wide');
    expect(arrange(844 / 338).arrangement).toBe('wide');
  });

  it('stands the places side by side on a very flat screen, where that draws them larger', () => {
    // A common Android phone on its side: 212 pixels are left under the top bar.
    const flat = frameFor({ width: 800, height: 264 }, freeOf(800, 264, 52));
    expect(flat.layout.arrangement).toBe('strip');
    // One row, in teaching order from left to right, the lighthouse in the middle of it.
    const across = WORLD_IDS.map((world) => hotspotFor(flat, world).anchor.x);
    expect([...across].sort((a, b) => a - b)).toEqual(across);
    const level = hotspotFor(flat, 'academy').anchor.y;
    for (const world of WORLD_IDS) expect(hotspotFor(flat, world).anchor.y).toBeCloseTo(level, 6);
    expect(hotspotFor(flat, 'academy').anchor.x).toBeCloseTo(400, 6);
    expect(across.filter((x) => x < 400)).toHaveLength(3);

    // Where the low ring is as good or better, it stays: a taller phone on its side, a laptop.
    for (const [width, height, bar] of [
      [844, 390, 52],
      [750, 342, 52],
      [1366, 768, 64],
    ] as const) {
      const frame = frameFor({ width, height }, freeOf(width, height, bar));
      expect(frame.layout.arrangement, `${String(width)}×${String(height)}`).toBe('wide');
    }
  });

  it('moors the guide in front of the lighthouse in a row, just clear of its island', () => {
    for (const [width, height] of [
      [640, 256],
      [800, 264],
      [1400, 420],
    ] as const) {
      const frame = frameFor({ width, height }, freeOf(width, height, 52));
      expect(frame.layout.arrangement).toBe('strip');
      const guide = guideBox(frame);
      const [island] = drawnBoxes(frame, 'academy');
      expect(guide.left + guide.width / 2).toBeCloseTo(island.left + island.width / 2, 6);
      expect(guide.top - (island.top + island.height)).toBeCloseTo(4, 6);
    }
  });

  it('places all seven places, each in its own spot', () => {
    for (const aspect of [0.4, 0.5, 0.7, 0.9, 1.1, 1.3, 1.6, 2, 2.6]) {
      const { spots } = arrange(aspect);
      expect(Object.keys(spots).sort()).toEqual([...PLACES].sort());
      const seen = new Set(
        PLACES.map((place) => `${String(spots[place].x)},${String(spots[place].z)}`),
      );
      expect(seen.size).toBe(PLACES.length);
    }
  });
});

/** The same list with nothing left out, so that each row has one shape. */
const FITTED = SCREENS.map(
  ([name, width, height, bar, taken = {}, narrowest = 96]) =>
    [name, width, height, bar, taken, narrowest] as const,
);

describe.each(FITTED)('fitting %s', (_name, width, height, bar, taken, narrowest) => {
  const stage = { width, height };
  const free = freeOf(width, height, bar, taken);
  const frame = frameFor(stage, free);
  const spots = PLACES.map((place) => hotspotFor(frame, place));
  const worlds = spots.filter((spot) => spot.place !== 'academy');

  it('keeps every place inside the free part of the screen', () => {
    for (const { place, box } of spots) {
      expect(box.left, place).toBeGreaterThanOrEqual(free.left - 0.5);
      expect(box.left + box.width, place).toBeLessThanOrEqual(free.left + free.width + 0.5);
      expect(box.top, place).toBeGreaterThanOrEqual(free.top - 0.5);
      expect(box.top + box.height, place).toBeLessThanOrEqual(free.top + free.height + 0.5);
    }
  });

  it('gives every world a tap area a small child can hit', () => {
    for (const { place, box } of worlds) {
      expect(box.width, place).toBeGreaterThanOrEqual(narrowest);
      expect(box.height, place).toBeGreaterThanOrEqual(96);
    }
  });

  it('never lets two tap areas overlap', () => {
    for (const [index, one] of worlds.entries()) {
      for (const other of worlds.slice(index + 1)) {
        expect(overlap(one.box, other.box), `${one.place} and ${other.place}`).toBe(0);
      }
    }
  });

  it('keeps the lighthouse clear of every tap area', () => {
    for (const world of worlds) {
      for (const box of drawnBoxes(frame, 'academy')) {
        expect(overlap(world.box, box), world.place).toBe(0);
      }
    }
  });

  it('uses the screen: the islands are as large as the space allows', () => {
    // Everything that is drawn for the child to see: the places, and the guide (who, where the places stand in
    // one row, is moored below it).
    const boxes = [...spots.map((spot) => spot.box), guideBox(frame)];
    const across =
      Math.max(...boxes.map((box) => box.left + box.width)) -
      Math.min(...boxes.map((box) => box.left));
    const down =
      Math.max(...boxes.map((box) => box.top + box.height)) -
      Math.min(...boxes.map((box) => box.top));
    const fill = Math.max(across / free.width, down / free.height);
    // Either one direction is nearly full, or the islands have reached their largest size. (On the shortest
    // screens, a phone on its side with the browser's bars showing, the name tags are at their smallest size and
    // take a little more of the height: 0.89 there, 0.9 and more everywhere else.)
    expect(fill > 0.88 || frame.scale >= MAX_SCALE - 0.01).toBe(true);
    // And the other direction is not mostly empty.
    expect(Math.min(across / free.width, down / free.height)).toBeGreaterThan(0.55);
  });

  it('moors the guide in open water, at a size a child can tap', () => {
    const guide = guideBox(frame);
    expect(guide.width).toBeGreaterThanOrEqual(64);
    expect(guide.height).toBeGreaterThanOrEqual(64);
    expect(guide.left).toBeGreaterThanOrEqual(free.left - 0.5);
    expect(guide.left + guide.width).toBeLessThanOrEqual(free.left + free.width + 0.5);
    expect(guide.top).toBeGreaterThanOrEqual(free.top - 0.5);
    expect(guide.top + guide.height).toBeLessThanOrEqual(free.top + free.height + 0.5);
    for (const world of worlds) {
      expect(overlap(world.box, guide), `the guide and ${world.place}`).toBe(0);
    }
    for (const box of drawnBoxes(frame, 'academy')) {
      expect(overlap(box, guide), 'the guide and the lighthouse').toBe(0);
    }
  });

  it('floats boats and rocks clear of every island, every name and the guide', () => {
    const { boats, rocks } = frame.layout.extras;
    // What one of them covers on screen: a little more across than up.
    const around = (spot: { x: number; z: number }, reach: number): Box => {
      const at = project(frame, spot.x, 0, spot.z);
      return {
        left: at.x - reach * frame.scale,
        top: at.y - reach * 0.9 * frame.scale,
        width: reach * 2 * frame.scale,
        height: reach * 1.3 * frame.scale,
      };
    };
    const floating = [
      // A boat wanders: allow for the whole of its course.
      ...boats.map((boat) => ({ name: 'a boat', box: around(boat, 1.25) })),
      ...rocks.map((rock) => ({ name: 'a rock', box: around(rock, 0.75) })),
    ];
    const guide = guideBox(frame);
    for (const { name, box } of floating) {
      expect(overlap(box, guide), `${name} and the guide`).toBe(0);
      for (const place of PLACES) {
        for (const drawn of drawnBoxes(frame, place)) {
          expect(overlap(box, drawn), `${name} and ${place}`).toBe(0);
        }
        if (place !== 'academy') {
          expect(overlap(box, labelBox(frame, place)), `${name} and the name of ${place}`).toBe(0);
        }
      }
    }
  });

  it('keeps clouds off the islands and their names', () => {
    for (const cloud of frame.layout.extras.clouds) {
      const at = project(frame, cloud.x, 0, cloud.z);
      // A cloud drifts a little either way.
      const box: Box = {
        left: at.x - 2 * frame.scale,
        top: at.y - 0.8 * frame.scale,
        width: 4 * frame.scale,
        height: 1.5 * frame.scale,
      };
      for (const place of PLACES) {
        for (const drawn of drawnBoxes(frame, place)) {
          expect(overlap(box, drawn), `a cloud and ${place}`).toBe(0);
        }
        if (place !== 'academy') {
          expect(overlap(box, labelBox(frame, place)), `a cloud and the name of ${place}`).toBe(0);
        }
      }
    }
  });

  it('agrees with itself: the camera target lands in the middle of the stage', () => {
    const centre = project(frame, frame.target.x, 0, frame.target.z);
    expect(centre.x).toBeCloseTo(width / 2, 6);
    expect(centre.y).toBeCloseTo(height / 2, 6);
  });
});

describe('the tap areas', () => {
  const frame = frameFor({ width: 390, height: 844 }, freeOf(390, 844, 64));

  it('cover the island, its landmark and its name', () => {
    for (const world of WORLD_IDS) {
      const spot = hotspotFor(frame, world);
      const extent = EXTENTS[world];
      expect(spot.span).toBeCloseTo(extent.radius * 2 * frame.scale, 6);
      expect(spot.anchor.y).toBeGreaterThan(spot.box.top);
      expect(spot.box.top + spot.box.height - spot.anchor.y).toBeGreaterThan(
        labelRoom(frame.scale),
      );
    }
  });

  it('put a taller thing higher on the screen and a nearer thing lower', () => {
    const base = project(frame, 0, 0, 0);
    expect(project(frame, 0, 2, 0).y).toBeLessThan(base.y);
    expect(project(frame, 0, 0, 3).y).toBeGreaterThan(base.y);
    expect(project(frame, 1, 0, 0).x - base.x).toBeCloseTo(frame.scale, 6);
  });
});

describe('names under the islands', () => {
  it('are set in type sized from the islands, between 12 and 17 pixels', () => {
    expect(labelSize(10)).toBe(12);
    expect(labelSize(30)).toBeCloseTo(13.5, 1);
    expect(labelSize(92)).toBe(17);
    expect(labelRoom(20)).toBeLessThan(labelRoom(60));
  });

  it('may overhang their island a little where there is room, but never as far as a neighbour’s name', () => {
    // On a laptop the islands stand well apart: a name may be a sixth wider than its island on each side.
    const roomy = frameFor({ width: 1366, height: 768 }, freeOf(1366, 768, 64));
    for (const world of ['inventor-island', 'reading-cove'] as const) {
      const { box } = hotspotFor(roomy, world);
      expect(labelWidth(roomy, world)).toBeCloseTo(box.width * 1.32, 6);
    }
    // Side by side in a row there is little water between them, and each name keeps to its own half of it.
    for (const [width, height] of [
      [640, 256],
      [800, 264],
    ] as const) {
      const row = frameFor({ width, height }, freeOf(width, height, 52));
      const names = WORLD_IDS.map((world) => {
        const { anchor } = hotspotFor(row, world);
        const wide = labelWidth(row, world);
        return { left: anchor.x - wide / 2, right: anchor.x + wide / 2 };
      });
      for (const [index, name] of names.entries()) {
        const next = names[index + 1];
        if (next) expect(next.left - name.right).toBeGreaterThanOrEqual(2 - 1e-6);
      }
    }
  });

  it('sit directly under their island, as wide as the island', () => {
    const frame = frameFor({ width: 1366, height: 768 }, freeOf(1366, 768, 64));
    for (const world of WORLD_IDS) {
      const spot = hotspotFor(frame, world);
      const name = labelBox(frame, world);
      expect(name.left).toBeCloseTo(spot.box.left, 6);
      expect(name.width).toBeCloseTo(spot.box.width, 6);
      expect(name.top + name.height).toBeCloseTo(spot.box.top + spot.box.height, 6);
    }
  });
});

describe('things in the air', () => {
  it('are seen exactly above the point on the water they are said to be over', () => {
    const frame = frameFor({ width: 1024, height: 768 }, freeOf(1024, 768, 64));
    const over = { x: 3, z: -4 };
    const up = aloft(over, 5);
    const seen = project(frame, up.x, up.y, up.z);
    const below = project(frame, over.x, 0, over.z);
    expect(seen.x).toBeCloseTo(below.x, 6);
    expect(seen.y).toBeCloseTo(below.y, 6);
  });

  it('know the far and near edges of what is on screen', () => {
    const frame = frameFor({ width: 390, height: 844 }, freeOf(390, 844, 64));
    const { far, near } = visibleDepth(frame);
    expect(project(frame, 0, 0, far).y).toBeCloseTo(0, 6);
    expect(project(frame, 0, 0, near).y).toBeCloseTo(844, 6);
    expect(far).toBeLessThan(near);
  });
});
