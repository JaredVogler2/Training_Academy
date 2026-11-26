import { expect, test } from './fixtures';

/**
 * The checks that matter on a real deployment as much as locally. Run them against a Vercel preview with
 *   BASE_URL=https://<preview>.vercel.app npx playwright test
 * (only specs tagged @smoke run in that mode; see playwright.config.ts).
 */

test.describe('how the site is served @smoke', () => {
  test('the page comes with the security headers', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['content-type']).toContain('text/html');

    const policy = headers['content-security-policy'] ?? '';
    for (const directive of [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
    ]) {
      expect(policy).toContain(directive);
    }
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['permissions-policy']).toContain('microphone=()');
    expect(headers['permissions-policy']).toContain('camera=()');
  });

  test('page addresses are answered with the app, at any depth', async ({ request }) => {
    for (const path of [
      '/world/number-garden',
      '/world/number-garden/play/ng-same-amount-01',
      '/grown-ups',
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()['content-type']).toContain('text/html');
      expect(await response.text()).toContain('<div id="root">');
    }
  });

  test('content-hashed files are cached forever, the page and the service worker never', async ({
    request,
  }) => {
    const html = await (await request.get('/')).text();
    const entry = /<script[^>]+src="(\/immutable\/[^"]+\.js)"/.exec(html)?.[1];
    const styles = /<link[^>]+href="(\/immutable\/[^"]+\.css)"/.exec(html)?.[1];
    expect(entry, 'index.html names its entry script').toBeTruthy();
    expect(styles, 'index.html names its stylesheet').toBeTruthy();

    for (const path of [entry, styles]) {
      const response = await request.get(path as string);
      expect(response.status()).toBe(200);
      expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
    }
    expect((await request.get('/')).headers()['cache-control']).toContain('max-age=0');

    const worker = await request.get('/sw.js');
    expect(worker.status()).toBe(200);
    expect(worker.headers()['content-type']).toMatch(/javascript/);
    expect(worker.headers()['cache-control']).toContain('max-age=0');
    expect(await worker.text()).toContain('const BUILD = {');
  });

  test('the installable-app files are in place', async ({ request }) => {
    const manifest = await request.get('/manifest.webmanifest');
    expect(manifest.status()).toBe(200);
    const body = (await manifest.json()) as {
      name: string;
      start_url: string;
      icons: { src: string }[];
    };
    expect(body).toMatchObject({ name: 'Training Academy', start_url: '/' });
    for (const icon of body.icons)
      expect((await request.get(icon.src)).status(), icon.src).toBe(200);
    expect((await request.get('/favicon.svg')).status()).toBe(200);
    expect((await request.get('/assets/icons/apple-touch-icon.png')).status()).toBe(200);
  });

  test('the game starts, with no errors, no warnings and no request to anywhere else', async ({
    page,
  }) => {
    // The guard in fixtures.ts fails this test on any console problem, failed request or third-party request.
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Worlds' }).getByRole('link')).toHaveCount(7);
    await page.getByRole('link', { name: /Number Garden/ }).click();
    await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('button', { name: 'My turn' })).toBeVisible();
  });
});

/**
 * The guard itself (fixtures.ts): what it holds against a test and what it lets pass. These stage what they need
 * and belong to no deployment, so they are not among the tests run against one.
 */
