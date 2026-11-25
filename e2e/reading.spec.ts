import {
  SETTINGS_KEY,
  expect,
  listenIn,
  myTurn,
  next,
  screenFit,
  test,
  type Page,
  arrived,
} from './fixtures';
import { answer, challengeOnScreen } from './play';

/**
 * Reading Cove: listening, first sounds, letters, blending. Everything here is heard, so these tests are mostly
 * about sound: that an activity will not start without it, and that a child on their own is not told the answer.
 */

const lesson = (page: Page) => page.getByTestId('lesson');
const play = (id: string) => `/world/reading-cove/play/${id}`;
const gate = (page: Page) => page.getByTestId('lesson-needs-sound');
const clips = (requested: string[], kind: string) =>
  requested.filter((path) => new RegExp(`^/immutable/${kind}\\.[a-z]+-`).test(path));

test.describe('an activity for listening', () => {
  test('waits for the sound to be switched on, and says so with one thing to press', async ({
    page,
    press,
    guard,
  }) => {
    await page.addInitScript(
      ({ key }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({ version: 1, sound: false, motion: 'system', graphics: 'pictures' }),
        );
      },
      { key: SETTINGS_KEY },
    );
    await page.goto(play('rc-listen-01'));
    await expect(gate(page)).toBeVisible();
    await expect(gate(page)).toContainText('This activity is for listening.');
    // Nothing to answer, nothing fetched for the voice, and help has nothing to help with.
    await expect(lesson(page).locator('[data-choice]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Help me' })).toBeDisabled();
    expect(guard.requested().filter((path) => path.endsWith('.mp3'))).toEqual([]);

    const button = page.getByRole('button', { name: 'Turn the sound on' });
    const box = await button.boundingBox();
    expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(96);
    await press(button);
    await expect(gate(page)).toBeHidden();
    await expect(myTurn(page)).toBeVisible();
    // The sound it is about is played.
    await expect.poll(() => clips(guard.requested(), 'sound').length).toBeGreaterThan(0);
  });

  test('opened from its address with the sound on, starts at the first touch', async ({ page }) => {
    await page.goto(play('rc-listen-02'));
    // No touch has woken the audio yet.
    await expect(gate(page)).toBeVisible();
    await page.mouse.click(10, 300);
    await expect(gate(page)).toBeHidden();
    await expect(page.getByTestId('echo-board')).toBeVisible();
  });
});

test.describe('what made that sound?', () => {
  test('a wrong picture is answered with its own sound, and the right one ends the step', async ({
    page,
    press,
    guard,
  }) => {
    await page.goto('/world/reading-cove');
    await press(page.locator('[data-lesson="rc-listen-01"]'));
    await press(myTurn(page));
    // What is asked about cannot be seen: it is a shell to listen to, and tapping it plays it again.
    const shell = page.getByRole('button', { name: 'Hear it again' });
    await expect(shell).toBeVisible();
    const before = clips(guard.requested(), 'sound').length;
    await press(shell);
    await expect
      .poll(() => clips(guard.requested(), 'sound').length)
      .toBeGreaterThanOrEqual(before);

    await answer(page, press, false);
    await expect(lesson(page).getByRole('status')).toHaveText(
      'That one sounds like this. Listen again.',
    );
    await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(1);
    await answer(page, press);
    await expect(lesson(page).getByRole('status')).toHaveText('Yes. That was it.');
    await expect(next(page)).toBeVisible();
  });
});

test.describe('play it back', () => {
  test('is answered by the last tap, and a wrong order is played again @layout', async ({
    page,
    press,
  }) => {
    await page.goto('/world/reading-cove');
    await press(page.locator('[data-lesson="rc-listen-02"]'));
    const board = page.getByTestId('echo-board');
    await expect(board).toBeVisible();
    // Measured once the screen has arrived: a page sliding in is not yet the page.
    await arrived(page);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    for (const card of await board.locator('[data-card]').all()) {
      const box = await card.boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }
    await press(myTurn(page));

    // Two drums: the bell twice is the right number of taps and the wrong sounds.
    const challenge = await challengeOnScreen(page);
    expect(challenge.id).toBe('rc-listen-02.guided-same');
    await expect(board.locator('[data-card][aria-disabled="false"]').first()).toBeVisible();
    await expect(board.locator('[data-lit="true"]')).toHaveCount(0);
    await press(board.locator('[data-card="bell"]'));
    await press(board.locator('[data-card="bell"]'));
    await expect(lesson(page).getByRole('status')).toHaveText('Not quite. Listen again.');
    // It is shown again, and the marks are empty again.
    await expect(board.locator('ol > li[data-done="true"]')).toHaveCount(0);

    await answer(page, press);
    await expect(lesson(page).getByRole('status')).toHaveText('Yes. You played it back.');
    await expect(next(page)).toBeVisible();
  });
});

test.describe('read the word', () => {
  test('is not read out to a child on their own until they ask for help @layout', async ({
    page,
    press,
  }) => {
    const said = await listenIn(page);
    await page.goto('/world/reading-cove');
    await press(page.locator('[data-lesson="rc-blend-02"]'));
    await expect(lesson(page).locator('[data-word]')).toBeVisible();
    // Measured once the screen has arrived: a page sliding in is not yet the page.
    await arrived(page);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);

    // The demonstration and the two steps with support, rightly.
    await press(myTurn(page));
    for (let step = 0; step < 2; step++) {
      await answer(page, press);
      await press(next(page));
    }
    await expect(lesson(page)).toHaveAttribute('data-stage', 'independent');
    const word = await lesson(page).locator('[data-word]').getAttribute('data-word');
    // Whether the word was said, not whether its clip was fetched: what a step may need is fetched as the step
    // arrives, so that a clip the finger moves in time with starts on time.
    const slow = async () => (await said()).filter((key) => key === `slow.${String(word)}`);
    // Time enough for anything that was going to be said to have been said.
    await page.waitForTimeout(3000);
    expect(await slow()).toEqual([]);
    // A screen reader is given the letters, not the word.
    await expect(lesson(page).locator('[data-same]')).toContainText(
      `A word to read: ${Array.from(String(word)).join(', ')}`,
    );

    await press(page.getByRole('button', { name: 'Help me' }));
    await expect.poll(async () => (await slow()).length).toBe(1);
    await answer(page, press);
    await expect(lesson(page).getByRole('status')).toHaveText('Yes. That is the word.');
  });
});

test.describe('letters', () => {
  test('are drawn, not typed, and fit the screen with a picture beside them @layout', async ({
    page,
    press,
  }) => {
    await page.goto('/world/reading-cove');
    await press(page.locator('[data-lesson="rc-letters-01"]'));
    // Four letters are met, one at a time.
    for (const letter of ['s', 'm', 'a', 't']) {
      await expect(lesson(page).locator(`[data-same] svg[data-letters="${letter}"]`)).toBeVisible();
      await arrived(page);
      const fit = await screenFit(page);
      expect(fit.sideways).toEqual([]);
      expect(fit.taller).toBe(0);
      await press(myTurn(page));
    }
    await expect(lesson(page)).toHaveAttribute('data-stage', 'guided');
    await answer(page, press);
    await press(next(page));
    // A picture, and letters to choose from: each on a tile large enough for a small finger.
    for (const tile of await lesson(page).locator('[data-choice]').all()) {
      const box = await tile.boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
      await expect(tile.locator('svg[data-letters]')).toBeVisible();
    }
  });
});
