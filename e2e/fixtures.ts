import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { CHOOSE, PLACE, type Phase, type Step } from '../src/game/howto/steps';
import { WORLDS, isOpen } from '../src/game/worlds';
import { LeftUndone, Pages, fetchNotLoaded, onSite, pagesServed } from './diagnosis';

/**
 * What every browser test gets:
 *
 *   - a guard that fails the test on any console error or warning, uncaught exception, failed request, or request to
 *     another origin (the game talks to nobody) — unless the test says a specific one is expected. The one thing it
 *     lets pass on its own is a download the browser cancelled because the page had moved on to another document;
 *   - a note of what it was still waiting for, if it runs out of time: four times in CI a test's first page in
 *     WebKit has waited a whole minute and then arrived at once on the second attempt, and a silence explains
 *     nothing. The note says how far the page had got, what had not been answered and whether the browser had so
 *     much as the start of an answer, what the server made of it, where the page stood, and which test had the
 *     browser before;
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
  /** What would be held against the test if it ended now: for testing the guard itself. */
  problems(): string[];
  /** What a page left undone and the guard has let pass, because that page has been left: for the same. */
  letPass(): string[];
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

/**
 * How much of its time limit a test may take and still pass.
 *
 * A limit is there to stop a test that hangs. A test that finishes just inside it has only been lucky with its
 * machine: two tests here took 59.5 and 59.4 of their 60 seconds in CI and passed, and in the next run, of the
 * same files, on a machine a fiftieth slower, ran out of time and turned `main` red (run 50). Nothing said so
 * while they were passing. So a test that takes more than this share of its limit fails, at once and every
 * time, with the remedy in its message: a limit that fits what the test does.
 */
export const SHARE_OF_LIMIT = 0.75;

/** What there is to say of a test that passed in `taken` ms with `limit` ms allowed: nothing, if it had time to spare. */
export function nearItsLimit(taken: number, limit: number): string | null {
  // No limit at all is written 0 (a test being stepped through by hand): nothing is near that.
  if (limit <= 0 || taken <= limit * SHARE_OF_LIMIT) return null;
  return (
    `passed with little time to spare: ${(taken / 1000).toFixed(1)} s of the ${(limit / 1000).toFixed(0)} s it is ` +
    `allowed, which is more than ${String(Math.round(SHARE_OF_LIMIT * 100))} in a hundred of it. A slower machine ` +
    'would have run out of time. Give the test a limit that fits what it does (test.setTimeout), or make it shorter'
  );
}

/**
 * The test that had this worker's browser before the one now running: a browser is kept from test to test, so a
 * test can be late or stuck because of what the one before it left behind. (A worker that has had a failure starts
 * again with a new browser, and with nothing here.)
 */
let ranBefore: string | null = null;

