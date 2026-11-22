import {
  Sculpture,
  ball,
  block,
  boulder,
  bush,
  flower,
  gable,
  landmass,
  post,
  tree,
  type Vec3,
} from '../kit';
import { fence } from './parts';
import { finish, type Detail, type IslandModel } from './types';

/**
 * Number Garden: three sunflowers as tall as houses, a glasshouse, and three garden beds holding one, two and three
 * pumpkins. Amounts you can see before any numeral.
 */

const STEM: readonly [string, string] = ['#3f9f54', '#7fd66f'];
const PETAL: readonly [string, string] = ['#f2a81d', '#ffe07a'];
const WOOD: readonly [string, string] = ['#a4764d', '#d2a06d'];
const GLASS: readonly [string, string] = ['#8fdccf', '#d9f7f1'];

/** A sunflower's head, facing +z: built once, then placed and tipped towards the viewer. */
function sunflowerHead(size: number) {
  const head = new Sculpture();
  const petals = 13;
  for (let index = 0; index < petals; index++) {
    const angle = (index / petals) * Math.PI * 2;
    head.add(
      ball(0.2 * size, 1, 8),
      { tint: PETAL, glow: 0.12 },
      {
        at: [Math.cos(angle) * 0.4 * size, Math.sin(angle) * 0.4 * size, 0],
        turn: [0, 0, angle],
        size: [1, 0.48, 0.22],
      },
    );
  }
  head.add(ball(0.31 * size, 1, 14), ['#5f3a1e', '#8a5a2c'], { size: [1, 1, 0.34] });
  head.add(ball(0.2 * size, 1, 12), ['#7a4c24', '#a8733a'], {
    at: [0, 0, 0.05 * size],
    size: [1, 1, 0.3],
  });
  return head.build();
}

function sunflower(s: Sculpture, at: Vec3, height: number, size: number, lean: number): void {
  // The stem leans a little, so the three do not stand like fence posts.
  s.add(
    post(0.065 * size, 0.05 * size, height, 8),
    { tint: STEM, sway: 0.4, swayFromBase: true },
    { at, turn: [0, 0, lean] },
  );
  const topX = at[0] - Math.sin(lean) * height;
  const topY = at[1] + Math.cos(lean) * height;
  for (const [up, side] of [
    [0.34, 1],
    [0.52, -1],
    [0.7, 1],
  ] as const) {
    s.add(
      ball(0.24 * size, 1, 8),
      { tint: STEM, sway: 0.4 * up },
      {
        at: [at[0] - Math.sin(lean) * height * up + side * 0.2 * size, at[1] + height * up, at[2]],
        turn: [0, 0, side * 0.5],
        size: [1, 0.3, 0.5],
      },
    );
  }
  s.addPainted(sunflowerHead(size), {
    at: [topX, topY + 0.05, at[2] + 0.06],
    turn: [-0.42, lean * 0.6, 0],
  });
}

/** A raised bed with `count` pumpkins in it. */
function bed(s: Sculpture, at: Vec3, yaw: number, count: number): void {
  s.add(block(0.752, 0.13, 0.492, 0.06), { tint: WOOD, shade: 0.25 }, { at, turn: [0, yaw, 0] });
  s.add(block(0.616, 0.04, 0.356, 0.04), ['#6e4a30', '#8a5f3f'], {
    at: [at[0], at[1] + 0.105, at[2]],
    turn: [0, yaw, 0],
  });
  for (let index = 0; index < count; index++) {
    const along = (index - (count - 1) / 2) * 0.2;
    const x = at[0] + Math.cos(yaw) * along;
    const z = at[2] - Math.sin(yaw) * along;
    s.add(ball(0.095, 0.82, 10), ['#ee7d1e', '#ffb04a'], { at: [x, at[1] + 0.2, z] });
    s.add(post(0.014, 0.012, 0.05, 5), '#3f9f54', { at: [x, at[1] + 0.27, z] });
  }
}

