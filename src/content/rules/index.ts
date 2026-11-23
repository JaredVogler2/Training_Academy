import type { WorldId } from '@/engine';
import { explorerHarborRules } from './explorerHarbor';
import { memoryForestRules } from './memoryForest';
import { numberGardenRules } from './numberGarden';
import { readingCoveRules } from './readingCove';
import type { WorldRules } from './types';

export type { Report, WorldRules } from './types';

/** A world with content has rules here; the lint refuses a pack whose world has none. */
export const WORLD_RULES: Partial<Record<WorldId, WorldRules>> = {
  'number-garden': numberGardenRules,
  'memory-forest': memoryForestRules,
  'reading-cove': readingCoveRules,
  'explorer-harbor': explorerHarborRules,
};
