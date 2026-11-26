import {
  expect,
  finished,
  holdClock,
  myTurn,
  next,
  screenFit,
  stepNumber,
  test,
  watchFor,
  type Page,
  arrived,
} from './fixtures';
import { answer, challengeOnScreen, playToTheEnd } from './play';

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

/** Every answer this browser has stored, oldest first: what a grown-up's report is made from. */
async function stored(
  page: Page,
): Promise<
  { challengeId: string; skillId: string; response: string; assistance: string; outcome: string }[]
> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const opening = indexedDB.open('training-academy');
        opening.onerror = () => reject(new Error('The store could not be opened.'));
        opening.onsuccess = () => {
          const reading = opening.result.transaction('attempts').objectStore('attempts').getAll();
          reading.onerror = () => reject(new Error('The answers could not be read.'));
          reading.onsuccess = () => {
            const all = reading.result as { at: number; seq: number }[];
            resolve([...all].sort((a, b) => a.at - b.at || a.seq - b.seq) as never);
            opening.result.close();
          };
        };
      }),
  );
}

test.describe('remember it your way', () => {
  const board = (page: Page) => page.getByTestId('recall-board');
  const things = (page: Page) => page.getByTestId('recall-things');
  const wayButton = (page: Page, way: string) => board(page).locator(`[data-way-button="${way}"]`);
  const ready = (page: Page) => page.getByRole('button', { name: 'Ready' });
  /** The recall task on the screen, as the pack has it. */
  async function taskOnScreen(page: Page) {
    const challenge = await challengeOnScreen(page);
    if (challenge.kind !== 'make' || challenge.task.type !== 'recall') {
      throw new Error(`${challenge.id} is not looked at in a chosen way.`);
    }
    return challenge.task;
  }
  /** The smaller side of the smallest thing on show, in pixels: every one of them is at least this. */
  const smallest = (page: Page) =>
    things(page)
      .locator('svg[data-picture]')
      .evaluateAll((list) =>
        Math.min(
          ...list.map((each) => {
            const box = each.getBoundingClientRect();
            return Math.min(box.width, box.height);
          }),
        ),
      );
  /** Past Glim's showing of both halves, to the first set a child looks at. */
  async function toMyTurn(page: Page, press: (target: ReturnType<typeof myTurn>) => Promise<void>) {
    await page.goto(play('mf-choose-01'));
    await press(myTurn(page));
    await expect(page.getByTestId('select-board')).toBeVisible();
    await press(myTurn(page));
    await expect(board(page)).toHaveAttribute('data-phase', 'look');
  }

  test('lays the same four things out three ways, and asks about them the way they were left @layout', async ({
    page,
    press,
  }) => {
    await toMyTurn(page, press);
    const task = await taskOnScreen(page);
    // As they come: four things in a row, three pictures to press, and no way on until one has been pressed.
    await expect(board(page)).toHaveAttribute('data-way', '');
    await expect(things(page).locator('svg[data-picture]')).toHaveCount(4);
    await expect(ready(page)).toHaveCount(0);
    await arrived(page);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    for (const way of ['groups', 'story', 'places']) {
      const box = await wayButton(page, way).boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0), way).toBeGreaterThanOrEqual(48);
    }

    // In two groups: two rings, two things in each. As a story: two pairs. At places: four pairs, a place each.
    // And each way, every thing shown is large enough to make out on this screen.
    const upright = (page.viewportSize()?.width ?? 0) < 600;
    await press(wayButton(page, 'groups'));
    await expect(caption(page)).toHaveText('In two groups.');
    await expect(things(page).locator('[data-scene="groups"] > span')).toHaveCount(2);
    await expect(things(page).locator('svg[data-picture]')).toHaveCount(4);
    // On a phone held upright the two of a group stand one above the other: side by side, four across, each
    // was 71 pixels wide.
    expect(await smallest(page)).toBeGreaterThanOrEqual(upright ? 90 : 56);
    await press(wayButton(page, 'places'));
    await expect(caption(page)).toHaveText('At places along a path.');
    await expect(things(page).locator('[data-scene="places"] > span')).toHaveCount(4);
    await expect(things(page).locator('svg[data-picture]')).toHaveCount(8);
    expect(await smallest(page)).toBeGreaterThanOrEqual(56);
    await press(wayButton(page, 'story'));
    await expect(caption(page)).toHaveText('As a silly story.');
    await expect(wayButton(page, 'story')).toHaveAttribute('aria-pressed', 'true');
    await expect(wayButton(page, 'places')).toHaveAttribute('aria-pressed', 'false');
    await expect(things(page).locator('[data-scene="pairs"] > span')).toHaveCount(2);
    expect(await smallest(page)).toBeGreaterThanOrEqual(56);

    // Put away as a story: the story's question, about the animal the story asks about.
    await press(ready(page));
    const story = task.ways.find((way) => way.way === 'story')!;
    await expect(board(page)).toHaveAttribute('data-phase', 'ask');
    await expect(board(page)).toHaveAttribute('data-way', 'story');
    await expect(caption(page)).toHaveText('What did this one have?');
    const cue = story.cue.type === 'picture' ? story.cue.id : '';
    await expect(page.getByTestId('cue').locator(`svg[data-picture="${cue}"]`)).toBeVisible();
    // Three are offered, and they are the story's three: not what another way would have offered.
    const offered = await board(page)
      .locator('[data-choice]')
      .evaluateAll((list) => list.map((each) => each.getAttribute('data-choice')));
    expect([...offered].sort()).toEqual([...story.choices].sort());
    for (const choice of await board(page).locator('[data-choice]').all()) {
      const box = await choice.boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }
    expect((await screenFit(page)).sideways).toEqual([]);

    await press(board(page).locator(`[data-choice="${story.answer}"]`));
    await expect(caption(page)).toHaveText('Yes. You remembered it.');
    // And the things are shown again as they were looked at, with the answer marked.
    await expect(board(page)).toHaveAttribute('data-phase', 'settled');
    await expect(things(page).locator('[data-scene="pairs"]')).toBeVisible();
    // What is written down says how the child chose to look.
    const answers = await stored(page);
    expect(answers.at(-1)).toMatchObject({
      skillId: 'memory.cued.chosen-way',
      response: `story-${story.answer}`,
      outcome: 'correct',
    });
  });

  test('keeps the question off the page while the things are on show, and the things off it once they are put away', async ({
    page,
    press,
  }) => {
    await toMyTurn(page, press);
    const task = await taskOnScreen(page);
    const names = (ids: readonly string[]) =>
      ids.map((id) => task.cards.find((card) => card.id === id)?.label ?? id);
    // On show: nothing to answer with is in the page, in any way, and nothing says what will be asked.
    await press(wayButton(page, 'groups'));
    await expect(board(page).locator('[data-choice]')).toHaveCount(0);
    await expect(page.getByTestId('cue')).toHaveCount(0);
    const lures = task.cards.filter((card) => !task.study.includes(card.id));
    for (const lure of lures) {
      await expect(lesson(page).locator(`svg[data-picture="${lure.id}"]`)).toHaveCount(0);
      await expect(lesson(page).getByText(lure.label, { exact: true })).toHaveCount(0);
    }
    await press(ready(page));
    // Put away: the four are not in the page, as pictures or as words, but for what is asked about and offered.
    const groups = task.ways.find((way) => way.way === 'groups')!;
    const cue = groups.cue.type === 'picture' ? groups.cue.id : '';
    const onThePage = await lesson(page)
      .locator('svg[data-picture]')
      .evaluateAll((list) => list.map((each) => each.getAttribute('data-picture')));
    expect([...onThePage].sort()).toEqual([cue, ...groups.choices].sort());
    await expect(things(page)).toContainText('Covered up, for now');
    const hidden = task.study.filter((id) => id !== cue && !groups.choices.includes(id));
    expect(hidden.length).toBeGreaterThan(0);
    for (const word of names(hidden)) {
      await expect(lesson(page).getByText(word, { exact: false })).toHaveCount(0);
      await expect(lesson(page).getByRole('button', { name: word })).toHaveCount(0);
    }
  });

  test('takes a thing that went with something else for a wrong answer, and sets it aside; then shows which it was', async ({
    page,
    press,
  }) => {
    await toMyTurn(page, press);
    const task = await taskOnScreen(page);
    await press(wayButton(page, 'places'));
    await press(ready(page));
    const places = task.ways.find((way) => way.way === 'places')!;
    await expect(caption(page)).toHaveText('What was at this place?');
    const [first, second] = places.choices.filter((id) => id !== places.answer);
    await press(board(page).locator(`[data-choice="${first ?? ''}"]`));
    await expect(caption(page)).toHaveText('Not that one. Think how you looked at them.');
    await expect(board(page).locator(`[data-choice="${first ?? ''}"]`)).toHaveAttribute(
      'data-state',
      'away',
    );
    // Still covered: a wrong answer shows nothing.
    await expect(board(page)).toHaveAttribute('data-phase', 'ask');
    await expect(things(page).locator('[data-scene]')).toHaveCount(0);
    await press(board(page).locator(`[data-choice="${second ?? ''}"]`));
    // Two that were not it: only it is left, and it is pointed out. Giving it finishes the step, as helped.
    await expect(board(page).locator(`[data-choice="${places.answer}"]`)).toHaveAttribute(
      'data-state',
      'same',
    );
    await press(board(page).locator(`[data-choice="${places.answer}"]`));
    await expect(next(page)).toBeVisible();
    const answers = (await stored(page)).map((each) => `${each.response} ${each.outcome}`);
    expect(answers).toEqual([
      `places-${first ?? ''} incorrect`,
      `places-${second ?? ''} incorrect`,
      `places-${places.answer} correct`,
    ]);
  });

  test('gives another look only as help, in the way that was chosen, with the cards turned away', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    await toMyTurn(page, press);
    const task = await taskOnScreen(page);
    await press(wayButton(page, 'groups'));
    await press(ready(page));
    await holdClock(page);
    await press(page.getByRole('button', { name: 'Help me' }));
    const now = () =>
      lesson(page).evaluate((root) => {
        const recall = root.querySelector('[data-testid="recall-board"]');
        const scene = recall?.querySelector('[data-scene]')?.getAttribute('data-scene') ?? '-';
        const away = recall?.querySelectorAll('[data-choice][data-turned-away="true"]').length ?? 0;
        return `${recall?.getAttribute('data-phase') ?? ''} ${scene} ${String(away)}`;
      });
    const seen = await watchFor(page, 9000, now);
    // Covered; then on show again, in groups, with all three cards turned away; then covered again.
    expect(seen).toEqual(['ask - 0', 'again groups 3', 'ask - 0']);
    const groups = task.ways.find((way) => way.way === 'groups')!;
    await press(board(page).locator(`[data-choice="${groups.answer}"]`));
    await expect(next(page)).toBeVisible();
    // Right, and written down as helped: it is never counted as done alone.
    expect((await stored(page)).at(-1)).toMatchObject({ assistance: 'hint', outcome: 'correct' });
  });

  test('asks for all four again with no hint, as a question of its own, and counts the two apart', async ({
    page,
    press,
  }) => {
    await toMyTurn(page, press);
    const task = await taskOnScreen(page);
    await answer(page, press);
    await press(next(page));
    // Straight after: the four lie covered, nothing is shown, and there is no look to ask for.
    const select = page.getByTestId('select-board');
    await expect(select).toHaveAttribute('data-recalled', 'just-now');
    await expect(page.getByTestId('recalled')).toContainText('Covered up, for now');
    await expect(ready(page)).toHaveCount(0);
    await expect(select.locator('[data-card]')).toHaveCount(8);
    await expect(caption(page)).toHaveText('Now with no help. Which four did you see?');
    // One that was never there, among three that were: not quite, and the three that belong are kept.
    const lure = (await challengeOnScreen(page)).id;
    expect(lure.endsWith('-all')).toBe(true);
    const never = task.cards.find((card) => !task.study.includes(card.id))!;
    for (const id of [...task.study.slice(0, 3), never.id]) {
      await press(select.locator(`[data-card="${id}"]`));
    }
    await press(page.getByRole('button', { name: 'Done' }));
    await expect(caption(page)).toHaveText('Not quite. Think how you looked at them.');
    await expect(select.locator(`[data-card="${never.id}"]`)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await press(select.locator(`[data-card="${task.study[3] ?? ''}"]`));
    await press(page.getByRole('button', { name: 'Done' }));
    await expect(caption(page)).toHaveText('Yes. Those were the ones.');
    const answers = await stored(page);
    // The question with a hint was right at the first try; that is no part of the record of the one without.
    expect(answers.map((each) => `${each.skillId} ${each.outcome}`)).toEqual([
      'memory.cued.chosen-way correct',
      'memory.unaided.four-after-choosing incorrect',
      'memory.unaided.four-after-choosing correct',
    ]);
  });

  test('can be done with a keyboard: the three ways are buttons that say what they do and which is chosen', async ({
    page,
    press,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'a keyboard, on the desktop');
    await toMyTurn(page, press);
    await expect(
      page.getByRole('button', { name: 'Look at them in two groups', pressed: false }),
    ).toBeVisible();
    await wayButton(page, 'story').focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('button', { name: 'Look at them as a silly story', pressed: true }),
    ).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(wayButton(page, 'places')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(board(page)).toHaveAttribute('data-way', 'places');
    await ready(page).focus();
    await page.keyboard.press('Enter');
    await expect(board(page)).toHaveAttribute('data-phase', 'ask');
    const task = await taskOnScreen(page);
    const places = task.ways.find((way) => way.way === 'places')!;
    await board(page).locator(`[data-choice="${places.answer}"]`).focus();
    await page.keyboard.press('Enter');
    await expect(caption(page)).toHaveText('Yes. You remembered it.');
  });

  test('is shown by Glim looking each way in turn, and then answering what the last way asks', async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto(play('mf-choose-01'));
    await expect(board(page)).toBeVisible();
    await holdClock(page);
    const now = () =>
      lesson(page).evaluate((root) => {
        const recall = root.querySelector('[data-testid="recall-board"]');
        const lit = recall?.querySelector('[data-choice][data-state="same"]');
        return [
          recall?.getAttribute('data-phase') ?? '',
          recall?.getAttribute('data-way') ?? '',
          lit?.getAttribute('data-choice') ?? '-',
        ].join(' ');
      });
    const seen = await watchFor(page, 12_000, now);
    const task = await taskOnScreen(page);
    const [first] = task.ways;
    // (As they come, for the moment before Glim begins: whether that moment is caught depends on how soon the
    // clock was held, so it is not asked for.) Then each of the other ways, and the first way last; put away;
    // and what that way asks for.
    expect(seen[0] === 'look  -' ? seen.slice(1) : seen).toEqual([
      'look story -',
      'look places -',
      `look ${first!.way} -`,
      `ask ${first!.way} -`,
      `ask ${first!.way} ${first!.answer}`,
      `settled ${first!.way} ${first!.answer}`,
    ]);
    // Nothing can be pressed while it is shown: the three pictures say they are waiting.
    await expect(myTurn(page)).toBeVisible();
  });

  test('with less motion, is simply shown: the things as Glim kept them, and the answer', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(play('mf-choose-01'));
    await expect(board(page)).toHaveAttribute('data-phase', 'settled');
    const task = await taskOnScreen(page);
    await expect(board(page)).toHaveAttribute('data-way', task.ways[0]!.way);
    await expect(
      board(page).locator(`[data-choice="${task.ways[0]!.answer}"][data-state="same"]`),
    ).toBeVisible();
  });
});

