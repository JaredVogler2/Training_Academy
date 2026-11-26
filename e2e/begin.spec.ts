import {
  LESSON_SKILL,
  expect,
  howTo,
  lessonSkill,
  myTurn,
  openGrownUps,
  passHowTo,
  screenFit,
  test,
  worldSettled,
  type Page,
} from './fixtures';
import { WORLDS, lessonsOf } from '../src/game/worlds';

/**
 * Where to begin. A grown-up who knows the child may say what they have seen them do, and have the big "Play"
 * button begin further on. It is their word: nothing is closed by it, and nothing in it is counted as something
 * the child has shown.
 */

const numberGarden = WORLDS.find((world) => world.id === 'number-garden');
if (!numberGarden) throw new Error('There is no Number Garden.');
const ORDER = lessonsOf(numberGarden);
const FIRST = ORDER[0] ?? '';

const card = (page: Page) => page.getByTestId('where-to-begin');
const play = (page: Page) => page.getByRole('link', { name: 'Play', exact: true });
const activity = (page: Page, id: string) => page.locator(`a[data-lesson="${id}"]`);
const seen = (page: Page, what: string) => card(page).getByLabel(what);
const startOf = (page: Page, world: string) => card(page).getByLabel(`${world}: Play begins at`);
const saved = (page: Page) => card(page).getByRole('status');

