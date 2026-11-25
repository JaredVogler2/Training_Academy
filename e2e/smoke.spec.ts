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
