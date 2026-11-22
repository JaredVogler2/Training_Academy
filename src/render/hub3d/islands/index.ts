import type { PlaceId } from '../../archipelago';
import { buildAcademy } from './academy';
import { buildExplorerHarbor } from './explorer';
import { buildInventorIsland } from './inventor';
import { buildMemoryForest } from './memory';
import { buildNumberGarden } from './number';
import { buildReadingCove } from './reading';
import { buildRobotRidge } from './robot';
import type { Detail, IslandModel } from './types';

export { disposeIsland } from './types';

/** Every place in the archipelago and the function that models it. */
export const ISLAND_BUILDERS: Readonly<Record<PlaceId, (detail: Detail) => IslandModel>> = {
  academy: buildAcademy,
  'reading-cove': buildReadingCove,
  'number-garden': buildNumberGarden,
  'robot-ridge': buildRobotRidge,
  'memory-forest': buildMemoryForest,
  'inventor-island': buildInventorIsland,
  'explorer-harbor': buildExplorerHarbor,
};

export function isIslandId(value: string): value is PlaceId {
  return Object.hasOwn(ISLAND_BUILDERS, value);
}

export type { Detail, IslandModel, Mover } from './types';
