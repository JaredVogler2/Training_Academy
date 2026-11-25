import lexiconFile from '@/art/lexicon.json';
import {
  clapsMisconception,
  placedBy,
  placedMisconception,
  readReadingPicture,
  sentenceFor,
  type ChooseOneChallenge,
  type ContentPack,
  type MakeChallenge,
  type ReadingPicture,
  type Stimulus,
} from '@/engine';
import type { Report, WorldRules } from './types';

/**
 * Reading Cove's answers are about sounds and letters, so its rules look words up.
 *
 *   a sound, and what made it          the picture that is right is the thing the sound is of
 *   a slow word, and its picture       likewise: the picture of that word, and no other
 *   a word, and one that rhymes        exactly one choice ends as it does, from the vowel on, and is another word
 *   a word, and its claps              exactly one card has as many claps as the word has beats
 *   a word, and one that starts so     exactly one choice starts with the same sound, and it is not the same word
 *   a letter, and a word it starts     exactly one choice starts with that letter's sound
 *   a picture, and its first letter    exactly one letter is the one its word starts with
 *   a word to read                     its picture is the answer; and every letter in it has been taught
 *   a word to build                    its tiles are its letters, one for each sound, and the answer is its spelling
 *   a sentence to read                 one picture is what it says; and every letter of every word has been taught
 *
 * A word's first sound, its spelling and its beats come from the lexicon (src/art/lexicon.json), never from the
 * word's letters by guesswork: "ring" starts with r, but "whistle" does not start with a sound that is taught at
 * all, and "ship" has three sounds and not four.
 */

interface Entry {
  word: string;
  /** The letter, or the pair of letters, whose taught sound the word starts with. */
  starts?: string;
  /** The word as it is spelt, one entry for each sound, where it is spelt as it sounds. */
  letters?: string[];
  /** The word in the beats it is clapped in. */
  beats?: string[];
}

const lexicon: Readonly<Record<string, Entry>> = lexiconFile.words;

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/** How a word ends, from its vowel on, where its spelling says: what it shares with a word it rhymes with. */
export function rimeOf(id: string): string | null {
  const letters = lexicon[id]?.letters;
  if (!letters) return null;
  const vowel = letters.findIndex((each) => VOWELS.has(each));
  return vowel < 0 ? null : letters.slice(vowel).join('');
}

/** How one word is like another that it is not: the reason a child might take it for the answer. */
export function nearness(word: string, other: string): string {
  const [a, b] = [lexicon[word]?.letters ?? [], lexicon[other]?.letters ?? []];
  if (a[0] !== undefined && a[0] === b[0]) return 'same-first-sound';
  if (a.at(-1) !== undefined && a.at(-1) === b.at(-1)) return 'same-last-sound';
  return 'other-word';
}

/** The letters a pack teaches: every letter that is shown on its own anywhere in it. */
export function lettersTaught(pack: ContentPack): Set<string> {
  const taught = new Set<string>();
  for (const lesson of pack.lessons) {
    for (const challenge of lesson.challenges) {
      if (challenge.kind !== 'choose-one') continue;
      for (const stimulus of [
        challenge.prompt.stimulus,
        ...challenge.choices.map((c) => c.stimulus),
      ]) {
        if (stimulus.type === 'letter') taught.add(stimulus.letters);
      }
    }
  }
  return taught;
}

function known(stimulus: Stimulus, report: Report): Entry | null {
  if (stimulus.type !== 'picture' && stimulus.type !== 'word') return null;
  return knownWord(stimulus.id, report);
}

function knownWord(id: string, report: Report): Entry | null {
  const entry = lexicon[id];
  if (!entry) report('word-unknown', `"${id}" is not in the lexicon`);
  return entry ?? null;
}

