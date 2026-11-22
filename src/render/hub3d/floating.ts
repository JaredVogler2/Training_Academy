import type { BufferGeometry } from 'three';
import { sailBoat } from './islands/parts';
import { Sculpture, ball, boulder, bush, cone, outlineOf, slab, type Tint } from './kit';

/**
 * The shapes of what floats and drifts between the islands: sailing boats in three liveries, rocks, clouds.
 */

export const BOAT_PAINTS: readonly (readonly [Tint, Tint])[] = [
  [
    ['#d9584a', '#ff8f7a'],
    ['#fff1d6', '#ffffff'],
  ],
  [
    ['#2a6fb5', '#62b4f3'],
    ['#ffd98a', '#fff3c4'],
  ],
  [
    ['#17807d', '#4fcfc4'],
    ['#ffd6cc', '#fff1ec'],
  ],
];

export function boatShape(variant: number): BufferGeometry {
  const [paint, sail] = BOAT_PAINTS[variant % BOAT_PAINTS.length] ?? [undefined, undefined];
  return sailBoat(paint, sail, 0.92).build();
}

export function cloudShape(): BufferGeometry {
  const s = new Sculpture();
  const puffs: readonly (readonly [number, number, number, number])[] = [
    [0, 0.1, 0, 0.62],
    [0.62, 0.02, 0.05, 0.46],
    [-0.6, 0.0, -0.02, 0.44],
    [0.24, 0.3, -0.1, 0.42],
    [-0.22, 0.26, 0.12, 0.38],
    [1.05, -0.06, 0.0, 0.3],
    [-1.0, -0.07, 0.03, 0.28],
  ];
  for (const [x, y, z, r] of puffs) {
    s.add(ball(r, 0.7, 14), { tint: ['#dbe8fb', '#ffffff'], glow: 0.3 }, { at: [x, y, z] });
  }
  return s.build();
}

/** The part of the sea a rock takes up, for the water's foam and shallows. */
export const ROCK_SHORE = { dx: 0.04, dz: 0.06, radius: 0.5, wander: 0.1, height: 0.9 };

export function rocksShape(rocks: readonly { x: number; z: number }[]): BufferGeometry | null {
  if (rocks.length === 0) return null;
  const s = new Sculpture();
  for (const [index, rock] of rocks.entries()) {
    boulder(s, [rock.x, 0.02, rock.z], 1.35, ['#7f8aa3', '#c3c9d8'], index * 1.3);
    boulder(s, [rock.x + 0.34, -0.03, rock.z + 0.14], 0.8, ['#7f8aa3', '#b9c0d1'], index + 0.7);
    boulder(s, [rock.x - 0.26, -0.05, rock.z + 0.2], 0.6, ['#8791a9', '#c3c9d8'], index + 2.2);
    bush(s, [rock.x - 0.02, 0.2, rock.z - 0.02], 0.62);
  }
  return s.build();
}

/** A gull's body, beak towards +x. Its wings are separate so they can beat. */
export function gullBody(): BufferGeometry {
  const s = new Sculpture();
  s.add(ball(0.075, 1, 8), { tint: ['#dfe6f2', '#ffffff'], glow: 0.25 }, { size: [2.3, 0.9, 1] });
  s.add(ball(0.06, 1, 8), { tint: '#ffffff', glow: 0.25 }, { at: [0.16, 0.03, 0] });
  s.add(cone(0.022, 0.07, 5), '#f0a63a', { at: [0.2, 0.03, 0], turn: [0, 0, -Math.PI / 2] });
  s.add(ball(0.04, 1, 6), ['#8792ac', '#b9c0d1'], { at: [-0.19, 0.0, 0], size: [1.6, 0.5, 1] });
  return s.build();
}

/** One wing, hinged along the body at its own origin and reaching out to +z (`side` 1) or −z (`side` −1). */
export function gullWing(side: 1 | -1): BufferGeometry {
  const s = new Sculpture();
  s.add(
    slab(
      outlineOf([
        [0.09, 0],
        [-0.07, 0],
        [-0.12, 0.3],
        [-0.06, 0.46],
        [0.02, 0.3],
      ]),
      0.014,
      0,
    ),
    { tint: ['#c9d2e3', '#ffffff'], glow: 0.25 },
    { turn: [(side * Math.PI) / 2, 0, 0] },
  );
  return s.build();
}
