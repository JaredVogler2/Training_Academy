// Number Garden's content pack: the first activity as it was written by hand, and six more written from tables.
//
//   same amount, up to three      (by hand: scripts/content/authored/number-garden.same-amount.json)
//   how many, at a glance         a group shown for a moment, matched by amount
//   one for each, up to five      giving out exactly as many as there are friends
//   one for each, up to ten
//   which has more?               comparing two or three groups
//   which has fewer?
//   two that are equal            finding the two groups with the same amount
//
// Each table row is one challenge: what is shown, and against what. The builders below turn a row into the full
// challenge — choices, the answer, why each wrong choice is tempting, the ladder of hints — so that the row cannot
// disagree with itself. Nothing here is random: the tables are the content.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NUMBER_WORDS, root } from './lib.mjs';

const authored = JSON.parse(
  readFileSync(join(root, 'scripts/content/authored/number-garden.same-amount.json'), 'utf8'),
);

const PLURALS = {
  apple: 'apples',
  leaf: 'leaves',
  snail: 'snails',
  acorn: 'acorns',
  bird: 'birds',
  mouse: 'mice',
  frog: 'frogs',
};
/** What each friend is given. */
const GIFTS = { snail: 'leaf', mouse: 'acorn', bird: 'apple', frog: 'leaf' };

const amount = (count, item) => `${NUMBER_WORDS[count]} ${count === 1 ? item : PLURALS[item]}`;
const group = (item, count, arrangement = 'row', size) => ({
  type: 'quantity',
  item,
  count,
  arrangement,
  ...(size ? { size } : {}),
});
const LETTERS = ['a', 'b', 'c', 'd'];

function quantityMisconception(target, chosen) {
  const difference = chosen - target;
  if (difference === 1) return 'one-more';
  if (difference === -1) return 'one-fewer';
  return difference > 0 ? 'many-more' : 'many-fewer';
}

// ---------------------------------------------------------------------------------------------------------------------
// A group to match (shown for as long as it likes, or only for a glance)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * `prompt` is [item, count, arrangement]; `choices` is the amounts offered, in the order they are written down
 * (the game shuffles them); they are all drawn as `choiceItem`.
 */
function match({ lesson, skill, name, variant, prompt, choiceItem, choices, strings, glance }) {
  const [item, count, arrangement] = prompt;
  // A line of things is answered with a pattern and the other way about, so shape is never what is matched.
  const choiceArrangement = (amountShown) =>
    arrangement === 'row' && amountShown > 1 && amountShown <= 5 ? 'cluster' : 'row';
  const made = choices.map((amountShown, index) => ({
    id: LETTERS[index],
    label: amount(amountShown, choiceItem),
    stimulus: group(choiceItem, amountShown, choiceArrangement(amountShown)),
  }));
  const answer = made[choices.indexOf(count)].id;
  const distractors = made.filter((choice) => choice.id !== answer);
  // The first thing help takes away is the choice furthest from the amount: the one least worth a second look.
  const furthest = [...distractors].sort(
    (a, b) => Math.abs(b.stimulus.count - count) - Math.abs(a.stimulus.count - count),
  )[0];
  return {
    id: `${lesson}.${name}`,
    kind: 'choose-one',
    skillId: skill,
    variant,
    prompt: {
      instruction: strings.instruction,
      stimulus: group(item, count, arrangement),
      ...(glance ? { glance: true } : {}),
    },
    choices: made,
    answer,
    hints: [
      { type: 'model', caption: strings.model },
      ...(distractors.length > 1
        ? [{ type: 'eliminate', remove: [furthest.id], caption: strings.eliminate }]
        : []),
      { type: 'reveal', caption: strings.reveal },
    ],
    misconceptions: Object.fromEntries(
      distractors.map((choice) => [choice.id, quantityMisconception(count, choice.stimulus.count)]),
    ),
    feedback: { correct: strings.correct, incorrect: strings.incorrect },
  };
}

