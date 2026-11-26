import {
  LESSON_PATH,
  choose,
  expect,
  finishCorrectly,
  finished,
  holdClock,
  howTo,
  lessonSkill,
  listenIn,
  myTurn,
  next,
  openGrownUps,
  passHowTo,
  test,
  type Locator,
  type Page,
} from './fixtures';
import { answer } from './play';

/**
 * Help that is not help with the question.
 *
 * A child who taps the picture that is being asked about has not got anything wrong: they do not know what to
 * press. After three such taps the lesson shows what can be pressed. That gives no answer away, costs nothing and
 * is written down nowhere.
 *
 * And a grown-up who sits down to help says so, by holding a switch: what is answered then is written down as
 * answered with help, and is never counted as something the child did alone.
 */

const lesson = (page: Page) => page.getByTestId('lesson');
const prompt = (page: Page) => lesson(page).locator('[data-same]').first();
const choices = (page: Page) => lesson(page).locator('[data-choice]');
const caption = (page: Page) => lesson(page).getByRole('status').last();
const pauseButton = (page: Page) => lesson(page).getByRole('button', { name: /^Pause/ });
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Paused' });
const helpingSwitch = (page: Page) =>
  page.getByRole('button', { name: 'A grown-up is helping', exact: true });

/**
 * What is being pointed out at this moment, asked once. A nudge goes away by itself after a few seconds, so
 * "there is none" must not be waited for: a test that waits will see it go, and take that for its never having
 * come. (One did, and passed with one tap made enough to bring it.)
 */
async function nudgeNow(page: Page): Promise<string | null> {
  // What a tap changes is in the page by the next frame.
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => done(null))));
  return lesson(page).getAttribute('data-nudge');
}

/**
 * Have the page keep a note of every press it is given: when, on what, and whether inside the lesson. Once in
 * CI, in Safari's engine, three taps on the picture brought no nudge, and at the next attempt they did (run
 * 48). It could not be made to happen here, in Chromium, at any moment after the activity appears or with the
 * processor slowed six times. So the next time it happens, the test says what the page saw.
 */
async function notePresses(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { pressesSeen: string[] }).pressesSeen = seen;
    document.addEventListener(
      'pointerdown',
      (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const lesson = document.querySelector('[data-testid="lesson"]');
        const inside = lesson !== null && target !== null && lesson.contains(target);
        const what =
          target?.closest('button, a[href]')?.getAttribute('aria-label') ?? target?.tagName ?? '?';
        seen.push(
          `${String(Math.round(performance.now()))} ms: ${what}, ${inside ? 'in' : 'outside'} the lesson`,
        );
      },
      true,
    );
  });
}

/** The presses the page has been given since it opened, as `notePresses` noted them. */
async function pressesSeen(page: Page): Promise<string> {
  const seen = await page.evaluate(
    () => (window as unknown as { pressesSeen?: string[] }).pressesSeen ?? [],
  );
  return `the page was given ${String(seen.length)} presses: ${seen.join('; ')}`;
}

