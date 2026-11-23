// Reading Cove's content pack, written from tables.
//
//   what made that sound?            a sound, and the thing that makes it        (listening)
//   play it back                     two or three sounds, to be done again        (listening)
//   which one starts the same?       s, m, f — then n, l, r                       (first sounds, by ear)
//   a letter and its sound           fifteen letters, four lessons                (letters)
//   the slow word                    a word said slowly, and which picture it is  (blending, by ear)
//   read the word                    a word in letters, and which picture it is   (blending, in print)
//
// No sound is ever played on its own for a letter: there is no recording of one that anybody has checked. A letter
// is taught by the words that begin with its sound, the first sound drawn out ("sssun"), and a word is blended by
// hearing it said slowly. docs/CURRICULUM.md says why.
//
// The words come from the lexicon (src/art/lexicon.json): what each picture is called, the letter its word starts
// with, and whether it is spelt as it sounds. A word is only ever given to read when every letter in it has been
// taught in one of the letter lessons here; the content lint checks that.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './lib.mjs';

const lexicon = JSON.parse(readFileSync(join(root, 'src/art/lexicon.json'), 'utf8')).words;
const startOf = (id) => lexicon[id].starts;
const LETTERS = ['a', 'b', 'c', 'd'];

/** Sounds that can be drawn out: the first sound of these words gets a clip of its own ("sssun"). */
const DRAWN_OUT = new Set(['s', 'm', 'f', 'n', 'l', 'r', 'h', 'a', 'i', 'o', 'u', 'e']);

const picture = (id) => ({ type: 'picture', id });
const letter = (letters) => ({ type: 'letter', letters });
const pictureChoices = (ids) =>
  ids.map((id, index) => ({ id: LETTERS[index], label: lexicon[id].word, stimulus: picture(id) }));

/** The ladder of help every question with choices here has: a model, one choice taken away, the answer. */
function ladder(strings, choices, answer, furthest) {
  const distractors = choices.filter((choice) => choice.id !== answer);
  return [
    { type: 'model', caption: strings.model },
    ...(distractors.length > 1
      ? [
          {
            type: 'eliminate',
            remove: [furthest ?? distractors.at(-1).id],
            caption: 'rc.hint.not-this',
          },
        ]
      : []),
    { type: 'reveal', caption: strings.reveal },
  ];
}