/** Every letter of a word that is given to read or to build has been taught somewhere in the pack. */
function taughtThrough(id: string, letters: readonly string[], pack: ContentPack, report: Report) {
  const taught = lettersTaught(pack);
  const untaught = letters.filter((each) => !taught.has(each));
  if (untaught.length > 0) {
    report(
      'reading-untaught-letter',
      `"${id}" needs ${untaught.join(', ')}, which no lesson here teaches`,
    );
  }
}

/** Each wrong choice is tagged with what is tempting about it, and with nothing else. */
function taggedAs(
  challenge: ChooseOneChallenge,
  tagOf: (stimulus: Stimulus) => string | null,
  report: Report,
): void {
  for (const choice of challenge.choices) {
    if (choice.id === challenge.answer) continue;
    const tag = tagOf(choice.stimulus);
    const written = challenge.misconceptions?.[choice.id];
    if (tag !== null && written !== tag) {
      report(
        'reading-misconception-wrong',
        `choice "${choice.id}" is tagged "${String(written)}" but is "${tag}"`,
      );
    }
  }
}

/** A question asked with one of the pictures only Reading Cove draws. */
function lintScene(
  challenge: ChooseOneChallenge,
  asked: ReadingPicture,
  pack: ContentPack,
  report: Report,
): void {
  const choices = challenge.choices.map((choice) => choice.stimulus);

  if (asked.kind === 'rhyme') {
    if (!choices.every((choice) => choice.type === 'picture')) {
      report('reading-cove-question', 'a word to rhyme with is answered with pictures');
      return;
    }
    for (const choice of choices) known(choice, report);
    const rime = knownWord(asked.word, report) ? rimeOf(asked.word) : null;
    const rimes = choices.map((choice) => rimeOf(choice.id));
    if (rime === null || rimes.includes(null)) {
      report(
        'reading-no-rime',
        'a word here is not spelt as it sounds, so how it ends is not known',
      );
      return;
    }
    if (choices.some((choice) => choice.id === asked.word)) {
      report('reading-same-word', 'a choice is the very word that is asked about');
    }
    oneRight(
      challenge,
      (shown) => shown.type === 'picture' && rimeOf(shown.id) === rime,
      `a word that ends in "${rime}"`,
      report,
    );
    taggedAs(
      challenge,
      (shown) => (shown.type === 'picture' ? nearness(asked.word, shown.id) : null),
      report,
    );
    return;
  }

  if (asked.kind === 'beats') {
    const cards = choices.map((choice) => readReadingPicture(choice));
    if (!cards.every((card) => card?.kind === 'claps')) {
      report('reading-cove-question', 'a word to clap is answered with cards of claps');
      return;
    }
    const beats = knownWord(asked.word, report)?.beats;
    if (!beats) {
      report('reading-no-beats', `the lexicon does not say how "${asked.word}" is clapped`);
      return;
    }
    if (beats.join('') !== lexicon[asked.word]?.word) {
      report('reading-no-beats', `the beats of "${asked.word}" do not make the word`);
    }
    const counts = cards.map((card) => card.count);
    if (new Set(counts).size !== counts.length) {
      report('reading-claps-twice', 'two cards have the same number of claps');
    }
    const countOf = (shown: Stimulus) => {
      const card = readReadingPicture(shown);
      return card?.kind === 'claps' ? card.count : null;
    };
    oneRight(
      challenge,
      (shown) => countOf(shown) === beats.length,
      `${String(beats.length)} claps`,
      report,
    );
    taggedAs(
      challenge,
      (shown) => {
        const count = countOf(shown);
        return count === null ? null : clapsMisconception(beats.length, count);
      },
      report,
    );
    return;
  }

  if (asked.kind === 'sentence') {
    const pictures = choices.map((choice) => readReadingPicture(choice));
    if (!pictures.every((picture) => picture?.kind === 'placed')) {
      report(
        'reading-cove-question',
        'a sentence is answered with pictures of one thing by another',
      );
      return;
    }
    const says = placedBy(asked.words);
    if (!says) {
      report(
        'reading-sentence-shape',
        `"${asked.words.join(' ')}" is not "a … on a …" or "a … in a …"`,
      );
      return;
    }
    // The little words are read too: their letters have to have been taught like any others.
    for (const word of new Set(asked.words)) {
      const letters = lexicon[word]?.letters ?? (word.length <= 2 ? Array.from(word) : null);
      if (!letters) {
        report('reading-not-sounded-out', `"${word}" is not spelt one letter to a sound`);
        continue;
      }
      taughtThrough(word, letters, pack, report);
    }
    for (const each of pictures) {
      knownWord(each.thing, report);
      knownWord(each.base, report);
    }
    const written = pictures.map((each) => sentenceFor(each).join(' '));
    if (new Set(written).size !== written.length) {
      report('reading-picture-twice', 'the same picture is offered twice');
    }
    const sameAs = (stimulus: Stimulus) => {
      const picture = readReadingPicture(stimulus);
      return picture?.kind === 'placed' ? picture : null;
    };
    oneRight(
      challenge,
      (stimulus) => {
        const picture = sameAs(stimulus);
        return picture !== null && sentenceFor(picture).join(' ') === asked.words.join(' ');
      },
      `"${asked.words.join(' ')}"`,
      report,
    );
    taggedAs(
      challenge,
      (stimulus) => {
        const picture = sameAs(stimulus);
        return picture === null ? null : placedMisconception(says, picture);
      },
      report,
    );
    return;
  }

  report('reading-cove-question', 'Reading Cove has no rule for this kind of question');
}

