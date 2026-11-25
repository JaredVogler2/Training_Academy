import type { WorldId } from '@/engine';
import { explorerHarborRules } from './explorerHarbor';
import { inventorIslandRules } from './inventorIsland';
import { memoryForestRules } from './memoryForest';
import { musicLabRules } from './musicLab';
import { numberGardenRules } from './numberGarden';
import { readingCoveRules } from './readingCove';
import { robotRidgeRules } from './robotRidge';
import type { WorldRules } from './types';

export type { Report, WorldRules } from './types';

/** A world with content has rules here; the lint refuses a pack whose world has none. */
export const WORLD_RULES: Partial<Record<WorldId, WorldRules>> = {
  'reading-cove': readingCoveRules,
  'number-garden': numberGardenRules,
  'robot-ridge': robotRidgeRules,
  'memory-forest': memoryForestRules,
  'inventor-island': inventorIslandRules,
  'explorer-harbor': explorerHarborRules,
  'music-lab': musicLabRules,
};
