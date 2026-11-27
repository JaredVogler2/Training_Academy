import type { Page } from '@playwright/test';
import inventorIsland from '../src/content/packs/inventor-island.v2.json' with { type: 'json' };
import type { Challenge, ContentPack, Lesson } from '../src/engine/schema';
import { createSession } from '../src/engine/session';
import { PACKS } from './play';

/**
 * Which steps a sitting brings is drawn by lot: three of a pool of ten, say, from a seed the browser's random
 * source gives. A test that is about one of those steps does not wait for luck to bring it.
 *
 * One did. It played up to eight sittings of the shelter looking for one bench of ten; with three drawn a
 * sitting, eight sittings in a row miss it one time in seventeen, and CI's run 57 was that time: nothing was the
 * matter with the game or with the browser. A test now finds a seed that brings what it is about, with the
 * engine's own planning, and has the page plan its sittings from that seed.
 */

const EVERY_PACK: ContentPack[] = [
  ...Object.values(PACKS),
  inventorIsland as unknown as ContentPack,
];

function lessonCalled(id: string): Lesson {
  for (const pack of EVERY_PACK) {
    const found = pack.lessons.find((lesson) => lesson.id === id);
    if (found) return found;
  }
  throw new Error(`No pack these helpers know has an activity called ${id}.`);
}

/** How many seeds are tried before giving up: far more than any pool needs, if what is wanted is in it at all. */
const SEEDS_TRIED = 2000;

/**
 * The first seed whose sitting of an activity brings, as the first step to be done alone, one that `wanted` says
 * yes to. Found by planning sittings exactly as the game does (`createSession`), so it stays right when the
 * content or the planning changes; and it says so plainly when nothing in the pool is wanted any more.
 */
export function seedThatBrings(
  lessonId: string,
  wanted: (challenge: Challenge) => boolean,
): number {
  const lesson = lessonCalled(lessonId);
  for (let seed = 1; seed <= SEEDS_TRIED; seed++) {
    const session = createSession(lesson, {
      id: 'a-sitting-planned-by-a-test',
      profileId: 'nobody',
      seed,
      now: 0,
      contentVersion: 1,
    });
    const first = session.steps.find((step) => step.stage === 'independent');
    const challenge = lesson.challenges.find((each) => each.id === first?.challengeId);
    if (challenge && wanted(challenge)) return seed;
  }
  throw new Error(
    `Of ${String(SEEDS_TRIED)} sittings of ${lessonId}, none begins the part done alone with what this test is about: is it still in the pool?`,
  );
}

/**
 * Every sitting begun on this page is planned from `seed`: the same steps, in the same order, every time.
 * (A sitting's seed is one 32-bit number from the browser's random source; everything else that asks that source
 * for numbers still gets them.)
 */
export async function pinSeed(page: Page, seed: number): Promise<void> {
  await page.addInitScript((value) => {
    const real = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = <T extends ArrayBufferView<ArrayBuffer>>(array: T): T => {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = value;
        return array;
      }
      return real(array);
    };
  }, seed);
}
