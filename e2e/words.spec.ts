import {
  arrived,
  expect,
  holdClock,
  listenIn,
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
 * Reading Cove's later activities: rhyme, the beats of a word, building a word from its letters, two letters that
 * write one sound, and a sentence. Each is tried wrongly as well as rightly. What matters most in them is what a
 * child is helped with and what is left to the child, so that is what is looked for: what is lit, and when, and
 * what the voice says and does not say.
 */

const lesson = (page: Page) => page.getByTestId('lesson');
/** What is asked about. */
const asked = (page: Page) => lesson(page).locator('[data-same]');
const choices = (page: Page) => lesson(page).locator('[data-choice]');
const caption = (page: Page) => lesson(page).getByRole('status');

type Press = (target: Locator) => Promise<void>;

/**
 * Into an activity the way a child comes in, by a tap on its card (everything here is heard, and will not start
 * until a touch has woken the sound), and as far as the end of its demonstration: "My turn" is there to press.
 */
async function open(page: Page, press: Press, id: string): Promise<void> {
  await page.goto('/world/reading-cove');
  await press(page.locator(`[data-lesson="${id}"]`));
  await expect(myTurn(page)).toBeVisible();
}

/** Press "My turn" and be on the next step. */
async function onward(page: Page, press: Press): Promise<void> {
  const step = (await lesson(page).getAttribute('data-challenge')) ?? '';
  await press(myTurn(page));
  await expect(lesson(page)).not.toHaveAttribute('data-challenge', step);
}

/**
 * From the first step with support, rightly through both steps with support, and stop with the way on to the
 * first step alone still to press: so that a test can hold the clock before that step begins.
 */
async function toTheLastStepWithSupport(page: Page, press: Press): Promise<void> {
  await expect(lesson(page)).toHaveAttribute('data-stage', 'guided');
  await answer(page, press);
  await press(next(page));
  await expect(lesson(page)).toHaveAttribute('data-stage', 'guided');
  await answer(page, press);
  await expect(next(page)).toBeVisible();
}

test.describe('which one rhymes?', () => {
  test('a word that starts the same is not it; the one that ends the same is @layout', async ({
    page,
    press,
  }) => {
    const said = await listenIn(page);
    await open(page, press, 'rc-rhyme-01');
    // The demonstration: a cat, and the end of its word marked under it.
    await expect(asked(page).locator('svg[data-rhyme-with="cat"]')).toBeVisible();
    await arrived(page);
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
    await onward(page, press);

    // "man": a mop, which starts the same, and a fan, which rhymes.
    expect((await challengeOnScreen(page)).id).toBe('rc-rhyme-01.guided-man');
    await expect(asked(page).locator('svg[data-rhyme-with="man"]')).toBeVisible();
    // With support the word is said beside each choice: once before each of the two, as they lie.
    const lying = await choices(page).evaluateAll((list) =>
      list.map(
        (choice) => choice.querySelector('svg[data-picture]')?.getAttribute('data-picture') ?? '',
      ),
    );
    expect([...lying].sort()).toEqual(['fan', 'mop']);
    await expect
      .poll(async () => (await said()).slice(-5), { timeout: 20_000 })
      .toEqual([
        'rc.rhyme.instruction',
        'word.man',
        `word.${lying[0] ?? ''}`,
        'word.man',
        `word.${lying[1] ?? ''}`,
      ]);

    const mop = choices(page).filter({ has: page.locator('svg[data-picture="mop"]') });
    const fan = choices(page).filter({ has: page.locator('svg[data-picture="fan"]') });
    await press(mop);
    await expect(caption(page)).toHaveText('That one ends another way. Listen again.');
    await expect(lesson(page)).toHaveAttribute('data-challenge', 'rc-rhyme-01.guided-man');
    // What was picked is said, and then the word: they do not end the same.
    await expect.poll(async () => (await said()).slice(-2)).toEqual(['word.mop', 'word.man']);
    await press(fan);
    await expect(caption(page)).toHaveText('Yes. They rhyme. They end the same.');
    await expect
      .poll(async () => (await said()).slice(-3))
      .toEqual(['word.man', 'word.fan', 'rc.rhyme.correct']);
    await expect(next(page)).toBeVisible();
    // And never slowly, or with a sound drawn out: a rhyme is heard in whole words.
    expect((await said()).filter((key) => /^(slow|onset|beats)\./.test(key))).toEqual([]);
  });
});

test.describe('clap the word', () => {
  /** How many claps stand under the word that is asked about. */
  const clapsUnder = (page: Page) => async () =>
    String(await asked(page).locator('[data-clap]').count());

  test('is clapped for a child one clap at a time, and no clap is left standing @layout', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    await open(page, press, 'rc-syllables-01');
    await arrived(page);
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
    await holdClock(page);
    await onward(page, press);
    // "apple": two beats. The cards to choose from are there all the while.
    expect((await challengeOnScreen(page)).id).toBe('rc-syllables-01.guided-apple');
    await expect(asked(page).locator('svg[data-clap-word="apple"]')).toBeVisible();
    await expect(choices(page).locator('svg[data-claps]')).toHaveCount(2);
    expect(await watchFor(page, 12_000, clapsUnder(page), 50)).toEqual(['0', '1', '2', '0']);
    await page.clock.resume();

    // One clap is not it: the card is played, and the word is clapped again.
    const one = choices(page).filter({ has: page.locator('svg[data-claps="1"]') });
    await press(one);
    await expect(caption(page)).toHaveText('Not that many. Listen to the claps.');
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That many claps.');
    // Answered, the claps stand under the word: as many as it has beats.
    await expect(asked(page).locator('svg[data-clap-word]')).toHaveAttribute('data-clapped', '2');
  });

  test('is only said to a child on their own: nothing is clapped until they have answered', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    const said = await listenIn(page);
    await open(page, press, 'rc-syllables-01');
    await onward(page, press);
    await toTheLastStepWithSupport(page, press);
    const before = (await said()).length;
    await holdClock(page);
    await press(next(page));
    await expect(lesson(page)).toHaveAttribute('data-stage', 'independent');
    // Long enough for the question to have been put, and the word said.
    expect(await watchFor(page, 9000, clapsUnder(page))).toEqual(['0']);
    await page.clock.resume();
    const challenge = await challengeOnScreen(page);
    if (challenge.kind !== 'choose-one' || challenge.prompt.stimulus.type !== 'scene') {
      throw new Error('A word to clap was expected.');
    }
    const word = String(challenge.prompt.stimulus.of.word);
    const since = (await said()).slice(before);
    expect(since).toContain(`word.${word}`);
    expect(since.filter((key) => key.startsWith('beats.'))).toEqual([]);

    // Every number of claps is there to choose from, each card large enough for a small finger.
    await expect(choices(page)).toHaveCount(3);
    for (const card of await choices(page).all()) {
      const box = await card.boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That many claps.');
    const answerCard = challenge.choices.find((choice) => choice.id === challenge.answer);
    const beats = answerCard?.stimulus.type === 'scene' ? String(answerCard.stimulus.of.count) : '';
    await expect(asked(page).locator('svg[data-clap-word]')).toHaveAttribute('data-clapped', beats);
  });
});

