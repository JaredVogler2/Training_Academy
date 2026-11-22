import type { BufferGeometry, Object3D } from 'three';
import type { Land, Sculpture, Vec3 } from '../kit';

/** A small part of an island that moves on its own: a windmill's sails, a boat at its mooring. */
export interface Mover {
  geometry: BufferGeometry;
  at: Vec3;
  /** Called every frame with the scene's clock (seconds) to pose the part. */
  animate(time: number, part: Object3D): void;
  /** How far above its resting place the part can travel, for framing. */
  rise?: number;
}

export interface IslandModel {
  /** The land and everything fixed to it, merged and painted: one mesh. */
  body: BufferGeometry;
  /** Shoreline radius before its wobble, for the water's foam. */
  radius: number;
  /** The furthest the waterline gets from the middle. */
  reach: number;
  /** Tallest point above the water, for framing and for the length of the shadow on the water. */
  height: number;
  /** The numbers the water needs to draw this island's shore: see kit.ts `landmass`. */
  shore: { seed: number; wander: number };
  movers: Mover[];
}

/** 0–1: how much decorative detail to build. Lower tiers build fewer flowers, stones and tufts. */
export type Detail = number;

/** Merge a finished sculpture into an island model, measuring how tall it turned out. */
export function finish(sculpture: Sculpture, land: Land, movers: Mover[] = []): IslandModel {
  const body = sculpture.build();
  let height = body.boundingBox?.max.y ?? 0;
  for (const mover of movers) {
    mover.geometry.computeBoundingBox();
    mover.geometry.computeBoundingSphere();
    height = Math.max(
      height,
      mover.at[1] + (mover.geometry.boundingBox?.max.y ?? 0) + (mover.rise ?? 0),
    );
  }
  return { body, radius: land.radius, reach: land.reach, height, shore: land.shore, movers };
}

export function disposeIsland(model: IslandModel): void {
  model.body.dispose();
  for (const mover of model.movers) mover.geometry.dispose();
}
