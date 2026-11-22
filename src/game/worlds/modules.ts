import type { ComponentType } from 'react';
import { loadChunk } from '@/app/chunks';
import type { Stimulus, WorldId } from '@/engine';

/**
 * A world's own code: how its challenges are drawn (and, as the worlds are built, their scenes and mini-games).
 * Each is a separate chunk, fetched the first time that world is entered and never before.
 */

export interface PictureProps {
  stimulus: Stimulus;
  /** When true, the things in the picture light up one after another: "count them with me". */
  counting?: boolean;
}

export interface WorldModule {
  Picture: ComponentType<PictureProps>;
  /** The picture in words, for screen readers: "two snails". */
  describe(stimulus: Stimulus): string;
}

const MODULES: Partial<Record<WorldId, () => Promise<{ default: WorldModule }>>> = {
  'number-garden': () => import('./number-garden'),
};

export function hasWorldModule(world: WorldId): boolean {
  return world in MODULES;
}

export function loadWorldModule(world: WorldId): Promise<WorldModule> {
  const loader = MODULES[world];
  if (!loader) return Promise.reject(new Error(`${world} has no module yet.`));
  return loadChunk(`module:${world}`, loader).then((module) => module.default);
}