test.describe('build the word', () => {
  const board = (page: Page) => page.getByTestId('order-board');
  /** Which place is lit: the place of the sound that is being said. */
  const lit = (page: Page) => async () =>
    board(page)
      .locator('[data-slot][data-sounding="true"]')
      .evaluateAll((places) => places.map((place) => place.getAttribute('data-slot')).join(','));
  const tile = (page: Page, letter: string) => board(page).locator(`ul [data-card="${letter}"]`);
  const placed = (page: Page) => board(page).locator('[data-slot][data-filled="true"]');
  const done = (page: Page) => page.getByRole('button', { name: 'Done' });

  test('has the picture of the word above three places, and lights each place as its sound is said @layout', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    await open(page, press, 'rc-spell-01');
    await holdClock(page);
    await onward(page, press);
    // "mat".
    expect((await challengeOnScreen(page)).id).toBe('rc-spell-01.guided-mat');
    await expect(
      board(page).getByTestId('order-prompt').locator('svg[data-picture="mat"]'),
    ).toBeVisible();
    await expect(board(page).locator('[data-slot]')).toHaveCount(3);
    await expect(placed(page)).toHaveCount(0);
    // The word, and then the word slowly: first place, middle place, last place, and then none.
    expect(await watchFor(page, 10_000, lit(page), 50)).toEqual(['', '0', '1', '2', '']);
    await page.clock.resume();
    await arrived(page);
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
    for (const letter of ['m', 'a', 't']) {
      const box = await tile(page, letter).boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }

    // Backwards: t, a, m. The middle letter is where it belongs and stays; the other two go back.
    await expect(done(page)).toBeDisabled();
    for (const letter of ['t', 'a', 'm']) await press(tile(page, letter));
    await expect(placed(page)).toHaveCount(3);
    await press(done(page));
    await expect(caption(page)).toHaveText('Not quite. Listen to it slowly.');
    await expect(placed(page)).toHaveCount(1);
    await expect(board(page).locator('[data-slot="1"]')).toHaveAttribute('data-filled', 'true');
    await expect(tile(page, 'a')).toHaveAttribute('data-gone', 'true');
    await expect(tile(page, 'm')).toHaveAttribute('data-gone', 'false');

    // And then rightly.
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. You built the word.');
    await expect(board(page).locator('ol')).toHaveAttribute('data-same', 'true');
  });

  test('says the word once to a child on their own, and lights no place for them', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    const said = await listenIn(page);
    await open(page, press, 'rc-spell-01');
    await onward(page, press);
    await toTheLastStepWithSupport(page, press);
    const before = (await said()).length;
    await holdClock(page);
    await press(next(page));
    await expect(lesson(page)).toHaveAttribute('data-stage', 'independent');
    expect(await watchFor(page, 8000, lit(page))).toEqual(['']);
    await page.clock.resume();
    const challenge = await challengeOnScreen(page);
    const word =
      challenge.kind === 'make' && challenge.prompt.stimulus?.type === 'picture'
        ? challenge.prompt.stimulus.id
        : '';
    expect(word).not.toBe('');
    const since = (await said()).slice(before);
    expect(since.filter((key) => key === `word.${word}`)).toHaveLength(1);
    expect(since.filter((key) => key.startsWith('slow.'))).toEqual([]);

    // Help says it slowly, and then the places light.
    await press(page.getByRole('button', { name: 'Help me' }));
    await expect.poll(async () => (await said()).slice(before)).toContain(`slow.${word}`);
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. You built the word.');
  });
});

