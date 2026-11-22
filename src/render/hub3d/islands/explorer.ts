import {
  Sculpture,
  ball,
  block,
  boulder,
  box,
  bush,
  cone,
  gable,
  hull,
  landmass,
  outlineOf,
  palm,
  post,
  slab,
  stone,
  type Vec3,
} from '../kit';
import { bobbing, jetty, pennant } from './parts';
import { finish, type Detail, type IslandModel, type Mover } from './types';

/**
 * Explorer Harbor: a ship with striped sails moored at the quay, a lookout tower with a telescope, a signpost
 * pointing every way at once, a tent and a treasure chest. Stories, and the wide world.
 */

const TEAL: readonly [string, string] = ['#17807d', '#4fcfc4'];
const WOOD: readonly [string, string] = ['#7a4f33', '#b88558'];
const SAIL: readonly [string, string] = ['#fff1d6', '#ffffff'];
const ROCK: readonly [string, string] = ['#8a8f9f', '#c6cad6'];

/** The ship, bow towards +x, afloat at y = 0. */
function ship(): Sculpture {
  const s = new Sculpture();
  s.add(hull(1.62, 0.6, 0.4), { tint: WOOD, shade: 0.25 }, { at: [0, -0.1, 0] });
  s.add(hull(1.66, 0.64, 0.09), TEAL, { at: [0, 0.22, 0] });
  s.add(hull(1.4, 0.46, 0.02), ['#e9d3a0', '#f6e6bd'], { at: [0, 0.31, 0] });
  // A cabin at the stern with a lit window.
  s.add(block(0.44, 0.2, 0.42, 0.05), TEAL, { at: [-0.5, 0.3, 0] });
  s.add(block(0.416, 0.04, 0.396, 0.03), WOOD, { at: [-0.5, 0.49, 0] });
  s.add(
    ball(0.055, 1, 8),
    { tint: '#ffe9a6', glow: 0.85 },
    { at: [-0.5, 0.4, 0.17], size: [1, 1, 0.4] },
  );
  // Two masts.
  s.add(post(0.03, 0.022, 1.5, 6), WOOD, { at: [0.1, 0.3, 0] });
  s.add(post(0.026, 0.02, 1.08, 6), WOOD, { at: [0.6, 0.3, 0] });
  // The mainsail in four stripes; the foresail plain; a jib to the bowsprit.
  const stripes = 4;
  for (let index = 0; index < stripes; index++) {
    const low = index / stripes;
    const high = (index + 1) / stripes;
    const widthAt = (t: number) => 0.74 * (1 - t * 0.78);
    s.add(
      slab(
        outlineOf([
          [0, low * 1.2],
          [-widthAt(low), low * 1.2 + 0.03],
          [-widthAt(high), high * 1.2 + 0.03],
          [0, high * 1.2],
        ]),
        0.02,
        0,
      ),
      { tint: index % 2 === 0 ? TEAL : SAIL, sway: 0.1 },
      { at: [0.08, 0.5, 0] },
    );
  }
  s.add(
    slab(
      outlineOf([
        [0, 0],
        [-0.4, 0.03],
        [-0.1, 0.78],
        [0, 0.8],
      ]),
      0.02,
      0,
    ),
    { tint: SAIL, sway: 0.1 },
    { at: [0.58, 0.5, 0] },
  );
  s.add(
    slab(
      outlineOf([
        [0, 0],
        [0.42, 0],
        [0, 0.7],
      ]),
      0.02,
      0,
    ),
    { tint: SAIL, sway: 0.1 },
    { at: [0.64, 0.46, 0] },
  );
  s.add(post(0.018, 0.014, 0.5, 5), WOOD, { at: [0.72, 0.36, 0], turn: [0, 0, -1.3] });
  // A long pennant at the masthead.
  s.add(
    slab(
      outlineOf([
        [0, 0],
        [-0.34, 0.05],
        [0, 0.12],
      ]),
      0.016,
      0,
    ),
    { tint: '#ffd35c', sway: 0.4 },
    { at: [0.09, 1.72, 0] },
  );
  return s;
}

