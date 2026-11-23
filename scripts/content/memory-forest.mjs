// Memory Forest's content pack, written from tables.
//
//   find the pairs                 cards face down, two of each                     (recognising)
//   which one was there?           a few things looked at, then hidden              (recognising, old against new)
//   the same order                 things lit one after another, to be done again   (remembering an order)
//   things that go together        four things in two groups, then picked out       (a way to remember: grouping)
//   who had what?                  pairs to link, then asked about one of them      (a way to remember: linking)
//   what was where?                things at places, then asked about one place     (a way to remember: places)
//
// These are kept apart on purpose: knowing a thing again when it is seen, recalling an order, recalling one thing
// from a cue and recalling without one are different things to be able to do, and a child may be at ease with one
// and not with another. Nothing here is a measure of memory, and nothing adds them up.
//
// The pictures come from the kit (src/art); what each is called, from the lexicon.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './lib.mjs';

const lexicon = JSON.parse(readFileSync(join(root, 'src/art/lexicon.json'), 'utf8')).words;
const LETTERS = ['a', 'b', 'c', 'd'];

/** What kind of thing each picture is, for groups to remember and for near misses. */
const KINDS = {
  animals: ['cat', 'hen', 'fox', 'fish', 'bird', 'rat', 'ram', 'ant', 'elephant', 'octopus'],
  clothes: ['hat', 'cap', 'sock', 'ring'],
  food: ['apple', 'egg', 'nut', 'olive'],
  music: ['drum', 'bell', 'shaker', 'whistle'],
  kitchen: ['pan', 'pot', 'cup', 'mug'],
  sky: ['sun', 'moon', 'rain'],
};
const kindOf = (id) => Object.keys(KINDS).find((kind) => KINDS[kind].includes(id)) ?? 'thing';

const picture = (id) => ({ type: 'picture', id });
const card = (id) => ({ id, label: lexicon[id].word, stimulus: picture(id) });
const pictureChoices = (ids) =>
  ids.map((id, index) => ({ id: LETTERS[index], label: lexicon[id].word, stimulus: picture(id) }));