test.describe('the guard that every one of these tests runs under', () => {
  test('a download begun by a page that is being left is not held against the page that follows it', async ({
    page,
    browserName,
  }) => {
    // A page that is being left lives on until the next one has arrived, and what it asks for in between is its
    // own: the voice begins a line a moment after an answer, and a test that has seen the answer is already
    // asking for the next page. Whatever becomes of such a download is not to be held against the page that
    // follows.
    //
    // It is staged, because Chromium says nothing at all of a download it cancels by leaving a page (tried with
    // the download held back and with the network slowed until it was truly under way). So the things are made to
    // happen in order: the next page is asked for and is slow to come; the page being left asks for something;
    // that is cancelled; the next page arrives. Cancelling it is done by the test, in words Chromium uses, which
    // is why this is for Chromium alone. (WebKit does something else with such a download, and has a test of its
    // own below.)
    test.skip(browserName !== 'chromium', 'staged with a cancellation worded as Chromium words it');
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Worlds' })).toBeVisible();
    await page.route('**/world/number-garden', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.continue().catch(() => undefined);
    });
    const order: string[] = [];
    await page.route('**/robots.txt', async (route) => {
      order.push('asked for by the page being left');
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.abort('aborted').catch(() => undefined);
      order.push('cancelled');
    });
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) order.push('the next page arrived');
    });
    // The page being left asks for it a fifth of a second from now: after the next page has been asked for.
    await page.evaluate(() => {
      window.setTimeout(() => void fetch('/robots.txt').catch(() => undefined), 200);
    });
    await page.goto('/world/number-garden');
    await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
    // It happened in that order. Whether it is held against anyone is the guard's to say, when this test ends.
    expect(order).toEqual([
      'asked for by the page being left',
      'cancelled',
      'the next page arrived',
    ]);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('a download cancelled with no page after it is held against the page that began it', async ({
    page,
    guard,
    baseURL,
    browserName,
  }) => {
    // The other half of the same rule, staged the same way: nothing here is being left, so a download that is
    // cancelled was cancelled for no reason the guard knows of, and it says so. Once another page has been asked
    // for, the same cancelled download is what leaving a page does, and is held against nobody.
    test.skip(browserName !== 'chromium', 'staged with a cancellation worded as Chromium words it');
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Worlds' })).toBeVisible();
    expect(guard.problems()).toEqual([]);
    await page.route('**/robots.txt', (route) => route.abort('aborted'));
    await page.evaluate(() => fetch('/robots.txt').catch(() => undefined));
    await expect
      .poll(() => guard.problems())
      .toEqual([`request failed: ${new URL('/robots.txt', baseURL).href} (net::ERR_ABORTED)`]);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.goto('/world/number-garden');
    await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
    expect(guard.problems()).toEqual([]);
  });

  test('in Safari’s engine, a file asked for while the next page is on its way is never fetched, and that is held against nobody', async ({
    page,
    guard,
    browserName,
  }) => {
    // What failed a test in CI three times, each time at its first attempt only (robot.spec.ts, "the way is marked
    // instead of walked"): the test goes to another activity the moment an answer is right, and the page it is
    // leaving asks for the recording of "Yes" a moment later. From the moment another page has been asked for
    // until it arrives, WebKit will not begin a download for the page that is still there. It makes no request,
    // so there is none to report, and says only, on the console, that it "cannot load" the file "due to access
    // control checks" (e2e/diagnosis.ts has where that is in WebKit's source). Twice the guard was mended on a
    // wrong reading of that sentence, as a second report of a download begun and then cancelled.
    //
    // Nothing is staged here: the next page is held back by the test, the page that is still there asks for a
    // file, and WebKit does the rest. It is the test of that reading, as much as of the guard: if WebKit fetched
    // the file after all, or said nothing, this fails and says which.
    test.skip(
      browserName !== 'webkit',
      'Chromium asks for the file, and says nothing if it is then cancelled',
    );
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Worlds' })).toBeVisible();
    let outcome = 'never asked for';
    await page.route('**/world/number-garden', async (route) => {
      // The next page has been asked for, and waits here while the page being left asks for a file.
      outcome = await page
        .evaluate(() =>
          fetch('/robots.txt').then(
            () => 'fetched',
            () => 'refused',
          ),
        )
        .catch((error: unknown) => `could not be asked for: ${String(error)}`);
      await route.continue().catch(() => undefined);
    });
    await page.goto('/world/number-garden');
    await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    expect(outcome).toBe('refused');
    // Nothing was asked of the server, and what WebKit said of it was let pass: the page that asked has been left.
    expect(guard.requested()).not.toContain('/robots.txt');
    expect(guard.letPass()).toEqual([
      expect.stringMatching(/^uncaught: .*\/robots\.txt due to access control checks\.$/),
    ]);
    expect(guard.problems()).toEqual([]);
  });
});
