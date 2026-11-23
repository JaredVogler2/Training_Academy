import AxeBuilder from '@axe-core/playwright';
import { runProgram, solveProgram, type Program } from '../src/engine/robot';
import type { Command, ProgramTask } from '../src/engine/schema';
import {
  arrived,
  expect,
  finished,
  myTurn,
  next,
  screenFit,
  stepNumber,
  test,
  type Locator,
  type Page,
} from './fixtures';

/**
 * Robot Ridge: telling a robot how to get to a star. Each of its four activities is played the way a child would
 * play it — by looking at the ground, the robot and the arrows — rightly and wrongly.
 *
 * What to tap is worked out here from what is on the screen (the grid the board says it is showing), with the same
 * solver the game's content is checked with; nothing is read from the content itself.
 */

const lesson = (page: Page) => page.getByTestId('lesson');
const board = (page: Page) => page.getByTestId('program-board');
const play = (id: string) => `/world/robot-ridge/play/${id}`;
const go = (page: Page) => page.getByRole('button', { name: 'Go', exact: true });
/** What Glim is saying: the question, then whatever has just happened. */
const caption = (page: Page) => lesson(page).locator('p[aria-live="polite"]');
const key = (page: Page, command: Command) => board(page).locator(`[data-key="${command[0]!}"]`);
const slot = (page: Page, place: number) => board(page).locator(`[data-slot="${String(place)}"]`);
const dial = (page: Page) => board(page).locator('[data-times]');

type Press = (target: Locator) => Promise<void>;

const LETTERS: Record<string, Command> = { f: 'forward', l: 'left', r: 'right' };

/** The journey on the board, read from what the board says it is showing. */
async function journeyOn(page: Page): Promise<ProgramTask> {
  const shown = await board(page).evaluate((element) => {
    const { dataset } = element as HTMLElement;
    return {
      mode: dataset.mode ?? '',
      columns: Number(dataset.columns),
      rows: Number(dataset.rows),
      start: dataset.start ?? '',
      goal: dataset.goal ?? '',
      rocks: dataset.rocks ?? '',
      slots: Number(dataset.slots),
      repeats: Number(dataset.repeats),
      keys: [...element.querySelectorAll<HTMLElement>('[data-key]')].map(
        (key) => key.dataset.key ?? '',
      ),
    };
  });
  const pair = (text: string): [number, number] => {
    const [column, row] = text.split(',').map(Number);
    return [column ?? 0, row ?? 0];
  };
  const [column, row, facing] = shown.start.split(',');
  return {
    type: 'program',
    grid: { columns: shown.columns, rows: shown.rows },
    start: { at: [Number(column), Number(row)], facing: facing as ProgramTask['start']['facing'] },
    goal: pair(shown.goal),
    rocks: shown.rocks === '' ? [] : shown.rocks.split(';').map(pair),
    commands: shown.keys.map((letter) => LETTERS[letter]!),
    slots: shown.slots,
    repeats: shown.repeats,
    live: shown.mode === 'live',
    // Not known here, and not needed: the way is found, not looked up.
    solution: 'f',
  };
}

/** A way there, found from what is on the screen. */
async function wayOn(page: Page): Promise<Program> {
  const way = solveProgram(await journeyOn(page));
  if (!way) throw new Error('There is no way to the star on this board.');
  return way;
}

const robotAt = (page: Page) => board(page).getAttribute('data-robot');
const startOf = (page: Page) => board(page).getAttribute('data-start');
const goalOf = (page: Page) => board(page).getAttribute('data-goal');

/** The steps in the row, as the board shows them: "forward left -". */
async function row(page: Page): Promise<string> {
  const commands = await board(page)
    .locator('[data-slot]')
    .evaluateAll((slots) => slots.map((one) => (one as HTMLElement).dataset.command ?? '-'));
  return commands.join(' ');
}

/** Tap the arrows of a journey one after another. */
async function tapOut(page: Page, press: Press, commands: readonly Command[]): Promise<void> {
  for (const command of commands) {
    await press(key(page, command));
    await page.waitForTimeout(160);
  }
}

/** Put a program in the row: its steps, and how many times, where it is done over. */
async function build(page: Page, press: Press, program: Program): Promise<void> {
  await tapOut(page, press, program.commands);
  for (let times = 1; times < program.times; times++) await press(dial(page));
}

/** Run the row and wait for the robot to stop. */
async function run(page: Page, press: Press): Promise<void> {
  await press(go(page));
  await expect(board(page)).toHaveAttribute('data-running', 'false', { timeout: 15_000 });
}