function lesson({
  id,
  title,
  summary,
  skill,
  minutes = 3,
  demo,
  guided,
  pool,
  count = 4,
  reprobes = 2,
}) {
  return {
    id,
    version: 1,
    world: 'reading-cove',
    title,
    summary,
    skillIds: [skill],
    estimatedMinutes: minutes,
    needsSound: true,
    plan: {
      demo: demo.map((challenge) => challenge.id),
      guided: guided.map((challenge) => challenge.id),
      independent: {
        pool: pool.map((challenge) => challenge.id),
        count,
        maxReprobes: Math.min(reprobes, pool.length - count),
      },
    },
    successCriteria: { independentFirstTryCorrect: count - 1 },
    challenges: [...demo, ...guided, ...pool],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Listening: what made that sound?
// ---------------------------------------------------------------------------------------------------------------------

/** Sounds that are easy to take for one another: both high and clear, or both a knock. */
const ALIKE = [
  ['whistle', 'bird'],
  ['drum', 'clock'],
  ['bell', 'whistle'],
];
const alike = (a, b) => ALIKE.some((pair) => pair.includes(a) && pair.includes(b));

function listenLesson() {
  const id = 'rc-listen-01';
  const skill = 'phonics.listening.match-sound-to-source';
  const strings = { model: 'rc.listen.hint.model', reveal: 'rc.listen.hint.reveal' };
  const row = ([name, ...ids]) => {
    // The first one named is the one that makes the sound; they are then written down in the order given.
    const target = ids[0];
    const order =
      name.startsWith('demo') || name.startsWith('guided') ? ids : rotate(ids, name.length);
    const choices = pictureChoices(order);
    const answer = choices[order.indexOf(target)].id;
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId: skill,
      variant: `hear-${target}`,
      prompt: {
        instruction: 'rc.listen.instruction',
        stimulus: { type: 'sound', clip: `sound.${target}` },
      },
      choices,
      answer,
      hints: ladder(strings, choices, answer),
      misconceptions: Object.fromEntries(
        choices
          .filter((choice) => choice.id !== answer)
          .map((choice) => [
            choice.id,
            alike(target, choice.stimulus.id) ? 'similar-sound' : 'other-sound',
          ]),
      ),
      feedback: { correct: 'rc.listen.correct', incorrect: 'rc.listen.incorrect' },
    };
  };
  return lesson({
    id,
    skill,
    title: 'What made that sound?',
    summary:
      'A sound is played and your child finds the thing that makes it: a drum, a bell, a shaker, a whistle, a bird, a clock. Listening closely to sounds comes before listening for the sounds inside words.',
    demo: [['demo-drum', 'drum', 'bell']].map(row),
    guided: [
      ['guided-bell', 'bell', 'shaker'],
      ['guided-shaker', 'shaker', 'drum'],
    ].map(row),
    pool: [
      ['whistle', 'whistle', 'bell', 'bird'],
      ['bird', 'bird', 'whistle', 'clock'],
      ['clock', 'clock', 'drum', 'shaker'],
      ['drum', 'drum', 'clock', 'bell'],
      ['bell', 'bell', 'whistle', 'drum'],
      ['shaker', 'shaker', 'clock', 'bird'],
      ['whistle-again', 'whistle', 'bird', 'shaker'],
      ['bird-again', 'bird', 'bell', 'drum'],
    ].map(row),
  });
}

/** The same things in another order, so that the answer is not always written first. */
function rotate(items, by) {
  const turn = by % items.length;
  return [...items.slice(turn), ...items.slice(0, turn)];
}

// ---------------------------------------------------------------------------------------------------------------------
// Listening: play it back
// ---------------------------------------------------------------------------------------------------------------------

function echoLesson() {
  const id = 'rc-listen-02';
  const skill = 'phonics.listening.repeat-sound-pattern';
  const cards = ['drum', 'bell', 'shaker'].map((name) => ({
    id: name,
    label: lexicon[name].word,
    stimulus: picture(name),
  }));
  const row = ([name, ...sequence]) => ({
    id: `${id}.${name}`,
    kind: 'make',
    skillId: skill,
    variant: sequence.length === 2 ? 'two-sounds' : 'three-sounds',
    prompt: { instruction: 'rc.echo.instruction' },
    task: { type: 'echo', cards, solution: sequence },
    hints: [
      { type: 'model', caption: 'rc.echo.hint.model' },
      { type: 'step', count: 1, caption: 'rc.echo.hint.step' },
      { type: 'reveal', caption: 'rc.echo.hint.reveal' },
    ],
    feedback: { correct: 'rc.echo.correct', incorrect: 'rc.echo.incorrect' },
  });
  return lesson({
    id,
    skill,
    title: 'Play it back',
    summary:
      'Two or three sounds are played, one after another, and your child plays them back in the same order. Holding a short string of sounds in mind is what blending sounds into words will ask for later.',
    demo: [['demo', 'drum', 'bell']].map(row),
    guided: [
      ['guided-same', 'drum', 'drum'],
      ['guided-two', 'bell', 'shaker'],
    ].map(row),
    pool: [
      ['shaker-drum', 'shaker', 'drum'],
      ['bell-bell', 'bell', 'bell'],
      ['drum-bell-drum', 'drum', 'bell', 'drum'],
      ['shaker-shaker-bell', 'shaker', 'shaker', 'bell'],
      ['bell-drum-shaker', 'bell', 'drum', 'shaker'],
      ['drum-drum-bell', 'drum', 'drum', 'bell'],
      ['shaker-bell-bell', 'shaker', 'bell', 'bell'],
      ['bell-shaker-drum', 'bell', 'shaker', 'drum'],
    ].map(row),
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// First sounds: which one starts the same?
// ---------------------------------------------------------------------------------------------------------------------

function firstLesson({ id, skill, title, sounds, demo, guided, pool }) {
  const strings = { model: 'rc.first.hint.model', reveal: 'rc.first.hint.reveal' };
  const row = ([name, target, ...ids]) => {
    const choices = pictureChoices(ids);
    const answer = choices.find((choice) => startOf(choice.stimulus.id) === startOf(target)).id;
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId: skill,
      variant: `starts-${startOf(target)}`,
      prompt: { instruction: 'rc.first.instruction', stimulus: picture(target) },
      choices,
      answer,
      hints: ladder(strings, choices, answer),
      misconceptions: Object.fromEntries(
        choices
          .filter((choice) => choice.id !== answer)
          .map((choice) => [choice.id, `starts-with-${startOf(choice.stimulus.id)}`]),
      ),
      feedback: { correct: 'rc.first.correct', incorrect: 'rc.first.incorrect' },
    };
  };
  return lesson({
    id,
    skill,
    title,
    summary: `Your child hears a word and finds the picture whose word starts with the same sound. The first sound is drawn out so that it can be heard: ${sounds}. No letters yet: this is all by ear.`,
    demo: demo.map(row),
    guided: guided.map(row),
    pool: pool.map(row),
  });
}

const firstSMF = () =>
  firstLesson({
    id: 'rc-first-01',
    skill: 'phonics.awareness.first-sound-s-m-f',
    title: 'Which one starts the same? (s, m, f)',
    sounds: 'sss, mmm and fff',
    demo: [['demo', 'sun', 'sock', 'moon']],
    guided: [
      ['guided-moon', 'moon', 'fish', 'map'],
      ['guided-fan', 'fan', 'fox', 'sun'],
    ],
    pool: [
      ['sock', 'sock', 'seed', 'mug', 'fin'],
      ['mat', 'mat', 'fox', 'mop', 'soap'],
      ['fish', 'fish', 'man', 'sun', 'fan'],
      ['seed', 'seed', 'map', 'fox', 'sun'],
      ['mug', 'mug', 'fan', 'moon', 'sock'],
      ['fox', 'fox', 'soap', 'fin', 'mat'],
      ['soap', 'soap', 'mop', 'fish', 'sock'],
      ['map', 'map', 'sun', 'fan', 'man'],
    ],
  });

const firstNLR = () =>
  firstLesson({
    id: 'rc-first-02',
    skill: 'phonics.awareness.first-sound-n-l-r',
    title: 'Which one starts the same? (n, l, r)',
    sounds: 'nnn, lll and rrr',
    demo: [['demo', 'net', 'nose', 'leaf']],
    guided: [
      ['guided-leaf', 'leaf', 'rain', 'lamp'],
      ['guided-rat', 'rat', 'ring', 'net'],
    ],
    pool: [
      ['nose', 'nose', 'nest', 'log', 'ram'],
      ['lip', 'lip', 'rain', 'lamp', 'net'],
      ['rain', 'rain', 'leaf', 'nest', 'rat'],
      ['nest', 'nest', 'lip', 'ring', 'nose'],
      ['log', 'log', 'ram', 'leaf', 'nose'],
      ['ring', 'ring', 'net', 'rain', 'lamp'],
      ['net', 'net', 'log', 'rat', 'nest'],
      ['lamp', 'lamp', 'nose', 'ram', 'lip'],
    ],
  });

// ---------------------------------------------------------------------------------------------------------------------
// Letters: a letter and its sound
// ---------------------------------------------------------------------------------------------------------------------

/** The letters, in the order they are taught, four at a time (three in the last lesson). */
export const LETTER_LESSONS = [
  ['s', 'm', 'a', 't'],
  ['p', 'i', 'n', 'o'],
  ['f', 'l', 'c', 'h'],
  ['u', 'e', 'r'],
];

function lettersLesson(number, { demo, guided, pool }) {
  const id = `rc-letters-0${number}`;
  const taught = LETTER_LESSONS[number - 1];
  const skill = `phonics.letters.${taught.join('-')}`;
  const strings = { model: 'rc.letters.hint.model', reveal: 'rc.letters.hint.reveal' };

  /** A letter, and which picture's word starts with its sound. */
  const toPicture = (name, shown, ids, instruction = 'rc.letters.picture.instruction') => {
    const choices = pictureChoices(ids);
    const answer = choices.find((choice) => startOf(choice.stimulus.id) === shown).id;
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId: skill,
      variant: 'letter-to-picture',
      prompt: { instruction, stimulus: letter(shown) },
      choices,
      answer,
      hints: ladder(strings, choices, answer),
      misconceptions: Object.fromEntries(
        choices
          .filter((choice) => choice.id !== answer)
          .map((choice) => [choice.id, `starts-with-${startOf(choice.stimulus.id)}`]),
      ),
      feedback: { correct: 'rc.letters.picture.correct', incorrect: 'rc.letters.incorrect' },
    };
  };

  /** A picture, and which letter its word starts with. */
  const toLetter = (name, shown, letters) => {
    const choices = letters.map((each, index) => ({
      id: LETTERS[index],
      label: `the letter ${each}`,
      stimulus: letter(each),
    }));
    const answer = choices.find((choice) => choice.stimulus.letters === startOf(shown)).id;
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId: skill,
      variant: 'picture-to-letter',
      prompt: { instruction: 'rc.letters.letter.instruction', stimulus: picture(shown) },
      choices,
      answer,
      hints: ladder(strings, choices, answer),
      misconceptions: Object.fromEntries(
        choices
          .filter((choice) => choice.id !== answer)
          .map((choice) => [choice.id, `letter-${choice.stimulus.letters}`]),
      ),
      feedback: { correct: 'rc.letters.letter.correct', incorrect: 'rc.letters.incorrect' },
    };
  };

  const row = ([name, kind, shown, ...rest]) =>
    kind === 'meet'
      ? toPicture(name, shown, rest, 'rc.letters.meet')
      : kind === 'picture'
        ? toPicture(name, shown, rest)
        : toLetter(name, shown, rest);

  return lesson({
    id,
    skill,
    minutes: 4,
    title: `Letters and their sounds: ${taught.join(', ')}`,
    summary: `Your child meets the letters ${taught.join(', ')}, each with a word that begins with its sound, then finds the picture that starts with a letter's sound, and the letter a picture starts with. On their own, the letter is shown without a word to help.`,
    demo: demo.map(row),
    guided: guided.map(row),
    pool: pool.map(row),
  });
}

const lettersSMAT = () =>
  lettersLesson(1, {
    demo: [
      ['meet-s', 'meet', 's', 'sun', 'moon'],
      ['meet-m', 'meet', 'm', 'moon', 'tap'],
      ['meet-a', 'meet', 'a', 'ant', 'sock'],
      ['meet-t', 'meet', 't', 'tap', 'apple'],
    ],
    guided: [
      ['guided-s', 'picture', 's', 'map', 'sock'],
      ['guided-mug', 'letter', 'mug', 'm', 't'],
    ],
    pool: [
      ['s-picture', 'picture', 's', 'soap', 'axe', 'mat'],
      ['m-picture', 'picture', 'm', 'tin', 'seed', 'mop'],
      ['a-picture', 'picture', 'a', 'top', 'apple', 'moon'],
      ['t-picture', 'picture', 't', 'ant', 'sun', 'tin'],
      ['seed-letter', 'letter', 'seed', 'm', 's', 't'],
      ['man-letter', 'letter', 'man', 's', 'a', 'm'],
      ['axe-letter', 'letter', 'axe', 'a', 't', 's'],
      ['top-letter', 'letter', 'top', 't', 'm', 'a'],
    ],
  });

const lettersPINO = () =>
  lettersLesson(2, {
    demo: [
      ['meet-p', 'meet', 'p', 'pan', 'sun'],
      ['meet-i', 'meet', 'i', 'igloo', 'pot'],
      ['meet-n', 'meet', 'n', 'net', 'ink'],
      ['meet-o', 'meet', 'o', 'octopus', 'nose'],
    ],
    guided: [
      ['guided-p', 'picture', 'p', 'net', 'pin'],
      ['guided-nest', 'letter', 'nest', 'n', 'p'],
    ],
    pool: [
      ['p-picture', 'picture', 'p', 'pot', 'olive', 'nose'],
      ['i-picture', 'picture', 'i', 'net', 'ink', 'pen'],
      ['n-picture', 'picture', 'n', 'igloo', 'pan', 'nest'],
      ['o-picture', 'picture', 'o', 'pin', 'nest', 'olive'],
      ['pen-letter', 'letter', 'pen', 'n', 'p', 'o'],
      ['igloo-letter', 'letter', 'igloo', 'i', 'o', 'p'],
      ['nose-letter', 'letter', 'nose', 'm', 'n', 'i'],
      ['octopus-letter', 'letter', 'octopus', 'a', 'i', 'o'],
    ],
  });

const lettersFLCH = () =>
  lettersLesson(3, {
    demo: [
      ['meet-f', 'meet', 'f', 'fish', 'lamp'],
      ['meet-l', 'meet', 'l', 'leaf', 'cat'],
      ['meet-c', 'meet', 'c', 'cat', 'hat'],
      ['meet-h', 'meet', 'h', 'hat', 'fan'],
    ],
    guided: [
      ['guided-f', 'picture', 'f', 'log', 'fox'],
      ['guided-cup', 'letter', 'cup', 'c', 'h'],
    ],
    pool: [
      ['f-picture', 'picture', 'f', 'cap', 'fan', 'hen'],
      ['l-picture', 'picture', 'l', 'lamp', 'fin', 'hut'],
      ['c-picture', 'picture', 'c', 'leaf', 'hat', 'can'],
      ['h-picture', 'picture', 'h', 'cot', 'hen', 'lip'],
      ['fox-letter', 'letter', 'fox', 'h', 'l', 'f'],
      ['log-letter', 'letter', 'log', 'l', 'c', 't'],
      ['cap-letter', 'letter', 'cap', 'p', 'c', 'f'],
      ['hut-letter', 'letter', 'hut', 'n', 'h', 'l'],
    ],
  });

const lettersUER = () =>
  lettersLesson(4, {
    demo: [
      ['meet-u', 'meet', 'u', 'umbrella', 'rat'],
      ['meet-e', 'meet', 'e', 'egg', 'umbrella'],
      ['meet-r', 'meet', 'r', 'rat', 'egg'],
    ],
    guided: [
      ['guided-r', 'picture', 'r', 'elephant', 'rain'],
      ['guided-egg', 'letter', 'egg', 'e', 'u'],
    ],
    pool: [
      ['u-picture', 'picture', 'u', 'ring', 'umbrella', 'ant'],
      ['e-picture', 'picture', 'e', 'elephant', 'igloo', 'ram'],
      ['r-picture', 'picture', 'r', 'egg', 'olive', 'ram'],
      ['e-picture-again', 'picture', 'e', 'apple', 'rain', 'egg'],
      ['umbrella-letter', 'letter', 'umbrella', 'a', 'u', 'o'],
      ['elephant-letter', 'letter', 'elephant', 'i', 'a', 'e'],
      ['ring-letter', 'letter', 'ring', 'r', 'n', 'l'],
      ['rain-letter', 'letter', 'rain', 'l', 'r', 'u'],
    ],
  });

// ---------------------------------------------------------------------------------------------------------------------
// Blending: the slow word, and reading the word
// ---------------------------------------------------------------------------------------------------------------------

function nearness(word, other) {
  if (word[0] === other[0]) return 'same-first-sound';
  if (word.at(-1) === other.at(-1)) return 'same-last-sound';
  return 'other-word';
}

function blendLesson({ id, skill, title, summary, print, demo, guided, pool }) {
  const strings = { model: 'rc.blend.hint.model', reveal: 'rc.blend.hint.reveal' };
  const row = ([name, word, ...ids]) => {
    const choices = pictureChoices(ids);
    const answer = choices[ids.indexOf(word)].id;
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId: skill,
      variant: `short-${lexicon[word].letters[1]}`,
      prompt: {
        instruction: print ? 'rc.read.instruction' : 'rc.blend.instruction',
        stimulus: print ? { type: 'word', id: word } : { type: 'sound', clip: `slow.${word}` },
      },
      choices,
      answer,
      hints: ladder(strings, choices, answer),
      misconceptions: Object.fromEntries(
        choices
          .filter((choice) => choice.id !== answer)
          .map((choice) => [choice.id, nearness(word, choice.stimulus.id)]),
      ),
      feedback: { correct: 'rc.blend.correct', incorrect: 'rc.blend.incorrect' },
    };
  };
  return lesson({
    id,
    skill,
    title,
    summary,
    minutes: 4,
    demo: demo.map(row),
    guided: guided.map(row),
    pool: pool.map(row),
  });
}

