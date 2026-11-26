import {
  PINS_APART,
  dragged,
  inSight,
  seen,
  viewOf,
  wrap,
  type LonLat,
  type View,
} from '../src/content/explorer-harbor/globe';
import places from '../src/content/explorer-harbor/places.json' with { type: 'json' };
import type { Challenge } from '../src/engine';
import {
  BACK_AFTER_MS,
  SLOP,
  TIP_STEP,
  TURN_MS,
  TURN_STEP,
} from '../src/game/worlds/explorer-harbor/turning';
import { arrived, expect, myTurn, next, screenFit, test, type Page } from './fixtures';
import { answer, challengeOnScreen } from './play';

/**
 * Explorer Harbor's globe: the seven big lands, found by shape and by name, and fifteen famous places.
 *
 * What these tests care about most is that a pin is exactly where the content says its land is, wherever the
 * globe has been turned to; that a globe a child has turned can always be answered on, or turns back until it
 * can; that turning it is never taken for an answer; and that it can be turned by a finger, by two buttons and
 * by the keyboard.
 */

const lesson = (page: Page) => page.getByTestId('lesson');
const globe = (page: Page) => page.getByTestId('globe');
const play = (id: string) => `/world/explorer-harbor/play/${id}`;
const caption = (page: Page) => lesson(page).getByRole('status');

const MIDDLES: Readonly<Record<string, { name: string; at: number[] }>> = places.continents;
const middleOf = (land: string): LonLat => {
  const [lon = 0, lat = 0] = MIDDLES[land]?.at ?? [];
  return [lon, lat];
};
const placeOf = (value: unknown): LonLat => {
  const [lon, lat] = value as number[];
  return [lon ?? 0, lat ?? 0];
};

interface Asked {
  ask: string;
  want: string;
  home: View;
  landmark: string | null;
  place: LonLat | null;
  pins: { id: string; at: LonLat }[];
  answer: string;
}

/** What the question on the screen is made of, as the content has it. */
async function asked(page: Page): Promise<Asked> {
  const challenge: Challenge = await challengeOnScreen(page);
  if (challenge.kind !== 'choose-one' || challenge.prompt.stimulus.type !== 'scene') {
    throw new Error('A question on the globe is a question with choices.');
  }
  const { of } = challenge.prompt.stimulus;
  const [lon, lat] = placeOf(of.view);
  return {
    ask: String(of.ask),
    want: String(of.want),
    home: { lon, lat },
    landmark: typeof of.landmark === 'string' ? of.landmark : null,
    place: Array.isArray(of.at) ? placeOf(of.at) : null,
    pins: challenge.choices.map((choice) => ({
      id: choice.id,
      at: placeOf(choice.stimulus.type === 'scene' ? choice.stimulus.of.at : []),
    })),
    answer: challenge.answer,
  };
}

/** The globe as it is drawn: where it is looking, and where each pin is on it, in globe radii from its middle. */
async function onScreen(page: Page) {
  return page.evaluate(() => {
    const box = document.querySelector<HTMLElement>('[data-testid="globe"]');
    const drawing = box?.querySelector<SVGSVGElement>('svg[data-scene="globe"]');
    if (!box || !drawing) throw new Error('There is no globe on the screen.');
    const frame = drawing.getBoundingClientRect();
    // The ball is 100 of the picture's 104 units from its middle to its edge.
    const radius = (frame.width / 2) * (100 / 104);
    const middle = { x: frame.left + frame.width / 2, y: frame.top + frame.height / 2 };
    const sized = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        size: Math.min(rect.width, rect.height),
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    };
    return {
      // Nought is nought, whichever side of it the arithmetic came from.
      view: { lon: Number(drawing.dataset.lon) + 0, lat: Number(drawing.dataset.lat) + 0 },
      turning: box.dataset.turning === 'true',
      square: Math.abs(frame.width - frame.height) < 0.5,
      width: frame.width,
      radius,
      middle,
      lit: drawing.querySelector<SVGElement>('[data-lit="true"]')?.dataset.land ?? null,
      pins: [...box.querySelectorAll<HTMLElement>('li')].map((item) => {
        const button = item.querySelector<HTMLElement>('[data-choice]');
        const at = sized(item);
        return {
          ...at,
          id: button?.dataset.choice ?? '',
          state: button?.dataset.state ?? '',
          behind: item.dataset.behind === 'true',
          inert: item.inert,
          // In globe radii from the middle of the ball: x to the right, y down.
          rx: (at.x - middle.x) / radius,
          ry: (at.y - middle.y) / radius,
        };
      }),
      turns: [...document.querySelectorAll<HTMLElement>('[data-turn]')].map(sized),
      wanted: [...document.querySelectorAll<HTMLElement>('[data-wanted]')].map((tile) => ({
        ...sized(tile),
        what: tile.dataset.wanted ?? '',
        shape: tile.querySelector<SVGElement>('[data-shape]')?.dataset.shape ?? null,
        landmark: tile.querySelector<SVGElement>('[data-landmark]')?.dataset.landmark ?? null,
      })),
    };
  });
}

