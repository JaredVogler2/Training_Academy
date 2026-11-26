import { describe, expect, it } from 'vitest';
import inventorIsland from '@/content/packs/inventor-island.v2.json';
import { parseContentPack, testSetup, type Attempt, type ContentPack, type Lesson } from '@/engine';
import { dayInWords } from '@/game/dates';
import { portfolioOf } from '@/game/worlds/inventor-island/portfolio';
import { DAY_MS, T0, answerCorrectly, dayOf, newSession, play } from '../helpers/content';

/**
 * The portfolio: what a child has made on Inventor Island, read back from their answers. It is drawn from the
 * answers themselves, so these tests play the activities and then ask what the portfolio makes of what was done.
 */

function pack(): ContentPack {
  const parsed = parseContentPack(structuredClone(inventorIsland));
  if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
  return parsed.value;
}

const island = pack();
const lessonOf = (id: string): Lesson => {
  const lesson = island.lessons.find((each) => each.id === id);
  if (!lesson) throw new Error(`No lesson ${id}.`);
  return lesson;
};
/** One sitting of an activity, every answer right, beginning at `now`. */
const sitting = (id: string, seed: number, now = T0): Attempt[] =>
  play(
    lessonOf(id),
    newSession(lessonOf(id), seed, `s-${id}-${String(seed)}`, now),
    answerCorrectly,
    { now },
  ).attempts;

