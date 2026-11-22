import {
  Sculpture,
  ball,
  block,
  boulder,
  bush,
  cone,
  flower,
  gable,
  landmass,
  palm,
  placer,
  post,
  type Tint,
  type Vec3,
} from '../kit';
import { bobbing, pennant, rowBoat } from './parts';
import { finish, type Detail, type IslandModel, type Mover } from './types';

/**
 * Reading Cove: a house made of three enormous books, with a fourth open over them for a roof, above a sandy cove
 * where a great shell lies listening to the sea. Reading here starts with listening.
 */

const CORAL: readonly [string, string] = ['#d9533f', '#ff8f7a'];
const CREAM: readonly [string, string] = ['#f1dfc0', '#fffaf0'];
const PAGES: readonly [string, string] = ['#efe2c6', '#fffaf0'];

/** A closed book lying flat: two covers, a spine along its left side, and pages showing on the other three. */
function book(
  s: Sculpture,
  at: Vec3,
  yaw: number,
  width: number,
  height: number,
  depth: number,
  cover: Tint,
): void {
  const put = placer(at, yaw);
  const turn: Vec3 = [0, yaw, 0];
  const board = 0.05;
  s.add(block(width, height - board, depth - 0.02, 0.04), PAGES, {
    at: put(0.03, board / 2, 0),
    turn,
  });
  s.add(
    block(width + 0.02, board, depth + 0.02, 0.05),
    { tint: cover, shade: 0.2 },
    { at: put(0, 0, 0), turn },
  );
  s.add(block(width + 0.02, board, depth + 0.02, 0.05), cover, {
    at: put(0, height - board, 0),
    turn,
  });
  s.add(block(0.17, height, depth + 0.1, 0.03), cover, {
    at: put(-width / 2 + 0.035, 0, 0),
    turn,
  });
}

