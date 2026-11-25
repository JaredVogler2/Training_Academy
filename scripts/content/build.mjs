// Writes every content pack that is made by a generator:  npm run content
//
// Run it after changing a generator or one of the hand-written sources in scripts/content/authored. The packs it
// writes are committed; tests/content/generated.test.ts fails if a pack file differs from what its generator writes.

import { buildExplorerHarborPack, buildExplorerHarborVoice } from './explorer-harbor.mjs';
import { buildInventorIslandPack } from './inventor-island.mjs';
import { writePack, writeVoiceLines } from './lib.mjs';
import { buildMemoryForestPack, buildMemoryForestVoice } from './memory-forest.mjs';
import { buildMusicLabPack } from './music-lab.mjs';
import { buildNumberGardenPack } from './number-garden.mjs';
import { buildReadingCovePack, buildReadingCoveVoice } from './reading-cove.mjs';
import { buildRobotRidgePack } from './robot-ridge.mjs';

// One pack for each world, in the order the worlds are met.
for (const pack of [
  buildReadingCovePack(),
  buildNumberGardenPack(),
  buildRobotRidgePack(),
  buildMemoryForestPack(),
  buildInventorIslandPack(),
  buildExplorerHarborPack(),
  buildMusicLabPack(),
]) {
  await writePack(pack);
}
await writeVoiceLines('reading-cove', buildReadingCoveVoice());
await writeVoiceLines('memory-forest', buildMemoryForestVoice());
await writeVoiceLines('explorer-harbor', buildExplorerHarborVoice());
