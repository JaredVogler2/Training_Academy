import AxeBuilder from '@axe-core/playwright';
import storymaker from '../src/content/explorer-harbor/storymaker.json' with { type: 'json' };
import {
  SETTINGS_KEY,
  arrived,
  expect,
  holdClock,
  listenIn,
  myTurn,
  screenFit,
  test,
  watchFor,
  worldSettled,
  type Locator,
  type Page,
} from './fixtures';

/**
 * Explorer Harbor's room for making a story. Five choices, each a picture; three pages, each turned to and told
 * as it is made; and the whole told again. Every choice is a good one, so nothing here asks which is right:
 * what is tried is that each choice is offered as the content says, that no way through stops short, that a
 * page turns and is told, that nothing can be chosen while it is, and that it all fits a small screen and works
 * with the sound off, with less motion, and from the keyboard.
 */

type Press = (target: Locator) => Promise<void>;

/** What there is to choose from, as the content has it: read here to hold the screen to it. */
interface Trouble {
  endings: Record<string, unknown>;
}
const SETTINGS: Record<string, { seeds: string[] }> = storymaker.settings;
const SEEDS: Record<string, { troubles: Record<string, Trouble> }> = storymaker.seeds;

const room = (page: Page) => page.getByTestId('story-room');
const choices = (page: Page) => room(page).locator('button[data-choice]');
const choice = (page: Page, id: string) => room(page).locator(`button[data-choice="${id}"]`);
const again = (page: Page) => room(page).getByRole('button', { name: 'Hear it again' });
const another = (page: Page) => room(page).getByRole('button', { name: 'A new story' });
const told = (page: Page) => room(page).locator('figcaption');

async function enter(page: Page, press: Press): Promise<void> {
  await page.goto('/world/explorer-harbor');
  await press(page.getByRole('link', { name: 'Make a story' }));
  await expect(room(page)).toBeVisible();
}

/** What there is to choose from just now, by id, in the order it is offered. */
const offered = (page: Page): Promise<string[]> =>
  choices(page).evaluateAll((list) => list.map((each) => each.getAttribute('data-choice') ?? ''));

/** Make a choice, once what there is to choose from at this turn has come. */
async function choose(page: Page, press: Press, turn: string, id: string): Promise<void> {
  await expect(room(page)).toHaveAttribute('data-turn', turn);
  await expect(choice(page, id)).toBeVisible({ timeout: 30_000 });
  await press(choice(page, id));
}

const FOX_KITE = [
  ['who', 'fox'],
  ['where', 'beach'],
  ['seed', 'kite'],
  ['trouble', 'no-wind'],
  ['ending', 'run'],
] as const;

/** The way through whose last page has the most words: where the words of a page are likeliest not to fit. */
const LONGEST = [
  ['who', 'rabbit'],
  ['where', 'beach'],
  ['seed', 'sandcastle'],
  ['trouble', 'wave'],
  ['ending', 'ditch'],
] as const;

async function makeFoxAndKite(page: Page, press: Press): Promise<void> {
  for (const [turn, id] of FOX_KITE) await choose(page, press, turn, id);
  await expect(room(page)).toHaveAttribute('data-turn', 'whole');
  await expect(again(page)).toBeVisible({ timeout: 30_000 });
}

const soundOff = (page: Page) =>
  page.addInitScript((key) => {
    window.localStorage.setItem(
      key,
      JSON.stringify({ version: 1, sound: false, motion: 'system', graphics: 'pictures' }),
    );
  }, SETTINGS_KEY);

/** Everything in the room that can be pressed just now, with its size. */
const pressable = (page: Page) =>
  room(page)
    .locator('button:not([disabled]), a[href]')
    .evaluateAll((list) =>
      list.map((control) => {
        const box = control.getBoundingClientRect();
        return {
          name: (control.getAttribute('aria-label') ?? control.textContent).trim(),
          left: box.left,
          top: box.top,
          right: box.right,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
        };
      }),
    );