/** A view as the globe says it: to a tenth of a degree. */
const said = (view: View): View => ({
  lon: Number(wrap(view.lon).toFixed(1)) + 0,
  lat: Number(view.lat.toFixed(1)) + 0,
});

/** Wait until the globe is looking where it should, and is at rest there. */
async function looksAt(page: Page, view: View): Promise<void> {
  await expect
    .poll(async () => (await onScreen(page)).view, { timeout: 8000, intervals: [50, 100, 150] })
    .toEqual(said(view));
  await expect(globe(page)).toHaveAttribute('data-turning', 'false');
}

/**
 * Have the page keep every place the globe looks at, from now on. A globe that has been turned to where a pin
 * is out of sight turns back a moment later, and a test that only looked now and then could miss where it had
 * been: on a slow machine a moment is nothing.
 */
async function watchViews(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const drawing = document.querySelector<SVGSVGElement>(
      '[data-testid="globe"] svg[data-scene="globe"]',
    );
    const been: string[] = [];
    (window as unknown as { globeBeen: string[] }).globeBeen = been;
    if (!drawing) return;
    const note = () => been.push(`${drawing.dataset.lon ?? ''},${drawing.dataset.lat ?? ''}`);
    note();
    new MutationObserver(note).observe(drawing, {
      attributes: true,
      attributeFilter: ['data-lon', 'data-lat'],
    });
  });
  return () => page.evaluate(() => (window as unknown as { globeBeen: string[] }).globeBeen);
}
const written = (view: View): string => `${wrap(view.lon).toFixed(1)},${view.lat.toFixed(1)}`;

/**
 * Turn the globe by a button or a key, and wait for what comes of it: the globe gets to where the turn takes
 * it, and then rests, there if every pin that can be chosen is in sight from there, and back where the question
 * is asked from if one is not. Returns where it rests.
 *
 * Where the turn takes it has to be somewhere it has been since the turn was asked for: having been there before
 * proves nothing. (A turn back to where the question is asked from is back to where the globe started.)
 */
async function turned(
  page: Page,
  been: () => Promise<string[]>,
  question: Asked,
  to: View,
  turn: () => Promise<void>,
): Promise<View> {
  const before = (await been()).length;
  await turn();
  await expect
    .poll(async () => (await been()).slice(before), { timeout: 8000 })
    .toContain(written(to));
  const lost = question.pins.some((pin) => !inSight(to, pin.at));
  const rest = lost ? question.home : to;
  await looksAt(page, rest);
  return rest;
}

/** Every pin is drawn over the place it stands for, as the globe is turned now. */
async function pinsAreInPlace(page: Page, question: Asked, landed: LonLat | null = null) {
  const drawn = await onScreen(page);
  expect(drawn.square).toBe(true);
  for (const pin of question.pins) {
    const found = drawn.pins.find((each) => each.id === pin.id);
    if (!found) throw new Error(`Pin ${pin.id} is not on the globe.`);
    // The pin of a famous place that has been found stands on the place itself.
    const at = landed !== null && pin.id === question.answer ? landed : pin.at;
    const where = seen(drawn.view, at);
    expect(Math.abs(found.rx - where.x), `${pin.id} across`).toBeLessThan(0.012);
    expect(Math.abs(found.ry - where.y), `${pin.id} down`).toBeLessThan(0.012);
    expect(found.behind, `${pin.id} out of sight`).toBe(!inSight(drawn.view, at));
    expect(found.inert, `${pin.id} cannot be pressed`).toBe(found.behind);
  }
  return drawn;
}

/** Nothing there is to press on the board shares any of the screen with anything else there is to press. */
function apartFromOneAnother(drawn: Awaited<ReturnType<typeof onScreen>>, least = 56) {
  const round = [
    ...drawn.pins.filter((pin) => !pin.behind).map((pin) => ({ ...pin, name: `pin ${pin.id}` })),
    ...drawn.turns.map((turn, index) => ({ ...turn, name: `turning button ${String(index)}` })),
  ];
  for (const each of round) expect(each.size, each.name).toBeGreaterThanOrEqual(least - 0.5);
  for (const a of round) {
    for (const b of round) {
      if (a.name >= b.name) continue;
      const apart = Math.hypot(a.x - b.x, a.y - b.y);
      // Each is round: they share nothing when their middles are as far apart as their two halves together.
      expect(apart, `${a.name} and ${b.name}`).toBeGreaterThanOrEqual((a.size + b.size) / 2 - 0.5);
    }
  }
}

/** How far the first move of a pull goes: further than a press may slip, so that it is known to be a pull. */
const FIRST_MOVE = SLOP * 1.5;

/**
 * Pull the globe with a finger, where the browser can be given a real one (Chromium, on a touch screen), and
 * with the mouse held down elsewhere. The first move is just far enough to be a pull and not a press, and the
 * globe is waited for to say that it is being pulled: what moves it is everything after that, in nine moves.
 */
