import { quantityMisconception, type ChooseOneChallenge, type MakeChallenge } from '@/engine';
import { isNumberQuestion, lintNumberQuestion } from './numberGardenNumbers';
import type { Report, WorldRules } from './types';

/**
 * Number Garden's answers are amounts, so its rules count.
 *
 *   a group to match     exactly one choice has the same amount, and it is not the same picture
 *   "which has more?"    one choice has more than every other; likewise "fewer"
 *   so many to give      there are always more to give from than are wanted
 *   two that are equal   exactly two of the groups have the same amount
 *
 * The questions that bring numerals in — a numeral, a staircase, a frame, a path, a story, a number said aloud —
 * have rules of their own, in numberGardenNumbers.ts.
 */

type Quantity = Extract<ChooseOneChallenge['prompt']['stimulus'], { type: 'quantity' }>;

function quantitiesOf(challenge: ChooseOneChallenge, report: Report): Quantity[] | null {
  const groups: Quantity[] = [];
  for (const choice of challenge.choices) {
    if (choice.stimulus.type !== 'quantity') {
      report('quantity-choice', `choice "${choice.id}" is not a group of things`);
      return null;
    }
    groups.push(choice.stimulus);
  }
  return groups;
}

function duplicates(values: readonly number[]): number[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function lintMatch(challenge: ChooseOneChallenge, target: Quantity, report: Report): void {
  const groups = quantitiesOf(challenge, report);
  if (!groups) return;
  const matching = challenge.choices.filter((_, index) => groups[index]?.count === target.count);
  if (matching.length !== 1) {
    report(
      'quantity-answer-count',
      `${matching.length} choices show ${target.count}; exactly one must`,
    );
  } else if (matching[0]?.id !== challenge.answer) {
    report(
      'quantity-answer-wrong',
      `"${challenge.answer}" is marked correct but "${matching[0]?.id}" is the group of ${target.count}`,
    );
  }
  for (const count of duplicates(groups.map((group) => group.count))) {
    report('quantity-duplicate-choice', `two choices both show ${count}`);
  }
  challenge.choices.forEach((choice, index) => {
    const group = groups[index];
    if (!group) return;
    if (group.count === target.count) {
      if (group.item === target.item && group.arrangement === target.arrangement) {
        report(
          'quantity-picture-match',
          `"${choice.id}" is the same picture as the prompt, so it can be matched without attending to amount`,
        );
      }
      return;
    }
    if (choice.id === challenge.answer) return;
    const expected = quantityMisconception(target.count, group.count);
    const actual = challenge.misconceptions?.[choice.id];
    if (actual === undefined) {
      report(
        'misconception-missing',
        `distractor "${choice.id}" has no misconception tag`,
        'warning',
      );
    } else if (actual !== expected) {
      report(
        'misconception-wrong',
        `distractor "${choice.id}" is tagged "${actual}" but shows ${group.count} against ${target.count} ("${expected}")`,
      );
    }
  });
}

/** The tag for picking the wrong group when asked which has more (or fewer). */
export function comparisonMisconception(
  asked: 'more' | 'fewer',
  chosen: { size?: 'small' | 'big' | undefined },
): string {
  if (asked === 'more') return chosen.size === 'big' ? 'bigger-looks-more' : 'picked-fewer';
  return chosen.size === 'small' ? 'smaller-looks-fewer' : 'picked-more';
}

function lintCompare(challenge: ChooseOneChallenge, asked: 'more' | 'fewer', report: Report): void {
  const groups = quantitiesOf(challenge, report);
  if (!groups) return;
  const counts = groups.map((group) => group.count);
  const extreme = asked === 'more' ? Math.max(...counts) : Math.min(...counts);
  const winners = challenge.choices.filter((_, index) => counts[index] === extreme);
  if (winners.length !== 1) {
    report(
      'compare-tie',
      `${winners.length} groups share the ${asked === 'more' ? 'most' : 'fewest'}`,
    );
  } else if (winners[0]?.id !== challenge.answer) {
    report(
      'compare-answer-wrong',
      `"${challenge.answer}" is marked correct but "${winners[0]?.id}" has ${asked}`,
    );
  }
  for (const count of duplicates(counts))
    report('quantity-duplicate-choice', `two choices both show ${count}`);
  challenge.choices.forEach((choice, index) => {
    const group = groups[index];
    if (!group || choice.id === challenge.answer) return;
    const expected = comparisonMisconception(asked, group);
    const actual = challenge.misconceptions?.[choice.id];
    if (actual === undefined) {
      report(
        'misconception-missing',
        `distractor "${choice.id}" has no misconception tag`,
        'warning',
      );
    } else if (actual !== expected) {
      report(
        'misconception-wrong',
        `distractor "${choice.id}" is tagged "${actual}", not "${expected}"`,
      );
    }
  });
}

function lintMake(challenge: MakeChallenge, report: Report): void {
  const { task } = challenge;
  if (task.type === 'give') {
    if (task.pile < task.want.count + 2) {
      report(
        'give-pile-small',
        `${task.pile} to give from, ${task.want.count} wanted: there must be room to give one too many and still have one left`,
      );
    }
    if (task.item === task.want.item) {
      report('give-same-thing', 'what is given is the same thing as who it is given to');
    }
    return;
  }
  if (task.type === 'select') {
    const counts = new Map<string, number>();
    for (const card of task.cards) {
      if (card.stimulus.type !== 'quantity') {
        report('quantity-choice', `card "${card.id}" is not a group of things`);
        return;
      }
      counts.set(card.id, card.stimulus.count);
    }
    const [first, second, ...rest] = task.solution;
    if (first === undefined || second === undefined || rest.length > 0) {
      report('equal-pair', 'the answer must be exactly two groups');
      return;
    }
    if (counts.get(first) !== counts.get(second)) {
      report('equal-answer-wrong', `"${first}" and "${second}" do not have the same amount`);
    }
    const others = task.cards.filter((card) => !task.solution.includes(card.id));
    const otherCounts = others.map((card) => counts.get(card.id) ?? 0);
    if (duplicates(otherCounts).length > 0 || otherCounts.includes(counts.get(first) ?? -1)) {
      report('equal-second-pair', 'more than one pair of groups has the same amount');
    }
    return;
  }
  report('number-garden-task', `Number Garden has no rule for a "${task.type}" task`);
}

/** Every group of things a challenge shows, wherever it shows it. */
function groupsOf(challenge: ChooseOneChallenge | MakeChallenge): Quantity[] {
  const shown =
    challenge.kind === 'choose-one'
      ? [challenge.prompt.stimulus, ...challenge.choices.map((choice) => choice.stimulus)]
      : challenge.task.type === 'give'
        ? [challenge.task.want]
        : 'cards' in challenge.task
          ? challenge.task.cards.map((card) => card.stimulus)
          : [];
  return shown.filter((stimulus): stimulus is Quantity => stimulus.type === 'quantity');
}

export const numberGardenRules: WorldRules = (challenge, lesson, report) => {
  // Things drawn bigger than usual need the room: there is only room for three of them, in a line.
  for (const group of groupsOf(challenge)) {
    if (group.size === 'big' && (group.count > 3 || group.arrangement !== 'row')) {
      report('quantity-size', `${group.count} big things in a ${group.arrangement} do not fit`);
    }
  }
  if (challenge.kind === 'make') {
    lintMake(challenge, report);
    return;
  }
  const { stimulus } = challenge.prompt;
  if (isNumberQuestion(challenge)) lintNumberQuestion(challenge, lesson, report);
  else if (stimulus.type === 'quantity') lintMatch(challenge, stimulus, report);
  else if (stimulus.type === 'sign' && (stimulus.id === 'more' || stimulus.id === 'fewer')) {
    lintCompare(challenge, stimulus.id, report);
  } else {
    report('number-garden-question', 'Number Garden has no rule for this kind of question');
  }
};
