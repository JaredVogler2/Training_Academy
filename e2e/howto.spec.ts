import { AGAIN, CHOOSE, IDLE_DONE_MS, IDLE_MS, PLACE } from '../src/game/howto/steps';
import {
  LESSON_PATH,
  SETTINGS_KEY,
  arrived,
  expect,
  holdClock,
  howTo,
  howToAt,
  listenIn,
  myTurn,
  next,
  passHowTo,
  playHowTo,
  screenFit,
  skipHowTo,
  test,
  watchFor,
  type Locator,
  type Page,
} from './fixtures';

/**
 * "How to play": what someone who has never played is shown before anything else. Glim shows three things, and
 * after each the child does it: tap the one that is asked for; tap a picture and it goes to its place, then the
 * tick; tap Glim to have something shown again.
 *
 * It is not a lesson. Nothing in it is a question, nothing is written down about the child, and the way out is on
 * the screen from the first moment.
 */

const frontDoor = (page: Page) => page.getByTestId('front-door');
const worlds = (page: Page) => page.getByRole('navigation', { name: 'Worlds' }).getByRole('link');
const hand = (page: Page) => page.getByTestId('how-to-hand');
const choice = (page: Page, id: string) => howTo(page).locator(`[data-choice="${id}"]`);
const card = (page: Page, id: string) => howTo(page).locator(`[data-card="${id}"]`);
const slot = (page: Page, index: number) => howTo(page).locator(`[data-slot="${String(index)}"]`);
const tick = (page: Page) => howTo(page).getByRole('button', { name: 'Done' });
const glim = (page: Page) => howTo(page).getByRole('button', { name: 'Show me again' });
const bell = (page: Page) => page.getByTestId('how-to-bell');
const caption = (page: Page) => howTo(page).getByRole('status').last();
const other = CHOOSE.turn.choices.find((id) => id !== CHOOSE.turn.same) ?? '';
const [first, second] = PLACE.cards;

/** Open the game as someone who has never played, and choose a picture. */
async function arrive(page: Page, press: (target: Locator) => Promise<void>, picture = 'star') {
  await page.goto('/');
  await press(frontDoor(page).locator(`button[data-avatar="${picture}"]`));
  await expect(howTo(page)).toBeVisible();
}

/**
 * Put a finger on the middle of something, whether or not it says it can be pressed. (A test's `press` waits for
 * a thing to say that it can be: a child does not.)
 */
