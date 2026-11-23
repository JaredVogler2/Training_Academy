import AxeBuilder from '@axe-core/playwright';
import { testSetup } from '../src/engine/models';
import {
  NOTCH_SIDEWAYS,
  arrived,
  expect,
  finished,
  giveNotch,
  myTurn,
  next,
  screenFit,
  stepNumber,
  test,
  underTheNotch,
  type Locator,
  type Page,
} from './fixtures';

/**
 * Inventor Island: guessing what will happen and then finding out, and mending a thing that does not work by
 * changing it and testing it.
 *
 * The tests read what is on the bench from the picture (every picture carries its set-up) and ask the game's own
 * model what that set-up does: the same model the content was checked against. What they then assert is what a
 * child would see — that the test is played, that the picture comes to rest where it should, that a design that
 * fails is left alone to be changed.
 */

type Press = (target: Locator) => Promise<void>;
type Setup = Record<string, string | number>;

const play = (id: string) => `/world/inventor-island/play/${id}`;
const lesson = (page: Page) => page.getByTestId('lesson');
const caption = (page: Page) => lesson(page).getByRole('status');
const testButton = (page: Page) => page.getByRole('button', { name: 'Test' });
const guessBoard = (page: Page) => page.getByTestId('guess-board');
const bench = (page: Page) => page.getByTestId('design-board');
/** The picture of the thing itself: the first one on either board. */
const thing = (board: Locator) => board.locator('svg[data-scene]').first();

async function onBench(board: Locator): Promise<{ scene: string; setup: Setup }> {
  const picture = thing(board);
  const scene = (await picture.getAttribute('data-scene')) ?? '';
  const setup = JSON.parse((await picture.getAttribute('data-setup')) ?? '{}') as Setup;
  return { scene, setup };
}

/** What the model says happens to what is on the board. */
async function happens(board: Locator): Promise<string> {
  const { scene, setup } = await onBench(board);
  const result = testSetup(scene, setup);
  if (!result) throw new Error(`The ${scene} on the board cannot be tested.`);
  return result.outcome;
}

/** Tap the picture of what will happen (`right`), or of something that will not. */
async function guess(page: Page, press: Press, right: boolean): Promise<string> {
  const truth = await happens(guessBoard(page));
  const cards = guessBoard(page).locator('[data-shown][aria-disabled="false"]');
  for (let index = 0; index < (await cards.count()); index++) {
    const shown = (await cards.nth(index).getAttribute('data-shown')) ?? '';
    if ((shown === truth) === right) {
      await press(cards.nth(index));
      return shown;
    }
  }
  throw new Error(`No picture of ${right ? 'what happens' : 'something else'} is on the table.`);
}

/** Every design the parts on the bench allow, as the options to choose for each part. */
async function designs(page: Page): Promise<Record<string, string>[]> {
  const controls = bench(page).locator('[data-control]');
  let all: Record<string, string>[] = [{}];
  for (let index = 0; index < (await controls.count()); index++) {
    const control = controls.nth(index);
    const id = (await control.getAttribute('data-control')) ?? '';
    const options = await control
      .locator('[data-option]')
      .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('data-option') ?? ''));
    all = all.flatMap((design) => options.map((option) => ({ ...design, [id]: option })));
  }
  return all;
}

/** Set the parts on the bench to a design, tapping only the ones that are not already so. */
async function build(page: Page, press: Press, design: Record<string, string>): Promise<void> {
  for (const [control, option] of Object.entries(design)) {
    const part = bench(page).locator(`[data-control="${control}"] [data-option="${option}"]`);
    if ((await part.getAttribute('aria-pressed')) !== 'true') await press(part);
    await expect(part).toHaveAttribute('aria-pressed', 'true');
  }
}

