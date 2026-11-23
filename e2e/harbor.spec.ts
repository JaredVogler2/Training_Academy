import { arrived, expect, myTurn, next, screenFit, test, type Page } from './fixtures';
import { answer, challengeOnScreen } from './play';

/**
 * Explorer Harbor: stories in three pictures, why things happen, and a map to answer on. What these tests care
 * about most is that a story is told back in its own words, that the missing picture is nowhere on the page until
 * it is found, and that a place on a map is exactly where the content says it is.
 */

const lesson = (page: Page) => page.getByTestId('lesson');
const play = (id: string) => `/world/explorer-harbor/play/${id}`;
const caption = (page: Page) => lesson(page).getByRole('status');

/** The size of the smaller side of each of these, in points. */
async function smallestSides(page: Page, selector: string): Promise<number[]> {
  const sides: number[] = [];
  for (const each of await lesson(page).locator(selector).all()) {
    const box = await each.boundingBox();
    sides.push(Math.min(box?.width ?? 0, box?.height ?? 0));
  }
  return sides;
}

test.describe('put the story in order', () => {
  test('a story is put in order by taps, and then told back picture by picture @layout', async ({
    page,
    press,
  }) => {
    await page.goto(play('eh-story-01'));
    const board = page.getByTestId('order-board');
    await expect(board).toBeVisible();
    // The demonstration puts the three pictures in their places, first to last.
    await expect(board.locator('[data-slot][data-filled="true"]')).toHaveCount(3);
    await expect(board.locator('[data-slot="0"] svg')).toHaveAttribute('data-picture', 'seed1');
    await expect(board.locator('[data-slot="2"] svg')).toHaveAttribute('data-picture', 'seed3');
    await press(myTurn(page));

    // Three cards out of order, three empty places, and nothing to hand in yet.
    await expect(board.locator('[data-slot][data-filled="true"]')).toHaveCount(0);
    await expect(board.locator('ul [data-card]')).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Done' })).toBeDisabled();
    // A card is named by the line it is told with: the story can be put in order by ear.
    await expect(board.locator('ul [data-card="egg1"]')).toHaveAccessibleName(
      'The hen sits on her egg.',
    );
    await arrived(page);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    for (const side of await smallestSides(page, 'ul [data-card], [data-slot]')) {
      expect(side).toBeGreaterThanOrEqual(56);
    }

    // The first is right; the other two are the wrong way round.
    for (const id of ['egg1', 'egg3', 'egg2']) await press(board.locator(`ul [data-card="${id}"]`));
    await press(page.getByRole('button', { name: 'Done' }));
    await expect(caption(page)).toHaveText('Not quite. Which one comes first?');
    // What was in its place stays there; the rest go back to be tried again.
    await expect(board.locator('[data-slot][data-filled="true"]')).toHaveCount(1);
    await expect(board.locator('[data-slot="0"] svg')).toHaveAttribute('data-picture', 'egg1');

    await press(board.locator('ul [data-card="egg2"]'));
    await press(board.locator('ul [data-card="egg3"]'));
    await press(page.getByRole('button', { name: 'Done' }));
    await expect(caption(page)).toHaveText('Yes. Here is the whole story.');
    // Told back from the beginning: each picture is lifted while its own line is what is said.
    for (const [index, line] of [
      'The hen sits on her egg.',
      'Crack! The egg breaks open.',
      'A baby chick comes out.',
    ].entries()) {
      await expect(board.locator(`[data-slot="${String(index)}"]`)).toHaveAttribute(
        'data-telling',
        'true',
      );
      await expect(caption(page)).toHaveText(line);
    }
    // When the telling is over nothing is lifted, and the way on is there.
    await expect(board.locator('[data-telling="true"]')).toHaveCount(0, { timeout: 20_000 });
    await expect(caption(page)).toHaveText('Yes. Here is the whole story.');
    await expect(next(page)).toBeVisible();
  });

  test('help gives the beginning, and then the whole order to follow', async ({ page, press }) => {
    await page.goto(play('eh-story-01'));
    await press(myTurn(page));
    const board = page.getByTestId('order-board');
    const help = page.getByRole('button', { name: 'Help me' });
    await press(help);
    await expect(caption(page)).toHaveText('Look for how it starts. Then look for how it ends.');
    await expect(board.locator('[data-slot][data-filled="true"]')).toHaveCount(0);
    await press(help);
    await expect(caption(page)).toHaveText('It starts like this.');
    await expect(board.locator('[data-slot="0"] svg')).toHaveAttribute('data-picture', 'egg1');
    await expect(board.locator('[data-slot="0"]')).toHaveAttribute('data-fixed', 'true');
    // The one that was given cannot be taken back.
    await board.locator('[data-slot="0"]').click({ force: true });
    await expect(board.locator('[data-slot="0"]')).toHaveAttribute('data-filled', 'true');
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. Here is the whole story.');
    await expect(board.locator('[data-slot="2"]')).toHaveAttribute('data-telling', 'true', {
      timeout: 20_000,
    });
  });
});