async function poke(page: Page, target: Locator, hasTouch: boolean) {
  const box = await target.boundingBox();
  if (!box) throw new Error('That is not on the screen.');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await (hasTouch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
}

/**
 * Move a held clock on until the child's turn has begun, and say what was seen on the way. (Not for a fixed
 * time: a showing is shorter where the voice cannot be heard, and what comes after it, by the clock, would be
 * taken for part of it.)
 */
async function watchTheShowing(page: Page, look: () => Promise<string>): Promise<string[]> {
  const seen: string[] = [];
  for (let passed = 0; passed <= 20_000; passed += 100) {
    const now = await look();
    if (seen.at(-1) !== now) seen.push(now);
    if (now.startsWith('turn')) return seen;
    await page.clock.runFor(100);
  }
  throw new Error(`The showing did not come to an end: ${seen.join(' → ')}`);
}

/** A new visit to a device that has been played on: the tab's memory gone, the device's kept. */
async function comeBack(page: Page) {
  await page.evaluate(() => window.sessionStorage.clear());
  await page.goto('/');
  await expect(frontDoor(page)).toBeVisible();
}

/**
 * At the islands, and not at "how to play". The door has to have gone before anything is asked: the islands are
 * in the page behind the door all along, and "how to play" is not in it until a moment after the door has
 * opened, so a look that comes too soon finds seven islands and no "how to play" whichever way it is going.
 */
async function atTheIslands(page: Page) {
  await expect(frontDoor(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
  await expect(howTo(page)).toHaveCount(0);
  await expect(worlds(page)).toHaveCount(7);
  expect(
    await page
      .locator('a[data-world]')
      .evaluateAll((links) => links.some((link) => link.closest('[inert]'))),
    'the islands can be tapped',
  ).toBe(false);
}

/**
 * Glim's hand, wherever it is, is all on the screen, and has not made the page any larger than the screen. (It
 * bobs, and never stops: so it is asked where it is at the lowest it goes, with its bobbing held still.)
 */
async function handIsOnTheScreen(page: Page, where: string) {
  // Whatever was arriving has arrived: this is about the hand, which never stops.
  await arrived(page);
  const reach = await hand(page).evaluate((mark) => {
    for (const animation of mark.getAnimations()) animation.currentTime = 0;
    const box = mark.getBoundingClientRect();
    return {
      below: Math.max(0, Math.ceil(box.bottom - window.innerHeight)),
      beside: Math.max(0, Math.ceil(box.right - window.innerWidth)),
    };
  });
  expect(reach, where).toEqual({ below: 0, beside: 0 });
  expect(await screenFit(page), where).toEqual({ sideways: [], taller: 0 });
}

/** Everything a finger can be put on is large enough for a small one, and nothing is off the screen. */
async function fitsAndIsLargeEnough(page: Page, where: string) {
  await arrived(page);
  expect(await screenFit(page), where).toEqual({ sideways: [], taller: 0 });
  const targets = howTo(page).locator('button:not([aria-hidden="true"]), a[href]');
  for (const target of await targets.all()) {
    const box = await target.boundingBox();
    const name = (await target.getAttribute('aria-label')) ?? (await target.textContent()) ?? '';
    // The grown-up's switch is a grown-up's size; everything a child presses is a child's.
    const least = name.includes('grown-up') ? 44 : 55.5;
    expect(box?.width ?? 0, `${where}: ${name} is wide enough`).toBeGreaterThanOrEqual(least);
    expect(box?.height ?? 0, `${where}: ${name} is tall enough`).toBeGreaterThanOrEqual(least);
  }
}

test.describe('how to play, for someone who has never played', () => {
  test.use({ frontDoor: true });

  test('is where the front door leads: three things shown, and each then done @journey @layout', async ({
    page,
    press,
  }) => {
    test.setTimeout(120_000);
    const said = await listenIn(page);
    await arrive(page, press);
    await expect(page).toHaveURL(/\/how-to-play$/);
    // It has the whole screen, as an activity has: the game's top bar and its door to the grown-ups are not here.
    await expect(page.getByRole('link', { name: 'Grown-ups' })).toHaveCount(0);
    await expect(skipHowTo(page)).toBeVisible();

    // 1. Tap the one that is the same. Glim shows it with Glim's own pictures…
    await expect(howToAt(page, 'choose', 'show')).toBeVisible();
    await expect(howTo(page).locator(`[data-picture="${CHOOSE.show.same}"]`).first()).toBeVisible();
    await expect(howToAt(page, 'choose', 'turn')).toBeVisible({ timeout: 20_000 });
    // …and the child's turn is with others, and with the one to tap in the other place.
    await expect(choice(page, CHOOSE.turn.same)).toHaveAttribute('aria-disabled', 'false');
    await expect(choice(page, other)).toHaveAttribute('aria-disabled', 'false');
    await expect(howTo(page).locator('[data-state="same"]')).toHaveCount(0);
    await expect(caption(page)).toHaveText('Your turn. Tap the one that is the same.');
    await fitsAndIsLargeEnough(page, 'choosing');

    // The other one is not a mistake to be marked: Glim's hand goes to the one that is meant.
    await press(choice(page, other));
    await expect(choice(page, other)).toHaveAttribute('data-state', 'tried');
    await expect(hand(page)).toHaveAttribute('data-on', `choice:${CHOOSE.turn.same}`);
    await expect(howToAt(page, 'choose', 'turn')).toBeVisible();
    await press(choice(page, CHOOSE.turn.same));
    await expect(howToAt(page, 'choose', 'done')).toBeVisible();
    await expect(choice(page, CHOOSE.turn.same)).toHaveAttribute('data-state', 'same');
    await expect(howTo(page).getByTestId('guide')).toHaveAttribute('data-state', 'celebrate');
    await expect(caption(page)).toHaveText('Yes. Like that.');
    // The arrow is the way on, here as everywhere.
    await press(next(page));

    // 2. Tap a picture and it goes to its place; then the tick.
    await expect(howToAt(page, 'place', 'turn')).toBeVisible({ timeout: 20_000 });
    await expect(howTo(page).locator('[data-slot][data-filled="true"]')).toHaveCount(0);
    await expect(tick(page)).toHaveAttribute('aria-disabled', 'true');
    await fitsAndIsLargeEnough(page, 'placing');
    // In whatever order: the first tapped goes to the first place.
    await press(card(page, second));
    await expect(slot(page, 0).locator(`[data-picture="${second}"]`)).toBeVisible();
    await expect(card(page, second)).toHaveAttribute('data-gone', 'true');
    // A tap on a place gives the picture back.
    await press(slot(page, 0));
    await expect(howTo(page).locator('[data-slot][data-filled="true"]')).toHaveCount(0);
    await expect(card(page, second)).toHaveAttribute('data-gone', 'false');
    await press(card(page, second));
    await press(card(page, first));
    await expect(howTo(page).locator('[data-slot][data-filled="true"]')).toHaveCount(2);
    await expect(tick(page)).toHaveAttribute('data-ready', 'true');
    await expect(caption(page)).toHaveText('Your turn. When you have finished, tap the tick.');
    await press(tick(page));
    await expect(howToAt(page, 'place', 'done')).toBeVisible();
    await press(next(page));

    // 3. Tap Glim to have it shown again: the bell that rang once rings again.
    await expect(howToAt(page, 'again', 'turn')).toBeVisible({ timeout: 20_000 });
    await expect(bell(page)).toHaveAttribute('data-rung', '1');
    await expect(bell(page).locator(`[data-picture="${AGAIN.picture}"]`)).toBeVisible();
    await expect(hand(page)).toHaveAttribute('data-on', 'glim');
    await fitsAndIsLargeEnough(page, 'showing again');
    await press(glim(page));
    await expect(bell(page)).toHaveAttribute('data-rung', '2');
    await expect(howToAt(page, 'again', 'done')).toBeVisible();
    await expect(caption(page)).toHaveText('Now you know how to play.');

    // What Glim said, in the order it was said. (A reminder may have been put in between by a slow machine;
    // these are the lines of the thing itself.)
    await expect
      .poll(async () => (await said()).filter((line) => line.startsWith('howto.')).at(-1))
      .toBe('howto.end');
    const lines = (await said()).filter((line) => line.startsWith('howto.'));
    expect(lines.filter((line, index) => line !== lines[index - 1])).toEqual([
      'howto.hello',
      'howto.choose',
      'howto.yes',
      'howto.place',
      'howto.done',
      'howto.yes',
      'howto.again',
      'howto.end',
    ]);

    // The arrow, once more: on to the islands, as the player who was chosen.
    await press(next(page));
    await expect(howTo(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
    await expect(worlds(page)).toHaveCount(7);
    await expect(page.getByText('Star', { exact: true })).toBeVisible();
    // Back does not lead into it again.
    await page.goBack();
    await expect(howTo(page)).toHaveCount(0);

    // The next visit: known by their picture, and not shown it again.
    await comeBack(page);
    await press(frontDoor(page).getByRole('button', { name: 'Play as Star' }));
    await atTheIslands(page);
  });

  test('is shown one moment after another, and nothing can be tapped until Glim has shown it @layout', async ({
    page,
    press,
    hasTouch,
  }) => {
    test.setTimeout(120_000);
    await page.clock.install();
    await arrive(page, press);
    await holdClock(page);
    const state = () =>
      howTo(page).evaluate((root) => {
        const on = root.querySelector('[data-testid="how-to-hand"]')?.getAttribute('data-on');
        const lit = root
          .querySelector('[data-choice][data-state="same"]')
          ?.getAttribute('data-choice');
        const placed = root.querySelectorAll('[data-slot][data-filled="true"]').length;
        const handed = root.querySelector('ol[data-same="true"]') !== null;
        const rung = root.querySelector('[data-rung]')?.getAttribute('data-rung');
        return [
          root.getAttribute('data-phase'),
          on ? `hand on ${on}` : null,
          lit ? `${lit} lit` : null,
          placed > 0 ? `${String(placed)} placed` : null,
          handed ? 'handed in' : null,
          rung ? `rung ${rung}` : null,
        ]
          .filter(Boolean)
          .join(', ');
      });

    // Before anything has been shown, nothing answers a tap: not a choice, not Glim.
    expect(await state()).toBe('show');
    await poke(page, choice(page, CHOOSE.show.same), hasTouch);
    await press(glim(page));
    expect(await state()).toBe('show');
    await expect(howTo(page)).toHaveAttribute('data-round', '0');
    await expect(next(page)).toHaveCount(0);

    // Choosing: Glim's hand on the one that is the same; that one lit; and then the child's turn.
    expect(await watchTheShowing(page, state)).toEqual([
      'show',
      `show, hand on choice:${CHOOSE.show.same}`,
      `show, ${CHOOSE.show.same} lit`,
      'turn',
    ]);
    // Nothing tapped for a while: the hand comes to what there is to tap, and stays until it is.
    expect(await watchFor(page, IDLE_MS + 400, state)).toEqual([
      'turn',
      `turn, hand on choice:${CHOOSE.turn.same}`,
    ]);
    await press(choice(page, CHOOSE.turn.same));
    expect(await state()).toBe(`done, ${CHOOSE.turn.same} lit`);
    // And to the arrow, sooner: there is nothing else to try.
    expect(await watchFor(page, IDLE_DONE_MS + 400, state)).toEqual([
      `done, ${CHOOSE.turn.same} lit`,
      `done, hand on next, ${CHOOSE.turn.same} lit`,
    ]);
    await handIsOnTheScreen(page, 'the hand on the arrow');
    await press(next(page));

    // Placing: one picture and then the other, each under Glim's hand first; then the tick, likewise.
    expect(await watchTheShowing(page, state)).toEqual([
      'show',
      `show, hand on card:${first}`,
      'show, 1 placed',
      `show, hand on card:${second}, 1 placed`,
      'show, 2 placed',
      'show, hand on tick, 2 placed',
      'show, 2 placed, handed in',
      'turn',
    ]);
    // The tick does nothing until everything is in its place.
    await poke(page, tick(page), hasTouch);
    expect(await state()).toBe('turn');
    expect(await watchFor(page, IDLE_MS + 400, state)).toEqual([
      'turn',
      `turn, hand on card:${first}`,
    ]);
    await press(card(page, first));
    expect(await state()).toBe('turn, 1 placed');
    await press(card(page, second));
    expect(await watchFor(page, IDLE_MS + 400, state)).toEqual([
      'turn, 2 placed',
      'turn, hand on tick, 2 placed',
    ]);
    await handIsOnTheScreen(page, 'the hand on the tick');
    await press(tick(page));
    expect(await state()).toBe('done, 2 placed, handed in');
    await press(next(page));

    // Showing again: the bell rings, and Glim's hand goes to Glim and stays there for the child's turn.
    expect(await watchTheShowing(page, state)).toEqual([
      'show, rung 0',
      'show, rung 1',
      'show, hand on glim, rung 1',
      'turn, hand on glim, rung 1',
    ]);
    await handIsOnTheScreen(page, 'the hand on Glim');
    await press(glim(page));
    expect(await state()).toBe('done, rung 2');
    // The bell swings when it is rung, one way and then the other. At the widest of each it is still inside
    // its box, and the page is still one screen: a square that turns is wider, corner to corner, than it was.
    // (Both ways: what reaches past the left of a page does not make it wider, and what reaches past the
    // right does.)
    for (const [which, share] of [
      ['one way', 0.18],
      ['the other way', 0.42],
    ] as const) {
      const swinging = await bell(page).evaluate((box, part) => {
        const swings = box.getAnimations({ subtree: true });
        for (const swing of swings) {
          const length = Number(swing.effect?.getComputedTiming().duration ?? 0);
          swing.pause();
          swing.currentTime = length * part;
        }
        return swings.length;
      }, share);
      expect(swinging, 'the bell swings').toBeGreaterThan(0);
      expect(await screenFit(page), `the bell at the widest of its swing ${which}`).toEqual({
        sideways: [],
        taller: 0,
      });
    }
    await bell(page).evaluate((box) => {
      for (const swing of box.getAnimations({ subtree: true })) swing.finish();
    });
    // Glim can be tapped as often as anyone likes.
    await press(glim(page));
    expect(await state()).toBe('done, rung 3');
    await page.clock.resume();
  });

  test('says what there is to tap, when nothing has been tapped for a while', async ({
    page,
    press,
  }) => {
    const said = await listenIn(page);
    await arrive(page, press);
    await expect(howToAt(page, 'choose', 'turn')).toBeVisible({ timeout: 20_000 });
    await expect(hand(page)).toHaveCount(0);
    await expect(hand(page)).toHaveAttribute('data-on', `choice:${CHOOSE.turn.same}`, {
      timeout: IDLE_MS + 10_000,
    });
    await expect.poll(said).toContain('help.answers');
    // It is said once: a child who is looking is not nagged.
    await press(choice(page, CHOOSE.turn.same));
    await expect(howToAt(page, 'choose', 'done')).toBeVisible();
    expect((await said()).filter((line) => line === 'help.answers')).toHaveLength(1);
  });

  test('shows a thing again when Glim is tapped, from its beginning', async ({ page, press }) => {
    await arrive(page, press);
    await expect(howToAt(page, 'choose', 'turn')).toBeVisible({ timeout: 20_000 });
    await expect(howTo(page)).toHaveAttribute('data-round', '0');
    await press(glim(page));
    // Glim's own pictures again, and no tapping until it is over.
    await expect(howToAt(page, 'choose', 'show')).toBeVisible();
    await expect(howTo(page)).toHaveAttribute('data-round', '1');
    await expect(choice(page, CHOOSE.show.same)).toHaveAttribute('aria-disabled', 'true');
    await expect(howToAt(page, 'choose', 'turn')).toBeVisible({ timeout: 20_000 });
    await expect(choice(page, CHOOSE.turn.same)).toHaveAttribute('aria-disabled', 'false');
  });

  test('can be passed by at any moment, and is not shown again @layout', async ({
    page,
    press,
  }) => {
    await arrive(page, press, 'leaf');
    // While Glim is still showing the first thing: the house is the way out.
    await expect(howToAt(page, 'choose', 'show')).toBeVisible();
    await press(skipHowTo(page));
    await expect(howTo(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
    await expect(worlds(page)).toHaveCount(7);
    await expect(page.getByText('Leaf', { exact: true })).toBeVisible();

    await comeBack(page);
    await press(frontDoor(page).getByRole('button', { name: 'Play as Leaf' }));
    await atTheIslands(page);
  });

  test('is shown again to someone whose first visit ended before they had done it or passed it by', async ({
    page,
    press,
  }) => {
    await arrive(page, press, 'moon');
    await expect(howToAt(page, 'choose', 'show')).toBeVisible();
    // The tab is closed, or the phone put away, in the middle of it.
    await comeBack(page);
    await press(frontDoor(page).getByRole('button', { name: 'Play as Moon' }));
    await expect(howTo(page)).toBeVisible();
    await expect(page).toHaveURL(/\/how-to-play$/);
    // And once they have been through it, not again.
    await playHowTo(page, press);
    await comeBack(page);
    await press(frontDoor(page).getByRole('button', { name: 'Play as Moon' }));
    await atTheIslands(page);
  });

  test('is not shown to a child who was already playing before there was anything to show', async ({
    page,
    press,
  }) => {
    // Someone who has begun an activity, on a device that has never shown anyone how to play.
    await page.goto(LESSON_PATH);
    await expect(myTurn(page)).toBeVisible();
    await page.goto('/');
    await expect(frontDoor(page).getByRole('heading')).toHaveText('Who is playing?');
    await press(frontDoor(page).getByRole('button', { name: 'Play as Explorer' }));
    await atTheIslands(page);
  });

  test('does everything with the sound off: the pictures show it all', async ({ page, press }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ version: 1, sound: false, motion: 'system', graphics: 'pictures' }),
      );
    }, SETTINGS_KEY);
    const said = await listenIn(page);
    await arrive(page, press);
    // Glim's hand and what it does are there to see, with nothing said.
    await expect(hand(page)).toHaveAttribute('data-on', `choice:${CHOOSE.show.same}`, {
      timeout: 15_000,
    });
    await expect(caption(page)).toHaveText('Watch. Tap the one that is the same.');
    await playHowTo(page, press);
    await expect(worlds(page)).toHaveCount(7);
    expect(await said()).toEqual([]);
  });

  test('can be done from the keyboard', async ({ page, press, hasTouch }) => {
    test.skip(hasTouch, 'A touch screen has no keyboard.');
    await arrive(page, press);
    await expect(howToAt(page, 'choose', 'turn')).toBeVisible({ timeout: 20_000 });
    await choice(page, CHOOSE.turn.same).focus();
    await page.keyboard.press('Enter');
    await expect(howToAt(page, 'choose', 'done')).toBeVisible();
    await next(page).focus();
    await page.keyboard.press('Enter');
    await expect(howToAt(page, 'place', 'turn')).toBeVisible({ timeout: 20_000 });
    for (const id of PLACE.cards) {
      await card(page, id).focus();
      await page.keyboard.press('Space');
    }
    await tick(page).focus();
    await page.keyboard.press('Enter');
    await expect(howToAt(page, 'place', 'done')).toBeVisible();
    await next(page).focus();
    await page.keyboard.press('Enter');
    await expect(howToAt(page, 'again', 'turn')).toBeVisible({ timeout: 20_000 });
    await glim(page).focus();
    await page.keyboard.press('Enter');
    await expect(howToAt(page, 'again', 'done')).toBeVisible();
    await next(page).focus();
    await page.keyboard.press('Enter');
    await expect(worlds(page)).toHaveCount(7);
  });
});

/*
 * And on the two tightest screens there are, which no named device has: the flattest a phone held sideways
 * leaves a page, and the narrowest phone still in use.
 */
for (const [name, viewport] of [
  ['the flattest phone held sideways', { width: 640, height: 256 }],
  ['the narrowest phone', { width: 320, height: 568 }],
] as const) {
  test.describe(`how to play, on ${name} (${String(viewport.width)} by ${String(viewport.height)})`, () => {
    test.use({ frontDoor: true, viewport });

    test('fits, with everything a child presses large enough and Glim’s hand on the screen', async ({
      page,
      press,
      hasTouch,
    }) => {
      test.skip(!hasTouch, 'Measured once, as a touch phone.');
      test.setTimeout(120_000);
      await arrive(page, press);
      await expect(howToAt(page, 'choose', 'turn')).toBeVisible({ timeout: 20_000 });
      await fitsAndIsLargeEnough(page, 'choosing');
      await press(choice(page, other));
      await handIsOnTheScreen(page, 'the hand on the one that is meant');
      await press(choice(page, CHOOSE.turn.same));
      await expect(howToAt(page, 'choose', 'done')).toBeVisible();
      await fitsAndIsLargeEnough(page, 'choosing, done');
      await press(next(page));
      await expect(howToAt(page, 'place', 'turn')).toBeVisible({ timeout: 20_000 });
      await fitsAndIsLargeEnough(page, 'placing');
      for (const id of PLACE.cards) await press(card(page, id));
      await fitsAndIsLargeEnough(page, 'placing, with everything in its place');
      await press(tick(page));
      await expect(howToAt(page, 'place', 'done')).toBeVisible();
      await press(next(page));
      await expect(howToAt(page, 'again', 'turn')).toBeVisible({ timeout: 20_000 });
      await fitsAndIsLargeEnough(page, 'showing again');
      await handIsOnTheScreen(page, 'the hand on Glim');
    });
  });
}

test.describe('how to play, opened again', () => {
  test('is at an address of its own, and leads back to the islands', async ({ page, press }) => {
    await page.goto('/how-to-play');
    await expect(howTo(page)).toBeVisible();
    await expect(page).toHaveTitle(/How to play/);
    await passHowTo(page, press);
    await expect(worlds(page)).toHaveCount(7);
  });
});