async function pull(
  page: Page,
  finger: boolean,
  from: { x: number; y: number },
  by: { dx: number; dy: number },
): Promise<void> {
  const far = Math.hypot(by.dx, by.dy);
  const first = { x: from.x + (by.dx * FIRST_MOVE) / far, y: from.y + (by.dy * FIRST_MOVE) / far };
  const rest = (move: number) => ({
    x: first.x + ((from.x + by.dx - first.x) * move) / 9,
    y: first.y + ((from.y + by.dy - first.y) * move) / 9,
  });
  const pulling = () => expect(globe(page)).toHaveAttribute('data-pulling', 'true');
  if (finger) {
    const session = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', point = from) =>
      session.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ ...point, id: 1 }],
      });
    await touch('touchStart');
    await touch('touchMove', first);
    await pulling();
    for (let move = 1; move <= 9; move++) await touch('touchMove', rest(move));
    await touch('touchEnd');
    await session.detach();
    return;
  }
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(first.x, first.y);
  await pulling();
  for (let move = 1; move <= 9; move++) await page.mouse.move(rest(move).x, rest(move).y);
  await page.mouse.up();
}

/** Where a pull of so many pixels leaves the globe: its first move only says that it is a pull. */
function pulledTo(from: View, by: { dx: number; dy: number }, radius: number): View {
  const counts = 1 - FIRST_MOVE / Math.hypot(by.dx, by.dy);
  return dragged(from, (by.dx * counts) / radius, (by.dy * counts) / radius);
}

/** Have the page note whether the globe is ever seen turning by itself, from now on. */
async function watchTurning(page: Page): Promise<() => Promise<boolean>> {
  await page.evaluate(() => {
    const box = document.querySelector('[data-testid="globe"]');
    const seenTurning = { ever: box?.getAttribute('data-turning') === 'true' };
    (window as unknown as { globeTurned: { ever: boolean } }).globeTurned = seenTurning;
    if (!box) return;
    new MutationObserver(() => {
      if (box.getAttribute('data-turning') === 'true') seenTurning.ever = true;
    }).observe(box, { attributes: true, attributeFilter: ['data-turning'] });
  });
  return () =>
    page.evaluate(() => (window as unknown as { globeTurned: { ever: boolean } }).globeTurned.ever);
}