/**
 * From a question that is being asked, answer rightly until the activity ends. `look` is called at each question,
 * before anything is tapped.
 */
async function finishRightly(page: Page, press: Press, look?: () => Promise<void>): Promise<void> {
  for (let guard = 0; guard < 16; guard++) {
    if (await finished(page).isVisible()) return;
    if (await next(page).isVisible()) {
      await press(next(page));
      await page.waitForTimeout(200);
      continue;
    }
    await look?.();
    const mode = await board(page).getAttribute('data-mode');
    const way = await wayOn(page);
    if (mode === 'live') await tapOut(page, press, way.commands);
    else {
      if (mode === 'mend') await mend(page, press);
      else await build(page, press, way);
      await run(page, press);
    }
    await expect(next(page).or(finished(page))).toBeVisible();
  }
  throw new Error('The activity did not finish.');
}

/** Find the one step of the row that is wrong, take it out, and put the right one in. */
async function mend(page: Page, press: Press): Promise<{ place: number; command: Command }> {
  const task = await journeyOn(page);
  const faulty = (await row(page)).split(' ') as Command[];
  for (let place = 0; place < faulty.length; place++) {
    for (const command of task.commands) {
      if (command === faulty[place]) continue;
      const mended = faulty.map((step, at) => (at === place ? command : step));
      if (runProgram(task, { times: 1, commands: mended }).outcome !== 'arrived') continue;
      await press(slot(page, place));
      await press(key(page, command));
      return { place, command };
    }
  }
  throw new Error('No one step mends this row.');
}

test.describe('the world page', () => {
  test('offers its four activities as pictures, and says all four are ready', async ({
    page,
    press,
  }) => {
    await page.goto('/world/robot-ridge');
    await expect(page.getByRole('link', { name: 'Play', exact: true })).toHaveAttribute(
      'href',
      play('rr-move-01'),
    );
    const cards = page.locator('[data-lesson]');
    await expect(cards).toHaveCount(4);
    await arrived(page);
    const drawn: string[] = [];
    for (let index = 0; index < 4; index++) {
      // Each card is a picture of a journey: the ground, the star and the robot, with what the game is beside it.
      const picture = cards.nth(index).locator('svg').first();
      await expect(picture).toBeVisible();
      // A square of the ground in the picture is large enough for the robot on it to be made out. (The smallest
      // is the one picture with two rows of ground: about 23 px on a phone 390 px wide.)
      const shape = await picture.evaluate((svg) => {
        const view = (svg as SVGSVGElement).viewBox.baseVal;
        const box = svg.getBoundingClientRect();
        return {
          square: 100 * Math.min(box.width / view.width, box.height / view.height),
          drawing: svg.innerHTML,
        };
      });
      expect(shape.square, `the picture on card ${String(index + 1)}`).toBeGreaterThanOrEqual(20);
      drawn.push(shape.drawing);
    }
    // No two activities have the same picture.
    expect(new Set(drawn).size).toBe(4);
    const list = page.getByRole('region', { name: 'For grown-ups' }).getByRole('listitem');
    await expect(list.filter({ hasText: 'Ready' })).toHaveCount(4);

    await press(cards.nth(3));
    await expect(page).toHaveURL(new RegExp(`${play('rr-mend-01')}$`));
    await expect(board(page)).toHaveAttribute('data-mode', 'mend');
  });
});

