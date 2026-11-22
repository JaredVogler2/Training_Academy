import { expect, test, type Page } from './fixtures';
import { bandColour, changedShare, decodePng, distinctColours } from './png';

const HUB_3D_CODE = /\/immutable\/(three|r3f|Hub3D)-/;
const stage = (page: Page) => page.getByTestId('hub-stage');

test.describe('the 3D hub', () => {
  // WebGL in these tests comes from Chromium's software rasteriser. WebKit's headless build may have none, in which
  // case the hub correctly shows its illustration: that path is covered below, on every browser.
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Needs WebGL, which headless WebKit may lack.',
  );
  // Asked for by name. Left on automatic, a software rasteriser is given the illustration instead (tested below).
  test.use({ graphics: 'low' });

  test('arrives after the shell, in its own chunks, and draws a real scene @layout', async ({
    page,
    guard,
  }) => {
    await page.goto('/');
    // The illustrated island is there first…
    await expect(page.getByRole('navigation', { name: 'Worlds' })).toBeVisible();
    await expect(stage(page).locator('svg').first()).toBeAttached();
    // …and the 3D scene replaces it once it has drawn its first frames.
    await expect(stage(page)).toHaveAttribute('data-hub-mode', '3d', { timeout: 45_000 });
    await expect(stage(page).locator('canvas')).toBeVisible();
    await expect(stage(page)).toHaveAttribute('data-hub-tier', 'low');

    const requested = guard.requested();
    for (const chunk of ['three', 'r3f', 'Hub3D']) {
      expect(
        requested.some((path) => path.includes(`/immutable/${chunk}-`)),
        `${chunk} chunk was fetched`,
      ).toBe(true);
    }

    // It is a picture, not a blank or single-colour canvas: many colours, sky above, sea below.
    await page.waitForTimeout(900);
    const pixels = decodePng(await stage(page).screenshot({ scale: 'css' }));
    expect(distinctColours(pixels)).toBeGreaterThan(150);
    const sky = bandColour(pixels, 0.02, 0.1);
    expect(sky.b).toBeGreaterThan(sky.r - 40);
    expect(sky.b).toBeGreaterThan(150);
  });

  test('keeps moving gently', async ({ page }) => {
    await page.goto('/');
    await expect(stage(page)).toHaveAttribute('data-hub-mode', '3d', { timeout: 45_000 });
    await page.waitForTimeout(1200);
    const before = decodePng(await stage(page).screenshot({ scale: 'css' }));
    await page.waitForTimeout(1500);
    const after = decodePng(await stage(page).screenshot({ scale: 'css' }));
    const share = changedShare(before, after);
    expect(share).toBeGreaterThan(0.0005);
    // Ambient motion, not a light show.
    expect(share).toBeLessThan(0.5);
  });

  test('falls back to the illustration if the graphics context is lost', async ({
    page,
    guard,
  }) => {
    guard.allow(/Context Lost|context lost|WebGL/i);
    await page.goto('/');
    await expect(stage(page)).toHaveAttribute('data-hub-mode', '3d', { timeout: 45_000 });
    await stage(page)
      .locator('canvas')
      .evaluate((canvas: HTMLCanvasElement) => {
        canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
      });
    await expect(stage(page)).toHaveAttribute('data-hub-mode', 'illustrated');
    await expect(stage(page)).toHaveAttribute('data-hub-reason', 'context-lost');
    await expect(stage(page).locator('svg').first()).toBeVisible();
    // The game carries on.
    await page.getByRole('link', { name: /Number Garden/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Number Garden' })).toBeVisible();
  });

  test('falls back to the illustration if the 3D code cannot be downloaded', async ({
    page,
    guard,
  }) => {
    guard.allow(
      /three-|Failed to fetch dynamically imported module|net::ERR_FAILED|Failed to load resource/,
    );
    await page.route('**/immutable/three-*.js', (route) => route.abort());
    await page.goto('/');
    await expect(stage(page)).toHaveAttribute('data-hub-reason', 'load-failed', {
      timeout: 30_000,
    });
    await expect(stage(page)).toHaveAttribute('data-hub-mode', 'illustrated');
    await expect(page.getByRole('navigation', { name: 'Worlds' }).getByRole('link')).toHaveCount(6);
  });

  test.describe('with the device set to reduce motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    test('is drawn, and holds still', async ({ page }) => {
      await page.goto('/');
      await expect(stage(page)).toHaveAttribute('data-hub-mode', '3d', { timeout: 45_000 });
      await page.waitForTimeout(1200);
      const before = decodePng(await stage(page).screenshot({ scale: 'css' }));
      expect(distinctColours(before)).toBeGreaterThan(150);
      await page.waitForTimeout(1500);
      const after = decodePng(await stage(page).screenshot({ scale: 'css' }));
      expect(changedShare(before, after)).toBe(0);
    });
  });
});

