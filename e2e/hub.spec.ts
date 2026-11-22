import { WORLD_NAMES, expect, hubPicturesLoaded, test, type Page } from './fixtures';
import {
  bandColour,
  changedShare,
  colourDistance,
  decodePng,
  distinctColours,
  patchColour,
} from './png';

const HUB_3D_CODE = /\/immutable\/(three|r3f|Hub3D)-/;
const stage = (page: Page) => page.getByTestId('hub-stage');

/**
 * For tests that have the scene drawn in software, which is all a machine without a graphics card can do. The scene
 * may take most of a minute to arrive and seconds more to photograph, so the usual minute for a whole test cannot
 * hold the waits inside one: on the CI machine "keeps moving gently" has taken 47 seconds.
 *
 * Running this file's tests one after another, so that no two scenes are drawn at once, was tried and made CI
 * slower: 10.9 minutes against 7.8, and 77 seconds for that test. On that machine a test that ends with the scene
 * still moving leaves ten to thirty seconds of clearing up to the next test in the same browser, and in order the
 * next test is always another of these. Measure any change to how these are scheduled there, not on a faster
 * machine, where none of this shows.
 */
const SOFTWARE_3D_TIMEOUT = 180_000;

test.describe('the 3D hub', () => {
  // WebGL in these tests comes from Chromium's software rasteriser. WebKit's headless build may have none, in which
  // case the hub correctly shows its picture: that path is covered below, on every browser.
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Needs WebGL, which headless WebKit may lack.',
  );
  // Asked for by name. Left on automatic, a software rasteriser is given the picture instead (tested below).
  test.use({ graphics: 'low' });
  test.describe.configure({ timeout: SOFTWARE_3D_TIMEOUT });

  test('arrives after the shell, in its own chunks, and draws a real scene @layout', async ({
    page,
    guard,
  }) => {
    await page.goto('/');
    // The archipelago is there first, as a picture…
    await expect(page.getByRole('navigation', { name: 'Worlds' })).toBeVisible();
    await expect(page.getByTestId('hub-picture')).toBeAttached();
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

    // It is a scene, not a blank or single-colour canvas: many colours, and sea that is paler far away (the top
    // of the screen) than close by (the bottom).
    await page.waitForTimeout(900);
    const pixels = decodePng(await stage(page).locator('canvas').screenshot({ scale: 'css' }));
    expect(distinctColours(pixels)).toBeGreaterThan(150);
    const far = bandColour(pixels, 0.0, 0.03);
    const near = bandColour(pixels, 0.97, 1);
    expect(far.b).toBeGreaterThan(far.r + 30);
    expect(near.b).toBeGreaterThan(near.r + 60);
    expect(far.r + far.g + far.b).toBeGreaterThan(near.r + near.g + near.b + 40);
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

  test('falls back to the picture if the graphics context is lost', async ({ page, guard }) => {
    guard.allow(/Context Lost|context lost|WebGL/i);
    await page.goto('/');
    await expect(stage(page)).toHaveAttribute('data-hub-mode', '3d', { timeout: 45_000 });
    await stage(page)
      .locator('canvas')
      .evaluate((canvas: HTMLCanvasElement) => {
        canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
      });
    await expect(stage(page)).toHaveAttribute('data-hub-mode', 'picture');
    await expect(stage(page)).toHaveAttribute('data-hub-reason', 'context-lost');
    await expect(page.getByTestId('hub-picture').locator('img').first()).toBeVisible();
    // The game carries on.
    await page.getByRole('link', { name: /Number Garden/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Number Garden' })).toBeVisible();
  });

  test('falls back to the picture if the 3D code cannot be downloaded', async ({ page, guard }) => {
    guard.allow(
      /three-|Failed to fetch dynamically imported module|net::ERR_FAILED|Failed to load resource/,
    );
    await page.route('**/immutable/three-*.js', (route) => route.abort());
    await page.goto('/');
    await expect(stage(page)).toHaveAttribute('data-hub-reason', 'load-failed', {
      timeout: 30_000,
    });
    await expect(stage(page)).toHaveAttribute('data-hub-mode', 'picture');
    await expect(page.getByRole('navigation', { name: 'Worlds' }).getByRole('link')).toHaveCount(6);
  });

  test('is taken down when the hub is left and built afresh on return, one canvas at a time', async ({
    page,
    press,
  }) => {
    await page.goto('/');
    await expect(stage(page)).toHaveAttribute('data-hub-mode', '3d', { timeout: 45_000 });
    for (const world of [/Robot Ridge/, /Memory Forest/]) {
      await press(page.getByRole('link', { name: world }));
      await expect(page.getByRole('link', { name: 'Islands' })).toBeVisible({ timeout: 45_000 });
      // Away from the hub there is no canvas at all: the scene and its graphics context have been given back.
      await expect(page.locator('canvas')).toHaveCount(0);
      await press(page.getByRole('link', { name: 'Islands' }));
      await expect(stage(page)).toHaveAttribute('data-hub-mode', '3d', { timeout: 45_000 });
      await expect(page.locator('canvas')).toHaveCount(1);
    }
    // (A scene that leaked its context would also be reported by the browser, and any console message fails a test.)
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

test.describe('the hub as a picture', () => {
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
    await expect(stage(page)).toHaveAttribute('data-hub-mode', 'picture');
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
    await expect(stage(page)).toHaveAttribute('data-hub-mode', 'picture');
    await expect(stage(page)).toHaveAttribute('data-hub-reason', 'no-webgl');
    await expect(stage(page).locator('canvas')).toHaveCount(0);

    // The picture really is on screen: seven islands' worth of colour.
    await hubPicturesLoaded(page);
    const pixels = decodePng(await stage(page).screenshot({ scale: 'css' }));
    expect(distinctColours(pixels)).toBeGreaterThan(300);

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
    await expect(stage(page)).toHaveAttribute('data-hub-mode', 'picture');
    await expect(stage(page)).toHaveAttribute('data-hub-reason', 'setting');
    await page.waitForTimeout(2500);
    expect(guard.requested().filter((path) => HUB_3D_CODE.test(path))).toEqual([]);
  });
});

test.describe('the map', () => {
  const worlds = (page: Page) => page.getByRole('navigation', { name: 'Worlds' }).getByRole('link');

  test('every island answers to a tap anywhere on it: its land, its landmark, its name @layout', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(worlds(page)).toHaveCount(6);
    await hubPicturesLoaded(page);
    const report = await worlds(page).evaluateAll((links) =>
      links.map((link) => {
        const box = link.getBoundingClientRect();
        // The middle, the top of the landmark, the name, and the two shores.
        const points: [number, number][] = [
          [0.5, 0.5],
          [0.5, 0.1],
          [0.5, 0.95],
          [0.1, 0.62],
          [0.9, 0.62],
        ];
        return {
          world: link.getAttribute('data-world'),
          hits: points.map(([across, down]) => {
            const hit = document.elementFromPoint(
              box.left + box.width * across,
              box.top + box.height * down,
            );
            return (
              hit?.closest('a')?.getAttribute('data-world') ??
              `not a link (${hit?.tagName ?? 'nothing'})`
            );
          }),
        };
      }),
    );
    for (const { world, hits } of report) {
      expect(hits, String(world)).toEqual(Array(5).fill(world));
    }
  });

  test('a tap high on a landmark opens that island; a tap on its name does too @layout', async ({
    page,
    press,
  }) => {
    for (const [index, name] of (['Memory Forest', 'Number Garden'] as const).entries()) {
      await page.goto('/');
      const link = page.getByRole('link', { name: new RegExp(name) });
      const box = await link.boundingBox();
      if (!box) throw new Error(`${name} is not on screen.`);
      const position =
        index === 0
          ? { x: box.width / 2, y: box.height * 0.2 }
          : { x: box.width / 2, y: box.height - 8 };
      await press(link, { position });
      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    }
  });

  test('the picture of each island sits exactly under its tap area @layout', async ({ page }) => {
    await page.goto('/');
    await hubPicturesLoaded(page);
    const offsets = await worlds(page).evaluateAll((links) =>
      links.map((link) => {
        const world = link.getAttribute('data-world') ?? '';
        const picture = document.querySelector(`[data-sprite="${world}"]`);
        const [x, y] = (picture?.getAttribute('data-anchor') ?? '0,0').split(',').map(Number);
        const stage = document.querySelector('[data-testid="hub-stage"]')?.getBoundingClientRect();
        const box = link.getBoundingClientRect();
        return {
          world,
          // The island's middle, at water level, is the middle of the tap area across…
          across: Math.abs((stage?.left ?? 0) + (x ?? 0) - (box.left + box.width / 2)),
          // …and inside it down the screen, above the name.
          inside:
            (stage?.top ?? 0) + (y ?? 0) > box.top && (stage?.top ?? 0) + (y ?? 0) < box.bottom,
        };
      }),
    );
    for (const offset of offsets) {
      expect(offset.across, offset.world).toBeLessThanOrEqual(1);
      expect(offset.inside, offset.world).toBe(true);
    }
  });

  test('the lighthouse is scenery: tapping it goes nowhere', async ({ page, press }) => {
    await page.goto('/');
    await hubPicturesLoaded(page);
    const lighthouse = page.locator('[data-sprite="academy"]');
    const box = await lighthouse.boundingBox();
    if (!box) throw new Error('The lighthouse is not on screen.');
    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x ?? 0, y ?? 0)?.closest('a, button')?.tagName ?? null,
      [box.x + box.width / 2, box.y + box.height * 0.45],
    );
    expect(hit).toBeNull();
    await press(page.locator('body'), {
      position: { x: box.x + box.width / 2, y: box.y + box.height * 0.45 },
    });
    await expect(page).toHaveURL(/\/$/);
    await expect(worlds(page)).toHaveCount(6);
  });

  test('the island with keyboard focus rises; it settles when focus moves on', async ({ page }) => {
    await page.goto('/');
    await hubPicturesLoaded(page);
    const garden = page.locator('[data-sprite="number-garden"]');
    await expect(garden).not.toHaveAttribute('data-lifted');
    await page.getByRole('link', { name: /Number Garden/ }).focus();
    await expect(garden).toHaveAttribute('data-lifted');
    await page.getByRole('link', { name: /Robot Ridge/ }).focus();
    await expect(garden).not.toHaveAttribute('data-lifted');
    await expect(page.locator('[data-sprite="robot-ridge"]')).toHaveAttribute('data-lifted');
  });

  test('the worlds are reached in teaching order with the Tab key, and Enter opens one', async ({
    page,
    hasTouch,
  }) => {
    test.skip(hasTouch, 'A keyboard journey, checked on the desktop projects.');
    await page.goto('/');
    await expect(worlds(page)).toHaveCount(6);
    const order = await worlds(page).evaluateAll((links) =>
      links.map((link) => link.querySelector('[data-name]')?.textContent ?? ''),
    );
    expect(order).toEqual([...WORLD_NAMES]);
    await page.getByRole('link', { name: /Reading Cove/ }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /Number Garden/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Number Garden' })).toBeVisible();
  });

  test('the guide points at the world that is open, and waves when tapped @layout', async ({
    page,
    press,
  }) => {
    await page.goto('/');
    const glim = page.getByRole('button', { name: /Glim/ });
    await expect(glim).toBeVisible();
    const figure = glim.getByTestId('guide');
    await expect(figure).toHaveAttribute('data-state', 'point');

    // A tap target a small child can hit, clear of every island.
    const box = await glim.boundingBox();
    if (!box) throw new Error('The guide is not on screen.');
    expect(box.width).toBeGreaterThanOrEqual(64);
    expect(box.height).toBeGreaterThanOrEqual(64);
    for (const world of await worlds(page).all()) {
      const other = await world.boundingBox();
      if (!other) continue;
      const apart =
        box.x + box.width <= other.x + 1 ||
        other.x + other.width <= box.x + 1 ||
        box.y + box.height <= other.y + 1 ||
        other.y + other.height <= box.y + 1;
      expect(apart, 'the guide overlaps an island').toBe(true);
    }

    // The arm is on the side of the open island.
    const garden = await page.getByRole('link', { name: /Number Garden/ }).boundingBox();
    if (!garden) throw new Error('Number Garden is not on screen.');
    const toTheRight = garden.x + garden.width / 2 >= box.x + box.width / 2;
    await expect(figure).toHaveAttribute('data-side', toTheRight ? 'right' : 'left');

    await press(glim);
    await expect(figure).toHaveAttribute('data-state', 'wave');
    await expect(figure).toHaveAttribute('data-state', 'point', { timeout: 5000 });
  });
});

test.describe('the picture and the 3D scene', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Needs WebGL, which headless WebKit may lack.',
  );
  test.describe.configure({ timeout: SOFTWARE_3D_TIMEOUT });

  test('put every island in the same place, so nothing jumps when one replaces the other', async ({
    page,
  }) => {
    await page.goto('/?gfx=pictures');
    await hubPicturesLoaded(page);
    const anchors = await page.locator('[data-sprite]').evaluateAll((sprites) =>
      sprites
        .filter((sprite) => !/^(boat|rock|cloud)/.test(sprite.getAttribute('data-sprite') ?? ''))
        .map((sprite) => {
          const [x, y] = (sprite.getAttribute('data-anchor') ?? '0,0').split(',').map(Number);
          return { place: sprite.getAttribute('data-sprite') ?? '', x: x ?? 0, y: y ?? 0 };
        }),
    );
    expect(anchors).toHaveLength(7);
    const picture = decodePng(await stage(page).screenshot({ scale: 'css' }));

    await page.goto('/?gfx=high');
    await expect(stage(page)).toHaveAttribute('data-hub-mode', '3d', { timeout: 60_000 });
    // The cross-fade from the picture has finished.
    await page.waitForTimeout(1500);
    const scene = decodePng(await stage(page).screenshot({ scale: 'css' }));

    for (const { place, x, y } of anchors) {
      // Land at the island's middle in both: the same colour, give or take the light.
      const one = patchColour(picture, x, y);
      const two = patchColour(scene, x, y);
      expect(colourDistance(one, two), `${place}: ${JSON.stringify([one, two])}`).toBeLessThan(60);
      // And it is land, not water: the sea is far bluer than it is red.
      expect(two.b - two.r, place).toBeLessThan(90);
    }
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
