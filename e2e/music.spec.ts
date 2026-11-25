import AxeBuilder from '@axe-core/playwright';
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
 * The Music Lab: questions that are put by ear, a beat to tap, notes to play back and a tune to make.
 *
 * What is tried here is what the pictures and the sounds promise a child: that nothing can be answered before it
 * has been heard, that hearing it again is always to be had, that a drum tapped in time keeps the beat however the
 * tapping reaches the page (a finger, a mouse), and that every one of these can be done on a small screen.
 * Whether the notes sound right to an ear is not something a test can say: docs/QUALITY_REPORT.md says who has
 * listened.
 */

type Press = (target: Locator) => Promise<void>;

const lesson = (page: Page) => page.getByTestId('lesson');
const caption = (page: Page) => lesson(page).getByRole('status');
const done = (page: Page) => page.getByRole('button', { name: 'Done' });
const glim = (page: Page) => page.getByRole('button', { name: 'Show me again' });
const drum = (page: Page) => page.getByRole('button', { name: /^The drum/ });
const choices = (page: Page) => lesson(page).locator('[data-choice]');

/** Into an activity the way a child comes in: by a tap on its picture, which is also what wakes the sound. */
async function open(page: Page, press: Press, id: string): Promise<void> {
  await page.goto('/world/music-lab');
  await press(page.locator(`[data-lesson="${id}"]`));
  await expect(lesson(page)).toBeVisible();
  await expect(myTurn(page)).toBeVisible();
}

/** Past every demonstration, to the first step that is the child's own. */
async function pastTheShowing(page: Page, press: Press): Promise<void> {
  for (let shown = 0; shown < 4 && (await myTurn(page).isVisible()); shown++) {
    const step = (await lesson(page).getAttribute('data-challenge')) ?? '';
    await press(myTurn(page));
    await expect(lesson(page)).not.toHaveAttribute('data-challenge', step);
  }
  await expect(lesson(page)).not.toHaveAttribute('data-stage', 'demo');
}

/** Who is being played at this moment, and whether anything can be answered yet. */
async function hearing(page: Page): Promise<string> {
  return choices(page).evaluateAll((list) => {
    const named = list.find((choice) => choice.getAttribute('data-named') === 'true');
    const open = list.some((choice) => choice.getAttribute('aria-disabled') !== 'true');
    return `${named?.getAttribute('data-choice') ?? 'nobody'} sings, ${open ? 'open' : 'waiting'}`;
  });
}