test.describe('the globe: the seven big lands', () => {
  test('every pin is on the globe where its land is, in sight and clear of the others; the land that is found is lit and looked at @layout', async ({
    page,
    press,
  }) => {
    await page.goto(play('eh-lands-01'));
    await expect(page.getByTestId('globe-board')).toHaveAttribute('data-ask', 'shape');
    // The demonstration finds Africa: the land is lit, its pin is ticked, and the globe looks at it.
    await expect(globe(page)).toHaveAttribute('data-same', 'true');
    const shown = await asked(page);
    expect(shown.want).toBe('africa');
    await looksAt(page, viewOf([middleOf('africa')]));
    expect((await pinsAreInPlace(page, shown)).lit).toBe('africa');
    const everTurning = await watchTurning(page);
    await press(myTurn(page));

    // Two questions of the practice.
    for (const want of ['south-america', 'oceania']) {
      const question = await asked(page);
      expect(question.want).toBe(want);
      expect(question.pins).toHaveLength(3);
      await expect(caption(page)).toHaveText(
        `This is the shape of ${MIDDLES[want]?.name ?? ''}. Find ${MIDDLES[want]?.name ?? ''} on the globe.`,
      );
      // The globe turns to where the question is asked from, and every pin goes with it.
      await looksAt(page, question.home);
      await arrived(page);
      const drawn = await pinsAreInPlace(page, question);
      expect(drawn.lit).toBeNull();
      for (const pin of drawn.pins) expect(pin.behind, pin.id).toBe(false);
      // What is asked for is the shape of that land, and nothing else.
      expect(drawn.wanted.map((tile) => [tile.what, tile.shape])).toEqual([['shape', want]]);
      await expect(lesson(page).locator('[data-wanted] [data-landmark]')).toHaveCount(0);
      const fit = await screenFit(page);
      expect(fit.sideways).toEqual([]);
      expect(fit.taller).toBe(0);
      apartFromOneAnother(drawn);
      // As the content promises: no two pins nearer than so much of the ball's radius.
      for (const a of drawn.pins) {
        for (const b of drawn.pins) {
          if (a.id >= b.id) continue;
          expect(Math.hypot(a.rx - b.rx, a.ry - b.ry)).toBeGreaterThanOrEqual(PINS_APART - 0.02);
        }
      }
      // Every pin is called by where it is, and none by the name of its land.
      for (const pin of question.pins) {
        const label = await lesson(page)
          .locator(`[data-choice="${pin.id}"]`)
          .getAttribute('aria-label');
        expect(label).toMatch(/^The land (at the|on the|in the) /);
        for (const land of Object.values(MIDDLES)) expect(label).not.toContain(land.name);
      }

      await answer(page, press);
      await expect(caption(page)).toHaveText(`Yes. That is ${MIDDLES[want]?.name ?? ''}.`);
      await expect(lesson(page).locator(`[data-choice="${question.answer}"]`)).toHaveAttribute(
        'data-state',
        'same',
      );
      // Found, the land is lit, and the globe turns to look straight at it.
      await looksAt(page, viewOf([middleOf(want)]));
      expect((await pinsAreInPlace(page, question)).lit).toBe(want);
      await press(next(page));
    }
    // With things free to move, the globe was seen turning by itself: to each question, and to each land found.
    expect(await everTurning()).toBe(true);
  });

  test('a wrong land is set aside, and help points at the shape and then takes lands away', async ({
    page,
    press,
  }) => {
    await page.goto(play('eh-lands-01'));
    await press(myTurn(page));
    const question = await asked(page);
    await looksAt(page, question.home);
    await answer(page, press, false);
    await expect(caption(page)).toHaveText('Not that one. Look at its shape again.');
    await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(1);
    // The globe stays where it was: nothing has been found.
    expect((await onScreen(page)).view).toEqual(said(question.home));
    expect((await onScreen(page)).lit).toBeNull();

    await press(page.getByRole('button', { name: 'Help me' }));
    await expect(caption(page)).toHaveText(
      'Look at the shape. Which land on the globe is the same shape?',
    );
    await expect(page.getByTestId('wanted')).toHaveAttribute('data-helping', 'true');
    await answer(page, press);
    await expect(caption(page)).toHaveText(`Yes. That is ${MIDDLES[question.want]?.name ?? ''}.`);
    await expect(page.getByTestId('wanted')).toHaveAttribute('data-helping', 'false');
  });

  test('a land that is only named has nothing to match until help is asked for: then its shape', async ({
    page,
    press,
  }) => {
    // In by a tap, as a child comes in: an activity for listening does not start until the audio is awake.
    await page.goto('/world/explorer-harbor');
    await press(page.locator('[data-lesson="eh-lands-02"]'));
    await expect(page.getByTestId('globe-board')).toHaveAttribute('data-ask', 'name');
    // Shown, the land is found by Glim: only then is its shape there to see.
    await expect(globe(page)).toHaveAttribute('data-same', 'true');
    await expect(lesson(page).locator('[data-wanted="shape"] [data-shape="africa"]')).toHaveCount(
      1,
    );
    await press(myTurn(page));

    const question = await asked(page);
    await looksAt(page, question.home);
    await expect(caption(page)).toHaveText(`Which land is ${MIDDLES[question.want]?.name ?? ''}?`);
    // A sound, and no shape anywhere on the page.
    await expect(lesson(page).locator('[data-wanted="heard"]')).toHaveCount(1);
    await expect(lesson(page).locator('[data-shape]')).toHaveCount(0);
    await pinsAreInPlace(page, question);

    const help = page.getByRole('button', { name: 'Help me' });
    await press(help);
    await expect(caption(page)).toHaveText('Here is its shape. Which land is the same shape?');
    await expect(
      lesson(page).locator(`[data-wanted="shape"] [data-shape="${question.want}"]`),
    ).toHaveCount(1);
    await expect(lesson(page).locator('[data-wanted="heard"]')).toHaveCount(0);
    await expect(lesson(page).locator('[data-choice][data-state="open"]')).toHaveCount(3);
    await press(help);
    await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(1);
    await press(help);
    await expect(caption(page)).toHaveText('It is this one.');
    await expect(lesson(page).locator(`[data-choice="${question.answer}"]`)).toHaveAttribute(
      'data-state',
      'same',
    );
    await answer(page, press);
    await expect(caption(page)).toHaveText(`Yes. That is ${MIDDLES[question.want]?.name ?? ''}.`);
    await looksAt(page, viewOf([middleOf(question.want)]));
  });
});

