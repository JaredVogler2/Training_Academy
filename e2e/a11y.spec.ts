import AxeBuilder from '@axe-core/playwright';
import {
  LESSON_PATH,
  choose,
  expect,
  myTurn,
  next,
  openGrownUps,
  test,
  type Page,
} from './fixtures';

/**
 * Automated accessibility checks (axe-core, WCAG 2.1 A and AA rules) on every screen the shell has. Automated checks
 * find perhaps a third of real problems; they are a floor, not a certificate. What they cannot judge — whether a
 * four-year-old understands the screen — is recorded in docs/QUALITY_REPORT.md as not yet tested with children.
 */

async function expectNoViolations(page: Page, context: string) {
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
    await expect(page.getByRole('link', { name: 'Play' })).toBeVisible();
    await expectNoViolations(page, 'Number Garden');
    await page.goto('/world/inventor-island');
    await expect(page.getByText('This world is not open yet.')).toBeVisible();
    await expectNoViolations(page, 'Inventor Island');
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
