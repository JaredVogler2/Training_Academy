import {
  Sculpture,
  ball,
  block,
  boulder,
  bush,
  dress,
  landmass,
  mushroom,
  pine,
  post,
  turned,
  type Greens,
  type Vec3,
} from '../kit';
import { finish, type Detail, type IslandModel, type Mover } from './types';

/**
 * Memory Forest: one enormous old tree with a round door and two round windows like an owl's eyes, lanterns in its
 * branches, a ring of toadstools at its feet and fireflies circling it.
 */

const BARK: readonly [string, string] = ['#6b4a3a', '#a57656'];
const DEEP: Greens = { dark: '#23805c', light: '#74d08a', trunk: '#6b4a3a' };
const BLOSSOM: readonly [string, string] = ['#8a6be0', '#cbbcff'];

export function buildMemoryForest(detail: Detail): IslandModel {
  const land = landmass({
    radius: 2.0,
    height: 0.5,
    plateau: 0.6,
    cliff: 0.3,
    seed: 4.4,
    wander: 0.13,
    grass: ['#3f9c63', '#8ad88a'],
    patches: [
      { x: 0.02, z: 0.72, radius: 0.34, tint: '#cdbb8d', strength: 0.7 },
      { x: 0.1, z: 1.1, radius: 0.34, tint: '#cdbb8d', strength: 0.7 },
    ],
    contacts: [
      { x: -0.05, z: -0.2, radius: 1.35 },
      { x: -1.3, z: -0.3, radius: 0.5 },
      { x: 1.35, z: -0.25, radius: 0.5 },
    ],
  });
  const s = new Sculpture();
  s.addPainted(land.geometry);
  const top = land.heightAt(0, 0);
  const ground = (x: number, z: number, lift = 0): Vec3 => [x, land.heightAt(x, z) + lift, z];

  // --- The great tree ----------------------------------------------------------------------------------------------
  const foot: Vec3 = [-0.05, top - 0.04, -0.22];
  s.add(
    turned(
      [
        [0.66, 0],
        [0.52, 0.12],
        [0.43, 0.36],
        [0.39, 0.7],
        [0.37, 1.0],
        [0.42, 1.2],
        [0.5, 1.36],
      ],
      18,
    ),
    { tint: BARK, shade: 0.3 },
    { at: foot },
  );
  // Roots spreading into the grass.
  for (const angle of [0.5, 1.9, 2.9, 4.2, 5.4]) {
    s.add(
      ball(0.2, 0.7, 8),
      { tint: BARK, shade: 0.3 },
      {
        at: [foot[0] + Math.cos(angle) * 0.6, foot[1] + 0.03, foot[2] + Math.sin(angle) * 0.6],
        size: [1.5, 1, 0.8],
        turn: [0, -angle, 0],
      },
    );
  }
  // The door, and the two windows that make the trunk a face.
  s.add(ball(0.2, 1.2, 12), ['#e7d9bd', '#fffaf0'], {
    at: [foot[0] + 0.02, foot[1] + 0.2, foot[2] + 0.45],
    size: [1, 1, 0.3],
  });
  s.add(ball(0.155, 1.2, 12), ['#5b3fb5', '#8a6be0'], {
    at: [foot[0] + 0.02, foot[1] + 0.2, foot[2] + 0.475],
    size: [1, 1, 0.3],
  });
  s.add(ball(0.022, 1, 6), '#ffd35c', { at: [foot[0] + 0.1, foot[1] + 0.22, foot[2] + 0.525] });
  for (const side of [-1, 1]) {
    const eye: Vec3 = [foot[0] + side * 0.18, foot[1] + 0.84, foot[2] + 0.335];
    s.add(ball(0.165, 1, 14), ['#e7d9bd', '#fffaf0'], {
      at: eye,
      turn: [0, side * 0.3, 0],
      size: [1, 1, 0.36],
    });
    s.add(
      ball(0.125, 1, 14),
      { tint: ['#ffb84a', '#ffe9a6'], glow: 0.95 },
      {
        at: [eye[0] + side * 0.008, eye[1], eye[2] + 0.028],
        turn: [0, side * 0.3, 0],
        size: [1, 1, 0.36],
      },
    );
    s.add(ball(0.05, 1, 8), '#4b3527', {
      at: [eye[0] + side * 0.012, eye[1] - 0.01, eye[2] + 0.07],
      size: [1, 1, 0.5],
    });
  }
  // A beak of a knot between them.
  s.add(ball(0.05, 1.3, 8), ['#e9a92c', '#ffd35c'], {
    at: [foot[0], foot[1] + 0.68, foot[2] + 0.42],
    size: [1, 1, 0.7],
  });
  // The crown: broad, in overlapping clumps, lighter where the sun falls.
  const crown: readonly (readonly [number, number, number, number])[] = [
    [0.0, 1.84, 0.0, 0.76],
    [-0.62, 1.6, 0.1, 0.58],
    [0.64, 1.58, 0.06, 0.6],
    [-0.28, 1.66, 0.52, 0.5],
    [0.34, 1.7, 0.48, 0.5],
    [0.05, 1.58, -0.5, 0.54],
    [-0.42, 2.06, -0.06, 0.48],
    [0.44, 2.02, -0.02, 0.48],
  ];
  for (const [x, y, z, r] of crown) {
    s.add(
      ball(r, 0.86, 12),
      { tint: [DEEP.dark, DEEP.light], sway: 0.34 },
      { at: [foot[0] + x, foot[1] + y, foot[2] + z] },
    );
  }
  // Blossom, in the world's own violet.
  const blossom: readonly (readonly [number, number, number])[] = [
    [-0.72, 1.84, 0.44],
    [0.2, 2.24, 0.46],
    [0.82, 1.86, 0.38],
    [-0.2, 2.0, 0.76],
    [0.5, 1.54, 0.84],
    [-0.9, 1.48, 0.34],
    [-0.5, 2.36, 0.16],
    [0.72, 2.24, 0.18],
  ];
  for (const [x, y, z] of blossom.slice(0, Math.max(4, Math.round(blossom.length * detail)))) {
    s.add(
      ball(0.13, 0.8, 8),
      { tint: BLOSSOM, sway: 0.34, glow: 0.2 },
      { at: [foot[0] + x, foot[1] + y, foot[2] + z] },
    );
  }
  // Lanterns hanging under the crown.
  for (const [x, z, drop] of [
    [-0.82, 0.46, 0.36],
    [0.84, 0.42, 0.42],
    [0.5, 0.86, 0.26],
    [-0.46, 0.9, 0.24],
  ] as const) {
    const y = foot[1] + 1.36 - drop;
    s.add(post(0.008, 0.008, drop + 0.1, 4), '#4b3527', {
      at: [foot[0] + x, y + 0.1, foot[2] + z],
    });
    s.add(
      block(0.18, 0.15, 0.18, 0.05),
      { tint: ['#ffb84a', '#ffe9a6'], glow: 0.95, sway: 0.1 },
      { at: [foot[0] + x, y - 0.03, foot[2] + z] },
    );
    s.add(post(0.07, 0.02, 0.04, 6), ['#5b3fb5', '#8a6be0'], {
      at: [foot[0] + x, y + 0.11, foot[2] + z],
    });
  }

  // --- The ring of toadstools: two of each colour, to be matched ---------------------------------------------------
  const caps: readonly (readonly [string, string])[] = [
    ['#d9483b', '#ff7a66'],
    ['#7a5be0', '#b7a3ff'],
    ['#e9a92c', '#ffd35c'],
  ];
  const ring: readonly (readonly [number, number, number, number])[] = [
    [-1.0, 0.72, 1.25, 0],
    [-0.52, 1.14, 1.0, 1],
    [0.62, 1.16, 1.05, 2],
    [1.08, 0.74, 1.3, 0],
    [1.34, 0.22, 0.95, 1],
    [-1.3, 0.2, 0.9, 2],
  ];
  for (const [x, z, size, cap] of ring) {
    mushroom(s, ground(x, z, -0.01), size, caps[cap]);
  }

  // --- Stepping stones, pines, a log --------------------------------------------------------------------------------
  for (const [x, z] of [
    [0.04, 0.62],
    [0.12, 0.92],
    [0.04, 1.24],
  ] as const) {
    s.add(post(0.12, 0.13, 0.03, 9), ['#a9a6b4', '#d5d2dd'], { at: ground(x, z, -0.005) });
  }
  pine(s, ground(-1.32, -0.4), 1.05, DEEP);
  pine(s, ground(1.38, -0.32), 1.0, DEEP);
  pine(s, ground(-0.95, -0.98), 0.78, DEEP);
  pine(s, ground(0.98, -1.0), 0.8, DEEP);
  bush(s, ground(-1.5, 0.52), 0.8, DEEP);
  s.add(
    post(0.11, 0.11, 0.5, 9),
    { tint: BARK, shade: 0.2 },
    { at: ground(1.42, 0.62, 0.09), turn: [Math.PI / 2, 0.6, 0] },
  );
  boulder(s, [1.8, 0.0, -0.75], 0.8, undefined, 0.5);
  boulder(s, [-1.85, 0.0, 0.1], 0.75, undefined, 1.9);

  // --- Fireflies: a slow ring of lights around the tree -------------------------------------------------------------
  const movers: Mover[] = [];
  const flies = new Sculpture();
  const count = detail >= 0.8 ? 7 : 4;
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const radius = 1.05 + (index % 3) * 0.2;
    flies.add(
      ball(0.045, 1, 6),
      { tint: '#f4ff9a', glow: 1 },
      { at: [Math.cos(angle) * radius, 0.35 + ((index * 7) % 5) * 0.2, Math.sin(angle) * radius] },
    );
  }
  movers.push({
    geometry: flies.build(),
    at: [foot[0], foot[1] + 0.3, foot[2]],
    rise: 0.1,
    animate(time, part) {
      part.rotation.y = time * 0.22;
      part.position.y = foot[1] + 0.3 + Math.sin(time * 0.8) * 0.08;
    },
  });

  dress(s, land, {
    tufts: Math.round(13 * detail),
    pebbles: Math.round(6 * detail),
    keepClear: [
      { x: -0.05, z: -0.22, radius: 0.95 },
      { x: 0.08, z: 0.92, radius: 0.36 },
      ...ring.map(([x, z]) => ({ x, z, radius: 0.24 })),
      { x: -1.32, z: -0.4, radius: 0.3 },
      { x: 1.38, z: -0.32, radius: 0.3 },
    ],
    greens: DEEP,
  });

  return finish(s, land, movers);
}