test.describe('the Music Lab: high and low', () => {
  const ID = 'ml-high-low-01';

  test('can be answered only when the last of it has been heard', async ({ page, press }) => {
    // With the clock held, "after the first note" is a place to stand, not a moment to catch.
    await page.clock.install();
    await open(page, press, ID);
    await pastTheShowing(page, press);
    await holdClock(page);
    await press(glim(page));
    const order = await choices(page).evaluateAll((list) =>
      list.map((choice) => choice.getAttribute('data-choice') ?? ''),
    );
    expect(order).toHaveLength(2);
    const [first, second] = order;

    // Each is lifted while it plays, in the order they stand, and until both have played nothing is open.
    const heard = await watchFor(page, 9000, () => hearing(page), 60);
    expect(heard).toEqual([
      'nobody sings, waiting',
      `${first ?? ''} sings, waiting`,
      'nobody sings, waiting',
      `${second ?? ''} sings, waiting`,
      'nobody sings, open',
    ]);
  });

  test('takes no tap in the middle of the question, and plays it all again for the asking', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    await open(page, press, ID);
    await pastTheShowing(page, press);
    await holdClock(page);
    await press(glim(page));
    const step = await lesson(page).getAttribute('data-challenge');
    // Move on until the first one is singing, and tap it then: a guess at a question half put.
    for (let moved = 0; moved < 150 && (await hearing(page)).startsWith('nobody'); moved++) {
      await page.clock.runFor(60);
    }
    const singing = lesson(page).locator('[data-choice][data-named="true"]');
    await expect(singing).toHaveCount(1);
    // (Tapped where it is on the screen, as a finger would: asking the test tool to press a thing that is
    // waiting would have it wait too.)
    const box = await singing.boundingBox();
    if (!box) throw new Error('The one that is singing is not on screen.');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.clock.runFor(300);
    // Nothing was taken for an answer: no choice is set aside, nothing is said about it, the step is the same.
    await expect(lesson(page)).toHaveAttribute('data-challenge', step ?? '');
    await expect(lesson(page).locator('[data-state="away"], [data-state="same"]')).toHaveCount(0);
    await expect(next(page)).toHaveCount(0);

    // Heard through, Glim plays the whole of it again, as often as asked: hearing is the question, not help.
    await watchFor(page, 9000, () => hearing(page), 60);
    expect(await hearing(page)).toBe('nobody sings, open');
    for (let asking = 0; asking < 2; asking++) {
      await press(glim(page));
      const again = await watchFor(page, 9000, () => hearing(page), 60);
      expect(again.filter((state) => !state.startsWith('nobody'))).toHaveLength(2);
      expect(again.at(-1)).toBe('nobody sings, open');
    }
    // And asking has cost nothing: help is still there to be asked for, untouched.
    await expect(page.getByRole('button', { name: 'Help me' })).toBeEnabled();
  });

  test('says of a wrong answer only that it was not the one, plays it again, and shows which was', async ({
    page,
    press,
  }) => {
    await open(page, press, ID);
    await pastTheShowing(page, press);
    const asked = await challengeOnScreen(page);
    if (asked.kind !== 'choose-one') throw new Error('High and low asks with choices.');
    await answer(page, press, false);
    await expect(caption(page)).toHaveText('Not that one. Listen again.');
    // The one that was tried is set aside; the one that is left is played again and pointed to.
    const right = lesson(page).locator(`[data-choice="${asked.answer}"]`);
    await expect(right).toHaveAttribute('data-state', 'same');
    await expect(right).toHaveAttribute('aria-disabled', 'false', { timeout: 15_000 });
    await press(right);
    await expect(next(page)).toBeVisible();
    await expect(caption(page)).toHaveText(/^Yes\. That one is (high|low)\.$/);
  });

  test('waits for the sound to be switched on, where it is off: it cannot be played by eye', async ({
    page,
    press,
  }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ version: 1, sound: false, motion: 'system', graphics: 'pictures' }),
      );
    }, SETTINGS_KEY);
    await page.goto('/world/music-lab');
    await press(page.locator(`[data-lesson="${ID}"]`));
    const gate = page.getByTestId('lesson-needs-sound');
    await expect(gate).toBeVisible();
    await expect(choices(page)).toHaveCount(0);
    await press(page.getByRole('button', { name: 'Turn the sound on' }));
    await expect(gate).toHaveCount(0);
    await expect(choices(page)).toHaveCount(2);
  });
});

test.describe('the Music Lab: the same, or different?', () => {
  test('lifts each of the two in its own turn, and offers the two signs when both have been heard', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    await open(page, press, 'ml-same-01');
    await pastTheShowing(page, press);
    await holdClock(page);
    await press(glim(page));
    const state = async () => {
      const playing = await lesson(page)
        .locator('[data-part][data-sounding="true"]')
        .evaluateAll((list) => list.map((one) => one.getAttribute('data-part')).join('+'));
      const open = await choices(page).evaluateAll((list) =>
        list.some((choice) => choice.getAttribute('aria-disabled') !== 'true'),
      );
      return `${playing === '' ? 'neither' : `number ${playing}`} plays, ${open ? 'open' : 'waiting'}`;
    };
    expect(await watchFor(page, 12_000, state, 60)).toEqual([
      'neither plays, waiting',
      'number 0 plays, waiting',
      'neither plays, waiting',
      'number 1 plays, waiting',
      'neither plays, open',
    ]);
    await expect(choices(page)).toHaveCount(2);
    await expect(lesson(page).locator('[data-sign="same"]')).toHaveCount(1);
    await expect(lesson(page).locator('[data-sign="different"]')).toHaveCount(1);
  });
});

