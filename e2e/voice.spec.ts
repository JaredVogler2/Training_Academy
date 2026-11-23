import {
  LESSON_PATH,
  SETTINGS_KEY,
  arrived,
  choose,
  expect,
  holdGateOpen,
  myTurn,
  next,
  openGrownUps,
  test,
  type Page,
} from './fixtures';

/**
 * The voice: recorded lines, bundled with the game. These tests are about the plumbing — that a line is fetched
 * from the game's own files when it is wanted, is played, and that nothing depends on it. Whether a clip sounds
 * right is not something a test can say.
 */

const clip = (key: string) =>
  new RegExp(`^/immutable/${key.replace(/[.]/g, '\\.')}-[A-Za-z0-9_-]+\\.mp3$`);

/** What Diagnostics says the voice has done this visit: "3 lines said, 0 not heard, this visit". */
async function voiceCounts(page: Page): Promise<{ said: number; unheard: number }> {
  // By the game's own links, not by loading the page afresh: the count is of this visit.
  await page.getByRole('link', { name: 'Leave the activity' }).click();
  await page.getByRole('link', { name: 'Grown-ups' }).click();
  await holdGateOpen(page);
  const diagnostics = page.getByTestId('diagnostics');
  await diagnostics.locator('summary').click();
  const row = diagnostics.locator('div', { hasText: /^Voice/ }).last();
  const text = (await row.textContent()) ?? '';
  const [, said, unheard] = /(\d+) lines said, (\d+) not heard/.exec(text) ?? [];
  return { said: Number(said), unheard: Number(unheard) };
}

test.describe('the voice', () => {
  test('says the lines of an activity aloud, from the game’s own files', async ({
    page,
    press,
    guard,
  }) => {
    // In by tapping, as a child comes in: a browser lets a page make sound only after it has been touched.
    await page.goto('/');
    await press(page.getByRole('link', { name: /Number Garden/ }));
    // Nothing of the voice is fetched until there is something to say.
    expect(guard.requested().filter((path) => path.endsWith('.mp3'))).toEqual([]);
    await press(page.getByRole('link', { name: 'Play', exact: true }));

    // The demonstration: "Watch first.", then the question.
    await expect
      .poll(() => guard.requested().some((path) => clip('lesson.watch').test(path)))
      .toBe(true);
    await expect
      .poll(() => guard.requested().some((path) => clip('ng.same-amount.instruction').test(path)))
      .toBe(true);
    // The way on arrives when the showing is over: by then both lines have been said.
    await arrived(page);
    await press(myTurn(page));
    // A child listens to the question before answering it; so does this test.
    await page.waitForTimeout(2500);
    await choose(page, press, true);
    await expect
      .poll(() => guard.requested().some((path) => clip('ng.same-amount.correct').test(path)))
      .toBe(true);
    // The two groups are counted, lit together, and then it is said: "Yes. The same amount."
    await expect(page.getByTestId('lesson').locator('[data-same="true"]')).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: 'Yes. The same amount.' }),
    ).toBeVisible();
    await page.waitForTimeout(2500);

    // "Watch first.", the question, the question again on the child's turn, and "Yes. The same amount."
    const counts = await voiceCounts(page);
    expect(counts.said).toBe(4);
    expect(counts.unheard).toBe(0);
  });

  test('says nothing, and fetches nothing, while the sound is switched off', async ({
    page,
    press,
    guard,
  }) => {
    await page.addInitScript(
      ({ key }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({ version: 1, sound: false, motion: 'system', graphics: 'pictures' }),
        );
      },
      { key: SETTINGS_KEY },
    );
    await page.goto('/');
    await press(page.getByRole('link', { name: /Number Garden/ }));
    await press(page.getByRole('link', { name: 'Play', exact: true }));
    await press(myTurn(page));
    await choose(page, press, true);
    await expect(next(page)).toBeVisible();
    expect(guard.requested().filter((path) => path.endsWith('.mp3'))).toEqual([]);
  });

  test('is done without when a recording cannot be fetched: the activity carries on', async ({
    page,
    press,
    guard,
  }) => {
    guard.allow(/\.mp3/);
    guard.allow(/Failed to load resource/);
    await page.route('**/*.mp3', (route) => route.abort());
    await page.goto('/');
    await press(page.getByRole('link', { name: /Number Garden/ }));
    await press(page.getByRole('link', { name: 'Play', exact: true }));
    await expect(myTurn(page)).toBeVisible();
    // Long enough for the first line to have been wanted, and found missing.
    await page.waitForTimeout(1500);
    await press(myTurn(page));
    await page.waitForTimeout(1000);
    await choose(page, press, true);
    await expect(
      page.getByRole('status').filter({ hasText: 'Yes. The same amount.' }),
    ).toBeVisible();
    await press(next(page));
    await choose(page, press, true);
    await expect(next(page)).toBeVisible();

    const counts = await voiceCounts(page);
    expect(counts.said).toBe(0);
    expect(counts.unheard).toBeGreaterThanOrEqual(1);
  });

  test('stops talking when the activity is paused or left', async ({ page, press, guard }) => {
    await page.goto('/');
    await press(page.getByRole('link', { name: /Number Garden/ }));
    await press(page.getByRole('link', { name: 'Play', exact: true }));
    await expect
      .poll(() => guard.requested().some((path) => clip('lesson.watch').test(path)))
      .toBe(true);
    // Paused in the middle of the demonstration: nothing more is asked for while the sheet is up.
    await press(page.getByRole('button', { name: 'Pause' }));
    await expect(page.getByRole('dialog')).toBeVisible();
    const before = guard.requested().filter((path) => path.endsWith('.mp3')).length;
    await page.waitForTimeout(2500);
    expect(guard.requested().filter((path) => path.endsWith('.mp3')).length).toBe(before);
  });
});

