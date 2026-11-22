import type { PlaceId } from '../../extents';
import { withFacets } from '../kit';
import { buildAcademy } from './academy';
import { buildExplorerHarbor } from './explorer';
import { buildInventorIsland } from './inventor';
import { buildMemoryForest } from './memory';
import { buildNumberGarden } from './number';
import { buildReadingCove } from './reading';
import { buildRobotRidge } from './robot';
import type { Detail, IslandModel } from './types';

export { disposeIsland } from './types';

/** Below this much detail an island is also built with coarser curves: see `withFacets`. */
const COARSE_BELOW = 0.75;

const coarse =
  (build: (detail: Detail) => IslandModel) =>
  (detail: Detail): IslandModel =>
    withFacets(detail < COARSE_BELOW ? 0.6 : 1, () => build(detail));

/** Every place in the archipelago and the function that models it. */
export const ISLAND_BUILDERS: Readonly<Record<PlaceId, (detail: Detail) => IslandModel>> = {
  academy: coarse(buildAcademy),
  'reading-cove': coarse(buildReadingCove),
  'number-garden': coarse(buildNumberGarden),
  'robot-ridge': coarse(buildRobotRidge),
  'memory-forest': coarse(buildMemoryForest),
  'inventor-island': coarse(buildInventorIsland),
  'explorer-harbor': coarse(buildExplorerHarbor),
};

export function isIslandId(value: string): value is PlaceId {
  return Object.hasOwn(ISLAND_BUILDERS, value);
}

export type { Detail, IslandModel, Mover } from './types';