export function buildExplorerHarbor(detail: Detail): IslandModel {
  const land = landmass({
    radius: 1.95,
    height: 0.46,
    plateau: 0.5,
    cliff: 0.5,
    seed: 6.6,
    wander: 0.15,
    grass: ['#52ad7c', '#a8e6a0'],
    rock: '#a9a6b4',
    patches: [
      { x: 0.3, z: 0.95, radius: 0.95, tint: '#f6dfa6', strength: 1 },
      { x: -0.7, z: 0.85, radius: 0.6, tint: '#f6dfa6', strength: 0.9 },
    ],
    contacts: [
      { x: 0.75, z: -0.5, radius: 0.7 },
      { x: -0.85, z: -0.5, radius: 0.75 },
    ],
  });
  const s = new Sculpture();
  s.addPainted(land.geometry);
  const ground = (x: number, z: number, lift = 0): Vec3 => [x, land.heightAt(x, z) + lift, z];

  // --- The ship at the quay ----------------------------------------------------------------------------------------
  const quay = Math.PI / 2 + 0.1;
  const shore = land.shoreAt(quay);
  const outwards = (distance: number, side = 0): Vec3 => [
    Math.cos(quay) * distance - Math.sin(quay) * side,
    0,
    Math.sin(quay) * distance + Math.cos(quay) * side,
  ];
  jetty(s, outwards(shore - 0.34), outwards(Math.min(shore + 0.02, 1.62)), 0.36);
  const berth = outwards(Math.min(shore + 0.02, 1.62), 0.0);
  const movers: Mover[] = [
    bobbing(ship(), [berth[0] + 0.12, 0.03, Math.min(berth[2] + 0.36, 1.92)], 0.08, 0.7),
  ];

  // --- The lookout -------------------------------------------------------------------------------------------------
  const tower = ground(0.78, -0.52, -0.03);
  for (const [dx, dz] of [
    [-0.24, -0.2],
    [0.24, -0.2],
    [-0.24, 0.2],
    [0.24, 0.2],
  ] as const) {
    s.add(
      post(0.045, 0.04, 1.1, 6),
      { tint: WOOD, shade: 0.3 },
      {
        at: [tower[0] + dx, tower[1], tower[2] + dz],
        turn: [dz * -0.28, 0, dx * 0.28],
      },
    );
  }
  s.add(block(0.748, 0.07, 0.648, 0.04), WOOD, { at: [tower[0], tower[1] + 1.05, tower[2]] });
  for (const [dx, dz] of [
    [-0.3, -0.25],
    [0.3, -0.25],
    [-0.3, 0.25],
    [0.3, 0.25],
  ] as const) {
    s.add(post(0.022, 0.022, 0.5, 5), WOOD, { at: [tower[0] + dx, tower[1] + 1.1, tower[2] + dz] });
  }
  s.add(box(0.66, 0.035, 0.03), WOOD, { at: [tower[0], tower[1] + 1.3, tower[2] + 0.25] });
  s.add(gable(0.92, 0.36, 0.84), TEAL, { at: [tower[0], tower[1] + 1.58, tower[2]] });
  s.add(box(0.96, 0.035, 0.05), ['#fff1d6', '#ffffff'], {
    at: [tower[0], tower[1] + 1.92, tower[2]],
  });
  pennant(s, [tower[0] + 0.3, tower[1] + 1.9, tower[2]], 0.36, '#ffd35c', 0.8);
  // The telescope, brass, pointing out to sea.
  s.add(
    post(0.045, 0.06, 0.36, 8),
    { tint: ['#c98a1c', '#ffd35c'], glow: 0.15 },
    {
      at: [tower[0] + 0.04, tower[1] + 1.3, tower[2] + 0.12],
      turn: [1.1, 0.5, 0],
    },
  );
  // A ladder.
  s.add(box(0.03, 1.05, 0.03), WOOD, {
    at: [tower[0] - 0.36, tower[1], tower[2] + 0.32],
    turn: [0.12, 0, 0],
  });
  s.add(box(0.03, 1.05, 0.03), WOOD, {
    at: [tower[0] - 0.2, tower[1], tower[2] + 0.32],
    turn: [0.12, 0, 0],
  });
  for (let rung = 1; rung <= 4; rung++) {
    s.add(box(0.19, 0.025, 0.025), WOOD, {
      at: [tower[0] - 0.28, tower[1] + rung * 0.21, tower[2] + 0.32 - rung * 0.025],
    });
  }

  // --- A rock arch ---------------------------------------------------------------------------------------------------
  const arch = ground(-0.9, -0.55, -0.05);
  s.add(
    stone(0.36, 1.5),
    { tint: ROCK, shade: 0.25 },
    { at: [arch[0] - 0.42, arch[1] + 0.42, arch[2]], turn: [0, 0.4, 0.08] },
  );
  s.add(
    stone(0.33, 1.6),
    { tint: ROCK, shade: 0.25 },
    { at: [arch[0] + 0.42, arch[1] + 0.42, arch[2] + 0.05], turn: [0, 1.3, -0.08] },
  );
  s.add(stone(0.42, 0.5), ROCK, {
    at: [arch[0], arch[1] + 0.98, arch[2] + 0.02],
    turn: [0, 0.2, 0],
    size: [1.7, 1, 1],
  });
  s.add(ball(0.2, 0.6, 8), ['#3f9c63', '#8ad88a'], { at: [arch[0] + 0.1, arch[1] + 1.2, arch[2]] });

  // --- The signpost, the tent and the chest -------------------------------------------------------------------------
  const sign = ground(-0.05, 0.1, -0.02);
  s.add(post(0.035, 0.03, 0.86, 6), { tint: WOOD, shade: 0.25 }, { at: sign });
  const boards: readonly (readonly [number, number, readonly [string, string], number])[] = [
    [0.72, 1, ['#d9533f', '#ff8f7a'], 0.15],
    [0.56, -1, ['#e9a92c', '#ffd35c'], -0.2],
    [0.4, 1, TEAL, -0.1],
  ];
  for (const [up, way, tint, tilt] of boards) {
    s.add(
      slab(
        outlineOf([
          [0, -0.06],
          [0.3, -0.06],
          [0.4, 0],
          [0.3, 0.06],
          [0, 0.06],
        ]),
        0.035,
        0.008,
      ),
      tint,
      { at: [sign[0], sign[1] + up, sign[2] + 0.03], turn: [0, way > 0 ? 0 : Math.PI, tilt] },
    );
  }
  const tent = ground(-0.82, 0.55, -0.01);
  s.add(
    cone(0.38, 0.5, 6),
    { tint: ['#e9a92c', '#ffd98a'], shade: 0.2 },
    { at: tent, turn: [0, 0.4, 0] },
  );
  s.add(
    slab(
      outlineOf([
        [-0.1, 0],
        [0.1, 0],
        [0, 0.28],
      ]),
      0.02,
      0,
    ),
    '#5b3a2a',
    { at: [tent[0] + 0.08, tent[1] + 0.01, tent[2] + 0.31], turn: [-0.5, 0.25, 0] },
  );
  s.add(ball(0.035, 1, 6), '#d9533f', { at: [tent[0], tent[1] + 0.53, tent[2]] });
  const chest = ground(0.72, 0.72, -0.005);
  s.add(
    block(0.364, 0.16, 0.264, 0.03),
    { tint: WOOD, shade: 0.2 },
    { at: chest, turn: [0, -0.35, 0] },
  );
  s.add(post(0.1, 0.1, 0.3, 10), ['#8a5f3f', '#c99a66'], {
    at: [chest[0] + 0.14, chest[1] + 0.16, chest[2] + 0.052],
    turn: [0, -0.35, Math.PI / 2],
    size: [1, 1, 0.9],
  });
  for (const [dx, dz] of [
    [-0.02, 0.02],
    [0.07, -0.02],
    [-0.09, -0.01],
  ] as const) {
    s.add(
      ball(0.04, 0.6, 7),
      { tint: '#ffd35c', glow: 0.6 },
      { at: [chest[0] + dx, chest[1] + 0.18, chest[2] + dz + 0.03] },
    );
  }

  // --- Palms and stones ---------------------------------------------------------------------------------------------
  palm(s, ground(1.4, 0.25, -0.02), 1.1, 0.8);
  palm(s, ground(-1.45, 0.1, -0.02), 1.0, -0.75);
  bush(s, ground(0.1, -1.1), 0.85);
  boulder(s, [1.8, 0.0, -0.55], 0.9, ROCK, 0.5);
  boulder(s, [-1.8, 0.0, -0.75], 0.8, ROCK, 1.9);
  if (detail >= 0.5) {
    boulder(s, [-0.2, 0.0, -1.85], 0.75, ROCK, 2.4);
    bush(s, ground(1.25, -1.0), 0.7);
  }

  return finish(s, land, movers);
}
