import AxeBuilder from '@axe-core/playwright';
import { testSetup } from '../src/engine/models';
import type { Challenge } from '../src/engine/schema';
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
  worldSettled,
  type Locator,
  type Page,
} from './fixtures';
import { pinSeed, seedThatBrings } from './sittings';

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

/** Hold a switch down until it changes, as a grown-up does. (A busy machine can take longer than the hold.) */
async function holdUntil(page: Page, target: Locator, pressed: boolean): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error('The switch is not on the screen.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(target).toHaveAttribute('aria-pressed', String(pressed), { timeout: 30_000 });
  await page.mouse.up();
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

/** How many parts the bench of a step has: every value of everything that can be changed on it. */
const partsOf = (challenge: Challenge): number =>
  challenge.kind === 'make' && challenge.task.type === 'design'
    ? challenge.task.controls.reduce((total, control) => total + control.options.length, 0)
    : 0;

/**
 * To a bench with the most parts a bench has: two things to change, with three values each. Which benches a sitting
 * brings is drawn from its seed, so the sitting is planned from a seed that brings one first (e2e/sittings.ts).
 * (It used to be played until one came, up to five sittings: luck nearly always brought one, and need not be asked.)
 */
async function toWidestBench(page: Page, press: Press): Promise<void> {
  const parts = bench(page).locator('[data-option]');
  await pinSeed(
    page,
    seedThatBrings('ii-balance-01', (challenge) => partsOf(challenge) === 6),
  );
  await page.goto(play('ii-balance-01'));
  const widest = await playRightly(
    page,
    press,
    async () => (await bench(page).isVisible()) && (await parts.count()) === 6,
  );
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
  test('opens Inventor Island with its five activities and something to try together for each', async ({
    page,
  }) => {
    await page.goto('/world/inventor-island');
    const cards = page.locator('[data-lesson]');
    await expect(cards).toHaveCount(5);
    for (let index = 0; index < 5; index++) {
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
    await expect(list).toHaveCount(5);
    await expect(list.filter({ hasText: 'Ready' })).toHaveCount(5);
    await expect(list.filter({ hasText: 'To try together, away from the screen:' })).toHaveCount(5);
    // Whatever is suggested says who has to be there, and the water one says it loudest.
    await expect(list.filter({ hasText: 'Stay with your child' })).toHaveCount(4);
    await expect(list.nth(3)).toContainText('Never leave a child alone with water');
    // The wind is breath or a book, and nothing with a plug or a flame.
    await expect(list.nth(4)).toContainText('no hair dryer, no electric fan, nothing lit');
    // What is needed, what mess to expect and two things to ask are said for each.
    for (let index = 0; index < 5; index++) {
      await expect(list.nth(index)).toContainText(/You need: .+ Mess: .+ Ask: .+\? .+\?/);
    }

    expect((await screenFit(page)).sideways).toEqual([]);
    await expectNoViolations(page, 'the world page');
  });

  test('has, for someone who is playing, a switch a grown-up holds to say a thing was tried: their word, kept with its day', async ({
    page,
    press,
  }) => {
    // Nobody has played on this device yet: there is nobody to say it of, and no switch.
    await page.goto('/world/inventor-island');
    await worldSettled(page);
    await expect(page.getByTestId('tried')).toHaveCount(0);
    // Someone begins an activity, and comes back to the island's page.
    await page.goto(play('ii-bridge-01'));
    await expect(myTurn(page)).toBeVisible();
    await page.goto('/world/inventor-island');
    await worldSettled(page);
    const switches = page.getByTestId('tried');
    await expect(switches).toHaveCount(5);
    const first = switches.first();
    const held = first.getByRole('button', { name: 'We tried this' });
    await expect(first).toHaveAttribute('data-lesson', 'ii-bridge-01');
    await expect(first).toContainText('Hold to say you tried this together.');
    await expect(held).toHaveAttribute('aria-pressed', 'false');
    const box = await held.boundingBox();
    expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(48);
    expect((await screenFit(page)).sideways).toEqual([]);

    // A tap does nothing to it: it is on a page a child taps.
    await press(held);
    await expect(held).toHaveAttribute('aria-pressed', 'false');
    await expect(first).toHaveAttribute('data-tried', 'false');

    // Held, it changes; and it says whose word it is, and what day it was said.
    await holdUntil(page, held, true);
    await expect(first).toHaveAttribute('data-tried', 'true');
    const today = await page.evaluate(() => {
      const now = new Date();
      const month = now.toLocaleString('en-GB', { month: 'long' });
      return `${String(now.getDate())} ${month} ${String(now.getFullYear())}`;
    });
    await expect(first).toContainText(
      `Tried on ${today}. That is your word: the game did not see it.`,
    );
    // Only that one: the others are as they were.
    await expect(page.locator('[data-testid="tried"][data-tried="true"]')).toHaveCount(1);

    // It is kept: the page loaded afresh has it, and so has the portfolio, in a grown-up's words.
    await page.reload();
    await worldSettled(page);
    await expect(switches.first()).toHaveAttribute('data-tried', 'true');
    await page.goto('/world/inventor-island/room');
    const cards = page.getByTestId('portfolio').locator('li');
    await expect(cards.first().getByTestId('tried-away')).toHaveText(
      `Tried away from the screen on ${today}: a grown-up said so.`,
    );
    await expect(page.getByTestId('tried-away')).toHaveCount(1);
    // Saying so made nothing: no design is drawn from it, and nothing is said to have been mended.
    await expect(cards.first()).toHaveAttribute('data-made', 'false');
    await expect(cards.first()).toContainText('Nothing mended here yet.');

    // And it can be taken back, the same way.
    await page.goto('/world/inventor-island');
    await worldSettled(page);
    await holdUntil(page, switches.first().getByRole('button', { name: 'We tried this' }), false);
    await expect(switches.first()).toHaveAttribute('data-tried', 'false');
    await page.goto('/world/inventor-island/room');
    await expect(cards).toHaveCount(5);
    await expect(page.getByTestId('tried-away')).toHaveCount(0);
  });
});

test.describe('the portfolio', () => {
  const portfolio = (page: Page) => page.getByTestId('portfolio');
  const cards = (page: Page) => portfolio(page).locator('li');

  test('is reached from the island, and before anything is mended shows what is waiting, each a way in @layout', async ({
    page,
    press,
  }) => {
    await page.goto('/world/inventor-island');
    await press(page.getByRole('link', { name: 'My inventions' }));
    await expect(page).toHaveURL(/\/world\/inventor-island\/room$/);
    await expect(portfolio(page).getByRole('heading', { level: 1 })).toHaveText('My inventions');
    await expect(cards(page)).toHaveCount(5);
    await expect(portfolio(page).locator('li[data-made="true"]')).toHaveCount(0);
    // Each card is the thing that is waiting to be mended there, as it is handed over, and it leads there.
    for (const [index, id] of [
      'ii-bridge-01',
      'ii-ramp-01',
      'ii-balance-01',
      'ii-float-01',
      'ii-shelter-01',
    ].entries()) {
      const card = cards(page).nth(index);
      await expect(card).toHaveAttribute('data-lesson', id);
      await expect(card.getByRole('link')).toHaveAttribute('href', play(id));
      const waiting = await onBench(card);
      expect(testSetup(waiting.scene, waiting.setup)?.works, id).toBe(false);
      await expect(card).toContainText('Nothing mended here yet.');
      await expect(card).toContainText('No guesses yet.');
    }
    // It fits the width of the screen, each picture is a fair thing to tap, and nothing is wrong that can be checked.
    await arrived(page);
    expect((await screenFit(page)).sideways).toEqual([]);
    for (const picture of await cards(page).locator(':is(a, button)').all()) {
      const box = await picture.boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }
    // The five are set out for the screen: one row where there is room, three and two, two by two and one, or
    // one under another. Never four and one; and never small in the middle of a wide screen, where each picture
    // was once 146 pixels across with half the page empty.
    const across = page.viewportSize()?.width ?? 0;
    const tops = await cards(page).evaluateAll((all) =>
      all.map((each) => Math.round(each.getBoundingClientRect().top)),
    );
    const rows = [...new Set(tops)].map((top) => tops.filter((each) => each === top).length);
    expect(rows).toEqual(
      across >= 1100 ? [5] : across >= 520 ? [3, 2] : across >= 360 ? [2, 2, 1] : [1, 1, 1, 1, 1],
    );
    for (const picture of await cards(page).locator(':is(a, button)').all()) {
      expect((await picture.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(
        across >= 700 ? 200 : 140,
      );
    }
    await expectNoViolations(page, 'the portfolio');
    // And the way back is the island.
    await press(portfolio(page).getByRole('link', { name: 'Back to Inventor Island' }));
    await expect(page).toHaveURL(/\/world\/inventor-island$/);
  });

  test('shows a bridge that was mended, exactly as it was left, and tests it again when it is tapped', async ({
    page,
    press,
  }) => {
    test.setTimeout(120_000);
    await page.goto(play('ii-bridge-01'));
    expect(await playRightly(page, press)).toBe(false);
    await page.goto('/world/inventor-island/room');
    const bridge = cards(page).first();
    await expect(bridge).toHaveAttribute('data-made', 'true');
    // The others are as they were.
    await expect(portfolio(page).locator('li[data-made="true"]')).toHaveCount(1);
    const picture = thing(bridge);
    await expect(picture).toHaveAttribute('data-scene', 'bridge');
    await expect(picture).toHaveAttribute('data-phase', 'after');
    // A thing that works, by the same model that tested it: it is drawn as having held.
    const made = await onBench(bridge);
    expect(testSetup(made.scene, made.setup)?.works).toBe(true);
    await expect(picture).toHaveAttribute('data-outcome', 'held');
    await expect(bridge).toContainText(/Mended and tested on \d+ \w+ \d{4}\./);
    // Every guess was right this time, and it says how many there were.
    await expect(bridge).toContainText(/Guesses: (\d+) of \1 came true at the first guess\./);
    await expectNoViolations(page, 'the portfolio with something in it');

    // Tapped, it is tested again, to watch; and comes to rest as it was.
    await press(bridge.getByRole('button', { name: 'Bridges that hold: test it again' }));
    await expect(thing(bridge)).toHaveAttribute('data-phase', 'testing');
    await expect(thing(bridge)).toHaveAttribute('data-phase', 'after');
    expect((await onBench(bridge)).setup).toEqual(made.setup);
    // Nothing was asked, and nothing more is written down for it.
    await page.reload();
    await expect(cards(page).first()).toContainText(/Guesses: (\d+) of \1 came true/);
  });

  test('with less motion, is a picture of how it came out, and a tap plays nothing', async ({
    page,
    press,
  }) => {
    test.setTimeout(120_000);
    await page.goto(play('ii-ramp-01'));
    expect(await playRightly(page, press)).toBe(false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/world/inventor-island/room');
    const ramp = cards(page).nth(1);
    await expect(ramp).toHaveAttribute('data-made', 'true');
    await expect(thing(ramp)).toHaveAttribute('data-outcome', 'landed');
    await press(ramp.getByRole('button'));
    // Asked once, at once, and once more a moment later: it has not begun. (Not waited for: a test that did
    // begin would be over within three seconds, and waiting would see it end and call that never having begun.)
    expect(await thing(ramp).getAttribute('data-phase')).toBe('after');
    await page.waitForTimeout(400);
    expect(await thing(ramp).getAttribute('data-phase')).toBe('after');
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
    await expect(caption(page)).toHaveText(
      'Look at the plank. Look at the posts. Who is crossing?',
    );
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
      await expect(caption(page)).toHaveText(
        'It is still tipping. Change one thing and test again.',
      );
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

test.describe('a shelter from the wind', () => {
  /** Where a part of the picture is on the screen, and how far it has been turned, in whole degrees. */
  const part = (picture: Locator, name: string) =>
    picture.locator(`[data-part="${name}"]`).evaluate((element) => {
      const box = element.getBoundingClientRect();
      const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        turned: Math.round((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI),
      };
    });

  /**
   * Where the two ends of the prop are on the screen: its foot, and the end that leans on the wall. (Not its
   * box: a browser gives a turned diagonal line the box of its own box turned, which is square whichever way
   * the line lies.)
   */
  const propEnds = (picture: Locator) =>
    picture.locator('[data-part="prop"] path').evaluate((element) => {
      const path = element as SVGPathElement;
      const matrix = path.getScreenCTM();
      if (!matrix) throw new Error('The prop is not drawn.');
      const at = (length: number) => {
        const point = path.getPointAtLength(length).matrixTransform(matrix);
        return { x: point.x, y: point.y };
      };
      return { foot: at(0), top: at(path.getTotalLength()) };
    });

  test('a wall guessed to fall in a breeze stands, and a prop on the wrong side holds nothing @layout', async ({
    page,
    press,
  }) => {
    await toFirstQuestion(page, press, 'ii-shelter-01');
    const meadow = thing(guessBoard(page));
    await expect(meadow).toHaveAttribute('data-scene', 'shelter');
    // A breeze, a low wall and nothing holding it: it stands all the same.
    expect((await onBench(guessBoard(page))).setup).toMatchObject({ wind: 'breeze', prop: 'none' });
    expect(await guess(page, press, false)).toBe('blew-over');
    await expect(meadow).toHaveAttribute('data-phase', 'testing');
    await expect(meadow).toHaveAttribute('data-outcome', 'sheltered');
    await expect(meadow).toHaveAttribute('data-phase', 'after');
    await expect(caption(page)).toHaveText('Look. The wall stood. Tap what happened.');
    // Standing, it is upright, and the plant behind it has not moved.
    await arrived(page);
    expect((await part(meadow, 'wall')).turned).toBe(0);
    expect((await part(meadow, 'plant')).turned).toBe(0);
    await guess(page, press, true);
    await expect(caption(page)).toHaveText('Yes. The wall stood.');
    await press(next(page));

    // A gust from the right, and the wall goes over: that is the trouble, shown first.
    const picture = thing(bench(page));
    await expect(picture).toHaveAttribute('data-scene', 'shelter');
    expect((await onBench(bench(page))).setup).toMatchObject({ wind: 'gust', from: 'right' });
    await expect(picture).toHaveAttribute('data-phase', 'testing');
    await expect(picture).toHaveAttribute('data-outcome', 'blew-over');
    await expect(picture).toHaveAttribute('data-phase', 'before');
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    const parts = bench(page).locator('[data-option]');
    await expect(parts).toHaveCount(3);
    for (let index = 0; index < 3; index++) {
      const box = await parts.nth(index).boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }

    // A prop on the side the wind comes from: it holds nothing. The wall goes over away from the wind, to the
    // left, and lies short of the plant; the prop comes down after it; and the wind bends the plant.
    await build(page, press, { prop: 'right' });
    // Leant against the wall: its top is on the wall's side of its foot, and well above it.
    const leaning = await propEnds(picture);
    expect(leaning.top.x).toBeLessThan(leaning.foot.x);
    expect(leaning.foot.y - leaning.top.y).toBeGreaterThan(leaning.foot.x - leaning.top.x);
    await press(testButton(page));
    await expect(picture).toHaveAttribute('data-phase', 'testing');
    await expect(picture).toHaveAttribute('data-outcome', 'blew-over');
    await expect(caption(page)).toHaveText(
      'Not yet. Look what the wind did. Change one thing and test again.',
    );
    await expect(picture).toHaveAttribute('data-phase', 'after');
    await arrived(page);
    const wall = await part(picture, 'wall');
    const plant = await part(picture, 'plant');
    const prop = await propEnds(picture);
    expect(wall.turned).toBe(-90);
    expect(wall.left).toBeGreaterThan(plant.right);
    expect(plant.turned).toBeLessThan(0);
    // Lying down, both of them: the wall wider than it is high, and the prop's top down beside its foot, on
    // the side the wall was.
    expect(wall.right - wall.left).toBeGreaterThan((wall.bottom - wall.top) * 2);
    expect(prop.top.x).toBeLessThan(prop.foot.x);
    expect(Math.abs(prop.foot.y - prop.top.y)).toBeLessThan((prop.foot.x - prop.top.x) / 4);
    await expect(picture.locator('[data-part="wind-through"]')).toHaveCSS('opacity', '0.9');
    await expect(bench(page).locator('[data-option="right"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await stepNumber(page)).toBe(4);

    // The prop on the side away from the wind: the wall stands, and the wind does not get through.
    await build(page, press, { prop: 'left' });
    await press(testButton(page));
    await expect(picture).toHaveAttribute('data-outcome', 'sheltered');
    await expect(caption(page)).toHaveText('It keeps the wind off! You mended it.');
    await expect(picture).toHaveAttribute('data-phase', 'after');
    await arrived(page);
    expect((await part(picture, 'wall')).turned).toBe(0);
    expect((await part(picture, 'plant')).turned).toBe(0);
    await expect(picture.locator('[data-part="wind-through"]')).toHaveCSS('opacity', '0');
    await expect(next(page)).toBeVisible();
  });

  test('a wall that stands and is too low lets the wind over the top', async ({ page, press }) => {
    // Which benches a sitting brings is drawn from its seed, three of ten: this sitting is planned from a seed
    // that brings the low wall in front of the sunflower first. (The test used to play up to eight sittings
    // waiting for it. Eight in a row miss one bench of ten one time in seventeen, and CI's run 57 was that time.)
    await pinSeed(
      page,
      seedThatBrings(
        'ii-shelter-01',
        (challenge) =>
          challenge.kind === 'make' &&
          challenge.task.type === 'design' &&
          challenge.task.given.plant === 'sunflower' &&
          challenge.task.given.wind === 'breeze',
      ),
    );
    const lowWall = async () => {
      if (!(await bench(page).isVisible())) return false;
      const { setup } = await onBench(bench(page));
      return setup.plant === 'sunflower' && setup.wind === 'breeze';
    };
    await page.goto(play('ii-shelter-01'));
    const found = await playRightly(page, press, lowWall);
    expect(found, 'the low wall in a breeze came up').toBe(true);
    const picture = thing(bench(page));
    // The trouble: it stands, and the sunflower is taller than it is.
    await expect(picture).toHaveAttribute('data-outcome', 'too-low');
    await expect(picture).toHaveAttribute('data-phase', 'before');
    // A taller wall with nothing to hold it catches the wind and goes over.
    await build(page, press, { wall: 'tall' });
    await press(testButton(page));
    await expect(picture).toHaveAttribute('data-outcome', 'blew-over');
    await expect(picture).toHaveAttribute('data-phase', 'after');
    await arrived(page);
    // Fallen towards the sunflower, and short of its stem: nothing is squashed.
    const wall = await part(picture, 'wall');
    const stem = await picture
      .locator('[data-part="plant"] path')
      .first()
      .evaluate((element) => element.getBoundingClientRect().left);
    expect(wall.turned).toBe(90);
    expect(wall.right).toBeLessThan(stem);
    // Propped on the side away from the wind, it stands and is tall enough.
    await build(page, press, { prop: 'right' });
    await press(testButton(page));
    await expect(picture).toHaveAttribute('data-outcome', 'sheltered');
    await expect(caption(page)).toHaveText('It keeps the wind off! You mended it.');
  });

  test('a wall with its prop taken away can be tested: it goes over again, and the child is told so', async ({
    page,
    press,
  }) => {
    // To the first bench: a gust from the right, a low wall, and no prop.
    await toFirstQuestion(page, press, 'ii-shelter-01');
    await guess(page, press, true);
    await press(next(page));
    const picture = thing(bench(page));
    await expect(picture).toHaveAttribute('data-phase', 'before');
    expect((await onBench(bench(page))).setup).toMatchObject({ wind: 'gust', prop: 'none' });
    const step = await stepNumber(page);

    // A prop on the wrong side, tested: over it goes.
    await build(page, press, { prop: 'right' });
    await press(testButton(page));
    await expect(picture).toHaveAttribute('data-outcome', 'blew-over');
    await expect(picture).toHaveAttribute('data-phase', 'after');

    // So the prop is taken away again, and that is tested. (A design is written as its options, and "none" was
    // also the word for an answer with nothing in it: the engine took a wall with no prop for no answer at
    // all, and the press that tested it did nothing whatever. A child was left pressing a button.)
    await build(page, press, { prop: 'none' });
    // Changed since it was tested: the wall is standing again, waiting.
    await expect(picture).toHaveAttribute('data-phase', 'before');
    await expect(testButton(page)).toBeEnabled();
    await press(testButton(page));
    await expect(picture).toHaveAttribute('data-phase', 'testing');
    await expect(picture).toHaveAttribute('data-outcome', 'blew-over');
    await expect(caption(page)).toHaveText(
      'Not yet. Look what the wind did. Change one thing and test again.',
    );
    await expect(picture).toHaveAttribute('data-phase', 'after');
    // What was tested is what is drawn, and what is pressed: no prop.
    expect((await onBench(bench(page))).setup.prop).toBe('none');
    await expect(bench(page).locator('[data-option="none"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await stepNumber(page)).toBe(step);

    // And it can still be mended.
    await build(page, press, { prop: 'left' });
    await press(testButton(page));
    await expect(picture).toHaveAttribute('data-outcome', 'sheltered');
    await expect(caption(page)).toHaveText('It keeps the wind off! You mended it.');
  });
});

test.describe('every activity', () => {
  for (const [id, probes] of [
    ['ii-bridge-01', 3],
    ['ii-ramp-01', 3],
    ['ii-balance-01', 3],
    ['ii-float-01', 4],
    ['ii-shelter-01', 3],
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