test.describe('a picture is missing', () => {
  test('the ending of a story is nowhere in the story until it is found @layout', async ({
    page,
    press,
  }) => {
    await page.goto(play('eh-ending-01'));
    await press(myTurn(page));
    const strip = lesson(page).locator('[data-scene="strip"]');
    await expect(strip.locator('svg[data-picture]')).toHaveCount(2);
    await expect(strip.locator('[data-gap="true"]')).toHaveCount(1);
    await expect(strip.locator('svg[data-picture="seed3"]')).toHaveCount(0);
    await expect(lesson(page).locator('[data-choice]')).toHaveCount(3);
    await expect(caption(page)).toHaveText('How does the story end?');
    await arrived(page);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    for (const side of await smallestSides(page, '[data-choice]')) {
      expect(side).toBeGreaterThanOrEqual(56);
    }
    // The pictures of the story are big enough to be made out.
    for (const side of await smallestSides(page, '[data-scene="strip"] svg[data-picture]')) {
      expect(side).toBeGreaterThanOrEqual(40);
    }

    // An ending from another story is set aside, and the story is still open.
    await answer(page, press, false);
    await expect(caption(page)).toHaveText('That is from a different story. Look again.');
    await expect(strip.locator('[data-gap="true"]')).toHaveCount(1);
    await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(1);

    await answer(page, press);
    await expect(strip.locator('[data-filled="true"] svg')).toHaveAttribute(
      'data-picture',
      'seed3',
    );
    await expect(strip.locator('[data-gap="true"]')).toHaveCount(0);
    await expect(caption(page)).toHaveText('Yes. That is how it ends.');
  });

  test('what made it happen: the thing that did it takes its place between before and after', async ({
    page,
    press,
  }) => {
    await page.goto(play('eh-why-01'));
    const strip = lesson(page).locator('[data-scene="strip"]');
    // The demonstration ends with the answer in its place.
    await expect(strip.locator('[data-filled="true"] svg')).toHaveAttribute('data-picture', 'pin');
    await press(myTurn(page));

    await expect(caption(page)).toHaveText('There is a puddle on the path. What made the puddle?');
    await expect(strip.locator('svg[data-picture]')).toHaveCount(2);
    await expect(strip.locator('[data-cause="true"][data-gap="true"]')).toHaveCount(1);
    // Help says where to look, then sets one aside, then shows which.
    const help = page.getByRole('button', { name: 'Help me' });
    await press(help);
    await expect(caption(page)).toHaveText('Look at how it was, and how it is now.');
    await press(help);
    await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(1);
    await answer(page, press);
    await expect(strip.locator('[data-filled="true"] svg')).toHaveAttribute('data-picture', 'rain');
    await expect(caption(page)).toHaveText('Yes. The rain made the puddle.');
  });

  test('what happens next: how it turns out takes the last place', async ({ page, press }) => {
    await page.goto(play('eh-next-01'));
    await press(myTurn(page));
    const strip = lesson(page).locator('[data-scene="strip"]');
    await expect(caption(page)).toHaveText('A pin touches the balloon. What happens next?');
    await expect(strip.locator('svg[data-picture="balloon2"]')).toHaveCount(1);
    await expect(strip.locator('svg[data-picture="pin"]')).toHaveCount(1);
    await expect(strip.locator('svg[data-picture="balloon3"]')).toHaveCount(0);
    await answer(page, press);
    await expect(strip.locator('[data-filled="true"] svg')).toHaveAttribute(
      'data-picture',
      'balloon3',
    );
    await expect(caption(page)).toHaveText('Yes. The balloon bursts.');
  });
});