test.describe('the globe: famous places', () => {
  test('a famous place is shown with the shape of its land, and is put on the globe where it is when its land is found @layout', async ({
    page,
    press,
  }) => {
    await page.goto(play('eh-places-01'));
    await expect(page.getByTestId('globe-board')).toHaveAttribute('data-ask', 'place');
    // The demonstration: the pyramids are put where they are, in the north-east of Africa.
    await expect(globe(page)).toHaveAttribute('data-same', 'true');
    const shown = await asked(page);
    expect(shown.landmark).toBe('pyramids');
    if (!shown.place) throw new Error('A famous place has a place.');
    await looksAt(page, viewOf([shown.place, middleOf('africa')]));
    await expect(
      lesson(page).locator('[data-choice][data-landed="true"] [data-landmark="pyramids"]'),
    ).toHaveCount(1);
    await pinsAreInPlace(page, shown, shown.place);
    await press(myTurn(page));

    for (const landmark of ['eiffel-tower', 'great-wall']) {
      const question = await asked(page);
      expect(question.landmark).toBe(landmark);
      if (!question.place) throw new Error('A famous place has a place.');
      await looksAt(page, question.home);
      await arrived(page);
      const drawn = await pinsAreInPlace(page, question);
      // Beside the globe: the place, and the shape of the land it is in. On the globe: three plain pins.
      expect(drawn.wanted.map((tile) => [tile.what, tile.landmark, tile.shape])).toEqual([
        ['place', landmark, null],
        ['shape', null, question.want],
      ]);
      await expect(globe(page).locator('[data-landmark]')).toHaveCount(0);
      const fit = await screenFit(page);
      expect(fit.sideways).toEqual([]);
      expect(fit.taller).toBe(0);
      apartFromOneAnother(drawn);
      for (const tile of drawn.wanted) expect(tile.size, tile.what).toBeGreaterThanOrEqual(48);

      await answer(page, press);
      // The picture stands on the place itself, and the globe has turned to it and to the middle of its land.
      await looksAt(page, viewOf([question.place, middleOf(question.want)]));
      const found = await pinsAreInPlace(page, question, question.place);
      expect(found.lit).toBe(question.want);
      await expect(
        globe(page).locator(
          `[data-choice="${question.answer}"][data-landed="true"] [data-landmark="${landmark}"]`,
        ),
      ).toHaveCount(1);
      await expect(caption(page)).toHaveText(/^Yes\. .+ (is|are) in .+\.$/);
      await press(next(page));
    }
  });
});

