import {
  expect,
  finished,
  myTurn,
  next,
  screenFit,
  stepNumber,
  test,
  type Locator,
  type Page,
} from './fixtures';

/**
 * Number Garden's activities beyond the first: seeing a small amount at a glance, giving one to each, which has
 * more and which has fewer, and two that are equal. Each is played the way a child would play it — by looking at
 * the pictures — and each is tried wrongly as well as rightly.
 */

const lesson = (page: Page) => page.getByTestId('lesson');
const play = (id: string) => `/world/number-garden/play/${id}`;
const done = (page: Page) => page.getByRole('button', { name: 'Done' });
const caption = (page: Page) => lesson(page).getByRole('status');

type Press = (target: Locator) => Promise<void>;

async function amountIn(picture: Locator): Promise<number> {
  return Number(await picture.locator('svg[data-count]').first().getAttribute('data-count'));
}

/** The amounts on the choices still on the table, in the order they are shown. */
async function amountsOnTheTable(page: Page): Promise<{ choice: Locator; amount: number }[]> {
  const choices = lesson(page).locator('[data-choice]:not([data-state="away"])');
  const found = [];
  for (let index = 0; index < (await choices.count()); index++) {
    const id = await choices.nth(index).getAttribute('data-choice');
    // By its own name, not by where it stands: a choice that is set aside changes who is second.
    const choice = lesson(page).locator(`[data-choice="${String(id)}"]`);
    found.push({ choice, amount: await amountIn(choice) });
  }
  return found;
}

/** Give `count` things, one tap of the pile at a time. */
async function give(page: Page, press: Press, count: number): Promise<void> {
  const pile = page.getByRole('button', { name: /^Give one/ });
  for (let given = 0; given < count; given++) {
    await press(pile);
    await page.waitForTimeout(140);
  }
}

/** How many friends are waiting to be given something. */
async function friends(page: Page): Promise<number> {
  const board = page.getByTestId('give-board');
  const places = await board.locator('[class*="cell"]').count();
  return places > 0 ? places : amountIn(board.locator('[class*="wanting"]'));
}

test.describe('the world page', () => {
  test('offers every activity as a picture, and Play goes to the first one not yet finished', async ({
    page,
    press,
  }) => {
    await page.goto('/world/number-garden');
    const cards = page.locator('[data-lesson]');
    await expect(cards).toHaveCount(7);
    // Every card has its picture: what the activity is, from its own demonstration.
    await expect(cards.locator('svg').first()).toBeVisible();
    for (let index = 0; index < 7; index++) {
      await expect(cards.nth(index).locator('svg').first()).toBeVisible();
      const box = await cards.nth(index).boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }
    await expect(page.getByRole('link', { name: 'Play', exact: true })).toHaveAttribute(
      'href',
      play('ng-same-amount-01'),
    );
    await expect(cards.first()).toHaveAttribute('data-next', 'true');

    // The grown-up's list says plainly which activities are ready: here, all four.
    const list = page.getByRole('region', { name: 'For grown-ups' }).getByRole('listitem');
    await expect(list).toHaveCount(4);
    await expect(list.filter({ hasText: 'Ready' })).toHaveCount(4);

    // A card is a way in to its own activity, whatever Play would have chosen.
    await press(cards.nth(4));
    await expect(page).toHaveURL(new RegExp(`${play('ng-more-01')}$`));
    await expect(myTurn(page)).toBeVisible();
  });

  test('moves Play on once an activity has been finished, and marks the one that was', async ({
    page,
    press,
  }) => {
    await page.goto(play('ng-more-01'));
    await press(myTurn(page));
    for (let guard = 0; guard < 30 && !(await finished(page).isVisible()); guard++) {
      if (await next(page).isVisible()) await press(next(page));
      else {
        const table = await amountsOnTheTable(page);
        const most = table.reduce((a, b) => (b.amount > a.amount ? b : a));
        await press(most.choice);
      }
      await page.waitForTimeout(150);
    }
    await expect(finished(page)).toContainText('4 of 4 right at the first try, with no help.');
    await press(finished(page).getByRole('link', { name: 'Islands' }));
    await press(page.getByRole('link', { name: /Number Garden/ }));

    const card = page.locator('[data-lesson="ng-more-01"]');
    await expect(card).toHaveAttribute('data-done', 'true');
    await expect(card).toHaveAccessibleName(/Which has more\?: done/);
    // Play still goes to the first activity that has not been finished.
    await expect(page.getByRole('link', { name: 'Play', exact: true })).toHaveAttribute(
      'href',
      play('ng-same-amount-01'),
    );
  });
});

