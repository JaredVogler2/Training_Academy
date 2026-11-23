import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { packPath, packText } from '../../scripts/content/lib.mjs';
import { buildNumberGardenPack } from '../../scripts/content/number-garden.mjs';

/**
 * A content pack that is written by a generator must be exactly what the generator writes: someone who changes the
 * tables and forgets `npm run content`, or edits the pack file by hand, finds out here.
 */
describe.each([['number-garden', buildNumberGardenPack]])('%s', (_world, build) => {
  it('is the pack its generator writes, to the letter', async () => {
    const pack = build();
    expect(readFileSync(packPath(pack), 'utf8')).toBe(await packText(pack));
  });

  it('is written the same way every time', () => {
    expect(build()).toEqual(build());
  });
});