/** Nothing that can be pressed is too small for a small finger, off the screen, or over another. */
async function fits(page: Page, context: string): Promise<void> {
  await arrived(page);
  expect(await screenFit(page), context).toEqual({ sideways: [], taller: 0 });
  const found = await pressable(page);
  const screen = page.viewportSize() ?? { width: 0, height: 0 };
  for (const control of found) {
    expect(
      Math.min(control.width, control.height),
      `${context}: ${control.name}`,
    ).toBeGreaterThanOrEqual(55.5);
    expect(control.left, `${context}: ${control.name}`).toBeGreaterThanOrEqual(-0.5);
    expect(control.top, `${context}: ${control.name}`).toBeGreaterThanOrEqual(-0.5);
    expect(control.right, `${context}: ${control.name}`).toBeLessThanOrEqual(screen.width + 0.5);
    expect(control.bottom, `${context}: ${control.name}`).toBeLessThanOrEqual(screen.height + 0.5);
  }
  for (const [index, one] of found.entries()) {
    for (const other of found.slice(index + 1)) {
      const across = Math.min(one.right, other.right) - Math.max(one.left, other.left);
      const down = Math.min(one.bottom, other.bottom) - Math.max(one.top, other.top);
      expect(
        across > 0.5 && down > 0.5,
        `${context}: "${one.name}" and "${other.name}" share ${across.toFixed(1)} by ${down.toFixed(1)}`,
      ).toBe(false);
    }
  }
}