test.describe('one arrow, one move', () => {
  test('a child who knows no letter takes the robot to the star, one tap at a time @layout', async ({
    page,
    press,
  }) => {
    await page.goto(play('rr-move-01'));
    // Glim taps the arrows first; nothing is asked yet, and the arrows do not answer.
    await expect(board(page)).toHaveAttribute('data-mode', 'live');
    expect(await stepNumber(page)).toBe(1);
    await expect(key(page, 'forward')).toHaveAttribute('aria-disabled', 'true');
    await press(myTurn(page));
    expect(await stepNumber(page)).toBe(2);

    // The first journey has one arrow and nowhere to go wrong. The board is all on the screen, and what there is
    // to press is large.
    await expect(board(page).locator('[data-key]')).toHaveCount(1);
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    const box = await key(page, 'forward').boundingBox();
    expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);

    // Each tap is one move, at once, and uses one of the robot's bars of power.
    const power = board(page).getByRole('img', { name: /^Power for/ });
    await expect(power).toHaveAccessibleName('Power for 4 more moves');
    expect(await robotAt(page)).toBe('0,0,east');
    await press(key(page, 'forward'));
    await expect(board(page)).toHaveAttribute('data-robot', '1,0,east');
    await expect(power).toHaveAccessibleName('Power for 3 more moves');
    await press(key(page, 'forward'));
    await press(key(page, 'forward'));
    await expect(board(page)).toHaveAttribute('data-robot', '3,0,east');
    await expect(caption(page)).toHaveText('Yes. The robot is at the star.');
    await press(next(page));

    // Round a corner. Forward twice is once too many: the edge stops the robot, gently — it stays where it is,
    // it is told so, and the tap costs nothing.
    await expect(board(page).locator('[data-key]')).toHaveCount(3);
    await press(key(page, 'forward'));
    await expect(board(page)).toHaveAttribute('data-robot', '0,0,north');
    await expect(power).toHaveAccessibleName('Power for 5 more moves');
    await press(key(page, 'forward'));
    await expect(lesson(page).getByText('The robot cannot go that way.')).toBeAttached();
    await expect(board(page)).toHaveAttribute('data-robot', '0,0,north');
    await expect(power).toHaveAccessibleName('Power for 5 more moves');
    // A turn turns it where it stands.
    await press(key(page, 'right'));
    await expect(board(page)).toHaveAttribute('data-robot', '0,0,east');
    await press(key(page, 'forward'));
    await expect(caption(page)).toHaveText('Yes. The robot is at the star.');
    await press(next(page));

    // On their own. Turning round and round uses the power up: the robot says so and is put back at the start,
    // with all its power, to be tried again.
    const start = await startOf(page);
    const slots = Number(await board(page).getAttribute('data-slots'));
    for (let turn = 0; turn < slots; turn++) {
      await press(key(page, 'left'));
      await page.waitForTimeout(120);
    }
    await expect(caption(page)).toHaveText('The robot has run out of power. Back to the start.');
    await expect(board(page)).toHaveAttribute('data-robot', start ?? '', { timeout: 6000 });
    await expect(power).toHaveAccessibleName(`Power for ${String(slots)} more moves`);
    expect(await stepNumber(page)).toBe(4);

    await tapOut(page, press, (await wayOn(page)).commands);
    await expect(caption(page)).toHaveText('Yes. The robot is at the star.');

    // The rest, rightly. The journey that took two tries is asked again in another shape.
    await finishRightly(page, press);
    await expect(finished(page)).toContainText('3 of 4 right at the first try, with no help.');
  });

  test('shows the way when help is asked for, and then which arrow to tap', async ({
    page,
    press,
  }) => {
    await page.goto(play('rr-move-01'));
    await press(myTurn(page));
    await tapOut(page, press, ['forward', 'forward', 'forward']);
    await press(next(page));

    const help = page.getByRole('button', { name: 'Help me' });
    await press(help);
    await expect(caption(page)).toHaveText('Watch the way to the star.');
    // The robot's shadow goes ahead along the way; the robot itself stays where it is.
    await expect(board(page).locator('svg g[class*="ghost"]')).toBeAttached();
    expect(await robotAt(page)).toBe(await startOf(page));

    await press(help);
    await expect(caption(page)).toHaveText('Tap the arrow I point to.');
    // The hand is on the arrow that is the next step of the way, and moves on as each is tapped.
    const way = (await wayOn(page)).commands;
    for (const command of way) {
      await expect(key(page, command).locator('svg').nth(1)).toBeVisible();
      await press(key(page, command));
      await page.waitForTimeout(160);
    }
    await expect(caption(page)).toHaveText('Yes. The robot is at the star.');
  });
});