test.describe('the Music Lab: tapping with the beat', () => {
  const ID = 'ml-beat-01';
  /** The beats there are lights for, in order: what each is for, and whether it is lit as one that was met. */
  const lights = (page: Page) =>
    lesson(page)
      .locator('[data-beat]')
      .evaluateAll((list) =>
        list.map(
          (light) =>
            `${light.getAttribute('data-kind') ?? ''}:${light.getAttribute('data-met') === 'true' ? 'met' : '-'}`,
        ),
      );

  test('is kept by tapping the drum in time with the lights, by touch or with a mouse', async ({
    page,
    press,
  }) => {
    await open(page, press, ID);
    await pastTheShowing(page, press);
    // Four small lights to listen to, then one for each beat to tap.
    const asked = await challengeOnScreen(page);
    if (asked.kind !== 'make' || asked.task.type !== 'beat')
      throw new Error('A beat was expected.');
    const { lead, beats, need } = asked.task;
    expect(await lights(page)).toEqual([
      ...Array.from({ length: lead }, () => 'listen:-'),
      ...Array.from({ length: beats }, () => 'tap:-'),
    ]);

    await answer(page, press);
    await expect(next(page)).toBeVisible({ timeout: 20_000 });
    await expect(caption(page)).toHaveText('Yes. You kept the beat.');
    const met = (await lights(page)).filter((light) => light === 'tap:met').length;
    expect(met).toBeGreaterThanOrEqual(need);
  });

  test('left alone it is not kept, nothing is marked as wrong, and it comes round again', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    await open(page, press, ID);
    await pastTheShowing(page, press);
    await holdClock(page);
    await press(glim(page));
    const going = () =>
      lesson(page)
        .locator('[data-beat][data-now="true"]')
        .evaluateAll((list) => list.map((light) => light.getAttribute('data-beat')).join());

    // The beat goes by, light by light, with nobody tapping.
    const seen = await watchFor(page, 16_000, going, 100);
    expect(seen.slice(0, 11)).toEqual(['', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    await expect(caption(page)).toHaveText('Not quite with the beat. Listen, and try again.');
    // No light says "wrong": the ones that were met would be lit, and none was. Nothing on the page marks a beat
    // as missed, early or late, to the eye or to any tool.
    await expect(lesson(page).locator('[data-judged="true"]')).toHaveCount(1);
    expect((await lights(page)).filter((light) => !light.endsWith(':-'))).toEqual([]);
    expect(
      await lesson(page)
        .locator('[data-beat]')
        .first()
        .evaluate((light) => light.parentElement?.innerHTML ?? ''),
    ).not.toMatch(/miss|early|late/);
    await expect(next(page)).toHaveCount(0);
    // And after the words it starts again from the first beat.
    const again = await watchFor(page, 9000, going, 100);
    expect(again).toContain('0');
  });

  test('does not count a steady lateness against the child: every tap a third of a beat late keeps the beat', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    await open(page, press, ID);
    await pastTheShowing(page, press);
    const asked = await challengeOnScreen(page);
    if (asked.kind !== 'make' || asked.task.type !== 'beat')
      throw new Error('A beat was expected.');
    const { lead, beats, tempo } = asked.task;
    const period = 60_000 / tempo;
    await holdClock(page);
    await press(glim(page));
    const lit = (beat: number) =>
      lesson(page).locator(`[data-beat="${String(beat)}"][data-now="true"]`);
    // Up to the first beat that is to be tapped, a step at a time.
    for (let moved = 0; moved < 400 && (await lit(lead).count()) === 0; moved++) {
      await page.clock.runFor(25);
    }
    await expect(lit(lead)).toHaveCount(1);
    // A third of a beat after every light comes on: later than a tap may be, and always by the same amount.
    await page.clock.runFor(period * 0.32);
    await press(drum(page));
    for (let beat = 1; beat < beats; beat++) {
      await page.clock.runFor(period);
      await press(drum(page));
    }
    await page.clock.runFor(period);
    await expect(next(page)).toBeVisible();
    await expect(caption(page)).toHaveText('Yes. You kept the beat.');
    expect((await lights(page)).filter((light) => light === 'tap:met')).toHaveLength(beats);
  });

  test('can be followed by eye with the sound off: the lights keep the beat, and so can the child', async ({
    page,
    press,
  }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ version: 1, sound: false, motion: 'system', graphics: 'pictures' }),
      );
    }, SETTINGS_KEY);
    await open(page, press, ID);
    // No gate: a beat that is lit needs no sound.
    await expect(page.getByTestId('lesson-needs-sound')).toHaveCount(0);
    await pastTheShowing(page, press);
    await answer(page, press);
    await expect(next(page)).toBeVisible({ timeout: 20_000 });
    await expect(caption(page)).toHaveText('Yes. You kept the beat.');
  });

  test('fits the screen, with a drum far larger than a small finger needs @layout', async ({
    page,
    press,
  }) => {
    await open(page, press, ID);
    await pastTheShowing(page, press);
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
    const box = await drum(page).boundingBox();
    const screen = page.viewportSize();
    if (!box || !screen) throw new Error('The drum is not on screen.');
    expect(box.width).toBeGreaterThanOrEqual(110);
    expect(box.height).toBeGreaterThanOrEqual(110);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(screen.height + 0.5);
    // Every light of the strip is on the screen, and none is squeezed to nothing.
    for (const light of await lesson(page).locator('[data-beat]').all()) {
      const each = await light.boundingBox();
      expect(each?.width ?? 0).toBeGreaterThanOrEqual(8);
      expect((each?.x ?? -1) >= 0 && (each?.x ?? 0) + (each?.width ?? 0) <= screen.width).toBe(
        true,
      );
    }
  });
});