/** Where each place of the map on the screen is, by what is drawn under its middle. */
async function placesOnScreen(page: Page) {
  return page.evaluate(() => {
    const map = document.querySelector('[data-testid="map-board"] [data-scene="map"]');
    if (!map) throw new Error('There is no map on the screen.');
    const frame = map.getBoundingClientRect();
    return [
      ...document.querySelectorAll<HTMLElement>('[data-testid="map-board"] [data-choice]'),
    ].map((spot) => {
      const box = spot.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      // What the map itself has at that point, under the place and everything else laid over it.
      const under = document
        .elementsFromPoint(x, y)
        .filter((element) => map.contains(element) && element !== map);
      return {
        id: spot.dataset.choice ?? '',
        // In the map's own units: 100 across, 64 down.
        x: ((x - frame.left) / frame.width) * 100,
        y: ((y - frame.top) / frame.height) * 64,
        size: Math.min(box.width, box.height),
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        land: under.some((element) => element.closest('[data-land]') !== null),
      };
    });
  });
}

test.describe('a map to answer on', () => {
  test('every flag stands where the content says, on what the content says @layout', async ({
    page,
    press,
  }) => {
    await page.goto(play('eh-water-01'));
    await expect(page.getByTestId('map-board')).toBeVisible();
    await press(myTurn(page));
    await arrived(page);

    // Three maps in a row: two flags, then three.
    for (const flags of [2, 3]) {
      const challenge = await challengeOnScreen(page);
      if (challenge.kind !== 'choose-one') throw new Error('A map is a question with choices.');
      await expect(lesson(page).locator('[data-choice]')).toHaveCount(flags);
      const fit = await screenFit(page);
      expect(fit.sideways).toEqual([]);
      expect(fit.taller).toBe(0);
      const places = await placesOnScreen(page);
      for (const choice of challenge.choices) {
        const place = places.find((each) => each.id === choice.id);
        if (!place || choice.stimulus.type !== 'scene') throw new Error('A place is missing.');
        // Where it is drawn is where it is written, to within a point's worth of the map.
        expect(Math.abs(place.x - Number(choice.stimulus.of.x))).toBeLessThan(0.6);
        expect(Math.abs(place.y - Number(choice.stimulus.of.y))).toBeLessThan(0.6);
        // And the picture under it agrees with the answer: land under every flag but the one on the water.
        expect(place.land, choice.id).toBe(choice.id !== challenge.answer);
        expect(place.size).toBeGreaterThanOrEqual(56);
      }
      // No two places share any of the screen.
      for (const a of places) {
        for (const b of places) {
          if (a.id >= b.id) continue;
          const apart = Math.hypot(
            (a.left + a.right - b.left - b.right) / 2,
            (a.top + a.bottom - b.top - b.bottom) / 2,
          );
          expect(apart, `${a.id} and ${b.id}`).toBeGreaterThanOrEqual((a.size + b.size) / 2);
        }
      }
      await answer(page, press);
      await expect(caption(page)).toHaveText('Yes. That flag is on the water.');
      await expect(lesson(page).locator(`[data-choice="${challenge.answer}"]`)).toHaveAttribute(
        'data-state',
        'same',
      );
      await press(next(page));
    }
  });

  test('a flag on the land is set aside, and help shows which part is water', async ({
    page,
    press,
  }) => {
    await page.goto(play('eh-water-01'));
    await press(myTurn(page));
    const map = page.getByTestId('map-board').locator('[data-same]');
    await answer(page, press, false);
    await expect(caption(page)).toHaveText('That flag is on the land. Look for the blue water.');
    await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(1);
    await press(page.getByRole('button', { name: 'Help me' }));
    await expect(caption(page)).toHaveText('The water is the blue part.');
    await expect(map).toHaveAttribute('data-helping', 'water');
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That flag is on the water.');
    // Once it is answered, nothing is stepping back any more.
    await expect(map).not.toHaveAttribute('data-helping', 'water');
  });

  test('the boat sails to the nearest island; help draws the ways to compare @layout', async ({
    page,
    press,
  }) => {
    await page.goto(play('eh-near-01'));
    const board = page.getByTestId('map-board');
    const boat = page.getByTestId('boat');
    // The demonstration ends with the boat at the island that is nearest.
    await expect(boat).toHaveAttribute('data-arrived', 'true');
    await press(myTurn(page));
    await arrived(page);

    await expect(boat).toHaveAttribute('data-arrived', 'false');
    await expect(lesson(page).locator('[data-choice]')).toHaveCount(3);
    await expect(board.locator('line')).toHaveCount(0);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    for (const place of await placesOnScreen(page)) expect(place.size).toBeGreaterThanOrEqual(56);

    const challenge = await challengeOnScreen(page);
    if (challenge.kind !== 'choose-one') throw new Error('A map is a question with choices.');
    const before = await boat.boundingBox();
    await press(page.getByRole('button', { name: 'Help me' }));
    await expect(caption(page)).toHaveText(
      'Look at the lines. The shortest line goes to the nearest.',
    );
    await expect(board.locator('line')).toHaveCount(3);

    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That one is nearest. It is a short way to go.');
    await expect(boat).toHaveAttribute('data-arrived', 'true');
    // One way is left on the map: the one the boat took.
    await expect(board.locator('line')).toHaveCount(1);
    await expect(board.locator('line')).toHaveAttribute('data-route', challenge.answer);
    // And the boat is nearer the island than it was.
    const island = await lesson(page).locator(`[data-choice="${challenge.answer}"]`).boundingBox();
    const middle = (box: { x: number; y: number; width: number; height: number } | null) => ({
      x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
      y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
    });
    const far = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);
    await expect
      .poll(async () => far(middle(await boat.boundingBox()), middle(island)))
      .toBeLessThan(far(middle(before), middle(island)) * 0.75);
  });

  test('the farthest island is asked for the other way about', async ({ page, press }) => {
    await page.goto(play('eh-far-01'));
    await press(myTurn(page));
    await expect(caption(page)).toHaveText('Which island is farthest from the boat?');
    await answer(page, press, false);
    await expect(caption(page)).toHaveText('Another one is farther away. Look again.');
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That one is farthest. It is a long way to go.');
  });

  test('a map can be answered from the keyboard', async ({ page, hasTouch }) => {
    test.skip(hasTouch, 'A keyboard journey, checked on the desktop projects.');
    await page.goto(play('eh-land-01'));
    await myTurn(page).click();
    const challenge = await challengeOnScreen(page);
    if (challenge.kind !== 'choose-one') throw new Error('A map is a question with choices.');
    const right = lesson(page).locator(`[data-choice="${challenge.answer}"]`);
    await expect(right).toHaveAccessibleName(/^The flag (on the|in the) (left|middle|right)$/);
    await expect(right).toHaveAttribute('aria-disabled', 'false');
    await right.focus();
    await page.keyboard.press('Enter');
    await expect(caption(page)).toHaveText('Yes. That flag is on the land.');
  });
});