function lesson({
  id,
  title,
  summary,
  minutes = 3,
  demo,
  guided,
  pool,
  count,
  reprobes = 1,
  closing,
}) {
  return {
    id,
    version: 1,
    world: 'memory-forest',
    title,
    summary,
    skillIds: [...new Set([...demo, ...guided, ...pool, ...(closing ?? [])].map((c) => c.skillId))],
    estimatedMinutes: minutes,
    plan: {
      demo: demo.map((challenge) => challenge.id),
      guided: guided.map((challenge) => challenge.id),
      independent: {
        pool: pool.map((challenge) => challenge.id),
        count,
        maxReprobes: Math.min(reprobes, pool.length - count),
      },
      ...(closing ? { closing: closing.map((challenge) => challenge.id) } : {}),
    },
    successCriteria: { independentFirstTryCorrect: count - 1 },
    challenges: [...demo, ...guided, ...pool, ...(closing ?? [])],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Find the pairs
// ---------------------------------------------------------------------------------------------------------------------

function pairsLesson() {
  const id = 'mf-pairs-01';
  const skillId = 'memory.recognition.find-pairs';
  const row = ([name, open, ...ids]) => ({
    id: `${id}.${name}`,
    kind: 'make',
    skillId,
    variant: `${ids.length === 2 ? 'two' : ids.length === 3 ? 'three' : 'four'}-pairs${open ? '-face-up' : ''}`,
    prompt: { instruction: open ? 'mf.pairs.open.instruction' : 'mf.pairs.instruction' },
    task: {
      type: 'pairs',
      cards: ids.map(card),
      // Face up there is nothing to remember: every turn should be a pair. Face down, twice as many turns as
      // pairs is what remembering needs at most.
      par: open ? ids.length : ids.length * 2,
      ...(open ? { open: true } : {}),
    },
    hints: [{ type: 'model', caption: open ? 'mf.pairs.open.hint' : 'mf.pairs.hint.model' }],
    feedback: { correct: 'mf.pairs.correct', incorrect: 'mf.pairs.incorrect' },
  });
  return lesson({
    id,
    title: 'Find the pairs',
    summary:
      'Cards lie in rows, two of each picture. First they are face up, to learn how the game goes; then face down, two turned at a time. A pair stays turned; two that differ are looked at and turn back.',
    demo: [['demo', true, 'sun', 'moon']].map(row),
    guided: [
      ['guided-face-up', true, 'cat', 'hat', 'fish'],
      ['guided-two', false, 'drum', 'apple'],
    ].map(row),
    pool: [
      ['animals', false, 'cat', 'hen', 'fox'],
      ['clothes', false, 'hat', 'sock', 'cap'],
      ['sounds', false, 'drum', 'bell', 'whistle'],
      ['sky-and-leaf', false, 'sun', 'moon', 'rain', 'leaf'],
      ['food', false, 'apple', 'egg', 'nut', 'olive'],
      ['small-animals', false, 'fish', 'bird', 'ant', 'ram'],
    ].map(row),
    count: 3,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Which one was there?
// ---------------------------------------------------------------------------------------------------------------------

function hiddenLesson() {
  const id = 'mf-hidden-01';
  const skillId = 'memory.recognition.what-was-there';
  const row = ([name, shown, offered]) => {
    const choices = pictureChoices(offered);
    const answer = choices.find((choice) => shown.includes(choice.stimulus.id)).id;
    const distractors = choices.filter((choice) => choice.id !== answer);
    const kinds = shown.map(kindOf);
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId,
      variant: `${['', '', 'two', 'three', 'four'][shown.length]}-things`,
      prompt: {
        instruction: 'mf.hidden.instruction',
        stimulus: { type: 'scene', scene: 'things', of: { ids: shown } },
        glance: true,
        ask: 'mf.hidden.ask',
      },
      choices,
      answer,
      hints: [
        { type: 'model', caption: 'mf.hint.look-again' },
        ...(distractors.length > 1
          ? [{ type: 'eliminate', remove: [distractors.at(-1).id], caption: 'mf.hint.not-this' }]
          : []),
        { type: 'reveal', caption: 'mf.hidden.hint.reveal' },
      ],
      misconceptions: Object.fromEntries(
        distractors.map((choice) => [
          choice.id,
          kinds.includes(kindOf(choice.stimulus.id)) ? 'same-kind-as-shown' : 'not-shown',
        ]),
      ),
      feedback: { correct: 'mf.hidden.correct', incorrect: 'mf.hidden.incorrect' },
    };
  };
  const first = ['cat', 'sun'];
  // The last question of all goes back to the first thing shown, which has not been seen since.
  const offered = pictureChoices(['moon', 'sun', 'rain']);
  const earlier = {
    id: `${id}.earlier`,
    kind: 'choose-one',
    skillId: 'memory.recognition.after-a-while',
    variant: 'from-the-start',
    prompt: { instruction: 'mf.earlier.instruction', stimulus: { type: 'sign', id: 'earlier' } },
    choices: offered,
    answer: offered.find((choice) => first.includes(choice.stimulus.id)).id,
    hints: [
      { type: 'model', caption: 'mf.earlier.hint.model' },
      { type: 'eliminate', remove: ['c'], caption: 'mf.hint.not-this' },
      { type: 'reveal', caption: 'mf.hidden.hint.reveal' },
    ],
    misconceptions: { a: 'same-kind-as-shown', c: 'same-kind-as-shown' },
    feedback: { correct: 'mf.hidden.correct', incorrect: 'mf.hidden.incorrect' },
  };
  return lesson({
    id,
    title: 'Which one was there?',
    summary:
      'Two, three or four things are shown, and then a big leaf covers them. Your child says which of some pictures was under the leaf. The others were never there, though some are the same kind of thing. At the very end there is one question about the first things shown, which have not been seen since.',
    demo: [['demo', first, ['cat', 'hat']]].map(row),
    guided: [
      ['guided-two', ['fish', 'drum'], ['moon', 'drum']],
      ['guided-three', ['hen', 'cup', 'leaf'], ['sock', 'cup']],
    ].map(row),
    pool: [
      ['fox-bell-apple', ['fox', 'bell', 'apple'], ['bell', 'drum', 'egg']],
      ['hat-moon-fish', ['hat', 'moon', 'fish'], ['bird', 'fish', 'cap']],
      ['egg-sock-clock', ['egg', 'sock', 'clock'], ['nut', 'hat', 'sock']],
      ['bird-pan-sun-ring', ['bird', 'pan', 'sun', 'ring'], ['rain', 'cup', 'pan']],
      ['ant-whistle-cap-olive', ['ant', 'whistle', 'cap', 'olive'], ['olive', 'shaker', 'ram']],
      ['mug-rat-leaf-drum', ['mug', 'rat', 'leaf', 'drum'], ['fox', 'bell', 'rat']],
      ['nut-ram-lamp-cup', ['nut', 'ram', 'lamp', 'cup'], ['pot', 'lamp', 'apple']],
      [
        'octopus-rain-pot-shaker',
        ['octopus', 'rain', 'pot', 'shaker'],
        ['elephant', 'moon', 'octopus'],
      ],
    ].map(row),
    count: 4,
    reprobes: 1,
    closing: [earlier],
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// The same order
// ---------------------------------------------------------------------------------------------------------------------

function orderLesson() {
  const id = 'mf-order-01';
  const skillId = 'memory.serial.repeat-order';
  const FARM = ['cat', 'hen', 'fox', 'fish'];
  const FIELD = ['bird', 'ram', 'ant', 'rat'];
  const row = ([name, cards, ...sequence]) => ({
    id: `${id}.${name}`,
    kind: 'make',
    skillId,
    variant: `${['', '', 'two', 'three', 'four'][sequence.length]}-long`,
    prompt: { instruction: 'mf.order.instruction' },
    task: { type: 'echo', cards: cards.map(card), solution: sequence },
    hints: [
      { type: 'model', caption: 'mf.order.hint.model' },
      { type: 'step', count: 1, caption: 'mf.order.hint.step' },
      { type: 'reveal', caption: 'mf.order.hint.reveal' },
    ],
    feedback: { correct: 'mf.order.correct', incorrect: 'mf.order.incorrect' },
  });
  return lesson({
    id,
    title: 'The same order',
    summary:
      'Animals light up one after another, each with its name, and your child taps them in the same order: two at first, then three, then four. Seeing the order again is help, and is asked for as help.',
    demo: [['demo', FARM, 'cat', 'fox']].map(row),
    guided: [
      ['guided-two', FARM, 'hen', 'cat'],
      ['guided-three', FARM, 'fish', 'hen', 'cat'],
    ].map(row),
    pool: [
      ['fox-cat-fish', FARM, 'fox', 'cat', 'fish'],
      ['hen-fish-fox', FARM, 'hen', 'fish', 'fox'],
      ['rat-bird-ram', FIELD, 'rat', 'bird', 'ram'],
      ['ant-ram-bird', FIELD, 'ant', 'ram', 'bird'],
      ['fox-hen-cat-fish', FARM, 'fox', 'hen', 'cat', 'fish'],
      ['fish-cat-fox-hen', FARM, 'fish', 'cat', 'fox', 'hen'],
      ['ram-ant-rat-bird', FIELD, 'ram', 'ant', 'rat', 'bird'],
      ['bird-rat-ant-ram', FIELD, 'bird', 'rat', 'ant', 'ram'],
    ].map(row),
    count: 4,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// A way to remember: things that go together
// ---------------------------------------------------------------------------------------------------------------------

function groupsLesson() {
  const id = 'mf-groups-01';
  const skillId = 'memory.strategy.grouping';
  const row = ([name, shown, others]) => {
    const [first, , third] = shown;
    return {
      id: `${id}.${name}`,
      kind: 'make',
      skillId,
      variant: `${kindOf(first)}-and-${kindOf(third)}`,
      prompt: { instruction: 'mf.groups.instruction' },
      task: {
        type: 'select',
        cards: [...shown, ...others].map(card),
        solution: shown,
        // They are shown two and two, each kind together.
        study: shown,
        ask: 'mf.groups.ask',
      },
      hints: [
        { type: 'model', caption: 'mf.groups.hint.model' },
        { type: 'step', count: 2, caption: 'mf.groups.hint.step' },
        { type: 'reveal', caption: 'mf.groups.hint.reveal' },
      ],
      feedback: { correct: 'mf.groups.correct', incorrect: 'mf.groups.incorrect' },
    };
  };
  return lesson({
    id,
    title: 'Things that go together',
    summary:
      'Four things are shown, two of one kind and two of another: two animals and two things to wear, say. Then they are put away and your child picks them out from among others. Thinking of them as two pairs is easier than four separate things, and that is the trick being practised.',
    minutes: 4,
    demo: [['demo', ['cat', 'hen', 'hat', 'sock'], ['drum', 'apple']]].map(row),
    guided: [
      ['guided-food-music', ['apple', 'egg', 'drum', 'bell'], ['fish', 'cap']],
      ['guided-sky-kitchen', ['sun', 'moon', 'cup', 'mug'], ['fox', 'nut', 'whistle']],
    ].map(row),
    pool: [
      ['animals-clothes', ['fox', 'fish', 'cap', 'ring'], ['bird', 'sock', 'moon', 'pan']],
      ['food-music', ['nut', 'olive', 'shaker', 'whistle'], ['apple', 'bell', 'hen', 'rain']],
      ['animals-kitchen', ['bird', 'ram', 'pot', 'pan'], ['rat', 'cup', 'hat', 'sun']],
      ['sky-food', ['rain', 'sun', 'egg', 'apple'], ['moon', 'nut', 'drum', 'ant']],
      ['music-animals', ['bell', 'drum', 'hen', 'rat'], ['whistle', 'cat', 'sock', 'olive']],
      ['clothes-sky', ['hat', 'sock', 'moon', 'rain'], ['cap', 'sun', 'mug', 'fish']],
    ].map(row),
    count: 3,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// A way to remember: linking two things, and a place for each thing
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Pairs to look at — who had what, or what was where — and then one question about one of them, with the others'
 * things among the choices. `pairs` is a list of [the one asked by, the thing]; `cue` is which one is asked about.
 */
function linked({ lessonId, skillId, scene, strings, name, pairs, cue, extra }) {
  const owners = pairs.map(([owner]) => owner);
  const things = pairs.map(([, thing]) => thing);
  const target = things[owners.indexOf(cue)];
  // What is offered: the right thing, another one's thing, and where there is room something never shown.
  const offered = [...things.filter((thing) => thing !== target).slice(0, 1), target, ...extra];
  const order = name.length % 2 === 0 ? offered : [offered[1], offered[0], ...offered.slice(2)];
  const choices = pictureChoices(order);
  const answer = choices.find((choice) => choice.stimulus.id === target).id;
  const distractors = choices.filter((choice) => choice.id !== answer);
  return {
    id: `${lessonId}.${name}`,
    kind: 'choose-one',
    skillId,
    variant: `${pairs.length === 2 ? 'two' : 'three'}-${scene}`,
    prompt: {
      instruction: strings.instruction,
      stimulus: { type: 'scene', scene, of: { owners, things } },
      glance: true,
      cue: picture(cue),
      ask: strings.ask,
    },
    choices,
    answer,
    hints: [
      { type: 'model', caption: strings.model },
      ...(distractors.length > 1
        ? [{ type: 'eliminate', remove: [distractors.at(-1).id], caption: 'mf.hint.not-this' }]
        : []),
      { type: 'reveal', caption: strings.reveal },
    ],
    misconceptions: Object.fromEntries(
      distractors.map((choice) => [
        choice.id,
        things.includes(choice.stimulus.id) ? 'belongs-to-another' : 'not-shown',
      ]),
    ),
    feedback: { correct: strings.correct, incorrect: strings.incorrect },
  };
}

function storyLesson() {
  const lessonId = 'mf-story-01';
  const skillId = 'memory.strategy.linking';
  const strings = {
    instruction: 'mf.story.instruction',
    ask: 'mf.story.ask',
    model: 'mf.story.hint.model',
    reveal: 'mf.story.hint.reveal',
    correct: 'mf.story.correct',
    incorrect: 'mf.story.incorrect',
  };
  const row = ([name, cue, extra, ...pairs]) =>
    linked({ lessonId, skillId, scene: 'pairs', strings, name, pairs, cue, extra });
  return lesson({
    id: lessonId,
    title: 'Who had what?',
    summary:
      'Animals are shown, each with a thing: the cat has the hat, the fox has the drum. Then they are hidden and your child is shown one animal and asked what it had. Making a silly picture in your head of the two together is the trick: say it aloud with your child, the sillier the better.',
    minutes: 4,
    demo: [['demo', 'cat', [], ['cat', 'hat'], ['fox', 'drum']]].map(row),
    guided: [
      ['guided-fish', 'fish', [], ['hen', 'sock'], ['fish', 'bell']],
      ['guided-ram', 'ram', ['egg'], ['bird', 'cup'], ['ram', 'apple']],
    ].map(row),
    pool: [
      ['fox-sock', 'fox', ['hat'], ['bird', 'egg'], ['fox', 'sock']],
      ['hen-drum', 'hen', ['mug'], ['hen', 'drum'], ['cat', 'cup']],
      ['ant-ring', 'ant', ['cap'], ['cat', 'mug'], ['ant', 'ring'], ['fox', 'egg']],
      ['elephant-bell', 'elephant', ['drum'], ['hen', 'cap'], ['rat', 'nut'], ['elephant', 'bell']],
      ['bird-pan', 'bird', ['pot'], ['fish', 'hat'], ['bird', 'pan'], ['ram', 'sock']],
      ['cat-apple', 'cat', ['olive'], ['octopus', 'drum'], ['cat', 'apple'], ['hen', 'moon']],
      ['rat-whistle', 'rat', ['shaker'], ['fox', 'cup'], ['rat', 'whistle'], ['ant', 'leaf']],
      ['fish-ring', 'fish', ['rain'], ['ram', 'clock'], ['fish', 'ring'], ['elephant', 'sun']],
    ].map(row),
    count: 4,
  });
}

function placesLesson() {
  const lessonId = 'mf-places-01';
  const skillId = 'memory.strategy.places';
  const strings = {
    instruction: 'mf.places.instruction',
    ask: 'mf.places.ask',
    model: 'mf.places.hint.model',
    reveal: 'mf.places.hint.reveal',
    correct: 'mf.places.correct',
    incorrect: 'mf.places.incorrect',
  };
  const row = ([name, cue, extra, ...pairs]) =>
    linked({ lessonId, skillId, scene: 'places', strings, name, pairs, cue, extra });
  return lesson({
    id: lessonId,
    title: 'What was where?',
    summary:
      'Things are left at places along a path: on the log, in the nest, by the hut. Then they are hidden and your child is shown one place and asked what was there. Walking the path in your head, place by place, is the trick. It works at home too: what is by the door, on the stairs, on the bed?',
    minutes: 4,
    demo: [['demo', 'hut', [], ['log', 'fish'], ['hut', 'bell']]].map(row),
    guided: [
      ['guided-nest', 'nest', [], ['nest', 'egg'], ['log', 'cap']],
      ['guided-log', 'log', ['mug'], ['hut', 'apple'], ['log', 'drum']],
    ].map(row),
    pool: [
      ['hut-cat', 'hut', ['fox'], ['hut', 'cat'], ['nest', 'nut']],
      ['log-sock', 'log', ['hat'], ['nest', 'ring'], ['log', 'sock']],
      ['nest-apple', 'nest', ['olive'], ['log', 'hen'], ['nest', 'apple'], ['hut', 'drum']],
      ['hut-moon', 'hut', ['sun'], ['log', 'pan'], ['nest', 'ant'], ['hut', 'moon']],
      ['log-whistle', 'log', ['bell'], ['hut', 'cup'], ['log', 'whistle'], ['nest', 'bird']],
      ['nest-leaf', 'nest', ['rain'], ['nest', 'leaf'], ['hut', 'rat'], ['log', 'mug']],
      ['mat-fish', 'mat', ['bird'], ['cot', 'hat'], ['mat', 'fish'], ['igloo', 'egg']],
      ['igloo-clock', 'igloo', ['lamp'], ['mat', 'apple'], ['cot', 'ram'], ['igloo', 'clock']],
    ].map(row),
    count: 4,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// The pack, and the words the voice needs for it
// ---------------------------------------------------------------------------------------------------------------------

const skill = (id, title, objective, prerequisites) => ({
  id,
  world: 'memory-forest',
  strand: 'memory',
  title,
  objective,
  prerequisites,
});

const SKILLS = [
  skill(
    'memory.recognition.find-pairs',
    'Find pairs among cards face down',
    'Finds every pair among six or eight cards lying face down, in no more turns than remembering where things are would need.',
    [],
  ),
  skill(
    'memory.recognition.what-was-there',
    'Know again what was just hidden',
    'After looking at two to four things that are then covered, picks out one that was there from pictures of things that were not.',
    ['memory.recognition.find-pairs'],
  ),
  skill(
    'memory.recognition.after-a-while',
    'Know again what was seen a while ago',
    'At the end of an activity, picks out a thing shown at its very start and not seen since. One question, kept apart from the others: a longer wait is a different thing to manage.',
    ['memory.recognition.what-was-there'],
  ),
  skill(
    'memory.serial.repeat-order',
    'Remember an order',
    'Watches three or four things light up one after another and taps them in the same order.',
    ['memory.recognition.what-was-there'],
  ),
  skill(
    'memory.strategy.grouping',
    'Remember by grouping',
    'Looks at four things that fall into two kinds, and after they are put away picks all four out from among others, with nothing to prompt them.',
    ['memory.recognition.what-was-there'],
  ),
  skill(
    'memory.strategy.linking',
    'Remember by linking two things',
    'Looks at two or three pairs — who had what — and, shown one of them, says what went with it.',
    ['memory.recognition.what-was-there'],
  ),
  skill(
    'memory.strategy.places',
    'Remember by places',
    'Looks at things left at two or three places and, shown one place, says what was there.',
    ['memory.recognition.what-was-there'],
  ),
];

const STRINGS = {
  'mf.hint.not-this': 'Not this one.',
  'mf.hint.look-again': 'Have another look.',
  'mf.pairs.open.instruction': 'Tap two that are the same.',
  'mf.pairs.open.hint': 'Find one. Then find another just like it.',
  'mf.pairs.instruction': 'Turn two cards. Find the two that are the same.',
  'mf.pairs.hint.model': 'Look. Here they all are.',
  'mf.pairs.correct': 'Yes. You found them all.',
  'mf.pairs.incorrect': 'Keep looking.',
  'mf.hidden.instruction': 'Look carefully. Then they hide.',
  'mf.hidden.ask': 'Which of these was there?',
  'mf.hidden.correct': 'Yes. That one was there.',
  'mf.hidden.incorrect': 'That one was not there. Think again.',
  'mf.hidden.hint.reveal': 'It was this one.',
  'mf.earlier.instruction': 'Think back to the very start. Which of these did you see first?',
  'mf.earlier.hint.model': 'There were two things. One was a cat.',
  'mf.order.instruction': 'Watch the order. Then tap them the same way.',
  'mf.order.correct': 'Yes. The same order.',
  'mf.order.incorrect': 'Not that order. Watch again.',
  'mf.order.hint.model': 'Here it is again.',
  'mf.order.hint.step': 'It starts like this.',
  'mf.order.hint.reveal': 'Tap them as I point.',
  'mf.groups.instruction': 'Look. Some of these go together.',
  'mf.groups.ask': 'Which ones did you see?',
  'mf.groups.correct': 'Yes. Those were the ones.',
  'mf.groups.incorrect': 'Not quite. Think of the ones that go together.',
  'mf.groups.hint.model': 'Think of one kind. Then think of the other kind.',
  'mf.groups.hint.step': 'These two were there.',
  'mf.groups.hint.reveal': 'These were all of them.',
  'mf.story.instruction': 'Look who has what. Make a silly picture in your head.',
  'mf.story.ask': 'What did this one have?',
  'mf.story.correct': 'Yes. That is what it had.',
  'mf.story.incorrect': 'That was not this one’s. Think again.',
  'mf.story.hint.model': 'Have another look. Make a silly picture in your head.',
  'mf.story.hint.reveal': 'It had this one.',
  'mf.places.instruction': 'Look where each thing is. Walk the path in your head.',
  'mf.places.ask': 'What was at this place?',
  'mf.places.correct': 'Yes. That is what was there.',
  'mf.places.incorrect': 'That was not at this place. Think again.',
  'mf.places.hint.model': 'Have another look. Walk the path in your head.',
  'mf.places.hint.reveal': 'This was there.',
};

export function buildMemoryForestPack() {
  return {
    format: 'training-academy.content-pack',
    schemaVersion: 1,
    id: 'memory-forest',
    world: 'memory-forest',
    contentVersion: 1,
    strings: { en: STRINGS },
    skills: SKILLS,
    lessons: [
      pairsLesson(),
      hiddenLesson(),
      orderLesson(),
      groupsLesson(),
      storyLesson(),
      placesLesson(),
    ],
  };
}

/** What the voice needs here beside the pack's lines: the names of the animals whose order is to be remembered. */
export function buildMemoryForestVoice() {
  const pack = buildMemoryForestPack();
  const named = new Set();
  for (const { challenges } of pack.lessons) {
    for (const challenge of challenges) {
      if (challenge.kind === 'make' && challenge.task.type === 'echo') {
        for (const each of challenge.task.cards) named.add(each.id);
      }
    }
  }
  return {
    about:
      'What the voice says for Memory Forest beside the lines of its pack: the names of the pictures it names aloud. Written by scripts/content/memory-forest.mjs; do not edit by hand.',
    groups: {
      words: {
        words: Object.fromEntries([...named].sort().map((id) => [`word.${id}`, lexicon[id].word])),
      },
    },
  };
}
