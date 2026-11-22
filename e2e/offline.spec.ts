import {
  LESSON_PATH,
  choose,
  expect,
  finishCorrectly,
  finished,
  myTurn,
  next,
  stepNumber,
  test,
  type Page,
} from './fixtures';

/**
 * The service worker in a real browser: after one visit, what was opened keeps working without a connection.
 * Chromium only — it is the one engine in which Playwright can drive service workers and the network together.
 * The caching policy itself is unit-tested for every case in tests/config/serviceWorker.test.ts.
 */
test.describe('offline', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Service-worker control needs Chromium.',
  );
  test.use({ serviceWorkers: 'allow' });

  /** Wait until the worker has installed and taken control of this page. */
  async function workerInControl(page: Page): Promise<void> {
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
      timeout: 30_000,
    });
  }

  test('what has been opened once opens again with no connection, and progress is kept', async ({
    page,
    context,
    press,
    guard,
  }) => {
    await page.goto('/');
    await workerInControl(page);

    // Open the world and start the activity while online: this is what gets kept.
    await press(page.getByRole('link', { name: /Number Garden/ }));
    await press(page.getByRole('link', { name: 'Play' }));
    await press(myTurn(page));
    await choose(page, press, true);
    await press(next(page));
    expect(await stepNumber(page)).toBe(3);

    await context.setOffline(true);
    // Chromium notes the failed network attempt before the worker answers from what it kept.
    guard.allow(/net::ERR_INTERNET_DISCONNECTED|Failed to load resource|request failed/);

    await page.reload();
    await expect(page.getByTestId('lesson').locator('[data-choice]').first()).toBeVisible();
    expect(await stepNumber(page)).toBe(3);
    await finishCorrectly(page, press);
    await expect(finished(page)).toContainText('3 of 3');

    // The hub and the world's front door open too.
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Worlds' }).getByRole('link')).toHaveCount(6);
    await page.goto('/world/number-garden');
    await expect(page.getByRole('link', { name: 'Play' })).toBeVisible();
  });

  test('a part that was never opened says it could not be loaded, instead of breaking', async ({
    page,
    context,
    guard,
  }) => {
    await page.goto('/');
    await workerInControl(page);
    await context.setOffline(true);
    guard.allow(
      /net::ERR_INTERNET_DISCONNECTED|net::ERR_FAILED|Failed to load resource|request failed|ChunkLoadError|Failed to fetch/,
    );

    await page.getByRole('link', { name: /Robot Ridge/ }).click();
    await expect(
      page.getByRole('alert').getByRole('heading', { name: 'This part could not be loaded' }),
    ).toBeVisible();

    // Back online, the same page loads.
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Load the page again' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Robot Ridge' })).toBeVisible();
  });

  test('installing downloads the first screen only: no 3D code, no world', async ({
    page,
    guard,
  }) => {
    await page.goto('/grown-ups');
    await workerInControl(page);
    await page.waitForTimeout(1500);
    const kept = await page.evaluate(async () => {
      const names = await caches.keys();
      const paths: string[] = [];
      for (const name of names) {
        for (const request of await (await caches.open(name)).keys())
          paths.push(new URL(request.url).pathname);
      }
      return { names, paths };
    });
    expect(kept.names.some((name) => name.startsWith('ta-shell-'))).toBe(true);
    expect(kept.paths).toContain('/');
    expect(
      kept.paths.filter((path) =>
        /three-|r3f-|Hub3D-|number-garden|WorldView|LessonView/.test(path),
      ),
    ).toEqual([]);
    expect(guard.requested().filter((path) => /three-|r3f-|Hub3D-/.test(path))).toEqual([]);
    expect(LESSON_PATH).toContain('number-garden');
  });
});