/** A design for what is on the bench that works (`true`) or does not, and is not the one there now. */
async function findDesign(page: Page, works: boolean): Promise<Record<string, string> | null> {
  const { scene, setup } = await onBench(bench(page));
  const differs = (design: Record<string, string>) =>
    Object.entries(design).some(([control, option]) => setup[control] !== option);
  const changes = (design: Record<string, string>) =>
    Object.entries(design).filter(([control, option]) => setup[control] !== option).length;
  const found = (await designs(page))
    .filter(
      (design) => differs(design) && testSetup(scene, { ...setup, ...design })?.works === works,
    )
    // The fewest parts changed: a child changes one thing first.
    .sort((a, b) => changes(a) - changes(b));
  return found[0] ?? null;
}

/**
 * From wherever the activity is, guess rightly and mend rightly: until it ends (and the answer is `false`), or
 * until what is on the screen is what `until` is waiting for (`true`).
 */
async function playRightly(
  page: Page,
  press: Press,
  until?: () => Promise<boolean>,
): Promise<boolean> {
  await lesson(page).locator('svg[data-scene], [data-testid="lesson-finished"]').first().waitFor();
  for (let guard = 0; guard < 40; guard++) {
    if (await finished(page).isVisible()) return false;
    if (until && (await until())) return true;
    if (await myTurn(page).isVisible()) await press(myTurn(page));
    else if (await next(page).isVisible()) await press(next(page));
    else {
      if (await guessBoard(page).isVisible()) await guess(page, press, true);
      else {
        const design = await findDesign(page, true);
        if (!design) throw new Error('Nothing on the bench works.');
        await build(page, press, design);
        await press(testButton(page));
      }
      // The answer is in when the way on appears.
      await expect(next(page)).toBeVisible();
    }
    // Let the frame settle on its next state before looking again.
    await page.waitForTimeout(150);
  }
  throw new Error('The activity did not finish.');
}

/** Past the two demonstrations, to the first step that asks something. */
async function toFirstQuestion(page: Page, press: Press, id: string): Promise<void> {
  await page.goto(play(id));
  await press(myTurn(page));
  await expect(bench(page)).toBeVisible();
  await press(myTurn(page));
  await expect(guessBoard(page)).toBeVisible();
  expect(await stepNumber(page)).toBe(3);
}

/**
 * To a bench with the most parts a bench has: two things to change, with three values each. Which benches a sitting
 * brings is drawn by lot, so the balance is played until that one comes; a sitting nearly always has one.
 */
async function toWidestBench(page: Page, press: Press): Promise<void> {
  const parts = bench(page).locator('[data-option]');
  let widest = false;
  for (let sitting = 0; sitting < 5 && !widest; sitting++) {
    await page.goto(play('ii-balance-01'));
    widest = await playRightly(
      page,
      press,
      async () => (await bench(page).isVisible()) && (await parts.count()) === 6,
    );
  }
  expect(widest, 'a bench with six parts came up').toBe(true);
}

/** Everything on the bench is big enough: each part and the test button for a small finger, the thing to be seen. */
async function expectBenchBigEnough(page: Page): Promise<void> {
  const parts = bench(page).locator('[data-option]');
  for (let index = 0; index < (await parts.count()); index++) {
    const box = await parts.nth(index).boundingBox();
    expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
  }
  const button = await testButton(page).boundingBox();
  expect(Math.min(button?.width ?? 0, button?.height ?? 0)).toBeGreaterThanOrEqual(56);
  const picture = await thing(bench(page)).boundingBox();
  expect(picture?.width ?? 0).toBeGreaterThanOrEqual(140);
  expect(picture?.height ?? 0).toBeGreaterThanOrEqual(80);
}

/** The automated accessibility checks (axe-core, the WCAG 2.1 A and AA rules) find nothing on the page as it is. */
async function expectNoViolations(page: Page, context: string): Promise<void> {
  await arrived(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
  );
  expect(summary, `axe violations on ${context}`).toEqual([]);
}