test.describe('the Music Lab: play it back', () => {
  const ID = 'ml-echo-01';

  test('stands the bars in a row, lowest first, each as long as its note is low @layout', async ({
    page,
    press,
  }) => {
    await open(page, press, ID);
    await pastTheShowing(page, press);
    // On to a step with four or five bars: three would stand in one row whatever was done with them.
    let asked = await challengeOnScreen(page);
    for (let step = 0; step < 6; step++) {
      if (asked.kind === 'make' && asked.task.type === 'echo' && asked.task.cards.length >= 4)
        break;
      await answer(page, press);
      await press(next(page));
      asked = await challengeOnScreen(page);
    }
    if (asked.kind !== 'make' || asked.task.type !== 'echo') throw new Error('Notes to play back.');
    expect(asked.task.cards.length).toBeGreaterThanOrEqual(4);
    const bars = lesson(page).locator('[data-card]');
    const drawn = await bars.evaluateAll((list) =>
      list.map((bar) => {
        const box = bar.getBoundingClientRect();
        const body = bar.querySelector('rect');
        return {
          note: bar.getAttribute('data-card') ?? '',
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          long: body ? body.getBoundingClientRect().height : 0,
        };
      }),
    );
    // In the order the content writes them, which is the order of their notes.
    expect(drawn.map((bar) => bar.note)).toEqual(asked.task.cards.map((card) => card.id));
    for (const [index, bar] of drawn.entries()) {
      const before = drawn[index - 1];
      // Wide enough for a small finger, and tall.
      expect(bar.width, bar.note).toBeGreaterThanOrEqual(48);
      expect(bar.height, bar.note).toBeGreaterThanOrEqual(64);
      if (!before) continue;
      expect(bar.left, bar.note).toBeGreaterThan(before.left + before.width - 1);
      expect(Math.abs(bar.top - before.top), bar.note).toBeLessThan(1);
      expect(bar.long, bar.note).toBeLessThan(before.long);
    }
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
  });

  test('is played back by tapping the bars in the order they sounded', async ({ page, press }) => {
    await open(page, press, ID);
    await pastTheShowing(page, press);
    await answer(page, press);
    await expect(next(page)).toBeVisible();
    await expect(caption(page)).toHaveText('Yes. You played it back.');
  });

  test('played back in another order, it is shown again, and nothing is said to be wrong with the child', async ({
    page,
    press,
  }) => {
    await open(page, press, ID);
    await pastTheShowing(page, press);
    const asked = await challengeOnScreen(page);
    if (asked.kind !== 'make' || asked.task.type !== 'echo') throw new Error('Notes to play back.');
    const backwards = [...asked.task.solution].reverse();
    expect(backwards).not.toEqual(asked.task.solution);
    // Once the showing is over: the bars take no tap before that.
    await expect(lesson(page).locator('[data-card]').first()).toHaveAttribute(
      'aria-disabled',
      'false',
      { timeout: 15_000 },
    );
    for (const note of backwards) {
      await press(lesson(page).locator(`[data-card="${note}"]`));
      await page.waitForTimeout(380);
    }
    await expect(caption(page)).toHaveText('Not quite. Listen again.');
    await expect(next(page)).toHaveCount(0);
    // Shown again, and then it can be played back rightly.
    await answer(page, press);
    await expect(next(page)).toBeVisible();
  });
});

