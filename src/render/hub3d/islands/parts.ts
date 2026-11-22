import {
  Sculpture,
  ball,
  block,
  box,
  cone,
  hull,
  outlineOf,
  post,
  slab,
  type Tint,
  type Vec3,
} from '../kit';
import type { Mover } from './types';

/**
 * Things more than one island has: boats, flags, lamps, fences.
 */

const WOOD: readonly [string, string] = ['#6d4a2f', '#a4764d'];

/** A rowing boat, bow towards +x, floating at y = 0. Returned as its own sculpture so it can bob. */
export function rowBoat(paint: Tint = ['#d9584a', '#ff8f7a'], size = 1): Sculpture {
  const s = new Sculpture();
  s.add(
    hull(0.78 * size, 0.36 * size, 0.2 * size),
    { tint: paint, shade: 0.25 },
    { at: [0, -0.05 * size, 0] },
  );
  // A dark floor a little below the rim reads as the inside of the boat.
  s.add(hull(0.62 * size, 0.24 * size, 0.02 * size), '#5b3a2a', { at: [0, 0.13 * size, 0] });
  s.add(box(0.07 * size, 0.03 * size, 0.3 * size), WOOD, { at: [-0.08 * size, 0.135 * size, 0] });
  s.add(box(0.07 * size, 0.03 * size, 0.24 * size), WOOD, { at: [0.16 * size, 0.135 * size, 0] });
  return s;
}

/**
 * A small sailing boat, bow towards +x: a hull, a mast and two sails.
 * `sail` is the colour of the mainsail; the jib is always cream.
 */
export function sailBoat(
  paint: Tint = ['#2a6fb5', '#62b4f3'],
  sail: Tint = ['#fff1d6', '#ffffff'],
  size = 1,
): Sculpture {
  const s = new Sculpture();
  s.add(
    hull(1.0 * size, 0.42 * size, 0.24 * size),
    { tint: paint, shade: 0.25 },
    { at: [0, -0.06 * size, 0] },
  );
  s.add(hull(0.84 * size, 0.3 * size, 0.02 * size), '#f3e2c4', { at: [0, 0.165 * size, 0] });
  s.add(post(0.022 * size, 0.018 * size, 1.05 * size, 6), WOOD, {
    at: [0.04 * size, 0.16 * size, 0],
  });
  // Mainsail behind the mast, jib in front of it. Thin slabs, so they are lit on both sides.
  s.add(
    slab(
      outlineOf([
        [0, 0],
        [-0.52, 0.02],
        [0, 0.82],
      ]),
      0.02,
      0,
    ),
    { tint: sail, sway: 0.12 },
    { at: [0.02 * size, 0.3 * size, 0], size },
  );
  s.add(
    slab(
      outlineOf([
        [0, 0],
        [0.38, 0],
        [0, 0.62],
      ]),
      0.02,
      0,
    ),
    { tint: ['#fff1d6', '#ffffff'], sway: 0.12 },
    { at: [0.08 * size, 0.28 * size, 0], size },
  );
  s.add(
    slab(
      outlineOf([
        [0, 0],
        [-0.16, 0.045],
        [0, 0.09],
      ]),
      0.015,
      0,
    ),
    { tint: '#ffd35c', sway: 0.35 },
    { at: [0.04 * size, 1.14 * size, 0], size },
  );
  return s;
}

/** Make a floating thing bob and rock gently at its mooring. `phase` keeps neighbours out of step. */
export function bobbing(sculpture: Sculpture, at: Vec3, heading: number, phase = 0): Mover {
  return {
    geometry: sculpture.build(),
    at,
    rise: 0.04,
    animate(time, part) {
      part.position.y = at[1] + Math.sin(time * 1.3 + phase) * 0.028;
      part.rotation.set(
        Math.sin(time * 1.1 + phase * 1.7) * 0.05,
        heading,
        Math.sin(time * 0.9 + phase) * 0.045,
      );
    },
  };
}

