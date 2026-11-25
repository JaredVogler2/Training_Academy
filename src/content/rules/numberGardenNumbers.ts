import {
  amountOf,
  numberMisconception,
  readNumberPicture,
  type ChooseOneChallenge,
  type Lesson,
  type NumberPicture,
} from '@/engine';
import type { Report } from './types';

/**
 * The rules for Number Garden's later questions: the ones asked with a numeral, a staircase, a frame, a path of
 * numbered stones, a story, or a number said aloud.
 *
 * Every picture in them stands for one amount, and the rules work that amount out for themselves from the picture
 * (src/engine/numbers.ts): they do not trust what the content says the answer is.
 *
 *   every picture is well made            a staircase really does go up by one, a path really is in order
 *   the question and its answers agree    a numeral is answered with amounts and an amount with numerals; a
 *                                         staircase with towers; a path, or a number that is said, with numerals
 *   exactly one answer is right           one choice, and only one, stands for the amount asked for, and no two
 *                                         choices stand for the same amount
 *   nothing is beyond what is taught      an activity for numbers up to five shows nothing over five
 *   a wrong choice is wrong for a reason  and the reason written down is the one the amounts give
 *   what is heard needs sound             an activity is marked as needing sound exactly when its questions are said
 */

type Kind = NumberPicture['kind'];

/** What each kind of question may be answered with. */
const ANSWERED_WITH: Readonly<Record<Kind, readonly Kind[]>> = {
  // A group is answered with numerals here. (Answered with groups it is the first game of all, with rules of its own.)
  group: ['numeral'],
  numeral: ['group', 'frame'],
  spoken: ['numeral'],
  // A tower is something to choose, never something asked about.
  tower: [],
  stairs: ['tower'],
  frame: ['numeral', 'group'],
  path: ['numeral'],
  story: ['group', 'numeral'],
};

/** Whether a question is one of these: asked or answered with something other than plain groups of things. */
export function isNumberQuestion(challenge: ChooseOneChallenge): boolean {
  const { stimulus } = challenge.prompt;
  if (stimulus.type === 'sound' || stimulus.type === 'scene') return true;
  return (
    stimulus.type === 'quantity' &&
    challenge.choices.some((choice) => choice.stimulus.type === 'scene')
  );
}

/** The largest amount a skill is about, where its name says: "…-to-5", "…within-10". */
export function skillLimit(skillId: string): number | null {
  const match = /(?:^|[.-])(?:to|within)-(\d+)$/.exec(skillId);
  return match ? Number(match[1]) : null;
}

/** Every amount a picture puts in front of the child: what it stands for, and what a story started with. */
function amountsIn(picture: NumberPicture): number[] {
  switch (picture.kind) {
    case 'story':
      return [picture.start, picture.result];
    case 'stairs':
      return picture.heights;
    case 'path':
      return picture.numbers;
    case 'frame':
      return [picture.places.length];
    case 'group':
    case 'numeral':
    case 'spoken':
    case 'tower':
      return [amountOf(picture)];
  }
}

export function lintNumberQuestion(
  challenge: ChooseOneChallenge,
  lesson: Lesson,
  report: Report,
): void {
  const asked = readNumberPicture(challenge.prompt.stimulus);
  if (!asked) {
    report('number-picture', 'what is asked about is not a picture Number Garden can draw');
    return;
  }
  const offered: { id: string; picture: NumberPicture }[] = [];
  for (const choice of challenge.choices) {
    const picture = readNumberPicture(choice.stimulus);
    if (!picture) {
      report('number-picture', `choice "${choice.id}" is not a picture Number Garden can draw`);
      return;
    }
    offered.push({ id: choice.id, picture });
  }

  // What is asked and what is offered have to be different ways of showing an amount, and all of one kind.
  const allowed =
    asked.kind === 'frame' && asked.asks === 'empty' ? ['group'] : ANSWERED_WITH[asked.kind];
  const kinds = new Set(offered.map(({ picture }) => picture.kind));
  if (kinds.size > 1) {
    report('number-form-mixed', `the choices are of different kinds: ${[...kinds].join(', ')}`);
  }
  for (const { id, picture } of offered) {
    if (!allowed.includes(picture.kind)) {
      report(
        'number-form',
        `a question about a ${asked.kind} cannot be answered with a ${picture.kind} ("${id}")`,
      );
    } else if (picture.kind === 'frame' && picture.asks !== 'filled') {
      report('number-form', `choice "${id}" is a frame that asks a question of its own`);
    }
  }

  // The things in the answers are the things in the question: "how many frogs now?" is answered with frogs.
  if (asked.kind === 'story' || asked.kind === 'frame') {
    for (const { id, picture } of offered) {
      if ((picture.kind === 'group' || picture.kind === 'frame') && picture.item !== asked.item) {
        report(
          'number-other-thing',
          `the question is about "${asked.item}", and choice "${id}" shows "${picture.item}"`,
        );
      }
    }
  }

  // Exactly one answer.
  const target = amountOf(asked);
  const amounts = offered.map(({ picture }) => amountOf(picture));
  const right = offered.filter((_, index) => amounts[index] === target);
  if (right.length !== 1) {
    report(
      'number-answer-count',
      `${String(right.length)} choices stand for ${String(target)}; exactly one must`,
    );
  } else if (right[0]?.id !== challenge.answer) {
    report(
      'number-answer-wrong',
      `"${challenge.answer}" is marked correct but "${right[0]?.id ?? ''}" is the one that stands for ${String(target)}`,
    );
  }
  const repeated = amounts.filter((amount, index) => amounts.indexOf(amount) !== index);
  for (const amount of new Set(repeated)) {
    report('number-duplicate-choice', `two choices both stand for ${String(amount)}`);
  }

  // Nothing beyond what the activity teaches.
  const limit = skillLimit(challenge.skillId);
  if (limit !== null) {
    const shown = [asked, ...offered.map(({ picture }) => picture)].flatMap(amountsIn);
    const most = Math.max(...shown);
    if (most > limit) {
      report(
        'number-beyond-skill',
        `it shows ${String(most)}, and "${challenge.skillId}" goes no further than ${String(limit)}`,
      );
    }
  }

  // Why each wrong choice is tempting.
  const numerals = offered.every(({ picture }) => picture.kind === 'numeral');
  offered.forEach(({ id }, index) => {
    const amount = amounts[index];
    if (amount === undefined || amount === target) return;
    const expected = numberMisconception(asked, amount, numerals);
    const actual = challenge.misconceptions?.[id];
    if (actual === undefined) {
      report(
        'number-misconception-missing',
        `distractor "${id}" has no misconception tag`,
        'warning',
      );
    } else if (actual !== expected) {
      report(
        'number-misconception-wrong',
        `distractor "${id}" is tagged "${actual}" but stands for ${String(amount)} against ${String(target)} ("${expected}")`,
      );
    }
  });

  // What is heard needs sound, and only that.
  if (asked.kind === 'spoken' && lesson.needsSound !== true) {
    report('number-needs-sound', 'a number that is said cannot be heard with the sound off');
  }
  if (asked.kind !== 'spoken' && lesson.needsSound === true) {
    report(
      'number-sound-not-needed',
      'the activity is marked as needing sound, and this can be seen',
    );
  }
}