test.describe('the Music Lab: make a tune', () => {
  const ID = 'ml-tune-01';
  const plot = (page: Page) => page.getByTestId('tune-board').locator('svg[role="img"]');
  const key = (page: Page, note: string) => page.locator(`button[data-note="${note}"]`);
  const takeBack = (page: Page) => page.getByRole('button', { name: 'Take the last note back' });
  const playTune = (page: Page) => page.getByRole('button', { name: 'Play my tune' });

  test('takes any tune with the shape asked for: made note by note, changed, played over, handed in', async ({
    page,
    press,
  }) => {
    await open(page, press, ID);
    await pastTheShowing(page, press);
    const asked = await challengeOnScreen(page);
    if (asked.kind !== 'make' || asked.task.type !== 'tune') throw new Error('A tune to make.');
    expect(asked.task.shape).toBe('up');
    await expect(plot(page)).toHaveAttribute('data-notes', '');
    await expect(done(page)).toBeDisabled();
    await expect(takeBack(page)).toHaveAttribute('aria-disabled', 'true');

    // Each bar tapped is a note of the tune, drawn as it is added.
    await press(key(page, 'd4'));
    await press(key(page, 'a4'));
    await expect(plot(page)).toHaveAttribute('data-notes', 'd4-a4');
    await expect(plot(page)).toHaveAttribute('aria-label', 'A tune of 3 notes. So far: D and A');
    // The last one can be taken back.
    await press(takeBack(page));
    await expect(plot(page)).toHaveAttribute('data-notes', 'd4');
    await press(key(page, 'e4'));
    await expect(done(page)).toBeDisabled();
    await press(key(page, 'g4'));
    await expect(plot(page)).toHaveAttribute('data-notes', 'd4-e4-g4');
    // Full: a further tap plays the bar and adds nothing.
    await press(key(page, 'a4'));
    await expect(plot(page)).toHaveAttribute('data-notes', 'd4-e4-g4');

    // It can be played over before it is handed in: each note lights in its turn.
    await press(playTune(page));
    await expect(playTune(page)).toHaveAttribute('data-playing', 'true');
    await expect(playTune(page)).toHaveAttribute('data-playing', 'false', { timeout: 10_000 });

    // D, E, G goes up. It is not the tune the content would have shown (C, E, A), and it is right.
    expect(asked.task.solution.join('-')).not.toBe('d4-e4-g4');
    await expect(done(page)).toBeEnabled();
    await press(done(page));
    await expect(next(page)).toBeVisible();
    await expect(caption(page)).toHaveText('Yes. Listen to your tune.');
    await expect(plot(page)).toHaveAttribute('data-notes', 'd4-e4-g4');
  });

  test('leaves a tune of another shape where it is, to be changed, and says what to change', async ({
    page,
    press,
  }) => {
    await open(page, press, ID);
    await pastTheShowing(page, press);
    // Down, where up was asked for.
    for (const note of ['a4', 'e4', 'c4']) await press(key(page, note));
    await press(done(page));
    await expect(caption(page)).toHaveText(
      'That did not go up every time. Change it, and try again.',
    );
    await expect(next(page)).toHaveCount(0);
    // The tune is still there: the child changes it, and does not start from nothing.
    await expect(plot(page)).toHaveAttribute('data-notes', 'a4-e4-c4');
    await press(takeBack(page));
    await press(takeBack(page));
    await press(takeBack(page));
    for (const note of ['c4', 'e4', 'a4']) await press(key(page, note));
    await press(done(page));
    await expect(next(page)).toBeVisible();
  });

  test('gives a start when help is asked for, and one whole way to do it when asked again', async ({
    page,
    press,
  }) => {
    await open(page, press, ID);
    await pastTheShowing(page, press);
    const asked = await challengeOnScreen(page);
    if (asked.kind !== 'make' || asked.task.type !== 'tune') throw new Error('A tune to make.');
    const [first, second] = asked.task.solution;
    const help = page.getByRole('button', { name: 'Help me' });
    await press(help);
    await expect(caption(page)).toHaveText(
      'Start on a big bar. Then choose a smaller one each time.',
    );
    await press(help);
    await expect(caption(page)).toHaveText('Start like this.');
    // The first note is in place, and cannot be taken back.
    await expect(plot(page)).toHaveAttribute('data-notes', first ?? '');
    await expect(takeBack(page)).toHaveAttribute('aria-disabled', 'true');
    await press(help);
    await expect(caption(page)).toHaveText('Here is one way.');
    // A hand on the bar to play next, and the rest of the way drawn faintly.
    await expect(key(page, second ?? '')).toHaveAttribute('data-expected', 'true');
    await expect(page.locator('button[data-expected]')).toHaveCount(1);
    await expect(plot(page).locator('[data-ghost]')).toHaveCount(asked.task.solution.length - 1);
    await answer(page, press);
    await expect(next(page)).toBeVisible();
  });

  test('fits the screen, with every bar wide enough for a small finger @layout', async ({
    page,
    press,
  }) => {
    await open(page, press, ID);
    await pastTheShowing(page, press);
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
    const keys = page.getByTestId('tune-board').locator('button[data-note]');
    expect(await keys.count()).toBeGreaterThanOrEqual(4);
    for (const each of await keys.all()) {
      const box = await each.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(48);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(64);
    }
    for (const tool of [takeBack(page), playTune(page)]) {
      const box = await tool.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(47.5);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(47.5);
    }
  });
});

