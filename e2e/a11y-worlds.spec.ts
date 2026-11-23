import AxeBuilder from '@axe-core/playwright';
import { WORLDS, lessonsOf } from '../src/game/worlds';
import { arrived, expect, myTurn, test, type Page } from './fixtures';
import { ACTIVITIES } from './play';

/**
 * The same automated accessibility checks as e2e/a11y.spec.ts (axe-core, WCAG 2.1 A and AA rules), on every world's
 * front door and on every activity: while it is being shown, and while it is being asked. They are a floor, not a
 * certificate; what they cannot judge is in docs/QUALITY_REPORT.md.
 *
 * Robot Ridge and Inventor Island check their own boards, in e2e/robot.spec.ts and e2e/inventor.spec.ts.
 */

async function expectNoViolations(page: Page, context: string) {
  await arrived(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
  );
  expect(summary, `axe violations on ${context}`).toEqual([]);
}

/** The worlds whose activities are checked elsewhere, by a spec of their own. */
const ELSEWHERE = ['robot-ridge', 'inventor-island'];

test.describe('accessibility, world by world', () => {
  test('every activity there is has a check here or in its own world’s tests', () => {
    const here = new Set(ACTIVITIES.map((activity) => activity.id));
    for (const world of WORLDS) {
      for (const id of lessonsOf(world)) {
        expect(here.has(id) || ELSEWHERE.includes(world.id), id).toBe(true);
      }
    }
  });

  for (const world of WORLDS) {
    test(`${world.name}: its front door`, async ({ page }) => {
      await page.goto(`/world/${world.id}`);
      await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
      // Every activity is offered as a picture with a name.
      const cards = page.locator('[data-lesson]');
      await expect(cards).toHaveCount(lessonsOf(world).length);
      for (const name of await cards.evaluateAll((list) =>
        list.map((card) => card.getAttribute('aria-label') ?? ''),
      )) {
        expect(name.length).toBeGreaterThan(3);
      }
      await expectNoViolations(page, world.name);
    });
  }

  test.describe('every activity, while it is shown and while it is asked', () => {
    // Nothing is waited for but the page: what is checked is what stands on it, not how it got there.
    test.use({ reducedMotion: 'reduce' });

    for (const activity of ACTIVITIES) {
      test(`${activity.world}: ${activity.title}`, async ({ page, press }) => {
        // In by a tap, as a child comes in: an activity for listening will not start until the audio is awake.
        await page.goto(`/world/${activity.world}`);
        await press(page.locator(`[data-lesson="${activity.id}"]`));
        await expect(myTurn(page)).toBeVisible();
        await expectNoViolations(page, `${activity.id}, while it is shown`);
        // Past every demonstration: an activity about four letters shows each of them first.
        const lesson = page.getByTestId('lesson');
        for (let shown = 0; shown < 6 && (await myTurn(page).isVisible()); shown++) {
          const step = (await lesson.getAttribute('data-challenge')) ?? '';
          await press(myTurn(page));
          await expect(lesson).not.toHaveAttribute('data-challenge', step);
        }
        await expect(myTurn(page)).toHaveCount(0);
        await expectNoViolations(page, `${activity.id}, while it is asked`);
      });
    }
  });
});

test.describe('a world’s front door on a phone held sideways', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  for (const world of WORLDS) {
    test(world.name, async ({ page }) => {
      await page.goto(`/world/${world.id}`);
      await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
      await expectNoViolations(page, `${world.name}, sideways`);
    });
  }
});
