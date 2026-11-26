import {
  LESSON_PATH,
  LIGHTHOUSE_SHARE,
  NOTCH_SIDEWAYS,
  NOTCH_UPRIGHT,
  arrived,
  choose,
  expect,
  finishCorrectly,
  finished,
  giveNotch,
  howTo,
  howToAt,
  hubPicturesLoaded,
  myTurn,
  next,
  passHowTo,
  screenFit,
  test,
  underTheNotch,
  type Locator,
  type Page,
} from './fixtures';

/**
 * What only a phone does, as far as it can be put to a browser on a desk:
 *
 *   - a notch at one end and a home bar along the bottom, which the page is told about and must keep out of;
 *   - a browser that, with the phone on its side, leaves a page little more than 250 pixels of height;
 *   - a hand that touches with more than one finger.
 *
 * None of this is a phone. What these tests show, and what only a device can, is in docs/TEST_RESULTS.md.
 */

const worlds = (page: Page) => page.getByRole('navigation', { name: 'Worlds' }).getByRole('link');

/** Every pair of the given things that overlap, in words. */
async function overlapping(things: Locator): Promise<string[]> {
  return things.evaluateAll((list) => {
    const found: string[] = [];
    const boxes = list.map((element) => ({
      name: (element.getAttribute('aria-label') ?? element.textContent).trim().slice(0, 24),
      box: element.getBoundingClientRect(),
    }));
    for (const [index, one] of boxes.entries()) {
      for (const other of boxes.slice(index + 1)) {
        const across =
          Math.min(one.box.right, other.box.right) - Math.max(one.box.left, other.box.left);
        const down =
          Math.min(one.box.bottom, other.box.bottom) - Math.max(one.box.top, other.box.top);
        if (across > 0.5 && down > 0.5) found.push(`${one.name} and ${other.name}`);
      }
    }
    return found;
  });
}

test.describe('on a phone with a notch', () => {
  test.use({ frontDoor: true });

  test('every screen keeps what a child sees and presses clear of the notch and the home bar @layout', async ({
    page,
    press,
  }) => {
    const screen = page.viewportSize();
    if (!screen) throw new Error('This test has no fixed screen size.');
    const notch = screen.width > screen.height ? NOTCH_SIDEWAYS : NOTCH_UPRIGHT;
    await giveNotch(page, notch);
    const clear = async (where: string) => {
      await arrived(page);
      expect(await underTheNotch(page, notch), where).toEqual([]);
    };

    await page.goto('/');
    const door = page.getByTestId('front-door');
    await expect(door.getByRole('button', { name: 'The star picture' })).toBeVisible();
    await clear('the front door');

    await press(door.getByRole('button', { name: 'The star picture' }));
    await expect(door).toHaveCount(0);
    // A first visit goes on to "how to play": nothing of it is under the notch either, shown or tried.
    await expect(howTo(page)).toBeVisible();
    await clear('how to play, while Glim shows');
    await expect(howToAt(page, 'choose', 'turn')).toBeVisible({ timeout: 20_000 });
    await clear('how to play, at the child’s turn');
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
    await passHowTo(page, press);
    await hubPicturesLoaded(page);
    await clear('the map');
    // The notch takes room from the map, and the islands still do not touch.
    expect(await overlapping(worlds(page))).toEqual([]);

    await press(page.getByRole('link', { name: /Number Garden/ }));
    await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
    await clear('a world’s page');
    expect((await screenFit(page)).sideways).toEqual([]);

    await press(page.getByRole('link', { name: 'Play', exact: true }));
    await expect(myTurn(page)).toBeVisible();
    await clear('the demonstration');
    await press(myTurn(page));
    await expect(page.getByTestId('lesson').locator('[data-choice]').first()).toBeVisible();
    await clear('a question');
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });

    await press(page.getByRole('button', { name: 'Pause' }));
    const sheet = page.getByRole('dialog', { name: 'Paused' });
    await expect(sheet).toBeVisible();
    await clear('the pause sheet');
    await press(sheet.getByRole('button', { name: 'Carry on' }));
    await expect(sheet).toBeHidden();

    await page.goto('/grown-ups');
    await expect(page.getByRole('button', { name: 'Press and hold' })).toBeVisible();
    await clear('the grown-ups gate');

    // A page that has the whole screen and no top bar of the app's: its own way back is clear of the notch too.
    await page.goto('/world/inventor-island/room');
    await expect(page.getByTestId('portfolio').locator('li')).toHaveCount(5);
    await clear('the portfolio');
    expect((await screenFit(page)).sideways).toEqual([]);

    // And the room for making a story, which has the whole screen too and does not scroll: with nothing chosen,
    // and with the first page being put together.
    await page.goto('/world/explorer-harbor/room');
    const story = page.getByTestId('story-room');
    await expect(story.locator('button[data-choice]')).toHaveCount(3);
    await clear('the room for making a story');
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
    await press(story.locator('button[data-choice="bear"]'));
    await expect(story).toHaveAttribute('data-turn', 'where');
    await clear('the room for making a story, with someone chosen');
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
  });

  test('the page does not bounce, reload when pulled down, or zoom on two quick taps @layout', async ({
    page,
  }) => {
    await page.goto('/');
    const root = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return { overscroll: style.overscrollBehaviorY, touch: style.touchAction };
    });
    // Declared on the root element, where the page's own scrolling takes it from.
    expect(root).toEqual({ overscroll: 'none', touch: 'manipulation' });
    // Zooming with two fingers is not forbidden anywhere: the page stays enlargeable.
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).not.toMatch(/user-scalable|maximum-scale/);
  });
});

