import { testDesign } from './models';
import { extraAllowed, fitsShape, readTimeKept } from './music';
import { fitsTask, parseProgram, runProgram } from './robot';
import type { Task } from './schema';

/**
 * The rules that judge a thing a child has made: so many given out, cards put in order, the ones that belong picked
 * out, pairs found. Pure functions of the task and of what was done, written down as a string.
 *
 * An answer is written as tokens joined by "-", which is also how it is kept in the learning record:
 *
 *   give     how many were given              "4"
 *   order    the cards, first to last         "seed-sprout-flower"
 *   echo     the cards, in the order tapped   "owl-fox-owl"
 *   select   the cards picked, in any order   "cat-drum-hat" (kept sorted)
 *   recall   the way chosen, and the card     "story-hat"
 *   pairs    how many turns it took           "7"
 *   program  the commands, by first letter    "f-f-l-f", or done three times over, "x3-f-l"
 *   design   the value chosen for each part   "thick-two"
 *   beat     how each beat was met            "on-on-late-on", with "x2" after it for two taps too many
 *   tune     the notes, first to last         "c4-e4-g4"
 */

export interface Judgement {
  correct: boolean;
  /**
   * False when the answer is right but the way it was reached shows the skill was not used: every pair found, but
   * by turning cards over far more often than remembering would need. Such an answer is never evidence of
   * independence.
   */
  clean: boolean;
  /** What a wrong answer suggests, for the grown-up report. */
  misconception?: string;
  /**
   * The parts of a wrong answer that were right, so that the child keeps them and changes only the rest: the cards
   * that do belong, the cards that are already in their places.
   */
  right?: string[];
}

const NUMBER = /^(0|[1-9][0-9]?)$/;

/** The tag a wrong amount should carry, from how far it is from the amount wanted. */
export function quantityMisconception(target: number, chosen: number): string {
  const difference = chosen - target;
  if (difference === 1) return 'one-more';
  if (difference === -1) return 'one-fewer';
  return difference > 0 ? 'many-more' : 'many-fewer';
}

export function tokensOf(response: string): string[] {
  return response === 'none' ? [] : response.split('-');
}

/** Tokens as one answer. An answer with nothing in it is written "none", so that it is still a word. */
export function writeTokens(tokens: readonly string[]): string {
  return tokens.length === 0 ? 'none' : tokens.join('-');
}

