import { arrived, expect, myTurn, test, type Page } from './fixtures';

/**
 * What a child presses must be large enough to press, on the screens where there is least room.
 *
 * Each kind of board is tried once, in an activity that uses it, on four screens: a phone held sideways, as a
 * page that has the whole screen and as Safari leaves it; the little a browser leaves the narrowest such phone
 * (640 by 256); and the narrowest phone upright. Every button and link inside the activity is measured while a
 * question is being asked.
 *
 * This is here because of a fault no other test saw. A question that is only a sign — "which has more?" — kept,
 * on a phone held sideways, both the rows it has upright and the columns it has sideways, and the two groups to
 * choose between were a strip 48 pixels high with the lower three quarters of the screen empty; on the narrowest
 * phone, 20 pixels. Every test of that activity passed: they tapped the groups, and a thing 20 pixels high can
 * be tapped.
 */

/** A child's control is 56 points or more across and down (docs/ART_DIRECTION.md → Touch). */
const SMALLEST = 56;

/**
 * Narrower than that, on purpose, and no narrower than this: on the very narrowest screens a few things are as
 * wide as the screen allows and no wider. Each is named, with what it measures.
 */
const KNOWN_NARROW: Readonly<Record<string, number>> = {};

const SCREENS = [
  ['a phone held sideways (844 by 390)', 844, 390],
  // What Safari leaves a page on an iPhone 13 held sideways. It is wider than the screens where a layout changes
  // for want of width and narrower than the one above: the Music Lab's room had bars 47 points wide here, and
  // nowhere else that was being measured.
  ['an iPhone 13 held sideways, in Safari (750 by 342)', 750, 342],
  ['the narrowest phone held sideways, in its browser (640 by 256)', 640, 256],
  ['the narrowest phone upright (320 by 568)', 320, 568],
] as const;

/** One activity for each kind of board, and for each way a question with choices is laid out. */
const BOARDS: readonly (readonly [world: string, lesson: string, what: string])[] = [
  ['reading-cove', 'rc-rhyme-01', 'a word, and pictures that might rhyme with it'],
  ['reading-cove', 'rc-syllables-01', 'a word, and cards of claps'],
  ['reading-cove', 'rc-spell-01', 'a word to build from its letters'],
  ['reading-cove', 'rc-blend-03', 'a word in tiles, and pictures'],
  ['reading-cove', 'rc-sentences-01', 'a sentence, and pictures'],
  ['number-garden', 'ng-same-amount-01', 'a group, and groups to match it'],
  ['number-garden', 'ng-more-01', 'a sign, and two groups'],
  ['number-garden', 'ng-glance-01', 'a group seen for a moment'],
  ['number-garden', 'ng-give-01', 'things to give out'],
  ['number-garden', 'ng-stairs-01', 'a staircase, and towers side by side'],
  ['number-garden', 'ng-frame-02', 'a frame of ten, and groups'],
  ['number-garden', 'ng-numerals-03', 'a number to listen to, and numerals'],
  ['number-garden', 'ng-line-01', 'a path of numbered stones, and numerals'],
  ['number-garden', 'ng-add-01', 'a story, and groups'],
  ['memory-forest', 'mf-hidden-01', 'things looked at and hidden'],
  ['memory-forest', 'mf-pairs-01', 'pairs to find'],
  ['memory-forest', 'mf-order-01', 'an order to repeat'],
  ['memory-forest', 'mf-groups-01', 'things to pick out'],
  ['memory-forest', 'mf-choose-01', 'things, three ways to look at them, and cards to answer with'],
  ['memory-forest', 'mf-later-01', 'five things to pick out from nine'],
  ['explorer-harbor', 'eh-story-01', 'a story to put in order'],
  ['explorer-harbor', 'eh-ending-01', 'a story, and endings'],
  ['explorer-harbor', 'eh-water-01', 'a map to answer on'],
  ['robot-ridge', 'rr-steps-01', 'a row of steps for a robot'],
  ['robot-ridge', 'rr-plan-02', 'a long row of steps, and the keys that run it'],
  ['robot-ridge', 'rr-bridge-01', 'a row of steps, and the step that waits'],
  ['inventor-island', 'ii-bridge-01', 'a guess, and a thing to mend'],
  ['music-lab', 'ml-high-low-01', 'a sign, and two to listen to'],
  ['music-lab', 'ml-same-01', 'two to listen to, and two signs'],
  ['music-lab', 'ml-beat-01', 'a beat to tap'],
  ['music-lab', 'ml-echo-01', 'bars to play back'],
  ['music-lab', 'ml-tune-01', 'a tune to make'],
];