test.describe('one for each', () => {
  test('is played by giving, taking back and saying when it is done @layout', async ({
    page,
    press,
  }) => {
    await page.goto(play('ng-give-01'));
    // Glim gives one to each of three snails first; nothing is asked yet.
    await expect(page.getByTestId('give-board')).toBeVisible();
    expect(await stepNumber(page)).toBe(1);
    await press(myTurn(page));

    // Two mice, each with a place. The whole board is on the screen and its two targets are large.
    expect(await friends(page)).toBe(2);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    for (const target of [/^Give one/, /Take one back/]) {
      const box = await page.getByRole('button', { name: target }).boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0), String(target)).toBeGreaterThanOrEqual(
        56,
      );
    }
    // Nothing to hand in yet.
    await expect(done(page)).toBeDisabled();

    // One is not enough: said so, counted, and nothing is taken away.
    await give(page, press, 1);
    await press(done(page));
    await expect(caption(page)).toHaveText('Not one for each yet. Let us count.');
    expect(await stepNumber(page)).toBe(2);
    await expect(page.getByRole('button', { name: /one acorn given/ })).toBeVisible();

    // With places, a third cannot be given: there is nowhere for it to go, and the pile says so.
    await give(page, press, 1);
    await expect(page.getByRole('button', { name: /two acorns given/ })).toBeVisible();
    const pile = page.getByRole('button', { name: /^Give one/ });
    await expect(pile).toHaveAttribute('aria-disabled', 'true');
    await pile.click({ force: true });
    await expect(page.getByRole('button', { name: /two acorns given/ })).toBeVisible();
    await press(done(page));
    await expect(caption(page)).toHaveText('Yes. One for each.');
    await press(next(page));

    // Four birds: one too many cannot happen here either, but one can be taken back and given again.
    expect(await friends(page)).toBe(4);
    await give(page, press, 4);
    await press(page.getByRole('button', { name: /Take one back/ }));
    await expect(page.getByRole('button', { name: /three apples given/ })).toBeVisible();
    await give(page, press, 1);
    await press(done(page));
    await expect(caption(page)).toHaveText('Yes. One for each.');
    await press(next(page));

    // On their own there are no places: one too many is possible, and is counted against the friends.
    const wanted = await friends(page);
    await expect(page.getByTestId('give-board')).toHaveAttribute('data-places', 'false');
    await give(page, press, wanted + 1);
    await press(done(page));
    await expect(caption(page)).toHaveText('Not one for each yet. Let us count.');
    await press(page.getByRole('button', { name: /Take one back/ }));
    await press(done(page));
    await expect(caption(page)).toHaveText('Yes. One for each.');
    await press(next(page));

    // The rest, rightly, to the end. The one that needed a second try is asked again in another form.
    for (let guard = 0; guard < 12 && !(await finished(page).isVisible()); guard++) {
      if (await next(page).isVisible()) await press(next(page));
      else {
        await give(page, press, await friends(page));
        await press(done(page));
      }
      await page.waitForTimeout(150);
    }
    await expect(finished(page)).toContainText('3 of 4 right at the first try, with no help.');
  });

  test('gives some to start with when help is asked for, and then shows where the rest go', async ({
    page,
    press,
  }) => {
    await page.goto(play('ng-give-01'));
    await press(myTurn(page));
    // Four birds is the second guided step; take the first as it comes.
    await give(page, press, 2);
    await press(done(page));
    await press(next(page));
    expect(await friends(page)).toBe(4);

    const help = page.getByRole('button', { name: 'Help me' });
    await press(help);
    await expect(caption(page)).toHaveText('Count the friends. Touch them one by one.');
    await press(help);
    await expect(caption(page)).toHaveText('Here are some to start with.');
    // Two were given, and they cannot be taken back.
    const given = page.getByRole('button', { name: /two apples given/ });
    await expect(given).toBeVisible();
    await expect(given).toHaveAttribute('aria-disabled', 'true');
    await given.click({ force: true });
    await expect(given).toBeVisible();
    await give(page, press, 2);
    await press(done(page));
    await expect(caption(page)).toHaveText('Yes. One for each.');
  });
});