/** A word to build: its picture, and its letters as tiles to put in order. */
function lintBuild(challenge: MakeChallenge, pack: ContentPack, report: Report): void {
  const { task } = challenge;
  if (task.type !== 'order') return;
  const shown = challenge.prompt.stimulus;
  const letters = shown?.type === 'picture' ? known(shown, report)?.letters : undefined;
  if (shown?.type !== 'picture' || !letters) {
    report(
      'reading-build-word',
      'a word to build is shown as the picture of a word spelt as it sounds',
    );
    return;
  }
  taughtThrough(shown.id, letters, pack, report);
  const tiles = task.cards.map((card) =>
    card.stimulus.type === 'letter' && card.stimulus.letters === card.id ? card.id : null,
  );
  const same =
    tiles.length === letters.length &&
    new Set(letters).size === letters.length &&
    letters.every((each) => tiles.includes(each));
  if (!same) {
    report(
      'reading-build-tiles',
      `the tiles for "${shown.id}" must be its letters, ${letters.join(', ')}, each once`,
    );
  }
  if (task.solution.join('-') !== letters.join('-')) {
    report('reading-build-order', `"${shown.id}" is spelt ${letters.join(', ')}`);
  }
}

/** Exactly one choice passes, and it is the one marked. */
function oneRight(
  challenge: ChooseOneChallenge,
  passes: (stimulus: Stimulus) => boolean,
  what: string,
  report: Report,
): void {
  const right = challenge.choices.filter((choice) => passes(choice.stimulus));
  if (right.length !== 1) {
    report('reading-answer-count', `${right.length} choices are ${what}; exactly one must be`);
  } else if (right[0]?.id !== challenge.answer) {
    report(
      'reading-answer-wrong',
      `"${challenge.answer}" is marked correct but "${right[0]?.id}" is ${what}`,
    );
  }
}

