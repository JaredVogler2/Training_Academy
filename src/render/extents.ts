import { WORLD_IDS, type WorldId } from '@/engine/schema';

/**
 * The few numbers that both the layout (archipelago.ts) and the pictures of the islands (sprites.ts) depend on:
 * the camera's angle, and how much room each place is given. They live apart from the layout so that moving a boat
 * or a cloud does not make the committed pictures look out of date; changing anything here does, and should.
 */

/** How far below the horizontal the camera looks. */
export const PITCH = (36 * Math.PI) / 180;

/**
 * The places on the map: the lighthouse in the middle, and an island for each world but one. The Music Lab has no
 * island of its own: it is in the lighthouse, which stands in the middle of every arrangement and which every
 * screen shape keeps in view. (An island more would have made every island smaller: on the smallest phones held
 * sideways, where seven places already stand in one row, from 81 pixels wide to 71.)
 */
export type IslandId = Exclude<WorldId, 'music-lab'>;
export type PlaceId = 'academy' | IslandId;
const ISLANDS = WORLD_IDS.filter((world): world is IslandId => world !== 'music-lab');
export const PLACES: readonly PlaceId[] = ['academy', ...ISLANDS];

/** Where on the map a world is. */
export function placeOf(world: WorldId): PlaceId {
  return world === 'music-lab' ? 'academy' : world;
}

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