test.describe('how many, at a glance', () => {
  test('covers the group before the choices can be matched against it by eye', async ({
    page,
    press,
  }) => {
    await page.goto(play('ng-glance-01'));
    await press(myTurn(page));
    const group = lesson(page).locator('[data-same]');
    const choices = lesson(page).locator('[data-choice]');

    // While the group is uncovered, every choice is turned away; once it is covered, they are turned back.
    await expect(group).toHaveAttribute('data-covered', 'false');
    await expect(choices.first()).toHaveAttribute('data-turned-away', 'true');
    // A tap on a choice that is turned away does nothing.
    await choices.first().click({ force: true });
    expect(await stepNumber(page)).toBe(2);
    await expect(group).toHaveAttribute('data-covered', 'true');
    await expect(choices.first()).toHaveAttribute('data-turned-away', 'false');
    await expect(group.locator('svg').first()).toBeHidden();
    // A screen reader is told it is covered, not what is under it.
    await expect(group).toContainText('Covered up, for now');

    // Asking to be told again is free, and does not uncover it.
    await press(page.getByRole('button', { name: 'Show me again' }));
    await page.waitForTimeout(1200);
    await expect(group).toHaveAttribute('data-covered', 'true');

    // Another look is help: it uncovers the group once more, and then covers it.
    await press(page.getByRole('button', { name: 'Help me' }));
    await expect(group).toHaveAttribute('data-covered', 'false');
    await expect(group).toHaveAttribute('data-covered', 'true');

    // The right answer uncovers it for good, and the two are counted together.
    const amount = await amountIn(group);
    const table = await amountsOnTheTable(page);
    await press(table.find((entry) => entry.amount === amount)!.choice);
    await expect(group).toHaveAttribute('data-covered', 'false');
    await expect(lesson(page).locator('[data-same="true"]')).toBeVisible();
    await expect(caption(page)).toHaveText('Yes. The same amount.');
  });

  test('still covers and uncovers when the device asks for less motion', async ({
    page,
    press,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(play('ng-glance-01'));
    await press(myTurn(page));
    const group = lesson(page).locator('[data-same]');
    await expect(group).toHaveAttribute('data-covered', 'false');
    await expect(group).toHaveAttribute('data-covered', 'true');
    await expect(lesson(page).locator('[data-choice]').first()).toHaveAttribute(
      'data-turned-away',
      'false',
    );
  });
});

test.describe('more and fewer', () => {
  for (const [id, pick, right, wrong] of [
    ['ng-more-01', 'most', 'Yes. That group has more.', 'That group has fewer. Look again.'],
    ['ng-fewer-01', 'fewest', 'Yes. That group has fewer.', 'That group has more. Look again.'],
  ] as const) {
    test(`${id}: a wrong group is counted and set aside; the right one ends the step`, async ({
      page,
      press,
    }) => {
      await page.goto(play(id));
      // The question is a picture too: two piles, with a ring round the one that is asked for.
      await expect(
        lesson(page).locator(`svg[data-sign="${pick === 'most' ? 'more' : 'fewer'}"]`),
      ).toBeVisible();
      await press(myTurn(page));
      const table = await amountsOnTheTable(page);
      const sorted = [...table].sort((a, b) => a.amount - b.amount);
      const answer = pick === 'most' ? sorted.at(-1)! : sorted[0]!;
      const other = pick === 'most' ? sorted[0]! : sorted.at(-1)!;

      await press(other.choice);
      await expect(caption(page)).toHaveText(wrong);
      await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(1);
      await press(answer.choice);
      await expect(caption(page)).toHaveText(right);
      await expect(next(page)).toBeVisible();
    });
  }
});

test.describe('two that are equal', () => {
  test('keeps the group that did belong when the pair was wrong @layout', async ({
    page,
    press,
  }) => {
    await page.goto(play('ng-equal-01'));
    await expect(page.getByTestId('select-board')).toBeVisible();
    await press(myTurn(page));

    const cards = page.getByTestId('select-board').locator('[data-card]');
    const amounts: number[] = [];
    for (let index = 0; index < (await cards.count()); index++) {
      amounts.push(await amountIn(cards.nth(index)));
    }
    const pair = amounts.find((amount, index) => amounts.indexOf(amount) !== index)!;
    const equal = amounts.flatMap((amount, index) => (amount === pair ? [index] : []));
    const odd = amounts.findIndex((amount) => amount !== pair);

    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    await expect(done(page)).toBeDisabled();

    // One that belongs and one that does not.
    await press(cards.nth(equal[0]!));
    await press(cards.nth(odd));
    await expect(cards.nth(odd)).toHaveAttribute('aria-pressed', 'true');
    // Two is all there are to find: a third cannot be picked.
    await press(cards.nth(equal[1]!));
    await expect(cards.nth(equal[1]!)).toHaveAttribute('aria-pressed', 'false');

    await press(done(page));
    await expect(caption(page)).toHaveText('Those are not equal. Look again.');
    await expect(cards.nth(equal[0]!)).toHaveAttribute('aria-pressed', 'true');
    await expect(cards.nth(odd)).toHaveAttribute('aria-pressed', 'false');

    await press(cards.nth(equal[1]!));
    await press(done(page));
    await expect(caption(page)).toHaveText('Yes. These two are equal.');
    await expect(next(page)).toBeVisible();
  });
});