/** Put a finger on the middle of something that is not a button: the picture a question is about. */
async function tapOn(page: Page, target: Locator, hasTouch: boolean, times = 1) {
  const box = await target.boundingBox();
  if (!box) throw new Error('That is not on the screen.');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  for (let count = 0; count < times; count++) {
    await (hasTouch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
  }
}

/** Which of these wear the ring that points a thing out. */
const ringed = (targets: Locator) =>
  targets.evaluateAll((all) =>
    all.map((each) => {
      const style = getComputedStyle(each);
      return style.outlineStyle === 'solid' && parseFloat(style.outlineWidth) >= 4;
    }),
  );

/** Hold a switch down until it changes, as a grown-up does. (A busy machine can take longer than the hold.) */
async function holdUntil(page: Page, target: Locator, pressed: boolean) {
  const box = await target.boundingBox();
  if (!box) throw new Error('The switch is not on the screen.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(target).toHaveAttribute('aria-pressed', String(pressed), { timeout: 30_000 });
  await page.mouse.up();
}

test.describe('taps that land on nothing', () => {
  test('are answered by showing what can be tapped: never an answer, and at no cost', async ({
    page,
    press,
    hasTouch,
  }) => {
    test.setTimeout(120_000);
    const said = await listenIn(page);
    await notePresses(page);
    await page.goto(LESSON_PATH);
    await expect(myTurn(page)).toBeVisible();
    expect(await nudgeNow(page)).toBeNull();

    // While Glim is showing: two taps on the picture are only looking; the third is not knowing what to press.
    await tapOn(page, prompt(page), hasTouch, 2);
    expect(await nudgeNow(page)).toBeNull();
    await tapOn(page, prompt(page), hasTouch);
    await expect(lesson(page), await pressesSeen(page)).toHaveAttribute('data-nudge', 'my-turn');
    // The way on wears a ring, and the words are where Glim's are: on top of nothing that is pointed at.
    expect(await ringed(myTurn(page))).toEqual([true]);
    expect(await ringed(choices(page))).not.toContain(true);
    await expect(caption(page)).toHaveText('Tap the arrow, and then it is your turn.');
    await expect(caption(page)).toHaveAttribute('data-tone', 'nudge');
    // Pressing something ends it at once.
    await press(myTurn(page));
    expect(await nudgeNow(page)).toBeNull();

    // A question: everything there is to answer with is pointed out alike. The right one is not picked out.
    await expect(choices(page).first()).toHaveAttribute('aria-disabled', 'false', {
      timeout: 20_000,
    });
    await tapOn(page, prompt(page), hasTouch, 3);
    await expect(lesson(page)).toHaveAttribute('data-nudge', 'answers');
    await expect(caption(page)).toHaveText('Tap one of these.');
    const rings = await ringed(choices(page));
    expect(rings.length).toBeGreaterThan(1);
    expect(rings).toEqual(rings.map(() => true));
    // Neither the picture nor the bar is, and nothing has been set aside or lit.
    expect(await ringed(lesson(page).getByRole('button', { name: 'Help' }))).toEqual([false]);
    await expect(choices(page).and(lesson(page).locator('[data-state="open"]'))).toHaveCount(
      rings.length,
    );

    // It is said as well, once nothing else is being said: asked for again until the question has been put.
    await expect(async () => {
      await tapOn(page, prompt(page), hasTouch, 3);
      expect(await said()).toContain('help.answers');
    }).toPass({ timeout: 30_000 });

    // It is said once, however often it is asked for: it does not nag. (Asked for again only when the first
    // saying is well over, since a line is kept back while anything is being said; and then given the time a
    // second saying would take to begin. Nothing can be waited *for* here: it is something not happening.)
    await page.waitForTimeout(2500);
    await tapOn(page, prompt(page), hasTouch, 3);
    await expect(lesson(page)).toHaveAttribute('data-nudge', 'answers');
    await page.waitForTimeout(1500);
    expect((await said()).filter((line) => line === 'help.answers')).toHaveLength(1);

    // An answer ends it at once, and is still a first try with no help: the nudge was not a hint.
    await choose(page, press, true);
    expect(await nudgeNow(page)).toBeNull();
    await expect(caption(page)).toHaveText('Yes. The same amount.');

    // After a right answer the way on is the arrow, and that is what is pointed out.
    await tapOn(page, prompt(page), hasTouch, 3);
    await expect(lesson(page)).toHaveAttribute('data-nudge', 'next');
    expect(await ringed(next(page))).toEqual([true]);
    await press(next(page));

    // Played to its end, the record is what it would have been: every check done alone, at the first try.
    await finishCorrectly(page, press);
    await expect(finished(page)).toContainText('3 of 3 right at the first try, with no help.');
    await openGrownUps(page);
    await expect(lessonSkill(page)).toContainText('3 independent successes');
    await expect(lessonSkill(page)).not.toContainText('after a hint, another try or help');
  });

  test('do not leave anything on the screen for long, and do not count across a pause in the tapping', async ({
    page,
    press,
    hasTouch,
  }) => {
    await page.clock.install();
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    await expect(choices(page).first()).toHaveAttribute('aria-disabled', 'false', {
      timeout: 20_000,
    });
    await holdClock(page);

    // Two taps, a long look, and one more: that is not three in a row.
    await tapOn(page, prompt(page), hasTouch, 2);
    await page.clock.runFor(9000);
    await tapOn(page, prompt(page), hasTouch);
    await expect(lesson(page)).not.toHaveAttribute('data-nudge');

    await tapOn(page, prompt(page), hasTouch, 2);
    await expect(lesson(page)).toHaveAttribute('data-nudge', 'answers');
    // A few seconds, and it is gone; the question is back where the words were.
    await page.clock.runFor(4000);
    await expect(lesson(page)).toHaveAttribute('data-nudge', 'answers');
    await page.clock.runFor(2000);
    await expect(lesson(page)).not.toHaveAttribute('data-nudge');
    await expect(caption(page)).toHaveText('Which group has the same amount?');
    await page.clock.resume();
  });

  test('while something is still being shown, say to watch', async ({ page, press, hasTouch }) => {
    await page.clock.install();
    // An amount to be taken in at a glance: until it has been looked at, the choices are turned away.
    await page.goto('/world/number-garden/play/ng-glance-01');
    await expect(myTurn(page)).toBeVisible();
    await holdClock(page);
    await press(myTurn(page));
    await expect(choices(page).first()).toHaveAttribute('aria-disabled', 'true');
    await expect(lesson(page).locator('[data-choice][aria-disabled="false"]')).toHaveCount(0);
    await tapOn(page, choices(page).first(), hasTouch, 3);
    await expect(lesson(page)).toHaveAttribute('data-nudge', 'wait');
    await expect(caption(page)).toHaveText('Watch and listen first.');
    expect(await ringed(choices(page))).not.toContain(true);
    await page.clock.resume();
  });

  test('a thing that is finished and not handed in has its tick pointed out, once', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    const said = await listenIn(page);
    await page.goto('/world/number-garden/play/ng-give-01');
    await press(myTurn(page));
    const pile = page.getByRole('button', { name: /^Give one/ });
    const given = page.getByRole('button', { name: /Take one back/ });
    const tick = lesson(page).getByRole('button', { name: 'Done' });
    await expect(pile).toBeEnabled({ timeout: 20_000 });
    // Enough have been given for the tick to be ready; whether it is the right number is not the point here.
    await press(pile);
    await expect(given).toHaveAttribute('data-given', '1');
    await expect(tick).toHaveAttribute('data-ready', 'true');
    await holdClock(page);

    await page.clock.runFor(6000);
    await expect(lesson(page)).not.toHaveAttribute('data-nudge');
    await page.clock.runFor(3500);
    await expect(lesson(page)).toHaveAttribute('data-nudge', 'done');
    expect(await ringed(tick)).toEqual([true]);
    await expect(caption(page)).toHaveText('Have you finished? Tap the tick.');
    // It goes, and does not come back for the same thing: a child who is thinking is left to think.
    await page.clock.runFor(6000);
    await expect(lesson(page)).not.toHaveAttribute('data-nudge');
    await page.clock.runFor(30_000);
    await expect(lesson(page)).not.toHaveAttribute('data-nudge');
    await page.clock.resume();
    await expect
      .poll(async () => (await said()).filter((line) => line === 'help.done').length)
      .toBeLessThanOrEqual(1);
  });
});

test.describe('a grown-up is helping', () => {
  test('is said by holding a switch, lasts the visit, and keeps what is answered from counting as done alone', async ({
    page,
    press,
  }) => {
    test.setTimeout(120_000);
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    await expect(lesson(page)).not.toHaveAttribute('data-helping');
    await press(pauseButton(page));
    await expect(sheet(page)).toBeVisible();
    await expect(helpingSwitch(page)).toHaveAttribute('aria-pressed', 'false');

    // A tap does nothing to it: it is a grown-up's to set.
    await press(helpingSwitch(page));
    await press(helpingSwitch(page));
    await expect(helpingSwitch(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(sheet(page).getByText(/not counted as done alone/)).toHaveCount(0);

    await holdUntil(page, helpingSwitch(page), true);
    await expect(sheet(page).getByText(/not counted as done alone/)).toBeVisible();
    await press(sheet(page).getByRole('button', { name: 'Carry on' }));
    // The activity says that it is on, on the button that leads to where it is switched off.
    await expect(lesson(page)).toHaveAttribute('data-helping', 'true');
    await expect(pauseButton(page)).toHaveAccessibleName('Pause. A grown-up is helping');

    // Every answer right, at the first try: and none of it counted as the child's own.
    await finishCorrectly(page, press);
    await expect(finished(page)).toContainText(/For grown-ups: 0 of \d right at the first try/);
    await openGrownUps(page);
    await expect(lessonSkill(page)).toContainText('No independent success yet.');
    await expect(lessonSkill(page)).toContainText(/\d right after a hint, another try or help\./);
    await expect(lessonSkill(page)).not.toHaveAttribute('data-status', /independent/);

    // The grown-ups' area shows the same switch, as a tick box, and it is still on in another activity.
    const box = page.getByRole('checkbox', { name: /I am helping today/ });
    await expect(box).toBeChecked();
    await page.goto(LESSON_PATH);
    await expect(lesson(page)).toHaveAttribute('data-helping', 'true');
    // Switched off there, it is off here.
    await openGrownUps(page);
    await box.uncheck();
    await page.goto(LESSON_PATH);
    await expect(myTurn(page)).toBeVisible();
    await expect(lesson(page)).not.toHaveAttribute('data-helping');
    await expect(pauseButton(page)).toHaveAccessibleName('Pause');
  });

  test('is off again at the next visit, and is held to switch off as well as on', async ({
    page,
    press,
  }) => {
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    await press(pauseButton(page));
    await holdUntil(page, helpingSwitch(page), true);
    // A small finger does not undo it.
    await press(helpingSwitch(page));
    await expect(helpingSwitch(page)).toHaveAttribute('aria-pressed', 'true');
    await holdUntil(page, helpingSwitch(page), false);
    await holdUntil(page, helpingSwitch(page), true);
    await press(sheet(page).getByRole('button', { name: 'Carry on' }));
    await expect(lesson(page)).toHaveAttribute('data-helping', 'true');

    // Loaded again in the same visit: still on. A new visit: off.
    await page.reload();
    await expect(lesson(page)).toHaveAttribute('data-helping', 'true');
    await page.evaluate(() => window.sessionStorage.clear());
    await page.reload();
    await expect(choices(page).first()).toBeVisible();
    await expect(lesson(page)).not.toHaveAttribute('data-helping');
    await expect(pauseButton(page)).toHaveAccessibleName('Pause');
  });

  test('answers given before and after it was on are still the child’s own', async ({
    page,
    press,
  }) => {
    test.setTimeout(120_000);
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    // The two steps with Glim, alone.
    for (let step = 0; step < 2; step++) {
      await answer(page, press);
      await press(next(page));
    }
    // One check with a grown-up's help…
    await press(pauseButton(page));
    await holdUntil(page, helpingSwitch(page), true);
    await press(sheet(page).getByRole('button', { name: 'Carry on' }));
    await answer(page, press);
    await press(next(page));
    // …and the rest alone again.
    await press(pauseButton(page));
    await holdUntil(page, helpingSwitch(page), false);
    await press(sheet(page).getByRole('button', { name: 'Carry on' }));
    await finishCorrectly(page, press);
    await openGrownUps(page);
    await expect(lessonSkill(page)).toContainText(/[23] independent successes/);
    await expect(lessonSkill(page)).toContainText('1 right after a hint, another try or help.');
  });
});

test.describe('a grown-up who is there from the start', () => {
  test.use({ frontDoor: true });

  test('can say so on "how to play", and it is on in the first activity', async ({
    page,
    press,
  }) => {
    await page.goto('/');
    await press(page.getByTestId('front-door').locator('button[data-avatar="sun"]'));
    await expect(howTo(page)).toBeVisible();
    await expect(howTo(page)).not.toHaveAttribute('data-helping');
    await press(helpingSwitch(page));
    await expect(helpingSwitch(page)).toHaveAttribute('aria-pressed', 'false');
    await holdUntil(page, helpingSwitch(page), true);
    await expect(howTo(page)).toHaveAttribute('data-helping', 'true');
    await passHowTo(page, press);
    await page.goto(LESSON_PATH);
    await expect(lesson(page)).toHaveAttribute('data-helping', 'true');
    await expect(pauseButton(page)).toHaveAccessibleName('Pause. A grown-up is helping');
  });
});
