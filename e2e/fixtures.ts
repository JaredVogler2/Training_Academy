import { test as base, expect, type Locator, type Page } from '@playwright/test';

/**
 * What every browser test gets:
 *
 *   - a guard that fails the test on any console error or warning, uncaught exception, failed request, or request to
 *     another origin (the game talks to nobody) — unless the test says a specific one is expected. The one thing it
 *     lets pass on its own is a download the browser cancelled because the page had moved on to another document;
 *   - the graphics setting chosen up front (the hub as a picture by default, so only the 3D specs pay for software
 *     rendering);
 *   - `press`, which taps on a touch device and clicks otherwise, so one spec exercises both;
 *   - a visit that is already past the front door, where the child chooses who is playing, unless the test asks to
 *     arrive at it (`frontDoor: true`), as a fresh visit does.
 */

export const SETTINGS_KEY = 'training-academy.settings.v1';
/** What the game keeps for the life of a tab once the child has chosen who is playing (src/app/journey.ts). */
export const BEGUN_KEY = 'training-academy.begun';

type Graphics = 'auto' | 'low' | 'medium' | 'high' | 'pictures';

interface Guard {
  /** Messages matching one of these are expected in this test and do not fail it. */
  allow(pattern: RegExp): void;
  /** Everything requested so far, as paths. */
  requested(): string[];
}

interface Fixtures {
  graphics: Graphics;
  /** Arrive as a new visit does: at the front door. Off by default, so most specs start on the map. */
  frontDoor: boolean;
  guard: Guard;
  /** Tap on a touch screen, click otherwise; `position` is measured from the target's top-left corner. */
  press: (target: Locator, options?: { position?: { x: number; y: number } }) => Promise<void>;
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
  frontDoor: [false, { option: true }],

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

      // A download still under way when the page starts loading another document is cancelled by the browser. That
      // is not a failure of anything, so a cancelled request counts only if no other document was asked for after
      // it began. (Every other kind of failed request counts, always.)
      let documents = 0;
      const startedIn = new WeakMap<object, number>();
      const cancelled: { line: string; document: number }[] = [];
      page.on('requestfailed', (request) => {
        const reason = request.failure()?.errorText ?? 'unknown';
        const line = `request failed: ${request.url()} (${reason})`;
        if (/cancell?ed|ERR_ABORTED/i.test(reason)) {
          cancelled.push({ line, document: startedIn.get(request) ?? documents });
        } else {
          problems.push(line);
        }
      });
      page.on('request', (request) => {
        // In-app navigation asks for no document; only a real page load does.
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents += 1;
        startedIn.set(request, documents);
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

      for (const { line, document } of cancelled) {
        if (document >= documents) problems.push(line);
      }
      const unexpected = problems.filter(
        (problem) => !allowed.some((pattern) => pattern.test(problem)),
      );
      expect(unexpected, `Unexpected browser problems in "${testInfo.title}"`).toEqual([]);
    },
    { auto: true },
  ],

  page: async ({ page, graphics, frontDoor }, use) => {
    // Set before the app starts, and only if the app has not saved its own choice since.
    await page.addInitScript(
      ({ key, value, begunKey, begun }) => {
        try {
          if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
          if (begun) window.sessionStorage.setItem(begunKey, '1');
        } catch {
          // Storage is blocked in this test; the app falls back to its defaults.
        }
      },
      {
        key: SETTINGS_KEY,
        value: JSON.stringify({ version: 1, sound: true, motion: 'system', graphics }),
        begunKey: BEGUN_KEY,
        begun: !frontDoor,
      },
    );
    await use(page);
  },

  press: async ({ hasTouch }, use) => {
    await use((target, options) => (hasTouch ? target.tap(options) : target.click(options)));
  },
});

export { expect };
export type { Locator, Page };

/**
 * Wait until whatever is arriving on the page has arrived: every animation that has an end has reached it.
 * (A page half-way through fading in is not what anyone reads, and measuring its colours then measures the fade.)
 * Movement that never ends, such as a boat bobbing, is not waited for.
 */
export async function arrived(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const ending = document.getAnimations().filter((animation) => {
      const end = animation.effect?.getComputedTiming().endTime;
      return typeof end === 'number' && Number.isFinite(end);
    });
    await Promise.all(ending.map((animation) => animation.finished.catch(() => undefined)));
  });
}

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
// A phone with a notch
// ---------------------------------------------------------------------------------------------------------------------

/** What a notch, a camera cut-out and a home bar take from each edge of the screen, in CSS pixels. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** A recent iPhone held sideways: its sensor housing at one end, the home bar along the bottom. */
export const NOTCH_SIDEWAYS: Insets = { top: 0, right: 59, bottom: 21, left: 59 };
/** The same phone upright, opened from the home screen: the housing at the top, the home bar at the bottom. */
export const NOTCH_UPRIGHT: Insets = { top: 59, right: 0, bottom: 34, left: 0 };