test.describe('remember it your way, on the narrowest phone held sideways (640 by 256)', () => {
  test.use({ viewport: { width: 640, height: 256 } });

  test('gives the things most of the width while they are on show, so that each can be made out', async ({
    page,
    press,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'measured once, as a touch phone');
    // With a third of the width, as the lesson's boards usually share it, each thing was 28 pixels across; with
    // two thirds, a thing left at a place was 43. They have all but a thumb's width for each way's picture now.
    await page.goto(play('mf-choose-01'));
    await press(myTurn(page));
    await expect(page.getByTestId('select-board')).toBeVisible();
    await press(myTurn(page));
    const board = page.getByTestId('recall-board');
    await expect(board).toHaveAttribute('data-phase', 'look');
    await arrived(page);
    for (const way of ['groups', 'story', 'places']) {
      await press(board.locator(`[data-way-button="${way}"]`));
      await expect(board).toHaveAttribute('data-way', way);
      const sides = await page
        .getByTestId('recall-things')
        .locator('svg[data-picture]')
        .evaluateAll((list) =>
          list.map((each) => {
            const box = each.getBoundingClientRect();
            return Math.round(Math.min(box.width, box.height));
          }),
        );
      expect(Math.min(...sides), way).toBeGreaterThanOrEqual(46);
    }
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
  });
});