for (const [name, width, height, narrowest] of [
  ['a common Android phone on its side (800 by 264)', 800, 264, 96],
  ['the narrowest Android phone on its side (640 by 256)', 640, 256, 80],
] as const) {
  test.describe(`in the little height a browser leaves ${name}`, () => {
    test.use({ viewport: { width, height } });

    test('the map is one row of islands that do not touch, and an activity fits from its first screen to its last', async ({
      page,
      press,
    }) => {
      await page.goto('/');
      await hubPicturesLoaded(page);
      await expect(page.locator('[data-arrangement="strip"]').first()).toBeVisible();
      await expect(worlds(page)).toHaveCount(7);
      for (const world of await worlds(page).all()) {
        const box = await world.boundingBox();
        if (!box) throw new Error('An island is not on screen.');
        // The lighthouse stands in the row with the islands. Its own island is a little smaller, and the guide
        // is moored where its name would be written: its tap area is the island and the tower, and no more.
        const lighthouse = (await world.getAttribute('data-place')) === 'academy';
        expect(box.width).toBeGreaterThanOrEqual(
          lighthouse ? narrowest * LIGHTHOUSE_SHARE - 0.5 : narrowest,
        );
        expect(box.height).toBeGreaterThanOrEqual(lighthouse ? 84 : 96);
      }
      // It has no name written under it here, and is the Music Lab all the same to anyone who asks by name.
      const musicLab = page.getByRole('link', { name: /^Music Lab/ });
      await expect(musicLab).toBeVisible();
      await expect(musicLab.locator('[data-name]')).toHaveCount(0);
      const glim = page.getByRole('button', { name: /Glim/ });
      await expect(glim).toBeVisible();
      const guide = await glim.boundingBox();
      expect(guide?.width).toBeGreaterThanOrEqual(63.5);
      expect(guide?.height).toBeGreaterThanOrEqual(63.5);
      expect(await overlapping(worlds(page).or(glim))).toEqual([]);
      expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });

      // No name has lost its end: one that does not fit on a line takes two.
      const names = await page.locator('[data-name]').evaluateAll((list) =>
        list.map((element) => ({
          name: element.textContent,
          cut: element.scrollWidth > element.clientWidth + 1,
        })),
      );
      expect(names.filter((entry) => entry.cut)).toEqual([]);

      // And the way in is on the first screen of what follows.
      await press(page.getByRole('link', { name: /Number Garden/ }));
      await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeInViewport({
        ratio: 1,
      });
      await press(page.getByRole('link', { name: 'Play', exact: true }));
      await expect(myTurn(page)).toBeInViewport({ ratio: 1 });
      await press(myTurn(page));
      await expect(page.getByTestId('lesson').locator('[data-choice]').first()).toBeVisible();
      expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
      for (const choice of await page.getByTestId('lesson').locator('[data-choice]').all()) {
        const box = await choice.boundingBox();
        expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(96);
      }

      // The end fits as well: the card clear of the way home above it, and its two buttons wholly on screen.
      await finishCorrectly(page, press);
      await arrived(page);
      expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
      const card = await finished(page).boundingBox();
      const home = await page.getByRole('link', { name: 'Leave the activity' }).boundingBox();
      if (!card || !home) throw new Error('The end of the activity is not on screen.');
      expect(card.y).toBeGreaterThanOrEqual(home.y + home.height - 0.5);
      for (const way of await finished(page)
        .getByRole('button')
        .or(finished(page).getByRole('link'))
        .all()) {
        await expect(way).toBeInViewport({ ratio: 1 });
      }
    });
  });
}