const blendByEar = () =>
  blendLesson({
    id: 'rc-blend-01',
    skill: 'phonics.blending.hear-slow-word',
    title: 'The slow word',
    summary:
      'A word is said slowly, its sounds running into one another, and your child finds its picture. Next to it is a picture whose word is one sound different. This is blending by ear: no letters are shown.',
    print: false,
    demo: [['demo', 'sun', 'sun', 'hat']],
    guided: [
      ['guided-map', 'map', 'pin', 'map'],
      ['guided-cat', 'cat', 'cat', 'cup'],
    ],
    pool: [
      ['mat', 'mat', 'map', 'mat', 'pot'],
      ['pin', 'pin', 'pin', 'hen', 'pan'],
      ['top', 'top', 'fin', 'tap', 'top'],
      ['hen', 'hen', 'hat', 'hen', 'mop'],
      ['cup', 'cup', 'cup', 'net', 'cap'],
      ['fan', 'fan', 'rat', 'fin', 'fan'],
      ['net', 'net', 'hen', 'net', 'lip'],
      ['pot', 'pot', 'pot', 'cat', 'pen'],
      ['tap', 'tap', 'tin', 'tap', 'top'],
      ['rat', 'rat', 'ram', 'hut', 'rat'],
    ],
  });

const blendInPrint = () =>
  blendLesson({
    id: 'rc-blend-02',
    skill: 'phonics.decoding.read-short-word',
    title: 'Read the word',
    summary:
      'A short word is shown in letters your child has met. With help it is said slowly as a finger runs under it. On their own nothing is said: your child reads the word and finds its picture among words that are nearly the same, so the picture cannot be chosen without reading.',
    print: true,
    demo: [['demo', 'mat', 'mat', 'sun']],
    guided: [
      ['guided-pin', 'pin', 'pan', 'pin'],
      ['guided-hat', 'hat', 'hat', 'hen'],
    ],
    pool: [
      ['man', 'man', 'map', 'man', 'mop'],
      ['pen', 'pen', 'pen', 'pin', 'pan'],
      ['cot', 'cot', 'cat', 'cup', 'cot'],
      ['ram', 'ram', 'ram', 'hut', 'rat'],
      ['lip', 'lip', 'tap', 'top', 'lip'],
      ['can', 'can', 'cap', 'can', 'cot'],
      ['tin', 'tin', 'tin', 'fin', 'tap'],
      ['fin', 'fin', 'pin', 'fan', 'fin'],
      ['mop', 'mop', 'map', 'mop', 'top'],
      ['cap', 'cap', 'cup', 'cat', 'cap'],
      ['pan', 'pan', 'pin', 'pan', 'pen'],
    ],
  });

