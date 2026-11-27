import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import {
  LESSON_PATH,
  expect,
  finishCorrectly,
  holdGateOpen,
  lessonSkill,
  myTurn,
  openGrownUps,
  screenFit,
  test,
  type Page,
} from './fixtures';

const players = (page: Page) => page.getByTestId('player');
const skill = lessonSkill;

async function addPlayer(page: Page, name: string, picture: string) {
  await page.getByRole('button', { name: 'Add a player' }).click();
  await page.getByLabel('Nickname', { exact: true }).fill(name);
  await page.getByRole('radio', { name: picture }).check({ force: true });
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(players(page).filter({ hasText: name })).toBeVisible();
  // The new player is on the list before the dialog has closed: it is added, then chosen, then the dialog shuts.
  // Until it has, everything behind it is inert, and a focus or a key sent to the page goes nowhere. (CI's run 68,
  // in WebKit on three screens: a fold-out was focused and Enter pressed while the dialog was still closing, and
  // the fold-out stayed shut. A click waits for the page to take it; a focus and a key do not.)
  await expect(page.locator('dialog[open]')).toHaveCount(0);
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

  test('a dialog that is cancelled and asked for again in the same breath is there', async ({
    page,
  }) => {
    await openGrownUps(page);
    await page.getByRole('button', { name: 'Add a player' }).click();
    await expect(page.getByLabel('Nickname', { exact: true })).toBeVisible();
    // "Cancel", and then "Add a player" in the moment after the dialog has closed and before the browser has
    // said so. (A browser says a dialog closed in a turn of its own, afterwards.) That late word used to shut
    // the dialog that had just been opened: it was a slow machine in CI that found the moment, and a test there
    // waited a minute for a dialog that was not coming.
    const closedInBetween = await page.evaluate(async () => {
      const press = (name: string) => {
        const button = [...document.querySelectorAll('button')].find(
          (each) => each.textContent.trim() === name,
        );
        if (!button) throw new Error(`No button called ${name}.`);
        button.click();
      };
      const dialog = document.querySelector('dialog[open]');
      if (!(dialog instanceof HTMLDialogElement)) throw new Error('No dialog is open.');
      press('Cancel');
      // Wait for the game to close it, without ever letting the browser take its turn.
      for (let turn = 0; turn < 200 && dialog.open; turn++) await Promise.resolve();
      const closed = !dialog.open;
      press('Add a player');
      return closed;
    });
    // The moment was found: the dialog had closed, and nothing had yet been said about it.
    expect(closedInBetween).toBe(true);
    await expect(page.getByLabel('Nickname', { exact: true })).toBeVisible();
    // And it is still there once the browser has had its say.
    await page.waitForTimeout(400);
    await expect(page.getByLabel('Nickname', { exact: true })).toBeVisible();
    await expect(page.locator('dialog[open]')).toHaveCount(1);
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
    const history = page.getByTestId('learning-history');
    await expect(history).toContainText('3 of 3 first tries were right without help');
    const before = await history.innerText();
    await addPlayer(page, 'Bo', 'Sun');
    await expect(page.getByRole('heading', { name: 'What Bo has shown' })).toBeVisible();
    await expect(skill(page)).toContainText('Nothing recorded yet.');
    await expect(history).toContainText('No answers recorded yet.');
    await page.getByRole('button', { name: 'Switch to this player: Ada' }).click();
    await expect.poll(() => history.innerText()).toBe(before);
    await expect(skill(page)).toContainText('3 independent successes');
  });

  test('save a copy, erase everything, load the copy: the progress comes back exactly', async ({
    page,
    press,
  }) => {
    await page.goto(LESSON_PATH);
    await finishCorrectly(page, press);
    await openGrownUps(page);
    // What the page says once it has read the record. (For the moment before it had, it used to say "Nothing
    // recorded yet" of every skill, and this test, which read the page once and at once, read that: CI's run
    // 55. The page now says nothing of any skill until it has read the record, and says when it has.)
    await expect(page.getByTestId('evidence')).toHaveAttribute('data-settled', 'true');
    await expect(skill(page)).toContainText('3 independent successes');
    const before = await skill(page).innerText();
    const history = page.getByTestId('learning-history');
    await expect(history).toContainText('3 of 3 first tries were right without help');
    await expect(history).toContainText('2 right answers came with practice, a retry, or help');
    const beforeHistory = await history.innerText();
    // Displayed evidence is plain text, so pressing its badge cannot change a record.
    await skill(page)
      .getByText(/^(Practising|Independent so far)$/)
      .click();
    await expect.poll(() => skill(page).innerText()).toBe(before);

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
    await expect.poll(() => skill(page).innerText()).toBe(before);

    await expect.poll(() => history.innerText()).toBe(beforeHistory);

    // Loading the same file again adds nothing.
    await page.getByTestId('import-file').setInputFiles(file);
    await expect(page.getByText('Explorer has been loaded (0 new answers added).')).toBeVisible();
    await expect.poll(() => skill(page).innerText()).toBe(before);
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

  test('device settings: "pictures only" switches the hub to its picture', async ({ page }) => {
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
    await expect(page.getByTestId('hub-stage')).toHaveAttribute('data-hub-mode', 'picture');
    await page.getByRole('link', { name: 'Grown-ups' }).click();
    await holdGateOpen(page);
    const diagnostics = page.getByTestId('diagnostics');
    await diagnostics.getByText('Diagnostics', { exact: true }).click();
    await expect(diagnostics).toContainText('Nothing on this list is sent anywhere.');
    await expect(diagnostics.getByText('indexeddb', { exact: true })).toBeVisible();
    await expect(diagnostics.getByText('picture (setting)')).toBeVisible();
    await expect(diagnostics).toContainText('Mark: shell-ready');
    await expect(diagnostics).toContainText('Loaded: grown-ups');
    await expect(
      diagnostics.getByText('Errors this visit').locator('xpath=following-sibling::dd'),
    ).toHaveText('0');
  });

  test('is readable and usable on this screen @layout', async ({ page }) => {
    await openGrownUps(page);
    // The longest names the form accepts: one with spaces, and one that offers nowhere to break a line.
    // What each player has shown is measured with the rest: the list of every skill is on the page before
    // anything is measured. (It comes a moment after the player does, and the page says when it has.)
    const listed = page.locator('[data-testid="evidence"][data-settled="true"]');
    await addPlayer(page, 'Wonderful long nickname', 'Drop');
    await expect(listed).toBeVisible();
    await expect(page.getByTestId('skill').first()).toBeVisible();
    expect((await screenFit(page)).sideways).toEqual([]);
    await addPlayer(page, 'W'.repeat(24), 'Shell');
    await expect(
      listed.getByRole('heading', { name: `What ${'W'.repeat(24)} has shown` }),
    ).toBeVisible();
    await expect(page.getByTestId('skill').first()).toBeVisible();
    expect((await screenFit(page)).sideways).toEqual([]);
    // A list's own words may be longer than the screen is wide, and Safari lays them out at their full length
    // beneath the control: the page was 440 px wide on an iPhone's 390 (found in CI, where the test above failed).
    // That cannot be seen in every browser, so what prevents it is looked at as well: each list is in a box that
    // cuts off what runs past it, fills that box, and the box is on the screen.
    // (Found and measured in one go: the page draws the card again when the player changes, and lists found a
    // moment before they are measured may no longer be on the page.)
    await expect(page.getByTestId('where-to-begin')).toBeVisible();
    const lists = await page.evaluate(() =>
      [...document.querySelectorAll('select')].map((select) => {
        const holder = select.parentElement;
        const box = holder?.getBoundingClientRect();
        return {
          name: select.id,
          cuts: holder ? getComputedStyle(holder).overflowX : 'no box',
          fills: holder ? Math.abs(select.getBoundingClientRect().width - holder.clientWidth) : -1,
          from: box?.left ?? -1,
          to: box?.right ?? -1,
        };
      }),
    );
    expect(lists.length).toBeGreaterThan(8);
    const screenWidth = page.viewportSize()?.width ?? 0;
    for (const list of lists) {
      expect(list.cuts, list.name).toBe('hidden');
      expect(list.fills, list.name).toBeLessThan(1);
      expect(list.from, list.name).toBeGreaterThanOrEqual(0);
      expect(list.to, list.name).toBeLessThanOrEqual(screenWidth);
    }
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

test('Glim’s suggestions can be switched off without closing a world @layout', async ({ page }) => {
  await openGrownUps(page);
  await addPlayer(page, 'Robin', 'Leaf');
  const suggested = page.getByTestId('next-top');
  const included = page.getByRole('group', { name: 'Worlds Glim suggests' });
  for (const checkbox of await included.getByRole('checkbox').all()) {
    await checkbox.uncheck();
  }
  await expect(
    page.getByTestId('where-to-begin').getByText('Saved.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('next-up')).toHaveAttribute('data-settled', 'true');
  await expect(suggested).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to the game' }).click();
  await expect(page.locator('[data-next="true"]')).toHaveCount(0);
  await page.getByRole('link', { name: /Reading Cove/ }).click();
  await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
});

test('dashboard controls and printable guides work with 200% text @layout', async ({ page }) => {
  await openGrownUps(page);
  await addPlayer(page, 'Robin', 'Leaf');
  await expect(page.getByTestId('evidence')).toHaveAttribute('data-settled', 'true');
  const guides = page.getByTestId('offline-guides');
  const summary = guides.locator('summary');
  await summary.focus();
  await summary.press('Enter');
  await expect(guides.getByRole('heading', { name: 'Robot Ridge' })).toBeVisible();
  await skill(page).locator('summary').click();
  await expect(skill(page).getByText('Builds on', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use quieter settings' }).click();
  await expect(page.getByLabel('Graphics', { exact: true })).toHaveValue('pictures');
  await expect(page.getByLabel('Motion', { exact: true })).toHaveValue('reduced');

  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 390) await page.setViewportSize({ ...viewport, width: 320 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  expect((await screenFit(page)).sideways).toEqual([]);
  for (const target of [summary, skill(page).locator('summary')]) {
    expect((await target.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  const { violations } = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })),
  ).toEqual([]);

  await page.evaluate(() => {
    document.documentElement.dataset.printing = 'guides';
  });
  await page.emulateMedia({ media: 'print' });
  await expect(guides.getByRole('heading', { name: 'Robot Ridge' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Players' })).toBeHidden();
  await expect(guides.getByRole('button', { name: 'Print these activities' })).toBeHidden();
});
