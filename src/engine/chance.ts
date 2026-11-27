import type { Challenge, Task } from './schema';
import { judgeTask, writeTokens } from './tasks';

/**
 * Luck.
 *
 * Some questions are easy to get right without knowing anything: with two pictures to choose from, half of all
 * taps land on the right one. What the record says of a skill has to allow for that, or it will call a child who
 * taps without looking "independent" one time in three. So every question has a chance: how likely an answer
 * given without looking is to be right. And every run of first tries alone has a luck: how likely it was to come
 * out at least that well by chance alone.
 *
 * These are arithmetic about the questions. They say nothing about a child, and nothing here guesses whether a
 * particular answer was a guess.
 */

/** A thing to make with more possible answers than this is not gone through answer by answer: its chance is taken as none. */
const MOST_ANSWERS = 20_000;

function factorial(count: number): number {
  let product = 1;
  for (let next = 2; next <= count; next++) product *= next;
  return product;
}

/**
 * How likely every pair is to be found within `par` turns by someone who turns two face-down cards over at
 * random each time and remembers nothing of what they have seen. (With `left` pairs still down, a turn finds one
 * with a chance of one in twice that, less one.)
 */
function pairsByLuck(pairs: number, par: number): number {
  let reached = new Map<number, number>([[0, 1]]);
  for (let left = pairs; left >= 1; left--) {
    const finds = 1 / (2 * left - 1);
    const next = new Map<number, number>();
    for (const [turns, likely] of reached) {
      let stillLooking = 1;
      for (let more = 1; turns + more <= par; more++) {
        next.set(turns + more, (next.get(turns + more) ?? 0) + likely * stillLooking * finds);
        stillLooking *= 1 - finds;
      }
    }
    reached = next;
  }
  let within = 0;
  for (const likely of reached.values()) within += likely;
  return Math.min(1, within);
}

/** Every way of taking one of `options` for each of so many places, in turn. */
function* everyChoice(options: readonly (readonly string[])[]): Generator<string[]> {
  const sizes = options.map((each) => each.length);
  if (sizes.some((size) => size === 0)) return;
  const at = sizes.map(() => 0);
  for (;;) {
    yield at.map((index, place) => options[place]?.[index] ?? '');
    let place = at.length - 1;
    while (place >= 0) {
      at[place] = (at[place] ?? 0) + 1;
      if ((at[place] ?? 0) < (sizes[place] ?? 0)) break;
      at[place] = 0;
      place -= 1;
    }
    if (place < 0) return;
  }
}

/** Of every answer a thing to make can be given from these, the share that is right. None, if there are too many to try. */
function shareRight(task: Task, options: readonly (readonly string[])[]): number {
  const answers = options.reduce((product, each) => product * each.length, 1);
  if (answers === 0 || answers > MOST_ANSWERS) return 0;
  let right = 0;
  for (const answer of everyChoice(options)) {
    const judged = judgeTask(task, writeTokens(answer));
    if (judged?.correct && judged.clean) right += 1;
  }
  return right / answers;
}

function chanceOfTask(task: Task): number {
  switch (task.type) {
    case 'give':
      // Any amount from one to all there are to give from.
      return 1 / task.pile;
    case 'order':
      return 1 / factorial(task.cards.length);
    case 'echo':
      return 1 / task.cards.length ** task.solution.length;
    case 'select':
      // Any of the cards, or any several of them: every handful but the empty one.
      return 1 / (2 ** task.cards.length - 1);
    case 'recall':
      // Whichever way of looking is chosen, one of its few cards is the one.
      return Math.max(...task.ways.map((way) => 1 / way.choices.length));
    case 'pairs':
      return pairsByLuck(task.cards.length, task.par);
    case 'design':
      return shareRight(
        task,
        task.controls.map((control) => control.options),
      );
    case 'tune':
      return shareRight(
        task,
        Array.from({ length: task.length }, () => task.notes),
      );
    case 'program':
    case 'beat':
      // A plan that arrives, or a beat that is kept, among all the plans and tappings there could be: so few
      // that it is taken as none.
      return 0;
  }
}

/**
 * How likely an answer to a challenge is to be right when it is given without looking: a tap on any of the
 * pictures, any amount, any order. Between none and one.
 */
export function chanceOf(challenge: Challenge): number {
  if (challenge.kind === 'choose-one') return 1 / challenge.choices.length;
  return chanceOfTask(challenge.task);
}

/**
 * How likely `successes` or more of some answers were to be right by chance alone, when each has its own chance
 * of being so (`chances`, one for each answer). One when nothing was right, none when chance has no part in
 * enough of them.
 */
export function luckAmong(successes: number, chances: readonly number[]): number {
  if (successes <= 0) return 1;
  if (successes > chances.length) return 0;
  // likely[right] is how likely exactly so many of the answers looked at so far are to be right.
  let likely = [1];
  for (const chance of chances) {
    const each = Math.min(1, Math.max(0, Number.isFinite(chance) ? chance : 0));
    const next = Array.from({ length: likely.length + 1 }, () => 0);
    likely.forEach((sofar, right) => {
      next[right] = (next[right] ?? 0) + sofar * (1 - each);
      next[right + 1] = (next[right + 1] ?? 0) + sofar * each;
    });
    likely = next;
  }
  let tail = 0;
  for (let right = successes; right < likely.length; right++) tail += likely[right] ?? 0;
  return Math.min(1, Math.max(0, tail));
}

/**
 * How likely `successes` or more of `tries` answers were to be right by chance alone, when each has `chance` of
 * being so. One when nothing was right (nothing is easier), none when chance has no part in it.
 */
export function luckOf(successes: number, tries: number, chance: number): number {
  if (successes <= 0) return 1;
  if (!(chance > 0) || successes > tries) return 0;
  if (chance >= 1) return 1;
  let tail = 0;
  let ways = 1;
  for (let right = 0; right <= tries; right++) {
    // `ways` is the number of ways of choosing which `right` of the tries were the right ones.
    if (right >= successes) tail += ways * chance ** right * (1 - chance) ** (tries - right);
    ways = (ways * (tries - right)) / (right + 1);
  }
  return Math.min(1, tail);
}
