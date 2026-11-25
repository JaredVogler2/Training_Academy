import { PITCH } from '../../extents';
import {
  Sculpture,
  ball,
  block,
  boulder,
  bush,
  cone,
  dress,
  flower,
  gable,
  landmass,
  outlineOf,
  pine,
  post,
  slab,
  tree,
  turned,
} from '../kit';
import { bobbing, buoy, jetty, lamp, pennant, rowBoat } from './parts';
import { finish, type Detail, type IslandModel, type Mover } from './types';

/**
 * Academy Rock: the lighthouse at the middle of the harbour, with the keeper's cottage and a jetty.
 * It is the picture on the app's icon, and the one thing every screen shape keeps in view.
 *
 * It is also where the Music Lab is: chime bars stand on the meadow, and notes drift up past the lantern, so that
 * the place says what it is for to someone who cannot read its name.
 */

const CREAM: readonly [string, string] = ['#f1dfc0', '#fffaf0'];
const CORAL: readonly [string, string] = ['#e2604a', '#ff8f7a'];
const ROOF: readonly [string, string] = ['#b8432f', '#e2604a'];
const STONE: readonly [string, string] = ['#8d8a9c', '#c4c1d0'];
const DOOR: readonly [string, string] = ['#7c4a33', '#a9623f'];
const LAMP = '#ffe9a6';
/** The chime bars, lowest first: the colours the Music Lab's own bars have. */
const BARS: readonly (readonly [string, string])[] = [
  ['#c93f35', '#f0564a'],
  ['#d97a1f', '#ff9f45'],
  ['#d9a81f', '#ffd35c'],
  ['#3f9a4c', '#6fcf74'],
  ['#3a86c9', '#62b4f3'],
];
const NOTE_INK = '#3b2f7a';

/** A quaver, flat, facing along z: a round head, a stem and a flag. About 0.5 tall. */
function quaver(): Sculpture {
  const note = new Sculpture();
  const head = Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2;
    // A slanted oval, as a note head is.
    const x = Math.cos(angle) * 0.105;
    const y = Math.sin(angle) * 0.075;
    return [x * 0.94 - y * 0.34, y * 0.94 + x * 0.34] as const;
  });
  note.add(slab(outlineOf(head), 0.03, 0), { tint: NOTE_INK, glow: 0.35 });
  note.add(
    slab(
      outlineOf([
        [0.07, 0.01],
        [0.105, 0.01],
        [0.105, 0.34],
        [0.25, 0.22],
        [0.25, 0.3],
        [0.105, 0.44],
        [0.07, 0.44],
      ]),
      0.03,
      0,
    ),
    { tint: NOTE_INK, glow: 0.35 },
  );
  return note;
}