test.describe('the recordings, for a grown-up to listen to', () => {
  test('are all listed with what each says, can be played, and can be marked', async ({
    page,
    guard,
  }) => {
    await openGrownUps(page);
    // The list is long, and is not fetched until it is asked for.
    expect(guard.requested().some((path) => /manifest-.*\.json$/.test(path))).toBe(false);
    const section = page.getByTestId('voice');
    await section.locator('summary').click();
    const list = page.getByTestId('voice-check');
    await expect(list).toBeVisible();
    await expect(list).toContainText('No person had listened to them');

    const rows = list.getByRole('listitem');
    expect(await rows.count()).toBeGreaterThanOrEqual(43);
    const row = rows.filter({
      has: page.getByText('Which group has the same amount?', { exact: true }),
    });
    await expect(row).toContainText('A recogniser heard these words.');
    await expect(row).toContainText('Not yet listened to by a person.');

    await row.getByRole('button', { name: 'Play: Which group has the same amount?' }).click();
    await expect
      .poll(() => guard.requested().some((path) => clip('ng.same-amount.instruction').test(path)))
      .toBe(true);

    // Marked as sounding wrong: it is on the list to send on, and still there after the page is loaded again.
    await row.getByLabel('Sounds wrong').check();
    await expect(list.getByRole('textbox')).toHaveValue('ng.same-amount.instruction');
    await page.reload();
    await holdGateOpen(page);
    await page.getByTestId('voice').locator('summary').click();
    await expect(page.getByTestId('voice-check').getByRole('textbox')).toHaveValue(
      'ng.same-amount.instruction',
    );
  });
});

test('a lesson opened from its address, with no tap yet, shows everything and waits for nothing', async ({
  page,
  press,
}) => {
  // No tap has woken the audio: the lines cannot be heard, so the showing must not stand still for them.
  await page.goto(LESSON_PATH);
  const started = Date.now();
  await expect(myTurn(page)).toBeVisible();
  await expect(page.getByTestId('lesson').locator('[data-same="true"]')).toBeVisible();
  // The demonstration of two things counted twice takes under four seconds when nothing is said.
  expect(Date.now() - started).toBeLessThan(8000);
  await press(myTurn(page));
});
