// Reading Cove's content pack, written from tables.
//
//   what made that sound?            a sound, and the thing that makes it        (listening)
//   play it back                     two or three sounds, to be done again        (listening)
//   which one rhymes?                a word, and the one that ends the same       (rhyme, by ear)
//   clap the word                    a word, and how many beats it has            (syllables, by ear)
//   which one starts the same?       s, m, f — then n, l, r                       (first sounds, by ear)
//   a letter and its sound           fifteen letters, four lessons                (letters)
//   the slow word                    a word said slowly, and which picture it is  (blending, by ear)
//   read the word                    a word in letters, and which picture it is   (blending, in print)
//   build the word                   a word, and its letters to put in order      (segmenting)
//   two letters, one sound           sh, ch, th                                   (letters)
//   read the word: sh, ch, th        words with those in them                     (blending, in print)
//   read the sentence                five words, and which picture they tell of   (sentences)
//
// No sound is ever played on its own for a letter: there is no recording of one that anybody has checked. A letter
// is taught by the words that begin with its sound, the first sound drawn out ("sssun"), and a word is blended by
// hearing it said slowly. docs/CURRICULUM.md says why.
//
// A lesson that is live does not change (src/content/lessons.lock.json holds each to what was written down for
// it). What was added later stands beside what was there: the functions the older lessons are made by take new
// arguments, and without them write what they always wrote.
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
const DRAWN_OUT = new Set(['s', 'm', 'f', 'n', 'l', 'r', 'h', 'a', 'i', 'o', 'u', 'e', 'sh', 'th']);

const picture = (id) => ({ type: 'picture', id });
const letter = (letters) => ({ type: 'letter', letters });
/** A picture only Reading Cove draws: a word to rhyme with, claps on a card, a sentence in print. */
const scene = (name, of) => ({ type: 'scene', scene: name, of });
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

/** The pairs of letters that each write one sound, taught after the letters on their own. */
export const LETTER_PAIRS = ['sh', 'ch', 'th'];

/** What a lesson of letters says, and what a lesson of pairs says instead. */
const LETTER_WORDS = {
  meet: 'rc.letters.meet',
  toPicture: 'rc.letters.picture.instruction',
  toLetter: 'rc.letters.letter.instruction',
  letterRight: 'rc.letters.letter.correct',
  title: (taught) => `Letters and their sounds: ${taught.join(', ')}`,
  summary: (taught) =>
    `Your child meets the letters ${taught.join(', ')}, each with a word that begins with its sound, then finds the picture that starts with a letter's sound, and the letter a picture starts with. On their own, the letter is shown without a word to help.`,
};
const PAIR_WORDS = {
  meet: 'rc.pairs.meet',
  toPicture: 'rc.pairs.picture.instruction',
  toLetter: 'rc.pairs.letter.instruction',
  letterRight: 'rc.pairs.letter.correct',
  title: (taught) => `Two letters, one sound: ${taught.join(', ')}`,
  summary: (taught) =>
    `Your child meets ${taught.join(', ')}: two letters that together write one sound, each with a word that begins with it. Then the picture that starts with a pair's sound, and the pair a picture starts with, told apart from s, c, t and h on their own.`,
};

