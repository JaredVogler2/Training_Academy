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
    // What failed a test in CI, twice, in WebKit. The voice begins a line a moment after an answer; a test that has
    // seen the answer is already asking for the next page; the page being left begins its download in between, and
    // it is cancelled when the next page arrives. The guard counted that download as the new page's own, cancelled
    // with nothing after it.
    //
    // It is staged here, because it cannot be made to happen in the browser these tests are written with: Chromium
    // says nothing at all of a download it cancels by leaving a page (tried with the download held back and with
    // the network slowed until it was truly under way), and WebKit, which does say so, runs only in CI. So the
    // same things are made to happen in the same order: the next page is asked for and is slow to come; the page
    // being left asks for something; that is cancelled; the next page arrives. Cancelling it is done by the test,
    // in words Chromium uses, which is why this is for Chromium alone.
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
});