test.describe('the world page', () => {
  test('opens Inventor Island with its four activities and something to try together for each', async ({
    page,
  }) => {
    await page.goto('/world/inventor-island');
    const cards = page.locator('[data-lesson]');
    await expect(cards).toHaveCount(4);
    for (let index = 0; index < 4; index++) {
      await expect(cards.nth(index).locator('svg[data-scene]').first()).toBeVisible();
    }
    await expect(page.getByRole('link', { name: 'Play', exact: true })).toHaveAttribute(
      'href',
      play('ii-bridge-01'),
    );
    // What Play leads to is shown as a picture: the set-up, and how it turns out.
    const example = page.getByTestId('world-example').locator('svg[data-scene]');
    await expect(example).toHaveCount(2);
    await expect(example.first()).toHaveAttribute('data-phase', 'before');
    await expect(example.last()).toHaveAttribute('data-phase', 'after');

    const list = page.getByRole('region', { name: 'For grown-ups' }).getByRole('listitem');
    await expect(list).toHaveCount(4);
    await expect(list.filter({ hasText: 'Ready' })).toHaveCount(4);
    await expect(list.filter({ hasText: 'To try together, away from the screen:' })).toHaveCount(4);
    // Whatever is suggested says who has to be there, and the water one says it loudest.
    await expect(list.filter({ hasText: 'Stay with your child' })).toHaveCount(3);
    await expect(list.nth(3)).toContainText('Never leave a child alone with water');
    // What is needed, what mess to expect and two things to ask are said for each.
    for (let index = 0; index < 4; index++) {
      await expect(list.nth(index)).toContainText(/You need: .+ Mess: .+ Ask: .+\? .+\?/);
    }

    expect((await screenFit(page)).sideways).toEqual([]);
    await expectNoViolations(page, 'the world page');
  });
});

test.describe('a guess', () => {
  test('is tested there and then, and a guess that did not come true is kept beside what did happen @layout', async ({
    page,
    press,
  }) => {
    await toFirstQuestion(page, press, 'ii-bridge-01');
    const picture = thing(guessBoard(page));
    const cards = guessBoard(page).locator('[data-shown]');

    // Nothing has happened yet, and the picture does not say what will.
    await expect(picture).toHaveAttribute('data-phase', 'before');
    expect(await picture.getAttribute('data-outcome')).toBeNull();
    await expect(cards).toHaveCount(2);

    // The whole board is on the screen, and every picture is big enough for a small finger.
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    for (let index = 0; index < 2; index++) {
      const box = await cards.nth(index).boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }

    const truth = await happens(guessBoard(page));
    const guessed = await guess(page, press, false);
    expect(guessed).not.toBe(truth);
    // The test is played, and the thing stays where it came to rest.
    await expect(picture).toHaveAttribute('data-phase', 'testing');
    await expect(picture).toHaveAttribute('data-outcome', truth);
    await expect(picture).toHaveAttribute('data-phase', 'after');
    await expect(caption(page)).toHaveText('Look. It held. Tap what happened.');
    expect(await stepNumber(page)).toBe(3);

    // The guess is kept, marked as the guess; nothing calls it wrong. The hand is on what happened.
    const mine = guessBoard(page).locator(`[data-shown="${guessed}"]`);
    await expect(mine).toHaveAttribute('data-guess', 'true');
    await expect(mine).toHaveAttribute('data-state', 'tried');
    await expect(mine).toHaveAccessibleName(/\(My guess\)$/);
    const what = guessBoard(page).locator(`[data-shown="${truth}"]`);
    await expect(what.locator('span[aria-hidden="true"]')).toHaveCount(1);

    await press(what);
    await expect(caption(page)).toHaveText('Yes. It held.');
    await expect(what).toHaveAttribute('data-state', 'same');
    // It has been watched once: it is not played again for saying what was seen.
    await expect(picture).toHaveAttribute('data-phase', 'after');
    await expect(next(page)).toBeVisible();
  });

  test('that comes true is lit together with what happened', async ({ page, press }) => {
    await toFirstQuestion(page, press, 'ii-bridge-01');
    const picture = thing(guessBoard(page));
    const guessed = await guess(page, press, true);
    await expect(picture).toHaveAttribute('data-phase', 'testing');
    await expect(picture).toHaveAttribute('data-phase', 'after');
    await expect(caption(page)).toHaveText('Yes. It held.');
    const mine = guessBoard(page).locator(`[data-shown="${guessed}"]`);
    await expect(mine).toHaveAttribute('data-guess', 'true');
    await expect(mine).toHaveAttribute('data-state', 'same');
    // A picture cannot be picked while the test is playing or once the answer is in.
    await expect(guessBoard(page).locator('[data-shown][aria-disabled="false"]')).toHaveCount(0);
  });

  test('can be helped: first where to look, then by testing it', async ({ page, press }) => {
    await toFirstQuestion(page, press, 'ii-bridge-01');
    const picture = thing(guessBoard(page));
    const help = page.getByRole('button', { name: 'Help me' });
    await press(help);
    await expect(caption(page)).toHaveText('Look at the plank and the posts. Who is crossing?');
    await expect(picture).toHaveAttribute('data-phase', 'before');
    await press(help);
    await expect(caption(page)).toHaveText('Let us test it. Watch.');
    await expect(picture).toHaveAttribute('data-phase', 'testing');
    await expect(picture).toHaveAttribute('data-phase', 'after');
    await expect(help).toBeDisabled();
    // Only what happened is left to tap.
    const left = guessBoard(page).locator('[data-shown][aria-disabled="false"]');
    await expect(left).toHaveCount(1);
    await expect(left).toHaveAttribute('data-shown', await happens(guessBoard(page)));
    await press(left);
    await expect(caption(page)).toHaveText('Yes. It held.');
  });

  test('has three ways to turn out where the thing has three', async ({ page, press }) => {
    await toFirstQuestion(page, press, 'ii-ramp-01');
    const cards = guessBoard(page).locator('[data-shown]');
    await expect(cards).toHaveCount(3);
    const shown = await cards.evaluateAll((all) =>
      all.map((card) => card.getAttribute('data-shown')),
    );
    expect([...shown].sort()).toEqual(['landed', 'rolled-past', 'rolled-short']);
    // A low ramp, and the star four lengths off: it stops too soon.
    await guess(page, press, false);
    await expect(thing(guessBoard(page))).toHaveAttribute('data-phase', 'after');
    await expect(caption(page)).toHaveText('Look. It stopped too soon. Tap what happened.');
    // One picture is set aside as the guess; two are still there to choose between, by what was just seen.
    await expect(guessBoard(page).locator('[data-shown][aria-disabled="false"]')).toHaveCount(2);
    await guess(page, press, true);
    await expect(caption(page)).toHaveText('Yes. It stopped too soon.');
  });
});