function lettersLesson(number, { demo, guided, pool }, taught = LETTER_LESSONS[number - 1]) {
  const id = `rc-letters-0${number}`;
  const skill = `phonics.letters.${taught.join('-')}`;
  const strings = { model: 'rc.letters.hint.model', reveal: 'rc.letters.hint.reveal' };
  const words = taught === LETTER_PAIRS ? PAIR_WORDS : LETTER_WORDS;

  /** A letter, and which picture's word starts with its sound. */
  const toPicture = (name, shown, ids, instruction = words.toPicture) => {
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
      label: each.length > 1 ? `the letters ${each}` : `the letter ${each}`,
      stimulus: letter(each),
    }));
    const answer = choices.find((choice) => choice.stimulus.letters === startOf(shown)).id;
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId: skill,
      variant: 'picture-to-letter',
      prompt: { instruction: words.toLetter, stimulus: picture(shown) },
      choices,
      answer,
      hints: ladder(strings, choices, answer),
      misconceptions: Object.fromEntries(
        choices
          .filter((choice) => choice.id !== answer)
          .map((choice) => [choice.id, `letter-${choice.stimulus.letters}`]),
      ),
      feedback: { correct: words.letterRight, incorrect: 'rc.letters.incorrect' },
    };
  };

  const row = ([name, kind, shown, ...rest]) =>
    kind === 'meet'
      ? toPicture(name, shown, rest, words.meet)
      : kind === 'picture'
        ? toPicture(name, shown, rest)
        : toLetter(name, shown, rest);

  return lesson({
    id,
    skill,
    minutes: 4,
    title: words.title(taught),
    summary: words.summary(taught),
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

const lettersPairs = () =>
  lettersLesson(
    5,
    {
      demo: [
        ['meet-sh', 'meet', 'sh', 'ship', 'sun'],
        ['meet-ch', 'meet', 'ch', 'cheese', 'cat'],
        ['meet-th', 'meet', 'th', 'thumb', 'tap'],
      ],
      guided: [
        ['guided-sh', 'picture', 'sh', 'sock', 'shop'],
        ['guided-chin', 'letter', 'chin', 'ch', 'sh'],
      ],
      pool: [
        ['sh-picture', 'picture', 'sh', 'seed', 'ship', 'chin'],
        ['ch-picture', 'picture', 'ch', 'cup', 'shop', 'chip'],
        ['th-picture', 'picture', 'th', 'thumb', 'tin', 'fan'],
        ['sh-picture-again', 'picture', 'sh', 'cheese', 'hat', 'shop'],
        ['ship-letter', 'letter', 'ship', 's', 'sh', 'ch'],
        ['cheese-letter', 'letter', 'cheese', 'c', 'ch', 'sh'],
        ['thumb-letter', 'letter', 'thumb', 't', 'th', 'h'],
        ['chip-letter', 'letter', 'chip', 'sh', 'th', 'ch'],
      ],
    },
    LETTER_PAIRS,
  );

// ---------------------------------------------------------------------------------------------------------------------
// Blending: the slow word, and reading the word
// ---------------------------------------------------------------------------------------------------------------------

function nearness(word, other) {
  if (word[0] === other[0]) return 'same-first-sound';
  if (word.at(-1) === other.at(-1)) return 'same-last-sound';
  return 'other-word';
}

/**
 * The same, by sounds and not by letters: "ship" and "sun" do not start the same, and "moth" and "path" end the
 * same. For the words that came later, some of which have two letters to a sound.
 */
function nearSounds(word, other) {
  const [a, b] = [lexicon[word].letters, lexicon[other].letters];
  if (a[0] === b[0]) return 'same-first-sound';
  if (a.at(-1) === b.at(-1)) return 'same-last-sound';
  return 'other-word';
}

function blendLesson({ id, skill, title, summary, print, demo, guided, pool, near = nearness }) {
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
          .map((choice) => [choice.id, near(word, choice.stimulus.id)]),
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

const blendPairsInPrint = () =>
  blendLesson({
    id: 'rc-blend-03',
    skill: 'phonics.decoding.read-word-sh-ch-th',
    title: 'Read the word: sh, ch, th',
    summary:
      'A short word with sh, ch or th in it is shown in letters, the two letters together on one tile because they write one sound. On their own nothing is said: your child reads the word and finds its picture among words that are nearly the same.',
    print: true,
    near: nearSounds,
    demo: [['demo', 'ship', 'ship', 'sun']],
    guided: [
      ['guided-fish', 'fish', 'fin', 'fish'],
      ['guided-chin', 'chin', 'chin', 'ship'],
    ],
    pool: [
      ['shop', 'shop', 'ship', 'shop', 'top'],
      ['chip', 'chip', 'chip', 'ship', 'chin'],
      ['moth', 'moth', 'mop', 'moth', 'path'],
      ['path', 'path', 'pan', 'moth', 'path'],
      ['ship', 'ship', 'chip', 'shop', 'ship'],
      ['fish', 'fish', 'fish', 'fin', 'ship'],
      ['chin', 'chin', 'tin', 'chin', 'chip'],
      // A word with no pair in it, among words that have one: knowing "ch" is also knowing when it is not there.
      ['tin', 'tin', 'chin', 'tin', 'fin'],
    ],
  });

// ---------------------------------------------------------------------------------------------------------------------
// Rhyme: which one rhymes?
// ---------------------------------------------------------------------------------------------------------------------

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
/** How a word ends, from its vowel on: what it shares with a word it rhymes with. */
const rimeOf = (id) => {
  const { letters } = lexicon[id];
  return letters.slice(letters.findIndex((each) => VOWELS.has(each))).join('');
};

function rhymeLesson() {
  const id = 'rc-rhyme-01';
  const skill = 'phonics.awareness.rhyme';
  const strings = { model: 'rc.rhyme.hint.model', reveal: 'rc.rhyme.hint.reveal' };
  const row = ([name, target, ...ids]) => {
    const choices = pictureChoices(ids);
    const answer = choices.find((choice) => rimeOf(choice.stimulus.id) === rimeOf(target)).id;
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId: skill,
      variant: `ends-${rimeOf(target)}`,
      prompt: { instruction: 'rc.rhyme.instruction', stimulus: scene('rhyme', { word: target }) },
      choices,
      answer,
      hints: ladder(strings, choices, answer),
      misconceptions: Object.fromEntries(
        choices
          .filter((choice) => choice.id !== answer)
          .map((choice) => [choice.id, nearSounds(target, choice.stimulus.id)]),
      ),
      feedback: { correct: 'rc.rhyme.correct', incorrect: 'rc.rhyme.incorrect' },
    };
  };
  return lesson({
    id,
    skill,
    title: 'Which one rhymes?',
    summary:
      'Your child hears a word and finds the picture whose word rhymes with it: cat, hat. Beside it is a word that starts the same, which is the one children pick before they have the idea of rhyme. All by ear: no letters are shown.',
    demo: [['demo', 'cat', 'hat', 'cup']].map(row),
    guided: [
      ['guided-man', 'man', 'mop', 'fan'],
      ['guided-pin', 'pin', 'tin', 'pot'],
    ].map(row),
    pool: [
      ['mat', 'mat', 'map', 'rat', 'sun'],
      ['fan', 'fan', 'fin', 'hut', 'can'],
      ['tin', 'tin', 'fin', 'top', 'net'],
      ['map', 'map', 'man', 'tap', 'cup'],
      ['top', 'top', 'mop', 'tap', 'pen'],
      ['pot', 'pot', 'pan', 'hat', 'cot'],
      ['hen', 'hen', 'pen', 'hat', 'sun'],
      ['ship', 'ship', 'shop', 'fish', 'lip'],
      ['chin', 'chin', 'pin', 'chip', 'hen'],
      ['cap', 'cap', 'cat', 'lip', 'map'],
    ].map(row),
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Syllables: clap the word
// ---------------------------------------------------------------------------------------------------------------------

const CLAPS = ['', 'one clap', 'two claps', 'three claps'];
const BEATS = ['', 'one-beat', 'two-beats', 'three-beats'];

/** What a wrong number of claps says: the same tags a wrong amount gets anywhere. */
function clapsOff(right, chosen) {
  const difference = chosen - right;
  if (difference === 1) return 'one-more';
  if (difference === -1) return 'one-fewer';
  return difference > 0 ? 'many-more' : 'many-fewer';
}

function syllableLesson() {
  const id = 'rc-syllables-01';
  const skill = 'phonics.awareness.syllables';
  const strings = { model: 'rc.beats.hint.model', reveal: 'rc.beats.hint.reveal' };
  const row = ([name, word, ...counts]) => {
    const beats = lexicon[word].beats.length;
    const choices = counts.map((count, index) => ({
      id: LETTERS[index],
      label: CLAPS[count],
      stimulus: scene('claps', { count }),
    }));
    const answer = choices[counts.indexOf(beats)].id;
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId: skill,
      variant: BEATS[beats],
      prompt: { instruction: 'rc.beats.instruction', stimulus: scene('beats', { word }) },
      choices,
      answer,
      hints: ladder(strings, choices, answer),
      misconceptions: Object.fromEntries(
        choices
          .filter((choice) => choice.id !== answer)
          .map((choice) => [choice.id, clapsOff(beats, choice.stimulus.of.count)]),
      ),
      feedback: { correct: 'rc.beats.correct', incorrect: 'rc.beats.incorrect' },
    };
  };
  return lesson({
    id,
    skill,
    title: 'Clap the word',
    summary:
      'A word is said and clapped in its beats: el, e, phant is three claps. Your child finds the card with as many claps. On their own the word is only said, and the clapping is theirs to do. Clapping the beats of a word comes before hearing the sounds inside one.',
    demo: [['demo', 'elephant', 1, 3]].map(row),
    guided: [
      ['guided-apple', 'apple', 2, 1],
      ['guided-sun', 'sun', 3, 1],
    ].map(row),
    pool: [
      ['octopus', 'octopus', 1, 2, 3],
      ['moon', 'moon', 3, 1, 2],
      ['igloo', 'igloo', 2, 3, 1],
      ['umbrella', 'umbrella', 2, 1, 3],
      ['fish', 'fish', 1, 3, 2],
      ['lemon', 'lemon', 3, 2, 1],
      ['banana', 'banana', 3, 1, 2],
      ['cat', 'cat', 2, 1, 3],
      ['olive', 'olive', 1, 2, 3],
      ['rocket', 'rocket', 2, 3, 1],
    ].map(row),
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Segmenting: build the word
// ---------------------------------------------------------------------------------------------------------------------

function spellLesson() {
  const id = 'rc-spell-01';
  const skill = 'phonics.segmenting.build-short-word';
  const row = ([name, word]) => {
    const { letters } = lexicon[word];
    return {
      id: `${id}.${name}`,
      kind: 'make',
      skillId: skill,
      variant: `short-${letters[1]}`,
      prompt: { instruction: 'rc.spell.instruction', stimulus: picture(word) },
      task: {
        type: 'order',
        cards: letters.map((each) => ({
          id: each,
          label: `the letter ${each}`,
          stimulus: letter(each),
        })),
        solution: letters,
      },
      hints: [
        { type: 'model', caption: 'rc.spell.hint.model' },
        { type: 'step', count: 1, caption: 'rc.spell.hint.step' },
        { type: 'reveal', caption: 'rc.spell.hint.reveal' },
      ],
      feedback: { correct: 'rc.spell.correct', incorrect: 'rc.spell.incorrect' },
    };
  };
  return lesson({
    id,
    skill,
    minutes: 4,
    title: 'Build the word',
    summary:
      'A word is said, and its three letters lie out of order. Your child puts each in its place: first sound, middle, last. With help the word is said slowly and each place lights as its sound comes. This is pulling a word apart into its sounds, the other half of blending.',
    demo: [['demo', 'sun']].map(row),
    guided: [
      ['guided-mat', 'mat'],
      ['guided-pin', 'pin'],
    ].map(row),
    pool: [
      ['map', 'map'],
      ['hen', 'hen'],
      ['top', 'top'],
      ['cup', 'cup'],
      ['fan', 'fan'],
      ['net', 'net'],
      ['rat', 'rat'],
      ['lip', 'lip'],
      ['pot', 'pot'],
      ['cat', 'cat'],
    ].map(row),
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Sentences: read the sentence
// ---------------------------------------------------------------------------------------------------------------------

/** "cat on mat": a thing, where it is, and what it is on or in. Every sentence here is "a … on a …" or "a … in a …". */
const told = (text) => {
  const [thing, how, base] = text.split(' ');
  return { thing, how, base };
};
export const sentenceWords = ({ thing, how, base }) => ['a', thing, how, 'a', base];
export const sentenceKey = ({ thing, how, base }) => `sentence.${thing}-${how}-${base}`;

/** What a picture that is not what the sentence says has got wrong. */
function misread(right, shown) {
  if (shown.thing === right.base && shown.base === right.thing) return 'words-swapped';
  if (shown.how !== right.how) return 'little-word-misread';
  return shown.thing !== right.thing ? 'first-word-misread' : 'last-word-misread';
}

function sentenceLesson() {
  const id = 'rc-sentences-01';
  const skill = 'phonics.decoding.read-short-sentence';
  const strings = { model: 'rc.sentence.hint.model', reveal: 'rc.sentence.hint.reveal' };
  const row = ([name, ...texts]) => {
    // The first one written is what the sentence says; they are then put in another order.
    const right = told(texts[0]);
    const shown = (name.startsWith('demo') ? texts : rotate(texts, name.length)).map(told);
    const choices = shown.map((each, index) => ({
      id: LETTERS[index],
      label: sentenceWords(each).join(' '),
      stimulus: scene('placed', each),
    }));
    const answer = choices[shown.findIndex((each) => sentenceKey(each) === sentenceKey(right))].id;
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId: skill,
      variant: right.how,
      prompt: {
        instruction: 'rc.sentence.instruction',
        stimulus: scene('sentence', { words: sentenceWords(right) }),
      },
      choices,
      answer,
      hints: ladder(strings, choices, answer),
      misconceptions: Object.fromEntries(
        choices
          .filter((choice) => choice.id !== answer)
          .map((choice) => [choice.id, misread(right, choice.stimulus.of)]),
      ),
      feedback: { correct: 'rc.sentence.correct', incorrect: 'rc.sentence.incorrect' },
    };
  };
  return lesson({
    id,
    skill,
    minutes: 4,
    title: 'Read the sentence',
    summary:
      'Five short words in a row: a cat on a mat. Your child reads them and finds the picture they tell of, beside pictures that are one word different, so every word has to be read. With help the sentence is read aloud, a finger under each word; on their own nothing is said.',
    demo: [['demo', 'cat on mat', 'hat on mat']].map(row),
    guided: [
      ['guided-hen', 'hen in hut', 'hen on hut'],
      ['guided-hat', 'hat on man', 'cap on man'],
    ].map(row),
    pool: [
      ['pen-in-cup', 'pen in cup', 'pin in cup', 'pen in pan'],
      ['hat-on-cat', 'hat on cat', 'cat on hat', 'hat on cot'],
      ['rat-in-pan', 'rat in pan', 'rat in cup', 'cat in pan'],
      ['pin-on-map', 'pin on map', 'pan on map', 'pin on mat'],
      ['cat-on-cot', 'cat on cot', 'hat on cot', 'cat on hut'],
      ['man-in-hut', 'man in hut', 'hen in hut', 'man on hut'],
      ['cup-on-mat', 'cup on mat', 'cap on mat', 'cup on map'],
      ['rat-on-hat', 'rat on hat', 'hat on rat', 'rat on mat'],
      ['hen-on-hut', 'hen on hut', 'hen in hut', 'hat on hut'],
    ].map(row),
  });
}

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
  // The skills of the activities that came later: after the ones above, which stay as they were written.
  skill(
    'phonics.awareness.rhyme',
    'Hear that two words rhyme',
    'Hears a word and finds the one that rhymes with it, told apart from a word that starts the same and a word that only ends with the same sound. Done by ear, with pictures.',
    ['phonics.listening.repeat-sound-pattern'],
  ),
  skill(
    'phonics.awareness.syllables',
    'Clap the beats of a word',
    'Hears a word of one, two or three beats said plainly, and says how many beats it has by choosing as many claps.',
    ['phonics.listening.repeat-sound-pattern'],
  ),
  skill(
    'phonics.segmenting.build-short-word',
    'Build a short word from its sounds',
    'Hears a three-sound word said plainly and puts its three letters in order: the first sound, the middle one, the last.',
    ['phonics.blending.hear-slow-word', `phonics.letters.${LETTER_LESSONS.at(-1).join('-')}`],
  ),
  skill(
    `phonics.letters.${LETTER_PAIRS.join('-')}`,
    `Link two letters to one sound: ${LETTER_PAIRS.join(', ')}`,
    `Shown ${LETTER_PAIRS.join(' or ')} with no word to help, finds a picture whose word starts with its sound, and shown a picture, finds the pair its word starts with, told apart from the single letters.`,
    [`phonics.letters.${LETTER_LESSONS.at(-1).join('-')}`],
  ),
  skill(
    'phonics.decoding.read-word-sh-ch-th',
    'Read a short word with sh, ch or th',
    'Reads a word of three sounds, one of them written with two letters, with nothing said aloud, and finds its picture among words that are nearly the same.',
    ['phonics.decoding.read-short-word', `phonics.letters.${LETTER_PAIRS.join('-')}`],
  ),
  skill(
    'phonics.decoding.read-short-sentence',
    'Read a short sentence',
    'Reads five short words in a row with nothing said aloud, and finds the picture they tell of among pictures that differ by one word.',
    ['phonics.decoding.read-short-word'],
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
  'rc.rhyme.instruction': 'Listen. Which one rhymes?',
  'rc.rhyme.correct': 'Yes. They rhyme. They end the same.',
  'rc.rhyme.incorrect': 'That one ends another way. Listen again.',
  'rc.rhyme.hint.model': 'Listen to how each one ends.',
  'rc.rhyme.hint.reveal': 'This one rhymes.',
  'rc.beats.instruction': 'Clap the word. How many claps?',
  'rc.beats.correct': 'Yes. That many claps.',
  'rc.beats.incorrect': 'Not that many. Listen to the claps.',
  'rc.beats.hint.model': 'Listen. I will clap it.',
  'rc.beats.hint.reveal': 'It has this many claps.',
  'rc.spell.instruction': 'Build the word.',
  'rc.spell.correct': 'Yes. You built the word.',
  'rc.spell.incorrect': 'Not quite. Listen to it slowly.',
  'rc.spell.hint.model': 'Listen to it slowly.',
  'rc.spell.hint.step': 'It starts like this.',
  'rc.spell.hint.reveal': 'Put them like this.',
  'rc.pairs.meet': 'Two letters, one sound. This word starts with it.',
  'rc.pairs.picture.instruction': 'Which one starts with this sound?',
  'rc.pairs.letter.instruction': 'Which letters does it start with?',
  'rc.pairs.letter.correct': 'Yes. It starts with those letters.',
  'rc.sentence.instruction': 'Read it. Which picture is it?',
  'rc.sentence.correct': 'Yes. That is what it says.',
  'rc.sentence.incorrect': 'It says something else. Read it again.',
  'rc.sentence.hint.model': 'Here it is, word by word.',
  'rc.sentence.hint.reveal': 'It is this one.',
};

export function buildReadingCovePack() {
  return {
    format: 'training-academy.content-pack',
    schemaVersion: 1,
    id: 'reading-cove',
    world: 'reading-cove',
    contentVersion: 2,
    strings: { en: STRINGS },
    skills: SKILLS,
    // In the order they are met: everything that is done by ear comes before the first letter.
    lessons: [
      listenLesson(),
      echoLesson(),
      rhymeLesson(),
      syllableLesson(),
      firstSMF(),
      firstNLR(),
      lettersSMAT(),
      lettersPINO(),
      lettersFLCH(),
      lettersUER(),
      blendByEar(),
      blendInPrint(),
      spellLesson(),
      lettersPairs(),
      blendPairsInPrint(),
      sentenceLesson(),
    ],
  };
}

/**
 * What the voice needs for this pack beside its lines: every picture's word said plainly; the word with its first
 * sound drawn out, where it has a first sound that can be; every word that is blended or built, said slowly, with
 * its sounds written apart so that the voice tool marks where each begins; every word that is clapped, in its
 * beats; every sentence, read aloud; and the six sounds that are not speech.
 */
export function buildReadingCoveVoice() {
  const pack = buildReadingCovePack();
  const pictures = new Set();
  const slow = new Set();
  const sounds = new Set();
  const clapped = new Set();
  const read = new Map();
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
    if (stimulus.type === 'scene') {
      const { scene: name, of } = stimulus;
      if (name === 'rhyme') pictures.add(of.word);
      if (name === 'beats') {
        pictures.add(of.word);
        // A word of one beat is clapped once as it is said plainly: there is nothing to cut.
        if (lexicon[of.word].beats.length > 1) clapped.add(of.word);
      }
      if (name === 'placed') {
        pictures.add(of.thing);
        pictures.add(of.base);
      }
      if (name === 'sentence') {
        const [, thing, how, , base] = of.words;
        const words = of.words.join(' ');
        read.set(sentenceKey({ thing, how, base }), `${words[0].toUpperCase()}${words.slice(1)}.`);
      }
    }
  };
  for (const { challenges } of pack.lessons) {
    for (const challenge of challenges) {
      if (challenge.kind === 'choose-one') {
        note(challenge.prompt.stimulus);
        for (const choice of challenge.choices) note(choice.stimulus);
      } else if (challenge.task.type === 'echo') {
        for (const card of challenge.task.cards) sounds.add(card.stimulus.id);
      } else {
        // A word to build: its picture, and the word said slowly.
        const { stimulus } = challenge.prompt;
        pictures.add(stimulus.id);
        slow.add(stimulus.id);
      }
    }
  }
  // Every key word of every letter taught is needed for "listen to the letter's word", used here or not.
  const taught = new Set([...LETTER_LESSONS.flat(), ...LETTER_PAIRS]);
  for (const [id, entry] of Object.entries(lexicon)) {
    if (entry.starts && taught.has(entry.starts)) pictures.add(id);
  }
  for (const name of sounds) pictures.delete(name);
  const sorted = (set) => [...set].sort();
  const entries = (prefix, ids, say = (id) => lexicon[id].word) =>
    Object.fromEntries(ids.map((id) => [`${prefix}.${id}`, say(id)]));
  return {
    about:
      "What the voice says for Reading Cove beside the lines of its pack: every picture's word, the word with its first sound drawn out, the words that are blended or built said slowly (written with their sounds apart, so that where each begins is marked), the words that are clapped said in their beats, the sentences read aloud, and the sounds that are not speech. Written by scripts/content/reading-cove.mjs; do not edit by hand.",
    groups: {
      // Plain words are shared with the other worlds that name pictures.
      words: { words: entries('word', sorted(pictures)) },
      'reading-cove': {
        onsets: entries(
          'onset',
          sorted(pictures).filter((id) => DRAWN_OUT.has(startOf(id))),
        ),
        slow: entries('slow', sorted(slow), (id) => lexicon[id].letters.join('-')),
        beats: entries('beats', sorted(clapped), (id) => lexicon[id].beats.join('-')),
        read: Object.fromEntries(sorted(new Set(read.keys())).map((key) => [key, read.get(key)])),
        sounds: entries('sound', sorted(sounds)),
      },
    },
  };
}
