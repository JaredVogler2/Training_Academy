// The files that decide what the fallback pictures look like: models, materials, water, light, and the boxes the
// pictures are cut to. If any of them changes, the pictures in src/assets/hub/ are out of date.
//
// Shared by scripts/render-sprites.mjs, which records the hash, and tests/render/sprites.test.ts, which checks it.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FIXED = [
  'src/render/extents.ts',
  'src/render/sprites.ts',
  'src/render/hub3d/kit.ts',
  'src/render/hub3d/paint.ts',
  'src/render/hub3d/Sea.tsx',
  'src/render/hub3d/stage.tsx',
  'src/render/hub3d/floating.ts',
];
const ISLANDS = 'src/render/hub3d/islands';

export const SPRITE_SOURCES = [...FIXED, `${ISLANDS}/*.ts`];

export function sourceHash(root) {
  const files = [
    ...FIXED,
    ...readdirSync(join(root, ISLANDS))
      .filter((name) => name.endsWith('.ts'))
      .sort()
      .map((name) => `${ISLANDS}/${name}`),
  ];
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update('\0');
    // Line endings differ between checkouts; the pictures do not.
    hash.update(readFileSync(join(root, file), 'utf8').replace(/\r\n/g, '\n'));
    hash.update('\0');
  }
  return hash.digest('hex');
}