test.describe('keep it for next time', () => {
  const select = (page: Page) => page.getByTestId('select-board');
  const TEN_MINUTES = 10 * 60 * 1000;
  const DAY = 24 * 60 * 60 * 1000;
  /** The smaller side of the smallest of the things on show to be remembered, in pixels. */
  const smallestShown = (page: Page) =>
    select(page)
      .locator('[class*="study"] svg[data-picture]')
      .evaluateAll((list) =>
        Math.min(
          ...list.map((each) => {
            const box = each.getBoundingClientRect();
            return Math.round(Math.min(box.width, box.height));
          }),
        ),
      );
  /** A sitting played to its end; says what it kept, by the id of the challenge that asked for it. */
  async function sitting(page: Page, press: Parameters<typeof playToTheEnd>[1]): Promise<string> {
    await page.goto(play('mf-later-01'));
    await playToTheEnd(page, press);
    await expect(finished(page)).toBeVisible();
    const kept = (await stored(page)).findLast((each) => each.challengeId.includes('.keep-'));
    if (!kept) throw new Error('The sitting kept nothing.');
    return kept.challengeId;
  }

  test('shows five things, all new, and ends with three to keep @layout', async ({
    page,
    press,
  }) => {
    await page.goto(play('mf-later-01'));
    await press(myTurn(page));
    // Five to look at, and eight cards that show nothing yet.
    await expect(select(page).locator('[class*="study"] svg[data-picture]')).toHaveCount(5);
    await expect(select(page).locator('[data-card]')).toHaveCount(8);
    await expect(select(page).locator('[data-card] svg')).toHaveCount(0);
    await arrived(page);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    // And each of the five can be made out. In one row they were 33 pixels across on a phone held sideways, and
    // on one held upright each was a picture about 47 pixels across in a box of 62: so they stand in two rows of
    // three wherever that makes them larger (an upright phone tall enough for two rows; a sideways one that is
    // not so flat that they are given the width instead).
    const screen = page.viewportSize() ?? { width: 0, height: 0 };
    const twoRowsUpright = screen.width < 600 && screen.height >= 700;
    expect(await smallestShown(page)).toBeGreaterThanOrEqual(twoRowsUpright ? 70 : 56);
    await press(page.getByRole('button', { name: 'Ready' }));
    for (const card of await select(page).locator('[data-card]').all()) {
      const box = await card.boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }
    await playToTheEnd(page, press);
    const answers = await stored(page);
    // Nothing was asked about last time: there was no last time. And the last thing asked was what to keep.
    expect(answers.some((each) => each.challengeId.includes('.back-'))).toBe(false);
    expect(answers.at(-1)?.skillId).toBe('memory.delayed.keep-three');
    expect(answers.at(-1)?.challengeId).toContain('.keep-');
  });

  test('begins the next sitting, after the page has been loaded again, by asking for what was kept @layout', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    const kept = await sitting(page, press);
    // A quarter of an hour on, and the page loaded afresh: nothing is left of the first sitting but what is stored.
    await page.clock.fastForward(TEN_MINUTES + 5 * 60 * 1000);
    await page.reload();
    await page.goto(play('mf-later-01'));
    const back = kept.replace('.keep-', '.back-');
    await expect(lesson(page)).toHaveAttribute('data-challenge', `${back}-same-day`);
    // The first thing on the screen, before anything is shown: the leaf, the sign for last time, and six cards.
    expect(await stepNumber(page)).toBe(1);
    await expect(select(page)).toHaveAttribute('data-recalled', 'last-time');
    await expect(page.getByTestId('recalled')).toContainText(
      'Think back to the last time you played this',
    );
    await expect(caption(page)).toHaveText('Think back to last time. Which three did you keep?');
    await expect(page.getByRole('button', { name: 'Ready' })).toHaveCount(0);
    await expect(select(page).locator('[data-card]')).toHaveCount(6);
    await arrived(page);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    for (const card of await select(page).locator('[data-card]').all()) {
      const box = await card.boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }
    // What is right is what the first sitting kept, which only the pack and the store know.
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. You kept them.');
    expect((await stored(page)).at(-1)).toMatchObject({
      challengeId: `${back}-same-day`,
      skillId: 'memory.delayed.same-day',
      assistance: 'none',
      outcome: 'correct',
    });
    // And then the activity goes on as it always does, with Glim showing first.
    await press(next(page));
    await expect(myTurn(page)).toBeVisible();
  });

  test('asks under another skill when a night has gone by, and not at all a moment later', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    const kept = await sitting(page, press);
    // At once: Glim shows first, as at a first sitting.
    await page.goto(play('mf-later-01'));
    await expect(myTurn(page)).toBeVisible();
    expect(await stepNumber(page)).toBe(1);
    expect((await challengeOnScreen(page)).id).toBe('mf-later-01.demo');
    // That sitting is left unfinished, and stays the one that is taken up: so it is finished, and a day goes by.
    await playToTheEnd(page, press);
    const second = (await stored(page)).findLast((each) => each.challengeId.includes('.keep-'));
    expect(second?.challengeId).not.toBe(kept);
    await page.clock.fastForward(DAY);
    await page.reload();
    await page.goto(play('mf-later-01'));
    await expect(lesson(page)).toHaveAttribute(
      'data-challenge',
      `${second?.challengeId.replace('.keep-', '.back-') ?? ''}-later-day`,
    );
    await answer(page, press);
    expect((await stored(page)).at(-1)?.skillId).toBe('memory.delayed.another-day');
  });
});