test.describe('a mend', () => {
  test('shows the trouble first, and tests a change only when something has been changed @layout', async ({
    page,
    press,
  }) => {
    await toFirstQuestion(page, press, 'ii-ramp-01');
    await guess(page, press, true);
    await press(next(page));
    await expect(bench(page)).toBeVisible();
    expect(await stepNumber(page)).toBe(4);
    const picture = thing(bench(page));

    // The trouble, for nothing: a low ramp onto rough ground, and the star two lengths off.
    await expect(picture).toHaveAttribute('data-phase', 'testing');
    await expect(picture).toHaveAttribute('data-outcome', 'rolled-short');
    await expect(picture).toHaveAttribute('data-phase', 'before');
    expect(await stepNumber(page)).toBe(4);

    // The whole bench is on the screen, and every part is big enough for a small finger.
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    const parts = bench(page).locator('[data-option]');
    await expect(parts).toHaveCount(3);
    for (let index = 0; index < 3; index++) {
      const box = await parts.nth(index).boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }
    const button = await testButton(page).boundingBox();
    expect(Math.min(button?.width ?? 0, button?.height ?? 0)).toBeGreaterThanOrEqual(56);

    // Nothing has been changed, so there is nothing to test.
    await expect(testButton(page)).toBeDisabled();

    // Too high: it rolls past. It is said, it is shown, and the ramp is left exactly as it was built.
    await build(page, press, { height: 'high' });
    await expect(picture).toHaveAttribute('data-phase', 'before');
    await press(testButton(page));
    await expect(picture).toHaveAttribute('data-phase', 'testing');
    await expect(picture).toHaveAttribute('data-outcome', 'rolled-past');
    await expect(caption(page)).toHaveText('Not on the star yet. Change one thing and test again.');
    await expect(picture).toHaveAttribute('data-phase', 'after');
    await expect(bench(page).locator('[data-option="high"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await stepNumber(page)).toBe(4);
    // The same ramp is not tested twice.
    await expect(testButton(page)).toBeDisabled();

    // One thing changed: it stops on the star.
    await build(page, press, { height: 'mid' });
    await expect(picture).toHaveAttribute('data-phase', 'before');
    await press(testButton(page));
    await expect(picture).toHaveAttribute('data-outcome', 'landed');
    await expect(caption(page)).toHaveText('It stopped on the star!');
    await expect(picture).toHaveAttribute('data-phase', 'after');
    await expect(next(page)).toBeVisible();
    // Mended: the parts cannot be changed any more.
    await expect(bench(page).locator('[data-option][aria-disabled="false"]')).toHaveCount(0);
  });

  test('can be helped: what the parts do, then one part set, then the answer pointed out', async ({
    page,
    press,
  }) => {
    await toFirstQuestion(page, press, 'ii-bridge-01');
    await guess(page, press, true);
    await press(next(page));
    await expect(bench(page)).toBeVisible();
    const help = page.getByRole('button', { name: 'Help me' });

    await press(help);
    await expect(caption(page)).toHaveText('A thick plank holds more. Posts hold it up.');
    await press(help);
    await expect(caption(page)).toHaveText('Here is one part. You choose the rest.');
    // The plank is settled, and is not the child's to change now.
    const plank = bench(page).locator('[data-control="plank"]');
    await expect(plank.locator('[data-given="true"]')).toHaveCount(1);
    await expect(plank.locator('[aria-disabled="false"]')).toHaveCount(0);
    await expect(bench(page).locator('[data-control="posts"] [aria-disabled="false"]')).toHaveCount(
      3,
    );

    await press(help);
    await expect(caption(page)).toHaveText('Make it like this. Then test it.');
    await expect(help).toBeDisabled();
    // The hand is on the part that is not yet as it should be: a post.
    const pointed = bench(page)
      .locator('[data-option]')
      .filter({ has: page.locator('span[aria-hidden="true"]') });
    await expect(pointed).toHaveCount(1);
    await expect(pointed).toHaveAttribute('data-option', 'one');
    await press(pointed);
    await press(testButton(page));
    await expect(caption(page)).toHaveText('It holds! You mended it.');
  });

  test('shows the answer after three tests that did not work, so that nobody is stuck', async ({
    page,
    press,
  }) => {
    await toFirstQuestion(page, press, 'ii-balance-01');
    await guess(page, press, true);
    await press(next(page));
    await expect(bench(page)).toBeVisible();
    // One block, two steps out on the blue side. Far out is too far; close in is where it began.
    for (const at of ['far', 'near', 'far']) {
      await build(page, press, { at });
      await press(testButton(page));
      await expect(caption(page)).toHaveText('It still tips. Change one thing and test again.');
      await expect(thing(bench(page))).toHaveAttribute('data-phase', 'after');
    }
    const pointed = bench(page)
      .locator('[data-option]')
      .filter({ has: page.locator('span[aria-hidden="true"]') });
    await expect(pointed).toHaveCount(1);
    await expect(pointed).toHaveAttribute('data-option', 'mid');
    await press(pointed);
    await press(testButton(page));
    await expect(caption(page)).toHaveText('It balances!');
    await expect(thing(bench(page))).toHaveAttribute('data-outcome', 'balanced');
  });
});

test.describe('float or sink', () => {
  test('a little pebble guessed to float, and a boat too small for its stones, are found out and put right', async ({
    page,
    press,
  }) => {
    await toFirstQuestion(page, press, 'ii-float-01');
    const tub = thing(guessBoard(page));
    await expect(tub).toHaveAttribute('data-scene', 'tub');
    // It is small, and it sinks all the same.
    expect(await guess(page, press, false)).toBe('floated');
    await expect(tub).toHaveAttribute('data-phase', 'testing');
    await expect(tub).toHaveAttribute('data-outcome', 'sank');
    await expect(tub).toHaveAttribute('data-phase', 'after');
    await expect(caption(page)).toHaveText('Look. It sank. Tap what happened.');
    await guess(page, press, true);
    await expect(caption(page)).toHaveText('Yes. It sank.');
    await press(next(page));

    // Three stones to carry, and the little shell goes under with them.
    const pond = thing(bench(page));
    await expect(pond).toHaveAttribute('data-scene', 'boat');
    await expect(pond).toHaveAttribute('data-phase', 'testing');
    await expect(pond).toHaveAttribute('data-outcome', 'sank');
    await expect(pond).toHaveAttribute('data-phase', 'before');

    // The bark boat is bigger and still too small. It sinks as well, and is left as it was built.
    await build(page, press, { boat: 'bark' });
    await press(testButton(page));
    await expect(pond).toHaveAttribute('data-phase', 'testing');
    await expect(pond).toHaveAttribute('data-outcome', 'sank');
    await expect(caption(page)).toHaveText('Not yet. Change one thing and test again.');
    await expect(pond).toHaveAttribute('data-phase', 'after');
    await expect(bench(page).locator('[data-option="bark"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await stepNumber(page)).toBe(4);

    // The raft carries all three across.
    await build(page, press, { boat: 'raft' });
    await press(testButton(page));
    await expect(pond).toHaveAttribute('data-outcome', 'floated');
    await expect(caption(page)).toHaveText('They all got across!');
    await expect(pond).toHaveAttribute('data-phase', 'after');
    await expect(next(page)).toBeVisible();
  });
});

test.describe('every activity', () => {
  for (const [id, probes] of [
    ['ii-bridge-01', 3],
    ['ii-ramp-01', 3],
    ['ii-balance-01', 3],
    ['ii-float-01', 4],
  ] as const) {
    test(`${id} can be played to the end by guessing and mending rightly`, async ({
      page,
      press,
    }) => {
      await page.goto(play(id));
      expect(await playRightly(page, press)).toBe(false);
      await expect(finished(page)).toContainText(
        `${String(probes)} of ${String(probes)} right at the first try, with no help.`,
      );
    });
  }
});

test.describe('where nothing should move', () => {
  test('what happens is shown standing still: the guess, the trouble and the test', async ({
    page,
    press,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await toFirstQuestion(page, press, 'ii-bridge-01');
    const picture = thing(guessBoard(page));
    await expect(picture).toHaveAttribute('data-phase', 'before');
    const truth = await happens(guessBoard(page));
    await guess(page, press, true);
    // No test is played; the thing is simply shown as it came to rest.
    await expect(picture).toHaveAttribute('data-phase', 'after');
    await expect(picture).toHaveAttribute('data-outcome', truth);
    await expect(caption(page)).toHaveText('Yes. It held.');

    await press(next(page));
    // The trouble with what is on the bench is shown the same way, until something is changed.
    const mended = thing(bench(page));
    await expect(mended).toHaveAttribute('data-phase', 'after');
    await expect(mended).toHaveAttribute('data-outcome', 'sagged');
    const design = await findDesign(page, true);
    await build(page, press, design ?? {});
    await expect(mended).toHaveAttribute('data-phase', 'before');
    await press(testButton(page));
    await expect(mended).toHaveAttribute('data-phase', 'after');
    await expect(mended).toHaveAttribute('data-outcome', 'held');
  });
});

test.describe('on a phone held sideways, in the little height its browser leaves', () => {
  test.use({ viewport: { width: 640, height: 256 } });

  test('a guess and a mend each fit the screen, with everything still big enough to tap', async ({
    page,
    press,
  }) => {
    await toFirstQuestion(page, press, 'ii-float-01');
    let fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    const cards = guessBoard(page).locator('[data-shown]');
    for (let index = 0; index < (await cards.count()); index++) {
      const box = await cards.nth(index).boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }
    await guess(page, press, true);
    await press(next(page));

    await expect(bench(page)).toBeVisible();
    fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    await expectBenchBigEnough(page);

    // There is not the height here for two rows of parts, so they stand in one: six side by side at the most, and
    // the thing itself still a picture beside them.
    await toWidestBench(page, press);
    fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    await expectBenchBigEnough(page);
    // One row: every part starts at the same height.
    const tops = await bench(page)
      .locator('[data-control]')
      .evaluateAll((rows) => rows.map((row) => Math.round(row.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  });

  test.describe('and with a notch at each end', () => {
    test.use({ viewport: { width: 780, height: 280 } });

    test('a guess and the widest bench keep clear of it, and stay big enough to tap', async ({
      page,
      press,
    }) => {
      await giveNotch(page, NOTCH_SIDEWAYS);
      await toFirstQuestion(page, press, 'ii-ramp-01');
      await expect(guessBoard(page).locator('[data-shown]')).toHaveCount(3);
      expect(await underTheNotch(page, NOTCH_SIDEWAYS)).toEqual([]);
      let fit = await screenFit(page);
      expect(fit.sideways).toEqual([]);
      expect(fit.taller).toBe(0);

      await toWidestBench(page, press);
      expect(await underTheNotch(page, NOTCH_SIDEWAYS)).toEqual([]);
      fit = await screenFit(page);
      expect(fit.sideways).toEqual([]);
      expect(fit.taller).toBe(0);
      await expectBenchBigEnough(page);
    });
  });
});

test.describe('in words, for someone who cannot see the pictures', () => {
  test('a guess and a workbench say what they show, and the automated checks find nothing wrong @layout', async ({
    page,
    press,
  }) => {
    await toFirstQuestion(page, press, 'ii-ramp-01');
    const board = guessBoard(page);
    // The thing is said in words, and each picture to tap says how it would turn out.
    await expect(board).toContainText(
      'A low ramp onto smooth ground, with a ball at the top. The star is four lengths along.',
    );
    for (const name of ['It stops too soon', 'It stops on the star', 'It rolls too far']) {
      await expect(board.getByRole('button', { name, exact: true })).toBeVisible();
    }
    await expectNoViolations(page, 'a guess');

    const guessed = await guess(page, press, false);
    await expect(thing(board)).toHaveAttribute('data-phase', 'after');
    await expect(board.locator(`[data-shown="${guessed}"]`)).toHaveAccessibleName(
      /^It (stops on the star|rolls too far) \(My guess\)$/,
    );
    await expectNoViolations(page, 'a guess that did not come true');
    await guess(page, press, true);
    await expect(next(page)).toBeVisible();
    await expectNoViolations(page, 'a guess, answered');
    await press(next(page));

    // The bench: the thing in words; the part to change is a named group of named values, one of them pressed.
    const picture = thing(bench(page));
    await expect(picture).toHaveAttribute('data-phase', 'testing');
    await expect(picture).toHaveAttribute('data-phase', 'before');
    await expect(bench(page)).toContainText(
      'A low ramp onto rough ground, with a ball at the top. The star is two lengths along.',
    );
    const height = bench(page).getByRole('group', { name: 'How high the ramp is' });
    await expect(height.getByRole('button')).toHaveCount(3);
    await expect(height.getByRole('button', { name: 'a low ramp' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(height.getByRole('button', { name: 'a high ramp' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    // Why the test button is waiting is said as well as shown.
    await expect(testButton(page)).toHaveAccessibleDescription(
      'Change something first, then test it.',
    );
    await expectNoViolations(page, 'a workbench');

    await build(page, press, { height: 'high' });
    await expect(bench(page)).toContainText('A high ramp onto rough ground');
    await expect(testButton(page)).toHaveAccessibleDescription('');
    await press(testButton(page));
    await expect(picture).toHaveAttribute('data-phase', 'after');
    await expectNoViolations(page, 'a workbench, after a test that did not work');

    await build(page, press, { height: 'mid' });
    await press(testButton(page));
    await expect(next(page)).toBeVisible();
    await expect(picture).toHaveAttribute('data-phase', 'after');
    await expectNoViolations(page, 'a workbench, mended');
  });
});
