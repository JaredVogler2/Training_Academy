import { EXTENTS, PITCH, PLACES, type PlaceId } from './archipelago';

/**
 * The pictures the hub falls back to are rendered from the 3D models, one per island and one per floating thing
 * (scripts/render-sprites.mjs). This file says how big each picture is and where in it the thing's own origin — its
 * middle, at water level — falls. The studio that renders them and the page that places them both read it.
 */

/** How much water around an island its picture keeps: the shallows fade out inside this. */
const WATER = 1.45;

export type FloatingId = 'boat-0' | 'boat-1' | 'boat-2' | 'rock' | 'cloud';
export type SpriteId = PlaceId | FloatingId;

export const FLOATING: readonly FloatingId[] = ['boat-0', 'boat-1', 'boat-2', 'rock', 'cloud'];
export const SPRITE_IDS: readonly SpriteId[] = [...PLACES, ...FLOATING];

export interface SpriteBox {
  /** In world units. */
  width: number;
  height: number;
  /** From the picture's left and top edges to the origin. */
  anchorX: number;
  anchorY: number;
}

const FLOATING_BOXES: Readonly<Record<FloatingId, SpriteBox>> = {
  'boat-0': { width: 2.6, height: 2.0, anchorX: 1.3, anchorY: 1.25 },
  'boat-1': { width: 2.6, height: 2.0, anchorX: 1.3, anchorY: 1.25 },
  'boat-2': { width: 2.6, height: 2.0, anchorX: 1.3, anchorY: 1.25 },
  rock: { width: 3.4, height: 2.2, anchorX: 1.7, anchorY: 1.1 },
  cloud: { width: 3.6, height: 1.9, anchorX: 1.8, anchorY: 1.05 },
};

export function isSpriteId(value: string): value is SpriteId {
  return (SPRITE_IDS as readonly string[]).includes(value);
}

export function isPlaceId(value: string): value is PlaceId {
  return (PLACES as readonly string[]).includes(value);
}

export function spriteBox(id: SpriteId): SpriteBox {
  if (!isPlaceId(id)) return FLOATING_BOXES[id];
  const extent = EXTENTS[id];
  const half = extent.radius + WATER;
  const below = half * Math.sin(PITCH);
  const above = Math.max(below, extent.height * Math.cos(PITCH) + 0.15);
  return { width: half * 2, height: above + below, anchorX: half, anchorY: above };
}