test.describe('two and three steps in order', () => {
  test('a row of steps is built, run, changed and run again @layout', async ({ page, press }) => {
    await page.goto(play('rr-steps-01'));
    await expect(board(page)).toHaveAttribute('data-mode', 'plan');
    await press(myTurn(page));

    // Three places, three arrows and "go", all on the screen and all large. There is nothing to run yet.
    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    for (const target of [slot(page, 0), slot(page, 2), key(page, 'forward'), key(page, 'left')]) {
      const box = await target.boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }
    await expect(go(page)).toBeDisabled();
    expect(await row(page)).toBe('- - -');

    // A step goes into the first empty place. Nothing moves until "go".
    const start = await startOf(page);
    await press(key(page, 'forward'));
    await press(key(page, 'left'));
    expect(await row(page)).toBe('forward left -');
    expect(await robotAt(page)).toBe(start);

    // Run: the robot does one step, then the other, and does not arrive. It stays where it stopped, and the row
    // stays as it was built.
    await run(page, press);
    await expect(caption(page)).toHaveText('Not at the star yet. Change a step and try again.');
    await expect(board(page)).toHaveAttribute('data-robot', '1,0,north');
    expect(await row(page)).toBe('forward left -');
    expect(await stepNumber(page)).toBe(2);
    // The run is over: no step is lit any more, and none was one the robot could not take.
    await expect(board(page).locator('[data-slot][data-now="true"]')).toHaveCount(0);
    await expect(board(page).locator('[data-slot][data-stopped="true"]')).toHaveCount(0);

    // Every place and every arrow has a name for someone who cannot see it, and each name says what a tap does.
    await expect(slot(page, 0)).toHaveAccessibleName('Step 1: forward. Take it out.');
    await expect(slot(page, 1)).toHaveAccessibleName('Step 2: turn left. Take it out.');
    await expect(slot(page, 2)).toHaveAccessibleName('Step 3: empty');
    await expect(key(page, 'forward')).toHaveAccessibleName('Forward');
    await expect(key(page, 'right')).toHaveAccessibleName('Turn right');
    await expect(lesson(page).getByText(/^A grid 3 squares across and 1 down\./)).toContainText(
      'The robot is in column 2, row 1, facing up the screen.',
    );

    // Asking to be told again says it again, and leaves the robot where it stopped: that is what there is to see.
    await press(page.getByRole('button', { name: 'Show me again' }));
    await page.waitForTimeout(700);
    expect(await robotAt(page)).toBe('1,0,north');
    expect(await row(page)).toBe('forward left -');

    // Taking a step out puts the robot back at the start, and leaves the step's place for the next one put in.
    await press(slot(page, 1));
    expect(await row(page)).toBe('forward - -');
    await expect(board(page)).toHaveAttribute('data-robot', start ?? '');
    await press(key(page, 'forward'));
    expect(await row(page)).toBe('forward forward -');
    await run(page, press);
    await expect(caption(page)).toHaveText('Yes. Your steps took the robot to the star.');
    expect(await robotAt(page)).toBe(`${(await goalOf(page)) ?? ''},east`);

    await finishRightly(page, press);
    await expect(finished(page)).toContainText('3 of 3 right at the first try, with no help.');
  });

  test('a run waits while the activity is paused, and goes on from where it was', async ({
    page,
    press,
  }) => {
    await page.goto(play('rr-steps-01'));
    await press(myTurn(page));
    await build(page, press, await wayOn(page));
    await press(go(page));
    await expect(board(page)).toHaveAttribute('data-running', 'true');
    await press(page.getByRole('button', { name: 'Pause' }));
    await expect(page.getByRole('dialog')).toBeVisible();

    // Nothing moves and nothing is judged behind the sheet.
    const held = await robotAt(page);
    await page.waitForTimeout(2200);
    expect(await robotAt(page)).toBe(held);
    await expect(board(page)).toHaveAttribute('data-running', 'true');
    expect(await next(page).count()).toBe(0);

    await press(page.getByRole('button', { name: 'Carry on' }));
    await expect(board(page)).toHaveAttribute('data-running', 'false', { timeout: 15_000 });
    await expect(caption(page)).toHaveText('Yes. Your steps took the robot to the star.');
  });

  test('after three runs that do not arrive, shows the steps and where each goes', async ({
    page,
    press,
  }) => {
    await page.goto(play('rr-steps-01'));
    await press(myTurn(page));
    const way = await wayOn(page);
    await press(key(page, 'left'));
    for (let attempt = 0; attempt < 3; attempt++) {
      await run(page, press);
      await expect(caption(page)).toHaveText('Not at the star yet. Change a step and try again.');
      // Each run is a try of its own: the row has to be asked to run again.
      await page.waitForTimeout(300);
    }
    // The wrong step is taken out, and each empty place shows, faintly, the step that belongs in it. The robot is
    // back at the start: the row that was run is no longer there.
    expect(await row(page)).toBe('- - -');
    await expect(board(page)).toHaveAttribute('data-robot', (await startOf(page)) ?? '');
    for (const [place, command] of way.commands.entries()) {
      await expect(slot(page, place).locator(`svg[data-command="${command}"]`)).toBeVisible();
    }
    // The hand is on the arrow for the first empty place.
    await expect(key(page, way.commands[0]!).locator('svg').nth(1)).toBeVisible();

    await build(page, press, way);
    await run(page, press);
    await expect(caption(page)).toHaveText('Yes. Your steps took the robot to the star.');
  });

  test('help puts the first step in, where it stays', async ({ page, press }) => {
    await page.goto(play('rr-steps-01'));
    await press(myTurn(page));
    const way = await wayOn(page);
    const help = page.getByRole('button', { name: 'Help me' });
    await press(help);
    await expect(caption(page)).toHaveText('Watch the way to the star.');
    await press(help);
    await expect(caption(page)).toHaveText('Here is the first step.');
    await expect(slot(page, 0)).toHaveAttribute('data-command', way.commands[0]!);
    await expect(slot(page, 0)).toHaveAttribute('data-fixed', 'true');
    // It cannot be taken out.
    await slot(page, 0).click({ force: true });
    await expect(slot(page, 0)).toHaveAttribute('data-command', way.commands[0]!);

    await tapOut(page, press, way.commands.slice(1));
    await run(page, press);
    await expect(caption(page)).toHaveText('Yes. Your steps took the robot to the star.');
  });

  test('can be built and run from the keyboard', async ({ page, hasTouch }) => {
    test.skip(hasTouch, 'A keyboard journey: for a screen with a keyboard.');
    await page.goto(play('rr-steps-01'));
    await myTurn(page).focus();
    await page.keyboard.press('Enter');
    const way = await wayOn(page);
    for (const command of way.commands) {
      await key(page, command).focus();
      await page.keyboard.press('Enter');
    }
    expect(await row(page)).toBe([...way.commands, '-', '-', '-'].slice(0, 3).join(' '));
    // A step is taken out with the keyboard too, and put back.
    await slot(page, 0).focus();
    await page.keyboard.press('Space');
    expect((await row(page)).startsWith('-')).toBe(true);
    await key(page, way.commands[0]!).focus();
    await page.keyboard.press('Enter');
    await go(page).focus();
    await page.keyboard.press('Enter');
    await expect(caption(page)).toHaveText('Yes. Your steps took the robot to the star.');
  });
});

