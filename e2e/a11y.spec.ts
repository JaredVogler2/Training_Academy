import AxeBuilder from '@axe-core/playwright';
import { CHOOSE, PLACE } from '../src/game/howto/steps';
import {
  CLOSED_WORLD,
  LESSON_PATH,
  arrived,
  choose,
  expect,
  finishCorrectly,
  myTurn,
  howTo,
  howToAt,
  next,
  openGrownUps,
  passHowTo,
  test,
  type Page,
} from './fixtures';

/**
 * Automated accessibility checks (axe-core, WCAG 2.1 A and AA rules) on every screen the shell has. Automated checks
 * find perhaps a third of real problems; they are a floor, not a certificate. What they cannot judge — whether a
 * four-year-old understands the screen — is recorded in docs/QUALITY_REPORT.md as not yet tested with children.
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

test.describe('accessibility', () => {
  test('the hub', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Worlds' })).toBeVisible();
    await expectNoViolations(page, 'the hub');
  });

  test('a world that is open and one that is not', async ({ page }) => {
    await page.goto('/world/number-garden');
    await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
    await expectNoViolations(page, 'Number Garden');
    // A world with nothing to play yet, while there still is one.
    if (CLOSED_WORLD) {
      await page.goto(`/world/${CLOSED_WORLD.id}`);
      await expect(page.getByText('This world is not open yet.')).toBeVisible();
      await expectNoViolations(page, CLOSED_WORLD.name);
    }
  });

  test('the activity: demonstration, question, after a wrong answer, after a right one, the end', async ({
    page,
    press,
  }) => {
    await page.goto(LESSON_PATH);
    await expect(myTurn(page)).toBeVisible();
    await expectNoViolations(page, 'the demonstration');

    await press(myTurn(page));
    await expectNoViolations(page, 'a question');
    await choose(page, press, false);
    await expect(page.getByRole('status').filter({ hasText: 'Look again' })).toBeVisible();
    await expectNoViolations(page, 'after a wrong answer');
    await choose(page, press, true);
    await expect(next(page)).toBeVisible();
    await page.waitForTimeout(1200);
    await expectNoViolations(page, 'after a right answer');

    // Every picture a child can choose has a name for a screen reader; the group to match is described too.
    await press(next(page));
    const choices = page.getByTestId('lesson').locator('[data-choice]');
    for (const label of await choices.evaluateAll((list) =>
      list.map((choice) => choice.getAttribute('aria-label')),
    )) {
      expect(label).toMatch(
        /^(one|two|three) (apple|leaf|snail|acorn|apples|leaves|snails|acorns)$/,
      );
    }
    await expect(page.getByTestId('lesson').locator('[data-same]')).toContainText(
      /The group to match: (one|two|three) /,
    );
  });

  test('the activity paused, and finished', async ({ page, press }) => {
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    await press(page.getByRole('button', { name: 'Pause' }));
    const sheet = page.getByRole('dialog', { name: 'Paused' });
    await expect(sheet).toBeVisible();
    await expectNoViolations(page, 'the pause sheet');
    // The sheet holds focus, starting on the one thing to do.
    await expect(sheet.getByRole('button', { name: 'Carry on' })).toBeFocused();
    await press(sheet.getByRole('button', { name: 'Carry on' }));
    await expect(sheet).toBeHidden();

    await finishCorrectly(page, press);
    await expectNoViolations(page, 'the end of the activity');
  });

  test.describe('the front door', () => {
    test.use({ frontDoor: true });

    test('for a first visit and for a player who has been before', async ({ page, press }) => {
      await page.goto('/');
      const door = page.getByTestId('front-door');
      await expect(door.getByRole('heading', { name: 'Choose your picture' })).toBeVisible();
      await expectNoViolations(page, 'the front door, first visit');
      // Every picture has a name for a screen reader, though none is written on it.
      await expect(door.getByRole('button')).toHaveCount(6);
      await expect(door.getByRole('button', { name: 'The star picture' })).toBeVisible();

      await press(door.getByRole('button', { name: 'The star picture' }));
      await expect(door).toHaveCount(0);
      // (A first visit goes on to "how to play", which has its own check in e2e/howto.spec.ts.)
      await passHowTo(page, press);
      await page.evaluate(() => window.sessionStorage.clear());
      await page.reload();
      await expect(door.getByRole('heading', { name: 'Who is playing?' })).toBeVisible();
      await expect(door.getByRole('button', { name: 'Play as Star' })).toBeVisible();
      await expectNoViolations(page, 'the front door, a player who has been before');
    });
  });

  test.describe('how to play', () => {
    test.use({ frontDoor: true });

    test('while Glim shows, at the child’s turn and once a thing is done, for each of the three', async ({
      page,
      press,
    }) => {
      test.setTimeout(120_000);
      await page.goto('/');
      await press(page.getByTestId('front-door').getByRole('button', { name: 'The star picture' }));
      await expect(howToAt(page, 'choose', 'show')).toBeVisible();
      await expectNoViolations(page, 'how to play: Glim shows choosing');
      await expect(howToAt(page, 'choose', 'turn')).toBeVisible({ timeout: 20_000 });
      await expectNoViolations(page, 'how to play: choosing, the child’s turn');
      await press(howTo(page).locator(`[data-choice="${CHOOSE.turn.same}"]`));
      await expect(howToAt(page, 'choose', 'done')).toBeVisible();
      await expectNoViolations(page, 'how to play: choosing, done');
      await press(next(page));

      await expect(howToAt(page, 'place', 'show')).toBeVisible();
      await expectNoViolations(page, 'how to play: Glim shows placing');
      await expect(howToAt(page, 'place', 'turn')).toBeVisible({ timeout: 20_000 });
      await expectNoViolations(page, 'how to play: placing, the child’s turn');
      for (const card of PLACE.cards) await press(howTo(page).locator(`[data-card="${card}"]`));
      await expectNoViolations(page, 'how to play: placing, everything in its place');
      await press(howTo(page).getByRole('button', { name: 'Done' }));
      await expect(howToAt(page, 'place', 'done')).toBeVisible();
      await press(next(page));

      await expect(howToAt(page, 'again', 'turn')).toBeVisible({ timeout: 20_000 });
      await expectNoViolations(page, 'how to play: showing again, the child’s turn');
      await press(howTo(page).getByRole('button', { name: 'Show me again' }));
      await expect(howToAt(page, 'again', 'done')).toBeVisible();
      await expectNoViolations(page, 'how to play: the end');
    });
  });

  test('an activity while it points out what can be tapped, and while a grown-up is helping', async ({
    page,
    press,
  }) => {
    await page.goto(LESSON_PATH);
    await expect(myTurn(page)).toBeVisible();
    // Three taps on the picture: the way on is pointed out, and the words are in Glim's bubble.
    const picture = page.getByTestId('lesson').locator('[data-same]').first();
    for (let tap = 0; tap < 3; tap++) await press(picture);
    await expect(page.getByTestId('lesson')).toHaveAttribute('data-nudge', 'my-turn');
    await expectNoViolations(page, 'the demonstration, with the way on pointed out');

    await press(myTurn(page));
    await press(page.getByRole('button', { name: 'Pause' }));
    const sheet = page.getByRole('dialog', { name: 'Paused' });
    const helping = sheet.getByRole('button', { name: 'A grown-up is helping', exact: true });
    const box = await helping.boundingBox();
    if (!box) throw new Error('The switch is not on the screen.');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(helping).toHaveAttribute('aria-pressed', 'true', { timeout: 30_000 });
    await page.mouse.up();
    await expectNoViolations(page, 'the pause sheet, with a grown-up helping');
    await press(sheet.getByRole('button', { name: 'Carry on' }));
    await expect(page.getByTestId('lesson')).toHaveAttribute('data-helping', 'true');
    await expectNoViolations(page, 'a question, with a grown-up helping');
  });

  test('the grown-ups area for a player: where to begin, with something seen and a suggestion', async ({
    page,
  }) => {
    // A player, made as the first activity makes one.
    await page.goto(LESSON_PATH);
    await expect(myTurn(page)).toBeVisible();
    await openGrownUps(page);
    const card = page.getByTestId('where-to-begin');
    await expect(card.getByRole('heading', { name: 'Where Explorer begins' })).toBeVisible();
    await expectNoViolations(page, 'where to begin, as it starts');
    await card.getByLabel('Counts five things, touching each one once').selectOption('seen');
    await card.getByLabel('Taps the thing they mean to').selectOption('not-yet');
    await expect(card.getByTestId('begin-suggestion')).toBeVisible();
    await expectNoViolations(page, 'where to begin, with a suggestion and a note');
  });

  test('the grown-ups area: the gate, the area, a dialog', async ({ page }) => {
    await page.goto('/grown-ups');
    await expect(page.getByRole('button', { name: 'Press and hold' })).toBeVisible();
    await expectNoViolations(page, 'the gate');

    await openGrownUps(page);
    await page.getByTestId('diagnostics').getByText('Diagnostics', { exact: true }).click();
    await expectNoViolations(page, 'the grown-ups area');

    await page.getByRole('button', { name: 'Add a player' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoViolations(page, 'the add-player dialog');
    // The dialog holds focus and Escape closes it.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('the not-found page', async ({ page }) => {
    await page.goto('/nowhere');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoViolations(page, 'not found');
  });
});
