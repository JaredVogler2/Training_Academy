import {
  Sculpture,
  ball,
  block,
  boulder,
  box,
  bush,
  cone,
  flower,
  gable,
  landmass,
  outlineOf,
  placer,
  post,
  slab,
  tree,
  turned,
  type Vec3,
} from '../kit';
import { finish, type Detail, type IslandModel, type Mover } from './types';

/**
 * Inventor Island: a windmill whose sails really turn, a workshop with a great glowing bulb for a sign, a rocket
 * waiting on its pad and a ramp with a ball at the top. Guess, build, test, change.
 */

const CREAM: readonly [string, string] = ['#f1dfc0', '#fffaf0'];
const AMBER: readonly [string, string] = ['#d98a1f', '#ffc45a'];
const TEAL: readonly [string, string] = ['#2f9a94', '#7fdcd2'];
const WOOD: readonly [string, string] = ['#8a5f3f', '#c99a66'];

export function buildInventorIsland(detail: Detail): IslandModel {
  const land = landmass({
    radius: 2.0,
    height: 0.5,
    plateau: 0.58,
    cliff: 0.4,
    seed: 5.2,
    wander: 0.12,
    grass: ['#74b84c', '#c4e87a'],
    patches: [
      { x: 0.55, z: 0.55, radius: 0.75, tint: '#e9d3a0', strength: 0.85 },
      { x: -0.2, z: 0.7, radius: 0.45, tint: '#e9d3a0', strength: 0.8 },
    ],
    contacts: [
      { x: -0.55, z: -0.3, radius: 0.85 },
      { x: 0.85, z: -0.25, radius: 0.8 },
    ],
  });
  const s = new Sculpture();
  s.addPainted(land.geometry);
  const top = land.heightAt(0, 0);
  const ground = (x: number, z: number, lift = 0): Vec3 => [x, land.heightAt(x, z) + lift, z];

  // --- The windmill ------------------------------------------------------------------------------------------------
  const mill: Vec3 = [-0.58, top - 0.04, -0.34];
  const TALL = 1.58;
  const radiusAt = (y: number) => 0.52 - 0.2 * (y / TALL);
  s.add(
    turned(
      [
        [0.56, 0],
        [radiusAt(0.1), 0.1],
        [radiusAt(0.7), 0.7],
        [radiusAt(TALL), TALL],
      ],
      20,
    ),
    { tint: CREAM, shade: 0.3 },
    { at: mill },
  );
  s.add(post(radiusAt(0.52) + 0.012, radiusAt(0.66) + 0.012, 0.14, 20), AMBER, {
    at: [mill[0], mill[1] + 0.52, mill[2]],
  });
  s.add(post(0.6, 0.57, 0.1, 20), ['#8d8a9c', '#c4c1d0'], { at: mill });
  s.add(ball(0.37, 0.82, 16), AMBER, { at: [mill[0], mill[1] + TALL + 0.05, mill[2]] });
  s.add(post(0.36, 0.33, 0.07, 18), ['#b86f12', '#e9a13a'], {
    at: [mill[0], mill[1] + TALL - 0.02, mill[2]],
  });
  const onMill = (around: number, up: number, out = 0): Vec3 => [
    mill[0] + Math.sin(around) * (radiusAt(up) + out),
    mill[1] + up,
    mill[2] + Math.cos(around) * (radiusAt(up) + out),
  ];
  s.add(block(0.34, 0.36, 0.18, 0.1), ['#7c4a33', '#a9623f'], {
    at: onMill(0.5, 0.08, -0.03),
    turn: [0, 0.5, 0],
  });
  s.add(block(0.25, 0.2, 0.13, 0.07), ['#fff3dd', '#ffffff'], {
    at: onMill(-0.3, 0.86, -0.03),
    turn: [0, -0.3, 0],
  });
  s.add(
    block(0.18, 0.15, 0.11, 0.05),
    { tint: ['#ffb84a', '#ffe9a6'], glow: 0.85 },
    { at: onMill(-0.3, 0.885, -0.018), turn: [0, -0.3, 0] },
  );

  // The sails: four, turning about an axle that points at the viewer.
  const sails = new Sculpture();
  for (let index = 0; index < 4; index++) {
    const angle = (index / 4) * Math.PI * 2;
    const turn: Vec3 = [0, 0, angle];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // In the sail's own frame the spar runs up +y; `turn` swings it round the hub.
    const at = (x: number, y: number, z: number): Vec3 => [x * cos - y * sin, x * sin + y * cos, z];
    sails.add(box(0.05, 1.02, 0.04), WOOD, { at: at(0, 0.02, 0), turn });
    sails.add(
      slab(
        outlineOf([
          [0.03, 0.26],
          [0.32, 0.3],
          [0.32, 1.0],
          [0.03, 1.0],
        ]),
        0.02,
        0,
      ),
      index % 2 === 0 ? ['#fff1d6', '#ffffff'] : ['#ffd98a', '#fff3c4'],
      { at: at(0, 0, 0.012), turn },
    );
  }
  sails.add(post(0.1, 0.1, 0.12, 12), AMBER, { turn: [Math.PI / 2, 0, 0], at: [0, 0, -0.03] });
  const hub: Vec3 = [mill[0], mill[1] + TALL + 0.08, mill[2] + 0.42];
  s.add(post(0.05, 0.05, 0.34, 8), WOOD, {
    at: [hub[0], hub[1], hub[2] - 0.34],
    turn: [Math.PI / 2, 0, 0],
  });
  const movers: Mover[] = [
    {
      geometry: sails.build(),
      at: hub,
      animate(time, part) {
        part.rotation.set(-0.16, 0, time * 0.55);
      },
    },
  ];

  // --- The workshop ------------------------------------------------------------------------------------------------
  const yaw = -0.3;
  const shop = ground(0.85, -0.22, -0.03);
  const put = placer(shop, yaw);
  const turn: Vec3 = [0, yaw, 0];
  s.add(block(1.1, 0.52, 0.82, 0.08), { tint: TEAL, shade: 0.3 }, { at: shop, turn });
  s.add(gable(1.14, 0.38, 0.9), AMBER, { at: [shop[0], shop[1] + 0.5, shop[2]], turn });
  // A wide doorway with light inside, and a round window.
  s.add(block(0.56, 0.38, 0.16, 0.08), ['#fff3dd', '#ffffff'], { at: put(-0.2, 0.02, 0.35), turn });
  s.add(
    block(0.48, 0.33, 0.16, 0.06),
    { tint: ['#ffb84a', '#ffe9a6'], glow: 0.75 },
    { at: put(-0.2, 0.025, 0.365), turn },
  );
  s.add(ball(0.11, 1, 10), ['#fff3dd', '#ffffff'], {
    at: put(0.27, 0.3, 0.355),
    turn,
    size: [1, 1, 0.3],
  });
  s.add(
    ball(0.08, 1, 10),
    { tint: '#bfeef7', glow: 0.3 },
    { at: put(0.27, 0.3, 0.37), turn, size: [1, 1, 0.3] },
  );
  // The sign on the roof: an idea.
  const sign = put(0.1, 0.9, 0.0);
  s.add(post(0.07, 0.085, 0.12, 8), ['#70748a', '#a9adc0'], { at: sign });
  s.add(
    ball(0.19, 1.08, 12),
    { tint: ['#ffd35c', '#fff7c9'], glow: 0.95 },
    { at: [sign[0], sign[1] + 0.3, sign[2]] },
  );
  // A chimney pipe.
  s.add(post(0.06, 0.06, 0.36, 8), ['#70748a', '#a9adc0'], { at: put(-0.38, 0.6, -0.14) });
  s.add(post(0.085, 0.085, 0.05, 8), ['#70748a', '#a9adc0'], { at: put(-0.38, 0.94, -0.14) });

  // --- The rocket on its pad ---------------------------------------------------------------------------------------
  const pad = ground(1.12, 0.78, -0.01);
  s.add(post(0.3, 0.33, 0.06, 14), ['#a9a6b4', '#d5d2dd'], { at: pad });
  s.add(post(0.15, 0.15, 0.44, 12), ['#f1f1f6', '#ffffff'], {
    at: [pad[0], pad[1] + 0.14, pad[2]],
  });
  s.add(cone(0.15, 0.26, 12), ['#d9483b', '#ff7a66'], { at: [pad[0], pad[1] + 0.58, pad[2]] });
  s.add(
    ball(0.06, 1, 8),
    { tint: '#7fdcf2', glow: 0.5 },
    { at: [pad[0], pad[1] + 0.42, pad[2] + 0.13], size: [1, 1, 0.5] },
  );
  for (let index = 0; index < 3; index++) {
    const angle = (index / 3) * Math.PI * 2 + 0.5;
    s.add(
      slab(
        outlineOf([
          [0, 0],
          [0.16, -0.08],
          [0.16, 0.06],
          [0, 0.24],
        ]),
        0.03,
        0.006,
      ),
      ['#d9483b', '#ff7a66'],
      {
        at: [pad[0] + Math.cos(angle) * 0.13, pad[1] + 0.14, pad[2] - Math.sin(angle) * 0.13],
        turn: [0, angle, 0],
      },
    );
  }

  // --- The ramp and the ball ---------------------------------------------------------------------------------------
  const ramp = ground(-0.25, 0.86, -0.01);
  s.add(
    slab(
      outlineOf([
        [-0.5, 0],
        [0.5, 0],
        [0.5, 0.05],
        [-0.5, 0.42],
      ]),
      0.3,
      0.01,
    ),
    { tint: WOOD, shade: 0.2 },
    { at: ramp, turn: [0, 0.18, 0] },
  );
  s.add(ball(0.11, 1, 10), ['#2a8fb5', '#6fd0e8'], {
    at: [ramp[0] - 0.36, ramp[1] + 0.47, ramp[2] + 0.07],
  });
  // Crates, one on another.
  const crates = ground(0.25, 0.42, -0.01);
  s.add(
    block(0.328, 0.22, 0.328, 0.03),
    { tint: WOOD, shade: 0.2 },
    { at: crates, turn: [0, 0.3, 0] },
  );
  s.add(block(0.272, 0.18, 0.272, 0.03), ['#a4764d', '#dcae7a'], {
    at: [crates[0] + 0.02, crates[1] + 0.21, crates[2]],
    turn: [0, -0.2, 0],
  });

  // --- Green things and stones --------------------------------------------------------------------------------------
  tree(s, ground(-1.38, 0.3), 0.8, undefined, 0.3);
  bush(s, ground(0.2, -1.2), 0.85);
  bush(s, ground(-1.2, -0.85), 0.8);
  boulder(s, [-1.8, 0.0, -0.4], 0.8, undefined, 0.5);
  boulder(s, [1.85, 0.0, 0.1], 0.75, undefined, 1.9);
  if (detail >= 0.5) {
    const blooms: readonly (readonly [number, number, string])[] = [
      [-1.0, 0.72, '#ffffff'],
      [-1.22, 0.9, '#ffd35c'],
      [-0.86, 1.1, '#ff9fc2'],
      [1.4, -0.8, '#ffffff'],
      [0.62, 1.28, '#ffd35c'],
      [-0.2, -1.1, '#ff9fc2'],
    ];
    for (const [x, z, tint] of blooms.slice(0, Math.round(blooms.length * detail))) {
      flower(s, ground(x, z), tint, 1.2);
    }
  }

  return finish(s, land, movers);
}
