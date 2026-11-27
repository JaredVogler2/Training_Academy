import { PAIRS_PAR } from '../src/storage';
import { lessonsOf, worldById } from '../src/game/worlds';
import {
  LESSON_PATH,
  choose,
  expect,
  finishCorrectly,
  finished,
  myTurn,
  next,
  openGrownUps,
  screenFit,
  test,
  worldSettled,
  type Page,
} from './fixtures';
import { answer } from './play';

/**
 * What the game offers next, and when it stops offering.
 *
 * The big Play button, and Glim's hand on the map, go where the engine says (`src/engine/recommend.ts`): to
 * something new, or back to something played before when it is time. The time is the day on the device, so the
 * page's clock is the test's here, and is moved on by days. A grown-up can read why; and can set how long a
 * sitting is, after which nothing more is offered.
 */

const garden = worldById('number-garden');
const [FIRST = '', SECOND = ''] = lessonsOf(garden);
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const MORNING = new Date('2026-11-02T10:00:00');

const playLink = (page: Page) => page.getByRole('link', { name: 'Play', exact: true });
const offered = (page: Page) => page.locator('section[data-offered]');
const card = (page: Page, lesson: string) => page.locator(`a[data-lesson="${lesson}"]`);
const pointedAt = (page: Page) => page.locator('a[data-world][data-next="true"]');

interface StoredAnswer {
  challengeId: string;
  response: string;
  stage: string;
  outcome: string;
  durationMs: number;
  seq: number;
  clean?: boolean;
}

/** Every answer the game has written down, as it is stored, in the order it was given. */
async function answersStored(page: Page): Promise<StoredAnswer[]> {
  const all = await page.evaluate(
    () =>
      new Promise<unknown[]>((resolve, reject) => {
        const opening = indexedDB.open('training-academy');
        opening.onerror = () => reject(new Error('The store could not be opened.'));
        opening.onsuccess = () => {
          const reading = opening.result.transaction('attempts').objectStore('attempts').getAll();
          reading.onerror = () => reject(new Error('The answers could not be read.'));
          reading.onsuccess = () => {
            resolve(reading.result as unknown[]);
            opening.result.close();
          };
        };
      }),
  );
  return (all as (StoredAnswer & { at: number })[]).sort((a, b) => a.at - b.at || a.seq - b.seq);
}

test.describe('what Play offers next', () => {
  test('goes on to something new on the day an activity is finished, comes back to it two days later, and a grown-up can read why @layout', async ({
    page,
    press,
  }) => {
    await page.clock.install({ time: MORNING });
    await page.goto(LESSON_PATH);
    await finishCorrectly(page, press);
    await expect(finished(page)).toBeVisible();

    // The same day: what was played is not offered again; the next activity is, as something new.
    await page.goto('/world/number-garden');
    await worldSettled(page);
    await expect(offered(page)).toHaveAttribute('data-offered', 'new');
    await expect(playLink(page)).toHaveAttribute('href', `/world/number-garden/play/${SECOND}`);
    await expect(card(page, SECOND)).toHaveAttribute('data-next', 'true');
    await expect(card(page, FIRST)).toHaveAttribute('data-next', 'false');
    await expect(card(page, FIRST)).toHaveAttribute('data-done', 'true');

    // Two days on, by the device's calendar: it is time to come back to it, and the page says so.
    await page.clock.fastForward(2 * DAY);
    await page.reload();
    await worldSettled(page);
    await expect(offered(page)).toHaveAttribute('data-offered', 'practice');
    await expect(playLink(page)).toHaveAttribute('href', LESSON_PATH);
    await expect(offered(page)).toContainText('played before, and time to come back to it');
    await expect(card(page, FIRST)).toHaveAttribute('data-next', 'true');
    await expect(card(page, SECOND)).toHaveAttribute('data-next', 'false');
    // Every activity is still there, and nothing has been closed or hidden.
    await expect(page.locator('a[data-lesson]')).toHaveCount(lessonsOf(garden).length);
    expect((await screenFit(page)).sideways).toEqual([]);

    // On the map, Glim points at the garden: of everything there is, that is the one thing to do next.
    await page.goto('/');
    await expect(pointedAt(page)).toHaveCount(1);
    await expect(pointedAt(page)).toHaveAttribute('data-world', 'number-garden');

    // And a grown-up can read which activity, and every reason for it, with the skill by its name.
    await openGrownUps(page);
    const why = page.getByTestId('next-up');
    await expect(why).toHaveAttribute('data-settled', 'true');
    await expect(why.getByTestId('next-top')).toHaveAttribute('data-world', 'number-garden');
    const row = why.locator('[data-testid="next-offer"][data-world="number-garden"]');
    await expect(row).toHaveAttribute('data-lesson', FIRST);
    await expect(row).toHaveAttribute('data-kind', 'practice');
    await expect(row).toContainText('More practice of something done before');
    await expect(row).toContainText(
      '“Match small groups by amount” has been done without help several times, close together. It was last practised 2 days ago; coming back after 2 days is what shows whether it has lasted.',
    );
    await expect(row.locator('[data-why="mix"]')).toContainText(
      'the game aims for about 7 in 10 to be ones played before',
    );
    await expect(why).not.toContainText('math.quantity');
    // The other worlds are there too, each with its first activity as something new.
    await expect(why.locator('[data-testid="next-offer"][data-kind="new"]')).toHaveCount(6);
    expect((await screenFit(page)).sideways).toEqual([]);
  });

  test('says of someone who has played nothing that each world begins at its beginning', async ({
    page,
  }) => {
    await page.goto('/world/number-garden');
    await worldSettled(page);
    // Nobody is playing yet: the page goes by the plain order, and says so of itself.
    await expect(offered(page)).toHaveAttribute('data-offered', 'in-order');
    await expect(playLink(page)).toHaveAttribute('href', `/world/number-garden/play/${FIRST}`);
    await expect(card(page, FIRST)).toHaveAttribute('data-next', 'true');
  });
});

