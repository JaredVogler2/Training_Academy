import {
  LESSON_PATH,
  choose,
  expect,
  finishCorrectly,
  finished,
  myTurn,
  next,
  openGrownUps,
  stepNumber,
  test,
  type Page,
} from './fixtures';

const lesson = (page: Page) => page.getByTestId('lesson');

/** Remove everything the game has saved, as "Clear site data" would. */
async function wipeStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    window.localStorage.clear();
    const databases = await window.indexedDB.databases();
    await Promise.all(
      databases.map(
        ({ name }) =>
          new Promise<void>((resolve) => {
            if (!name) {
              resolve();
              return;
            }
            const request = window.indexedDB.deleteDatabase(name);
            request.onsuccess = request.onerror = request.onblocked = () => resolve();
          }),
      ),
    );
  });
}

test.describe('when saved data disappears', () => {
  test('the game starts again cleanly, with nothing broken', async ({ page, press }) => {
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    await choose(page, press, true);
    await press(next(page));
    expect(await stepNumber(page)).toBe(3);

    await wipeStorage(page);
    await page.reload();
    // A fresh sitting: the demonstration again, and a new player.
    await expect(myTurn(page)).toBeVisible();
    expect(await stepNumber(page)).toBe(1);
    await finishCorrectly(page, press);
    await expect(finished(page)).toContainText('3 of 3');

    await openGrownUps(page);
    await expect(page.getByTestId('player')).toHaveCount(1);
    await expect(page.getByTestId('skill').first()).toContainText('3 independent successes');
  });

  test('wiped while the page is open: the next answer is still accepted', async ({
    page,
    press,
    guard,
  }) => {
    // The browser may report the vanished database; the game must carry on regardless.
    guard.allow(/IndexedDB|database|storage/i);
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    await wipeStorage(page);
    await finishCorrectly(page, press);
    await expect(finished(page).getByRole('heading', { name: 'All done!' })).toBeVisible();
  });
});

test.describe('when the browser will not let the game save', () => {
  test('IndexedDB refused: progress is kept in localStorage instead and survives a reload', async ({
    page,
    press,
  }) => {
    await page.addInitScript(() => {
      window.indexedDB.open = () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      };
    });
    await page.goto(LESSON_PATH);
    await press(myTurn(page));
    await choose(page, press, true);
    await press(next(page));
    await page.reload();
    await expect(lesson(page).locator('[data-choice]').first()).toBeVisible();
    expect(await stepNumber(page)).toBe(3);
    await expect(page.getByText('This device is not saving progress right now.')).toHaveCount(0);

    await openGrownUps(page);
    await page.getByTestId('diagnostics').getByText('Diagnostics', { exact: true }).click();
    await expect(
      page.getByTestId('diagnostics').getByText('localstorage', { exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('diagnostics')).toContainText('indexeddb-unavailable');
  });

  test('nothing allowed at all: the game still plays, and tells the grown-up plainly', async ({
    page,
    press,
  }) => {
    await page.addInitScript(() => {
      const refuse = () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      };
      window.indexedDB.open = refuse;
      Storage.prototype.getItem = refuse;
      Storage.prototype.setItem = refuse;
      Storage.prototype.removeItem = refuse;
    });
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Worlds' }).getByRole('link')).toHaveCount(6);
    // Settings still work for this visit.
    await press(page.getByRole('button', { name: 'Calm motion' }));
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');

    await press(page.getByRole('link', { name: /Number Garden/ }));
    await press(page.getByRole('link', { name: 'Play' }));
    await finishCorrectly(page, press);
    await expect(finished(page)).toContainText('3 of 3');

    // Within the visit the record is complete; the grown-up is told it will not last.
    await press(page.getByRole('link', { name: 'Islands' }));
    await press(page.getByRole('link', { name: 'Grown-ups' }));
    await page.getByRole('button', { name: 'Press and hold' }).click({ delay: 2200 });
    await expect(
      page.getByRole('status').filter({ hasText: 'not letting the game save' }),
    ).toBeVisible();
    await expect(page.getByTestId('skill').first()).toContainText('3 independent successes');
  });
});

test.describe('when part of the game cannot be downloaded', () => {
  test('a calm message replaces that part, and the way home still works', async ({
    page,
    press,
    guard,
  }) => {
    // The aborted download, and React's own report of the error the boundary caught, are expected here.
    guard.allow(
      /WorldView|ChunkLoadError|Failed to fetch dynamically imported module|net::ERR_FAILED|Failed to load resource/,
    );
    await page.route('**/immutable/WorldView-*.js', (route) => route.abort());
    await page.goto('/');
    await press(page.getByRole('link', { name: /Memory Forest/ }));

    const message = page.getByRole('alert');
    await expect(
      message.getByRole('heading', { name: 'This part could not be loaded' }),
    ).toBeVisible();
    await expect(message.getByRole('button', { name: 'Load the page again' })).toBeVisible();
    // The shell around it is intact.
    await expect(page.getByRole('button', { name: 'Sound' })).toBeVisible();
    await press(message.getByRole('link', { name: 'Home' }));
    await expect(page.getByRole('navigation', { name: 'Worlds' })).toBeVisible();

    // Once the network is back, loading the page again recovers.
    await page.unroute('**/immutable/WorldView-*.js');
    await page.goto('/world/memory-forest');
    await expect(page.getByRole('heading', { level: 1, name: 'Memory Forest' })).toBeVisible();
  });

  test('a missing build file is a 404, not the app in disguise @smoke', async ({ request }) => {
    const missing = await request.get('/immutable/WorldView-00000000.js');
    expect(missing.status()).toBe(404);
    expect(missing.headers()['content-type'] ?? '').not.toContain('text/html');
  });
});