export function buildReadingCove(detail: Detail): IslandModel {
  const land = landmass({
    radius: 2.0,
    height: 0.48,
    plateau: 0.52,
    cliff: 0.2,
    seed: 1.3,
    wander: 0.13,
    grass: ['#5fb354', '#a9e07a'],
    patches: [
      // The cove: a broad beach on the side facing the viewer.
      { x: 0.75, z: 1.05, radius: 1.0, tint: '#f6dfa6', strength: 1 },
      { x: -0.1, z: 1.25, radius: 0.7, tint: '#f6dfa6', strength: 0.9 },
      { x: -0.25, z: 0.55, radius: 0.34, tint: '#f1d9a2', strength: 0.9 },
    ],
    contacts: [
      { x: -0.3, z: -0.3, radius: 1.3 },
      { x: -1.25, z: 0.35, radius: 0.4 },
      { x: 1.2, z: -0.5, radius: 0.4 },
    ],
  });
  const s = new Sculpture();
  s.addPainted(land.geometry);
  const top = land.heightAt(0, 0);

  // --- The book house ----------------------------------------------------------------------------------------------
  const home: [number, number, number] = [-0.3, top - 0.03, -0.3];
  book(s, home, 0.12, 1.74, 0.5, 1.26, CORAL);
  book(s, [home[0] + 0.03, home[1] + 0.5, home[2]], -0.2, 1.5, 0.44, 1.12, ['#e9a92c', '#ffd35c']);
  book(s, [home[0] - 0.02, home[1] + 0.94, home[2] + 0.02], 0.22, 1.28, 0.4, 0.98, [
    '#2a8fb5',
    '#6fd0e8',
  ]);
  // A door in the bottom book and a round window in the one above, both on the side facing the viewer.
  const ground = placer(home, 0.12);
  s.add(block(0.44, 0.42, 0.18, 0.14), CREAM, { at: ground(0.1, 0.03, 0.6), turn: [0, 0.12, 0] });
  s.add(block(0.34, 0.34, 0.18, 0.11), ['#7c4a33', '#a9623f'], {
    at: ground(0.1, 0.035, 0.62),
    turn: [0, 0.12, 0],
  });
  s.add(ball(0.025, 1, 6), '#ffd35c', { at: ground(0.19, 0.2, 0.72) });
  const upper = placer([home[0] + 0.03, home[1] + 0.5, home[2]], -0.2);
  s.add(ball(0.15, 1, 12), CREAM, { at: upper(-0.2, 0.22, 0.53), size: [1, 1, 0.4] });
  s.add(
    ball(0.11, 1, 12),
    { tint: ['#ffb84a', '#ffe9a6'], glow: 0.85 },
    { at: upper(-0.2, 0.22, 0.555), size: [1, 1, 0.4] },
  );
  // A bookmark ribbon hanging out of the top book.
  const attic = placer([home[0] - 0.02, home[1] + 0.94, home[2] + 0.02], 0.22);
  s.add(
    block(0.23, 0.44, 0.13, 0.02),
    { tint: ['#c94f3b', '#ff8f7a'], sway: 0.12 },
    { at: attic(0.34, -0.3, 0.5), turn: [0, 0.22, 0] },
  );
  // The roof: a book left open, face down, over the stack.
  const roofAt: Vec3 = [home[0], home[1] + 1.33, home[2]];
  s.add(gable(1.36, 0.52, 1.2), CORAL, { at: roofAt, turn: [0, 0.22, 0] });
  s.add(gable(1.26, 0.46, 1.08), PAGES, {
    at: [roofAt[0], roofAt[1] - 0.035, roofAt[2]],
    turn: [0, 0.22, 0],
  });
  s.add(block(0.24, 0.26, 0.24, 0.04), CREAM, {
    at: [roofAt[0] + 0.34, roofAt[1] + 0.24, roofAt[2] - 0.12],
  });
  pennant(s, [roofAt[0] - 0.32, roofAt[1] + 0.42, roofAt[2]], 0.5, '#ffd35c');

  // --- The cove ------------------------------------------------------------------------------------------------------
  // The listening shell: a spiral of ever smaller whorls, lying on the sand with its mouth to the sea.
  const shellAt: Vec3 = [1.02, land.heightAt(1.02, 0.86) + 0.17, 0.86];
  const whorls: readonly (readonly [number, number, number])[] = [
    [0, 0, 0.24],
    [0.2, 0.09, 0.17],
    [0.34, 0.17, 0.12],
    [0.44, 0.23, 0.08],
    [0.51, 0.27, 0.05],
  ];
  for (const [along, up, radius] of whorls) {
    s.add(
      ball(radius, 0.92, 12),
      { tint: ['#ffb7a3', '#fff1ec'], shade: 0.1 },
      { at: [shellAt[0] + along * 0.8, shellAt[1] + up, shellAt[2] - along * 0.55] },
    );
  }
  s.add(ball(0.15, 1, 12), ['#ff8f7a', '#ffc9bb'], {
    at: [shellAt[0] - 0.1, shellAt[1] - 0.02, shellAt[2] + 0.17],
    turn: [0, -0.5, 0],
    size: [1, 0.85, 0.4],
  });
  // A sunshade and a blanket.
  const shade: Vec3 = [0.1, land.heightAt(0.1, 1.2), 1.2];
  s.add(post(0.022, 0.022, 0.6, 6), CREAM, { at: shade, turn: [0, 0, 0.12] });
  s.add(cone(0.42, 0.2, 12), CORAL, {
    at: [shade[0] - 0.07, shade[1] + 0.56, shade[2]],
    turn: [0, 0, 0.12],
  });
  s.add(ball(0.04, 1, 6), '#fffaf0', { at: [shade[0] - 0.1, shade[1] + 0.78, shade[2]] });
  s.add(block(0.41, 0.025, 0.27, 0.04), ['#6fd0e8', '#bfeef7'], {
    at: [shade[0] + 0.3, shade[1] + 0.0, shade[2] + 0.12],
    turn: [0, 0.3, 0],
  });
  palm(s, [1.3, land.heightAt(1.3, -0.35) - 0.02, -0.35], 1.25, 0.9);
  palm(s, [-1.3, land.heightAt(-1.3, 0.45) - 0.02, 0.45], 1.05, -0.7);
  const movers: Mover[] = [bobbing(rowBoat(['#2a8fb5', '#6fd0e8']), [-1.0, 0.02, 1.72], 0.35, 1.1)];

  // --- Green things and stones --------------------------------------------------------------------------------------
  bush(s, [0.95, land.heightAt(0.95, -0.95), -0.95], 0.95);
  bush(s, [-1.05, land.heightAt(-1.05, -0.85), -0.85], 0.85);
  boulder(s, [1.85, 0.0, 0.35], 0.8, undefined, 0.5);
  boulder(s, [-1.75, 0.0, -0.8], 0.9, undefined, 1.9);
  if (detail >= 0.5) {
    boulder(s, [0.3, 0.0, -1.85], 0.7, undefined, 2.6);
    const blooms: readonly (readonly [number, number, string])[] = [
      [0.72, -0.2, '#ffffff'],
      [0.95, 0.1, '#ff9fc2'],
      [0.62, 0.22, '#ffd35c'],
      [-1.0, -0.2, '#ffffff'],
      [-0.85, 0.1, '#ff9fc2'],
      [0.3, -1.2, '#ffd35c'],
    ];
    for (const [x, z, tint] of blooms.slice(0, Math.round(blooms.length * detail))) {
      flower(s, [x, land.heightAt(x, z), z], tint, 1.2);
    }
  }

  return finish(s, land, movers);
}