test.describe('on the flattest phone', () => {
  test.use({ viewport: { width: 640, height: 256 } });

  test('a map is small, and its places are still big enough to press and apart', async ({
    page,
    press,
  }) => {
    for (const id of ['eh-water-01', 'eh-far-01']) {
      await page.goto(play(id));
      await press(myTurn(page));
      await arrived(page);
      // The last map of the practice has three places.
      await answer(page, press);
      await press(next(page));
      await expect(lesson(page).locator('[data-choice]')).toHaveCount(3);
      const fit = await screenFit(page);
      expect(fit.sideways).toEqual([]);
      expect(fit.taller).toBe(0);
      const places = await placesOnScreen(page);
      for (const a of places) {
        expect(a.size).toBeGreaterThanOrEqual(56);
        for (const b of places) {
          if (a.id >= b.id) continue;
          const apart = Math.hypot(
            (a.left + a.right - b.left - b.right) / 2,
            (a.top + a.bottom - b.top - b.bottom) / 2,
          );
          expect(apart, `${id}: ${a.id} and ${b.id}`).toBeGreaterThanOrEqual(56);
        }
      }
    }
  });

  test('a story and its three answers fit side by side', async ({ page, press }) => {
    await page.goto(play('eh-why-01'));
    await press(myTurn(page));
    await arrived(page);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    for (const side of await smallestSides(page, '[data-choice]')) {
      expect(side).toBeGreaterThanOrEqual(56);
    }
    for (const side of await smallestSides(page, '[data-scene="strip"] svg[data-picture]')) {
      expect(side).toBeGreaterThanOrEqual(40);
    }
  });
});
