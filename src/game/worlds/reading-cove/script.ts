import lexiconFile from '@/art/lexicon.json';
import type { MakeChallenge, Stimulus } from '@/engine';
import {
  PAUSE,
  REST,
  SAME,
  Writer,
  makingScript,
  type ChooseSituation,
  type MakeSituation,
  type Script,
} from '@/game/lesson/script';
import { voice } from './voice';

/**
 * How Reading Cove shows a question off: by saying it. A picture is lifted while its word is said; a sound is
 * played while the shell it comes from is lifted; a word in letters has a finger run under it while it is said
 * slowly. The scripts differ in what is said to whom:
 *
 *   in a demonstration and with support   words are said with their first sound drawn out ("sssun"), a letter is
 *                                         given the word that starts with its sound, a word to read is read slowly
 *   on their own                          the choices are named plainly, a letter is shown without its word, and a
 *                                         word to read is not read at all: that is the thing being asked
 */

interface Entry {
  word: string;
  starts?: string;
  letters?: string[];
}
const lexicon: Readonly<Record<string, Entry>> = lexiconFile.words;

const has = (key: string) => Object.hasOwn(voice.urls, key);
/** A word said plainly. */
const plain = (id: string) => `word.${id}`;
/** A word with its first sound drawn out, where there is such a clip; otherwise the word said plainly. */
const drawnOut = (id: string) => (has(`onset.${id}`) ? `onset.${id}` : plain(id));

/** The word that stands for a letter: the first one that starts with its sound and is not on the table already. */
export function keywordFor(letter: string, onTheTable: readonly string[] = []): string | null {
  const words = Object.keys(lexicon).filter((id) => lexicon[id]?.starts === letter);
  return words.find((id) => !onTheTable.includes(id)) ?? words[0] ?? null;
}

/** The clip a picture makes when it is tapped or lit, where it is a thing that makes a sound of its own. */
export function soundOf(stimulus: Stimulus): string | null {
  return stimulus.type === 'picture' && has(`sound.${stimulus.id}`) ? `sound.${stimulus.id}` : null;
}

type Shown = { id: string; stimulus: Stimulus };
const pictureOf = (shown: Shown | null) =>
  shown?.stimulus.type === 'picture' ? shown.stimulus.id : null;

/** What a thing on the table sounds like in this question: an instrument's sound, a word, a letter's own word. */
function voiceOf(
  shown: Shown | null,
  how: 'sound' | 'plain' | 'drawn-out',
  onTheTable: readonly string[],
): string | undefined {
  if (!shown) return undefined;
  const { stimulus } = shown;
  if (stimulus.type === 'picture') {
    if (how === 'sound') return soundOf(stimulus) ?? undefined;
    return how === 'plain' ? plain(stimulus.id) : drawnOut(stimulus.id);
  }
  if (stimulus.type === 'letter') {
    const keyword = keywordFor(stimulus.letters, onTheTable);
    return keyword === null ? undefined : drawnOut(keyword);
  }
  return undefined;
}