function lintChoices(challenge: ChooseOneChallenge, pack: ContentPack, report: Report): void {
  const { stimulus } = challenge.prompt;
  const choices = challenge.choices.map((choice) => choice.stimulus);
  if (stimulus.type === 'scene') {
    const asked = readReadingPicture(stimulus);
    if (
      !asked ||
      choices.some((choice) => choice.type === 'scene' && !readReadingPicture(choice))
    ) {
      report('reading-scene', 'a picture here is not one Reading Cove knows how to draw');
      return;
    }
    lintScene(challenge, asked, pack, report);
    return;
  }
  for (const choice of choices) known(choice, report);
  const pictures = choices.every((choice) => choice.type === 'picture');
  const letters = choices.every((choice) => choice.type === 'letter');
  const startOf = (shown: Stimulus) =>
    shown.type === 'picture' ? (lexicon[shown.id]?.starts ?? null) : null;

  if (stimulus.type === 'sound' && pictures) {
    // "sound.drum" is the sound of the drum; "slow.map" is the word "map", said slowly.
    const [kind, name] = stimulus.clip.split('.');
    if ((kind !== 'sound' && kind !== 'slow') || name === undefined) {
      report('reading-clip', `"${stimulus.clip}" is neither a sound nor a slow word`);
      return;
    }
    if (kind === 'slow' && !lexicon[name]?.letters) {
      report('reading-not-sounded-out', `"${name}" is not a word that can be said sound by sound`);
    }
    oneRight(
      challenge,
      (shown) => shown.type === 'picture' && shown.id === name,
      `"${name}"`,
      report,
    );
    return;
  }

  if (stimulus.type === 'picture' && pictures) {
    const start = known(stimulus, report)?.starts;
    if (!start) {
      report('reading-no-first-sound', `"${stimulus.id}" has no first sound that is taught`);
      return;
    }
    if (choices.some((choice) => choice.id === stimulus.id)) {
      report('reading-same-word', 'a choice is the very word that is asked about');
    }
    for (const choice of choices) {
      if (startOf(choice) === null)
        report('reading-no-first-sound', 'a choice has no first sound that is taught');
    }
    oneRight(
      challenge,
      (shown) => startOf(shown) === start,
      `a word that starts with ${start}`,
      report,
    );
    return;
  }

  if (stimulus.type === 'letter' && pictures) {
    oneRight(
      challenge,
      (shown) => startOf(shown) === stimulus.letters,
      `a word that starts with ${stimulus.letters}`,
      report,
    );
    return;
  }

  if (stimulus.type === 'picture' && letters) {
    const start = known(stimulus, report)?.starts;
    if (!start) {
      report('reading-no-first-sound', `"${stimulus.id}" has no first sound that is taught`);
      return;
    }
    oneRight(
      challenge,
      (shown) => shown.type === 'letter' && shown.letters === start,
      `the letter ${start}`,
      report,
    );
    const shown = choices.map((choice) => choice.letters);
    if (new Set(shown).size !== shown.length)
      report('reading-letter-twice', 'a letter is offered twice');
    return;
  }

  if (stimulus.type === 'word' && pictures) {
    const spelt = known(stimulus, report)?.letters;
    if (!spelt) {
      report('reading-not-sounded-out', `"${stimulus.id}" is not spelt one letter to a sound`);
      return;
    }
    taughtThrough(stimulus.id, spelt, pack, report);
    oneRight(
      challenge,
      (shown) => shown.type === 'picture' && shown.id === stimulus.id,
      `"${stimulus.id}"`,
      report,
    );
    return;
  }

  report('reading-cove-question', 'Reading Cove has no rule for this kind of question');
}

export const readingCoveRules: WorldRules = (challenge, lesson, report, pack) => {
  // Everything here is heard: an activity that could be opened with the sound off would be a guessing game.
  if (lesson.needsSound !== true)
    report('reading-needs-sound', 'the lesson does not say that it needs sound');
  if (challenge.kind === 'choose-one') {
    lintChoices(challenge, pack, report);
    return;
  }
  const { task } = challenge;
  if (task.type === 'order') {
    lintBuild(challenge, pack, report);
    return;
  }
  if (task.type !== 'echo') {
    report('reading-cove-task', `Reading Cove has no rule for a "${task.type}" task`);
    return;
  }
  for (const card of task.cards) {
    known(card.stimulus, report);
    if (card.stimulus.type !== 'picture' || card.stimulus.id !== card.id) {
      report(
        'reading-echo-card',
        `card "${card.id}" is not the picture of the thing that makes its sound`,
      );
    }
  }
};