export function buildNumberGarden(detail: Detail): IslandModel {
  const land = landmass({
    radius: 2.0,
    height: 0.42,
    plateau: 0.62,
    cliff: 0.08,
    seed: 2.1,
    wander: 0.11,
    grass: ['#5cb352', '#b4e67e'],
    patches: [
      // A path of pale earth from the beds up to the glasshouse.
      { x: 0.0, z: 0.5, radius: 0.36, tint: '#ecd9a6', strength: 0.85 },
      { x: 0.25, z: 0.05, radius: 0.34, tint: '#ecd9a6', strength: 0.85 },
      { x: 0.6, z: -0.3, radius: 0.34, tint: '#ecd9a6', strength: 0.85 },
    ],
    contacts: [
      { x: -0.45, z: -0.45, radius: 0.75 },
      { x: 0.95, z: -0.55, radius: 0.7 },
      { x: 0.0, z: 1.02, radius: 1.2 },
    ],
  });
  const s = new Sculpture();
  s.addPainted(land.geometry);
  const ground = (x: number, z: number, lift = 0): Vec3 => [x, land.heightAt(x, z) + lift, z];

  // --- The three sunflowers: small, bigger, biggest ---------------------------------------------------------------
  sunflower(s, ground(-1.05, -0.3, -0.03), 0.95, 0.8, 0.1);
  sunflower(s, ground(-0.5, -0.45, -0.03), 1.36, 0.95, -0.05);
  sunflower(s, ground(0.08, -0.6, -0.03), 1.7, 1.1, -0.12);

  // --- The glasshouse ----------------------------------------------------------------------------------------------
  const house = ground(1.0, -0.5, -0.03);
  const yaw = -0.3;
  const turn: Vec3 = [0, yaw, 0];
  s.add(
    block(0.916, 0.14, 0.716, 0.05),
    { tint: ['#e6dcc4', '#fffaf0'], shade: 0.25 },
    { at: house, turn },
  );
  s.add(
    block(0.9, 0.4, 0.7, 0.05),
    { tint: GLASS, glow: 0.18 },
    { at: [house[0], house[1] + 0.13, house[2]], turn },
  );
  s.add(
    gable(0.86, 0.3, 0.66),
    { tint: ['#a8e6dc', '#e8fbf7'], glow: 0.18 },
    { at: [house[0], house[1] + 0.52, house[2]], turn },
  );
  // White glazing bars, and a door.
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const local = (right: number, up: number, out: number): Vec3 => [
    house[0] + cos * right + sin * out,
    house[1] + up,
    house[2] - sin * right + cos * out,
  ];
  for (const right of [-0.4, -0.13, 0.13, 0.4]) {
    s.add(block(0.135, 0.42, 0.135, 0.01), '#fffaf0', { at: local(right, 0.12, 0.3), turn });
  }
  s.add(block(0.916, 0.04, 0.066, 0.015), '#fffaf0', { at: local(0, 0.5, 0.31), turn });
  s.add(block(0.918, 0.045, 0.063, 0.015), '#fffaf0', { at: local(0, 0.8, 0), turn });
  s.add(block(0.29, 0.3, 0.15, 0.06), ['#2f8440', '#6fcf74'], { at: local(0, 0.13, 0.3), turn });
  // Something green growing inside.
  s.add(ball(0.13, 0.9, 8), STEM, { at: local(-0.24, 0.3, 0.05) });
  s.add(ball(0.11, 0.9, 8), STEM, { at: local(0.24, 0.28, 0.0) });

  // --- Three beds: one, two, three ---------------------------------------------------------------------------------
  bed(s, ground(-0.85, 0.98, -0.02), 0.22, 1);
  bed(s, ground(0.0, 1.12, -0.02), 0, 2);
  bed(s, ground(0.85, 0.98, -0.02), -0.22, 3);

  // --- A pond, a fence, an apple tree ------------------------------------------------------------------------------
  const pond = ground(-1.12, 0.42, 0.012);
  s.add(post(0.3, 0.33, 0.03, 18), ['#d8cfb8', '#f3ead2'], {
    at: [pond[0], pond[1] - 0.012, pond[2]],
  });
  s.add(
    post(0.25, 0.25, 0.02, 18),
    { tint: ['#58c6d2', '#9aead9'], glow: 0.2 },
    { at: [pond[0], pond[1] + 0.012, pond[2]] },
  );
  s.add(post(0.07, 0.07, 0.012, 9), '#3f9f54', {
    at: [pond[0] - 0.08, pond[1] + 0.03, pond[2] + 0.05],
  });
  s.add(ball(0.03, 1, 6), '#ff9fc2', { at: [pond[0] - 0.08, pond[1] + 0.05, pond[2] + 0.05] });
  fence(s, ground(-1.58, 0.72), ground(-1.22, 1.34));
  fence(s, ground(1.22, 1.34), ground(1.58, 0.72));
  tree(s, ground(1.42, 0.2), 0.78, undefined, 1.1);
  for (const [x, y, z] of [
    [1.3, 0.62, 0.36],
    [1.56, 0.5, 0.32],
    [1.42, 0.78, 0.42],
  ] as const) {
    s.add(ball(0.055, 1, 7), '#e8473a', { at: [x, land.heightAt(1.42, 0.2) + y, z] });
  }

  // --- Green things and stones --------------------------------------------------------------------------------------
  bush(s, ground(-1.5, -0.55), 0.9);
  bush(s, ground(0.45, -1.3), 0.8);
  boulder(s, [-1.85, 0.0, 0.2], 0.7, undefined, 0.5);
  boulder(s, [1.9, 0.0, -0.45], 0.8, undefined, 1.9);
  if (detail >= 0.5) {
    const blooms: readonly (readonly [number, number, string])[] = [
      [-0.55, 0.42, '#ff6f8f'],
      [-0.32, 0.5, '#ffd35c'],
      [0.42, 0.48, '#ff6f8f'],
      [0.62, 0.36, '#ffffff'],
      [-0.75, 0.06, '#ffffff'],
      [0.5, -0.02, '#ffd35c'],
      [-1.35, -0.1, '#ff9fc2'],
      [1.0, 0.42, '#ff9fc2'],
    ];
    for (const [x, z, tint] of blooms.slice(0, Math.round(blooms.length * detail))) {
      flower(s, ground(x, z), tint, 1.25);
    }
  }

  return finish(s, land);
}