test.describe('do it again', () => {
  test('a short row is done over, as many times as the dots say @layout', async ({
    page,
    press,
  }) => {
    await page.goto(play('rr-repeat-01'));
    await expect(board(page)).toHaveAttribute('data-mode', 'again');
    await press(myTurn(page));

    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    const box = await dial(page).boundingBox();
    expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);

    // One place for one step: forward, once, is not far enough.
    await expect(board(page).locator('[data-slot]')).toHaveCount(1);
    await press(key(page, 'forward'));
    await expect(dial(page)).toHaveAccessibleName('Do the steps once. Tap for one more time.');
    await run(page, press);
    await expect(caption(page)).toHaveText('Not at the star yet. Change a step and try again.');
    await expect(board(page)).toHaveAttribute('data-robot', '1,0,east');

    // One more time, and one more: the dots say how many, and after the most there can be it is once again.
    const most = Number(await board(page).getAttribute('data-repeats'));
    await press(dial(page));
    await expect(dial(page)).toHaveAttribute('data-times', '2');
    await expect(dial(page)).toHaveAccessibleName('Do the steps twice. Tap for one more time.');
    // Changing how many times puts the robot back at the start.
    await expect(board(page)).toHaveAttribute('data-robot', (await startOf(page)) ?? '');
    for (let times = 3; times <= most; times++) await press(dial(page));
    await expect(dial(page)).toHaveAttribute('data-times', String(most));
    await expect(dial(page)).toHaveAccessibleName(
      `Do the steps ${String(most)} times. Tap to do them once.`,
    );
    await press(dial(page));
    await expect(dial(page)).toHaveAttribute('data-times', '1');

    // Three times is what this journey takes.
    await press(dial(page));
    await press(dial(page));
    await expect(dial(page)).toHaveAccessibleName('Do the steps 3 times. Tap for one more time.');
    await run(page, press);
    await expect(caption(page)).toHaveText('Yes. The same steps, again and again.');
    await expect(board(page)).toHaveAttribute('data-robot', '3,0,east');

    await finishRightly(page, press);
    await expect(finished(page)).toContainText('3 of 3 right at the first try, with no help.');
  });

  test('after three runs that do not arrive, shows how many times as rings, and points at the button', async ({
    page,
    press,
  }) => {
    await page.goto(play('rr-repeat-01'));
    await press(myTurn(page));
    const way = await wayOn(page);
    expect(way.times).toBeGreaterThan(1);
    // The right step, done once, three times over.
    await tapOut(page, press, way.commands);
    for (let attempt = 0; attempt < 3; attempt++) {
      await run(page, press);
      await expect(caption(page)).toHaveText('Not at the star yet. Change a step and try again.');
      await page.waitForTimeout(300);
    }
    // The step was right and stays. What is wanted of the button is shown on it — a ring for each time — and the
    // hand is on it.
    expect(await row(page)).toBe(way.commands.join(' '));
    await expect(dial(page).locator('[data-wanted="true"]')).toHaveCount(way.times);
    await expect(dial(page).locator('svg').nth(1)).toBeVisible();
    for (let times = 1; times < way.times; times++) await press(dial(page));
    // As many times as were wanted: the hand has nothing more to point at.
    await expect(dial(page)).toHaveAttribute('data-times', String(way.times));
    await expect(dial(page).locator('svg')).toHaveCount(1);
    await run(page, press);
    await expect(caption(page)).toHaveText('Yes. The same steps, again and again.');
  });
});

