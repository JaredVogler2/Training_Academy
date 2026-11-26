import {
  SETTINGS_KEY,
  arrived,
  expect,
  holdClock,
  myTurn,
  next,
  screenFit,
  test,
  watchFor,
  type Locator,
  type Page,
} from './fixtures';
import { answer, challengeOnScreen } from './play';

/**
 * Number Garden's later activities, the ones that bring numerals in: a staircase with a step missing, a frame to
 * fill, numerals for amounts, a number that is said, a path of numbered stones, and stories in which some come or
 * some go. Each is tried wrongly as well as rightly, and what each must not give away is looked for on the page.
 */

const lesson = (page: Page) => page.getByTestId('lesson');
const play = (id: string) => `/world/number-garden/play/${id}`;
/** What is asked about. */
const asked = (page: Page) => lesson(page).locator('[data-same]');
const choices = (page: Page) => lesson(page).locator('[data-choice]');
const caption = (page: Page) => lesson(page).getByRole('status');

type Press = (target: Locator) => Promise<void>;

/** Past Glim's showing, to the first thing a child does in an activity. */
async function toTheFirstStep(page: Page, press: Press, id: string): Promise<void> {
  await page.goto(play(id));
  await press(myTurn(page));
  await choices(page).first().waitFor();
}

/** The choice that is right, and one that is not, as the content has them. */
async function rightAndWrong(page: Page): Promise<{ right: Locator; wrong: Locator }> {
  const challenge = await challengeOnScreen(page);
  if (challenge.kind !== 'choose-one') throw new Error('Not a question with choices.');
  const other = challenge.choices.find((choice) => choice.id !== challenge.answer);
  return {
    right: lesson(page).locator(`[data-choice="${challenge.answer}"]`),
    wrong: lesson(page).locator(`[data-choice="${other?.id ?? ''}"]`),
  };
}

test.describe('one more each time', () => {
  test('towers stand side by side on every screen, and the gap says nothing until the right tower is in it @layout', async ({
    page,
    press,
  }) => {
    await toTheFirstStep(page, press, 'ng-stairs-01');
    // Towers of two and three, and then a gap.
    const stairs = asked(page).locator('svg[data-scene="stairs"]');
    await expect(stairs).toHaveAttribute('data-heights', '2-3-0');
    await expect(stairs.locator('[data-block]')).toHaveCount(5);
    await expect(stairs.locator('[data-gap] [data-block]')).toHaveCount(0);

    await arrived(page);
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
    // The towers to choose from stand in a row, on the same ground, however narrow the screen: that is how two
    // towers are told apart.
    const boxes = await choices(page).evaluateAll((cards) =>
      cards.map((card) => {
        const box = card.getBoundingClientRect();
        const block = card.querySelector('[data-block] rect')?.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          width: box.width,
          height: box.height,
          blockHigh: block?.height ?? 0,
          ground: Math.max(
            ...[...card.querySelectorAll('[data-block] rect')].map(
              (rect) => rect.getBoundingClientRect().bottom,
            ),
          ),
        };
      }),
    );
    expect(boxes).toHaveLength(2);
    const [first, second] = boxes;
    if (!first || !second) throw new Error('Two towers were expected.');
    expect(Math.abs(first.top - second.top)).toBeLessThan(1);
    expect(second.left).toBeGreaterThan(first.right - 1);
    expect(Math.abs(first.ground - second.ground)).toBeLessThan(1);
    for (const box of boxes) {
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(56);
      // A block can be seen to be one block: not a sliver.
      expect(box.blockHigh).toBeGreaterThanOrEqual(8);
    }

    // A tower that does not fit is said not to, and the gap is still a gap.
    await answer(page, press, false);
    await expect(caption(page)).toHaveText('That one does not fit. Look at the steps.');
    await expect(stairs.locator('[data-gap] [data-block]')).toHaveCount(0);

    // The one that fits is stood in the gap: four blocks, one more than three.
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That one fits.');
    await expect(stairs).toHaveAttribute('data-solved', 'true');
    await expect(stairs.locator('[data-gap] [data-block]')).toHaveCount(4);
    await expect(next(page)).toBeVisible();
  });
});

