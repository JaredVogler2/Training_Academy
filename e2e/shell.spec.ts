import { WORLD_NAMES, expect, test } from './fixtures';

test.describe('the home shell', () => {
  test('shows the brand, the two toggles and all six worlds, laid out for this screen @layout @smoke', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Choose a world' })).toBeAttached();
    await expect(page.getByRole('link', { name: 'Training Academy: Home' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sound' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calm motion' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Grown-ups' })).toBeVisible();

    const worlds = page.getByRole('navigation', { name: 'Worlds' }).getByRole('link');
    await expect(worlds).toHaveCount(6);
    for (const name of WORLD_NAMES) {
      await expect(worlds.filter({ hasText: name })).toBeVisible();
    }
    await expect(page.getByTestId('hub-stage')).toHaveAttribute('data-hub-mode', 'illustrated');

    const viewport = page.viewportSize();
    if (!viewport) throw new Error('no viewport');

    // Nothing scrolls sideways, and the hub is exactly one screen tall.
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth - window.innerWidth,
      height: document.documentElement.scrollHeight - window.innerHeight,
    }));
    expect(overflow).toEqual({ width: 0, height: 0 });

    // Every world is a large target, wholly on screen, and no two overlap.
    const boxes = [];
    for (const world of await worlds.all()) {
      const box = await world.boundingBox();
      if (!box) throw new Error('A world tile is not on screen.');
      expect(box.width).toBeGreaterThanOrEqual(88);
      expect(box.height).toBeGreaterThanOrEqual(88);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5);
      boxes.push(box);
    }
    for (let a = 0; a < boxes.length; a++) {
      for (let b = a + 1; b < boxes.length; b++) {
        const [one, two] = [boxes[a]!, boxes[b]!];
        const apart =
          one.x + one.width <= two.x + 1 ||
          two.x + two.width <= one.x + 1 ||
          one.y + one.height <= two.y + 1 ||
          two.y + two.height <= one.y + 1;
        expect(apart, `tiles ${a} and ${b} overlap`).toBe(true);
      }
    }

    // The top-bar controls are at least 44 px in both directions and do not run off the screen.
    for (const name of ['Sound', 'Calm motion']) {
      const box = await page.getByRole('button', { name }).boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport.width);
    }

    // World names are never cut short.
    const clipped = await worlds.evaluateAll((links) =>
      links
        .map((link) => link.querySelector('span:nth-of-type(2)'))
        .filter((name) => name !== null && name.scrollWidth > name.clientWidth + 1)
        .map((name) => name?.textContent),
    );
    expect(clipped).toEqual([]);
  });

  test('marks which world has something to play and which are not open, in words too', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: 'Number Garden . Something to try.' }),
    ).toBeVisible();
    for (const name of WORLD_NAMES.filter((world) => world !== 'Number Garden')) {
      await expect(page.getByRole('link', { name: `${name} . Not open yet.` })).toBeVisible();
    }
  });
});