describe('a portfolio', () => {
  it('has a page for every activity, in order, and nothing on any of them for someone who has not played', () => {
    const pages = portfolioOf(island, []);
    expect(pages.map((page) => page.lessonId)).toEqual(island.lessons.map((lesson) => lesson.id));
    for (const page of pages) {
      expect(page.invention).toBeNull();
      expect(page.guesses).toBe(0);
      expect(page.cameTrue).toBe(0);
      // What is waiting to be mended is shown instead: the first thing the activity hands over, which does not work.
      expect(page.toMend).not.toBeNull();
      if (!page.toMend) continue;
      expect(testSetup(page.toMend.bench, page.toMend.setup)?.works).toBe(false);
    }
  });

  it('shows the last thing mended at a bench, exactly as it was tested, and it is a thing that works', () => {
    const attempts = sitting('ii-bridge-01', 3);
    const [bridge, ramp] = portfolioOf(island, attempts);
    expect(ramp?.invention).toBeNull();
    const made = bridge?.invention;
    expect(made).not.toBeNull();
    if (!made) return;
    expect(made.bench).toBe('bridge');
    expect(made.day).toBe(dayOf(T0));
    // The whole set-up is there: what was fixed, and what was chosen.
    expect(Object.keys(made.setup).sort()).toEqual(['gap', 'plank', 'posts', 'traveller']);
    expect(testSetup('bridge', made.setup)?.works).toBe(true);
    // And it is the last design handed in that worked, as it was handed in.
    const last = attempts
      .filter((attempt) => {
        const challenge = lessonOf('ii-bridge-01').challenges.find(
          (each) => each.id === attempt.challengeId,
        );
        return challenge?.kind === 'make' && attempt.outcome === 'correct';
      })
      .at(-1);
    const [plank, posts] = (last?.response ?? '').split('-');
    expect(made.setup).toMatchObject({ plank, posts });
  });

  it('takes a later sitting over an earlier one, whichever order the answers are handed over in', () => {
    const early = sitting('ii-bridge-01', 3, T0);
    const late = sitting('ii-bridge-01', 11, T0 + 3 * DAY_MS);
    const forwards = portfolioOf(island, [...early, ...late])[0]?.invention;
    const backwards = portfolioOf(island, [...late, ...early])[0]?.invention;
    expect(forwards?.day).toBe(dayOf(T0 + 3 * DAY_MS));
    expect(backwards).toEqual(forwards);
  });

  it('draws nothing from a design that did not work', () => {
    const lesson = lessonOf('ii-bridge-01');
    // The design each mend starts with is handed straight back: it sags, every time.
    const handedBack = new Set<string>();
    const { attempts } = play(lesson, newSession(lesson, 3), (view) => {
      const { challenge } = view;
      // The first time a mend is met, what it was handed over as is handed straight back.
      if (challenge.kind === 'make' && !handedBack.has(challenge.id) && view.shownAnswer === null) {
        const { task } = challenge;
        if (task.type === 'design') {
          handedBack.add(challenge.id);
          const start = task.controls.map((control) => String(task.given[control.id]));
          return { type: 'answer', response: start.join('-') };
        }
      }
      return answerCorrectly(view);
    });
    const wrong = attempts.filter((attempt) => attempt.outcome === 'incorrect');
    expect(wrong.length).toBeGreaterThan(0);
    // Only the wrong ones: nothing is made of them.
    expect(portfolioOf(island, wrong)[0]?.invention).toBeNull();
    // With the right ones that followed: what is drawn is one that works.
    const made = portfolioOf(island, attempts)[0]?.invention;
    expect(made && testSetup('bridge', made.setup)?.works).toBe(true);
  });

  it('counts a guess once, at the first answer, and says how many came true', () => {
    const lesson = lessonOf('ii-ramp-01');
    // Every guess wrong at first, then right once the test has been watched.
    const guessed = new Set<string>();
    const { attempts } = play(lesson, newSession(lesson, 5), (view) => {
      const { challenge } = view;
      if (
        challenge.kind === 'choose-one' &&
        !guessed.has(challenge.id) &&
        view.shownAnswer === null
      ) {
        guessed.add(challenge.id);
        const wrong = challenge.choices.find((choice) => choice.id !== challenge.answer);
        if (wrong) return { type: 'answer', response: wrong.id };
      }
      return answerCorrectly(view);
    });
    const page = portfolioOf(island, attempts)[1];
    const firstGuesses = attempts.filter((attempt) => {
      const challenge = lesson.challenges.find((each) => each.id === attempt.challengeId);
      return challenge?.kind === 'choose-one' && attempt.tryIndex === 0;
    });
    expect(firstGuesses.length).toBeGreaterThan(0);
    expect(page?.guesses).toBe(firstGuesses.length);
    expect(page?.cameTrue).toBe(0);
    // Played rightly, every guess came true.
    const right = portfolioOf(island, sitting('ii-ramp-01', 5))[1];
    expect(right?.guesses).toBeGreaterThan(0);
    expect(right?.cameTrue).toBe(right?.guesses);
  });

  it('keeps each activity to its own page, and takes no notice of answers from anywhere else', () => {
    const attempts = [...sitting('ii-bridge-01', 3), ...sitting('ii-shelter-01', 4)];
    const pages = portfolioOf(island, attempts);
    expect(pages.map((page) => page.invention?.bench ?? null)).toEqual([
      'bridge',
      null,
      null,
      null,
      'shelter',
    ]);
    const elsewhere: Attempt = {
      ...attempts[0]!,
      lessonId: 'ng-same-amount-01',
      challengeId: 'ng-same-amount-01.demo-two',
    };
    expect(portfolioOf(island, [elsewhere])).toEqual(portfolioOf(island, []));
  });

  it('draws nothing from an answer that is no design the bench offers any more', () => {
    const attempts = sitting('ii-bridge-01', 3).map((attempt) =>
      attempt.outcome === 'correct' && attempt.response.includes('-')
        ? { ...attempt, response: 'golden-seven' }
        : attempt,
    );
    expect(portfolioOf(island, attempts)[0]?.invention).toBeNull();
  });
});

describe('a day, in words', () => {
  it('is written as a grown-up would write it', () => {
    expect(dayInWords('2026-11-26')).toBe('26 November 2026');
    expect(dayInWords('2027-01-05')).toBe('5 January 2027');
  });

  it('is left as it is when it is not a day', () => {
    expect(dayInWords('soon')).toBe('soon');
    expect(dayInWords('2026-13-01')).toBe('2026-13-01');
  });
});