test.describe('two letters, one sound', () => {
  test('are met one pair at a time, the two letters together on one tile @layout', async ({
    page,
    press,
  }) => {
    await page.goto('/world/reading-cove');
    await press(page.locator('[data-lesson="rc-letters-05"]'));
    for (const pair of ['sh', 'ch', 'th']) {
      const shown = asked(page).locator(`svg[data-letters="${pair}"]`);
      await expect(shown).toBeVisible();
      // Two letters, drawn: two strokes' worth, in the one picture.
      await expect(shown.locator('path')).toHaveCount(2);
      await arrived(page);
      expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
      await onward(page, press);
    }
    await expect(lesson(page)).toHaveAttribute('data-stage', 'guided');
    // "sh": a sock starts with s on its own, and is not it.
    const sock = choices(page).filter({ has: page.locator('svg[data-picture="sock"]') });
    await expect(sock).toHaveAttribute('aria-disabled', 'false');
    await press(sock);
    await expect(caption(page)).toHaveText('Not that one. Listen again.');
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. It starts with that sound.');
  });

  test('stand on one tile in a word to read: three sounds, three tiles', async ({
    page,
    press,
  }) => {
    const said = await listenIn(page);
    await open(page, press, 'rc-blend-03');
    // "ship", in the demonstration.
    const tiles = asked(page).locator('[data-word="ship"] svg[data-letters]');
    await expect(tiles).toHaveCount(3);
    expect(
      await tiles.evaluateAll((list) => list.map((each) => each.getAttribute('data-letters'))),
    ).toEqual(['sh', 'i', 'p']);
    await onward(page, press);
    await toTheLastStepWithSupport(page, press);
    const before = (await said()).length;
    await press(next(page));
    await expect(lesson(page)).toHaveAttribute('data-stage', 'independent');
    const word = await asked(page).locator('[data-word]').getAttribute('data-word');
    // Time enough for anything that was going to be said to have been said: on their own, the word is not.
    await page.waitForTimeout(3500);
    expect((await said()).slice(before)).toEqual(['rc.read.instruction']);
    await press(page.getByRole('button', { name: 'Help me' }));
    await expect.poll(async () => (await said()).slice(before)).toContain(`slow.${String(word)}`);
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That is the word.');
  });
});

