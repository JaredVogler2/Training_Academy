import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildExplorerHarborPack,
  buildExplorerHarborVoice,
} from '../../scripts/content/explorer-harbor.mjs';
import { buildInventorIslandPack } from '../../scripts/content/inventor-island.mjs';
import { lessonCalled } from '@/content/lessonList';
import {
  lessonKey,
  lessonList,
  lessonListPath,
  lessonListText,
  lessonMark,
  lockLessons,
  lockPath,
  lockText,
  packPath,
  packText,
  readLock,
  voiceLinesPath,
  voiceLinesText,
} from '../../scripts/content/lib.mjs';
import {
  buildMemoryForestPack,
  buildMemoryForestVoice,
} from '../../scripts/content/memory-forest.mjs';
import { buildMusicLabPack } from '../../scripts/content/music-lab.mjs';
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
  ['music-lab', buildMusicLabPack],
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

describe('what each activity is called, for a page that lists them before their content has arrived', () => {
  const packs = [
    buildReadingCovePack(),
    buildNumberGardenPack(),
    buildRobotRidgePack(),
    buildMemoryForestPack(),
    buildInventorIslandPack(),
    buildExplorerHarborPack(),
    buildMusicLabPack(),
  ];

  it('is in the file exactly as the build writes it from the packs', async () => {
    expect(readFileSync(lessonListPath, 'utf8')).toBe(await lessonListText(packs));
  });

  it('is every activity of every world, by the name and the minutes its pack gives it, and nothing else', () => {
    const lessons = packs.flatMap((pack) => pack.lessons);
    const { lessons: listed } = lessonList(packs);
    expect(Object.keys(listed)).toEqual(lessons.map((lesson) => lesson.id));
    for (const lesson of lessons) {
      expect(listed[lesson.id]).toEqual({ title: lesson.title, minutes: lesson.estimatedMinutes });
      expect(lessonCalled(lesson.id)).toEqual(listed[lesson.id]);
    }
    expect(lessonCalled('no-such-activity')).toBeNull();
    // Not something every object has, either.
    expect(lessonCalled('constructor')).toBeNull();
  });
});

/**
 * A lesson that has been written down does not change without a new version. An activity left half-way is taken
 * up again where it was left, on another day and after an update, and that is only safe if it is the same
 * lesson. (One changed without a new version once: three tunes of "Make a tune" were made a bar shorter after
 * they had gone live.)
 */
describe('the lessons that have been written down', () => {
  const packs = [
    buildReadingCovePack(),
    buildNumberGardenPack(),
    buildRobotRidgePack(),
    buildMemoryForestPack(),
    buildInventorIslandPack(),
    buildExplorerHarborPack(),
    buildMusicLabPack(),
  ];
  const lessons = packs.flatMap((pack) => pack.lessons);

  it('are every lesson there is, each with the mark that the whole of it makes', () => {
    const lock = readLock();
    for (const lesson of lessons) {
      expect(
        lock[lessonKey(lesson)],
        `${lessonKey(lesson)} has changed: give it a new version`,
      ).toBe(lessonMark(lesson));
    }
  });

  it('are in the file exactly as the build writes them', async () => {
    const { lessons: written, changed } = lockLessons(packs, readLock());
    expect(changed).toEqual([]);
    expect(readFileSync(lockPath, 'utf8')).toBe(await lockText(written));
  });

  it('keep the mark of a version that has been replaced: it is the record of what was once played', () => {
    const lock = readLock();
    expect(lock['ml-tune-01@1']).toBeDefined();
    expect(lock['ml-tune-01@2']).toBeDefined();
    expect(lock['ml-tune-01@1']).not.toBe(lock['ml-tune-01@2']);
  });

  it('a lesson that differs from its mark is named, and its mark is left as it was', () => {
    const [first] = lessons;
    if (!first) throw new Error('There are no lessons.');
    const altered = [{ lessons: [{ ...first, title: 'Something else' }] }];
    const lock = { [lessonKey(first)]: lessonMark(first) };
    const result = lockLessons(altered, lock);
    expect(result.changed).toEqual([lessonKey(first)]);
    expect(result.lessons).toEqual(lock);
  });

  it('a new lesson, or a new version of one, is written down beside what is there', () => {
    const [first] = lessons;
    if (!first) throw new Error('There are no lessons.');
    const next = { ...first, version: first.version + 1, title: 'Something else' };
    const lock = { [lessonKey(first)]: lessonMark(first) };
    const result = lockLessons([{ lessons: [next] }], lock);
    expect(result.changed).toEqual([]);
    expect(Object.keys(result.lessons)).toEqual([lessonKey(first), lessonKey(next)]);
  });

  it('marks any change at all: a word, a choice, the order of the plan', () => {
    const [first] = lessons;
    if (!first) throw new Error('There are no lessons.');
    const copy = structuredClone(first);
    copy.summary = `${String(copy.summary)} `;
    expect(lessonMark(copy)).not.toBe(lessonMark(first));
    expect(lessonMark(structuredClone(first))).toBe(lessonMark(first));
  });
});