test.describe('Explorer Harbor: make a story', () => {
  test('is made by five taps on pictures, each page told as it is made, and it fits the screen at every turn @layout', async ({
    page,
    press,
  }) => {
    const said = await listenIn(page);
    await enter(page, press);
    await expect(page).toHaveURL(/\/world\/explorer-harbor\/room$/);
    await expect(room(page).getByRole('heading', { level: 1, name: 'Make a story' })).toBeVisible();

    // Who is it about? Three pictures, and the question is said.
    await expect(room(page)).toHaveAttribute('data-turn', 'who');
    expect(await offered(page)).toEqual(['fox', 'bear', 'rabbit']);
    await expect(choice(page, 'fox')).toHaveAccessibleName('Fox');
    await fits(page, 'who');
    await press(choice(page, 'fox'));

    // Where? The same three places whoever it is about, each with the one who was chosen in it.
    await expect(room(page)).toHaveAttribute('data-turn', 'where');
    expect(await offered(page)).toEqual(['beach', 'forest', 'garden']);
    await expect(choices(page).locator('[data-animal="fox"]')).toHaveCount(3);
    await fits(page, 'where');
    await press(choice(page, 'beach'));

    // What do they want? Two things, which belong to the beach.
    await expect(room(page)).toHaveAttribute('data-turn', 'seed');
    expect(await offered(page)).toEqual(['kite', 'sandcastle']);
    await expect(choice(page, 'kite')).toHaveAccessibleName('Fly a kite');
    await fits(page, 'what they want');
    await press(choice(page, 'kite'));

    // The first page is made, and told; then something goes wrong, two ways.
    await choose(page, press, 'trouble', 'no-wind');
    await choose(page, press, 'ending', 'run');
    await expect(room(page)).toHaveAttribute('data-turn', 'whole');
    await expect(again(page)).toBeVisible({ timeout: 30_000 });
    await expect(room(page)).toHaveAttribute('data-page', '3');
    await expect(told(page)).toHaveText(
      'So it was time to run! Along the sand, as fast as the wind, and up went the kite. Fox was happy. The end.',
    );
    await fits(page, 'a whole story');

    // Every question was put, and every page was told, in the order a story goes.
    await expect
      .poll(said, { timeout: 15_000 })
      .toEqual([
        'eh.make.who',
        'eh.make.where',
        'eh.make.want.fox',
        'eh.make.went.fox.beach',
        'eh.make.wanted.fox.kite',
        'eh.make.trouble',
        'eh.make.but.kite.no-wind',
        'eh.make.ending',
        'eh.make.so.kite.no-wind.run',
        'eh.make.happy.fox',
        'eh.make.whole',
      ]);
  });

  test('offers what the content says at every turn, and every way through comes to an end', async ({
    page,
    press,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'walked once, on the desktop');
    test.setTimeout(240_000);
    // With the sound off a page is told in the time it takes to turn, so twenty-four stories can be made.
    await soundOff(page);
    await enter(page, press);
    let made = 0;
    for (const [where, setting] of Object.entries(SETTINGS)) {
      for (const seed of setting.seeds) {
        const troubles = SEEDS[seed]?.troubles ?? {};
        for (const [trouble, { endings }] of Object.entries(troubles)) {
          for (const ending of Object.keys(endings)) {
            await choose(page, press, 'who', 'rabbit');
            await expect(room(page)).toHaveAttribute('data-turn', 'where');
            expect(await offered(page)).toEqual(Object.keys(SETTINGS));
            await press(choice(page, where));
            await expect(room(page)).toHaveAttribute('data-turn', 'seed');
            expect(await offered(page)).toEqual(setting.seeds);
            await press(choice(page, seed));
            await expect(choice(page, trouble)).toBeVisible();
            expect(await offered(page)).toEqual(Object.keys(troubles));
            await press(choice(page, trouble));
            await expect(choice(page, ending)).toBeVisible();
            expect(await offered(page)).toEqual(Object.keys(endings));
            await press(choice(page, ending));
            // It ends: the last page, with its words, and nothing left to choose.
            await expect(another(page)).toBeVisible();
            await expect(room(page)).toHaveAttribute('data-page', '3');
            await expect(told(page)).toContainText('Rabbit was happy. The end.');
            await expect(choices(page)).toHaveCount(0);
            made += 1;
            await press(another(page));
          }
        }
      }
    }
    expect(made).toBe(24);
  });

  test('turns a page with a leaf, going on and going back, and tells the whole story again from the first', async ({
    page,
    press,
  }) => {
    const said = await listenIn(page);
    await enter(page, press);
    await makeFoxAndKite(page, press);
    // The turns of the book from here on, as the page says them; and the page the book is open at each time a
    // line begins to be said. Both are written down in the page as they happen: asked for afterwards, a line
    // that began over the wrong page would have its right page by the time anyone looked.
    await page.evaluate(() => {
      const pages = document.querySelector('[data-testid="story-pages"]');
      const book = document.querySelector('[data-testid="story-room"]');
      const seen: string[] = [];
      const over: string[] = [];
      Object.assign(window, { turnsSeen: seen, saidOver: over });
      const note = () => {
        const now = pages?.getAttribute('data-turning') ?? '';
        if (seen.at(-1) !== now) seen.push(now);
      };
      note();
      new MutationObserver(note).observe(pages as Node, {
        attributes: true,
        attributeFilter: ['data-turning'],
      });
      window.addEventListener('training-academy:said', (event) => {
        over.push(
          `${(event as CustomEvent<string>).detail} on ${book?.getAttribute('data-page') ?? ''}`,
        );
      });
    });
    const before = (await said()).length;
    await press(again(page));
    // Back to the first page, and on through the second to the third.
    await expect(room(page)).toHaveAttribute('data-page', '1');
    await expect(told(page)).toHaveText(
      'One day, Fox went to the beach. Fox wanted to fly a kite.',
    );
    await expect(room(page)).toHaveAttribute('data-page', '2', { timeout: 30_000 });
    await expect(told(page)).toHaveText('But the wind stopped, and the kite fell down.');
    await expect(room(page)).toHaveAttribute('data-page', '3', { timeout: 30_000 });
    await expect(again(page)).toBeVisible({ timeout: 30_000 });
    expect((await said()).slice(before)).toEqual([
      'eh.make.told',
      'eh.make.went.fox.beach',
      'eh.make.wanted.fox.kite',
      'eh.make.but.kite.no-wind',
      'eh.make.so.kite.no-wind.run',
      'eh.make.happy.fox',
    ]);
    const turns = await page.evaluate(
      () => (window as unknown as { turnsSeen: string[] }).turnsSeen,
    );
    expect(turns).toEqual(['no', 'back', 'no', 'on', 'no', 'on', 'no']);
    // Each line was said over its own page: the telling is announced over the first, not the last.
    const over = await page.evaluate(() => (window as unknown as { saidOver: string[] }).saidOver);
    expect(over).toEqual([
      'eh.make.told on 1',
      'eh.make.went.fox.beach on 1',
      'eh.make.wanted.fox.kite on 1',
      'eh.make.but.kite.no-wind on 2',
      'eh.make.so.kite.no-wind.run on 3',
      'eh.make.happy.fox on 3',
    ]);
  });

  test('takes no choice while a page is being told, keeps the room for what will be offered, and marks the line being said', async ({
    page,
    press,
  }) => {
    await page.clock.install();
    await enter(page, press);
    await choose(page, press, 'who', 'bear');
    await choose(page, press, 'where', 'forest');
    await expect(room(page)).toHaveAttribute('data-turn', 'seed');
    await expect(choice(page, 'stream')).toBeVisible();
    const answers = room(page).getByTestId('story-answers');
    const roomBefore = await answers.boundingBox();
    await holdClock(page);
    await press(choice(page, 'stream'));
    // The page is being told from the moment it is made: nothing is there to choose from.
    const look = () =>
      room(page).evaluate((element) => {
        const now = element.querySelector('figcaption [data-now="true"]');
        return [
          element.getAttribute('data-telling'),
          String(element.querySelectorAll('button[data-choice]').length),
          now?.textContent.trim() ?? '',
        ].join(' | ');
      });
    // And the room they will come back into is kept, empty, while they are away.
    await expect(choices(page)).toHaveCount(0);
    expect(await answers.boundingBox()).toEqual(roomBefore);
    const seen = await watchFor(page, 14_000, look, 100);
    expect(seen).toEqual([
      'true | 0 | ',
      'true | 0 | One day, Bear went into the forest.',
      'true | 0 | Bear wanted to get across the stream.',
      'false | 2 | ',
    ]);
    // What is offered comes back into the room that was kept for it: nothing has moved.
    expect(await answers.boundingBox()).toEqual(roomBefore);
    expect(await offered(page)).toEqual(['broken', 'deep']);
  });

  test('says the question again when Glim is tapped, and tells no page twice', async ({
    page,
    press,
  }) => {
    const said = await listenIn(page);
    await enter(page, press);
    await choose(page, press, 'who', 'rabbit');
    await choose(page, press, 'where', 'garden');
    await choose(page, press, 'seed', 'picnic');
    await expect(choice(page, 'rain')).toBeVisible({ timeout: 30_000 });
    await expect.poll(async () => (await said()).at(-1)).toBe('eh.make.trouble');
    const before = (await said()).length;
    await press(room(page).getByRole('button', { name: 'Say it again' }));
    await expect.poll(async () => (await said()).slice(before)).toEqual(['eh.make.trouble']);
    // The choices are still there, and the book is where it was.
    expect(await offered(page)).toEqual(['rain', 'ants']);
    await expect(room(page)).toHaveAttribute('data-page', '1');
  });

  test('tells a page again from its first line when Glim is tapped while it is being told', async ({
    page,
    press,
  }) => {
    const said = await listenIn(page);
    await enter(page, press);
    await choose(page, press, 'who', 'bear');
    await choose(page, press, 'where', 'garden');
    await choose(page, press, 'seed', 'picnic');
    // The first page is being told: its second line has begun, and nothing is offered yet.
    await expect.poll(async () => (await said()).at(-1)).toBe('eh.make.wanted.bear.picnic');
    await expect(room(page)).toHaveAttribute('data-telling', 'true');
    const before = (await said()).length;
    await press(room(page).getByRole('button', { name: 'Say it again' }));
    // From the top: both lines of the page, and then the question it leads to.
    await expect
      .poll(async () => (await said()).slice(before), { timeout: 20_000 })
      .toEqual(['eh.make.went.bear.garden', 'eh.make.wanted.bear.picnic', 'eh.make.trouble']);
    expect(await offered(page)).toEqual(['rain', 'ants']);
  });

  test('has three small pages that turn to a page and tell it, once the story is whole and not before', async ({
    page,
    press,
  }) => {
    const said = await listenIn(page);
    await enter(page, press);
    const panels = room(page).locator('button[data-panel]');
    await expect(panels).toHaveCount(3);
    // Until the story is whole they are pictures of how far it has got, and nothing to press.
    for (const panel of await panels.all()) await expect(panel).toBeDisabled();
    const made = room(page).locator('button[data-panel][data-made="true"]');
    await expect(made).toHaveCount(0);
    // The first page is there from the moment someone is on it: it is put together as it is chosen.
    await choose(page, press, 'who', 'fox');
    await expect(made).toHaveCount(1);
    await expect(made.locator('[data-animal="fox"]')).toHaveCount(1);
    await choose(page, press, 'where', 'beach');
    await choose(page, press, 'seed', 'kite');
    await expect(made).toHaveCount(1);
    await choose(page, press, 'trouble', 'tangle');
    await expect(made).toHaveCount(2);
    await choose(page, press, 'ending', 'crab');
    await expect(again(page)).toBeVisible({ timeout: 30_000 });
    await expect(made).toHaveCount(3);
    for (const panel of await panels.all()) await expect(panel).toBeEnabled();

    const before = (await said()).length;
    await press(panels.nth(1));
    await expect(room(page)).toHaveAttribute('data-page', '2');
    await expect(panels.nth(1)).toHaveAttribute('aria-current', 'page');
    await expect(told(page)).toHaveText('But the string was all in a tangle.');
    await expect
      .poll(async () => (await said()).slice(before))
      .toEqual(['eh.make.but.kite.tangle']);
    // The book stays open where it was turned to, and what there is to do with the story is still offered.
    await expect(again(page)).toBeVisible({ timeout: 30_000 });
    await expect(room(page)).toHaveAttribute('data-page', '2');
  });

  test('works with the sound off: the pages turn, the words are there to read, and the sound can be switched on and off', async ({
    page,
    press,
  }) => {
    await soundOff(page);
    const said = await listenIn(page);
    await enter(page, press);
    await expect(room(page).getByText('Let us make a story. Who is it about?')).toBeVisible();
    await makeFoxAndKite(page, press);
    await expect(room(page)).toHaveAttribute('data-page', '3');
    await expect(told(page)).toContainText('Fox was happy. The end.');
    expect(await said()).toEqual([]);
    // Told again, each page stays to be looked at.
    await press(again(page));
    await expect(room(page)).toHaveAttribute('data-page', '1');
    await expect(told(page)).toHaveText(
      'One day, Fox went to the beach. Fox wanted to fly a kite.',
    );
    await expect(room(page)).toHaveAttribute('data-page', '2', { timeout: 15_000 });
    await expect(room(page)).toHaveAttribute('data-page', '3', { timeout: 15_000 });
    await expect(again(page)).toBeVisible({ timeout: 15_000 });
    // The sound can be switched on from here. The room then says where the story has got to, and does not
    // tell over again what it told in silence.
    const sound = room(page).getByRole('button', { name: 'Sound', exact: true });
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await press(sound);
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(said).toEqual(['eh.make.whole']);
    await expect(again(page)).toBeVisible();
    await expect(room(page)).toHaveAttribute('data-page', '3');
    // And off again, for a child to tell the story themselves: a small page then turns the book without a
    // word, and nothing else moves.
    await press(sound);
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await expect(room(page)).toHaveAttribute('data-page', '3');
    await press(room(page).locator('button[data-panel="1"]'));
    await expect(room(page)).toHaveAttribute('data-page', '1');
    await expect(told(page)).toHaveText(
      'One day, Fox went to the beach. Fox wanted to fly a kite.',
    );
    await expect(again(page)).toBeVisible();
    expect(await said()).toEqual(['eh.make.whole']);
  });

  test.describe('where nothing is to move', () => {
    test.use({ reducedMotion: 'reduce' });

    test('no leaf turns: the page is simply the next one, and the story is told all the same', async ({
      page,
      press,
    }) => {
      const said = await listenIn(page);
      await enter(page, press);
      await page.evaluate(() => {
        const seen: string[] = [];
        (window as unknown as { leavesSeen: string[] }).leavesSeen = seen;
        new MutationObserver(() => {
          for (const leaf of document.querySelectorAll('[data-testid="story-pages"] [data-way]')) {
            seen.push(getComputedStyle(leaf).display);
          }
        }).observe(document.querySelector('[data-testid="story-room"]') as Node, {
          childList: true,
          subtree: true,
        });
      });
      await makeFoxAndKite(page, press);
      await expect(room(page)).toHaveAttribute('data-page', '3');
      await expect.poll(async () => (await said()).at(-1)).toBe('eh.make.whole');
      const leaves = await page.evaluate(
        () => (window as unknown as { leavesSeen: string[] }).leavesSeen,
      );
      expect(new Set(leaves)).toEqual(new Set(['none']));
    });
  });

  test('can be made from the keyboard, and the keyboard is never left with nothing', async ({
    page,
    press,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'a keyboard journey: the desktop only');
    await soundOff(page);
    await enter(page, press);
    await choices(page).first().focus();
    for (const [turn, id] of [
      ['who', 'bear'],
      ['where', 'garden'],
      ['seed', 'apple'],
      ['trouble', 'rolled'],
      ['ending', 'duck'],
    ] as const) {
      await expect(room(page)).toHaveAttribute('data-turn', turn);
      await expect(choices(page).first()).toBeFocused();
      // To the one that is wanted, by Tab, and chosen with Enter.
      const wanted = (await offered(page)).indexOf(id);
      for (let step = 0; step < wanted; step++) await page.keyboard.press('Tab');
      await expect(choice(page, id)).toBeFocused();
      await page.keyboard.press('Enter');
    }
    await expect(room(page)).toHaveAttribute('data-turn', 'whole');
    // The keyboard is on what there is to do next.
    await expect(again(page)).toBeFocused();
    await expect(told(page)).toContainText('A duck pushed it back to the bank with its beak.');
    await page.keyboard.press('Tab');
    await expect(another(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(room(page)).toHaveAttribute('data-turn', 'who');
    await expect(choices(page).first()).toBeFocused();
  });

  test('keeps nothing: what is stored on the device is what was there before, and a story is gone when the room is left', async ({
    page,
    press,
  }) => {
    await soundOff(page);
    await enter(page, press);
    const stored = () =>
      page.evaluate(async () => {
        const names = (await indexedDB.databases()).map((each) => each.name);
        return { local: Object.keys(localStorage).sort(), databases: names.sort() };
      });
    const before = await stored();
    await makeFoxAndKite(page, press);
    expect(await stored()).toEqual(before);
    await press(room(page).getByRole('link', { name: 'Back to Explorer Harbor' }));
    await expect(page.getByRole('heading', { level: 1, name: 'Explorer Harbor' })).toBeVisible();
    await press(page.getByRole('link', { name: 'Make a story' }));
    await expect(room(page)).toHaveAttribute('data-turn', 'who');
    await expect(room(page).locator('button[data-panel][data-made="true"]')).toHaveCount(0);
  });

  // Screens that no project has: where there is least room for a book and pictures to choose from.
  for (const [what, width, height] of [
    ['a phone held sideways (844 by 390)', 844, 390],
    ['an iPhone 13 held sideways, in Safari (750 by 342)', 750, 342],
    ['the narrowest phone held sideways, in its browser (640 by 256)', 640, 256],
    ['the narrowest phone upright (320 by 568)', 320, 568],
  ] as const) {
    test.describe(`on ${what}`, () => {
      test.use({ viewport: { width, height } });

      test('every picture to choose from is a fair target, the page is large enough to see, and nothing scrolls', async ({
        page,
        press,
      }, testInfo) => {
        test.skip(testInfo.project.name !== 'phone', 'measured once, as a touch phone');
        await soundOff(page);
        await enter(page, press);
        await fits(page, 'who');
        const pages = room(page).getByTestId('story-pages');
        const atFirst = await pages.boundingBox();
        // The story whose last page has the most words of any: a hundred and twenty-three letters and spaces.
        for (const [turn, id] of LONGEST) {
          await choose(page, press, turn, id);
          if (turn === 'ending') await expect(again(page)).toBeVisible();
          else await expect(choices(page).first()).toBeVisible();
          await fits(page, `after ${turn}`);
          // The book is where it was and the size it was: nothing moves under a finger as the story goes on.
          expect(await pages.boundingBox(), `the book after ${turn}`).toEqual(atFirst);
        }
        await expect(told(page)).toHaveText(
          'So a ditch was dug all round a new castle. The next wave filled the ditch, and the castle stood. Rabbit was happy. The end.',
        );
        const book = await pages.boundingBox();
        // A page is a picture to look at: never smaller than a hundred and fifty points across.
        expect(book?.width ?? 0).toBeGreaterThanOrEqual(150);
        expect(Math.abs((book?.width ?? 0) / (book?.height ?? 1) - 100 / 68)).toBeLessThan(0.08);
      });
    });
  }

  test('passes the automated accessibility checks at each kind of moment', async ({
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
    await soundOff(page);
    await enter(page, press);
    await check('nothing chosen');
    await choose(page, press, 'who', 'rabbit');
    await choose(page, press, 'where', 'forest');
    await choose(page, press, 'seed', 'berries');
    await expect(choice(page, 'high')).toBeVisible();
    await check('the first page made');
    await choose(page, press, 'trouble', 'high');
    await choose(page, press, 'ending', 'log');
    await expect(again(page)).toBeVisible();
    await check('a whole story');
  });
});

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

test.describe('Explorer Harbor’s page: what a grown-up says of a story', () => {
  test('is a switch they hold to say a story was told back: their word, kept with its day, and nothing of the story', async ({
    page,
    press,
  }) => {
    const told = page.locator('[data-testid="tried"][data-lesson="eh-make-story"]');
    // Nobody has played on this device yet: there is nobody to say it of, and no switch.
    await page.goto('/world/explorer-harbor');
    await worldSettled(page);
    await expect(told).toHaveCount(0);
    // The room is there for anyone, and its note says what it is.
    await expect(page.getByRole('link', { name: 'Make a story' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'For grown-ups' })).toContainText(
      'every choice is a good one: nothing is marked, nothing is counted and nothing is kept',
    );
    // Someone begins an activity, and comes back to the harbour's page.
    await page.goto('/world/explorer-harbor/play/eh-story-01');
    await expect(myTurn(page)).toBeVisible();
    await page.goto('/world/explorer-harbor');
    await worldSettled(page);
    await expect(told).toHaveCount(1);
    await expect(told).toHaveAttribute('data-tried', 'false');
    // The switch is a paragraph of the grown-ups' part of the page like the others, and has not taken their
    // room: everything in that part is as wide as the part is. (It was not. The switch asked for a second
    // column, as it has in the list above; the part then had two, and every other thing in it, a heading
    // and a paragraph among them, was left in a column of no width, one letter to a line. Nothing overflowed
    // and nothing was hidden, so no test said so: a picture of the page did.)
    const forGrownUps = page.getByRole('region', { name: 'For grown-ups' });
    const wide = (await forGrownUps.boundingBox())?.width ?? 0;
    expect(wide).toBeGreaterThan(200);
    const parts = await forGrownUps.evaluate((section) =>
      [...section.children].map((part) => ({
        what: `${part.tagName.toLowerCase()} "${part.textContent.trim().slice(0, 24)}"`,
        width: part.getBoundingClientRect().width,
      })),
    );
    expect(parts.length).toBeGreaterThanOrEqual(6);
    for (const part of parts) expect(part.width, part.what).toBeGreaterThan(wide * 0.75);
    // And the page as it now is, with someone playing and the switch on it, passes the automated checks.
    await arrived(page);
    const checked = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      checked.violations.map(
        (violation) =>
          `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
      ),
    ).toEqual([]);
    await expect(told).toContainText(
      'Hold to say your child told a story back in their own words.',
    );
    const held = told.getByRole('button', { name: 'They told it back' });
    await expect(held).toHaveAttribute('aria-pressed', 'false');
    const box = await held.boundingBox();
    expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(48);
    expect((await screenFit(page)).sideways).toEqual([]);

    // A tap does nothing to it: it is on a page a child taps.
    await press(held);
    await expect(held).toHaveAttribute('aria-pressed', 'false');
    await expect(told).toHaveAttribute('data-tried', 'false');

    // Held, it changes; and it says whose word it is, and what day it was said.
    await holdUntil(page, held, true);
    await expect(told).toHaveAttribute('data-tried', 'true');
    const today = await page.evaluate(() => {
      const now = new Date();
      const month = now.toLocaleString('en-GB', { month: 'long' });
      return `${String(now.getDate())} ${month} ${String(now.getFullYear())}`;
    });
    await expect(told).toContainText(
      `Told back on ${today}. That is your word: the game did not hear it.`,
    );
    // Only that: nothing is said to have been tried away from the screen.
    await expect(page.locator('[data-testid="tried"][data-tried="true"]')).toHaveCount(1);

    // It is kept, and it can be taken back the same way.
    await page.reload();
    await worldSettled(page);
    await expect(told).toHaveAttribute('data-tried', 'true');
    await holdUntil(page, told.getByRole('button', { name: 'They told it back' }), false);
    await expect(told).toHaveAttribute('data-tried', 'false');
    await page.reload();
    await worldSettled(page);
    await expect(told).toHaveAttribute('data-tried', 'false');
  });
});