test.describe('turning the globe', () => {
  test('a finger turns it, the pins go with the land, and a pin under the finger is not pressed', async ({
    page,
    press,
    browserName,
    hasTouch,
  }) => {
    await page.goto(play('eh-lands-01'));
    await press(myTurn(page));
    const question = await asked(page);
    await looksAt(page, question.home);
    await arrived(page);
    const before = await onScreen(page);
    const step = await lesson(page).getAttribute('data-challenge');
    const words = await caption(page).textContent();

    // From the middle of a pin, a quarter of the globe's width to the right and a little down.
    const [pin] = before.pins;
    if (!pin) throw new Error('There is no pin to start on.');
    const by = { dx: before.width * 0.25, dy: before.width * 0.05 };
    await pull(page, browserName === 'chromium' && hasTouch, { x: pin.x, y: pin.y }, by);
    const after = await pinsAreInPlace(page, question);
    const want = pulledTo(before.view, by, before.radius);
    // Pulled right, the globe shows what was to the west; pulled down, what was to the north.
    expect(after.view.lon).toBeLessThan(before.view.lon);
    expect(after.view.lat).toBeGreaterThan(before.view.lat);
    expect(Math.abs(wrap(after.view.lon - want.lon))).toBeLessThan(1.5);
    expect(Math.abs(after.view.lat - want.lat)).toBeLessThan(1.5);
    // Nothing was answered: the same question, said the same way, with every pin still to choose.
    await expect(lesson(page)).toHaveAttribute('data-challenge', step ?? '');
    await expect(caption(page)).toHaveText(words ?? '');
    await expect(lesson(page).locator('[data-choice][data-state="open"]')).toHaveCount(3);
    await expect(globe(page)).toHaveAttribute('data-pulling', 'false');

    // And a press that does not move is a press still.
    await answer(page, press);
    await expect(caption(page)).toHaveText(`Yes. That is ${MIDDLES[question.want]?.name ?? ''}.`);
  });

  test('a pin pressed straight after the globe has been flicked is pressed', async ({
    page,
    press,
    browserName,
    hasTouch,
  }) => {
    // For a fifth of a second after a flick, Chromium makes no click of a tap: the board does not wait for one.
    await page.goto(play('eh-lands-01'));
    await press(myTurn(page));
    const question = await asked(page);
    await looksAt(page, question.home);
    await arrived(page);
    const before = await onScreen(page);
    // A short flick, from the sea in the middle of the globe if no pin is there: every pin stays in sight.
    const clear = before.pins.every(
      (pin) => Math.hypot(pin.x - before.middle.x, pin.y - before.middle.y) > pin.size / 2 + 4,
    );
    const start = clear
      ? before.middle
      : { x: before.middle.x, y: before.middle.y + before.radius * 0.9 };
    const by = { dx: before.width * 0.14, dy: 0 };
    const after = pulledTo(before.view, by, before.radius);
    for (const pin of question.pins) expect(inSight(after, pin.at), pin.id).toBe(true);
    await pull(page, browserName === 'chromium' && hasTouch, start, by);
    // At once: nothing is waited for between the flick and the press.
    await press(lesson(page).locator(`[data-choice="${question.answer}"]`));
    await expect(caption(page)).toHaveText(`Yes. That is ${MIDDLES[question.want]?.name ?? ''}.`);
    // Once: the press was taken as the finger came up, and the click that follows it is the same press.
    await expect(lesson(page).locator(`[data-choice="${question.answer}"]`)).toHaveAttribute(
      'data-state',
      'same',
    );
    await expect(lesson(page).locator('[data-choice][data-state="away"]')).toHaveCount(0);
  });

  test('turned until a pin is out of sight, it cannot be answered wrongly by where the pin was, and it comes back by itself', async ({
    page,
    press,
    browserName,
    hasTouch,
  }) => {
    await page.goto(play('eh-lands-01'));
    await press(myTurn(page));
    const question = await asked(page);
    await looksAt(page, question.home);
    await arrived(page);
    const before = await onScreen(page);
    const step = await lesson(page).getAttribute('data-challenge');

    // Most of the globe's width, and again, until every pin has gone round the back of the world.
    const finger = browserName === 'chromium' && hasTouch;
    const start = { x: before.middle.x - before.width * 0.35, y: before.middle.y };
    for (let pulls = 0; pulls < 4; pulls++) {
      await pull(page, finger, start, { dx: before.width * 0.7, dy: 0 });
      if ((await onScreen(page)).pins.every((pin) => pin.behind)) break;
    }
    const away = await pinsAreInPlace(page, question);
    expect(Math.abs(wrap(away.view.lon - before.view.lon))).toBeGreaterThan(100);
    expect(away.pins.every((pin) => pin.behind && pin.inert)).toBe(true);
    // A tap where a pin would be, if the world were glass, is a tap on the sea.
    const [ghost] = away.pins;
    if (!ghost) throw new Error('There is no pin.');
    if (hasTouch) await page.touchscreen.tap(ghost.x, ghost.y);
    else await page.mouse.click(ghost.x, ghost.y);
    await expect(lesson(page)).toHaveAttribute('data-challenge', step ?? '');
    await expect(lesson(page).locator('[data-choice][data-state="open"]')).toHaveCount(3);

    // Left alone, it turns back to where the question can be answered.
    await looksAt(page, question.home);
    const back = await pinsAreInPlace(page, question);
    expect(back.pins.every((pin) => !pin.behind && !pin.inert)).toBe(true);
    await answer(page, press);
    await expect(caption(page)).toHaveText(`Yes. That is ${MIDDLES[question.want]?.name ?? ''}.`);
  });

  test('two buttons turn it a step at a time, and they are not answers', async ({
    page,
    press,
  }) => {
    await page.goto(play('eh-lands-01'));
    await press(myTurn(page));
    const question = await asked(page);
    await looksAt(page, question.home);
    const right = page.getByRole('button', { name: 'Turn the globe to the right' });
    const left = page.getByRole('button', { name: 'Turn the globe to the left' });
    await expect(right).toBeVisible();
    await expect(left).toBeVisible();
    const been = await watchViews(page);

    // To the right, to see what is further east; and where a pin has gone out of sight, back again by itself.
    let rest = question.home;
    rest = await turned(page, been, question, { lon: rest.lon + TURN_STEP, lat: rest.lat }, () =>
      press(right),
    );
    await pinsAreInPlace(page, question);
    for (let turns = 0; turns < 2; turns++) {
      const from = rest;
      rest = await turned(page, been, question, { lon: from.lon - TURN_STEP, lat: from.lat }, () =>
        press(left),
      );
      await pinsAreInPlace(page, question);
    }
    // It has looked east and west of where the question is asked from, by a step each way.
    const visited = await been();
    expect(visited).toContain(
      written({ lon: question.home.lon + TURN_STEP, lat: question.home.lat }),
    );
    expect(visited).toContain(
      written({ lon: question.home.lon - TURN_STEP, lat: question.home.lat }),
    );
    // Turning is not answering.
    await expect(lesson(page).locator('[data-choice][data-state="open"]')).toHaveCount(3);
    await looksAt(page, rest);

    // Taps that land on nothing bring a ring round each thing there is to answer with, and round nothing else.
    const tile = lesson(page).locator('[data-wanted]').first();
    for (let taps = 0; taps < 3; taps++) await press(tile);
    await expect(lesson(page)).toHaveAttribute('data-nudge', 'answers');
    const ringed = await page.evaluate(() => {
      const ring = (element: Element) => {
        const style = getComputedStyle(element);
        return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
      };
      return {
        pins: [...document.querySelectorAll('[data-choice]')].map(ring),
        turns: [...document.querySelectorAll('[data-turn]')].map(ring),
      };
    });
    expect(ringed).toEqual({ pins: [true, true, true], turns: [false, false] });
  });

  test('a turn by a button is finished however long the page stops in the middle of it, and the wait before it turns back begins when it has got there', async ({
    page,
    press,
  }) => {
    await page.goto(play('eh-lands-01'));
    await press(myTurn(page));
    const question = await asked(page);
    await looksAt(page, question.home);
    // A step to the left from here puts a pin out of sight: the globe will turn back by itself.
    const to = { lon: question.home.lon - TURN_STEP, lat: question.home.lat };
    expect(question.pins.some((pin) => !inSight(to, pin.at))).toBe(true);

    // The page writes down everywhere the globe looks, with the time. And a tenth of a second into the turn it
    // stops, for longer than a turn and the wait put together: a phone that has something else to do. (The wait
    // used to be counted from the press. The page then woke to find it was time to turn back, and turned back
    // from half-way: CI's run 54 met it once, on a busy machine, as a globe that never got where it was sent.)
    await page.evaluate(
      (busy) => {
        const drawing = document.querySelector<SVGSVGElement>(
          '[data-testid="globe"] svg[data-scene="globe"]',
        );
        const looked: { at: number; view: string }[] = [];
        (window as unknown as { globeLooked: typeof looked }).globeLooked = looked;
        if (!drawing) return;
        new MutationObserver(() =>
          looked.push({
            at: performance.now(),
            view: `${drawing.dataset.lon ?? ''},${drawing.dataset.lat ?? ''}`,
          }),
        ).observe(drawing, { attributes: true, attributeFilter: ['data-lon', 'data-lat'] });
        document.querySelector('[data-turn="left"]')?.addEventListener(
          'click',
          () => {
            window.setTimeout(() => {
              const until = performance.now() + busy;
              while (performance.now() < until) {
                // Nothing: the page is busy.
              }
            }, 100);
          },
          { once: true },
        );
      },
      TURN_MS.step + BACK_AFTER_MS + 300,
    );

    await press(page.getByRole('button', { name: 'Turn the globe to the left' }));
    const everywhere = () =>
      page.evaluate(
        () => (window as unknown as { globeLooked: { at: number; view: string }[] }).globeLooked,
      );
    // It gets where it was sent, although the page was stopped for most of the time that took. (This is waited
    // for before anything else is asked: straight after the press the globe has not yet begun to turn, and is
    // still where the question is asked from.)
    await expect
      .poll(async () => (await everywhere()).map((each) => each.view), { timeout: 8000 })
      .toContain(written(to));
    // In the end it is back where the question is asked from, as after any turn that loses a pin.
    await looksAt(page, question.home);
    const looked = await everywhere();
    const there = looked.findIndex((each) => each.view === written(to));
    // ...and it had begun before the page stopped: the turn was under way, and was not made in one jump.
    expect(there).toBeGreaterThan(2);
    // ...and it was left there for the whole of the wait before it turned back.
    const arrivedAt = looked[there]?.at ?? 0;
    const leftAt = looked[there + 1]?.at ?? 0;
    expect(leftAt - arrivedAt).toBeGreaterThanOrEqual(BACK_AFTER_MS - 50);
    // Turning is not answering, however it went.
    await expect(lesson(page).locator('[data-choice][data-state="open"]')).toHaveCount(3);
  });

  test('the arrow keys turn it from any pin or button, the keyboard is never left with nothing, and Enter on a pin answers', async ({
    page,
    hasTouch,
  }) => {
    test.skip(hasTouch, 'A keyboard journey, checked on the desktop projects.');
    await page.goto(play('eh-lands-01'));
    await myTurn(page).click();
    const question = await asked(page);
    await looksAt(page, question.home);
    const been = await watchViews(page);
    const pin = lesson(page).locator(`[data-choice="${question.answer}"]`);
    /** What holds the keyboard: a pin, a turning button, or nothing on the board. */
    const holder = () =>
      page.evaluate(() => {
        const held = document.activeElement;
        if (held instanceof HTMLElement && held.dataset.choice) return `pin ${held.dataset.choice}`;
        if (held instanceof HTMLElement && held.dataset.turn) return `turn ${held.dataset.turn}`;
        return 'nothing';
      });
    /** Press a key with something on the board holding the keyboard, and wait for the globe to rest. */
    const key = (name: string, from: View, lon: number, lat: number): Promise<View> =>
      turned(page, been, question, { lon: from.lon + lon, lat: from.lat + lat }, () =>
        page.keyboard.press(name),
      );

    await pin.focus();
    expect(await holder()).toBe(`pin ${question.answer}`);
    let rest = question.home;
    // A step to the west and a step back, then tipped and tipped back: whichever way a globe may still be tipped.
    rest = await key('ArrowLeft', rest, -TURN_STEP, 0);
    expect(await holder()).not.toBe('nothing');
    rest = await key('ArrowRight', rest, TURN_STEP, 0);
    const up = rest.lat + TIP_STEP <= 40;
    rest = await key(up ? 'ArrowUp' : 'ArrowDown', rest, 0, up ? TIP_STEP : -TIP_STEP);
    await key(up ? 'ArrowDown' : 'ArrowUp', rest, 0, up ? -TIP_STEP : TIP_STEP);
    expect(await holder()).not.toBe('nothing');

    // Turned until the pin that holds the keyboard has gone round the back of the world, the keyboard is handed
    // to the button that turns the globe that way: the next key still turns the globe.
    await looksAt(page, question.home);
    await pin.focus();
    const away = question.pins.find((each) => each.id === question.answer);
    if (!away) throw new Error('The answer has a pin.');
    let turns = 0;
    let view = question.home;
    for (; turns < 9 && inSight(view, away.at); turns++) {
      view = { lon: view.lon + TURN_STEP, lat: view.lat };
    }
    // Key after key, without waiting for the globe to come back between them.
    for (let pressed = 0; pressed < turns; pressed++) await page.keyboard.press('ArrowRight');
    await expect.poll(async () => await been(), { timeout: 8000 }).toContain(written(view));
    await expect.poll(holder).toBe('turn right');
    // And from there a key turns it as it did from the pin: a step back to the west.
    await turned(page, been, question, { lon: view.lon - TURN_STEP, lat: view.lat }, () =>
      page.keyboard.press('ArrowLeft'),
    );
    expect(await holder()).toBe('turn right');
    // Left alone, the globe comes back; and the pin can be gone to and pressed.
    await looksAt(page, question.home);
    await pinsAreInPlace(page, question);
    // Nothing has been answered by any of it.
    await expect(lesson(page).locator('[data-choice][data-state="open"]')).toHaveCount(3);
    await pin.focus();
    await page.keyboard.press('Enter');
    await expect(caption(page)).toHaveText(`Yes. That is ${MIDDLES[question.want]?.name ?? ''}.`);
  });

  test('held the other way, the globe and its pins are laid out again and are still right', async ({
    page,
    press,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'A phone turned in the hand, tried once.');
    await page.goto(play('eh-places-01'));
    await press(myTurn(page));
    const question = await asked(page);
    await looksAt(page, question.home);
    await arrived(page);
    const upright = await pinsAreInPlace(page, question);
    apartFromOneAnother(upright);
    // Upright, what is asked for is under the globe, between the two buttons.
    for (const tile of upright.wanted) expect(tile.top).toBeGreaterThan(upright.middle.y);
    expect(upright.turns.map((turn) => turn.y > upright.middle.y + upright.radius)).toEqual([
      true,
      true,
    ]);

    const screen = page.viewportSize();
    if (!screen) throw new Error('This test has no fixed screen size.');
    await page.setViewportSize({ width: screen.height, height: screen.width });
    await arrived(page);
    const sideways = await pinsAreInPlace(page, question);
    apartFromOneAnother(sideways);
    // Sideways, it is at the globe's left, and a button stands at each side of the globe.
    for (const tile of sideways.wanted) expect(tile.right).toBeLessThan(sideways.middle.x);
    const [first, second] = sideways.turns;
    expect(first?.right).toBeLessThan(sideways.middle.x - sideways.radius + 1);
    expect(second?.left).toBeGreaterThan(sideways.middle.x + sideways.radius - 1);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    // The globe is looking where it was, and can be answered on.
    expect(sideways.view).toEqual(upright.view);
    await answer(page, press);
    await expect(caption(page)).toHaveText(/^Yes\. /);
  });
});