function glanceLesson() {
  const lesson = 'ng-glance-01';
  const skill = 'math.quantity.subitize-to-4';
  const strings = {
    instruction: 'ng.glance.instruction',
    model: 'ng.glance.hint.model',
    eliminate: 'ng.same-amount.hint.eliminate',
    reveal: 'ng.same-amount.hint.reveal',
    correct: 'ng.same-amount.correct',
    incorrect: 'ng.same-amount.incorrect',
  };
  const row = (name, prompt, choiceItem, choices) =>
    match({
      lesson,
      skill,
      name,
      variant: `${NUMBER_WORDS[prompt[1]]}-${prompt[2]}`,
      prompt,
      choiceItem,
      choices,
      strings,
      glance: true,
    });
  const demo = [row('demo-two', ['snail', 2, 'cluster'], 'leaf', [1, 2])];
  const guided = [
    row('guided-one', ['apple', 1, 'row'], 'acorn', [1, 2]),
    row('guided-three', ['acorn', 3, 'cluster'], 'leaf', [2, 3]),
  ];
  const pool = [
    row('two-scattered', ['leaf', 2, 'scatter'], 'apple', [1, 2, 3]),
    row('three-pattern', ['apple', 3, 'cluster'], 'snail', [2, 3, 4]),
    row('four-pattern', ['acorn', 4, 'cluster'], 'leaf', [3, 4, 5]),
    row('three-line', ['snail', 3, 'row'], 'acorn', [3, 2, 4]),
    row('four-scattered', ['leaf', 4, 'scatter'], 'apple', [4, 3, 2]),
    row('one-alone', ['acorn', 1, 'scatter'], 'snail', [2, 1, 3]),
    row('four-line', ['apple', 4, 'row'], 'leaf', [5, 4, 3]),
    row('two-line', ['snail', 2, 'row'], 'acorn', [3, 1, 2]),
  ];
  return {
    id: lesson,
    version: 1,
    world: 'number-garden',
    title: 'How many, at a glance',
    summary:
      'A small group is shown for a moment and then covered. Your child finds the group with the same amount, by seeing how many there were rather than counting.',
    skillIds: [skill],
    estimatedMinutes: 3,
    plan: {
      demo: demo.map((challenge) => challenge.id),
      guided: guided.map((challenge) => challenge.id),
      independent: { pool: pool.map((challenge) => challenge.id), count: 4, maxReprobes: 2 },
    },
    successCriteria: { independentFirstTryCorrect: 3 },
    challenges: [...demo, ...guided, ...pool],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// One for each: giving out exactly as many as there are friends
// ---------------------------------------------------------------------------------------------------------------------

function give({ lesson, skill, name, variant, friend, count, arrangement, places }) {
  return {
    id: `${lesson}.${name}`,
    kind: 'make',
    skillId: skill,
    variant,
    prompt: { instruction: 'ng.give.instruction' },
    task: {
      type: 'give',
      want: group(friend, count, arrangement),
      item: GIFTS[friend],
      // Always room to give one too many and still have some left.
      pile: Math.min(12, count + 3),
      places,
    },
    hints: [
      { type: 'model', caption: 'ng.give.hint.model' },
      { type: 'step', count: Math.max(1, Math.floor(count / 2)), caption: 'ng.give.hint.step' },
      { type: 'reveal', caption: 'ng.give.hint.reveal' },
    ],
    feedback: { correct: 'ng.give.correct', incorrect: 'ng.give.incorrect' },
  };
}

function giveLesson({ lesson, skill, title, summary, demo, guided, pool }) {
  const row = (places) => (entry) => {
    const [name, friend, count, arrangement] = entry;
    return give({
      lesson,
      skill,
      name,
      variant: `${NUMBER_WORDS[count]}-${arrangement}`,
      friend,
      count,
      arrangement,
      places,
    });
  };
  const shown = demo.map(row(true));
  const supported = guided.map(row(true));
  const alone = pool.map(row(false));
  return {
    id: lesson,
    version: 1,
    world: 'number-garden',
    title,
    summary,
    skillIds: [skill],
    estimatedMinutes: 4,
    plan: {
      demo: shown.map((challenge) => challenge.id),
      guided: supported.map((challenge) => challenge.id),
      independent: { pool: alone.map((challenge) => challenge.id), count: 3, maxReprobes: 1 },
    },
    successCriteria: { independentFirstTryCorrect: 2 },
    challenges: [...shown, ...supported, ...alone],
  };
}

const giveToFive = () =>
  giveLesson({
    lesson: 'ng-give-01',
    skill: 'math.counting.give-to-5',
    title: 'One for each, up to five',
    summary:
      'Some friends each want one thing. Your child gives out exactly enough, one for each, and says when they are done. With help each friend has a place to fill; then there are no places and your child keeps count.',
    demo: [['demo-three', 'snail', 3, 'row']],
    guided: [
      ['guided-two', 'mouse', 2, 'row'],
      ['guided-four', 'bird', 4, 'row'],
    ],
    pool: [
      ['three-mice', 'mouse', 3, 'row'],
      ['four-birds', 'bird', 4, 'cluster'],
      ['five-snails', 'snail', 5, 'row'],
      ['four-frogs', 'frog', 4, 'scatter'],
      ['five-mice', 'mouse', 5, 'cluster'],
      ['three-birds', 'bird', 3, 'scatter'],
      ['five-frogs', 'frog', 5, 'scatter'],
    ],
  });

const giveToTen = () =>
  giveLesson({
    lesson: 'ng-give-02',
    skill: 'math.counting.give-to-10',
    title: 'One for each, up to ten',
    summary:
      'The same game with more friends, six to ten of them, often standing five to a line the way two hands hold ten. Your child gives one to each and keeps count.',
    demo: [['demo-six', 'frog', 6, 'frame']],
    guided: [
      ['guided-seven', 'snail', 7, 'frame'],
      ['guided-nine', 'mouse', 9, 'frame'],
    ],
    pool: [
      ['six-birds', 'bird', 6, 'row'],
      ['seven-frogs', 'frog', 7, 'frame'],
      ['eight-snails', 'snail', 8, 'row'],
      ['eight-mice', 'mouse', 8, 'frame'],
      ['nine-birds', 'bird', 9, 'frame'],
      ['ten-frogs', 'frog', 10, 'frame'],
      ['ten-snails', 'snail', 10, 'row'],
      ['seven-mice', 'mouse', 7, 'row'],
    ],
  });

// ---------------------------------------------------------------------------------------------------------------------
// Which has more? Which has fewer?
// ---------------------------------------------------------------------------------------------------------------------

/** The tag for picking the wrong group. A group drawn large can look like more; one drawn small, like fewer. */
function comparisonMisconception(asked, chosen) {
  if (asked === 'more') return chosen.size === 'big' ? 'bigger-looks-more' : 'picked-fewer';
  return chosen.size === 'small' ? 'smaller-looks-fewer' : 'picked-more';
}

/** `groups` is a list of [item, count, arrangement, size]. */
function compare({ lesson, skill, asked, name, variant, groups }) {
  const made = groups.map(([item, count, arrangement = 'row', size], index) => ({
    id: LETTERS[index],
    label: amount(count, item),
    stimulus: group(item, count, arrangement, size),
  }));
  const counts = made.map((choice) => choice.stimulus.count);
  const extreme = asked === 'more' ? Math.max(...counts) : Math.min(...counts);
  const answer = made[counts.indexOf(extreme)].id;
  const distractors = made.filter((choice) => choice.id !== answer);
  const furthest = [...distractors].sort(
    (a, b) => Math.abs(b.stimulus.count - extreme) - Math.abs(a.stimulus.count - extreme),
  )[0];
  return {
    id: `${lesson}.${name}`,
    kind: 'choose-one',
    skillId: skill,
    variant,
    prompt: { instruction: `ng.${asked}.instruction`, stimulus: { type: 'sign', id: asked } },
    choices: made,
    answer,
    hints: [
      { type: 'model', caption: 'ng.compare.hint.model' },
      ...(distractors.length > 1
        ? [{ type: 'eliminate', remove: [furthest.id], caption: 'ng.compare.hint.eliminate' }]
        : []),
      { type: 'reveal', caption: `ng.${asked}.hint.reveal` },
    ],
    misconceptions: Object.fromEntries(
      distractors.map((choice) => [choice.id, comparisonMisconception(asked, choice.stimulus)]),
    ),
    feedback: { correct: `ng.${asked}.correct`, incorrect: `ng.${asked}.incorrect` },
  };
}

function compareLesson({ lesson, skill, asked, title, summary, demo, guided, pool }) {
  const row = ([name, variant, ...groups]) =>
    compare({ lesson, skill, asked, name, variant, groups });
  const shown = demo.map(row);
  const supported = guided.map(row);
  const alone = pool.map(row);
  return {
    id: lesson,
    version: 1,
    world: 'number-garden',
    title,
    summary,
    skillIds: [skill],
    estimatedMinutes: 3,
    plan: {
      demo: shown.map((challenge) => challenge.id),
      guided: supported.map((challenge) => challenge.id),
      independent: { pool: alone.map((challenge) => challenge.id), count: 4, maxReprobes: 2 },
    },
    successCriteria: { independentFirstTryCorrect: 3 },
    challenges: [...shown, ...supported, ...alone],
  };
}

const more = () =>
  compareLesson({
    lesson: 'ng-more-01',
    skill: 'math.comparison.more-to-6',
    asked: 'more',
    title: 'Which has more?',
    summary:
      'Two or three groups of up to six things. Your child finds the one with more. Sometimes the smaller group is drawn with bigger things, so that more has to mean how many, not how much room.',
    demo: [['demo', 'by-two', ['leaf', 2], ['apple', 4]]],
    guided: [
      ['guided-one-three', 'by-two', ['acorn', 1], ['snail', 3]],
      ['guided-five-three', 'by-two', ['apple', 5], ['leaf', 3, 'cluster']],
    ],
    pool: [
      ['two-three', 'by-one', ['snail', 2], ['acorn', 3]],
      ['four-three', 'by-one', ['leaf', 4, 'cluster'], ['apple', 3]],
      ['four-five', 'by-one', ['acorn', 4], ['snail', 5, 'cluster']],
      ['six-four', 'by-two', ['apple', 6], ['leaf', 4]],
      ['five-six', 'by-one', ['snail', 5], ['apple', 6]],
      ['one-two', 'by-one', ['leaf', 1], ['acorn', 2, 'cluster']],
      [
        'big-two-small-four',
        'big-things-are-fewer',
        ['apple', 2, 'row', 'big'],
        ['acorn', 4, 'row', 'small'],
      ],
      [
        'big-three-small-five',
        'big-things-are-fewer',
        ['leaf', 3, 'row', 'big'],
        ['snail', 5, 'row', 'small'],
      ],
      ['two-four-five', 'three-groups', ['acorn', 2], ['apple', 4, 'cluster'], ['leaf', 5]],
      ['three-one-two', 'three-groups', ['snail', 3, 'cluster'], ['leaf', 1], ['apple', 2]],
    ],
  });

const fewer = () =>
  compareLesson({
    lesson: 'ng-fewer-01',
    skill: 'math.comparison.fewer-to-6',
    asked: 'fewer',
    title: 'Which has fewer?',
    summary:
      'Two or three groups of up to six things. Your child finds the one with fewer. Sometimes the larger group is drawn with smaller things, so that fewer has to mean how many.',
    demo: [['demo', 'by-two', ['apple', 4], ['snail', 2]]],
    guided: [
      ['guided-three-one', 'by-two', ['leaf', 3], ['acorn', 1]],
      ['guided-three-five', 'by-two', ['snail', 3, 'cluster'], ['apple', 5]],
    ],
    pool: [
      ['three-two', 'by-one', ['acorn', 3], ['leaf', 2]],
      ['three-four', 'by-one', ['apple', 3], ['snail', 4, 'cluster']],
      ['five-four', 'by-one', ['leaf', 5, 'cluster'], ['acorn', 4]],
      ['four-six', 'by-two', ['snail', 4], ['apple', 6]],
      ['six-five', 'by-one', ['acorn', 6], ['leaf', 5]],
      ['two-one', 'by-one', ['apple', 2, 'cluster'], ['snail', 1]],
      [
        'small-four-big-two',
        'small-things-are-more',
        ['leaf', 4, 'row', 'small'],
        ['apple', 2, 'row', 'big'],
      ],
      [
        'small-five-big-three',
        'small-things-are-more',
        ['acorn', 5, 'row', 'small'],
        ['snail', 3, 'row', 'big'],
      ],
      ['five-two-four', 'three-groups', ['leaf', 5], ['acorn', 2], ['apple', 4, 'cluster']],
      ['two-three-one', 'three-groups', ['apple', 2], ['snail', 3, 'cluster'], ['leaf', 1]],
    ],
  });

// ---------------------------------------------------------------------------------------------------------------------
// Two that are equal
// ---------------------------------------------------------------------------------------------------------------------

function equal({ lesson, skill, name, variant, groups }) {
  const cards = groups.map(([item, count, arrangement = 'row'], index) => ({
    id: LETTERS[index],
    label: amount(count, item),
    stimulus: group(item, count, arrangement),
  }));
  const counts = cards.map((card) => card.stimulus.count);
  const solution = cards
    .filter((card, index) => counts.filter((count) => count === counts[index]).length === 2)
    .map((card) => card.id);
  return {
    id: `${lesson}.${name}`,
    kind: 'make',
    skillId: skill,
    variant,
    prompt: { instruction: 'ng.equal.instruction' },
    task: { type: 'select', cards, solution },
    hints: [
      { type: 'model', caption: 'ng.compare.hint.model' },
      { type: 'step', count: 1, caption: 'ng.equal.hint.step' },
      { type: 'reveal', caption: 'ng.equal.hint.reveal' },
    ],
    feedback: { correct: 'ng.equal.correct', incorrect: 'ng.equal.incorrect' },
  };
}

function equalLesson() {
  const lesson = 'ng-equal-01';
  const skill = 'math.comparison.equal-to-6';
  const row = ([name, variant, ...groups]) => equal({ lesson, skill, name, variant, groups });
  const demo = [['demo', 'three-groups', ['leaf', 2], ['snail', 2, 'cluster'], ['apple', 3]]].map(
    row,
  );
  const guided = [
    ['guided-ones', 'three-groups', ['acorn', 1], ['apple', 2], ['leaf', 1, 'scatter']],
    ['guided-threes', 'three-groups', ['snail', 3], ['acorn', 5], ['apple', 3, 'cluster']],
  ].map(row);
  const pool = [
    ['twos', 'three-groups', ['apple', 2], ['leaf', 3], ['acorn', 2, 'cluster']],
    ['fours', 'three-groups', ['snail', 4], ['apple', 4, 'cluster'], ['leaf', 3]],
    ['threes', 'three-groups', ['acorn', 3, 'cluster'], ['snail', 2], ['leaf', 3]],
    ['fives', 'three-groups', ['leaf', 5], ['apple', 4], ['snail', 5, 'cluster']],
    ['fours-again', 'three-groups', ['apple', 4, 'cluster'], ['acorn', 5], ['leaf', 4]],
    ['sixes', 'three-groups', ['snail', 6], ['leaf', 5, 'cluster'], ['acorn', 6, 'scatter']],
    [
      'threes-of-four',
      'four-groups',
      ['apple', 2],
      ['leaf', 3, 'cluster'],
      ['snail', 3],
      ['acorn', 4],
    ],
    [
      'fives-of-four',
      'four-groups',
      ['acorn', 4, 'cluster'],
      ['apple', 5],
      ['leaf', 6],
      ['snail', 5, 'cluster'],
    ],
  ].map(row);
  return {
    id: lesson,
    version: 1,
    world: 'number-garden',
    title: 'Two that are equal',
    summary:
      'Three or four groups, and two of them have the same amount. Your child picks out those two. The things and the way they are laid out differ, so the only way is to compare how many.',
    skillIds: [skill],
    estimatedMinutes: 3,
    plan: {
      demo: demo.map((challenge) => challenge.id),
      guided: guided.map((challenge) => challenge.id),
      independent: { pool: pool.map((challenge) => challenge.id), count: 3, maxReprobes: 1 },
    },
    successCriteria: { independentFirstTryCorrect: 2 },
    challenges: [...demo, ...guided, ...pool],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The pack
// ---------------------------------------------------------------------------------------------------------------------

const FIRST = authored.skill.id;

const SKILLS = [
  authored.skill,
  {
    id: 'math.quantity.subitize-to-4',
    world: 'number-garden',
    strand: 'number-sense',
    title: 'See small amounts at a glance',
    objective:
      'Sees how many are in a group of up to four when it is shown only for a moment, without counting one by one, and matches it to a group of the same amount.',
    prerequisites: [FIRST],
  },
  {
    id: 'math.counting.give-to-5',
    world: 'number-garden',
    strand: 'number-sense',
    title: 'Give one for each, up to five',
    objective:
      'Gives out exactly as many things as there are friends, up to five, one for each, and stops there without places to fill.',
    prerequisites: [FIRST],
  },
  {
    id: 'math.counting.give-to-10',
    world: 'number-garden',
    strand: 'number-sense',
    title: 'Give one for each, up to ten',
    objective:
      'Gives out exactly as many things as there are friends, from six to ten, keeping count of how many have been given.',
    prerequisites: ['math.counting.give-to-5'],
  },
  {
    id: 'math.comparison.more-to-6',
    world: 'number-garden',
    strand: 'number-sense',
    title: 'Find which group has more',
    objective:
      'Picks the group with more out of two or three groups of up to six, including when the smaller group is made of bigger things.',
    prerequisites: [FIRST],
  },
  {
    id: 'math.comparison.fewer-to-6',
    world: 'number-garden',
    strand: 'number-sense',
    title: 'Find which group has fewer',
    objective:
      'Picks the group with fewer out of two or three groups of up to six, including when the larger group is made of smaller things.',
    prerequisites: ['math.comparison.more-to-6'],
  },
  {
    id: 'math.comparison.equal-to-6',
    world: 'number-garden',
    strand: 'number-sense',
    title: 'Find two groups that are equal',
    objective:
      'Out of three or four groups of up to six, finds the two that have the same amount, whatever they are made of and however they are laid out.',
    prerequisites: [FIRST],
  },
];

const STRINGS = {
  ...authored.strings,
  'ng.glance.instruction': 'Take a quick look. Which group has the same amount?',
  'ng.glance.hint.model': 'Here it is again. Take another look.',
  'ng.give.instruction': 'Give one to each friend.',
  'ng.give.correct': 'Yes. One for each.',
  'ng.give.incorrect': 'Not one for each yet. Let us count.',
  'ng.give.hint.model': 'Count the friends. Touch them one by one.',
  'ng.give.hint.step': 'Here are some to start with.',
  'ng.give.hint.reveal': 'Fill every place. One for each.',
  'ng.more.instruction': 'Which group has more?',
  'ng.more.correct': 'Yes. That group has more.',
  'ng.more.incorrect': 'That group has fewer. Look again.',
  'ng.more.hint.reveal': 'This group has more.',
  'ng.fewer.instruction': 'Which group has fewer?',
  'ng.fewer.correct': 'Yes. That group has fewer.',
  'ng.fewer.incorrect': 'That group has more. Look again.',
  'ng.fewer.hint.reveal': 'This group has fewer.',
  'ng.compare.hint.model': 'Count each group.',
  'ng.compare.hint.eliminate': 'Not this group.',
  'ng.equal.instruction': 'Find the two groups with the same amount.',
  'ng.equal.correct': 'Yes. These two are equal.',
  'ng.equal.incorrect': 'Those are not equal. Look again.',
  'ng.equal.hint.step': 'This is one of them.',
  'ng.equal.hint.reveal': 'These two are equal.',
};

export function buildNumberGardenPack() {
  return {
    format: 'training-academy.content-pack',
    schemaVersion: 1,
    id: 'number-garden',
    world: 'number-garden',
    contentVersion: 2,
    strings: { en: STRINGS },
    skills: SKILLS,
    lessons: [
      authored.lesson,
      glanceLesson(),
      giveToFive(),
      giveToTen(),
      more(),
      fewer(),
      equalLesson(),
    ],
  };
}
