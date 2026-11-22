import { describe, expect, it } from 'vitest';
import { WORLD_IDS } from '@/engine';
import {
  EXTENTS,
  MAX_SCALE,
  PLACES,
  arrange,
  drawnBoxes,
  frameFor,
  hotspotFor,
  labelRoom,
  project,
  shadowBounds,
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
    // Either one direction is nearly full, or the islands have reached their largest size.
    expect(fill > 0.9 || frame.scale >= MAX_SCALE - 0.01).toBe(true);
    // And the other direction is not mostly empty.
    expect(Math.min(across / free.width, down / free.height)).toBeGreaterThan(0.55);
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

describe('the patch the shadows must cover', () => {
  it('holds every island with room to spare', () => {
    for (const aspect of [0.5, 0.8, 1.4, 2.2]) {
      const layout = arrange(aspect);
      const { centre, reach } = shadowBounds(layout);
      for (const place of PLACES) {
        const spot = layout.spots[place];
        expect(Math.abs(spot.x - centre.x) + EXTENTS[place].radius).toBeLessThan(reach);
        expect(Math.abs(spot.z - centre.z) + EXTENTS[place].radius).toBeLessThan(reach);
      }
    }
  });
});