export const test = base.extend<Fixtures>({
  graphics: ['pictures', { option: true }],
  frontDoor: [false, { option: true }],

  guard: [
    async ({ page, baseURL, browserName }, use, testInfo) => {
      const began = Date.now();
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

      // What has been asked for and not yet answered, and how far the last page load got: said only if the test
      // runs out of time (below).
      const unanswered = new Map<
        object,
        { path: string; kind: string; since: number; begunAt?: number }
      >();
      const loading = { parsed: false, finished: false };
      page.on('requestfinished', (request) => unanswered.delete(request));
      page.on('domcontentloaded', () => {
        loading.parsed = true;
      });
      page.on('load', () => {
        loading.finished = true;
      });

      // A download still under way when the page starts loading another document is cancelled by the browser, and
      // in WebKit one asked for while the next document is on its way is never begun. Neither is a failure of
      // anything, so each counts only if no other document was asked for after the page it belongs to. (Every
      // other kind of failed request counts, always.) Whose it is, and why, is in `Pages` and `LeftUndone`.
      const pages = new Pages();
      const undone = new LeftUndone(pages);
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) pages.arrive(frame.url());
      });
      const startedIn = new WeakMap<object, number>();
      page.on('pageerror', (error) => {
        const line = `uncaught: ${error.message}`;
        // WebKit's words for a download it would not begin: see `fetchNotLoaded`. Only for a file of this site;
        // of anything else, the same words would be a real refusal.
        const address = browserName === 'webkit' ? fetchNotLoaded(error.message) : null;
        if (address !== null && onSite(address, origin)) undone.refused(line);
        else problems.push(line);
      });
      page.on('requestfailed', (request) => {
        unanswered.delete(request);
        const reason = request.failure()?.errorText ?? 'unknown';
        const line = `request failed: ${request.url()} (${reason})`;
        if (/cancell?ed|ERR_ABORTED/i.test(reason)) {
          undone.cancelled(line, startedIn.get(request) ?? pages.current);
        } else {
          problems.push(line);
        }
      });
      page.on('request', (request) => {
        // In-app navigation asks for no document; only a real page load does.
        const loads = request.isNavigationRequest() && request.frame() === page.mainFrame();
        if (loads) {
          loading.parsed = false;
          loading.finished = false;
        }
        // A page belongs to itself; anything else belongs to the page that is there to ask for it.
        const by = loads ? pages.ask(request.url()) : pages.current;
        startedIn.set(request, by);
        const url = new URL(request.url());
        if (url.protocol === 'data:' || url.protocol === 'blob:') return;
        unanswered.set(request, {
          path: url.pathname,
          kind: request.resourceType(),
          since: Date.now(),
        });
        if (url.origin === origin) requested.push(url.pathname);
        else problems.push(`request to another origin: ${request.url()}`);
      });
      page.on('response', (response) => {
        // The start of an answer: its status and headers. The rest may still be on its way.
        const waited = unanswered.get(response.request());
        if (waited) waited.begunAt = Date.now();
        const url = new URL(response.url());
        if (url.origin === origin && response.status() >= 400) {
          problems.push(`HTTP ${response.status()}: ${url.pathname}`);
        }
      });

      const unexpectedAmong = (lines: string[]) =>
        lines.filter((line) => !allowed.some((pattern) => pattern.test(line)));
      await use({
        allow: (pattern) => allowed.push(pattern),
        requested: () => [...requested],
        problems: () => unexpectedAmong([...problems, ...undone.held()]),
        letPass: () => undone.passed(),
      });

      problems.push(...undone.held());
      // A test that ran out of time has failed already; this adds what it was waiting for to what is reported.
      if (testInfo.status === 'timedOut') {
        const now = Date.now();
        // Tests against a deployment have no server of their own to ask.
        const port =
          (process.env.BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL) ? null : new URL(origin).port;
        const waiting = [...unanswered.values()].map(
          ({ path, kind, since, begunAt }) =>
            `${kind} ${path} (asked for ${((now - since) / 1000).toFixed(1)} s before; ` +
            // The browser's side of it: nothing at all, or the start of an answer and then no more.
            (begunAt === undefined
              ? 'the browser reported no answer at all'
              : `the browser reported the start of an answer after ${((begunAt - since) / 1000).toFixed(1)} s and never its end`) +
            // For a page itself, the server's side of it.
            (kind === 'document' && port !== null
              ? `; ${pagesServed(Number(port), path, since)}`
              : '') +
            ')',
        );
        // Where the page was when time ran out: still at the address before, if the new one was never taken up.
        let stoodAt = 'an address that could not be read';
        try {
          const at = new URL(page.url());
          stoodAt = at.origin === origin ? at.pathname : page.url();
        } catch {
          // The page is gone, or its address is not one.
        }
        const reached = loading.finished
          ? 'had finished loading'
          : loading.parsed
            ? 'had been read but had not finished loading'
            : 'had not been read yet';
        problems.push(
          `out of time: the last page asked for ${reached}; ` +
            (waiting.length === 0
              ? 'no request was unanswered'
              : `${String(waiting.length)} unanswered: ${waiting.join('; ')}`) +
            `; the page stood at ${stoodAt}` +
            (ranBefore === null
              ? '; this was the first test in its browser'
              : `; the test that had the browser before this one: ${ranBefore}`),
        );
      }
      // A test that did everything it set out to, with hardly any of its time left: see `nearItsLimit`.
      if (testInfo.status === 'passed') {
        const tight = nearItsLimit(Date.now() - began, testInfo.timeout);
        if (tight !== null) problems.push(tight);
      }
      ranBefore = `[${testInfo.project.name}] ${testInfo.titlePath.slice(1).join(' › ')}`;
      expect(
        unexpectedAmong(problems),
        `Unexpected browser problems in "${testInfo.title}"`,
      ).toEqual([]);
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

/**
 * Wait until a world's page knows who is playing and what they have finished. Until then its Play goes where it
 * would for someone new, so "Play goes to the first activity" is true of every page for a moment, whatever is
 * stored: a test that reads it at once has read nothing. (One did. With the choice it was about never written
 * down at all, it passed.)
 */
export async function worldSettled(page: Page): Promise<void> {
  await expect(page.locator('article[data-world]')).toHaveAttribute('data-settled', 'true');
}

/** The seven worlds, as the hub names them: six islands, and the Music Lab in the lighthouse. */
export const WORLD_NAMES = [
  'Reading Cove',
  'Number Garden',
  'Robot Ridge',
  'Memory Forest',
  'Inventor Island',
  'Explorer Harbor',
  'Music Lab',
];

/**
 * How wide the lighthouse's tap area is beside an island's. Its own island is a little smaller than the others
 * (2.05 across to their 2.3), so it is a little narrower wherever they are.
 */
export const LIGHTHOUSE_SHARE = 2.05 / 2.3;

export const LESSON_PATH = '/world/number-garden/play/ng-same-amount-01';

/**
 * What that activity teaches, as the grown-ups' area lists it. The area lists every world's skills, world by
 * world, so a test that is about this one asks for it by name.
 */
export const LESSON_SKILL = 'math.quantity.match-sets-to-3';
export const lessonSkill = (page: Page) =>
  page.locator(`[data-testid="skill"][data-skill="${LESSON_SKILL}"]`);

/** The worlds that have something to play, by name, as the game itself lists them. */
export const OPEN_WORLDS = WORLDS.filter(isOpen).map((world) => world.name);
/** A world that has nothing to play yet, where there still is one: its id and its name. */
export const CLOSED_WORLD = WORLDS.find((world) => !isOpen(world)) ?? null;

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
      // What makes it so: the innermost things that run past the screen's edge, and the things whose own words
      // are wider than they are (a select in Safari is one: its box fits and its words do not).
      const naming = (element: Element) => {
        const words = (element.getAttribute('aria-label') ?? element.textContent).trim();
        const kind = element.tagName.toLowerCase();
        return words === '' ? kind : `${kind} "${words.slice(0, 40)}"`;
      };
      const past = [...document.body.querySelectorAll('*')].filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width >= 2 && box.height >= 2 && box.right > width + 0.5;
      });
      const culprits = [
        ...past
          .filter((element) => !past.some((other) => other !== element && element.contains(other)))
          .map(
            (element) =>
              `${naming(element)} ends at ${element.getBoundingClientRect().right.toFixed(0)} px`,
          ),
        ...[...document.body.querySelectorAll('*')]
          .filter((element) => {
            const box = element.getBoundingClientRect();
            return (
              element.scrollWidth > element.clientWidth + 1 &&
              box.left + element.scrollWidth > width + 0.5
            );
          })
          .map(
            (element) =>
              `${naming(element)} holds ${String(element.scrollWidth)} px in ${String(element.clientWidth)}`,
          ),
      ].slice(0, 6);
      sideways.push(
        `the page is ${String(root.scrollWidth)} px wide on a ${String(width)} px screen` +
          (culprits.length === 0 ? '' : ` (${culprits.join('; ')})`),
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
/**
 * Hold the page's clock where it is. From here nothing timed happens in the page (no line is said, nothing is lit
 * or covered) until the test moves the clock on, so "before the look" and "between two lights" are places a test
 * can stand in, not moments it has to be quick enough to catch. Needs `page.clock.install()` before the page is
 * opened; a tap, and what a tap changes at once, work as usual.
 *
 * The clock can only be asked to stop at a time, and it will not stop at one that has gone by. So the page's time
 * is read, and the clock is asked to stop 20 ms after it: little enough that nothing timed is passed over. The
 * page's clock runs on meanwhile, and on a busy machine the reading and the asking have taken longer than that:
 * once in CI (run 47, "Cannot fast-forward to the past"), in one of the few hundred times a run holds the
 * clock. Then the time is read afresh and the clock is asked again. (As Playwright is written, a clock that has
 * refused is left held, so the second asking cannot be late; nothing here relies on that.)
 *
 * `read` is how the page's time is read. It is there for the test of this function, which makes the reading slow.
 */
export async function holdClock(
  page: Page,
  read: () => Promise<number> = () => page.evaluate(() => Date.now()),
): Promise<void> {
  for (let asked = 1; ; asked++) {
    const now = await read();
    try {
      await page.clock.pauseAt(now + 20);
      return;
    } catch (error) {
      if (asked === 5 || !String(error).includes('Cannot fast-forward to the past')) throw error;
    }
  }
}

/**
 * Move a held clock on by `milliseconds`, a little at a time, and say what was seen on the way: `look` is asked
 * before each move, and each answer that differs from the one before it is kept, in order.
 *
 * `look` has to read everything it reports in one go: one function run in the page. Two readings, one after
 * the other, can be of two moments even with the clock held (the page may still be drawing what the last tick
 * set going), and then what is reported is something the page never showed. A test failed in CI for exactly
 * that, once, and passed when it was run again.
 */
export async function watchFor(
  page: Page,
  milliseconds: number,
  look: () => Promise<string>,
  every = 100,
): Promise<string[]> {
  const seen: string[] = [];
  for (let passed = 0; passed <= milliseconds; passed += every) {
    const now = await look();
    if (seen.at(-1) !== now) seen.push(now);
    await page.clock.runFor(every);
  }
  return seen;
}

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

/**
 * Listen in on the voice: every line it says on this page from now on, by key, in order. The game tells the page
 * each time a line begins to play (src/audio/index.ts), and this writes them down. Ask before the page is opened.
 *
 * A clip being fetched is not a clip being said: the lines a step may need are fetched as the step arrives, so
 * that a clip something is shown in time with starts on time. Whether a child was told a thing is asked here.
 */
export async function listenIn(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const said: string[] = [];
    (window as unknown as { saidSoFar: string[] }).saidSoFar = said;
    window.addEventListener('training-academy:said', (event) => {
      said.push((event as CustomEvent<string>).detail);
    });
  });
  return () =>
    page.evaluate(() => [...((window as unknown as { saidSoFar?: string[] }).saidSoFar ?? [])]);
}

