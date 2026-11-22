import { readFile } from 'node:fs/promises';
import {
  LESSON_PATH,
  expect,
  finishCorrectly,
  holdGateOpen,
  myTurn,
  openGrownUps,
  screenFit,
  test,
  type Page,
} from './fixtures';

const players = (page: Page) => page.getByTestId('player');
const skill = (page: Page) => page.getByTestId('skill').first();

async function addPlayer(page: Page, name: string, picture: string) {
  await page.getByRole('button', { name: 'Add a player' }).click();
  await page.getByLabel('Nickname', { exact: true }).fill(name);
  await page.getByRole('radio', { name: picture }).check({ force: true });
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(players(page).filter({ hasText: name })).toBeVisible();
}

test.describe('the grown-ups area', () => {
  test('opens only after a press-and-hold, and says honestly that this is not a lock', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Grown-ups' }).click();
    const hold = page.getByRole('button', { name: 'Press and hold' });
    await expect(hold).toBeVisible();
    await expect(page.getByText('It is not a lock')).toBeVisible();

    // A tap, or a short press, does nothing.
    await hold.click();
    await hold.click({ delay: 700 });
    await expect(page.getByRole('heading', { name: 'Players' })).toHaveCount(0);

    // Holding it does.
    await holdGateOpen(page);
    await expect(page.getByRole('heading', { name: 'Players' })).toBeVisible();
    await expect(page.getByText('Everything here stays on this device.')).toBeVisible();

    // It stays open while moving around the game, and asks again after a reload.
    await page.getByRole('link', { name: 'Back to the game' }).click();
    await page.getByRole('link', { name: 'Grown-ups' }).click();
    await expect(page.getByRole('heading', { name: 'Players' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Press and hold' })).toBeVisible();
  });

  test('can be opened from the keyboard by holding Space', async ({ page, hasTouch }) => {
    test.skip(hasTouch, 'A keyboard journey, checked on the desktop projects.');
    await page.goto('/grown-ups');
    await page.getByRole('button', { name: 'Press and hold' }).focus();
    await page.keyboard.down('Space');
    await expect(page.getByRole('heading', { name: 'Players' })).toBeVisible({ timeout: 30_000 });
    await page.keyboard.up('Space');
  });

  test('players can be added, switched, changed and removed, and are still there after a reload', async ({
    page,
  }) => {
    await openGrownUps(page);
    await expect(page.getByText('No players yet.')).toBeVisible();
    // Nothing recorded for nobody.
    await expect(page.getByTestId('skill')).toHaveCount(0);

    // A nickname is required; nothing else is asked for.
    await page.getByRole('button', { name: 'Add a player' }).click();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText('Please type a nickname.')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('textbox')).toHaveCount(1);
    await page.getByRole('button', { name: 'Cancel' }).click();

    await addPlayer(page, 'Robin', 'Leaf');
    await addPlayer(page, 'Sam', 'Moon');
    await expect(players(page)).toHaveCount(2);
    // The newest player is the one playing.
    await expect(players(page).filter({ hasText: 'Sam' })).toContainText('Playing now');
    await expect(page.getByRole('heading', { name: 'What Sam has shown' })).toBeVisible();
    await expect(skill(page)).toHaveAttribute('data-status', 'not-yet-observed');
    await expect(skill(page)).toContainText('Nothing recorded yet.');

    await page.getByRole('button', { name: 'Switch to this player: Robin' }).click();
    await expect(players(page).filter({ hasText: 'Robin' })).toContainText('Playing now');

    await page.getByRole('button', { name: 'Change Sam' }).click();
    await page.getByLabel('Nickname').fill('Sammy');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(players(page).filter({ hasText: 'Sammy' })).toBeVisible();

    await page.reload();
    await openGrownUps(page);
    await expect(players(page)).toHaveCount(2);
    await expect(players(page).filter({ hasText: 'Robin' })).toContainText('Playing now');

    // Removing asks first, and explains what goes with the player.
    await page.getByRole('button', { name: 'Remove Sammy' }).click();
    await expect(page.getByRole('dialog')).toContainText('everything recorded about them');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(players(page)).toHaveCount(2);
    await page.getByRole('button', { name: 'Remove Sammy' }).click();
    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(players(page)).toHaveCount(1);

    // The child's side shows who is playing.
    await page.getByRole('link', { name: 'Back to the game' }).click();
    await expect(page.getByText('Robin', { exact: true })).toBeVisible();
  });

  test('each player has their own record', async ({ page, press }) => {
    await openGrownUps(page);
    await addPlayer(page, 'Ada', 'Star');
    await page.goto(LESSON_PATH);
    await finishCorrectly(page, press);

    await openGrownUps(page);
    await expect(skill(page)).toContainText('3 independent successes');
    await addPlayer(page, 'Bo', 'Sun');
    await expect(page.getByRole('heading', { name: 'What Bo has shown' })).toBeVisible();
    await expect(skill(page)).toContainText('Nothing recorded yet.');
    await page.getByRole('button', { name: 'Switch to this player: Ada' }).click();
    await expect(skill(page)).toContainText('3 independent successes');
  });

  test('save a copy, erase everything, load the copy: the progress comes back exactly', async ({
    page,
    press,
  }) => {
    await page.goto(LESSON_PATH);
    await finishCorrectly(page, press);
    await openGrownUps(page);
    const before = await skill(page).innerText();
    expect(before).toContain('3 independent successes');

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save a copy of Explorer' }).click();
    const file = await (await download).path();
    const saved = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>;
    expect(saved).toMatchObject({ format: 'training-academy.profile-export', formatVersion: 1 });
    expect(saved.checksum).toMatch(/^cyrb53:[0-9a-f]{14}$/);
    expect((saved.attempts as unknown[]).length).toBe(5);
    // Only what the game needs: a nickname and a picture. No birth date, no device id, nothing else.
    expect(Object.keys(saved.profile as object).sort()).toEqual(
      ['avatar', 'createdAt', 'id', 'name', 'schemaVersion', 'settings', 'updatedAt'].sort(),
    );

    await page.getByRole('button', { name: 'Erase everything' }).click();
    await expect(page.getByRole('dialog')).toContainText('cannot be undone');
    await page.getByRole('dialog').getByRole('button', { name: 'Erase everything' }).click();
    await expect(page.getByText('No players yet.')).toBeVisible();
    await page.reload();
    await openGrownUps(page);
    await expect(page.getByText('No players yet.')).toBeVisible();

    await page.getByTestId('import-file').setInputFiles(file);
    await expect(page.getByText('Explorer has been loaded (5 new answers added).')).toBeVisible();
    await expect(players(page)).toHaveCount(1);
    expect(await skill(page).innerText()).toBe(before);

    // Loading the same file again adds nothing.
    await page.getByTestId('import-file').setInputFiles(file);
    await expect(page.getByText('Explorer has been loaded (0 new answers added).')).toBeVisible();
    expect(await skill(page).innerText()).toBe(before);
  });

  test('a damaged or foreign file is refused and changes nothing', async ({ page, press }) => {
    await page.goto(LESSON_PATH);
    await finishCorrectly(page, press);
    await openGrownUps(page);
    const before = await skill(page).innerText();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save a copy of Explorer' }).click();
    const original = await readFile(await (await download).path(), 'utf8');
    const upload = (name: string, text: string) =>
      page
        .getByTestId('import-file')
        .setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });

    // Someone edits the file to turn every answer into an independent success.
    const edited = JSON.parse(original) as { attempts: Record<string, unknown>[] };
    for (const attempt of edited.attempts)
      Object.assign(attempt, { stage: 'independent', tryIndex: 0, hintLevel: 0 });
    await upload('edited.json', JSON.stringify(edited));
    await expect(page.getByText('That file could not be loaded.')).toContainText(
      'changed or damaged',
    );

    await upload('holiday.json', JSON.stringify({ photos: [] }));
    await expect(page.getByText('That file could not be loaded.')).toContainText(
      'not a Training Academy export',
    );
    await upload('broken.json', original.slice(0, 200));
    await expect(page.getByText('That file could not be loaded.')).toContainText('not JSON');

    expect(await skill(page).innerText()).toBe(before);
    await expect(players(page)).toHaveCount(1);
  });

  test('device settings: "pictures only" switches the hub to its illustration', async ({
    page,
  }) => {
    await openGrownUps(page);
    await page.getByLabel('Graphics', { exact: true }).selectOption('auto');
    await page.getByLabel('Motion', { exact: true }).selectOption('reduced');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await page.getByLabel('Graphics', { exact: true }).selectOption('pictures');
    await page.getByRole('checkbox', { name: 'Sound' }).uncheck();

    await page.getByRole('link', { name: 'Back to the game' }).click();
    await expect(page.getByTestId('hub-stage')).toHaveAttribute('data-hub-reason', 'setting');
    await expect(page.getByRole('button', { name: 'Sound' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(page.getByRole('button', { name: 'Calm motion' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('diagnostics show where progress is kept and what was loaded, on the device only', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('hub-stage')).toHaveAttribute('data-hub-mode', 'illustrated');
    await page.getByRole('link', { name: 'Grown-ups' }).click();
    await holdGateOpen(page);
    const diagnostics = page.getByTestId('diagnostics');
    await diagnostics.getByText('Diagnostics', { exact: true }).click();
    await expect(diagnostics).toContainText('Nothing on this list is sent anywhere.');
    await expect(diagnostics.getByText('indexeddb', { exact: true })).toBeVisible();
    await expect(diagnostics.getByText('illustrated (setting)')).toBeVisible();
    await expect(diagnostics).toContainText('Mark: shell-ready');
    await expect(diagnostics).toContainText('Loaded: grown-ups');
    await expect(
      diagnostics.getByText('Errors this visit').locator('xpath=following-sibling::dd'),
    ).toHaveText('0');
  });

  test('is readable and usable on this screen @layout', async ({ page }) => {
    await openGrownUps(page);
    // The longest names the form accepts: one with spaces, and one that offers nowhere to break a line.
    await addPlayer(page, 'Wonderful long nickname', 'Drop');
    expect((await screenFit(page)).sideways).toEqual([]);
    await addPlayer(page, 'W'.repeat(24), 'Shell');
    expect((await screenFit(page)).sideways).toEqual([]);
    // Every part of the page, opened.
    await page.getByTestId('diagnostics').getByText('Diagnostics', { exact: true }).click();
    await page.getByRole('button', { name: `Change ${'W'.repeat(24)}` }).click();
    await expect(page.getByLabel('Nickname', { exact: true })).toBeVisible();
    expect((await screenFit(page)).sideways).toEqual([]);
    await page.getByRole('button', { name: 'Cancel' }).click();
    for (const name of ['Add a player', 'Load a copy', 'Erase everything']) {
      const box = await page.getByRole('button', { name }).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('the way in from a lesson', () => {
  test('is not offered while a child is in an activity', async ({ page, press }) => {
    await page.goto(LESSON_PATH);
    await expect(myTurn(page)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Grown-ups' })).toHaveCount(0);
    await press(page.getByRole('link', { name: 'Leave the activity' }));
    await expect(page.getByRole('link', { name: 'Grown-ups' })).toBeVisible();
  });
});
