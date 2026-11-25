import { expect, finished, test } from './fixtures';
import { WORLDS, lessonsOf } from '../src/game/worlds';
import { ACTIVITIES, playToTheEnd } from './play';

const PLAYED_BY_THEIR_OWN_TESTS = ['robot-ridge', 'inventor-island'];

/**
 * Every activity of Reading Cove, Number Garden, Memory Forest, Explorer Harbor and the Music Lab, played from its
 * first screen to its last by giving the answers its content says are right. (Robot Ridge and Inventor Island are played to the
 * end by their own tests, e2e/robot.spec.ts and e2e/inventor.spec.ts, which work out what to do from what is on
 * the screen; the first test here fails if a world is played by neither.) If a lesson cannot be finished — a board that does not take its own answer, a step that never offers the
 * way on, a line that throws — it fails here by name.
 *
 * Motion is reduced, so that nothing has to be waited for but what the game itself insists on (a sequence to
 * repeat is always shown; a group to glance at is always uncovered and covered). One screen is enough: fitting
 * every screen is what the @layout tests are for.
 */
test.describe('every activity can be played to the end', () => {
  test.use({ reducedMotion: 'reduce' });

  test('there is no activity that nothing plays to the end', () => {
    const here = new Set(ACTIVITIES.map((activity) => activity.id));
    for (const world of WORLDS) {
      for (const id of lessonsOf(world)) {
        expect(here.has(id) || PLAYED_BY_THEIR_OWN_TESTS.includes(world.id), id).toBe(true);
      }
    }
    expect(ACTIVITIES.length).toBeGreaterThanOrEqual(31);
  });

  for (const activity of ACTIVITIES) {
    test(`${activity.world}: ${activity.title}`, async ({ page, press }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'played once, on the desktop project');
      // A question that is played to be listened to takes as long as it takes to hear.
      test.setTimeout(activity.world === 'music-lab' ? 300_000 : 150_000);
      // In by a tap, as a child comes in: an activity for listening will not start until the audio is awake.
      await page.goto(`/world/${activity.world}`);
      await press(page.locator(`[data-lesson="${activity.id}"]`));
      const answered = await playToTheEnd(page, press);
      await expect(finished(page)).toBeVisible();
      await expect(finished(page)).toContainText(
        /\d+ of \d+ right at the first try, with no help\./,
      );
      // Every step after the demonstrations was answered once, rightly: nothing needed a second go.
      expect(answered).toBeGreaterThanOrEqual(5);
    });
  }
});