test.describe('the Music Lab: a room to play in', () => {
  const room = (page: Page) => page.getByTestId('music-room');
  const bars = (page: Page) => room(page).locator('button[data-note]');
  const beat = (page: Page) => room(page).getByRole('button', { name: /the beat$/ });

  async function enter(page: Page, press: Press): Promise<void> {
    await page.goto('/world/music-lab');
    await press(page.getByRole('link', { name: 'Just play' }));
    await expect(room(page)).toBeVisible();
  }

  test('is reached from the Music Lab’s page, has the whole octave, and fits the screen @layout', async ({
    page,
    press,
  }) => {
    await enter(page, press);
    await expect(page).toHaveURL(/\/world\/music-lab\/room$/);
    // Measured once the page has arrived: it rises a little as it comes in.
    await arrived(page);
    // Nothing scrolls: a page that slides under a finger is no instrument.
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
    const drawn = await bars(page).evaluateAll((list) =>
      list.map((bar) => {
        const box = bar.getBoundingClientRect();
        return {
          note: bar.getAttribute('data-note') ?? '',
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
        };
      }),
    );
    expect(drawn.map((bar) => bar.note)).toEqual(['c4', 'd4', 'e4', 'f4', 'g4', 'a4', 'b4', 'c5']);
    for (const [index, bar] of drawn.entries()) {
      // Wide enough for a small finger on every screen there is a project for, and tall.
      expect(bar.width, bar.note).toBeGreaterThanOrEqual(48);
      expect(bar.height, bar.note).toBeGreaterThanOrEqual(84);
      const before = drawn[index - 1];
      if (!before) continue;
      // Lowest first: along a row from left to right, and where there are two rows, the low row above.
      const sameRow = Math.abs(bar.top - before.top) < 1;
      if (sameRow) expect(bar.left, bar.note).toBeGreaterThan(before.left + before.width - 1);
      else expect(bar.top, bar.note).toBeGreaterThan(before.top + before.height - 1);
    }
    const drum = await room(page).getByRole('button', { name: 'The drum' }).boundingBox();
    expect(drum?.width ?? 0).toBeGreaterThanOrEqual(96);
    expect(Math.abs((drum?.width ?? 0) - (drum?.height ?? 1))).toBeLessThan(1);
    const start = await beat(page).boundingBox();
    expect(start?.width ?? 0).toBeGreaterThanOrEqual(55.5);
  });

  test('lights a bar when it is played, by touch or with a mouse, and keeps nothing', async ({
    page,
    press,
  }) => {
    await enter(page, press);
    const stored = () =>
      page.evaluate(async () => {
        const names = (await indexedDB.databases()).map((each) => each.name);
        return { local: Object.keys(localStorage).sort(), databases: names.sort() };
      });
    const before = await stored();
    const g = room(page).locator('button[data-note="g4"]');
    await press(g);
    await expect(g).toHaveAttribute('data-lit', 'true');
    await expect(g).toHaveAttribute('data-lit', 'false');
    await press(room(page).getByRole('button', { name: 'The drum' }));
    for (const note of ['c4', 'e4', 'c5'])
      await press(room(page).locator(`button[data-note="${note}"]`));
    // Nothing was asked and nothing is written down: what is stored on the device is what was there before.
    expect(await stored()).toEqual(before);
    await press(page.getByRole('link', { name: 'Back to the Music Lab' }));
    await expect(page.getByRole('heading', { level: 1, name: 'Music Lab' })).toBeVisible();
  });

  test('has a slow beat to play along to, lit four at a time, that stops when it is told to', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    await enter(page, press);
    await holdClock(page);
    const now = () =>
      room(page)
        .locator('[data-light][data-now="true"]')
        .evaluateAll((list) => list.map((light) => light.getAttribute('data-light')).join());
    // Off until it is asked for.
    await expect(beat(page)).toHaveAttribute('aria-pressed', 'false');
    expect(await watchFor(page, 2000, now)).toEqual(['']);

    await press(beat(page));
    await expect(beat(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(beat(page)).toHaveAccessibleName('Stop the beat');
    // Seventy-two to the minute: six beats take five seconds, and the four lights take turns and come round.
    expect(await watchFor(page, 5100, now, 50)).toEqual(['', '0', '1', '2', '3', '0', '1']);

    await press(beat(page));
    await expect(beat(page)).toHaveAccessibleName('Start the beat');
    expect(await watchFor(page, 3000, now)).toEqual(['']);
  });

  test('asks for the sound where it is off, instead of offering an instrument that makes none', async ({
    page,
    press,
  }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ version: 1, sound: false, motion: 'system', graphics: 'pictures' }),
      );
    }, SETTINGS_KEY);
    await enter(page, press);
    await expect(page.getByTestId('room-needs-sound')).toBeVisible();
    await expect(bars(page)).toHaveCount(0);
    await press(page.getByRole('button', { name: 'Turn the sound on' }));
    await expect(bars(page)).toHaveCount(8);
  });

  test('passes the automated accessibility checks, and so does the page that leads to it', async ({
    page,
    press,
  }) => {
    const check = async (context: string) => {
      await arrived(page);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(
        results.violations.map(
          (violation) =>
            `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
        ),
        context,
      ).toEqual([]);
    };
    await page.goto('/world/music-lab');
    // The rooms that have not been built are a list to read: nothing in it can be pressed.
    const later = page.getByTestId('rooms-not-built');
    await expect(later.getByRole('listitem')).toHaveCount(5);
    await expect(later.locator('a, button')).toHaveCount(0);
    await expect(later.getByText('Not built')).toHaveCount(5);
    await check('the Music Lab’s page');
    await press(page.getByRole('link', { name: 'Just play' }));
    await expect(room(page)).toBeVisible();
    await check('the room to play in');
  });
});