test.describe('the illustrated hub', () => {
  test('is what "automatic" gives a device that could only draw 3D in software', async ({
    page,
    guard,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'Needs a software WebGL renderer, which this Chromium has.',
    );
    await page.addInitScript(
      ({ key }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({ version: 1, sound: true, motion: 'system', graphics: 'auto' }),
        );
      },
      { key: 'training-academy.settings.v1' },
    );
    await page.goto('/');
    await expect(stage(page)).toHaveAttribute('data-hub-mode', 'illustrated');
    await expect(stage(page)).toHaveAttribute('data-hub-reason', 'software-renderer');
    await page.waitForTimeout(2500);
    expect(guard.requested().filter((path) => HUB_3D_CODE.test(path))).toEqual([]);
  });

  test('is what a browser without WebGL gets, and it never downloads the 3D code @layout', async ({
    page,
    guard,
    press,
  }) => {
    test.info().annotations.push({ type: 'graphics', description: 'auto, with WebGL removed' });
    await page.addInitScript(
      ({ key }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({ version: 1, sound: true, motion: 'system', graphics: 'auto' }),
        );
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (
          this: HTMLCanvasElement,
          type: string,
          ...rest: unknown[]
        ) {
          if (type.startsWith('webgl')) return null;
          return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
        } as typeof original;
      },
      { key: 'training-academy.settings.v1' },
    );
    await page.goto('/');
    await expect(stage(page)).toHaveAttribute('data-hub-mode', 'illustrated');
    await expect(stage(page)).toHaveAttribute('data-hub-reason', 'no-webgl');
    await expect(stage(page).locator('canvas')).toHaveCount(0);

    // The illustration really is on screen: a colourful picture where the island should be.
    const pixels = decodePng(await stage(page).screenshot({ scale: 'css' }));
    expect(distinctColours(pixels)).toBeGreaterThan(120);

    // Give a lazy download every chance to start, then check it never did.
    await page.waitForTimeout(2500);
    expect(guard.requested().filter((path) => HUB_3D_CODE.test(path))).toEqual([]);

    await press(page.getByRole('link', { name: /Explorer Harbor/ }));
    await expect(page.getByRole('heading', { level: 1, name: 'Explorer Harbor' })).toBeVisible();
  });

  test('is what "pictures only" gives, without downloading the 3D code', async ({
    page,
    guard,
  }) => {
    await page.goto('/');
    await expect(stage(page)).toHaveAttribute('data-hub-mode', 'illustrated');
    await expect(stage(page)).toHaveAttribute('data-hub-reason', 'setting');
    await page.waitForTimeout(2500);
    expect(guard.requested().filter((path) => HUB_3D_CODE.test(path))).toEqual([]);
  });
});

test.describe('code that loads only when it is needed', () => {
  test.use({ graphics: 'auto' });

  test('the grown-ups page never downloads the 3D hub or a world', async ({ page, guard }) => {
    await page.goto('/grown-ups');
    await expect(page.getByRole('button', { name: 'Press and hold' })).toBeVisible();
    await page.waitForTimeout(2500);
    const requested = guard.requested();
    expect(requested.filter((path) => HUB_3D_CODE.test(path))).toEqual([]);
    expect(requested.filter((path) => /number-garden|WorldView|LessonView/.test(path))).toEqual([]);
    expect(requested.some((path) => /\/immutable\/GrownUps-/.test(path))).toBe(true);
  });

  test('a world’s content and code are fetched on entering that world, not before', async ({
    page,
    guard,
    press,
  }) => {
    await page.goto('/world/reading-cove');
    await expect(page.getByRole('heading', { level: 1, name: 'Reading Cove' })).toBeVisible();
    await page.waitForTimeout(1500);
    expect(guard.requested().filter((path) => /number-garden|LessonView/.test(path))).toEqual([]);

    await press(page.getByRole('link', { name: 'Islands' }));
    await press(page.getByRole('link', { name: /Number Garden/ }));
    await expect(page.getByRole('link', { name: 'Play' })).toBeVisible();
    await expect
      .poll(
        () => guard.requested().filter((path) => /\/immutable\/number-garden/.test(path)).length,
      )
      .toBeGreaterThanOrEqual(2);
  });
});