// Two screens that no project is: what Safari leaves a page on an iPhone 13 held sideways, and the narrowest
// phone held sideways. Things to remember have a narrow column to themselves on the first (four in one row
// were 39 pixels across there, measured on the live site; five in two columns were 48 high) and the width on
// the second.
for (const [screen, width, height, least] of [
  ['an iPhone 13 held sideways, in Safari (750 by 342)', 750, 342, 56],
  ['the narrowest phone held sideways (640 by 256)', 640, 256, 46],
] as const) {
  test.describe(`things to remember, on ${screen}`, () => {
    test.use({ viewport: { width, height } });

    for (const [lesson, count] of [
      ['mf-groups-01', 4],
      ['mf-later-01', 5],
    ] as const) {
      test(`${String(count)} of them are each large enough to make out (${lesson})`, async ({
        page,
        press,
      }, testInfo) => {
        test.skip(testInfo.project.name !== 'phone', 'measured once, as a touch phone');
        await page.goto(play(lesson));
        await press(myTurn(page));
        const shown = page
          .getByTestId('select-board')
          .locator('[class*="study"] svg[data-picture]');
        await expect(shown).toHaveCount(count);
        await arrived(page);
        const sides = await shown.evaluateAll((list) =>
          list.map((each) => {
            const box = each.getBoundingClientRect();
            return Math.round(Math.min(box.width, box.height));
          }),
        );
        expect(Math.min(...sides)).toBeGreaterThanOrEqual(least);
        const fit = await screenFit(page);
        expect(fit.sideways).toEqual([]);
        expect(fit.taller).toBe(0);
      });
    }
  });
}