test.describe('fill the five', () => {
  test('the frame shows what is there, and is filled only by the group that fills it @layout', async ({
    page,
    press,
  }) => {
    await toTheFirstStep(page, press, 'ng-frame-01');
    const frame = asked(page).locator('svg[data-scene="frame"]');
    // Four apples in a frame of five.
    await expect(frame).toHaveAttribute('data-places', '11110');
    await expect(frame.locator('[data-full-place]')).toHaveCount(4);
    await arrived(page);
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
    // What is in a place can be seen to be one thing: 18 pixels or more across, even on the flattest phone.
    const place = await frame.locator('[data-full-place]').first().boundingBox();
    expect(place?.width ?? 0).toBeGreaterThanOrEqual(18);

    // The group of four is as many as are there already: tempting, and wrong.
    await answer(page, press, false);
    await expect(caption(page)).toHaveText('That does not fill it. Let us count the empty places.');
    await expect(asked(page).locator('[data-filled-in]')).toHaveCount(0);

    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. Now it is full.');
    // What the answer brought stands in the place that was empty.
    await expect(asked(page).locator('[data-filled-in]')).toHaveCount(1);
    await expect(asked(page).locator('[data-full-place]')).toHaveCount(5);
  });
});

test.describe('numbers one to five', () => {
  test('a numeral shows its amount in dots only while it is being counted', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    await toTheFirstStep(page, press, 'ng-numerals-01');
    // Three snails; the numerals 3 and 1.
    const { right, wrong } = await rightAndWrong(page);
    await expect(right.locator('svg')).toHaveAttribute('data-numeral', '3');
    await expect(wrong.locator('svg')).toHaveAttribute('data-numeral', '1');
    // Glim counts the snails with the child first. All the while, and after, no numeral shows a single dot.
    // (Both numerals are read in one go. Read one after the other, as they were, the two counts could be of two
    // moments: in CI, in WebKit, the test once saw one dot on the 1 and three on the 3 together, which the page
    // never showed.)
    const dots = () =>
      lesson(page).evaluate((frame) => {
        const on = (numeral: string) =>
          frame
            .querySelector(`svg[data-numeral="${numeral}"]`)
            ?.closest('[data-choice]')
            ?.querySelectorAll('[data-dot]').length ?? -1;
        return `${String(on('1'))} on 1, ${String(on('3'))} on 3`;
      });
    const counted = async () =>
      (await asked(page).locator('svg').getAttribute('data-counting')) ?? '';
    await expect.poll(counted).toBe('true');
    expect(await dots()).toBe('0 on 1, 0 on 3');
    await expect.poll(counted, { timeout: 15_000 }).toBe('false');
    expect(await dots()).toBe('0 on 1, 0 on 3');

    // The wrong numeral is answered by what it is: one dot, counted. Then the right one is shown: three dots.
    await holdClock(page);
    await press(wrong);
    await expect(caption(page)).toHaveText('Not that one. Let us count.');
    const seen = await watchFor(page, 16_000, dots);
    expect(seen).toEqual(['0 on 1, 0 on 3', '1 on 1, 0 on 3', '0 on 1, 3 on 3', '0 on 1, 0 on 3']);
  });

  test('goes both ways: a numeral is asked about too, and answered with a group', async ({
    page,
    press,
  }) => {
    await toTheFirstStep(page, press, 'ng-numerals-01');
    await answer(page, press);
    await press(next(page));
    // The second guided step: the numeral 2, and groups of leaves.
    await expect(asked(page).locator('svg[data-scene="numeral"]')).toHaveAttribute(
      'data-numeral',
      '2',
    );
    await expect(choices(page).locator('svg[data-item="leaf"]')).toHaveCount(2);
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That is how many.');
  });
});

