// Writes every content pack that is made by a generator:  npm run content
//
// Run it after changing a generator or one of the hand-written sources in scripts/content/authored. The packs it
// writes are committed; tests/content/generated.test.ts fails if a pack file differs from what its generator writes.

import { writePack } from './lib.mjs';
import { buildNumberGardenPack } from './number-garden.mjs';

for (const pack of [buildNumberGardenPack()]) await writePack(pack);
