import {
  expect,
  holdClock,
  myTurn,
  next,
  screenFit,
  stepNumber,
  test,
  type Page,
  arrived,
} from './fixtures';
import { answer, challengeOnScreen } from './play';

/**
 * Memory Forest: finding pairs, saying what was there, repeating an order, and three ways to remember. What these
 * tests care about most is that nothing hidden can be read off the page, and that another look counts as help.
 */

const lesson = (page: Page) => page.getByTestId('lesson');
const play = (id: string) => `/world/memory-forest/play/${id}`;
const caption = (page: Page) => lesson(page).getByRole('status');
const prompt = (page: Page) => lesson(page).locator('[data-same]');

test.describe('find the pairs', () => {
  test('starts with the cards face up, then turns them over @layout', async ({ page, press }) => {
    await page.goto(play('mf-pairs-01'));
    const board = page.getByTestId('pairs-board');
    await expect(board).toBeVisible();
    await press(myTurn(page));

    // Face up: three pairs, every picture in view, nothing to remember yet.
    const cards = board.locator('[data-place]');
    await expect(cards).toHaveCount(6);
    await expect(board.locator('svg[data-picture]')).toHaveCount(6);
    // Measured once the screen has arrived: a page sliding in is not yet the page.
    await arrived(page);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    for (const card of await cards.all()) {
      const box = await card.boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. You found them all.');
    await press(next(page));

    // Face down: nothing of any card is on the page until it is turned.
    await expect(cards).toHaveCount(4);
    await expect(board.locator('svg[data-picture]')).toHaveCount(0);
    for (const card of await cards.all()) {
      await expect(card).toHaveAccessibleName('a card, face down');
    }
    await press(cards.nth(0));
    await expect(board.locator('svg[data-picture]')).toHaveCount(1);
    await expect(cards.nth(0)).not.toHaveAccessibleName('a card, face down');
  });

  test('two that differ are looked at and turn back; a pair stays', async ({ page, press }) => {
    await page.goto(play('mf-pairs-01'));
    await press(myTurn(page));
    await answer(page, press);
    await press(next(page));
    const board = page.getByTestId('pairs-board');
    const cards = board.locator('[data-place]');
    // Turn the first card, then others until one differs from it.
    await press(cards.nth(0));
    const first = await cards.nth(0).getAttribute('aria-label');
    let other = 1;
    await press(cards.nth(other));
    if ((await cards.nth(other).getAttribute('aria-label')) === first) {
      // That was a pair, by luck: it stays, and the other two are the other pair.
      await expect(cards.nth(0)).toHaveAttribute('data-found', 'true');
      return;
    }
    // Both are in view for a moment, and a third cannot be turned meanwhile.
    await expect(board.locator('svg[data-picture]')).toHaveCount(2);
    other = 2;
    await cards.nth(other).click({ force: true });
    await expect(board.locator('svg[data-picture]')).toHaveCount(2);
    // Then they turn back.
    await expect(board.locator('svg[data-picture]')).toHaveCount(0);
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. You found them all.');
  });
});

test.describe('which one was there?', () => {
  test('nothing that is covered can be read off the page, and another look is help', async ({
    page,
    press,
  }) => {
    await page.goto(play('mf-hidden-01'));
    await press(myTurn(page));
    // In view for a look, with the choices turned away…
    await expect(prompt(page)).toHaveAttribute('data-covered', 'false');
    await expect(prompt(page).locator('svg[data-picture]')).toHaveCount(2);
    await expect(lesson(page).locator('[data-choice]').first()).toHaveAttribute(
      'data-turned-away',
      'true',
    );
    // …and then gone from the page altogether.
    await expect(prompt(page)).toHaveAttribute('data-covered', 'true');
    await expect(prompt(page).locator('svg')).toHaveCount(0);
    await expect(prompt(page)).toContainText('Covered up, for now');
    await expect(prompt(page)).not.toContainText('To remember');
    await expect(caption(page)).toContainText('Which of these was there?');

    // Asking to be told again does not uncover them; asking for help does, once.
    await press(page.getByRole('button', { name: 'Show me again' }));
    await page.waitForTimeout(1500);
    await expect(prompt(page)).toHaveAttribute('data-covered', 'true');
    await press(page.getByRole('button', { name: 'Help me' }));
    await expect(caption(page)).toHaveText('Have another look.');
    await expect(prompt(page)).toHaveAttribute('data-covered', 'false');
    await expect(prompt(page)).toHaveAttribute('data-covered', 'true');

    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That one was there.');
  });

  test('ends with one question about the very first things, after a page reload', async ({
    page,
    press,
  }) => {
    await page.goto(play('mf-hidden-01'));
    await press(myTurn(page));
    for (let guard = 0; guard < 20; guard++) {
      const challenge = await challengeOnScreen(page);
      if (challenge.id === 'mf-hidden-01.earlier') break;
      await answer(page, press);
      await press(next(page));
    }
    // Leaving and coming back does not show the first things again: the question is still the question.
    await page.reload();
    await expect(lesson(page)).toHaveAttribute('data-challenge', 'mf-hidden-01.earlier');
    await expect(lesson(page).locator('[data-choice]')).toHaveCount(3);
    await expect(caption(page)).toHaveText(
      'Think back to the very start. Which of these did you see first?',
    );
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That one was there.');
    await press(next(page));
    await expect(page.getByTestId('lesson-finished')).toContainText(
      '5 of 5 right at the first try, with no help.',
    );
  });
});

test.describe('before the look', () => {
  test('nothing can be answered, and nothing is asked about yet', async ({ page, press }) => {
    // In by a tap, so that the voice is awake: "Look who has what…" is then said before anything is uncovered,
    // and for those few seconds there used to be choices to tap and the question already standing there.
    await page.goto('/world/memory-forest');
    await press(page.locator('[data-lesson="mf-story-01"]'));
    const shown = await lesson(page).getAttribute('data-challenge');
    await press(myTurn(page));
    await expect(lesson(page)).not.toHaveAttribute('data-challenge', shown ?? '');

    // Read at once, not waited for: this is the first thing the new question shows.
    const choices = lesson(page).locator('[data-choice]');
    const turnedAway = await choices.evaluateAll((list) =>
      list.map((choice) => choice.getAttribute('data-turned-away')),
    );
    expect(turnedAway.length).toBeGreaterThanOrEqual(2);
    expect(new Set(turnedAway)).toEqual(new Set(['true']));
    expect(await page.getByTestId('cue').count()).toBe(0);
    // A tap now is not an answer: the question is the same, and nothing has been set aside.
    await choices.first().click({ force: true });
    await expect(caption(page)).toContainText('Look who has what.');
    await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(0);

    // Then the look, the cover, and only then what is asked and something to answer with.
    await expect(prompt(page)).toHaveAttribute('data-covered', 'false');
    await expect(prompt(page)).toHaveAttribute('data-covered', 'true');
    await expect(page.getByTestId('cue').locator('svg[data-picture]')).toHaveCount(1);
    await expect(choices.first()).toHaveAttribute('data-turned-away', 'false');
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That is what it had.');
  });
});

test.describe('who had what?', () => {
  test('shows one of them again, alone, and asks what went with it @layout', async ({
    page,
    press,
  }) => {
    await page.goto(play('mf-story-01'));
    await expect(prompt(page).locator('[data-scene="pairs"]')).toBeVisible();
    // Measured once the screen has arrived: a page sliding in is not yet the page.
    await arrived(page);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    await press(myTurn(page));

    // The pairs are looked at, and then covered.
    await expect(prompt(page)).toHaveAttribute('data-covered', 'false');
    await expect(prompt(page)).toHaveAttribute('data-covered', 'true');
    // The one that is asked about stands in front of the cover; what it had is nowhere on the page.
    const cue = page.getByTestId('cue');
    await expect(cue.locator('svg[data-picture]')).toHaveCount(1);
    await expect(prompt(page).locator('svg[data-picture]')).toHaveCount(1);
    await expect(caption(page)).toContainText('What did this one have?');

    await answer(page, press, false);
    await expect(caption(page)).toHaveText('That was not this one’s. Think again.');
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That is what it had.');
  });
});

test.describe('things that go together', () => {
  test('keeps the cards blank while the things to remember are on show', async ({
    page,
    press,
  }) => {
    await page.goto(play('mf-groups-01'));
    await press(myTurn(page));
    const board = page.getByTestId('select-board');
    // Four things to look at; the cards to answer with show nothing yet.
    await expect(
      board.locator('[data-same] svg[data-picture], [class*="study"] svg[data-picture]'),
    ).toHaveCount(4);
    await expect(board.locator('[data-card] svg')).toHaveCount(0);
    await press(page.getByRole('button', { name: 'Ready' }));
    // Put away: now the cards show, and the things to remember are off the page.
    await expect(board.locator('[class*="study"] svg[data-picture]')).toHaveCount(0);
    await expect(board.locator('[data-card] svg[data-picture]').first()).toBeVisible();
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. Those were the ones.');
  });
});

test.describe('the same order', () => {
  test('shows the order to everyone, and again only as help @layout', async ({ page, press }) => {
    await page.goto(play('mf-order-01'));
    const board = page.getByTestId('echo-board');
    await expect(board).toBeVisible();
    // Measured once the screen has arrived: a page sliding in is not yet the page.
    await arrived(page);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    await press(myTurn(page));
    // The order is shown: something is lit, and then nothing is.
    await expect(board.locator('[data-lit="true"]')).toHaveCount(1);
    await expect(board.locator('[data-lit="true"]')).toHaveCount(0);

    // The wrong order: said so, and shown again.
    const challenge = await challengeOnScreen(page);
    if (challenge.kind !== 'make' || challenge.task.type !== 'echo')
      throw new Error('Not an order.');
    for (const id of [...challenge.task.solution].reverse()) {
      await press(board.locator(`[data-card="${id}"]`));
      await page.waitForTimeout(380);
    }
    await expect(caption(page)).toHaveText('Not that order. Watch again.');
    await expect(board.locator('[data-lit="true"]')).toHaveCount(1);
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. The same order.');
  });

  test('takes no tap until the whole order has been shown', async ({ page, press }) => {
    // With the clock held, the pause between one light and the next is a place to stand and tap in.
    await page.clock.install();
    await page.goto(play('mf-order-01'));
    const board = page.getByTestId('echo-board');
    await expect(myTurn(page)).toBeVisible();
    await holdClock(page);
    await press(myTurn(page));
    const challenge = await challengeOnScreen(page);
    if (challenge.kind !== 'make' || challenge.task.type !== 'echo')
      throw new Error('Not an order.');
    const { solution } = challenge.task;

    // Go through the showing a little at a time. At each moment: what is lit, and can anything be tapped? And
    // a card is tapped regardless, as a finger might be in the pause between two lights. (Those taps used to
    // count: the cards were open from the moment the question arrived, and again in every pause.)
    const shown: string[] = [];
    let before: string | null = null;
    let openAfter = -1;
    for (let slice = 0; slice < 400 && openAfter < 0; slice++) {
      const now = await board.evaluate((element) => {
        const cards = [...element.querySelectorAll<HTMLElement>('[data-card]')];
        const lit = cards.find((card) => card.dataset.lit === 'true');
        const open = cards.some((card) => card.getAttribute('aria-disabled') !== 'true');
        // A tap that does not ask whether it may.
        if (!open) cards[0]?.click();
        return { lit: lit?.dataset.card ?? null, open };
      });
      if (now.lit !== null && now.lit !== before) shown.push(now.lit);
      before = now.lit;
      if (now.open) openAfter = shown.length;
      else await page.clock.runFor(40);
    }
    // The order that was shown is the order that is asked for, and all of it came first.
    expect(shown).toEqual(solution);
    expect(openAfter).toBe(solution.length);
    // None of those taps was taken as the start of an answer.
    await expect(board.locator('ol > li[data-done="true"]')).toHaveCount(0);

    // From here it is played as usual.
    await page.clock.resume();
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. The same order.');
  });

  test('asking to be told again takes no order away: not the next one, and not one half shown', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    await page.goto(play('mf-order-01'));
    const board = page.getByTestId('echo-board');
    const cards = board.locator('[data-card]');
    const sayAgain = page.getByRole('button', { name: 'Show me again' });
    await expect(myTurn(page)).toBeVisible();
    await holdClock(page);
    await press(myTurn(page));
    /** Move the clock on until a card can be tapped, and say which were lit on the way, in order. */
    const showing = async (): Promise<string[]> => {
      const shown: string[] = [];
      let before: string | null = null;
      for (let slice = 0; slice < 400; slice++) {
        const now = await board.evaluate((element) => {
          const all = [...element.querySelectorAll<HTMLElement>('[data-card]')];
          return {
            lit: all.find((card) => card.dataset.lit === 'true')?.dataset.card ?? null,
            open: all.some((card) => card.getAttribute('aria-disabled') !== 'true'),
          };
        });
        if (now.lit !== null && now.lit !== before) shown.push(now.lit);
        before = now.lit;
        if (now.open) return shown;
        await page.clock.runFor(40);
      }
      throw new Error('The cards never opened.');
    };
    const orderOf = async (): Promise<string[]> => {
      const challenge = await challengeOnScreen(page);
      if (challenge.kind !== 'make' || challenge.task.type !== 'echo')
        throw new Error('Not an order.');
      return challenge.task.solution;
    };

    // Asked while the first thing is lit: the showing starts over, and is given whole. (It used to stop there,
    // with the words said again and the rest of the order never shown.)
    const first = await orderOf();
    for (let slice = 0; slice < 400; slice++) {
      if ((await board.locator('[data-lit="true"]').count()) > 0) break;
      await page.clock.runFor(40);
    }
    await expect(board.locator('[data-lit="true"]')).toHaveCount(1);
    await press(sayAgain);
    expect(await showing()).toEqual(first);

    // Asked once it has all been shown: the words, and nothing lit.
    await press(sayAgain);
    await page.clock.runFor(6000);
    await expect(board.locator('[data-lit="true"]')).toHaveCount(0);
    await expect(cards.first()).toHaveAttribute('aria-disabled', 'false');

    // And the next order is shown like any other. (Having asked once used to count against every step after
    // it: no order was shown again for the rest of the activity.)
    await page.clock.resume();
    await answer(page, press);
    await press(next(page));
    expect(await stepNumber(page)).toBe(3);
    await holdClock(page);
    expect(await showing()).toEqual(await orderOf());
  });
});
