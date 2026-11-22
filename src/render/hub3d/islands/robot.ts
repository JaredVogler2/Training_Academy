import {
  Sculpture,
  ball,
  block,
  boulder,
  box,
  bush,
  dress,
  landmass,
  outlineOf,
  pine,
  placer,
  post,
  slab,
  type Vec3,
} from '../kit';
import { lamp } from './parts';
import { finish, type Detail, type IslandModel, type Mover } from './types';

/**
 * Robot Ridge: a workshop shaped like a friendly robot, waving from the top of a rocky ridge, with arrow tiles
 * leading to its door. Its antenna blinks and a cog turns at its side.
 */

const STEEL: readonly [string, string] = ['#3f78b8', '#86c6f5'];
const PALE: readonly [string, string] = ['#6fb0e6', '#bfe4ff'];
const NAVY: readonly [string, string] = ['#1d3557', '#2c4d7c'];
const AMBER: readonly [string, string] = ['#f0a63a', '#ffd35c'];

/** A cog standing upright in the x–y plane, to be turned about z. */
function cog(radius: number, teeth: number, tint: readonly [string, string]): Sculpture {
  const s = new Sculpture();
  s.add(post(radius, radius, 0.09, 18), tint, { turn: [Math.PI / 2, 0, 0], at: [0, 0, -0.045] });
  for (let index = 0; index < teeth; index++) {
    const angle = (index / teeth) * Math.PI * 2;
    s.add(box(radius * 0.36, radius * 0.3, 0.09), tint, {
      at: [Math.cos(angle) * radius * 0.98, Math.sin(angle) * radius * 0.98, 0],
      turn: [0, 0, angle - Math.PI / 2],
    });
  }
  s.add(post(radius * 0.36, radius * 0.36, 0.11, 12), ['#7a4c12', '#b87a1c'], {
    turn: [Math.PI / 2, 0, 0],
    at: [0, 0, -0.055],
  });
  return s;
}