// ---------------------------------------------------------------------------------------------------------------------
// The pack, and what the voice has to be able to say for it
// ---------------------------------------------------------------------------------------------------------------------

const skill = (id, title, objective, prerequisites) => ({
  id,
  world: 'reading-cove',
  strand: 'phonics',
  title,
  objective,
  prerequisites,
});

const SKILLS = [
  skill(
    'phonics.listening.match-sound-to-source',
    'Tell sounds apart',
    'Hears a sound and finds what made it, out of two or three things that make different sounds.',
    [],
  ),
  skill(
    'phonics.listening.repeat-sound-pattern',
    'Repeat a pattern of sounds',
    'Hears two or three sounds one after another and plays them back in the same order.',
    ['phonics.listening.match-sound-to-source'],
  ),
  skill(
    'phonics.awareness.first-sound-s-m-f',
    'Hear the first sound of a word: s, m, f',
    'Hears that two spoken words start with the same sound, for words that start with s, m or f. Done by ear, with pictures; no letters are shown.',
    ['phonics.listening.repeat-sound-pattern'],
  ),
  skill(
    'phonics.awareness.first-sound-n-l-r',
    'Hear the first sound of a word: n, l, r',
    'Hears that two spoken words start with the same sound, for words that start with n, l or r.',
    ['phonics.awareness.first-sound-s-m-f'],
  ),
  ...LETTER_LESSONS.map((letters, index) =>
    skill(
      `phonics.letters.${letters.join('-')}`,
      `Link letters to their sounds: ${letters.join(', ')}`,
      `Shown the letter ${letters.join(' or ')} with no word to help, finds a picture whose word starts with its sound; and shown a picture, finds the letter its word starts with.`,
      [
        index === 0
          ? 'phonics.awareness.first-sound-s-m-f'
          : `phonics.letters.${LETTER_LESSONS[index - 1].join('-')}`,
      ],
    ),
  ),
  skill(
    'phonics.blending.hear-slow-word',
    'Blend a slow word by ear',
    'Hears a short word said slowly, sound running into sound, and knows which word it is, told apart from a word one sound different.',
    ['phonics.awareness.first-sound-n-l-r'],
  ),
  skill(
    'phonics.decoding.read-short-word',
    'Read a short word',
    'Reads a three-letter word made of letters already taught, with nothing said aloud, and finds its picture among words that are nearly the same.',
    ['phonics.blending.hear-slow-word', `phonics.letters.${LETTER_LESSONS.at(-1).join('-')}`],
  ),
];

