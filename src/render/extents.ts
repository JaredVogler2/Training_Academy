import { WORLD_IDS, type WorldId } from '@/engine/schema';

/**
 * The few numbers that both the layout (archipelago.ts) and the pictures of the islands (sprites.ts) depend on:
 * the camera's angle, and how much room each place is given. They live apart from the layout so that moving a boat
 * or a cloud does not make the committed pictures look out of date; changing anything here does, and should.
 */

/** How far below the horizontal the camera looks. */
export const PITCH = (36 * Math.PI) / 180;

export type PlaceId = 'academy' | WorldId;
export const PLACES: readonly PlaceId[] = ['academy', ...WORLD_IDS];

export interface Extent {
  /** Reach of the shore from the middle, in world units. */
  radius: number;
  /** How tall the place may be drawn: see EXTENTS. */
  height: number;
}

/**
 * Room kept for each place. `height` is how high the place may be drawn above its middle at water level, given as
 * the height of something standing exactly there: a landmark further back is drawn higher for the same height, and
 * must be that much shorter. The models (hub3d/islands) must stay inside these: a test measures that they do.
 */
export const EXTENTS: Readonly<Record<PlaceId, Extent>> = {
  academy: { radius: 2.05, height: 4.55 },
  'reading-cove': { radius: 2.3, height: 3.4 },
  'number-garden': { radius: 2.3, height: 3.4 },
  'robot-ridge': { radius: 2.3, height: 3.4 },
  'memory-forest': { radius: 2.3, height: 3.4 },
  'inventor-island': { radius: 2.3, height: 3.4 },
  'explorer-harbor': { radius: 2.3, height: 3.4 },
};
