import { test as base, expect, type Locator, type Page } from '@playwright/test';

/**
 * What every browser test gets:
 *
 *   - a guard that fails the test on any console error or warning, uncaught exception, failed request, or request to
 *     another origin (the game talks to nobody) — unless the test says a specific one is expected;
 *   - the graphics setting chosen up front (the illustrated hub by default, so only the 3D specs pay for software
 *     rendering);
 *   - `press`, which taps on a touch device and clicks otherwise, so one spec exercises both.
 */

export const SETTINGS_KEY = 'training-academy.settings.v1';

type Graphics = 'auto' | 'low' | 'medium' | 'high' | 'pictures';

interface Guard {
  /** Messages matching one of these are expected in this test and do not fail it. */
  allow(pattern: RegExp): void;
  /** Everything requested so far, as paths. */
  requested(): string[];
}

interface Fixtures {
  graphics: Graphics;
  guard: Guard;
  press: (target: Locator) => Promise<void>;
}

/**
 * Two messages that come from the test machine and the test harness, not from the page:
 *   - Chromium's software rasteriser reports its own slowness whenever a screenshot reads the canvas back;
 *   - Playwright announces that it is blocking service workers, which most specs ask it to do.
 */
const ALWAYS_ALLOWED = [
  /GPU stall due to ReadPixels/,
  /Service Worker registration blocked by Playwright/,
];

export const test = base.extend<Fixtures>({
  graphics: ['pictures', { option: true }],

  guard: [
    async ({ page, baseURL }, use, testInfo) => {
      const origin = new URL(baseURL ?? 'http://127.0.0.1').origin;
      const problems: string[] = [];
      const allowed = [...ALWAYS_ALLOWED];
      const requested: string[] = [];

      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          problems.push(`console ${message.type()}: ${message.text()}`);
        }
      });
      page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`));
      page.on('requestfailed', (request) => {
        problems.push(
          `request failed: ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`,
        );
      });
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.protocol === 'data:' || url.protocol === 'blob:') return;
        if (url.origin === origin) requested.push(url.pathname);
        else problems.push(`request to another origin: ${request.url()}`);
      });
      page.on('response', (response) => {
        const url = new URL(response.url());
        if (url.origin === origin && response.status() >= 400) {
          problems.push(`HTTP ${response.status()}: ${url.pathname}`);
        }
      });

      await use({
        allow: (pattern) => allowed.push(pattern),
        requested: () => [...requested],
      });

      const unexpected = problems.filter(
        (problem) => !allowed.some((pattern) => pattern.test(problem)),
      );
      expect(unexpected, `Unexpected browser problems in "${testInfo.title}"`).toEqual([]);
    },
    { auto: true },
  ],

  page: async ({ page, graphics }, use) => {
    // Set before the app starts, and only if the app has not saved its own choice since.
    await page.addInitScript(
      ({ key, value }) => {
        try {
          if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
        } catch {
          // Storage is blocked in this test; the app falls back to its defaults.
        }
      },
      {
        key: SETTINGS_KEY,
        value: JSON.stringify({ version: 1, sound: true, motion: 'system', graphics }),
      },
    );
    await use(page);
  },

  press: async ({ hasTouch }, use) => {
    await use((target) => (hasTouch ? target.tap() : target.click()));
  },
});

export { expect };
export type { Locator, Page };

/** The six worlds, as the hub names them. */
export const WORLD_NAMES = [
  'Reading Cove',
  'Number Garden',
  'Robot Ridge',
  'Memory Forest',
  'Inventor Island',
  'Explorer Harbor',
];

export const LESSON_PATH = '/world/number-garden/play/ng-same-amount-01';

// ---------------------------------------------------------------------------------------------------------------------
// Playing the sample activity the way a child would: by looking at the pictures
// ---------------------------------------------------------------------------------------------------------------------

async function amountIn(picture: Locator): Promise<string | null> {
  return picture.locator('svg[data-count]').first().getAttribute('data-count');
}

/** Tap a choice that shows the same amount as the group to match (`right`), or one that does not. */
export async function choose(page: Page, press: Fixtures['press'], right: boolean): Promise<void> {
  const lesson = page.getByTestId('lesson');
  const target = await amountIn(lesson.locator('[data-same]'));
  // Anything still on the table: open choices, and the answer itself once the lesson has revealed it.
  const choices = lesson.locator('[data-choice]:not([data-state="away"])');
  const count = await choices.count();
  for (let index = 0; index < count; index++) {
    const choice = choices.nth(index);
    if (((await amountIn(choice)) === target) === right) {
      await press(choice);
      return;
    }
  }
  throw new Error(`No ${right ? 'matching' : 'non-matching'} choice is on the table.`);
}

export const myTurn = (page: Page) => page.getByRole('button', { name: 'My turn' });
export const next = (page: Page) => page.getByRole('button', { name: 'Next' });
export const finished = (page: Page) => page.getByTestId('lesson-finished');

/** Which step of the activity is showing, from the progress dots' label: "Step 2 of 6" → 2. */
export async function stepNumber(page: Page): Promise<number> {
  const label = await page
    .getByTestId('lesson')
    .getByRole('list')
    .first()
    .getAttribute('aria-label');
  return Number(/Step (\d+) of/.exec(label ?? '')?.[1] ?? Number.NaN);
}

/** From wherever the activity is (including still loading), answer correctly until it ends. */
export async function finishCorrectly(page: Page, press: Fixtures['press']): Promise<void> {
  await page
    .getByTestId('lesson')
    .locator('[data-choice], [data-testid="lesson-finished"]')
    .first()
    .waitFor();
  for (let guard = 0; guard < 30; guard++) {
    if (await finished(page).isVisible()) return;
    if (await myTurn(page).isVisible()) await press(myTurn(page));
    else if (await next(page).isVisible()) await press(next(page));
    else await choose(page, press, true);
    // Let the frame settle on its next state before looking again.
    await page.waitForTimeout(120);
  }
  throw new Error('The activity did not finish.');
}

/** Open the grown-ups area: go to its page and hold the button for the two seconds it asks for. */
export async function openGrownUps(page: Page): Promise<void> {
  await page.goto('/grown-ups');
  const hold = page.getByRole('button', { name: 'Press and hold' });
  await hold.waitFor();
  const box = await hold.boundingBox();
  if (!box) throw new Error('The hold button is not on screen.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.getByRole('heading', { name: 'Players' }).waitFor({ timeout: 6000 });
  await page.mouse.up();
}
