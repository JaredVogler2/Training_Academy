import type { Locator, Page } from '@playwright/test';
import type { Challenge, ContentPack } from '../src/engine/schema';
import explorerHarbor from '../src/content/packs/explorer-harbor.v1.json' with { type: 'json' };
import memoryForest from '../src/content/packs/memory-forest.v1.json' with { type: 'json' };
import musicLab from '../src/content/packs/music-lab.v1.json' with { type: 'json' };
import numberGarden from '../src/content/packs/number-garden.v3.json' with { type: 'json' };
import readingCove from '../src/content/packs/reading-cove.v1.json' with { type: 'json' };

/**
 * Playing any activity the way its content says it should be played. A test that is about one board knows that
 * board; a test that is about getting through a whole activity uses these, which look up the challenge on the
 * screen in the content pack and do the right thing for its kind.
 *
 * The answer is taken from the pack on purpose. The game itself never tells the screen the answer until the engine
 * shows it, so there is nowhere on the page for a test to read it from — which is as it should be.
 */

type Press = (target: Locator) => Promise<void>;

export const PACKS: Record<string, ContentPack> = {
  'number-garden': numberGarden as unknown as ContentPack,
  'reading-cove': readingCove as unknown as ContentPack,
  'memory-forest': memoryForest as unknown as ContentPack,
  'explorer-harbor': explorerHarbor as unknown as ContentPack,
  'music-lab': musicLab as unknown as ContentPack,
};

export interface Activity {
  world: string;
  id: string;
  title: string;
  needsSound: boolean;
}

/** Every lesson of every pack these helpers know. */
export const ACTIVITIES: Activity[] = Object.entries(PACKS).flatMap(([world, pack]) =>
  pack.lessons.map((lesson) => ({
    world,
    id: lesson.id,
    title: lesson.title,
    needsSound: lesson.needsSound === true,
  })),
);

const lesson = (page: Page) => page.getByTestId('lesson');

/** The challenge on the screen, as the pack has it. */
export async function challengeOnScreen(page: Page): Promise<Challenge> {
  const id = await lesson(page).getAttribute('data-challenge');
  for (const pack of Object.values(PACKS)) {
    for (const each of pack.lessons) {
      const found = each.challenges.find((challenge) => challenge.id === id);
      if (found) return found;
    }
  }
  throw new Error(`No pack has a challenge called ${String(id)}.`);
}

const done = (page: Page) => page.getByRole('button', { name: 'Done' });

/** About how long a press takes to arrive once it has been asked for, in milliseconds. */
const PRESS_TAKES = 45;

/** Wait until nothing on the board is being shown off: every card and the foot can be pressed. */
async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const board = document.querySelector('[data-testid="lesson"]');
    if (!board) return false;
    const lit = board.querySelector('[data-lit="true"], [data-turned-away="true"]');
    const cards = [...board.querySelectorAll('[data-card], [data-choice]')];
    return lit === null && cards.some((card) => card.getAttribute('aria-disabled') !== 'true');
  });
}

/**
 * Give the right answer to whatever is on the screen (or, for a question with choices, a wrong one if asked).
 * Returns once the answer has been handed in.
 */