export function buildAcademy(detail: Detail): IslandModel {
  const land = landmass({
    radius: 1.78,
    height: 0.58,
    plateau: 0.6,
    cliff: 0.5,
    seed: 2.4,
    wander: 0.12,
    grass: ['#5fb354', '#a9e07a'],
    rock: '#b3aebd',
    patches: [
      // A sandy path from the lighthouse door down to the jetty.
      { x: 0.05, z: 0.55, radius: 0.36, tint: '#f1d9a2', strength: 0.95 },
      { x: 0.42, z: 0.8, radius: 0.36, tint: '#f1d9a2', strength: 0.95 },
      { x: 0.8, z: 1.02, radius: 0.36, tint: '#f1d9a2', strength: 0.95 },
      // A flower meadow on the sunny side.
      { x: -0.85, z: 0.55, radius: 0.6, tint: '#bfe98a', strength: 0.7 },
    ],
    contacts: [
      { x: -0.2, z: -0.18, radius: 0.95 },
      { x: 0.86, z: 0.02, radius: 0.72 },
      { x: -1.02, z: -0.1, radius: 0.5 },
    ],
  });
  const s = new Sculpture();
  s.addPainted(land.geometry);
  const top = land.heightAt(0, 0);

  // --- The lighthouse: five turned bands, cream and coral, tapering to the gallery ---------------------------------
  const tower: [number, number, number] = [-0.2, top - 0.04, -0.18];
  const TALL = 2.2;
  const radiusAt = (y: number) => 0.52 - 0.19 * (y / TALL) + 0.1 * Math.max(0, 0.22 - y);
  const bands: readonly (readonly [number, number, readonly [string, string]])[] = [
    [0.0, 0.5, CREAM],
    [0.5, 0.94, CORAL],
    [0.94, 1.38, CREAM],
    [1.38, 1.8, CORAL],
    [1.8, TALL, CREAM],
  ];
  for (const [from, to, tint] of bands) {
    const steps = 4;
    const profile = Array.from({ length: steps + 1 }, (_, index) => {
      const y = from + ((to - from) * index) / steps;
      return [radiusAt(y), y] as const;
    });
    s.add(turned(profile, 24), { tint, shade: from === 0 ? 0.28 : 0 }, { at: tower });
  }
  /** A point on the tower's wall: `around` is the bearing (0 = facing the viewer), `up` the height. */
  const onTower = (around: number, up: number, out = 0): [number, number, number] => [
    tower[0] + Math.sin(around) * (radiusAt(up) + out),
    tower[1] + up,
    tower[2] + Math.cos(around) * (radiusAt(up) + out),
  ];
  s.add(post(0.64, 0.58, 0.12, 24), STONE, { at: tower });
  // The door, with a stone arch and a step, faces the path.
  s.add(block(0.4, 0.46, 0.2, 0.12), STONE, { at: onTower(0.32, 0.06, -0.06), turn: [0, 0.32, 0] });
  s.add(block(0.3, 0.36, 0.2, 0.09), DOOR, { at: onTower(0.32, 0.07, -0.03), turn: [0, 0.32, 0] });
  s.add(ball(0.022, 1, 6), '#ffd35c', { at: onTower(0.42, 0.26, 0.03) });
  s.add(block(0.384, 0.06, 0.224, 0.05), STONE, {
    at: onTower(0.32, 0.0, 0.06),
    turn: [0, 0.32, 0],
  });
  // Warm windows climbing the tower, each in a little frame.
  const windows: readonly (readonly [number, number])[] = [
    [-0.35, 0.74],
    [0.5, 1.2],
    [-0.2, 1.62],
  ];
  for (const [around, up] of windows) {
    s.add(block(0.29, 0.25, 0.15, 0.08), ['#fff3dd', '#ffffff'], {
      at: onTower(around, up - 0.02, -0.03),
      turn: [0, around, 0],
    });
    s.add(
      block(0.213, 0.195, 0.128, 0.06),
      { tint: ['#ffb84a', LAMP], glow: 0.85 },
      { at: onTower(around, up + 0.01, -0.018), turn: [0, around, 0] },
    );
  }

  // The gallery with its railing, the lantern room and its cap.
  const galleryAt = tower[1] + TALL;
  s.add(post(0.47, 0.5, 0.09, 24), ROOF, { at: [tower[0], galleryAt, tower[2]] });
  for (let index = 0; index < 10; index++) {
    const angle = (index / 10) * Math.PI * 2;
    s.add(post(0.016, 0.016, 0.16, 5), '#fffaf0', {
      at: [tower[0] + Math.cos(angle) * 0.45, galleryAt + 0.08, tower[2] + Math.sin(angle) * 0.45],
    });
  }
  s.add(
    turned(
      [
        [0.44, 0],
        [0.46, 0.015],
        [0.46, 0.035],
        [0.44, 0.05],
      ],
      24,
    ),
    '#fffaf0',
    { at: [tower[0], galleryAt + 0.22, tower[2]] },
  );
  s.add(
    post(0.26, 0.26, 0.42, 16),
    { tint: ['#ffcf6a', '#fff6d6'], glow: 0.95 },
    { at: [tower[0], galleryAt + 0.09, tower[2]] },
  );
  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2 + 0.2;
    s.add(post(0.022, 0.022, 0.42, 5), '#7b3a2c', {
      at: [tower[0] + Math.cos(angle) * 0.27, galleryAt + 0.09, tower[2] + Math.sin(angle) * 0.27],
    });
  }
  s.add(post(0.36, 0.31, 0.07, 20), ROOF, { at: [tower[0], galleryAt + 0.51, tower[2]] });
  s.add(cone(0.37, 0.48, 20), ROOF, { at: [tower[0], galleryAt + 0.56, tower[2]] });
  s.add(
    ball(0.065, 1, 8),
    { tint: '#ffd35c', glow: 0.3 },
    { at: [tower[0], galleryAt + 1.07, tower[2]] },
  );
  pennant(s, [tower[0], galleryAt + 1.1, tower[2]], 0.5, '#ffd35c');

  // --- The keeper's cottage ----------------------------------------------------------------------------------------
  const cottage: [number, number, number] = [0.88, land.heightAt(0.88, 0.02) - 0.03, 0.02];
  const facing = -0.38;
  s.add(
    block(0.9, 0.46, 0.7, 0.08),
    { tint: CREAM, shade: 0.3 },
    { at: cottage, turn: [0, facing, 0] },
  );
  s.add(gable(0.96, 0.4, 0.78), ROOF, {
    at: [cottage[0], cottage[1] + 0.44, cottage[2]],
    turn: [0, facing, 0],
  });
  s.add(block(0.23, 0.3, 0.23, 0.03), STONE, {
    at: [cottage[0] - 0.16, cottage[1] + 0.58, cottage[2] - 0.1],
  });
  const front = (along: number, up: number, out: number): [number, number, number] => [
    cottage[0] + Math.cos(facing) * along + Math.sin(facing) * out,
    cottage[1] + up,
    cottage[2] - Math.sin(facing) * along + Math.cos(facing) * out,
  ];
  s.add(block(0.27, 0.3, 0.16, 0.07), DOOR, { at: front(-0.17, 0.02, 0.29), turn: [0, facing, 0] });
  s.add(block(0.328, 0.22, 0.148, 0.05), ['#fff3dd', '#ffffff'], {
    at: front(0.17, 0.13, 0.285),
    turn: [0, facing, 0],
  });
  s.add(
    block(0.23, 0.15, 0.12, 0.04),
    { tint: ['#ffc65c', LAMP], glow: 0.75 },
    { at: front(0.17, 0.165, 0.3), turn: [0, facing, 0] },
  );

  // --- The jetty and the keeper's boat ------------------------------------------------------------------------------
  // The jetty starts on the sand and ends over the water, wherever the shore happens to run on this bearing.
  const bearing = 0.7;
  const shore = land.shoreAt(bearing);
  const out = (distance: number, side = 0): [number, number, number] => [
    Math.cos(bearing) * distance - Math.sin(bearing) * side,
    0,
    Math.sin(bearing) * distance + Math.cos(bearing) * side,
  ];
  jetty(s, out(shore - 0.3), out(Math.min(shore + 0.34, 1.98)));
  const lampAt = out(shore - 0.42, -0.3);
  lamp(s, [lampAt[0], land.heightAt(lampAt[0], lampAt[2]), lampAt[2]], 0.42);
  const boatAt = out(Math.min(shore + 0.12, 1.8), 0.42);
  const movers: Mover[] = [bobbing(rowBoat(), [boatAt[0], 0.02, boatAt[2]], -bearing, 0.4)];

  // The light itself: a four-pointed star that turns and breathes in front of the lantern, facing the viewer.
  const star = new Sculpture();
  const point = outlineOf([
    [0, 0.5],
    [0.07, 0.07],
    [0.5, 0],
    [0.07, -0.07],
    [0, -0.5],
    [-0.07, -0.07],
    [-0.5, 0],
    [-0.07, 0.07],
  ]);
  star.add(slab(point, 0.012, 0), { tint: '#fff6c4', glow: 1 });
  movers.push({
    geometry: star.build(),
    at: [tower[0], galleryAt + 0.3, tower[2] + 0.3],
    animate(time, part) {
      part.rotation.set(-PITCH, 0, time * 0.35);
      part.scale.setScalar(0.72 + 0.2 * Math.sin(time * 2.1));
    },
  });

  // --- The Music Lab: chime bars on the meadow, and notes in the air -------------------------------------------------
  // Five bars on two rails, each shorter than the last, the low one nearest the tower.
  const barsAt: [number, number] = [-0.92, 0.5];
  const railY = land.heightAt(barsAt[0], barsAt[1]) + 0.03;
  for (const side of [-0.11, 0.11]) {
    s.add(block(0.74, 0.05, 0.05, 0.02), DOOR, { at: [barsAt[0], railY, barsAt[1] + side] });
  }
  BARS.forEach((tint, index) => {
    const long = 0.46 - index * 0.05;
    s.add(block(0.105, 0.05, long, 0.02), tint, {
      at: [barsAt[0] - 0.29 + index * 0.145, railY + 0.05, barsAt[1]],
    });
  });
  // The notes rise beside the lantern, one after the other, and fade as they go: each is small at the start of
  // its climb and at the end of it. They face the viewer, as the light does.
  const CLIMB = 0.62;
  const rising = (dx: number, from: number, phase: number, size: number): Mover => ({
    geometry: quaver().build(),
    at: [tower[0] + dx, tower[1] + from, tower[2] + 0.34],
    rise: CLIMB,
    animate(time, part) {
      const along = (((time * 0.16 + phase) % 1) + 1) % 1;
      part.position.set(
        tower[0] + dx + Math.sin(along * Math.PI * 2 + phase * 6) * 0.05,
        tower[1] + from + along * CLIMB,
        tower[2] + 0.34,
      );
      part.rotation.set(-PITCH, 0, Math.sin(time * 1.4 + phase * 9) * 0.18);
      part.scale.setScalar(size * Math.sin(along * Math.PI) ** 0.6);
    },
  });
  movers.push(rising(0.66, 1.5, 0.3, 1), rising(-0.62, 1.86, 0.62, 0.88));

  // --- Green things and stones --------------------------------------------------------------------------------------
  tree(s, [-1.02, land.heightAt(-1.02, -0.1), -0.1], 0.86, undefined, 0.6);
  pine(s, [0.25, land.heightAt(0.25, -0.98), -0.98], 0.7);
  bush(s, [-0.3, land.heightAt(-0.3, 1.0), 1.0], 0.8);
  bush(s, [0.36, land.heightAt(0.36, 0.3), 0.3], 0.7);
  boulder(s, [-1.5, 0.02, -0.72], 1.0, undefined, 0.4);
  boulder(s, [-1.12, 0.02, -1.3], 0.7, undefined, 1.2);
  boulder(s, [1.62, 0.0, -0.78], 0.85, undefined, 2.1);
  if (detail >= 0.5) {
    boulder(s, [-1.78, -0.02, 0.5], 0.55, undefined, 0.9);
    // Round the chime bars, not under them.
    const blooms: readonly (readonly [number, number, string])[] = [
      [-1.38, 0.62, '#ffffff'],
      [-1.02, 0.9, '#ffd35c'],
      [-0.42, 0.56, '#ff9fc2'],
      [-1.36, 0.3, '#ff9fc2'],
      [-0.86, 0.14, '#ffffff'],
      [-0.4, 0.3, '#ffd35c'],
      [0.52, -0.72, '#ffffff'],
      [-0.6, -0.7, '#ffd35c'],
    ];
    for (const [x, z, tint] of blooms.slice(0, Math.round(blooms.length * detail))) {
      flower(s, [x, land.heightAt(x, z), z], tint, 1.2);
    }
  }

  dress(s, land, {
    tufts: Math.round(12 * detail),
    pebbles: Math.round(8 * detail),
    keepClear: [
      { x: -0.2, z: -0.18, radius: 0.8 },
      { x: 0.88, z: 0.02, radius: 0.62 },
      { x: 0.05, z: 0.55, radius: 0.3 },
      { x: 0.42, z: 0.8, radius: 0.3 },
      { x: 0.8, z: 1.02, radius: 0.3 },
      { x: -1.02, z: -0.1, radius: 0.32 },
      { x: barsAt[0], z: barsAt[1], radius: 0.5 },
    ],
  });
  // A channel buoy off the western shore.
  const marker = 2.35;
  const off = Math.min(land.shoreAt(marker) + 0.24, 1.9);
  movers.push(bobbing(buoy(), [Math.cos(marker) * off, 0, Math.sin(marker) * off], 0.3, 2.2));

  return finish(s, land, movers);
}
