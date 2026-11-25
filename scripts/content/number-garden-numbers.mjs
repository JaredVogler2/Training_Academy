// Number Garden's later activities: the ones that bring numerals in, once an amount means something.
//
//   one more each time        a staircase of towers with one missing        (the number line, before numerals)
//   fill the five             how many more fill a frame of five            (number bonds to five)
//   fill the ten              the same, with ten places
//   numbers one to five       a group and its numeral, both ways about
//   zero, and six to ten      the same on a frame of ten, where none at all can be seen
//   hear a number             a number is said; which numeral is it?
//   the number path           numbered stones in a line, one of them bare   (the number line, with numerals)
//   some more come            adding, as a story: answered with a group up to five, with a numeral up to ten
//   some go away              taking away, likewise
//
// As everywhere in these scripts, each table row is one challenge, and the builders turn a row into the whole of
// it. Nothing is random. The rules that check the result (src/content/rules/numberGardenNumbers.ts) work the
// answers out for themselves, from the pictures, and do not trust what is written here.

import { NUMBER_WORDS } from './lib.mjs';

const PLURALS = {
  apple: 'apples',
  leaf: 'leaves',
  snail: 'snails',
  acorn: 'acorns',
  bird: 'birds',
  mouse: 'mice',
  frog: 'frogs',
};
const LETTERS = ['a', 'b', 'c', 'd'];

const amount = (count, item) => `${NUMBER_WORDS[count]} ${count === 1 ? item : PLURALS[item]}`;

// What can be shown, and what each is called for someone who cannot see it.
const group = (item, count, arrangement = 'row') => ({
  amount: count,
  label: amount(count, item),
  stimulus: { type: 'quantity', item, count, arrangement },
});
const numeral = (value) => ({
  amount: value,
  label: `the number ${value}`,
  stimulus: { type: 'scene', scene: 'numeral', of: { value } },
});
const tower = (count) => ({
  amount: count,
  label: `a tower of ${NUMBER_WORDS[count]} ${count === 1 ? 'block' : 'blocks'}`,
  stimulus: { type: 'scene', scene: 'tower', of: { count } },
});
/** `places` is written as a string of 1s and 0s, a 1 for each place that is full. */
const frame = (item, places, asks) => ({
  type: 'scene',
  scene: 'frame',
  of: {
    places: Array.from(places, Number),
    item,
    ...(asks === 'empty' ? { count: 'empty' } : {}),
  },
});
/** A frame of ten with so many in it, filled from the left: the way it is shown when it stands for an amount. */
const tenWith = (item, count) => ({
  amount: count,
  label: `a frame holding ${amount(count, item)}`,
  stimulus: frame(item, '1'.repeat(count) + '0'.repeat(10 - count)),
});

/** How a group that is offered as an answer is laid out: never always the same way, so the layout tells nothing. */
const LAYOUTS = ['row', 'cluster', 'scatter'];
const layoutFor = (count, index) => (count === 1 || count > 5 ? 'row' : LAYOUTS[index % 3]);

/**
 * Why a wrong number is tempting. This says the same as `numberMisconception` in src/engine/numbers.ts, and the
 * rules compare the two.
 */
function tagFor(asked, target, chosen, numerals) {
  if (asked.story) {
    if (chosen === asked.story.start) return 'counted-what-was-there-first';
    if (chosen === asked.story.change) {
      return asked.story.kind === 'join' ? 'counted-those-that-came' : 'counted-those-that-left';
    }
  }
  if (asked.full !== undefined && chosen === asked.full) return 'counted-the-full-places';
  if (numerals && ((target === 6 && chosen === 9) || (target === 9 && chosen === 6))) {
    return 'looks-alike';
  }
  const difference = chosen - target;
  if (difference === 1) return 'one-more';
  if (difference === -1) return 'one-fewer';
  return difference > 0 ? 'many-more' : 'many-fewer';
}

/**
 * One question. `offered` is what there is to choose from, in the order it is written (the game shuffles it);
 * the answer is whichever of them stands for `target`.
 */