test.describe('find the step that went wrong', () => {
  test('the row runs wrong first; one step is taken out and the right one put in @layout', async ({
    page,
    press,
  }) => {
    await page.goto(play('rr-mend-01'));
    await expect(board(page)).toHaveAttribute('data-mode', 'mend');
    await press(myTurn(page));

    // The row is there already, and is run to show where it goes wrong: the robot is left standing there.
    const faulty = await row(page);
    expect(faulty).not.toContain('-');
    const task = await journeyOn(page);
    const wrong = runProgram(task, { times: 1, commands: faulty.split(' ') as Command[] });
    expect(wrong.outcome).not.toBe('arrived');
    const [column, line] = wrong.pose.at;
    await expect(board(page)).toHaveAttribute(
      'data-robot',
      `${String(column)},${String(line)},${wrong.pose.facing}`,
      { timeout: 15_000 },
    );
    // Each step was lit as it was carried out. Now that the run is over, none is: the last step done is not the
    // wrong one here (the robot went wrong at the turn before it), and a lit step would say that it was.
    await expect(board(page).locator('[data-slot][data-now="true"]')).toHaveCount(0);
    await expect(board(page).locator('[data-slot][data-stopped="true"]')).toHaveCount(0);

    const fit = await screenFit(page);
    expect(fit.sideways).toEqual([]);
    expect(fit.taller).toBe(0);
    for (const target of [slot(page, 0), slot(page, 2), key(page, 'forward'), go(page)]) {
      const box = await target.boundingBox();
      expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(56);
    }

    // The row is full: an arrow has nowhere to go until a step is taken out, and tapping one changes nothing.
    await expect(key(page, 'forward')).toHaveAttribute('aria-disabled', 'true');
    await key(page, 'forward').click({ force: true });
    expect(await row(page)).toBe(faulty);

    // Take the wrong step out — the robot goes back to the start — and put the right one in its place.
    const { place, command } = await mend(page, press);
    await expect(slot(page, place)).toHaveAttribute('data-command', command);
    await expect(board(page)).toHaveAttribute('data-robot', (await startOf(page)) ?? '');
    await run(page, press);
    await expect(caption(page)).toHaveText('Yes. You found the wrong step and changed it.');
    await press(next(page));

    // The next row drives the robot at the edge. The step it could not take is marked and stays marked, and a
    // screen reader is told the robot was stopped. (The step to change is the one before: the turn.)
    const second = await journeyOn(page);
    const stopped = runProgram(second, {
      times: 1,
      commands: (await row(page)).split(' ') as Command[],
    });
    expect(stopped.outcome).toBe('left-the-grid');
    const marked = board(page).locator('[data-slot][data-stopped="true"]');
    await expect(marked).toHaveAttribute('data-slot', String(stopped.moves.at(-1)?.index), {
      timeout: 15_000,
    });
    await expect(board(page).locator('[data-slot][data-now="true"]')).toHaveCount(0);
    await expect(lesson(page).getByText('The robot cannot go that way.')).toBeAttached();

    await finishRightly(page, press);
    await expect(finished(page)).toContainText('3 of 3 right at the first try, with no help.');
  });

  test('help runs the row again, as it was given, and then shows the step to change', async ({
    page,
    press,
  }) => {
    await page.goto(play('rr-mend-01'));
    await press(myTurn(page));
    const faulty = await row(page);
    const task = await journeyOn(page);
    const wrong = runProgram(task, { times: 1, commands: faulty.split(' ') as Command[] });
    const astray = `${String(wrong.pose.at[0])},${String(wrong.pose.at[1])},${wrong.pose.facing}`;

    // A step is taken out — not the wrong one — and then help is asked for. The row is put back as it was given
    // and runs wrong again: what runs and what is in the row are the same thing.
    await press(slot(page, 0));
    expect(await row(page)).not.toBe(faulty);
    await expect(board(page)).toHaveAttribute('data-robot', (await startOf(page)) ?? '');
    const help = page.getByRole('button', { name: 'Help me' });
    await press(help);
    await expect(caption(page)).toHaveText('Watch again. Where does it go wrong?');
    expect(await row(page)).toBe(faulty);
    await expect(board(page)).toHaveAttribute('data-robot', astray, { timeout: 15_000 });

    await press(help);
    await expect(caption(page)).toHaveText('This is the step to change.');

    // The wrong step has been taken out, and the step that belongs there is shown in its place, faintly.
    const after = (await row(page)).split(' ');
    const before = faulty.split(' ');
    const emptied = after.flatMap((step, place) => (step === '-' ? [place] : []));
    expect(emptied).toHaveLength(1);
    expect(after.filter((step, place) => step !== before[place] && step !== '-')).toEqual([]);
    const place = emptied[0]!;
    const wanted = await slot(page, place)
      .locator('svg[data-command]')
      .getAttribute('data-command');
    expect(wanted).not.toBe(before[place]);

    await press(key(page, wanted as Command));
    await run(page, press);
    await expect(caption(page)).toHaveText('Yes. You found the wrong step and changed it.');
  });
});