/**
 * Tell the page its screen has a notch, before it loads.
 *
 * A browser on a desk reports no safe-area insets and cannot be made to. But every rule in the game reads them
 * through four custom properties (`--safe-top` and the rest, src/styles/tokens.css) and nowhere else, so setting
 * those on the root element puts every layout exactly where a phone's own insets would. (They are set through the
 * style object, which the Content-Security-Policy allows; a <style> element would be refused.)
 */
export async function giveNotch(page: Page, insets: Insets): Promise<void> {
  await page.addInitScript((taken) => {
    const set = () => {
      const style = document.documentElement.style;
      style.setProperty('--safe-top', `${String(taken.top)}px`);
      style.setProperty('--safe-right', `${String(taken.right)}px`);
      style.setProperty('--safe-bottom', `${String(taken.bottom)}px`);
      style.setProperty('--safe-left', `${String(taken.left)}px`);
    };
    // The root element may not exist yet when this runs.
    if (document.documentElement instanceof HTMLElement) set();
    else {
      new MutationObserver((_records, observer) => {
        if (!(document.documentElement instanceof HTMLElement)) return;
        set();
        observer.disconnect();
      }).observe(document, { childList: true });
    }
  }, insets);
}

/**
 * Everything a child sees or presses that lies in the part of the screen a notch or a home bar takes, in words.
 * Empty when the screen keeps clear of them.
 *
 * The picture of the sea runs to every edge, as it should, and is not counted; the islands' tap areas are. On a
 * page that scrolls, what is lower down is on its way up and is not counted against the bottom edge.
 */
export async function underTheNotch(page: Page, insets: Insets): Promise<string[]> {
  const screen = page.viewportSize();
  if (!screen) throw new Error('This test has no fixed screen size.');
  return page.evaluate(
    ({ width, height, taken }) => {
      const safe = {
        left: taken.left,
        right: width - taken.right,
        top: taken.top,
        bottom: height - taken.bottom,
      };
      const scrolls = document.documentElement.scrollHeight > height + 1;
      const found: string[] = [];
      const seen = document.querySelectorAll(
        'a[href], button, input, select, textarea, summary, [role="button"], main h1, main h2, main p, main img, main svg',
      );
      for (const element of seen) {
        if (!element.checkVisibility({ visibilityProperty: true })) continue;
        if (element.closest('[data-testid="hub-stage"]')) continue;
        const box = element.getBoundingClientRect();
        if (box.width < 2 || box.height < 2 || box.bottom <= 0 || box.top >= height) continue;
        const over: string[] = [];
        if (box.left < safe.left - 0.5)
          over.push(`${(safe.left - box.left).toFixed(0)} px at the left`);
        if (box.right > safe.right + 0.5)
          over.push(`${(box.right - safe.right).toFixed(0)} px at the right`);
        if (box.top < safe.top - 0.5 && window.scrollY === 0) {
          over.push(`${(safe.top - box.top).toFixed(0)} px at the top`);
        }
        if (!scrolls && box.bottom > safe.bottom + 0.5) {
          over.push(`${(box.bottom - safe.bottom).toFixed(0)} px at the bottom`);
        }
        if (over.length === 0) continue;
        const words = (element.getAttribute('aria-label') ?? element.textContent).trim();
        const name = (words === '' ? element.tagName.toLowerCase() : words).slice(0, 40);
        found.push(`"${name}" is under it by ${over.join(' and ')}`);
      }
      return found;
    },
    { ...screen, taken: insets },
  );
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

/**
 * Wait until every picture of the hub's fallback has been downloaded, decoded and drawn.
 * ("Complete" is not enough: the browser decodes pictures off the main thread and may paint a frame without one
 * that is still being decoded, which is exactly what a screenshot would then catch.)
 */
export async function hubPicturesLoaded(page: Page): Promise<void> {
  await expect(page.getByTestId('hub-picture')).toBeAttached();
  await page.waitForFunction(() => {
    const images = [
      ...document.querySelectorAll<HTMLImageElement>('[data-testid="hub-picture"] img'),
    ];
    return images.length >= 7 && images.every((image) => image.complete && image.naturalWidth > 0);
  });
  await page.evaluate(async () => {
    const images = [
      ...document.querySelectorAll<HTMLImageElement>('[data-testid="hub-picture"] img'),
    ];
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
    await new Promise<void>((done) => {
      requestAnimationFrame(() => requestAnimationFrame(() => done()));
    });
  });
}