test.describe('where to begin', () => {
  test.use({ frontDoor: true });

  /** A device with one player on it, who has been shown the way in and has played nothing. */
  async function aNewPlayer(page: Page, press: Parameters<typeof passHowTo>[1]) {
    await page.goto('/');
    await press(page.getByTestId('front-door').locator('button[data-avatar="star"]'));
    await passHowTo(page, press);
  }

  test('is the grown-up’s to say: Play begins there, nothing is closed, and nothing is counted @layout', async ({
    page,
    press,
  }) => {
    test.setTimeout(120_000);
    await aNewPlayer(page, press);

    // As the game begins: Play is the first activity.
    await page.goto('/world/number-garden');
    await worldSettled(page);
    await expect(play(page)).toHaveAttribute('href', `/world/number-garden/play/${FIRST}`);
    await expect(activity(page, FIRST)).toHaveAttribute('data-next', 'true');

    await openGrownUps(page);
    await expect(card(page).getByRole('heading', { name: 'Where Star begins' })).toBeVisible();
    // Everything begins as not yet observed, and every world at its beginning.
    for (const box of await card(page).locator('li[data-observation] select').all()) {
      await expect(box).toHaveValue('');
    }
    await expect(startOf(page, 'Number Garden')).toHaveValue('');
    await expect(card(page).getByTestId('begin-suggestion')).toHaveCount(0);
    // It is a form like the rest of this area: nothing of it is off the side of the screen.
    expect((await screenFit(page)).sideways).toEqual([]);

    // The grown-up has seen this child count five things.
    await seen(page, 'Counts five things, touching each one once').selectOption('seen');
    await expect(saved(page)).toHaveText('Saved.');
    const suggestion = card(page).getByTestId('begin-suggestion');
    await expect(suggestion).toContainText(
      'Play in Number Garden could begin at “Counting to five, then ten, part 2”',
    );
    // Saying it has moved nothing: it is only offered.
    await expect(startOf(page, 'Number Garden')).toHaveValue('');
    await press(suggestion.getByRole('button', { name: 'Begin there' }));
    await expect(startOf(page, 'Number Garden')).toHaveValue('ng-give-02');
    await expect(suggestion).toHaveCount(0);
    expect((await screenFit(page)).sideways).toEqual([]);

    // Nothing has been written into what the child has shown.
    await expect(lessonSkill(page)).toHaveAttribute('data-status', 'not-yet-observed');
    await expect(lessonSkill(page)).toContainText('Nothing recorded yet.');
    await expect(
      page.locator('[data-testid="skill"]:not([data-status="not-yet-observed"])'),
    ).toHaveCount(0);

    // Number Garden: Play is the activity that was chosen…
    await page.goto('/world/number-garden');
    await expect(play(page)).toHaveAttribute('href', '/world/number-garden/play/ng-give-02');
    await expect(activity(page, 'ng-give-02')).toHaveAttribute('data-next', 'true');
    await expect(activity(page, FIRST)).toHaveAttribute('data-next', 'false');
    // …and every activity is still there, none of them marked as done, the ones before it as well.
    await expect(page.locator('a[data-lesson]')).toHaveCount(ORDER.length);
    await expect(page.locator('a[data-lesson][data-done="true"]')).toHaveCount(0);
    await press(activity(page, FIRST));
    await expect(page).toHaveURL(new RegExp(`/play/${FIRST}$`));
    await expect(myTurn(page)).toBeVisible();

    // Another world is as it was.
    await page.goto('/world/reading-cove');
    await worldSettled(page);
    await expect(play(page)).toHaveAttribute('href', '/world/reading-cove/play/rc-listen-01');

    // And it is kept: a new visit finds it so.
    await page.evaluate(() => window.sessionStorage.clear());
    await page.goto('/world/number-garden');
    await expect(play(page)).toHaveAttribute('href', '/world/number-garden/play/ng-give-02');
  });

  test('can be any activity of a world, and the beginning again', async ({ page, press }) => {
    await aNewPlayer(page, press);
    await openGrownUps(page);
    const box = startOf(page, 'Reading Cove');
    // Every activity but the first is there to choose, by the name a grown-up knows it by.
    await expect(box.locator('option')).toHaveCount(
      lessonsOf(WORLDS.find((world) => world.id === 'reading-cove') ?? numberGarden).length,
    );
    await expect(box.locator('option').first()).toHaveText(
      'The beginning: Listening for sounds all around, part 1',
    );
    await box.selectOption({ label: 'Blending sounds into words, part 1' });
    await expect(saved(page)).toHaveText('Saved.');
    await page.goto('/world/reading-cove');
    await expect(play(page)).toHaveAttribute('href', '/world/reading-cove/play/rc-blend-01');

    await openGrownUps(page);
    await expect(startOf(page, 'Reading Cove')).toHaveValue('rc-blend-01');
    await startOf(page, 'Reading Cove').selectOption('');
    // It is written down before the page is left, as it was the first time. (Left in the same breath, the
    // change was lost once, on a busy machine: the world's page had Play where it had been.)
    await expect(saved(page)).toHaveText('Saved.');
    await page.goto('/world/reading-cove');
    // Asked once the page knows who is playing: before that, Play goes to the beginning whatever was chosen.
    await worldSettled(page);
    await expect(play(page)).toHaveAttribute('href', '/world/reading-cove/play/rc-listen-01');
  });

  test('names a real activity to watch them try, and the way back to "how to play"', async ({
    page,
    press,
  }) => {
    await aNewPlayer(page, press);
    await openGrownUps(page);
    await seen(page, 'Taps the thing they mean to').selectOption('not-yet');
    await expect(card(page).getByText(/Glim shows how to play at the very start/)).toBeVisible();
    await press(card(page).getByRole('link', { name: 'Show how to play' }));
    await expect(howTo(page)).toBeVisible();
    await passHowTo(page, press);

    await openGrownUps(page);
    // What was said is still there.
    await expect(seen(page, 'Taps the thing they mean to')).toHaveValue('not-yet');
    await press(
      card(page).getByRole('link', { name: 'Watch them try: Counting to five, then ten, part 1' }),
    );
    await expect(page).toHaveURL(/\/world\/number-garden\/play\/ng-give-01$/);
    await expect(myTurn(page)).toBeVisible();
    // Watching them try it is playing it: that is where what they show comes from, and only there.
    expect(LESSON_SKILL).not.toBe('');
  });

  test('belongs to each player: another child on the same device begins at the beginning', async ({
    page,
    press,
  }) => {
    await aNewPlayer(page, press);
    await openGrownUps(page);
    await startOf(page, 'Number Garden').selectOption('ng-give-02');
    await expect(saved(page)).toHaveText('Saved.');

    await press(page.getByRole('button', { name: 'Add a player' }));
    await page.getByLabel('Nickname').fill('Mina');
    await press(page.getByRole('button', { name: 'Add', exact: true }));
    await expect(card(page).getByRole('heading', { name: 'Where Mina begins' })).toBeVisible();
    await expect(startOf(page, 'Number Garden')).toHaveValue('');
    await page.goto('/world/number-garden');
    await worldSettled(page);
    await expect(play(page)).toHaveAttribute('href', `/world/number-garden/play/${FIRST}`);
  });
});
