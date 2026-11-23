import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildExplorerHarborPack,
  buildExplorerHarborVoice,
} from '../../scripts/content/explorer-harbor.mjs';
import { buildInventorIslandPack } from '../../scripts/content/inventor-island.mjs';
import { packPath, packText, voiceLinesPath, voiceLinesText } from '../../scripts/content/lib.mjs';
import {
  buildMemoryForestPack,
  buildMemoryForestVoice,
} from '../../scripts/content/memory-forest.mjs';
import { buildNumberGardenPack } from '../../scripts/content/number-garden.mjs';
import {
  buildReadingCovePack,
  buildReadingCoveVoice,
} from '../../scripts/content/reading-cove.mjs';
import { buildRobotRidgePack } from '../../scripts/content/robot-ridge.mjs';

/**
 * A content pack that is written by a generator must be exactly what the generator writes: someone who changes the
 * tables and forgets `npm run content`, or edits the pack file by hand, finds out here.
 */
describe.each([
  ['reading-cove', buildReadingCovePack],
  ['number-garden', buildNumberGardenPack],
  ['robot-ridge', buildRobotRidgePack],
  ['memory-forest', buildMemoryForestPack],
  ['inventor-island', buildInventorIslandPack],
  ['explorer-harbor', buildExplorerHarborPack],
])('%s', (_world, build) => {
  it('is the pack its generator writes, to the letter', async () => {
    const pack = build();
    expect(readFileSync(packPath(pack), 'utf8')).toBe(await packText(pack));
  });

  it('is written the same way every time', () => {
    expect(build()).toEqual(build());
  });
});

describe('what the voice is asked to say for a world, beside its lines', () => {
  it.each([
    ['reading-cove', buildReadingCoveVoice],
    ['memory-forest', buildMemoryForestVoice],
    ['explorer-harbor', buildExplorerHarborVoice],
  ])('%s: is the list its generator writes, to the letter', async (world, build) => {
    expect(readFileSync(voiceLinesPath(world), 'utf8')).toBe(await voiceLinesText(build()));
  });
});
