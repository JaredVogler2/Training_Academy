// What the content generators share: seeded choices, and writing a pack the way the repository keeps one.
//
// The game never makes up a challenge while it runs. Every challenge a child meets is written out in a pack file,
// where it can be read, linted and reviewed. These scripts are how the many challenges of one kind get written:
// a generator turns a short table of what to ask into the full, explicit pack. `npm run content` runs them all;
// tests/content/generated.test.ts fails if a pack file is not exactly what its generator writes.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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

/** Where a world's extra lines for the voice live: the names of its pictures, and sounds that are not speech. */
export function voiceLinesPath(world) {
  return join(root, 'src/voice/lines', `${world}.json`);
}

export async function voiceLinesText(lines) {
  const config = await prettier.resolveConfig(voiceLinesPath('any'));
  return prettier.format(JSON.stringify(lines), { ...config, parser: 'json' });
}

export async function writeVoiceLines(world, lines) {
  writeFileSync(voiceLinesPath(world), await voiceLinesText(lines));
  const count = Object.values(lines.groups)
    .flatMap((group) => Object.values(group))
    .reduce((total, section) => total + Object.keys(section).length, 0);
  console.log(`src/voice/lines/${world}.json: ${count} clips beside the pack's lines`);
}

// ---------------------------------------------------------------------------------------------------------------------
// A lesson that has been written down does not change without a new version.
//
// A child can leave an activity half-way, and the game takes it up again where it was left — on another day, and
// after the game itself has been updated. That is only safe if the lesson is the same lesson. So every lesson is
// written down here by its id and version with a mark made from the whole of it, and the build refuses a lesson
// that differs from its mark: give it a new version, and a sitting of the old one is started afresh.
// (src/content/lessons.lock.json; tests/content/generated.test.ts checks it too.)

export const lockPath = join(root, 'src/content/lessons.lock.json');

export const lessonKey = (lesson) => `${lesson.id}@${String(lesson.version)}`;

/** A short mark of a lesson: any change to its challenges, its plan or its words changes it. */
export const lessonMark = (lesson) =>
  createHash('sha256').update(JSON.stringify(lesson)).digest('hex').slice(0, 24);

export const LOCK_ABOUT =
  'Every lesson that has been written, by id and version, with a mark made from the whole of it. A lesson that changes must be given a new version: an activity left half-way is taken up again only in the version it was begun in. Written by `npm run content`, which refuses a lesson that differs from its mark. Do not edit a mark by hand; a line may be deleted only for a lesson that no released build has had.';

export function readLock() {
  return existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')).lessons : {};
}

/**
 * The lock with these packs' lessons in it, and the lessons that differ from what is written down for them.
 * Marks of versions that are no longer in any pack are kept: they are the record of what was once released.
 */
export function lockLessons(packs, lock) {
  const lessons = { ...lock };
  const changed = [];
  for (const pack of packs) {
    for (const lesson of pack.lessons) {
      const key = lessonKey(lesson);
      const mark = lessonMark(lesson);
      if (lessons[key] === undefined) lessons[key] = mark;
      else if (lessons[key] !== mark) changed.push(key);
    }
  }
  const sorted = Object.fromEntries(
    Object.keys(lessons)
      .sort()
      .map((key) => [key, lessons[key]]),
  );
  return { lessons: sorted, changed };
}

export async function lockText(lessons) {
  const config = await prettier.resolveConfig(lockPath);
  return prettier.format(JSON.stringify({ about: LOCK_ABOUT, lessons }), {
    ...config,
    parser: 'json',
  });
}