/** A flag pole with a pennant the wind keeps moving. `y` is the foot of the pole. */
export function pennant(
  sculpture: Sculpture,
  at: Vec3,
  height: number,
  tint: Tint = '#ffd35c',
  size = 1,
): void {
  sculpture.add(post(0.02, 0.016, height, 5), WOOD, { at });
  sculpture.add(
    slab(
      outlineOf([
        [0, 0],
        [0.38, 0.1],
        [0, 0.22],
      ]),
      0.02,
      0,
    ),
    { tint, sway: 0.5 },
    { at: [at[0] + 0.015, at[1] + height - 0.24 * size, at[2]], size },
  );
}

/** A lamp on a post, lit. */
export function lamp(sculpture: Sculpture, at: Vec3, height = 0.5): void {
  sculpture.add(post(0.025, 0.02, height, 6), ['#4b4f63', '#70748a'], { at });
  sculpture.add(
    block(0.148, 0.12, 0.148, 0.04),
    { tint: ['#ffd98a', '#fff3c4'], glow: 0.8 },
    { at: [at[0], at[1] + height, at[2]] },
  );
  sculpture.add(post(0.075, 0.02, 0.05, 6), ['#4b4f63', '#70748a'], {
    at: [at[0], at[1] + height + 0.12, at[2]],
  });
}

/** A run of picket fence between two points on the ground. */
export function fence(
  sculpture: Sculpture,
  from: Vec3,
  to: Vec3,
  tint: Tint = ['#e9dcc0', '#fffaf0'],
): void {
  const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const heading = -Math.atan2(to[2] - from[2], to[0] - from[0]);
  const pickets = Math.max(3, Math.round(length / 0.13) + 1);
  for (let index = 0; index < pickets; index++) {
    const t = index / (pickets - 1);
    const at: Vec3 = [
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t - 0.01,
      from[2] + (to[2] - from[2]) * t,
    ];
    sculpture.add(box(0.06, 0.2, 0.03), tint, { at, turn: [0, heading, 0] });
    sculpture.add(cone(0.042, 0.06, 4), tint, {
      at: [at[0], at[1] + 0.2, at[2]],
      turn: [0, heading + Math.PI / 4, 0],
    });
  }
  sculpture.add(box(length + 0.04, 0.035, 0.02), tint, {
    at: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 0.1, (from[2] + to[2]) / 2],
    turn: [0, heading, 0],
  });
}

/** A short jetty: planks on posts, from `from` out to `to`, a hand's height above the water. */
export function jetty(sculpture: Sculpture, from: Vec3, to: Vec3, width = 0.4): void {
  const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const heading = Math.atan2(to[2] - from[2], to[0] - from[0]);
  const planks = Math.max(3, Math.round(length / 0.17));
  for (let index = 0; index < planks; index++) {
    const t = (index + 0.5) / planks;
    sculpture.add(
      box(length / planks - 0.025, 0.045, width),
      index % 2 === 0 ? WOOD : ['#7a5536', '#b58355'],
      {
        at: [from[0] + (to[0] - from[0]) * t, 0.15, from[2] + (to[2] - from[2]) * t],
        turn: [0, -heading, 0],
      },
    );
  }
  for (const t of [0.35, 0.95]) {
    for (const side of [-1, 1]) {
      sculpture.add(
        post(0.04, 0.04, 0.5, 6),
        { tint: ['#4f3521', '#8a5f3f'] },
        {
          at: [
            from[0] + (to[0] - from[0]) * t - Math.sin(heading) * side * (width / 2 - 0.02),
            -0.22,
            from[2] + (to[2] - from[2]) * t + Math.cos(heading) * side * (width / 2 - 0.02),
          ],
        },
      );
    }
  }
}

/** A channel buoy: red and white, with a small light on top. Returned as its own sculpture so it can bob. */
export function buoy(): Sculpture {
  const s = new Sculpture();
  s.add(post(0.15, 0.13, 0.1, 10), ['#c94f3b', '#e2604a'], { at: [0, -0.03, 0] });
  s.add(cone(0.12, 0.26, 10), ['#fff1d6', '#ffffff'], { at: [0, 0.07, 0] });
  s.add(post(0.123, 0.09, 0.07, 10), ['#d9533f', '#ff8f7a'], { at: [0, 0.07, 0] });
  s.add(ball(0.04, 1, 7), { tint: '#ffd35c', glow: 0.9 }, { at: [0, 0.35, 0] });
  return s;
}