const STRINGS = {
  'rc.hint.not-this': 'Not this one.',
  'rc.listen.instruction': 'Listen. What made that sound?',
  'rc.listen.correct': 'Yes. That was it.',
  'rc.listen.incorrect': 'That one sounds like this. Listen again.',
  'rc.listen.hint.model': 'Listen to each one.',
  'rc.listen.hint.reveal': 'It was this one.',
  'rc.echo.instruction': 'Listen. Then play it back.',
  'rc.echo.correct': 'Yes. You played it back.',
  'rc.echo.incorrect': 'Not quite. Listen again.',
  'rc.echo.hint.model': 'Here it is again.',
  'rc.echo.hint.step': 'It starts like this.',
  'rc.echo.hint.reveal': 'Tap them as I point.',
  'rc.first.instruction': 'Listen. Which one starts the same?',
  'rc.first.correct': 'Yes. They start the same.',
  'rc.first.incorrect': 'That one starts another way. Listen again.',
  'rc.first.hint.model': 'Listen to how each one starts.',
  'rc.first.hint.reveal': 'This one starts the same.',
  'rc.letters.meet': 'Look at this letter. This word starts with its sound.',
  'rc.letters.picture.instruction': "Which one starts with this letter's sound?",
  'rc.letters.letter.instruction': 'Which letter does it start with?',
  'rc.letters.picture.correct': 'Yes. It starts with that sound.',
  'rc.letters.letter.correct': 'Yes. It starts with that letter.',
  'rc.letters.incorrect': 'Not that one. Listen again.',
  'rc.letters.hint.model': "Listen to the letter's word.",
  'rc.letters.hint.reveal': 'It is this one.',
  'rc.blend.instruction': 'Listen to the slow word. Which one is it?',
  'rc.read.instruction': 'Read the word. Which one is it?',
  'rc.blend.correct': 'Yes. That is the word.',
  'rc.blend.incorrect': 'That is another word. Listen again.',
  'rc.blend.hint.model': 'Here it is, slowly.',
  'rc.blend.hint.reveal': 'It is this one.',
};