test.describe('a sitting of the length a grown-up chose', () => {
  test('when it has been played out, nothing more is offered: Glim rests, there is no big Play button, and every activity is still there @layout', async ({
    page,
    press,
  }) => {
    test.setTimeout(180_000);
    await page.clock.install({ time: MORNING });
    // A player, and a sitting of about ten minutes.
    await openGrownUps(page);
    await page.getByRole('button', { name: 'Add a player' }).click();
    await page.getByLabel('Nickname', { exact: true }).fill('Robin');
    await page.getByRole('radio', { name: 'Star' }).check({ force: true });
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    // The page behind the dialog takes nothing until the dialog has closed (CI's run 68: grownups.spec).
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    const begin = page.getByTestId('where-to-begin');
    await begin.getByLabel('A sitting lasts').selectOption({ label: 'About 10 minutes' });
    await expect(begin.locator('[role="status"]')).toHaveText('Saved.');

    // Nine minutes in an activity: the sitting is not over, and Play is still offered.
    await page.goto(LESSON_PATH);
    await expect(myTurn(page)).toBeVisible();
    await page.clock.runFor(9 * MINUTE);
    await page.goto('/world/number-garden');
    await worldSettled(page);
    await expect(playLink(page)).toBeVisible();
    await expect(page.getByTestId('world-rest')).toHaveCount(0);

    // Two minutes more, and the activity is finished: its end says that this is a good moment to stop.
    await page.goto(LESSON_PATH);
    await expect(myTurn(page)).toBeVisible();
    await page.clock.runFor(2 * MINUTE);
    await finishCorrectly(page, press);
    await expect(finished(page)).toHaveAttribute('data-rest', 'true');
    await expect(page.getByTestId('lesson-rest')).toContainText(
      'about 10 minutes have been played',
    );
    await expect(finished(page).getByTestId('guide')).toHaveAttribute('data-state', 'rest');
    // Nothing is closed: "Again" and the way home are both still there.
    await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Islands' })).toBeVisible();
    expect((await screenFit(page)).sideways).toEqual([]);

    // On the map Glim rests, and points at nothing.
    await page.goto('/');
    await expect(page.locator('[data-rest="true"]')).toBeVisible();
    await expect(page.locator('a[data-world]').first()).toBeVisible();
    await expect(pointedAt(page)).toHaveCount(0);
    await expect(page.getByTestId('guide')).toHaveAttribute('data-state', 'rest');

    // A world's page has Glim asleep where the big button was, and every activity where it always is.
    await page.goto('/world/number-garden');
    await worldSettled(page);
    await expect(page.getByTestId('world-rest')).toBeVisible();
    await expect(page.getByTestId('world-rest')).toContainText('About 10 minutes have been played');
    await expect(playLink(page)).toHaveCount(0);
    await expect(page.locator('a[data-lesson]')).toHaveCount(lessonsOf(garden).length);
    await expect(page.locator('a[data-lesson][data-next="true"]')).toHaveCount(0);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    // And any of them can still be played: nothing has been closed.
    await press(card(page, SECOND));
    await expect(page).toHaveURL(new RegExp(`/play/${SECOND}$`));
    await expect(myTurn(page)).toBeVisible();

    // Half an hour away from every activity, with the page simply left open: it is another sitting, and the
    // page says so by itself, with nothing pressed and nothing loaded again. Play is offered again.
    await page.goto('/world/number-garden');
    await worldSettled(page);
    await expect(page.getByTestId('world-rest')).toBeVisible();
    await page.clock.runFor(32 * MINUTE);
    await expect(page.getByTestId('world-rest')).toHaveCount(0);
    await expect(playLink(page)).toBeVisible();
    // And on the map, opened then, Glim is awake and pointing.
    await page.goto('/');
    await expect(pointedAt(page)).toHaveCount(1);
    await expect(page.locator('[data-rest="true"]')).toHaveCount(0);
  });

  test('with no length chosen, nothing rests however long is played', async ({ page }) => {
    await page.clock.install({ time: MORNING });
    await page.goto(LESSON_PATH);
    await expect(myTurn(page)).toBeVisible();
    await page.clock.runFor(45 * MINUTE);
    await page.goto('/world/number-garden');
    await worldSettled(page);
    await expect(playLink(page)).toBeVisible();
    await expect(page.getByTestId('world-rest')).toHaveCount(0);
    await page.goto('/');
    await expect(pointedAt(page)).toHaveCount(1);
    await expect(page.locator('[data-rest="true"]')).toHaveCount(0);
  });
});