test.describe('zero', () => {
  test('is an empty frame, and stays empty when it has been named', async ({ page, press }) => {
    await toTheFirstStep(page, press, 'ng-numerals-02');
    const frame = asked(page).locator('svg[data-scene="frame"]');
    await expect(frame).toHaveAttribute('data-places', '0000000000');
    await expect(frame.locator('[data-full-place]')).toHaveCount(0);
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That is the number.');
    // Once the frame and its numeral are lit together, the frame is as it was. Nothing has been put in it:
    // none is none.
    await expect(asked(page)).toHaveAttribute('data-same', 'true');
    await expect(frame).toHaveAttribute('data-solved', 'true');
    await expect(asked(page).locator('[data-full-place]')).toHaveCount(0);
  });
});

test.describe('hear a number', () => {
  const open = async (page: Page, press: Press) => {
    // In by a tap, as a child comes in: an activity for listening will not start until the audio is awake.
    await page.goto('/world/number-garden');
    await press(page.locator('[data-lesson="ng-numerals-03"]'));
    await expect(myTurn(page)).toBeVisible({ timeout: 20_000 });
  };

  test('cannot be answered until the number has been said, and says it again for the asking', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    await open(page, press);
    await holdClock(page);
    await press(myTurn(page));
    await choices(page).first().waitFor();
    const state = async () =>
      (await choices(page).evaluateAll((cards) =>
        cards.every((card) => card.getAttribute('aria-disabled') === 'true'),
      ))
        ? 'waiting'
        : 'open';
    // Nothing has been said yet. A tap now would be a guess at a question not yet put: nothing takes it.
    expect(await state()).toBe('waiting');
    const { wrong } = await rightAndWrong(page);
    await wrong.click({ force: true });
    await expect(caption(page)).toHaveText('Listen. Which number is it?');
    expect(await watchFor(page, 9000, state)).toEqual(['waiting', 'open']);

    // The bell is the thing to press to hear it again; and while it is said again, nothing can be answered.
    const bell = page.getByRole('button', { name: 'Hear it again' });
    const box = await bell.boundingBox();
    expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    await press(bell);
    expect(await watchFor(page, 9000, state)).toEqual(['waiting', 'open']);
    // The page does not say which number it was.
    expect(await asked(page).textContent()).not.toMatch(/\d|one|two|three|four|five|six|seven/i);
  });

  test('says it needs sound when the sound is off, and asks nothing', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ version: 1, sound: false, motion: 'system', graphics: 'pictures' }),
      );
    }, SETTINGS_KEY);
    await page.goto(play('ng-numerals-03'));
    await expect(page.getByTestId('lesson-needs-sound')).toBeVisible();
    await expect(choices(page)).toHaveCount(0);
  });
});

test.describe('the number path', () => {
  test('the bare stone has nothing on it until its number is found @layout', async ({
    page,
    press,
  }) => {
    await toTheFirstStep(page, press, 'ng-line-01');
    const path = asked(page).locator('svg[data-scene="path"]');
    // Stones numbered 2, 3, a bare one, and 5.
    await expect(path).toHaveAttribute('data-numbers', '2-3-x-5');
    await expect(path.locator('[data-gap] g path')).toHaveCount(0);
    await arrived(page);
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });

    await answer(page, press, false);
    await expect(caption(page)).toHaveText('Not that one. Say the numbers along the stones.');
    await expect(path.locator('[data-gap] g path')).toHaveCount(0);

    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That number fits.');
    await expect(path).toHaveAttribute('data-solved', 'true');
    await expect(path.locator('[data-gap] g path')).toHaveCount(1);
  });
});