export const myTurn = (page: Page) => page.getByRole('button', { name: 'My turn' });
export const next = (page: Page) => page.getByRole('button', { name: 'Next' });
export const finished = (page: Page) => page.getByTestId('lesson-finished');

/** "How to play": where someone who has never played is taken from the front door. */
export const howTo = (page: Page) => page.getByTestId('how-to');
/** "How to play" at one of its three things, while Glim shows it, in the child's turn, or once it is done. */
export const howToAt = (page: Page, step: Step, phase: Phase) =>
  page.locator(`[data-testid="how-to"][data-step="${step}"][data-phase="${phase}"]`);
/** The way out of "how to play": the house, top left. */
export const skipHowTo = (page: Page) =>
  page.getByRole('link', { name: 'Skip: go to the islands' });

/** Pass "how to play" by, as a child who taps the house does. */
export async function passHowTo(page: Page, press: Fixtures['press']): Promise<void> {
  await expect(howTo(page)).toBeVisible();
  await press(skipHowTo(page));
  await expect(howTo(page)).toHaveCount(0);
}

/** Do each of the three things Glim shows in "how to play", and go on to the islands. */
export async function playHowTo(page: Page, press: Fixtures['press']): Promise<void> {
  // A showing takes a few seconds, and nothing can be tapped until it is over.
  const reached = (step: Step, phase: Phase) =>
    expect(howToAt(page, step, phase)).toBeVisible({ timeout: 20_000 });
  await reached('choose', 'turn');
  await press(howTo(page).locator(`[data-choice="${CHOOSE.turn.same}"]`));
  await reached('choose', 'done');
  await press(next(page));
  await reached('place', 'turn');
  for (const card of PLACE.cards) await press(howTo(page).locator(`[data-card="${card}"]`));
  await press(howTo(page).getByRole('button', { name: 'Done' }));
  await reached('place', 'done');
  await press(next(page));
  await reached('again', 'turn');
  await press(howTo(page).getByRole('button', { name: 'Show me again' }));
  await reached('again', 'done');
  await press(next(page));
  await expect(howTo(page)).toHaveCount(0);
}

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