interface Measured {
  name: string;
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Every button and link of the activity that can be seen, with its size. */
async function controls(page: Page): Promise<Measured[]> {
  return page
    .getByTestId('lesson')
    .locator('button, a[href]')
    .evaluateAll((list) =>
      list
        .filter((control) => {
          if (!control.checkVisibility({ visibilityProperty: true, opacityProperty: true })) {
            return false;
          }
          // A card that has been put in its place is still there, unseen, under where it was.
          return (
            control.getAttribute('aria-hidden') !== 'true' && !control.closest('[inert], dialog')
          );
        })
        .map((control) => {
          const box = control.getBoundingClientRect();
          const words = (control.getAttribute('aria-label') ?? control.textContent).trim();
          return {
            name: (words === '' ? control.tagName.toLowerCase() : words).slice(0, 48),
            width: box.width,
            height: box.height,
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: box.bottom,
          };
        }),
    );
}

for (const [screen, width, height] of SCREENS) {
  test.describe(`on ${screen}`, () => {
    test.use({ viewport: { width, height }, reducedMotion: 'reduce' });

    for (const [world, lesson, what] of BOARDS) {
      test(`${what}: everything a child presses is large enough (${lesson})`, async ({
        page,
        press,
      }, testInfo) => {
        test.skip(testInfo.project.name !== 'phone', 'measured once, as a touch phone');
        // In by a tap, as a child comes in: an activity for listening will not start until the audio is awake.
        await page.goto(`/world/${world}`);
        await press(page.locator(`[data-lesson="${lesson}"]`));
        await expect(myTurn(page)).toBeVisible();
        const frame = page.getByTestId('lesson');
        for (let shown = 0; shown < 6 && (await myTurn(page).isVisible()); shown++) {
          const step = (await frame.getAttribute('data-challenge')) ?? '';
          await press(myTurn(page));
          await expect(frame).not.toHaveAttribute('data-challenge', step);
        }
        // Where the things can be looked at in more than one way, the pictures that choose the way are pressed
        // too: they are measured as they stand, and then one is pressed, so that the things can be put away.
        const ways = frame.locator('[data-way-button]');
        const choosing = (await ways.count()) > 0;
        if (choosing) await arrived(page);
        const before = choosing ? await controls(page) : [];
        if (choosing) {
          expect(before.filter((control) => control.name.startsWith('Look at them'))).toHaveLength(
            3,
          );
          await press(ways.last());
        }
        // Where there is something to look at first and then put away, it is put away: what is measured is what
        // is pressed to answer.
        const ready = page.getByRole('button', { name: 'Ready' });
        if (await ready.isVisible()) await press(ready);
        // And where a question is being played or shown, it is heard or seen through: until then what there is
        // to answer with is waiting, and may be turned away.
        await page.waitForFunction(() => {
          const frame = document.querySelector('[data-testid="lesson"]');
          const answers = [...(frame?.querySelectorAll('[data-choice], [data-card]') ?? [])];
          return (
            answers.length === 0 ||
            answers.some((answer) => answer.getAttribute('aria-disabled') !== 'true')
          );
        });
        await arrived(page);

        const found = [...before, ...(await controls(page))];
        // The bar's three, Glim, and at least one thing to answer with.
        expect(found.length).toBeGreaterThanOrEqual(5);
        const least = KNOWN_NARROW[lesson] ?? SMALLEST;
        const small = found
          .filter((control) => control.width < least - 0.5 || control.height < least - 0.5)
          .map(
            (control) =>
              `"${control.name}" is ${control.width.toFixed(0)} by ${control.height.toFixed(0)}`,
          );
        expect(small, `smaller than ${String(least)} points`).toEqual([]);
        const outside = found
          .filter(
            (control) =>
              control.left < -0.5 ||
              control.top < -0.5 ||
              control.right > width + 0.5 ||
              control.bottom > height + 0.5,
          )
          .map((control) => `"${control.name}"`);
        expect(outside, 'off the screen').toEqual([]);
      });
    }
  });
}