test.describe('a game of pairs that took far more turns than remembering needs', () => {
  /** What is stored of the pairs that were found alone: how many turns each took, and whether it is marked. */
  async function gamesAlone(
    page: Page,
  ): Promise<{ challengeId: string; turns: number; clean: boolean; outcome: string }[]> {
    return (await answersStored(page))
      .filter((each) => each.stage === 'independent')
      .map((each) => ({
        challengeId: each.challengeId,
        turns: Number(each.response),
        clean: each.clean !== false,
        outcome: each.outcome,
      }));
  }

  /**
   * Turn over two cards that differ, again and again, as someone does who is not trying to remember. (Which two
   * differ is found by turning two; if they are a pair by luck they stay found, and the next two are tried.)
   */
  async function turnWithoutLooking(
    page: Page,
    press: (target: ReturnType<Page['locator']>) => Promise<void>,
    times: number,
  ): Promise<void> {
    const cards = page.getByTestId('pairs-board').locator('[data-place]');
    await cards.first().waitFor();
    const count = await cards.count();
    for (let place = 0; place + 1 < count; place += 2) {
      const [one, two] = [cards.nth(place), cards.nth(place + 1)];
      await press(one);
      await expect(one).not.toHaveAccessibleName('a card, face down');
      const first = await one.getAttribute('aria-label');
      await press(two);
      await expect(two).not.toHaveAccessibleName('a card, face down');
      const second = await two.getAttribute('aria-label');
      if (first === second) {
        await expect(one).toHaveAttribute('data-found', 'true');
        continue;
      }
      for (let turn = 1; turn < times; turn++) {
        // They are looked at for a moment and turn back; then the same two again.
        await expect(one).toHaveAccessibleName('a card, face down');
        await expect(two).toHaveAccessibleName('a card, face down');
        await press(one);
        await expect(one).not.toHaveAccessibleName('a card, face down');
        await press(two);
      }
      await expect(one).toHaveAccessibleName('a card, face down');
      await expect(two).toHaveAccessibleName('a card, face down');
      return;
    }
  }

  test('is written down as finished, and not as done alone: the activity’s own count and the grown-ups’ page say the same', async ({
    page,
    press,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'played to its end once, on the desktop project',
    );
    test.setTimeout(300_000);
    await page.goto('/world/memory-forest');
    await press(card(page, 'mf-pairs-01'));
    const lesson = page.getByTestId('lesson');
    for (let guard = 0; guard < 40; guard++) {
      await lesson.locator('[data-testid="lesson-finished"], button').first().waitFor();
      if (await finished(page).isVisible()) break;
      if (await myTurn(page).isVisible()) await press(myTurn(page));
      else if (await next(page).isVisible()) await press(next(page));
      else {
        // With the guide, the pairs are found as someone who remembers finds them. Alone, the same two cards are
        // turned over seven times first.
        if ((await lesson.getAttribute('data-stage')) === 'independent') {
          await turnWithoutLooking(page, press, 7);
        }
        await answer(page, press);
        await Promise.race([next(page).waitFor(), finished(page).waitFor()]);
      }
      await page.waitForTimeout(100);
    }
    await expect(finished(page)).toBeVisible();

    // What is stored: every board found alone, each right, and marked wherever it took more turns than its
    // board allows. (A board whose first two cards are a pair by luck, twice over, is finished in three turns
    // however carelessly: that one would be rightly unmarked, and is counted as it is.) The activity has three
    // boards to find alone, and brings one more where one of them was not found well: three or four in all.
    const games = await gamesAlone(page);
    expect(games.length).toBeGreaterThanOrEqual(3);
    expect(games.length).toBeLessThanOrEqual(4);
    expect(new Set(games.map((game) => game.challengeId)).size).toBe(games.length);
    for (const game of games) {
      expect(game.outcome, game.challengeId).toBe('correct');
      const par = PAIRS_PAR[game.challengeId] ?? 0;
      expect(par, game.challengeId).toBeGreaterThan(0);
      expect(game.clean, `${game.challengeId} in ${String(game.turns)} turns`).toBe(
        game.turns <= par,
      );
    }
    const alone = games.filter((game) => game.clean).length;
    expect(games.length - alone).toBeGreaterThanOrEqual(1);

    // The activity's own page counted them so before; it says the same now.
    await expect(finished(page)).toContainText(
      `${String(alone)} of ${String(games.length)} right at the first try, with no help`,
    );

    // And so does the grown-ups' page, which reads the record: it used to say "Independent so far" here.
    await openGrownUps(page);
    const row = page.locator('[data-testid="skill"][data-skill="memory.recognition.find-pairs"]');
    await expect(row).toBeVisible();
    await expect(row).not.toHaveAttribute('data-status', /independent/);
    await expect(row).toContainText(
      alone === 0
        ? 'No independent success yet.'
        : `${String(alone)} independent success${alone === 1 ? ' ' : 'es '}`,
    );
    await expect(row).toContainText(
      games.length - alone === 1
        ? '1 first try without help was not right.'
        : `${String(games.length - alone)} first tries without help were not right.`,
    );
  });
});