export async function answer(page: Page, press: Press, right = true): Promise<void> {
  const challenge = await challengeOnScreen(page);
  if (challenge.kind === 'choose-one') {
    await settled(page);
    const pick = right
      ? challenge.answer
      : (challenge.choices.find((choice) => choice.id !== challenge.answer)?.id ?? '');
    await press(lesson(page).locator(`[data-choice="${pick}"]`));
    return;
  }
  const { task } = challenge;
  switch (task.type) {
    case 'give': {
      const pile = page.getByRole('button', { name: /^Give one/ });
      const given = page.getByRole('button', { name: /Take one back/ });
      const want = task.want.count;
      for (let guard = 0; guard < 24; guard++) {
        const has = Number(await given.getAttribute('data-given'));
        if (has === want) break;
        await press(has < want ? pile : given);
        await page.waitForTimeout(120);
      }
      await press(done(page));
      return;
    }
    case 'select': {
      const ready = page.getByRole('button', { name: 'Ready' });
      if (await ready.isVisible()) await press(ready);
      for (const id of task.solution) {
        const card = page.locator(`[data-card="${id}"]`);
        if ((await card.getAttribute('aria-pressed')) !== 'true') await press(card);
      }
      await press(done(page));
      return;
    }
    case 'order': {
      const filled = page.locator('[data-slot][data-filled="true"]');
      for (const [index, id] of task.solution.entries()) {
        if ((await filled.count()) > index) continue;
        await press(page.locator(`[data-testid="order-board"] ul [data-card="${id}"]`));
      }
      await press(done(page));
      return;
    }
    case 'echo': {
      await settled(page);
      for (const id of task.solution) {
        await press(page.locator(`[data-card="${id}"]`));
        await page.waitForTimeout(380);
      }
      return;
    }
    case 'pairs': {
      // Turn every card over once to learn where each is, then turn the pairs.
      const cards = page.locator('[data-place]');
      const count = await cards.count();
      const seen = new Map<string, number[]>();
      for (let place = 0; place < count; place += 2) {
        for (const each of [place, place + 1]) {
          const card = cards.nth(each);
          if ((await card.getAttribute('data-found')) === 'true') continue;
          await press(card);
          const name = (await card.getAttribute('aria-label')) ?? '';
          seen.set(name, [...(seen.get(name) ?? []), each]);
        }
        await page.waitForTimeout(1300);
      }
      for (const places of seen.values()) {
        const [first, second] = places;
        if (first === undefined || second === undefined) continue;
        if ((await cards.nth(first).getAttribute('data-found')) === 'true') continue;
        await press(cards.nth(first));
        await press(cards.nth(second));
        await page.waitForTimeout(300);
      }
      return;
    }
    case 'beat': {
      // The beat is kept the way a person keeps it: from the first beats heard, the rest are known, and each tap
      // is begun a little ahead of its beat so that it lands on it. (Waiting to see each light come on and then
      // pressing lands every tap late by however long this machine takes to press, which is not steady.)
      const drum = page.getByRole('button', { name: /^The drum/ });
      const period = 60_000 / task.tempo;
      const seen = await page.waitForFunction(
        () =>
          document.querySelector('[data-beat="0"][data-now="true"]')
            ? performance.timeOrigin + performance.now()
            : null,
        undefined,
        { polling: 'raf' },
      );
      const first = (await seen.jsonValue()) ?? Date.now();
      for (let beat = task.lead; beat < task.lead + task.beats; beat++) {
        const wait = first + beat * period - PRESS_TAKES - Date.now();
        if (wait > 0) await page.waitForTimeout(wait);
        await press(drum);
      }
      return;
    }
    case 'tune': {
      const placed = page.locator('[data-testid="tune-board"] [data-column]');
      for (const [index, note] of task.solution.entries()) {
        if ((await placed.count()) > index) continue;
        await press(page.locator(`button[data-note="${note}"]`));
      }
      await press(done(page));
      return;
    }
    case 'program':
    case 'design':
      throw new Error(`These helpers do not know how to do a "${task.type}" task.`);
  }
}

/** From wherever the activity is, give right answers until it ends. Returns how many steps were answered. */
export async function playToTheEnd(page: Page, press: Press): Promise<number> {
  const myTurn = page.getByRole('button', { name: 'My turn' });
  const next = page.getByRole('button', { name: 'Next' });
  const finished = page.getByTestId('lesson-finished');
  await lesson(page).locator('[data-testid="lesson-finished"], button').first().waitFor();
  let answered = 0;
  for (let guard = 0; guard < 60; guard++) {
    if (await finished.isVisible()) return answered;
    if (await myTurn.isVisible()) await press(myTurn);
    else if (await next.isVisible()) await press(next);
    else {
      const before = await lesson(page).getAttribute('data-challenge');
      await answer(page, press);
      answered += 1;
      // The answer has been taken when the way on appears, the activity ends, or (a wrong try) the step stays.
      await Promise.race([
        next.waitFor(),
        finished.waitFor(),
        page.waitForFunction(
          (id) =>
            document.querySelector('[data-testid="lesson"]')?.getAttribute('data-challenge') !== id,
          before,
        ),
        // A beat that was not kept has been looked at, and is there to be tapped again.
        page.locator('[data-testid="beat-board"] [data-judged="true"]').waitFor(),
      ]);
    }
    await page.waitForTimeout(100);
  }
  throw new Error('The activity did not finish.');
}
