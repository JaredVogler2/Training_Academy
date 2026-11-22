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

/**
 * One more that only WebKit produces, and it is not about the game: to take a screenshot, Playwright adds a <style>
 * to the page; this site's Content-Security-Policy refuses it, and WebKit reports the refusal. (Chromium words the
 * same refusal differently, so an inline style added by the game itself would still fail these tests there.)
 */
const WEBKIT_ALLOWED = [
  /Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline'/,
];

/**
 * On a Vercel preview deployment, Vercel may add its collaboration toolbar to the page. This site's
 * Content-Security-Policy refuses it, and the browser reports the refusal. That report is the policy working, so it
 * is tolerated when testing a deployment — and only that. (Better still: switch the toolbar off for the project; see
 * docs/DEPLOYMENT.md.)
 */
const REMOTE_ALLOWED =
  (process.env.BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL) ? [/vercel\.live/] : [];

export const test = base.extend<Fixtures>({
  graphics: ['pictures', { option: true }],

  guard: [
    async ({ page, baseURL, browserName }, use, testInfo) => {
      const origin = new URL(baseURL ?? 'http://127.0.0.1').origin;
      const problems: string[] = [];
      const allowed = [
        ...ALWAYS_ALLOWED,
        ...REMOTE_ALLOWED,
        ...(browserName === 'webkit' ? WEBKIT_ALLOWED : []),
      ];
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
// Does the page fit the screen?
// ---------------------------------------------------------------------------------------------------------------------

export interface ScreenFit {
  /** Everything that is too wide or cut off at the side, in words. Empty when the page fits. */
  sideways: string[];
  /** How much taller the page is than the screen, in CSS pixels (0 when it fits in one screen). */
  taller: number;
}

/**
 * Measures the page against the screen size the test asked for — never against `window.innerWidth`.
 *
 * A phone browser, and Chromium when it emulates one, quietly widens its layout viewport to hold content that is
 * too wide, and zooms out. From inside the page everything then looks fine (`scrollWidth === innerWidth`) on exactly
 * the screens where it is not. The size the test configured does not move.
 *
 * Besides the page as a whole, every control must lie wholly between the left and right edges: something an
 * ancestor clips does not widen the page, but it is still cut off.
 */
export async function screenFit(page: Page): Promise<ScreenFit> {
  const screen = page.viewportSize();
  if (!screen) throw new Error('This test has no fixed screen size.');
  return page.evaluate(({ width, height }) => {
    const sideways: string[] = [];
    const root = document.documentElement;
    if (root.scrollWidth > width) {
      sideways.push(
        `the page is ${String(root.scrollWidth)} px wide on a ${String(width)} px screen`,
      );
    }
    const controls = document.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, summary, [role="button"], [role="link"]',
    );
    for (const control of controls) {
      if (!control.checkVisibility({ visibilityProperty: true })) continue;
      const box = control.getBoundingClientRect();
      // Visually hidden helpers (1 px), and the skip link parked above the page until it is focused.
      if (box.width < 2 || box.height < 2 || box.bottom <= 0) continue;
      if (box.left < -0.5 || box.right > width + 0.5) {
        const words = (control.getAttribute('aria-label') ?? control.textContent).trim();
        const name = (words === '' ? control.tagName.toLowerCase() : words).slice(0, 40);
        sideways.push(
          `"${name}" runs from ${box.left.toFixed(1)} to ${box.right.toFixed(1)} px on a ${String(width)} px screen`,
        );
      }
    }
    return { sideways, taller: Math.max(0, root.scrollHeight - height) };
  }, screen);
}

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

/**
 * Press and hold the gate's button until the grown-ups area opens. The gate must already be on screen.
 *
 * The button is held down until the area appears, rather than for a fixed time: the gate asks for two seconds, but
 * a busy CI machine can take several times that to get round to it, and a press timed at "a little over two
 * seconds" then lets go too early.
 */
export async function holdGateOpen(page: Page): Promise<void> {
  const hold = page.getByRole('button', { name: 'Press and hold' });
  await hold.waitFor();
  const box = await hold.boundingBox();
  if (!box) throw new Error('The hold button is not on screen.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.getByRole('heading', { name: 'Players' }).waitFor({ timeout: 30_000 });
  await page.mouse.up();
}

/** Open the grown-ups area: go to its page and hold the button. */
export async function openGrownUps(page: Page): Promise<void> {
  await page.goto('/grown-ups');
  await holdGateOpen(page);
}