export function buildReadingCovePack() {
  return {
    format: 'training-academy.content-pack',
    schemaVersion: 1,
    id: 'reading-cove',
    world: 'reading-cove',
    contentVersion: 1,
    strings: { en: STRINGS },
    skills: SKILLS,
    lessons: [
      listenLesson(),
      echoLesson(),
      firstSMF(),
      firstNLR(),
      lettersSMAT(),
      lettersPINO(),
      lettersFLCH(),
      lettersUER(),
      blendByEar(),
      blendInPrint(),
    ],
  };
}

/**
 * What the voice needs for this pack beside its lines: every picture's word said plainly; the word with its first
 * sound drawn out, where it has a first sound that can be; every word that is blended, said slowly; and the six
 * sounds that are not speech.
 */
export function buildReadingCoveVoice() {
  const pack = buildReadingCovePack();
  const pictures = new Set();
  const slow = new Set();
  const sounds = new Set();
  const note = (stimulus) => {
    if (stimulus.type === 'picture') pictures.add(stimulus.id);
    if (stimulus.type === 'word') {
      slow.add(stimulus.id);
      pictures.add(stimulus.id);
    }
    if (stimulus.type === 'sound') {
      const [kind, name] = stimulus.clip.split('.');
      if (kind === 'slow') slow.add(name);
      else sounds.add(name);
    }
  };
  for (const { challenges } of pack.lessons) {
    for (const challenge of challenges) {
      if (challenge.kind === 'choose-one') {
        note(challenge.prompt.stimulus);
        for (const choice of challenge.choices) note(choice.stimulus);
      } else {
        for (const card of challenge.task.cards) sounds.add(card.stimulus.id);
      }
    }
  }
  // Every key word of every letter taught is needed for "listen to the letter's word", used here or not.
  const taught = new Set(LETTER_LESSONS.flat());
  for (const [id, entry] of Object.entries(lexicon)) {
    if (entry.starts && taught.has(entry.starts)) pictures.add(id);
  }
  for (const name of sounds) pictures.delete(name);
  const sorted = (set) => [...set].sort();
  const entries = (prefix, ids) =>
    Object.fromEntries(ids.map((id) => [`${prefix}.${id}`, lexicon[id].word]));
  return {
    about:
      "What the voice says for Reading Cove beside the lines of its pack: every picture's word, the word with its first sound drawn out, the words that are blended said slowly, and the sounds that are not speech. Written by scripts/content/reading-cove.mjs; do not edit by hand.",
    groups: {
      // Plain words are shared with the other worlds that name pictures.
      words: { words: entries('word', sorted(pictures)) },
      'reading-cove': {
        onsets: entries(
          'onset',
          sorted(pictures).filter((id) => DRAWN_OUT.has(startOf(id))),
        ),
        slow: entries('slow', sorted(slow)),
        sounds: entries('sound', sorted(sounds)),
      },
    },
  };
}