function sameSequence(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** The answer that is shown when the lesson shows one. For pairs, there is nothing to show: it is `null`. */
export function solutionOf(task: Task): string | null {
  switch (task.type) {
    case 'give':
      return String(task.want.count);
    case 'order':
    case 'echo':
      return writeTokens(task.solution);
    case 'select':
      return writeTokens([...task.solution].sort());
    case 'recall': {
      // Shown the first way: a demonstration has to look at them somehow.
      const first = task.ways[0];
      return first ? writeTokens([first.way, first.answer]) : null;
    }
    case 'pairs':
      return null;
    case 'program':
      return task.solution;
    case 'design':
    case 'tune':
      return writeTokens(task.solution);
    case 'beat':
      return writeTokens(Array.from({ length: task.beats }, () => 'on'));
  }
}

/** The answer in the parts a hint can give one at a time. */
export function solutionParts(task: Task): string[] {
  switch (task.type) {
    case 'give':
      return Array.from({ length: task.want.count }, (_, index) => String(index + 1));
    case 'order':
    case 'echo':
      return [...task.solution];
    case 'select':
      return [...task.solution].sort();
    case 'recall':
      // One thing is asked for, and it is all of the answer: no hint gives a part of it.
      return task.ways.slice(0, 1).map((first) => first.answer);
    case 'pairs':
      return [];
    case 'program':
      return task.solution.split('-');
    case 'design':
    case 'tune':
      return [...task.solution];
    case 'beat':
      return Array.from({ length: task.beats }, () => 'on');
  }
}

/** The ids a seeded shuffle lays out: the cards as the child sees them. Empty where a task has no cards. */
export function cardIdsOf(task: Task): string[] {
  switch (task.type) {
    case 'give':
    case 'program':
    case 'design':
    case 'beat':
    case 'tune':
      return [];
    case 'order':
    case 'echo':
    case 'select':
    case 'recall':
      // (For a recall, every card of every way: the board lays out the ones the chosen way offers.)
      return task.cards.map((card) => card.id);
    case 'pairs':
      // Two of each.
      return task.cards.flatMap((card) => [card.id, card.id]);
  }
}

/**
 * Judge an answer. `null` means the answer is not one this task could be given at all — a card that is not there,
 * a number where cards were wanted — which is a fault in the caller, never something a child did.
 */
export function judgeTask(task: Task, response: string): Judgement | null {
  const tokens = tokensOf(response);
  switch (task.type) {
    case 'give': {
      if (!NUMBER.test(response)) return null;
      const given = Number(response);
      if (given > task.pile) return null;
      const correct = given === task.want.count;
      return correct
        ? { correct, clean: true }
        : { correct, clean: false, misconception: quantityMisconception(task.want.count, given) };
    }
    case 'order': {
      const ids = task.cards.map((card) => card.id);
      const complete =
        tokens.length === ids.length &&
        new Set(tokens).size === ids.length &&
        tokens.every((id) => ids.includes(id));
      if (!complete) return null;
      const correct = sameSequence(tokens, task.solution);
      if (correct) return { correct, clean: true };
      const firstRight = tokens[0] === task.solution[0];
      const lastRight = tokens.at(-1) === task.solution.at(-1);
      return {
        correct,
        clean: false,
        misconception: firstRight ? 'start-right' : lastRight ? 'end-right' : 'out-of-order',
        right: tokens.filter((id, index) => id === task.solution[index]),
      };
    }
    case 'echo': {
      const ids = task.cards.map((card) => card.id);
      if (tokens.length !== task.solution.length || !tokens.every((id) => ids.includes(id))) {
        return null;
      }
      const correct = sameSequence(tokens, task.solution);
      if (correct) return { correct, clean: true };
      const sameThings = sameSequence([...tokens].sort(), [...task.solution].sort());
      return {
        correct,
        clean: false,
        misconception: sameThings ? 'right-things-wrong-order' : 'wrong-things',
      };
    }
    case 'select': {
      const ids = task.cards.map((card) => card.id);
      const proper =
        tokens.length > 0 &&
        new Set(tokens).size === tokens.length &&
        tokens.every((id) => ids.includes(id));
      if (!proper) return null;
      const wanted = new Set(task.solution);
      const extra = tokens.filter((id) => !wanted.has(id)).length;
      const missing = task.solution.filter((id) => !tokens.includes(id)).length;
      const correct = extra === 0 && missing === 0;
      if (correct) return { correct, clean: true };
      return {
        correct,
        clean: false,
        misconception:
          extra > 0 && missing > 0 ? 'mixed-up' : extra > 0 ? 'too-many' : 'some-missed',
        right: tokens.filter((id) => wanted.has(id)),
      };
    }
    case 'recall': {
      const [chosen, card, ...more] = tokens;
      const way = task.ways.find((each) => each.way === chosen);
      if (!way || card === undefined || more.length > 0 || !way.choices.includes(card)) return null;
      const correct = card === way.answer;
      if (correct) return { correct, clean: true };
      // One of the things that were there, but not the one that went with what was asked about; or a thing that
      // was never there at all. They are different slips.
      return {
        correct,
        clean: false,
        misconception: task.study.includes(card) ? 'went-with-another' : 'not-shown',
      };
    }
    case 'pairs': {
      if (!NUMBER.test(response)) return null;
      const turns = Number(response);
      // Every pair has to be turned over at least once to be found.
      if (turns < task.cards.length) return null;
      return { correct: true, clean: turns <= task.par };
    }
    case 'program': {
      const program = parseProgram(response);
      if (!program || !fitsTask(task, program)) return null;
      const { outcome } = runProgram(task, program);
      return outcome === 'arrived'
        ? { correct: true, clean: true }
        : { correct: false, clean: false, misconception: outcome };
    }
    case 'design': {
      const result = testDesign(task, tokens);
      if (!result) return null;
      return result.works
        ? { correct: true, clean: true }
        : { correct: false, clean: false, misconception: result.outcome };
    }
    case 'beat': {
      const kept = readTimeKept(response, task.beats);
      if (!kept) return null;
      const count = (mark: string) => kept.marks.filter((each) => each === mark).length;
      const tooMany = kept.extra > extraAllowed(task.beats);
      if (count('on') >= task.need && !tooMany) return { correct: true, clean: true };
      const early = count('early');
      const late = count('late');
      const missed = count('miss');
      return {
        correct: false,
        clean: false,
        misconception: tooMany
          ? 'too-many-taps'
          : missed > early + late
            ? 'too-few-taps'
            : early > late
              ? 'ahead-of-the-beat'
              : late > early
                ? 'behind-the-beat'
                : 'uneven',
      };
    }
    case 'tune': {
      if (tokens.length !== task.length || !tokens.every((note) => task.notes.includes(note))) {
        return null;
      }
      const verdict = fitsShape(task.shape, tokens, task.notes[0] ?? '');
      return verdict.fits
        ? { correct: true, clean: true }
        : { correct: false, clean: false, misconception: verdict.problem ?? 'another-shape' };
    }
  }
}