function question({ lesson, skill, name, variant, prompt, target, offered, strings, asked = {} }) {
  const right = offered.findIndex((choice) => choice.amount === target);
  if (right < 0 || offered.some((choice, index) => index !== right && choice.amount === target)) {
    throw new Error(`${lesson}.${name}: exactly one of what is offered must be ${target}`);
  }
  const made = offered.map((choice, index) => ({
    id: LETTERS[index],
    label: choice.label,
    stimulus: choice.stimulus,
  }));
  const numerals = offered.every((choice) => choice.stimulus.scene === 'numeral');
  const wrong = offered
    .map((choice, index) => ({ id: LETTERS[index], amount: choice.amount }))
    .filter((_, index) => index !== right);
  // The first thing help takes away is the choice furthest from the amount.
  const furthest = [...wrong].sort(
    (a, b) => Math.abs(b.amount - target) - Math.abs(a.amount - target),
  )[0];
  return {
    id: `${lesson}.${name}`,
    kind: 'choose-one',
    skillId: skill,
    variant,
    prompt: { instruction: strings.instruction, stimulus: prompt },
    choices: made,
    answer: LETTERS[right],
    hints: [
      { type: 'model', caption: strings.model },
      ...(wrong.length > 1
        ? [{ type: 'eliminate', remove: [furthest.id], caption: strings.eliminate }]
        : []),
      { type: 'reveal', caption: strings.reveal },
    ],
    misconceptions: Object.fromEntries(
      wrong.map((choice) => [choice.id, tagFor(asked, target, choice.amount, numerals)]),
    ),
    feedback: { correct: strings.correct, incorrect: strings.incorrect },
  };
}

function lessonOf({ id, title, summary, skill, minutes = 3, rows, count, firstTry, needsSound }) {
  const [demo, guided, pool] = rows;
  return {
    id,
    version: 1,
    world: 'number-garden',
    title,
    summary,
    skillIds: [skill],
    estimatedMinutes: minutes,
    ...(needsSound ? { needsSound: true } : {}),
    plan: {
      demo: demo.map((challenge) => challenge.id),
      guided: guided.map((challenge) => challenge.id),
      independent: { pool: pool.map((challenge) => challenge.id), count, maxReprobes: 2 },
    },
    successCriteria: { independentFirstTryCorrect: firstTry },
    challenges: [...demo, ...guided, ...pool],
  };
}

const NOT_THIS = 'ng.hint.not-this';

// ---------------------------------------------------------------------------------------------------------------------
// One more each time: a staircase with a step missing
// ---------------------------------------------------------------------------------------------------------------------

