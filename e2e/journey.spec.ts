import {
  LESSON_PATH,
  arrived,
  choose,
  expect,
  finished,
  howTo,
  myTurn,
  next,
  passHowTo,
  playHowTo,
  stepNumber,
  test,
  type Page,
} from './fixtures';
import { answer } from './play';

/**
 * The two journeys Phase 03 exists for, played the way a child plays them — by tapping pictures — on a desktop, on
 * a phone, and (tagged @journey) on the named phones and tablets in playwright.config.ts.
 *
 * Wherever a child would act on what they see, these tests act on what is drawn (which picture, how many things in
 * it, which control is the sun-coloured one) and not on words. Words are checked too, but as what a grown-up or a
 * screen reader is given, never as the way forward.
 */

const lesson = (page: Page) => page.getByTestId('lesson');
const frontDoor = (page: Page) => page.getByTestId('front-door');
const guide = (page: Page) => lesson(page).getByTestId('guide');
const paused = (page: Page) => page.getByTestId('lesson-paused');

test.describe('a brand-new child', () => {
  test.use({ frontDoor: true });

  test('goes from the front door to the end of an activity and home again, without reading a word @journey', async ({
    page,
    press,
  }) => {
    await page.goto('/');

    // The front door: Glim, and six pictures.
    await expect(frontDoor(page)).toBeVisible();
    await expect(frontDoor(page).getByTestId('guide')).toHaveAttribute('data-state', 'wave');
    const pictures = frontDoor(page).locator('button[data-avatar]');
    await expect(pictures).toHaveCount(6);
    // The map is behind the door to be seen, and switched off: no island can be tapped or reached by keyboard.
    const islandLinks = page.locator('a[data-world]');
    await expect(islandLinks).toHaveCount(7);
    expect(
      await islandLinks.evaluateAll((links) => links.every((link) => link.closest('[inert]'))),
    ).toBe(true);
    // (Measured once they have arrived: they pop in one after another, and are smaller while they do.)
    await arrived(page);
    for (const picture of await pictures.all()) {
      const box = await picture.boundingBox();
      // (To half a pixel: sizes read back from a browser are floats.)
      expect(box?.width ?? 0, 'a picture is a large target').toBeGreaterThanOrEqual(63.5);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(63.5);
    }

    // One tap on a picture is the whole of signing in.
    await press(frontDoor(page).locator('button[data-avatar="shell"]'));
    await expect(frontDoor(page)).toHaveCount(0);

    // Someone who has never played is shown how, before anything else: three things, each done after Glim.
    // (What is shown, and what each tap does, is e2e/howto.spec.ts; here it is one part of the way in.)
    await expect(howTo(page)).toBeVisible();
    await playHowTo(page, press);

    // The map: Glim points at the island to go to, and it has something to play.
    const worlds = page.getByRole('navigation', { name: 'Worlds' });
    await expect(worlds.getByRole('link')).toHaveCount(7);
    const open = worlds.locator('a[data-next="true"]');
    await expect(open).toHaveCount(1);
    await expect(open).toHaveAttribute('data-open', 'true');
    const hubGuide = page.getByRole('button', { name: /Glim/ }).getByTestId('guide');
    await expect(hubGuide).toHaveAttribute('data-state', 'point', { timeout: 10_000 });
    // The player is the picture that was chosen, named after it until a grown-up says otherwise.
    await expect(page.getByText('Shell', { exact: true })).toBeVisible();

    // Its page: the island, a picture of what is done there, and one sun-coloured way in.
    await press(open);
    await expect(page.getByTestId('world-example')).toBeVisible();
    const play = page.getByRole('link', { name: 'Play', exact: true });
    await expect(play).toBeVisible();
    await press(play);

    // 1. Glim shows how. Nothing can be answered yet: every choice waits.
    await expect(lesson(page).locator('[data-choice]').first()).toBeVisible();
    expect(await stepNumber(page)).toBe(1);
    await expect(lesson(page).locator('[data-choice][aria-disabled="false"]')).toHaveCount(0);
    // At the end of the showing the answer is pointed at.
    await expect(lesson(page).locator('[data-choice][data-state="same"]')).toHaveCount(1, {
      timeout: 15_000,
    });
    await press(myTurn(page));

    // 2 onwards. Two steps with support, then some alone: each answered rightly, as its content says.
    for (let step = 2; step <= 12 && !(await finished(page).isVisible()); step++) {
      expect(await stepNumber(page)).toBe(step);
      await answer(page, press);
      await expect(guide(page)).toHaveAttribute('data-state', 'celebrate');
      await expect(lesson(page).locator('[data-choice][data-state="same"]')).toHaveCount(1);
      await press(next(page));
    }

    // The end: calm, and one sun-coloured way home.
    await expect(finished(page)).toBeVisible();
    await expect(finished(page).getByTestId('guide')).toHaveAttribute('data-state', 'celebrate');
    // For the grown-up: every independent step was right at the first try, with no help.
    await expect(finished(page)).toContainText(/(\d) of \1 right at the first try/);
    await press(finished(page).getByRole('link', { name: 'Islands' }));

    // Home: the map again, with no front door (this visit has begun) and the same player.
    await expect(worlds.getByRole('link')).toHaveCount(7);
    await expect(frontDoor(page)).toHaveCount(0);
    await expect(page.getByText('Shell', { exact: true })).toBeVisible();
  });

  test('is asked who is playing only once in a visit, and is known by their picture the next time @journey', async ({
    page,
    press,
  }) => {
    await page.goto('/');
    await press(frontDoor(page).locator('button[data-avatar="leaf"]'));
    await expect(frontDoor(page)).toHaveCount(0);
    await passHowTo(page, press);
    await expect(page.getByRole('navigation', { name: 'Worlds' }).getByRole('link')).toHaveCount(7);

    // A refresh in the same visit goes straight to the map.
    await page.reload();
    await expect(page.getByRole('navigation', { name: 'Worlds' }).getByRole('link')).toHaveCount(7);
    await expect(frontDoor(page)).toHaveCount(0);

    // A new visit (the tab's memory gone, the device's kept) opens on the front door, with that player on it.
    await page.evaluate(() => window.sessionStorage.clear());
    await page.reload();
    await expect(frontDoor(page)).toBeVisible();
    await expect(frontDoor(page).getByRole('heading')).toHaveText('Who is playing?');
    const mine = frontDoor(page).locator('button[data-avatar]');
    await expect(mine).toHaveCount(1);
    await expect(mine).toHaveAttribute('data-avatar', 'leaf');
    await expect(mine).toHaveAccessibleName('Play as Leaf');
    await press(mine);
    await expect(frontDoor(page)).toHaveCount(0);
    // Known by their picture, and not shown again what they have been shown (or passed by).
    await expect(page.getByText('Leaf', { exact: true })).toBeVisible();
    await expect(howTo(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('when it does not go right first time', () => {
  test('a wrong answer, help, a pause and a refresh all leave the child where they were @journey', async ({
    page,
    press,
  }) => {
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    expect(await stepNumber(page)).toBe(2);

    // A wrong answer on a guided step: the choice is set aside, Glim is patient, and nothing looks like failing.
    await choose(page, press, false);
    await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(1);
    await expect(guide(page)).toHaveAttribute('data-state', /retry|point/);
    await expect(lesson(page).getByRole('status')).toContainText('Not the same amount');
    // With two choices, the one left is now shown to be the answer; tapping it still has to be done.
    await expect(lesson(page).locator('[data-choice][data-state="same"]')).toHaveCount(1);
    await choose(page, press, true);
    await press(next(page));
    expect(await stepNumber(page)).toBe(3);

    // The second guided step, right; then a step on their own.
    await choose(page, press, true);
    await press(next(page));
    expect(await stepNumber(page)).toBe(4);
    await expect(lesson(page).locator('[data-choice]')).toHaveCount(3);

    // "Show me again" is free: Glim puts the question again, and nothing is taken away or given away.
    const help = lesson(page).getByRole('button', { name: 'Help me' });
    await press(lesson(page).getByRole('button', { name: 'Show me again' }));
    await expect(lesson(page).locator('[data-choice][data-state="open"]')).toHaveCount(3);
    await expect(help).toBeEnabled();

    // Help comes a step at a time: first how to look…
    await press(help);
    await expect(lesson(page).getByRole('status')).toContainText('one by one');
    await expect(lesson(page).locator('[data-choice][data-state="open"]')).toHaveCount(3);
    // …then one choice fewer.
    await press(help);
    await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(1);

    // Pause: a sheet with one thing to do. What is behind it cannot be tapped.
    await press(lesson(page).getByRole('button', { name: 'Pause' }));
    await expect(paused(page)).toBeVisible();
    await expect(paused(page).getByRole('button', { name: 'Carry on' })).toBeFocused();
    // (Asked of the browser, for every choice: what is at this choice's middle now? Never the choice. A click
    // aimed there by force proves nothing — on one screen it landed on "carry on", which is in front of it.)
    const reachable = await lesson(page)
      .locator('[data-choice]')
      .evaluateAll(
        (choices) =>
          choices.filter((choice) => {
            const box = choice.getBoundingClientRect();
            const hit = document.elementFromPoint(
              box.left + box.width / 2,
              box.top + box.height / 2,
            );
            return choice.closest('[inert]') === null || (hit !== null && choice.contains(hit));
          }).length,
      );
    expect(reachable, 'choices that can still be tapped behind the pause sheet').toBe(0);
    // The two switches a family may want are here, since the top bar is not.
    await expect(paused(page).getByRole('button', { name: 'Sound' })).toBeVisible();
    await expect(paused(page).getByRole('button', { name: 'Calm motion' })).toBeVisible();
    await press(paused(page).getByRole('button', { name: 'Carry on' }));
    await expect(paused(page)).toBeHidden();

    // A refresh in the middle: the same step, the same choice set aside, the help that was used still counted.
    await page.reload();
    await expect(lesson(page).locator('[data-choice]')).toHaveCount(3);
    expect(await stepNumber(page)).toBe(4);
    await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(1);

    // Answered now, it is a right answer with help: the lesson goes on, and adds one more step of the same kind
    // so that there is still a chance to show it without help.
    await choose(page, press, true);
    await expect(guide(page)).toHaveAttribute('data-state', 'celebrate');
    await press(next(page));
    await choose(page, press, true);
    await press(next(page));
    await choose(page, press, true);
    await press(next(page));
    expect(await stepNumber(page)).toBe(7);
    await choose(page, press, true);
    await press(next(page));

    // Three of the four steps on their own were right at the first try with no help; the helped one is not among
    // them, and nothing on the screen makes a point of that to the child.
    await expect(finished(page)).toContainText('3 of 4');
  });

  test('pause can be left with the Escape key, and leaving for home keeps the place @journey', async ({
    page,
    press,
    hasTouch,
  }) => {
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    await choose(page, press, true);
    await press(next(page));
    expect(await stepNumber(page)).toBe(3);

    await press(lesson(page).getByRole('button', { name: 'Pause' }));
    await expect(paused(page)).toBeVisible();
    if (!hasTouch) {
      await page.keyboard.press('Escape');
      await expect(paused(page)).toBeHidden();
      await press(lesson(page).getByRole('button', { name: 'Pause' }));
      await expect(paused(page)).toBeVisible();
    }

    // Home from the pause sheet: the islands, at once.
    await press(paused(page).getByRole('link', { name: 'Leave the activity' }));
    const worlds = page.getByRole('navigation', { name: 'Worlds' });
    await expect(worlds.getByRole('link')).toHaveCount(7);

    // And back in: the step that was left.
    await press(worlds.getByRole('link', { name: /Number Garden/ }));
    await press(page.getByRole('link', { name: 'Play', exact: true }));
    await expect(lesson(page).locator('[data-choice]').first()).toBeVisible();
    expect(await stepNumber(page)).toBe(3);
    await expect(paused(page)).toBeHidden();
  });
});
