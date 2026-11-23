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
  project,
  visibleDepth,
  type Box,
} from '@/render/archipelago';

/** Screens the game must fit, as [width, height, height of the top bar]. */
const SCREENS: readonly (readonly [string, number, number, number])[] = [
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
];

const freeOf = (width: number, height: number, bar: number): Box => ({
  left: 0,
  top: bar,
  width,
  height: height - bar,
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

describe.each(SCREENS)('fitting %s', (_name, width, height, bar) => {
  const stage = { width, height };
  const free = freeOf(width, height, bar);
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
      expect(box.width, place).toBeGreaterThanOrEqual(96);
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
    const boxes = spots.map((spot) => spot.box);
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
