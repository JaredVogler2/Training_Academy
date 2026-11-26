// Writes every content pack that is made by a generator:  npm run content
//
// Run it after changing a generator or one of the hand-written sources in scripts/content/authored. The packs it
// writes are committed; tests/content/generated.test.ts fails if a pack file differs from what its generator writes.

import { buildExplorerHarborPack, buildExplorerHarborVoice } from './explorer-harbor.mjs';
import { buildInventorIslandPack } from './inventor-island.mjs';
import { writeFileSync } from 'node:fs';
import {
  lessonListPath,
  lessonListText,
  lockLessons,
  lockPath,
  lockText,
  readLock,
  writePack,
  writeVoiceLines,
} from './lib.mjs';
import { buildMemoryForestPack, buildMemoryForestVoice } from './memory-forest.mjs';
import { buildMusicLabPack } from './music-lab.mjs';
import { buildNumberGardenPack } from './number-garden.mjs';
import { buildReadingCovePack, buildReadingCoveVoice } from './reading-cove.mjs';
import { buildRobotRidgePack } from './robot-ridge.mjs';

// One pack for each world, in the order the worlds are met.
const packs = [
  buildReadingCovePack(),
  buildNumberGardenPack(),
  buildRobotRidgePack(),
  buildMemoryForestPack(),
  buildInventorIslandPack(),
  buildExplorerHarborPack(),
  buildMusicLabPack(),
];

// A lesson that has been written down does not change without a new version: nothing is written until that holds.
const { lessons, changed } = lockLessons(packs, readLock());
if (changed.length > 0) {
  console.error(
    `These lessons are not what was written down for them: ${changed.join(', ')}.\n` +
      'A child who left one half-way would be taken back into something else. Give each a new version in its\n' +
      "generator (and its world's pack a new contentVersion); a sitting of the old version is then begun afresh.",
  );
  process.exit(1);
}

for (const pack of packs) await writePack(pack);
writeFileSync(lockPath, await lockText(lessons));
console.log(`src/content/lessons.lock.json: ${Object.keys(lessons).length} lessons written down`);
writeFileSync(lessonListPath, await lessonListText(packs));
console.log('src/content/lessonList.json: what each activity is called');
await writeVoiceLines('reading-cove', buildReadingCoveVoice());
await writeVoiceLines('memory-forest', buildMemoryForestVoice());
await writeVoiceLines('explorer-harbor', buildExplorerHarborVoice());