export function chooseScript(situation: ChooseSituation): Script {
  const { stage, event, prompt, choices, answer, tried, lines, seconds } = situation;
  const script = new Writer(seconds);
  const supported = stage !== 'independent';
  const onTheTable = [
    ...choices.map((choice) => pictureOf(choice)),
    prompt.type === 'picture' ? prompt.id : null,
  ].filter((id): id is string => id !== null);

  // What kind of question this is decides what its pictures say.
  const sounds = prompt.type === 'sound' && prompt.clip.startsWith('sound.');
  const slowWord = prompt.type === 'sound' && prompt.clip.startsWith('slow.');
  const print = prompt.type === 'word';
  const blending = slowWord || print;
  const how = sounds ? 'sound' : 'drawn-out';

  /** The clip that goes with what is asked about, when it is to be heard. */
  const promptClip = (support: boolean): string | undefined => {
    if (prompt.type === 'sound') return prompt.clip;
    if (prompt.type === 'picture') return drawnOut(prompt.id);
    if (prompt.type === 'word') return support ? `slow.${prompt.id}` : undefined;
    // A letter is given its word only where there is support: knowing its sound without is the skill.
    if (prompt.type === 'letter' && support) {
      const keyword = keywordFor(prompt.letters, onTheTable);
      return keyword === null ? undefined : drawnOut(keyword);
    }
    return undefined;
  };
  const sayPrompt = (support: boolean) =>
    script.name('prompt', promptClip(support)).wait(PAUSE / 2);
  const say = (shown: Shown | null, manner: 'sound' | 'plain' | 'drawn-out') => {
    if (shown) script.name(shown.id, voiceOf(shown, manner, onTheTable)).wait(PAUSE / 2);
  };
  /** Each choice in turn. On their own, pictures are named plainly and letters are not sounded at all. */
  const sayChoices = (support: boolean) => {
    for (const choice of choices) {
      if (choice.stimulus.type === 'letter' && !support) script.name(choice.id).wait(PAUSE / 2);
      else if (blending && !support) script.name(choice.id).wait(PAUSE / 2);
      else say(choice, sounds ? 'sound' : support && !blending ? 'drawn-out' : 'plain');
    }
  };

  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction);
        sayPrompt(true);
        say(answer, blending ? 'plain' : how);
        return script.cue('same').end(SAME);
      }
      script.wait(250).say(lines.instruction);
      sayPrompt(supported);
      // A sound to match is matched by ear alone unless there is support; so is a slow word.
      if (situation.again && !supported) return script.end(REST);
      if (sounds ? supported : true) sayChoices(supported);
      return script.end(REST);

    case 'correct':
      script.wait(600);
      sayPrompt(true);
      say(answer, blending ? 'plain' : how);
      script.cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      script.wait(600);
      if (lines.feedback) script.say(lines.feedback);
      // What was picked is heard, and then what was asked about: the two do not go together.
      say(tried, blending ? 'plain' : how);
      if (!print) sayPrompt(true);
      return script.end(REST);

    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      sayPrompt(true);
      if (!blending || !print) sayChoices(true);
      return script.end(REST);

    case 'hint-reveal':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      say(answer, blending ? 'plain' : how);
      return script.end(REST);

    case 'hint-eliminate':
    case 'hint-step':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.end(REST);
  }
}

/**
 * A pattern of sounds to play back: each thing is lit as its own sound is played, to everyone, since that is the
 * question. Asking to be told again says the words again and no more: hearing the pattern again is help.
 */
export function makeScript(situation: MakeSituation, challenge: MakeChallenge): Script | null {
  const { task } = challenge;
  if (task.type !== 'echo') return null;
  const { stage, event, again, sequence, lines, seconds } = situation;
  const script = new Writer(seconds);
  const clipOf = (id: string) => {
    const card = task.cards.find((each) => each.id === id);
    return card ? (soundOf(card.stimulus) ?? undefined) : undefined;
  };
  const play = () => {
    for (const id of sequence)
      script
        .name(id, clipOf(id))
        .beat(REST)
        .wait(PAUSE / 2);
    return script;
  };
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction);
        play().wait(PAUSE).beat({ show: 'do', parts: 0 });
        sequence.forEach((id, index) => {
          script.beat({ show: 'do', parts: index + 1 });
          const clip = clipOf(id);
          if (clip) script.say(clip);
          script.wait(PAUSE);
        });
        return script.wait(PAUSE).cue('same').end(SAME);
      }
      script.wait(250).say(lines.instruction);
      return again ? script.end(REST) : play().end(REST);
    case 'incorrect':
      script.wait(600);
      if (lines.feedback) script.say(lines.feedback);
      return play().end(REST);
    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return play().end(REST);
    case 'correct':
    case 'hint-eliminate':
    case 'hint-step':
    case 'hint-reveal':
      return makingScript(situation);
  }
}
