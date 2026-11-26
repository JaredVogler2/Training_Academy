import { readDesign, type Attempt, type ContentPack, type Setup } from '@/engine';

/**
 * What a child has made on Inventor Island, read from what they did: for each activity, the last design of
 * theirs that was tested and worked, exactly as they left it, and how their guesses went.
 *
 * Nothing here is new evidence and nothing is scored. It is the record of answers, read again as a picture
 * book: a design is drawn from the very answer that was handed in, so the card can show nothing the child did
 * not build.
 */

export interface Invention {
  /** Which workbench it was made at: which picture draws it. */
  bench: string;
  /** The whole set-up as it was tested: what the challenge fixed, and what the child chose. */
  setup: Setup;
  /** The day it was tested and worked, as the device had it. */
  day: string;
}

export interface Page {
  /** The activity, by its lesson. */
  lessonId: string;
  /** The last design that worked, if there has been one. */
  invention: Invention | null;
  /** What the activity hands over to be mended first, as it is handed over: for a page with nothing made yet. */
  toMend: { bench: string; setup: Setup } | null;
  /** How many guesses were made (first answers only), and how many of those came true. */
  guesses: number;
  cameTrue: number;
}

/** One page for each activity of the pack, in its order, from one player's answers. */
export function portfolioOf(pack: ContentPack, attempts: readonly Attempt[]): Page[] {
  return pack.lessons.map((lesson) => {
    const challenges = new Map(lesson.challenges.map((challenge) => [challenge.id, challenge]));
    let invention: (Invention & { at: number }) | null = null;
    const first = lesson.challenges.find(
      (challenge) => challenge.kind === 'make' && challenge.task.type === 'design',
    );
    const toMend =
      first?.kind === 'make' && first.task.type === 'design'
        ? { bench: first.task.model, setup: { ...first.task.given } }
        : null;
    let guesses = 0;
    let cameTrue = 0;
    for (const attempt of attempts) {
      const challenge = challenges.get(attempt.challengeId);
      if (!challenge) continue;
      if (challenge.kind === 'choose-one') {
        // A guess is the first answer; what is tapped after the test has been watched is not one.
        if (attempt.tryIndex !== 0) continue;
        guesses += 1;
        if (attempt.outcome === 'correct') cameTrue += 1;
        continue;
      }
      if (challenge.task.type !== 'design' || attempt.outcome !== 'correct') continue;
      const { task } = challenge;
      const choice = readDesign(task, attempt.response.split('-'));
      // An answer that is no design this task offers (the content has changed since) draws nothing.
      if (!choice) continue;
      if (invention === null || attempt.at >= invention.at) {
        invention = {
          bench: task.model,
          setup: { ...task.given, ...choice },
          day: attempt.day,
          at: attempt.at,
        };
      }
    }
    return {
      lessonId: lesson.id,
      invention:
        invention === null
          ? null
          : { bench: invention.bench, setup: invention.setup, day: invention.day },
      toMend,
      guesses,
      cameTrue,
    };
  });
}