test.describe('some more come, and some go away', () => {
  test('a story is shown as it stood before anyone moved, and then they come @layout', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    await page.goto(play('ng-add-01'));
    await expect(myTurn(page)).toBeVisible();
    await holdClock(page);
    await press(myTurn(page));
    await choices(page).first().waitFor();
    // One frog, and one more to come.
    const story = asked(page).locator('svg[data-scene="story"]');
    await expect(story).toHaveAttribute('data-start', '1');
    await expect(story).toHaveAttribute('data-moved', '1');
    const told = async () => (await story.locator('[data-moving]').getAttribute('data-told')) ?? '';
    // From the first moment, the one who is to come is not there; then it comes, as the words are said.
    expect(await watchFor(page, 6000, told)).toEqual(['before', 'after']);
    await page.clock.resume();
    await arrived(page);
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
    // Everyone in the story can be seen to be one of them: 24 pixels across or more.
    const sizes = await story
      .locator('[data-thing]')
      .evaluateAll((things) => things.map((thing) => thing.getBoundingClientRect().width));
    expect(sizes).toHaveLength(2);
    // The flattest phone held sideways has room for less: a thing there is 20 pixels and more across.
    const least = (page.viewportSize()?.height ?? 0) < 300 ? 18 : 24;
    for (const size of sizes) expect(size).toBeGreaterThanOrEqual(least);

    // One frog is how many there were: tempting, and wrong. Everyone is counted, and then the right group.
    await answer(page, press, false);
    await expect(caption(page)).toHaveText('Not that many. Let us count them all.');
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That is how many there are now.');
  });

  test('those who have gone stay in the picture, faded, and are not counted', async ({
    page,
    press,
  }) => {
    await toTheFirstStep(page, press, 'ng-take-01');
    // Two frogs, and one goes.
    const story = asked(page).locator('svg[data-scene="story"]');
    await expect(story).toHaveAttribute('data-change', 'leave');
    await expect(story.locator('[data-staying] [data-thing]')).toHaveCount(1);
    await expect(story.locator('[data-moving] [data-thing]')).toHaveCount(1);
    await expect(story.locator('[data-counted]')).toHaveCount(1);
    // Wait for the telling to end, and look at how the picture is left.
    await expect(story.locator('[data-moving]')).toHaveAttribute('data-told', 'after');
    await arrived(page);
    const faded = await story
      .locator('[data-moving]')
      .evaluate((group) => Number(getComputedStyle(group).opacity));
    expect(faded).toBeGreaterThan(0.2);
    expect(faded).toBeLessThan(0.6);
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That is how many are left.');
  });

  test('for someone who has asked for less movement, a story stands as it ends, with its words', async ({
    page,
    press,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await page.goto(play('ng-add-01'));
    await expect(myTurn(page)).toBeVisible();
    await holdClock(page);
    await press(myTurn(page));
    await choices(page).first().waitFor();
    const story = asked(page).locator('svg[data-scene="story"]');
    const told = async () => (await story.locator('[data-moving]').getAttribute('data-told')) ?? '';
    // Everyone is there from the first moment to the last: nobody is taken away to be brought in again.
    expect(await watchFor(page, 5000, told)).toEqual(['after']);
    await expect(caption(page)).toHaveText('Here come some more. How many now?');
    await page.clock.resume();
    await answer(page, press);
    await expect(next(page)).toBeVisible();
  });
});

test.describe('in words, for someone who cannot see the pictures', () => {
  test('each kind of question says what it shows, and never what its answer is', async ({
    page,
    press,
  }) => {
    const said = async (id: string) => {
      await toTheFirstStep(page, press, id);
      return (await asked(page).locator('.sr-only').textContent()) ?? '';
    };
    expect(await said('ng-stairs-01')).toBe(
      'Towers in a row: two high, three high and one missing',
    );
    expect(await said('ng-frame-01')).toBe(
      'A frame with five places, holding four apples. Some places are empty',
    );
    expect(await said('ng-numerals-02')).toBe('A frame with ten places, holding no apples');
    expect(await said('ng-line-01')).toBe('Stones in a row, numbered 2, 3, a bare stone and 5');
    expect(await said('ng-add-01')).toBe('one frog, and one more comes');
    expect(await said('ng-take-01')).toBe('two frogs, and one goes away');
    // And the choices are named for what they are.
    await toTheFirstStep(page, press, 'ng-numerals-01');
    await expect(page.getByRole('button', { name: 'the number 3' })).toBeVisible();
  });
});