function stairsLesson() {
  const lesson = 'ng-stairs-01';
  const skill = 'math.order.one-more-to-6';
  /** `heights` has a 0 where the missing tower stands; `offered` is the heights of the towers to choose from. */
  const row = ([name, variant, heights, offered]) => {
    const gap = heights.indexOf(0);
    const down = variant === 'down';
    // The towers go up by one from left to right, or down by one: either way the neighbours say what is missing.
    const target =
      gap > 0 ? heights[gap - 1] + (down ? -1 : 1) : heights[gap + 1] + (down ? 1 : -1);
    return question({
      lesson,
      skill,
      name,
      variant,
      prompt: { type: 'scene', scene: 'stairs', of: { heights } },
      target,
      offered: offered.map(tower),
      strings: {
        instruction: down ? 'ng.stairs.down.instruction' : 'ng.stairs.instruction',
        model: down ? 'ng.stairs.down.hint.model' : 'ng.stairs.hint.model',
        eliminate: NOT_THIS,
        reveal: 'ng.stairs.hint.reveal',
        correct: 'ng.stairs.correct',
        incorrect: 'ng.stairs.incorrect',
      },
    });
  };
  return lessonOf({
    id: lesson,
    title: 'One more each time',
    summary:
      'Towers of blocks stand in a row like stairs, each one block taller than the last, and one is missing. Your child finds the tower that fits. It is the number line before any numbers: amounts in order, one more each time.',
    skill,
    rows: [
      [['demo-next', 'next', [1, 2, 3, 0], [4, 2]]].map(row),
      [
        ['guided-next', 'next', [2, 3, 0], [4, 2]],
        ['guided-between', 'between', [1, 0, 3], [2, 4]],
      ].map(row),
      [
        ['next-five', 'next', [2, 3, 4, 0], [5, 4, 6]],
        ['next-three', 'next', [1, 2, 0], [3, 2, 5]],
        ['next-six', 'next', [3, 4, 5, 0], [6, 5, 4]],
        ['between-three', 'between', [2, 0, 4, 5], [3, 2, 4]],
        ['between-four', 'between', [2, 3, 0, 5], [4, 3, 6]],
        ['first-one', 'first', [0, 2, 3], [1, 2, 4]],
        ['first-two', 'first', [0, 3, 4, 5], [2, 3, 1]],
        ['down-next', 'down', [5, 4, 3, 0], [2, 3, 1]],
        ['down-between', 'down', [6, 0, 4, 3], [5, 4, 6]],
        ['down-first', 'down', [0, 4, 3, 2], [5, 4, 6]],
      ].map(row),
    ],
    count: 4,
    firstTry: 3,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Fill the five, fill the ten: how many more?
// ---------------------------------------------------------------------------------------------------------------------

function fillLesson({ lesson, skill, title, summary, rows }) {
  /** `places` is a string of 1s and 0s; `offered` is the sizes of the groups to choose from. */
  const row = ([name, variant, item, places, offered]) => {
    const full = Array.from(places).filter((place) => place === '1').length;
    return question({
      lesson,
      skill,
      name,
      variant,
      prompt: frame(item, places, 'empty'),
      target: places.length - full,
      offered: offered.map((count, index) => group(item, count, layoutFor(count, index))),
      asked: { full },
      strings: {
        instruction: 'ng.fill.instruction',
        model: 'ng.fill.hint.model',
        eliminate: 'ng.compare.hint.eliminate',
        reveal: 'ng.fill.hint.reveal',
        correct: 'ng.fill.correct',
        incorrect: 'ng.fill.incorrect',
      },
    });
  };
  return lessonOf({
    id: lesson,
    title,
    summary,
    skill,
    rows: rows.map((stage) => stage.map(row)),
    count: 4,
    firstTry: 3,
  });
}

const fillFive = () =>
  fillLesson({
    lesson: 'ng-frame-01',
    skill: 'math.bonds.to-5',
    title: 'Fill the five',
    summary:
      'A frame has five places and some are full. Your child finds the group that would fill the rest. Three and two more make five: the pairs that make five, seen before they are said.',
    rows: [
      [['demo-three', 'from-the-left', 'acorn', '11100', [2, 3]]],
      [
        ['guided-four', 'from-the-left', 'apple', '11110', [1, 4]],
        ['guided-two', 'from-the-left', 'leaf', '11000', [3, 2]],
      ],
      [
        ['one-there', 'from-the-left', 'snail', '10000', [4, 1, 3]],
        ['two-there', 'from-the-left', 'acorn', '11000', [3, 2, 4]],
        ['three-there', 'from-the-left', 'apple', '11100', [2, 3, 1]],
        ['four-there', 'from-the-left', 'leaf', '11110', [1, 4, 2]],
        ['three-apart', 'anywhere', 'snail', '10101', [2, 3, 4]],
        ['two-apart', 'anywhere', 'apple', '01010', [3, 2, 1]],
        ['four-apart', 'anywhere', 'acorn', '11011', [1, 2, 4]],
        ['one-in-the-middle', 'anywhere', 'leaf', '00100', [4, 3, 1]],
        ['two-at-the-end', 'anywhere', 'snail', '00011', [3, 2, 4]],
      ],
    ],
  });

const fillTen = () =>
  fillLesson({
    lesson: 'ng-frame-02',
    skill: 'math.bonds.to-10',
    title: 'Fill the ten',
    summary:
      'The same game on a frame of ten: two lines of five, the way two hands hold ten. Your child finds the group that fills the empty places. Sometimes the places are filled here and there, so the empty ones have to be counted.',
    rows: [
      [['demo-eight', 'from-the-left', 'acorn', '1111111100', [2, 3]]],
      [
        ['guided-nine', 'from-the-left', 'apple', '1111111110', [1, 2]],
        ['guided-six', 'from-the-left', 'leaf', '1111110000', [4, 5]],
      ],
      [
        ['seven-there', 'from-the-left', 'snail', '1111111000', [3, 2, 4]],
        ['five-there', 'from-the-left', 'apple', '1111100000', [5, 4, 6]],
        ['eight-there', 'from-the-left', 'leaf', '1111111100', [2, 1, 3]],
        ['six-there', 'from-the-left', 'acorn', '1111110000', [4, 3, 6]],
        ['nine-there', 'from-the-left', 'snail', '1111111110', [1, 2, 3]],
        ['four-there', 'from-the-left', 'apple', '1111000000', [6, 4, 5]],
        ['seven-apart', 'anywhere', 'leaf', '1101101101', [3, 4, 2]],
        ['eight-apart', 'anywhere', 'acorn', '1011111011', [2, 3, 1]],
        ['five-apart', 'anywhere', 'snail', '1010101010', [5, 4, 6]],
        ['top-line-full', 'anywhere', 'apple', '1111100011', [3, 2, 5]],
      ],
    ],
  });

// ---------------------------------------------------------------------------------------------------------------------
// Numerals: a group and the number that stands for it, both ways about
// ---------------------------------------------------------------------------------------------------------------------

const TO_NUMERAL = {
  instruction: 'ng.numerals.which-number',
  model: 'ng.numerals.hint.count',
  eliminate: NOT_THIS,
  reveal: 'ng.numerals.hint.number',
  correct: 'ng.numerals.correct.number',
  incorrect: 'ng.numerals.incorrect',
};
const TO_GROUP = {
  instruction: 'ng.numerals.which-group',
  model: 'ng.compare.hint.model',
  eliminate: 'ng.compare.hint.eliminate',
  reveal: 'ng.numerals.hint.group',
  correct: 'ng.numerals.correct.group',
  incorrect: 'ng.numerals.incorrect',
};

function numeralsToFive() {
  const lesson = 'ng-numerals-01';
  const skill = 'math.numerals.read-to-5';
  /** A group, and numerals to choose from: `[name, [item, count, arrangement], numerals]`. */
  const toNumeral = ([name, [item, count, arrangement], offered]) =>
    question({
      lesson,
      skill,
      name,
      variant: 'group-to-numeral',
      prompt: group(item, count, arrangement).stimulus,
      target: count,
      offered: offered.map(numeral),
      strings: TO_NUMERAL,
    });
  /** A numeral, and groups to choose from: `[name, value, item, counts]`. */
  const toGroup = ([name, value, item, offered]) =>
    question({
      lesson,
      skill,
      name,
      variant: 'numeral-to-group',
      prompt: numeral(value).stimulus,
      target: value,
      offered: offered.map((count, index) => group(item, count, layoutFor(count, index + value))),
      strings: TO_GROUP,
    });
  return lessonOf({
    id: lesson,
    title: 'Numbers one to five',
    summary:
      'A written number stands for an amount. Your child matches a group to its number, and a number to its group, from one to five. A wrong choice is counted out, dot by dot, so the number is seen to be a different amount.',
    skill,
    minutes: 4,
    rows: [
      [toNumeral(['demo-two', ['apple', 2, 'row'], [2, 3]])],
      [
        toNumeral(['guided-three', ['snail', 3, 'cluster'], [3, 1]]),
        toGroup(['guided-find-two', 2, 'leaf', [1, 2]]),
      ],
      [
        toNumeral(['one-acorn', ['acorn', 1, 'row'], [1, 2, 3]]),
        toNumeral(['four-leaves', ['leaf', 4, 'cluster'], [3, 4, 5]]),
        toNumeral(['five-apples', ['apple', 5, 'row'], [5, 4, 2]]),
        toNumeral(['three-snails', ['snail', 3, 'scatter'], [2, 3, 4]]),
        toNumeral(['two-acorns', ['acorn', 2, 'scatter'], [3, 1, 2]]),
        toGroup(['find-three', 3, 'apple', [2, 3, 4]]),
        toGroup(['find-five', 5, 'snail', [4, 5, 3]]),
        toGroup(['find-one', 1, 'leaf', [2, 1, 3]]),
        toGroup(['find-four', 4, 'acorn', [4, 5, 2]]),
        toGroup(['find-two', 2, 'snail', [1, 3, 2]]),
      ],
    ],
    count: 5,
    firstTry: 4,
  });
}

function numeralsToTen() {
  const lesson = 'ng-numerals-02';
  const skill = 'math.numerals.read-to-10';
  /** A frame of ten with so many in it, and numerals to choose from: `[name, [item, count], numerals]`. */
  const toNumeral = ([name, [item, count], offered]) =>
    question({
      lesson,
      skill,
      name,
      variant: 'group-to-numeral',
      prompt: tenWith(item, count).stimulus,
      target: count,
      offered: offered.map(numeral),
      strings: TO_NUMERAL,
    });
  /** A numeral, and frames of ten to choose from: `[name, value, item, counts]`. */
  const toGroup = ([name, value, item, offered]) =>
    question({
      lesson,
      skill,
      name,
      variant: 'numeral-to-group',
      prompt: numeral(value).stimulus,
      target: value,
      offered: offered.map((count) => tenWith(item, count)),
      strings: TO_GROUP,
    });
  return lessonOf({
    id: lesson,
    title: 'Zero, and six to ten',
    summary:
      'The numbers from six to ten, and zero, on a frame of ten places: a full line is five, so seven is five and two more. Zero is an empty frame: none at all, and there is a number for that too.',
    skill,
    minutes: 4,
    rows: [
      [toNumeral(['demo-six', ['acorn', 6], [6, 5]])],
      [
        toNumeral(['guided-zero', ['apple', 0], [0, 1]]),
        toGroup(['guided-find-eight', 8, 'leaf', [8, 6]]),
      ],
      [
        toNumeral(['seven', ['snail', 7], [7, 6, 8]]),
        toNumeral(['nine', ['apple', 9], [9, 6, 10]]),
        toNumeral(['ten', ['leaf', 10], [10, 9, 1]]),
        toNumeral(['zero', ['acorn', 0], [0, 10, 1]]),
        toNumeral(['six', ['snail', 6], [9, 6, 5]]),
        toNumeral(['eight', ['apple', 8], [8, 7, 9]]),
        toGroup(['find-seven', 7, 'acorn', [6, 7, 8]]),
        toGroup(['find-zero', 0, 'leaf', [1, 0, 2]]),
        toGroup(['find-ten', 10, 'snail', [9, 10, 8]]),
        toGroup(['find-nine', 9, 'apple', [9, 6, 8]]),
        toGroup(['find-six', 6, 'leaf', [5, 6, 7]]),
      ],
    ],
    count: 5,
    firstTry: 4,
  });
}

function hearLesson() {
  const lesson = 'ng-numerals-03';
  const skill = 'math.numerals.hear-to-10';
  /** A number said aloud, and numerals to choose from: `[name, variant, value, numerals]`. */
  const row = ([name, variant, value, offered]) =>
    question({
      lesson,
      skill,
      name,
      variant,
      prompt: { type: 'sound', clip: `count.${value}` },
      target: value,
      offered: offered.map(numeral),
      strings: {
        instruction: 'ng.hear.instruction',
        model: 'ng.hear.hint.model',
        eliminate: NOT_THIS,
        reveal: 'ng.numerals.hint.number',
        correct: 'ng.numerals.correct.number',
        incorrect: 'ng.hear.incorrect',
      },
    });
  return lessonOf({
    id: lesson,
    title: 'Hear a number',
    summary:
      'A number is said, and your child finds how it is written, from zero to ten. The number can be heard again as often as they like. This one is for listening: it needs the sound on.',
    skill,
    needsSound: true,
    rows: [
      [['demo-three', 'to-five', 3, [3, 5]]].map(row),
      [
        ['guided-one', 'to-five', 1, [1, 4]],
        ['guided-seven', 'to-ten', 7, [7, 2]],
      ].map(row),
      [
        ['two', 'to-five', 2, [2, 3, 5]],
        ['five', 'to-five', 5, [4, 5, 1]],
        ['four', 'to-five', 4, [4, 3, 2]],
        ['three', 'to-five', 3, [8, 3, 2]],
        ['zero', 'to-five', 0, [0, 1, 10]],
        ['six', 'to-ten', 6, [6, 9, 7]],
        ['nine', 'to-ten', 9, [6, 9, 8]],
        ['eight', 'to-ten', 8, [8, 3, 10]],
        ['ten', 'to-ten', 10, [10, 1, 9]],
        ['seven', 'to-ten', 7, [1, 7, 9]],
      ].map(row),
    ],
    count: 5,
    firstTry: 4,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// The number path: numbered stones in a line, one of them bare
// ---------------------------------------------------------------------------------------------------------------------

function pathLesson() {
  const lesson = 'ng-line-01';
  const skill = 'math.numerals.order-to-10';
  /** Stones numbered `from` … `to`, with `gap` bare: `[name, variant, from, to, gap, numerals]`. */
  const row = ([name, variant, from, to, gap, offered]) =>
    question({
      lesson,
      skill,
      name,
      variant,
      prompt: { type: 'scene', scene: 'path', of: { from, to, gap } },
      target: gap,
      offered: offered.map(numeral),
      strings: {
        instruction: 'ng.path.instruction',
        model: 'ng.path.hint.model',
        eliminate: NOT_THIS,
        reveal: 'ng.numerals.hint.number',
        correct: 'ng.path.correct',
        incorrect: 'ng.path.incorrect',
      },
    });
  return lessonOf({
    id: lesson,
    title: 'The number path',
    summary:
      'Stones in a line have the numbers on them in order, and one stone is bare. Your child finds the number that belongs there: the next one, one in between, the first one, and counting back as well as on.',
    skill,
    rows: [
      [['demo-next', 'next', 1, 4, 4, [4, 6]]].map(row),
      [
        ['guided-between', 'between', 2, 5, 4, [4, 7]],
        ['guided-next', 'next', 3, 6, 6, [6, 8]],
      ].map(row),
      [
        ['next-five', 'next', 2, 5, 5, [5, 6, 1]],
        ['next-ten', 'next', 7, 10, 10, [10, 6, 5]],
        ['between-three', 'between', 1, 5, 3, [3, 6, 0]],
        ['between-seven', 'between', 5, 9, 7, [7, 4, 10]],
        ['between-eight', 'between', 6, 10, 8, [8, 5, 3]],
        ['first-zero', 'first', 0, 3, 0, [0, 4, 5]],
        ['first-four', 'first', 4, 8, 4, [4, 3, 9]],
        ['back-next', 'backwards', 5, 2, 2, [2, 6, 1]],
        ['back-between', 'backwards', 10, 6, 8, [8, 5, 4]],
        ['back-to-zero', 'backwards', 3, 0, 0, [0, 4, 5]],
      ].map(row),
    ],
    count: 5,
    firstTry: 4,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Some more come; some go away
// ---------------------------------------------------------------------------------------------------------------------

function storyLesson({ lesson, skill, kind, title, summary, answers, rows }) {
  /** `[name, variant, item, start, change, offered]`: so many are there, and so many come (or go). */
  const row = ([name, variant, item, start, change, offered]) =>
    question({
      lesson,
      skill,
      name,
      variant,
      prompt: { type: 'scene', scene: 'story', of: { kind, item, start, change } },
      target: kind === 'join' ? start + change : start - change,
      offered:
        answers === 'numerals'
          ? offered.map(numeral)
          : offered.map((count, index) => group(item, count, layoutFor(count, index + start))),
      asked: { story: { kind, start, change } },
      strings: {
        instruction: `ng.${kind}.instruction`,
        model: `ng.${kind}.hint.model`,
        eliminate: answers === 'numerals' ? NOT_THIS : 'ng.compare.hint.eliminate',
        reveal: 'ng.story.hint.reveal',
        correct: `ng.${kind}.correct`,
        incorrect: `ng.${kind}.incorrect`,
      },
    });
  return lessonOf({
    id: lesson,
    title,
    summary,
    skill,
    minutes: 4,
    rows: rows.map((stage) => stage.map(row)),
    count: 4,
    firstTry: 3,
  });
}

const addToFive = () =>
  storyLesson({
    lesson: 'ng-add-01',
    skill: 'math.adding.within-5',
    kind: 'join',
    answers: 'groups',
    title: 'Some more come',
    summary:
      'A little story: some friends are there, and some more come. How many now? Your child finds the group that shows it, up to five. Adding starts as something that happens, long before it is a sum.',
    rows: [
      [['demo-two-and-one', 'one-comes', 'bird', 2, 1, [3, 2]]],
      [
        ['guided-one-and-one', 'one-comes', 'frog', 1, 1, [2, 1]],
        ['guided-two-and-two', 'two-come', 'mouse', 2, 2, [4, 2]],
      ],
      [
        ['one-and-one', 'one-comes', 'bird', 1, 1, [2, 1, 3]],
        ['three-and-one', 'one-comes', 'snail', 3, 1, [4, 3, 5]],
        ['four-and-one', 'one-comes', 'bird', 4, 1, [5, 4, 3]],
        ['two-and-one', 'one-comes', 'mouse', 2, 1, [3, 1, 2]],
        ['one-and-two', 'two-come', 'frog', 1, 2, [3, 2, 1]],
        ['three-and-two', 'two-come', 'mouse', 3, 2, [5, 3, 2]],
        ['two-and-two', 'two-come', 'snail', 2, 2, [4, 2, 3]],
        ['one-and-three', 'more-come', 'bird', 1, 3, [4, 3, 1]],
        ['two-and-three', 'more-come', 'snail', 2, 3, [5, 3, 2]],
        ['one-and-four', 'more-come', 'frog', 1, 4, [5, 4, 1]],
      ],
    ],
  });

const takeFromFive = () =>
  storyLesson({
    lesson: 'ng-take-01',
    skill: 'math.taking-away.within-5',
    kind: 'leave',
    answers: 'groups',
    title: 'Some go away',
    summary:
      'Some friends are there, and some go away. How many are left? The ones that went stay in the picture, faded, so your child can see both what happened and what is left to count. Up to five.',
    rows: [
      [['demo-three-less-one', 'one-goes', 'bird', 3, 1, [2, 3]]],
      [
        ['guided-two-less-one', 'one-goes', 'frog', 2, 1, [1, 2]],
        ['guided-four-less-two', 'two-go', 'mouse', 4, 2, [2, 4]],
      ],
      [
        ['four-less-one', 'one-goes', 'snail', 4, 1, [3, 4, 1]],
        ['five-less-one', 'one-goes', 'bird', 5, 1, [4, 5, 1]],
        ['three-less-one', 'one-goes', 'mouse', 3, 1, [2, 1, 3]],
        ['three-less-two', 'two-go', 'frog', 3, 2, [1, 2, 3]],
        ['five-less-two', 'two-go', 'mouse', 5, 2, [3, 2, 5]],
        ['four-less-two', 'two-go', 'snail', 4, 2, [2, 4, 3]],
        ['four-less-three', 'more-go', 'bird', 4, 3, [1, 3, 4]],
        ['five-less-three', 'more-go', 'snail', 5, 3, [2, 3, 5]],
        ['five-less-four', 'more-go', 'frog', 5, 4, [1, 4, 5]],
      ],
    ],
  });

const addToTen = () =>
  storyLesson({
    lesson: 'ng-add-02',
    skill: 'math.adding.within-10',
    kind: 'join',
    answers: 'numerals',
    title: 'More come, up to ten',
    summary:
      'The same story with more friends, up to ten, and now the answer is a written number. Your child can count them all, or count on from the ones who were there; nothing is timed.',
    rows: [
      [['demo-four-and-two', 'a-few-come', 'frog', 4, 2, [6, 4]]],
      [
        ['guided-five-and-one', 'a-few-come', 'bird', 5, 1, [6, 5]],
        ['guided-three-and-three', 'more-come', 'mouse', 3, 3, [6, 3]],
      ],
      [
        ['five-and-two', 'a-few-come', 'snail', 5, 2, [7, 5, 6]],
        ['six-and-one', 'a-few-come', 'bird', 6, 1, [7, 6, 8]],
        ['six-and-two', 'a-few-come', 'snail', 6, 2, [8, 6, 9]],
        ['seven-and-two', 'a-few-come', 'bird', 7, 2, [9, 7, 6]],
        ['eight-and-two', 'a-few-come', 'snail', 8, 2, [10, 8, 9]],
        ['four-and-three', 'more-come', 'frog', 4, 3, [7, 4, 3]],
        ['five-and-three', 'more-come', 'mouse', 5, 3, [8, 5, 9]],
        ['four-and-four', 'more-come', 'frog', 4, 4, [8, 4, 7]],
        ['five-and-five', 'more-come', 'mouse', 5, 5, [10, 5, 9]],
        ['three-and-four', 'more-come', 'bird', 3, 4, [7, 3, 4]],
      ],
    ],
  });

const takeFromTen = () =>
  storyLesson({
    lesson: 'ng-take-02',
    skill: 'math.taking-away.within-10',
    kind: 'leave',
    answers: 'numerals',
    title: 'Some go away, from up to ten',
    summary:
      'Up to ten friends, and some go away. The answer is a written number, and sometimes everyone goes: none are left, and the number for that is zero.',
    rows: [
      [['demo-six-less-two', 'a-few-go', 'frog', 6, 2, [4, 6]]],
      [
        ['guided-seven-less-one', 'a-few-go', 'bird', 7, 1, [6, 7]],
        ['guided-two-less-two', 'none-left', 'mouse', 2, 2, [0, 2]],
      ],
      [
        ['eight-less-two', 'a-few-go', 'snail', 8, 2, [6, 8, 2]],
        ['nine-less-one', 'a-few-go', 'frog', 9, 1, [8, 9, 1]],
        ['ten-less-two', 'a-few-go', 'mouse', 10, 2, [8, 10, 2]],
        ['seven-less-two', 'a-few-go', 'bird', 7, 2, [5, 7, 2]],
        ['seven-less-three', 'more-go', 'bird', 7, 3, [4, 7, 3]],
        ['six-less-three', 'more-go', 'snail', 6, 3, [3, 6, 4]],
        ['ten-less-five', 'more-go', 'bird', 10, 5, [5, 10, 6]],
        ['eight-less-four', 'more-go', 'frog', 8, 4, [4, 8, 5]],
        ['nine-less-three', 'more-go', 'snail', 9, 3, [6, 9, 3]],
        ['three-less-three', 'none-left', 'mouse', 3, 3, [0, 3, 1]],
      ],
    ],
  });

// ---------------------------------------------------------------------------------------------------------------------
// What the pack is given
// ---------------------------------------------------------------------------------------------------------------------

/** In the order they are meant to be met. */
export const numberLessons = () => [
  stairsLesson(),
  fillFive(),
  fillTen(),
  numeralsToFive(),
  numeralsToTen(),
  hearLesson(),
  pathLesson(),
  addToFive(),
  takeFromFive(),
  addToTen(),
  takeFromTen(),
];

const skill = (id, title, objective, prerequisites) => ({
  id,
  world: 'number-garden',
  strand: 'number-sense',
  title,
  objective,
  prerequisites,
});

export const NUMBER_SKILLS = [
  skill(
    'math.order.one-more-to-6',
    'Put amounts in order, one more each time',
    'Sees that amounts in order go up by one each time, and finds the amount that is missing from a row of towers of up to six blocks: the next, one in between, the first, and going down as well as up.',
    ['math.comparison.more-to-6'],
  ),
  skill(
    'math.bonds.to-5',
    'See how many more make five',
    'Given part of five on a frame of five places, finds the group that fills the rest, wherever the full places are.',
    ['math.counting.give-to-5'],
  ),
  skill(
    'math.bonds.to-10',
    'See how many more make ten',
    'Given part of ten on a frame of ten places, finds the group that fills the rest, wherever the full places are.',
    ['math.bonds.to-5', 'math.counting.give-to-10'],
  ),
  skill(
    'math.numerals.read-to-5',
    'Match the numerals 1 to 5 with amounts',
    'Finds the numeral for a group of one to five things, and the group for a numeral, however the group is laid out.',
    ['math.counting.give-to-5'],
  ),
  skill(
    'math.numerals.read-to-10',
    'Match the numerals 0 and 6 to 10 with amounts',
    'Finds the numeral for an amount from six to ten shown on a frame of ten, and the amount for a numeral; knows that an empty frame is zero.',
    ['math.numerals.read-to-5', 'math.counting.give-to-10'],
  ),
  skill(
    'math.numerals.hear-to-10',
    'Find the numeral for a number that is said',
    'Hears a number from zero to ten and picks out its numeral from three, including numerals that look or sound alike.',
    ['math.numerals.read-to-10'],
  ),
  skill(
    'math.numerals.order-to-10',
    'Know the order of the numbers 0 to 10',
    'Finds the number missing from a run of three to five numbers in order: the next, one in between, the first, and counting back as well as on.',
    ['math.numerals.read-to-10', 'math.order.one-more-to-6'],
  ),
  skill(
    'math.adding.within-5',
    'Add within five, as a story',
    'When some more come to a group, finds how many there are now, up to five, and shows it with a group of the same amount.',
    ['math.counting.give-to-5'],
  ),
  skill(
    'math.taking-away.within-5',
    'Take away within five, as a story',
    'When some of a group of up to five go away, finds how many are left and shows it with a group of the same amount.',
    ['math.adding.within-5'],
  ),
  skill(
    'math.adding.within-10',
    'Add within ten, as a story',
    'When some more come to a group, finds how many there are now, up to ten, and picks the numeral for it.',
    ['math.adding.within-5', 'math.numerals.read-to-10'],
  ),
  skill(
    'math.taking-away.within-10',
    'Take away within ten, as a story',
    'When some of a group of up to ten go away, finds how many are left, including none, and picks the numeral for it.',
    ['math.taking-away.within-5', 'math.numerals.read-to-10'],
  ),
];

export const NUMBER_STRINGS = {
  'ng.hint.not-this': 'Not this one.',
  'ng.stairs.instruction': 'One more each time. Which one is missing?',
  'ng.stairs.down.instruction': 'One fewer each time. Which one is missing?',
  'ng.stairs.correct': 'Yes. That one fits.',
  'ng.stairs.incorrect': 'That one does not fit. Look at the steps.',
  'ng.stairs.hint.model': 'Each step is one more.',
  'ng.stairs.down.hint.model': 'Each step is one fewer.',
  'ng.stairs.hint.reveal': 'This one fits.',
  'ng.fill.instruction': 'How many more fill the frame?',
  'ng.fill.correct': 'Yes. Now it is full.',
  'ng.fill.incorrect': 'That does not fill it. Let us count the empty places.',
  'ng.fill.hint.model': 'Count the empty places.',
  'ng.fill.hint.reveal': 'This many fill it.',
  'ng.numerals.which-number': 'Which number shows how many?',
  'ng.numerals.which-group': 'Which group has this many?',
  'ng.numerals.correct.number': 'Yes. That is the number.',
  'ng.numerals.correct.group': 'Yes. That is how many.',
  'ng.numerals.incorrect': 'Not that one. Let us count.',
  'ng.numerals.hint.count': 'Count them.',
  'ng.numerals.hint.number': 'This is the number.',
  'ng.numerals.hint.group': 'This is the group.',
  'ng.hear.instruction': 'Listen. Which number is it?',
  'ng.hear.incorrect': 'That is a different number. Listen again.',
  'ng.hear.hint.model': 'Listen again.',
  'ng.path.instruction': 'Which number is missing?',
  'ng.path.correct': 'Yes. That number fits.',
  'ng.path.incorrect': 'Not that one. Say the numbers along the stones.',
  'ng.path.hint.model': 'Say the numbers along the stones.',
  'ng.join.instruction': 'Here come some more. How many now?',
  'ng.join.correct': 'Yes. That is how many there are now.',
  'ng.join.incorrect': 'Not that many. Let us count them all.',
  'ng.join.hint.model': 'Count them all.',
  'ng.leave.instruction': 'Some go away. How many are left?',
  'ng.leave.correct': 'Yes. That is how many are left.',
  'ng.leave.incorrect': 'Not that many. Let us count the ones that stay.',
  'ng.leave.hint.model': 'Count the ones that stay.',
  'ng.story.hint.reveal': 'This many.',
};