test.describe('navigation', () => {
  test('moves between pages with real links; Back and Forward work; title and focus follow', async ({
    page,
    press,
  }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Training Academy');

    await press(page.getByRole('link', { name: /Robot Ridge/ }));
    await expect(page).toHaveURL(/\/world\/robot-ridge$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Robot Ridge' })).toBeVisible();
    await expect(page).toHaveTitle('Robot Ridge · Training Academy');
    // Focus moved to the new page, and assistive technology was told.
    await expect(page.locator('main')).toBeFocused();
    await expect(
      page.getByRole('status').filter({ hasText: 'Robot Ridge · Training Academy' }),
    ).toBeAttached();

    await press(page.getByRole('link', { name: 'Islands' }));
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('navigation', { name: 'Worlds' })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Robot Ridge' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('navigation', { name: 'Worlds' })).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(/\/world\/robot-ridge$/);

    // The brand is the way home from anywhere.
    await press(page.getByRole('link', { name: 'Training Academy: Home' }));
    await expect(page).toHaveURL(/\/$/);
  });

  test('opens any page directly from its address, and again after a refresh @smoke', async ({
    page,
  }) => {
    for (const [path, heading] of [
      ['/world/memory-forest', 'Memory Forest'],
      ['/world/number-garden', 'Number Garden'],
      ['/grown-ups', 'For grown-ups'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
  });

  test('tidies an address with stray slashes', async ({ page }) => {
    await page.goto('/world/robot-ridge/');
    await expect(page.getByRole('heading', { level: 1, name: 'Robot Ridge' })).toBeVisible();
    await expect(page).toHaveURL(/\/world\/robot-ridge$/);
  });

  test('an address that leads nowhere says so and offers the way home', async ({ page, press }) => {
    await page.goto('/world/candy-castle');
    await expect(
      page.getByRole('heading', { level: 1, name: 'This page is not on the map' }),
    ).toBeVisible();
    await expect(page).toHaveTitle('This page is not on the map · Training Academy');
    await press(page.getByRole('link', { name: 'Back to the islands' }));
    await expect(page.getByRole('navigation', { name: 'Worlds' })).toBeVisible();
  });

  test('a world that is not built says so and offers nothing to play', async ({ page }) => {
    await page.goto('/world/reading-cove');
    await expect(page.getByText('This world is not open yet.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Play' })).toHaveCount(0);
    // The only things to press are the way back and the top bar.
    const controls = await page
      .locator('main')
      .getByRole('link')
      .or(page.locator('main').getByRole('button'))
      .allTextContents();
    expect(controls).toEqual(['Islands']);
    await expect(page.getByText('Listening for sounds all around')).toBeVisible();
  });
});

test.describe('sound and motion', () => {
  test('the toggles work, say what they are, and are remembered after a reload', async ({
    page,
    press,
  }) => {
    await page.goto('/');
    const sound = page.getByRole('button', { name: 'Sound' });
    const motion = page.getByRole('button', { name: 'Calm motion' });
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await expect(motion).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');

    await press(sound);
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await expect(sound).toHaveAttribute('title', 'Sound is off');
    await press(motion);
    await expect(motion).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');

    await page.reload();
    await expect(page.getByRole('button', { name: 'Sound' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(page.getByRole('button', { name: 'Calm motion' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  });

  test('calm motion really stops the movement', async ({ page, press }) => {
    await page.goto('/world/number-garden');
    const emblem = page.locator('article header svg');
    const duration = () =>
      emblem.evaluate((element) => getComputedStyle(element).animationDuration);
    expect(await duration()).toBe('5s');
    await press(page.getByRole('button', { name: 'Calm motion' }));
    // The stylesheet collapses every animation to a single instant frame.
    expect(Number.parseFloat(await duration())).toBeLessThan(0.001);
  });

  test('sound actually plays once the page has been touched, and stops when switched off', async ({
    page,
    press,
  }) => {
    // Count the notes the game schedules, without needing a loudspeaker.
    await page.addInitScript(() => {
      const scope = window as unknown as { __notes: number };
      scope.__notes = 0;
      const start = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function (...args) {
        scope.__notes += 1;
        start.apply(this, args);
      };
    });
    const notes = () => page.evaluate(() => (window as unknown as { __notes: number }).__notes);

    await page.goto('/');
    expect(await notes()).toBe(0);
    // The first touch unlocks audio; the next one is heard.
    await press(page.getByRole('button', { name: 'Calm motion' }));
    await press(page.getByRole('button', { name: 'Calm motion' }));
    await expect.poll(notes).toBeGreaterThan(0);

    await press(page.getByRole('button', { name: 'Sound' }));
    const afterMuting = await notes();
    await press(page.getByRole('button', { name: 'Calm motion' }));
    await press(page.getByRole('link', { name: /Number Garden/ }));
    await expect(page.getByRole('heading', { level: 1, name: 'Number Garden' })).toBeVisible();
    expect(await notes()).toBe(afterMuting);
  });
});

test.describe('with the device set to reduce motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the game starts calm, from the first frame', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await expect(page.getByRole('button', { name: 'Calm motion' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('keyboard', () => {
  test.skip(({ hasTouch }) => hasTouch, 'A keyboard journey, checked on the desktop projects.');

  test('skip link, visible focus and Enter all work', async ({ page }) => {
    await page.goto('/');
    // The app must be on screen before the first key press means anything.
    await expect(page.getByRole('navigation', { name: 'Worlds' })).toBeVisible();
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();

    // Tab reaches the first world, and the focus ring is drawn.
    await page.keyboard.press('Tab');
    const first = page.getByRole('link', { name: /Reading Cove/ });
    await expect(first).toBeFocused();
    const ring = await first.evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
    });
    expect(ring.style).toBe('solid');
    expect(ring.width).toBeGreaterThanOrEqual(3);

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /Number Garden/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Number Garden' })).toBeVisible();
  });

  test('a mouse click does not leave a focus ring behind', async ({ page }) => {
    await page.goto('/');
    const sound = page.getByRole('button', { name: 'Sound' });
    await sound.click();
    expect(await sound.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('none');
  });
});