test.describe('with less motion', () => {
  test('the way is marked instead of walked, and a faulty row is shown where it went wrong', async ({
    page,
    press,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(play('rr-steps-01'));
    // The demonstration is simply shown: the steps in the row, the robot on the star.
    expect(await row(page)).not.toBe('- - -');
    expect(await robotAt(page)).toContain((await goalOf(page)) ?? 'nowhere');
    await press(myTurn(page));
    // With support the way is shown: as marks on the ground, all at once, with the robot still at the start.
    const way = await wayOn(page);
    const moves = way.commands.filter((command) => command === 'forward').length;
    await expect(board(page).locator('svg circle[class*="footprint"]')).toHaveCount(moves + 1);
    expect(await robotAt(page)).toBe(await startOf(page));
    await build(page, press, way);
    await run(page, press);
    await expect(caption(page)).toHaveText('Yes. Your steps took the robot to the star.');

    await page.goto(play('rr-mend-01'));
    await press(myTurn(page));
    const task = await journeyOn(page);
    const wrong = runProgram(task, {
      times: 1,
      commands: (await row(page)).split(' ') as Command[],
    });
    const [column, line] = wrong.pose.at;
    await expect(board(page)).toHaveAttribute(
      'data-robot',
      `${String(column)},${String(line)},${wrong.pose.facing}`,
    );
  });
});

test.describe('accessibility', () => {
  /** Automated checks (axe-core, WCAG 2.1 A and AA): a floor, not a certificate. */
  async function expectNoViolations(page: Page, context: string): Promise<void> {
    await arrived(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const summary = results.violations.map(
      (violation) =>
        `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
    );
    expect(summary, `axe violations on ${context}`).toEqual([]);
  }

  test('the world page', async ({ page }) => {
    await page.goto('/world/robot-ridge');
    await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
    await expect(page.locator('[data-lesson]')).toHaveCount(4);
    await expectNoViolations(page, 'Robot Ridge');
  });

  // One test for each board, so that none of them has more to check than it has time for.
  for (const id of ['rr-move-01', 'rr-steps-01', 'rr-repeat-01', 'rr-mend-01']) {
    test(`${id}: while it is being shown, and while it is being asked`, async ({ page, press }) => {
      await page.goto(play(id));
      await expect(myTurn(page)).toBeVisible();
      await expectNoViolations(page, `${id}: the demonstration`);
      await press(myTurn(page));
      await expect(lesson(page).getByRole('list').first()).toHaveAttribute(
        'aria-label',
        /^Step 2 of/,
      );
      await expectNoViolations(page, `${id}: a question`);
    });
  }

  test('after a run that does not arrive', async ({ page, press }) => {
    // The robot is left where it stopped, and "go" is offered again.
    await page.goto(play('rr-steps-01'));
    await press(myTurn(page));
    await press(key(page, 'left'));
    await run(page, press);
    await expect(caption(page)).toHaveText('Not at the star yet. Change a step and try again.');
    await expectNoViolations(page, 'after a run that did not arrive');
  });
});

/**
 * Every sitting begun on this page is planned from `seed`: the same journeys, in the same order, every time.
 * (A sitting's seed is one 32-bit number from the browser's random source; everything else that asks that source
 * for numbers still gets them.)
 */
async function pinSeed(page: Page, seed: number): Promise<void> {
  await page.addInitScript((value) => {
    const real = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = <T extends ArrayBufferView<ArrayBuffer>>(array: T): T => {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = value;
        return array;
      }
      return real(array);
    };
  }, seed);
}

/**
 * The largest boards there are, on the smallest screens the game is made for. Which journeys a sitting asks is
 * drawn from its seed, so each of these is pinned to a seed that draws the largest: the tallest grid, the longest
 * row, the row with the "again" button beside it. Each test says what it expects to have met, and fails if a
 * change to the content or to how sittings are planned means it no longer does.
 */
const SITTINGS = [
  { id: 'rr-move-01', seed: 4, rows: 3, places: 6 },
  { id: 'rr-steps-01', seed: 24, rows: 3, places: 3 },
  { id: 'rr-repeat-01', seed: 2, rows: 3, places: 4 },
  { id: 'rr-mend-01', seed: 2, rows: 3, places: 5 },
] as const;

for (const [name, width, height, square] of [
  ['a small phone (360 by 740)', 360, 740, 48],
  ['the narrowest Android phone on its side (640 by 256)', 640, 256, 28],
] as const) {
  test.describe(`on ${name}`, () => {
    test.use({ viewport: { width, height } });
    test.skip(({ hasTouch }) => !hasTouch, 'A screen this small is a touch screen.');

    for (const sitting of SITTINGS) {
      test(`${sitting.id}: every board fits, with everything there is to press large enough`, async ({
        page,
        press,
      }) => {
        await pinSeed(page, sitting.seed);
        await page.goto(play(sitting.id));
        await expect(myTurn(page)).toBeVisible();
        // (Once the page has arrived: while it slides in, it is for a moment a few pixels lower than it will be.)
        await arrived(page);
        expect(await screenFit(page), 'the demonstration').toEqual({ sideways: [], taller: 0 });
        await press(myTurn(page));

        const met = { rows: 0, places: 0, boards: 0 };
        await finishRightly(page, press, async () => {
          const task = await journeyOn(page);
          const what = `board ${String(met.boards + 1)}: ${String(task.grid.columns)} by ${String(task.grid.rows)}, ${String(task.slots)} places`;
          met.boards += 1;
          met.rows = Math.max(met.rows, task.grid.rows);
          met.places = Math.max(met.places, task.slots);

          // Measured once what is arriving has arrived: "go" springs into place when there is a row to run, and
          // is for an instant a fraction of a pixel smaller than it will be.
          await arrived(page);
          expect(await screenFit(page), what).toEqual({ sideways: [], taller: 0 });
          // Everything on the board that can be pressed — the arrows, each place of the row, the "again" button —
          // and "go" beside it: wholly on the screen, and at least 56 pixels each way.
          const targets = await board(page).locator('button').all();
          if (!task.live) targets.push(go(page));
          expect(targets.length, what).toBeGreaterThanOrEqual(task.live ? 1 : task.slots + 2);
          for (const target of targets) {
            const name = (await target.getAttribute('aria-label')) ?? (await target.innerText());
            await expect(target, `${what}: ${name}`).toBeInViewport({ ratio: 1 });
            const box = await target.boundingBox();
            expect(
              Math.min(box?.width ?? 0, box?.height ?? 0),
              `${what}: ${name}`,
            ).toBeGreaterThanOrEqual(56);
          }
          // The ground is not pressed, but it has to be seen: a square of it is never smaller than this.
          const ground = await board(page).locator('svg').first().boundingBox();
          const across = Math.min(
            (ground?.width ?? 0) / task.grid.columns,
            (ground?.height ?? 0) / task.grid.rows,
          );
          expect(across, what).toBeGreaterThanOrEqual(square);
        });

        await expect(finished(page)).toContainText('3 of 3 right at the first try, with no help.');
        await arrived(page);
        expect(await screenFit(page), 'the end').toEqual({ sideways: [], taller: 0 });
        expect(met).toEqual({ rows: sitting.rows, places: sitting.places, boards: 5 });
      });
    }
  });
}