test.describe('the globe, where nothing is to move', () => {
  test.use({ reducedMotion: 'reduce' });

  test('is simply where it should be: at each question, and at the land that is found', async ({
    page,
    press,
  }) => {
    await page.goto(play('eh-lands-01'));
    await expect(globe(page)).toHaveAttribute('data-same', 'true');
    const everTurning = await watchTurning(page);
    await press(myTurn(page));
    const question = await asked(page);
    await looksAt(page, question.home);
    await pinsAreInPlace(page, question);
    const been = await watchViews(page);
    const rest = await turned(
      page,
      been,
      question,
      { lon: question.home.lon + TURN_STEP, lat: question.home.lat },
      () => press(page.getByRole('button', { name: 'Turn the globe to the right' })),
    );
    // One step is one change of picture: the globe has been where it was and a step to the east, and nowhere
    // between. (If a pin went out of sight there, it has come back, to where it was.)
    expect(new Set(await been()).size).toBe(2);
    await looksAt(page, rest);
    await answer(page, press);
    await looksAt(page, viewOf([middleOf(question.want)]));
    expect((await pinsAreInPlace(page, question)).lit).toBe(question.want);
    // It went from place to place, and was never seen on the way.
    expect(await everTurning()).toBe(false);
  });
});

test.describe('the globe on the flattest phone', () => {
  test.use({ viewport: { width: 640, height: 256 } });

  test('is small, and its pins and buttons are still big enough to press and clear of one another', async ({
    page,
    press,
  }) => {
    for (const id of ['eh-lands-01', 'eh-places-01']) {
      await page.goto(play(id));
      await press(myTurn(page));
      const question = await asked(page);
      await looksAt(page, question.home);
      await arrived(page);
      const drawn = await pinsAreInPlace(page, question);
      const fit = await screenFit(page);
      expect(fit.sideways, id).toEqual([]);
      expect(fit.taller, id).toBe(0);
      apartFromOneAnother(drawn);
      // Small as it is, it is the whole of what the screen can spare, and it is a ball.
      expect(drawn.width, id).toBeGreaterThan(100);
      await answer(page, press);
      await expect(caption(page)).toHaveText(/^Yes\. /);
    }
  });
});
