// What the content generators share: seeded choices, and writing a pack the way the repository keeps one.
//
// The game never makes up a challenge while it runs. Every challenge a child meets is written out in a pack file,
// where it can be read, linted and reviewed. These scripts are how the many challenges of one kind get written:
// a generator turns a short table of what to ask into the full, explicit pack. `npm run content` runs them all;
// tests/content/generated.test.ts fails if a pack file is not exactly what its generator writes.

import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** mulberry32, the same generator the engine shuffles with: a seed gives the same choices every time. */
export function rng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (maxExclusive) => Math.floor(next() * maxExclusive);
  return {
    next,
    int,
    pick: (items) => items[int(items.length)],
    shuffle(items) {
      const copy = items.slice();
      for (let index = copy.length - 1; index > 0; index--) {
        const other = int(index + 1);
        [copy[index], copy[other]] = [copy[other], copy[index]];
      }
      return copy;
    },
  };
}

export const NUMBER_WORDS = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];

/** Where a pack lives: named after its world and its content version. */
export function packPath(pack) {
  return join(root, 'src/content/packs', `${pack.world}.v${pack.contentVersion}.json`);
}

/** The pack as the file holds it: JSON, laid out by the repository's own formatter. */
export async function packText(pack) {
  const config = await prettier.resolveConfig(packPath(pack));
  return prettier.format(JSON.stringify(pack), { ...config, parser: 'json' });
}

export async function writePack(pack) {
  writeFileSync(packPath(pack), await packText(pack));
  const challenges = pack.lessons.reduce((total, lesson) => total + lesson.challenges.length, 0);
  console.log(
    `${pack.world}.v${pack.contentVersion}.json: ${pack.lessons.length} lessons, ${challenges} challenges, ` +
      `${Object.keys(pack.strings.en).length} lines`,
  );
}