test.describe('small hands', () => {
  test.use({ hasTouch: true });
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Sends real touches through Chromium’s own touch handling, which only Chromium has.',
  );

  /** A point on screen where there is nothing to press: where a thumb holding the device might rest. */
  async function somewhereToRest(page: Page): Promise<{ x: number; y: number }> {
    const screen = page.viewportSize();
    if (!screen) throw new Error('This test has no fixed screen size.');
    const point = await page.evaluate(({ width, height }) => {
      for (const y of [height - 6, height - 24, height / 2, 90]) {
        for (const x of [6, width - 6, 24, width - 24]) {
          const under = document.elementFromPoint(x, y);
          if (under && !under.closest('a[href], button, [role="button"], input, summary')) {
            return { x, y };
          }
        }
      }
      return null;
    }, screen);
    if (!point) throw new Error('Nowhere on this screen is free of things to press.');
    return point;
  }

  test('a tap counts while another finger rests on the screen, and a slow press counts: each once', async ({
    page,
  }) => {
    const client = await page.context().newCDPSession(page);
    const touch = (
      type: 'touchStart' | 'touchEnd',
      points: { id: number; x: number; y: number }[],
    ) =>
      client.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: points.map((point) => ({ ...point, radiusX: 8, radiusY: 8, force: 1 })),
      });
    const middleOf = async (target: Locator) => {
      const box = await target.boundingBox();
      if (!box) throw new Error('The thing to tap is not on screen.');
      return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    };
    /** A thumb comes to rest, another finger taps `target` and lifts, and only then does the thumb lift. */
    const tapBesideThumb = async (target: Locator) => {
      const thumb = { id: 1, ...(await somewhereToRest(page)) };
      const finger = { id: 2, ...(await middleOf(target)) };
      await touch('touchStart', [thumb]);
      await page.waitForTimeout(300);
      await touch('touchStart', [thumb, finger]);
      await page.waitForTimeout(60);
      await touch('touchEnd', [finger]);
      await page.waitForTimeout(400);
      await touch('touchEnd', [thumb]);
    };
    /** A finger lands on `target`, another lands somewhere else before the first has lifted. */
    const tapWhileAnotherLands = async (target: Locator) => {
      const finger = { id: 1, ...(await middleOf(target)) };
      const other = { id: 2, ...(await somewhereToRest(page)) };
      await touch('touchStart', [finger]);
      await page.waitForTimeout(40);
      await touch('touchStart', [finger, other]);
      await page.waitForTimeout(40);
      await touch('touchEnd', [finger]);
      await page.waitForTimeout(400);
      await touch('touchEnd', [other]);
    };

    await page.goto('/');
    await hubPicturesLoaded(page);

    // A switch shows a double answer at once: it would be back where it started.
    const sound = page.getByRole('button', { name: 'Sound' });
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await tapBesideThumb(sound);
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await page.waitForTimeout(900);
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await tapWhileAnotherLands(sound);
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(900);
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    // One finger, pressing slowly. (This browser answers a slow press itself; a phone's may not. Either way: once.)
    const slow = { id: 1, ...(await middleOf(sound)) };
    await touch('touchStart', [slow]);
    await page.waitForTimeout(600);
    await touch('touchEnd', [slow]);
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await page.waitForTimeout(900);
    await expect(sound).toHaveAttribute('aria-pressed', 'false');

    // An island opens, and an activity can be played, with the thumb where it was.
    await tapBesideThumb(page.getByRole('link', { name: /Number Garden/ }));
    await expect(page).toHaveURL(/\/world\/number-garden$/);
    await page.goto(LESSON_PATH);
    await expect(myTurn(page)).toBeVisible();
    await tapBesideThumb(myTurn(page));
    await expect(page.getByTestId('lesson').locator('[data-choice]').first()).toBeVisible();
    await choose(page, tapBesideThumb, true);
    await expect(next(page)).toBeVisible();
  });
});