export function buildRobotRidge(detail: Detail): IslandModel {
  const land = landmass({
    radius: 1.95,
    height: 0.74,
    plateau: 0.5,
    cliff: 0.95,
    seed: 3.7,
    wander: 0.14,
    grass: ['#55a98c', '#a3e0a8'],
    rock: '#a9b4cb',
    // A paved yard in front of the door.
    patches: [
      { x: 0.25, z: 0.6, radius: 0.74, tint: '#e3e8f4', strength: 1 },
      { x: 0.0, z: 0.12, radius: 0.5, tint: '#e3e8f4', strength: 1 },
    ],
    contacts: [{ x: -0.1, z: -0.3, radius: 0.92 }],
  });
  const s = new Sculpture();
  s.addPainted(land.geometry);
  const top = land.heightAt(0, 0);
  const ground = (x: number, z: number, lift = 0): Vec3 => [x, land.heightAt(x, z) + lift, z];

  // --- The robot ---------------------------------------------------------------------------------------------------
  const yaw = 0.1;
  const feet: Vec3 = [-0.12, top - 0.03, -0.32];
  const put = placer(feet, yaw);
  const turn: Vec3 = [0, yaw, 0];
  // Body, with a door and three buttons on its chest.
  s.add(block(1.1, 0.66, 0.88, 0.16), { tint: STEEL, shade: 0.3 }, { at: put(0, 0, 0), turn });
  s.add(block(0.4, 0.36, 0.18, 0.12), NAVY, { at: put(-0.2, 0.03, 0.37), turn });
  s.add(block(0.42, 0.2, 0.15, 0.05), PALE, { at: put(0.22, 0.26, 0.37), turn });
  for (const [right, tint] of [
    [0.12, '#ff6a5a'],
    [0.22, '#ffd35c'],
    [0.32, '#6fe08a'],
  ] as const) {
    s.add(ball(0.04, 1, 8), { tint, glow: 0.8 }, { at: put(right, 0.36, 0.41) });
  }
  // Neck and head.
  s.add(post(0.2, 0.2, 0.12, 12), AMBER, { at: put(0, 0.63, 0) });
  s.add(block(1.32, 0.84, 1, 0.24), PALE, { at: put(0, 0.72, 0), turn });
  s.add(block(1.02, 0.5, 0.18, 0.14), NAVY, { at: put(0, 0.9, 0.43), turn });
  // Two big round eyes, each with a glint, and a smile of five small lights.
  for (const right of [-0.24, 0.24]) {
    s.add(
      ball(0.15, 1, 16),
      { tint: ['#ffe27a', '#fffbe0'], glow: 0.95 },
      { at: put(right, 1.22, 0.53), turn, size: [1, 1, 0.3] },
    );
    s.add(
      ball(0.045, 1, 8),
      { tint: '#ffffff', glow: 1 },
      { at: put(right - 0.05, 1.27, 0.57), size: [1, 1, 0.5] },
    );
  }
  for (let index = 0; index < 5; index++) {
    const t = (index - 2) / 2;
    s.add(
      ball(0.042, 1, 8),
      { tint: '#7ff0e0', glow: 0.95 },
      { at: put(t * 0.2, 1.02 - 0.06 * (1 - t * t), 0.53), size: [1, 1, 0.6] },
    );
  }
  // Ears: two dishes.
  for (const side of [-1, 1]) {
    s.add(post(0.17, 0.17, 0.1, 14), AMBER, {
      at: put(side * 0.65, 1.14, 0),
      turn: [0, yaw, Math.PI / 2],
    });
    s.add(ball(0.06, 1, 8), '#ff6a5a', { at: put(side * 0.72, 1.14, 0) });
  }
  // One arm at its side; the other is a mover, raised and waving.
  s.add(block(0.3, 0.5, 0.3, 0.08), STEEL, { at: put(-0.62, 0.08, 0.02), turn });
  s.add(ball(0.13, 1, 10), AMBER, { at: put(-0.62, 0.06, 0.02) });
  s.add(post(0.03, 0.03, 0.4, 6), ['#70748a', '#a9adc0'], { at: put(0, 1.54, 0) });

  const movers: Mover[] = [];
  const arm = new Sculpture();
  arm.add(block(0.3, 0.52, 0.3, 0.08), STEEL, { at: [0, 0, 0] });
  arm.add(ball(0.14, 1, 10), AMBER, { at: [0, 0.6, 0] });
  const shoulder = put(0.6, 0.5, 0.04);
  movers.push({
    geometry: arm.build(),
    at: shoulder,
    animate(time, part) {
      part.rotation.set(0, yaw, -0.5 + Math.sin(time * 2.4) * 0.32);
    },
  });
  // The antenna's light blinks.
  const light = new Sculpture();
  light.add(ball(0.11, 1, 10), { tint: ['#ff5a4a', '#ff9a8a'], glow: 0.9 });
  movers.push({
    geometry: light.build(),
    at: put(0, 1.98, 0),
    animate(time, part) {
      part.scale.setScalar(0.86 + 0.2 * Math.max(0, Math.sin(time * 2.6)));
    },
  });
  // A cog turning against the robot's side, and a smaller one meshed with it.
  const big = put(-0.86, 0.34, 0.3);
  movers.push({
    geometry: cog(0.3, 8, AMBER).build(),
    at: big,
    animate(time, part) {
      part.rotation.set(0, yaw, time * 0.5);
    },
  });
  movers.push({
    geometry: cog(0.18, 6, ['#d9584a', '#ff8f7a']).build(),
    at: [big[0] - 0.4, big[1] - 0.2, big[2] + 0.02],
    animate(time, part) {
      part.rotation.set(0, yaw, -time * 0.5 * (8 / 6) + 0.3);
    },
  });

  // --- Arrow tiles: a path of steps to the door ---------------------------------------------------------------------
  const arrow = () =>
    slab(
      outlineOf([
        [-0.13, -0.05],
        [0.02, -0.05],
        [0.02, -0.13],
        [0.16, 0],
        [0.02, 0.13],
        [0.02, 0.05],
        [-0.13, 0.05],
      ]),
      0.035,
      0.008,
    );
  const tiles: readonly (readonly [number, number, number])[] = [
    [0.55, 1.12, 2.3],
    [0.3, 0.76, 2.0],
    [0.02, 0.44, 1.75],
  ];
  for (const [x, z, heading] of tiles) {
    const at = ground(x, z, 0.0);
    s.add(block(0.38, 0.05, 0.38, 0.07), ['#dfe5f2', '#ffffff'], {
      at,
      turn: [0, heading - Math.PI / 2, 0],
    });
    s.add(
      arrow(),
      { tint: '#ffc23a', glow: 0.25 },
      { at: [at[0], at[1] + 0.065, at[2]], turn: [-Math.PI / 2, 0, -heading] },
    );
  }

  // --- A small helper, lamps, pines and rocks ----------------------------------------------------------------------
  // A small helper on wheels, looking up at the big one.
  const pal = ground(0.98, 0.55, 0.03);
  s.add(block(0.34, 0.26, 0.3, 0.1), PALE, { at: pal, turn: [0, -0.4, 0] });
  s.add(block(0.26, 0.11, 0.06, 0.04), NAVY, {
    at: [pal[0] - 0.06, pal[1] + 0.1, pal[2] + 0.13],
    turn: [0, -0.4, 0],
  });
  for (const side of [-0.05, 0.05]) {
    s.add(
      ball(0.028, 1, 6),
      { tint: '#7ff0e0', glow: 0.95 },
      { at: [pal[0] - 0.075 + side, pal[1] + 0.155, pal[2] + 0.165 + side * 0.4] },
    );
  }
  for (const side of [-1, 1]) {
    s.add(post(0.06, 0.06, 0.05, 10), NAVY, {
      at: [pal[0] + side * 0.15, pal[1] - 0.0, pal[2] + side * 0.07],
      turn: [Math.PI / 2, -0.4, 0],
    });
  }
  s.add(post(0.012, 0.012, 0.14, 5), '#70748a', { at: [pal[0], pal[1] + 0.25, pal[2]] });
  s.add(ball(0.035, 1, 6), { tint: '#ffd35c', glow: 0.8 }, { at: [pal[0], pal[1] + 0.4, pal[2]] });
  lamp(s, ground(-0.85, 0.7), 0.46);
  pine(s, ground(1.05, -0.45), 0.95, { dark: '#2d8a6a', light: '#86d6a2' });
  pine(s, ground(0.72, -0.82), 0.7, { dark: '#2d8a6a', light: '#86d6a2' });
  bush(s, ground(-1.0, 0.1), 0.8, { dark: '#2d8a6a', light: '#86d6a2' });
  boulder(s, [1.7, 0.02, 0.5], 1.1, ['#7d89a6', '#bcc6dc'], 0.5);
  boulder(s, [-1.7, 0.02, -0.5], 1.2, ['#7d89a6', '#bcc6dc'], 1.9);
  boulder(s, [-1.35, 0.02, 1.15], 0.85, ['#7d89a6', '#bcc6dc'], 2.6);
  if (detail >= 0.5) {
    boulder(s, [0.9, 0.02, -1.6], 0.9, ['#7d89a6', '#bcc6dc'], 0.2);
    boulder(s, [1.5, 0.02, -0.95], 0.7, ['#7d89a6', '#bcc6dc'], 3.3);
  }

  dress(s, land, {
    tufts: Math.round(9 * detail),
    pebbles: Math.round(8 * detail),
    keepClear: [
      { x: -0.12, z: -0.32, radius: 1.0 },
      { x: 0.25, z: 0.6, radius: 0.78 },
      { x: 0.0, z: 0.12, radius: 0.52 },
      { x: 1.05, z: -0.45, radius: 0.3 },
    ],
    greens: { dark: '#2d8a6a', light: '#86d6a2' },
  });

  return finish(s, land, movers);
}
