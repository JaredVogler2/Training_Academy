import type { BufferGeometry } from 'three';
import { sailBoat } from './islands/parts';
import { Sculpture, ball, boulder, bush, type Tint } from './kit';

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