test.describe('read the sentence', () => {
  const strip = (page: Page) => asked(page).locator('[data-sentence]');
  /** Which word the finger is under: -1 for none. */
  const finger = (page: Page) => async () => (await strip(page).getAttribute('data-reading')) ?? '';

  test('is read to a child with a finger under each word in turn, and then the finger is gone @layout', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    await open(page, press, 'rc-sentences-01');
    await expect(strip(page)).toHaveAttribute('data-sentence', 'a cat on a mat');
    await arrived(page);
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
    await holdClock(page);
    await onward(page, press);
    // "a hen in a hut": in the hut, or on it.
    await expect(strip(page)).toHaveAttribute('data-sentence', 'a hen in a hut');
    await expect(strip(page).locator('[data-token]')).toHaveCount(5);
    expect(await watchFor(page, 10_000, finger(page), 30)).toEqual([
      '-1',
      '0',
      '1',
      '2',
      '3',
      '4',
      '-1',
    ]);
    await expect(strip(page).locator('[data-finger]')).toHaveCount(0);
    await page.clock.resume();

    const on = choices(page).filter({ has: page.locator('svg[data-placed="a hen on a hut"]') });
    await press(on);
    await expect(caption(page)).toHaveText('It says something else. Read it again.');
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That is what it says.');

    // Print large enough to read, on this screen: a phone held upright has the sentence on two lines.
    await arrived(page);
    expect(await screenFit(page)).toEqual({ sideways: [], taller: 0 });
    const screen = page.viewportSize() ?? { width: 0, height: 0 };
    const upright = screen.width < 600 && screen.height > screen.width;
    await expect(strip(page)).toHaveAttribute('data-lines', upright ? '2' : '1');
    const smallLetter = await strip(page)
      .locator('svg')
      .evaluate((svg: SVGSVGElement) => {
        const box = svg.getBoundingClientRect();
        const view = svg.viewBox.baseVal;
        // A small letter is 20 of the units the print is drawn in.
        return Math.min(box.width / view.width, box.height / view.height) * 20;
      });
    expect(smallLetter).toBeGreaterThanOrEqual(upright ? 16 : 12);
    // And the pictures it is answered with stand side by side: the places they stand in, since the one that
    // is right is lifted a little out of its place.
    const places = await choices(page).evaluateAll((list) =>
      list.map((each) => {
        const box = (each.parentElement ?? each).getBoundingClientRect();
        return { top: Math.round(box.top), left: Math.round(box.left) };
      }),
    );
    expect(new Set(places.map((place) => place.top)).size).toBe(1);
    expect(new Set(places.map((place) => place.left)).size).toBe(places.length);
  });

  test('is not read to a child on their own, and no finger shows them the way, until they ask', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    const said = await listenIn(page);
    await open(page, press, 'rc-sentences-01');
    await onward(page, press);
    await toTheLastStepWithSupport(page, press);
    const before = (await said()).length;
    await holdClock(page);
    await press(next(page));
    await expect(lesson(page)).toHaveAttribute('data-stage', 'independent');
    expect(await watchFor(page, 7000, finger(page))).toEqual(['-1']);
    await page.clock.resume();
    expect((await said()).slice(before)).toEqual(['rc.sentence.instruction']);

    // What a screen reader is given is the letters, not the words.
    const sentence = (await strip(page).getAttribute('data-sentence')) ?? '';
    const spelt = sentence
      .split(' ')
      .map((word) => Array.from(word).join(', '))
      .join('; ');
    await expect(asked(page)).toContainText(`A sentence to read: ${spelt}`);
    // Three pictures, each of one thing on or in another, each large enough to press.
    await expect(choices(page).locator('svg[data-placed]')).toHaveCount(3);
    for (const card of await choices(page).all()) {
      const box = await card.boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }

    // A wrong picture is not answered by reading the sentence out: that is asked for.
    const challenge = await challengeOnScreen(page);
    if (challenge.kind !== 'choose-one') throw new Error('A sentence was expected.');
    const wrong = challenge.choices.find((choice) => choice.id !== challenge.answer)?.id ?? '';
    await press(lesson(page).locator(`[data-choice="${wrong}"]`));
    await expect(caption(page)).toHaveText('It says something else. Read it again.');
    // Once that has been said, time enough for a reading to have begun if one were coming.
    await expect.poll(async () => (await said()).at(-1)).toBe('rc.sentence.incorrect');
    await page.waitForTimeout(4500);
    expect((await said()).slice(before)).toEqual([
      'rc.sentence.instruction',
      'rc.sentence.incorrect',
    ]);

    await press(page.getByRole('button', { name: 'Help me' }));
    await expect
      .poll(async () => (await said()).slice(before).filter((key) => key.startsWith('sentence.')))
      .toHaveLength(1);
    await answer(page, press);
    await expect(caption(page)).toHaveText('Yes. That is what it says.');
  });
});
