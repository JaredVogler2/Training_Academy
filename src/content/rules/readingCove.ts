import lexiconFile from '@/art/lexicon.json';
import type { ChooseOneChallenge, ContentPack, Stimulus } from '@/engine';
import type { Report, WorldRules } from './types';

/**
 * Reading Cove's answers are about sounds and letters, so its rules look words up.
 *
 *   a sound, and what made it          the picture that is right is the thing the sound is of
 *   a slow word, and its picture       likewise: the picture of that word, and no other
 *   a word, and one that starts so     exactly one choice starts with the same sound, and it is not the same word
 *   a letter, and a word it starts     exactly one choice starts with that letter's sound
 *   a picture, and its first letter    exactly one letter is the one its word starts with
 *   a word to read                     its picture is the answer; and every letter in it has been taught
 *
 * A word's first sound and its spelling come from the lexicon (src/art/lexicon.json), never from the word's
 * letters by guesswork: "ring" starts with r, but "whistle" does not start with a sound that is taught at all.
 */

interface Entry {
  word: string;
  /** The letter whose taught sound the word starts with. */
  starts?: string;
  /** The word, letter by letter, where each letter is one sound. */
  letters?: string[];
}

const lexicon: Readonly<Record<string, Entry>> = lexiconFile.words;

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
  const entry = lexicon[stimulus.id];
  if (!entry) report('word-unknown', `"${stimulus.id}" is not in the lexicon`);
  return entry ?? null;
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
    const taught = lettersTaught(pack);
    const untaught = spelt.filter((each) => !taught.has(each));
    if (untaught.length > 0) {
      report(
        'reading-untaught-letter',
        `"${stimulus.id}" needs ${untaught.join(', ')}, which no lesson here teaches`,
      );
    }
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
