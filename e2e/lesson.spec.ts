import {
  LESSON_PATH,
  choose,
  expect,
  finishCorrectly,
  finished,
  lessonSkill,
  myTurn,
  next,
  openGrownUps,
  screenFit,
  stepNumber,
  test,
  type Page,
} from './fixtures';

const lesson = (page: Page) => page.getByTestId('lesson');
const skill = lessonSkill;

test.describe('the sample activity', () => {
  test('a brand-new player finishes it by looking and tapping, with nothing to read', async ({
    page,
    press,
  }) => {
    // From the very first screen, the way a child would: the picture of the world, then the big button.
    await page.goto('/');
    await press(page.getByRole('link', { name: /Number Garden/ }));
    await press(page.getByRole('link', { name: 'Play', exact: true }));
    await expect(page).toHaveURL(new RegExp(`${LESSON_PATH}$`));

    // First the guide shows how: the matching group is lit and a hand points at it. Nothing is asked yet.
    await expect(lesson(page).locator('[data-choice][data-state="same"]')).toHaveCount(1);
    await expect(lesson(page).locator('[data-choice][data-state="same"] svg').last()).toBeVisible();
    expect(await stepNumber(page)).toBe(1);
    // Tapping a picture during the demonstration does nothing.
    await lesson(page).locator('[data-choice]').first().click({ force: true });
    expect(await stepNumber(page)).toBe(1);

    await press(myTurn(page));
    expect(await stepNumber(page)).toBe(2);
    await expect(lesson(page).locator('[data-choice][data-state="same"]')).toHaveCount(0);

    // A right answer is shown, not just scored: the two groups light up together and the way on appears.
    await choose(page, press, true);
    await expect(lesson(page).locator('[data-same="true"]')).toBeVisible();
    await expect(lesson(page).locator('[data-choice][data-state="same"]')).toHaveCount(1);
    await expect(
      page.getByRole('status').filter({ hasText: 'Yes. The same amount.' }),
    ).toBeVisible();
    await press(next(page));
    expect(await stepNumber(page)).toBe(3);

    await finishCorrectly(page, press);
    await expect(finished(page).getByRole('heading', { name: 'All done!' })).toBeVisible();
    await expect(finished(page)).toContainText('3 of 3 right at the first try, with no help.');

    // Home again, and the game now knows who is playing.
    await press(finished(page).getByRole('link', { name: 'Islands' }));
    await expect(page.getByRole('navigation', { name: 'Worlds' })).toBeVisible();
    await expect(page.getByText('Explorer', { exact: true })).toBeVisible();

    // The grown-up sees exactly what was shown: three independent successes, on one day.
    await openGrownUps(page);
    await expect(skill(page)).toHaveAttribute('data-status', 'provisionally-independent');
    await expect(skill(page)).toContainText('Independent so far');
    await expect(skill(page)).toContainText(
      '3 independent successes in 3 kinds of question on 1 day.',
    );
    await expect(skill(page)).toContainText('2 right at the first try in practice with the guide.');
  });

  test('a wrong answer is set aside and taught, never punished, and never counted as independent', async ({
    page,
    press,
  }) => {
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    await choose(page, press, true);
    await press(next(page));
    await choose(page, press, true);
    await press(next(page));

    // The first independent question: pick a group with a different amount.
    expect(await stepNumber(page)).toBe(4);
    await choose(page, press, false);
    const away = lesson(page).locator('[data-choice][data-state="away"]');
    await expect(away).toHaveCount(1);
    await expect(away).toHaveAttribute('aria-disabled', 'true');
    await expect(
      page.getByRole('status').filter({ hasText: 'Not the same amount. Look again.' }),
    ).toBeVisible();
    // Still the same question, and no "next": the child simply tries again.
    expect(await stepNumber(page)).toBe(4);
    await expect(next(page)).toHaveCount(0);
    // The choice that was set aside cannot be picked again.
    await away.click({ force: true });
    expect(await stepNumber(page)).toBe(4);
    await expect(lesson(page).locator('[data-choice][data-state="open"]')).toHaveCount(2);

    await choose(page, press, true);
    await press(next(page));
    await finishCorrectly(page, press);
    // One more question was added at the end to try the idea again with a different picture.
    await expect(finished(page)).toContainText('3 of 4 right at the first try, with no help.');

    await openGrownUps(page);
    await expect(skill(page)).toContainText('3 independent successes');
    await expect(skill(page)).toContainText('1 first try without help was not right.');
    await expect(skill(page)).toContainText('1 right after a hint, another try or help.');
  });

  test('help comes one step at a time, and an answer given after help is recorded as helped', async ({
    page,
    press,
  }) => {
    await page.goto(LESSON_PATH);
    const help = page.getByRole('button', { name: 'Help me' });
    // No help is offered while the guide is still showing how.
    await expect(help).toBeDisabled();
    await press(myTurn(page));
    await choose(page, press, true);
    await press(next(page));
    await choose(page, press, true);
    await press(next(page));

    // An independent question with three choices: count together, then one choice goes, then the answer is shown.
    await expect(lesson(page).locator('[data-choice]')).toHaveCount(3);
    await press(help);
    await expect(
      page.getByRole('status').filter({ hasText: 'Touch them one by one.' }),
    ).toBeVisible();
    await expect(lesson(page).locator('[data-choice][data-state="open"]')).toHaveCount(3);
    await press(help);
    await expect(
      page.getByRole('status').filter({ hasText: 'This group has a different amount.' }),
    ).toBeVisible();
    await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(1);
    await press(help);
    await expect(lesson(page).locator('[data-choice][data-state="same"]')).toHaveCount(1);
    await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(2);
    await expect(help).toBeDisabled();

    // The child still gets to tap it.
    await press(lesson(page).locator('[data-choice][data-state="same"]'));
    await press(next(page));
    await finishCorrectly(page, press);

    await openGrownUps(page);
    await expect(skill(page)).toContainText('1 right after a hint, another try or help.');
    await expect(skill(page)).not.toContainText('was not right');
  });

  test('the guide shows what is happening without a word: pointing, wondering, glad, patient', async ({
    page,
    press,
  }) => {
    const guide = lesson(page).getByTestId('guide').first();
    await page.goto(LESSON_PATH);
    // While the demonstration is on, the guide points at it.
    await expect(myTurn(page)).toBeVisible();
    await expect(guide).toHaveAttribute('data-state', 'point');
    // The guide is a picture of what the caption says, never the only way to know: hidden from screen readers.
    await expect(guide).toHaveAttribute('aria-hidden', 'true');

    // A new question: the guide wonders along, then settles down to wait.
    await press(myTurn(page));
    await expect(guide).toHaveAttribute('data-state', 'think');
    await expect(guide).toHaveAttribute('data-state', 'idle', { timeout: 8000 });

    // A wrong answer: a tilt of the head. There is no sad or cross state for it to be in.
    await choose(page, press, false);
    await expect(guide).toHaveAttribute('data-state', 'retry');

    // Help: the guide points again.
    await press(page.getByRole('button', { name: 'Help me' }));
    await expect(guide).toHaveAttribute('data-state', 'point');

    // A right answer: glad.
    await choose(page, press, true);
    await expect(guide).toHaveAttribute('data-state', 'celebrate');

    // And at the end, the guide is there celebrating.
    await press(next(page));
    await finishCorrectly(page, press);
    await expect(finished(page).getByTestId('guide')).toHaveAttribute('data-state', 'celebrate');
  });

  test('two quick taps count once', async ({ page, press }) => {
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    expect(await stepNumber(page)).toBe(2);
    const target = await lesson(page).locator('[data-same] svg').getAttribute('data-count');
    const right = lesson(page).locator(`[data-choice]:has(svg[data-count="${target}"])`);
    await right.dblclick();
    await expect(next(page)).toBeVisible();
    expect(await stepNumber(page)).toBe(2);

    // And two quick taps on "next" move on by one step, not two.
    await next(page).dblclick();
    expect(await stepNumber(page)).toBe(3);
    await finishCorrectly(page, press);
    await expect(finished(page)).toContainText('3 of 3');
  });

  test('a refresh in the middle picks up at the same question, with the pictures in the same places', async ({
    page,
    press,
  }) => {
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    await choose(page, press, true);
    await press(next(page));
    await choose(page, press, true);
    await press(next(page));
    await choose(page, press, false);
    // The choice that was tried is counted against the group, and then set aside.
    await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(1);

    const snapshot = async () => ({
      step: await stepNumber(page),
      prompt: await lesson(page).locator('[data-same] svg').getAttribute('data-item'),
      choices: await lesson(page)
        .locator('[data-choice]')
        .evaluateAll((choices) =>
          choices.map(
            (choice) => `${choice.getAttribute('aria-label')}:${choice.getAttribute('data-state')}`,
          ),
        ),
    });
    const before = await snapshot();
    expect(before.step).toBe(4);
    expect(before.choices.filter((choice) => choice.endsWith(':away'))).toHaveLength(1);

    await page.reload();
    await expect(lesson(page).locator('[data-choice]').first()).toBeVisible();
    expect(await snapshot()).toEqual(before);

    await finishCorrectly(page, press);
    await expect(finished(page)).toContainText('3 of 4');
    await openGrownUps(page);
    // Every answer was recorded exactly once across the refresh.
    await expect(skill(page)).toContainText('1 first try without help was not right.');
    await expect(skill(page)).toContainText('3 independent successes');
  });

  test('leaving and coming back continues where it was; "Again" starts afresh', async ({
    page,
    press,
  }) => {
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    await choose(page, press, true);
    await press(next(page));
    expect(await stepNumber(page)).toBe(3);

    // The way out is the way home: to the islands, at any point, with nothing asked.
    await press(page.getByRole('link', { name: 'Leave the activity' }));
    await press(page.getByRole('link', { name: /Number Garden/ }));
    await expect(page.getByRole('heading', { level: 1, name: 'Number Garden' })).toBeVisible();
    await press(page.getByRole('link', { name: 'Play', exact: true }));
    await expect(lesson(page).locator('[data-choice]').first()).toBeVisible();
    expect(await stepNumber(page)).toBe(3);

    await finishCorrectly(page, press);
    await press(finished(page).getByRole('button', { name: 'Again' }));
    await expect(myTurn(page)).toBeVisible();
    expect(await stepNumber(page)).toBe(1);
  });

  test('fits the screen with large, separate choices @layout', async ({ page, press }) => {
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    await choose(page, press, true);
    await press(next(page));
    await choose(page, press, true);
    await press(next(page));
    await expect(lesson(page).locator('[data-choice]')).toHaveCount(3);
    await expect(lesson(page).locator('[data-choice][data-state="open"]')).toHaveCount(3);

    const viewport = page.viewportSize();
    if (!viewport) throw new Error('no viewport');
    // The whole activity is on one screen: nothing to scroll to, in either direction.
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });

    const boxes = await lesson(page)
      .locator('[data-choice]')
      .evaluateAll((choices) =>
        choices.map((choice) => choice.getBoundingClientRect().toJSON() as DOMRect),
      );
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(96);
      expect(box.height).toBeGreaterThanOrEqual(72);
      expect(box.right).toBeLessThanOrEqual(viewport.width);
      expect(box.bottom).toBeLessThanOrEqual(viewport.height);
    }
    for (let a = 0; a < boxes.length; a++) {
      for (let b = a + 1; b < boxes.length; b++) {
        const [one, two] = [boxes[a]!, boxes[b]!];
        const gap = Math.max(
          two.left - one.right,
          one.left - two.right,
          two.top - one.bottom,
          one.top - two.bottom,
        );
        expect(gap, 'choices are at least 8 px apart').toBeGreaterThanOrEqual(8);
      }
    }
    // Each thing in a picture is big enough to see and count.
    const thing = await lesson(page).locator('[data-choice] svg g > g').first().boundingBox();
    expect(Math.min(thing?.width ?? 0, thing?.height ?? 0)).toBeGreaterThanOrEqual(22);
  });

  test('an address for an activity that does not exist goes back to its world', async ({
    page,
  }) => {
    await page.goto('/world/number-garden/play/no-such-activity');
    await expect(page).toHaveURL(/\/world\/number-garden$/);
    await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();

    // Another world's activity is not this world's: back to the world that was named.
    await page.goto('/world/robot-ridge/play/ng-same-amount-01');
    await expect(page).toHaveURL(/\/world\/robot-ridge$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Robot Ridge' })).toBeVisible();
  });
});