test.describe('how long an answer took', () => {
  test('is the time the question was in play: a pause of five minutes is no part of it', async ({
    page,
    press,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'read from what is stored once, on the desktop project',
    );
    await page.clock.install({ time: MORNING });
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    const lesson = page.getByTestId('lesson');
    await lesson.locator('[data-choice]').first().waitFor();
    // Three seconds with the question on the screen; then the activity is paused and left for five minutes.
    await page.clock.runFor(3000);
    await press(page.getByRole('button', { name: 'Pause' }));
    const sheet = page.getByRole('dialog', { name: 'Paused' });
    await expect(sheet).toBeVisible();
    await expect(lesson).toHaveAttribute('data-paused', 'true');
    await page.clock.runFor(5 * MINUTE);
    await press(sheet.getByRole('button', { name: 'Carry on' }));
    await expect(sheet).toBeHidden();
    await choose(page, press, true);
    await expect(next(page)).toBeVisible();

    const [first, ...others] = await answersStored(page);
    expect(others).toEqual([]);
    expect(first?.outcome).toBe('correct');
    // The three seconds are in it; the five minutes are not. (They used to be: an answer said it had taken
    // as long as the phone lay on the table, up to the ten minutes any answer may say.)
    expect(first?.durationMs).toBeGreaterThanOrEqual(3000);
    expect(first?.durationMs).toBeLessThan(MINUTE);
  });
});
