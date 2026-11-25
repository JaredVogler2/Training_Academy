import { TICK_HZ } from '@/audio';
import {
  readReadingPicture,
  sentenceClip,
  type Challenge,
  type MakeChallenge,
  type Stimulus,
} from '@/engine';
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
import { CLAP_GAP, marksOf } from './clips';
import { voice } from './voice';
import { beatsIn, lettersOf, lexicon } from './words';

/**
 * How Reading Cove shows a question off: by saying it. A picture is lifted while its word is said; a sound is
 * played while the shell it comes from is lifted; a word in letters has a finger run under it while it is said
 * slowly. The scripts differ in what is said to whom:
 *
 *   in a demonstration and with support   words are said with their first sound drawn out ("sssun"), a letter is
 *                                         given the word that starts with its sound, a word to read is read slowly
 *   on their own                          the choices are named plainly, a letter is shown without its word, and a
 *                                         word to read is not read at all: that is the thing being asked
 *
 * The activities that came later go the same way. With support a word to rhyme with is said beside each choice, a
 * word to clap is clapped, a word to build is said slowly with a place lit for each sound, and a sentence is read
 * aloud with a finger under each word. On their own the word is said once and plainly, and a sentence not at all.
 */

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

/** How long the last thing of a clip that is followed stays shown, however soon the clip ends. */
const LAST = 420;

/**
 * Say a clip in which several things come one after another — the sounds of a slow word, the beats of a clapped
 * one, the words of a sentence — and show each of them as it comes. `show` is called with the clock at the moment
 * each begins.
 */
function follow(script: Writer, key: string, parts: number, show: (index: number) => void): void {
  const spoken = script.spoken(key);
  const begin = script.now;
  const marks = marksOf(key, parts, spoken);
  script.start(key);
  for (const [index, at] of marks.entries()) {
    script.wait(Math.max(0, begin + at - script.now));
    show(index);
  }
  const end = begin + Math.max(spoken, (marks.at(-1) ?? 0) + LAST) + PAUSE;
  script.wait(Math.max(0, end - script.now));
}

/** What is asked about is shown part by part: the tile of a word, the word of a sentence, the place of a sound. */
const partOfPrompt = (script: Writer) => (index: number) =>
  script.beat({ show: 'name', which: 'prompt', part: index });

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
  const asked = readReadingPicture(prompt);
  if (asked?.kind === 'rhyme') return rhymeScript(situation, asked.word);
  if (asked?.kind === 'beats') return beatsScript(situation, asked.word);
  if (asked?.kind === 'sentence') return sentenceScript(situation, asked.words);
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
  const sayPrompt = (support: boolean) => {
    // A word in print that is read out is read slowly, a finger under each tile as its sound comes.
    if (prompt.type === 'word' && support && has(`slow.${prompt.id}`)) {
      follow(script, `slow.${prompt.id}`, lettersOf(prompt.id).length, partOfPrompt(script));
      return script.wait(PAUSE / 2);
    }
    return script.name('prompt', promptClip(support)).wait(PAUSE / 2);
  };
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

/** What every one of the later questions does with a hint that only has something to say. */
function onlySaid(script: Writer, hint: string | null): Script {
  script.wait(200);
  if (hint) script.say(hint);
  return script.end(REST);
}

/**
 * Which one rhymes? The word, and the choices, said plainly: rhyme is heard in whole words. With support the word
 * is said again before each choice, so that the two are heard side by side and nothing has to be held in mind; on
 * their own it is said once, and then each choice once.
 */
function rhymeScript(situation: ChooseSituation, word: string): Script {
  const { stage, event, again, choices, answer, tried, lines, seconds } = situation;
  const script = new Writer(seconds);
  const supported = stage !== 'independent';
  const sayWord = () => script.name('prompt', plain(word)).wait(PAUSE / 2);
  const sayChoice = (shown: Shown | null) => {
    const id = pictureOf(shown);
    if (shown && id !== null) script.name(shown.id, plain(id)).wait(PAUSE / 2);
  };
  const sideBySide = () => {
    for (const choice of choices) {
      sayWord();
      sayChoice(choice);
      script.beat(REST).wait(PAUSE);
    }
  };
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction);
        sayWord();
        sayChoice(answer);
        script.cue('same').beat(SAME);
        // What a rhyme is, in so many words: this is the one place it is said before anything is asked.
        if (lines.correct) script.say(lines.correct);
        return script.end(SAME);
      }
      script.wait(250).say(lines.instruction);
      if (supported) {
        sideBySide();
        return script.end(REST);
      }
      sayWord();
      if (!again) for (const choice of choices) sayChoice(choice);
      return script.end(REST);

    case 'correct':
      script.wait(600);
      sayWord();
      sayChoice(answer);
      script.cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      script.wait(600);
      if (lines.feedback) script.say(lines.feedback);
      // What was picked, and then the word: the two do not end the same.
      sayChoice(tried);
      sayWord();
      return script.end(REST);

    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      sideBySide();
      return script.end(REST);

    case 'hint-reveal':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      sayWord();
      sayChoice(answer);
      return script.end(REST);

    case 'hint-eliminate':
    case 'hint-step':
      return onlySaid(script, lines.hint);
  }
}

/**
 * Clap the word. Clapped for a child, a word is said in its beats, and each beat gets a clap and leaves a mark
 * under the picture; a card that is played claps as many times as it has claps on it. On their own the word is
 * only said: the clapping is theirs to do.
 */
function beatsScript(situation: ChooseSituation, word: string): Script {
  const { stage, event, again, answer, tried, lines, seconds } = situation;
  const script = new Writer(seconds);
  const beats = Math.max(1, beatsIn(word));
  // A word of one beat is clapped once, as it is said: there is nothing to say it in.
  const inBeats = beats > 1 && has(`beats.${word}`) ? `beats.${word}` : plain(word);
  const sayWord = () => script.name('prompt', plain(word)).wait(PAUSE / 2);
  const clapOut = () => {
    follow(script, inBeats, inBeats === plain(word) ? 1 : beats, (index) => {
      script.beat({ show: 'name', which: 'prompt', part: index }).tone('tick', TICK_HZ);
    });
    script.beat(REST).wait(PAUSE / 2);
  };
  const playCard = (shown: Shown | null) => {
    const card = shown ? readReadingPicture(shown.stimulus) : null;
    if (!shown || card?.kind !== 'claps') return;
    script.beat({ show: 'name', which: shown.id });
    for (let clap = 0; clap < card.count; clap++) script.tone('tick', TICK_HZ).wait(CLAP_GAP);
    script
      .wait(PAUSE)
      .beat(REST)
      .wait(PAUSE / 2);
  };
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction);
        sayWord();
        clapOut();
        playCard(answer);
        return script.cue('same').end(SAME);
      }
      script.wait(250).say(lines.instruction);
      sayWord();
      if (stage !== 'independent' && !again) clapOut();
      return script.end(REST);

    case 'correct':
      script.wait(600);
      clapOut();
      script.cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      script.wait(600);
      if (lines.feedback) script.say(lines.feedback);
      // The card that was picked is played, and then the word is clapped: they are not the same number.
      playCard(tried);
      clapOut();
      return script.end(REST);

    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      clapOut();
      return script.end(REST);

    case 'hint-reveal':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      playCard(answer);
      return script.end(REST);

    case 'hint-eliminate':
    case 'hint-step':
      return onlySaid(script, lines.hint);
  }
}

/**
 * Read the sentence. Read aloud, it is read a little slowly with a finger under the word that is being said. It
 * is read aloud in a demonstration, with support, as a hint, and once it has been answered; on their own it is
 * not read at all, and a wrong answer is not followed by the reading either: that is asked for as help.
 */
function sentenceScript(situation: ChooseSituation, words: readonly string[]): Script {
  const { stage, event, answer, lines, seconds } = situation;
  const script = new Writer(seconds);
  const clip = sentenceClip(words);
  const readAloud = () => {
    if (clip === null || !has(clip)) return;
    follow(script, clip, words.length, partOfPrompt(script));
    script.beat(REST).wait(PAUSE / 2);
  };
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction);
        readAloud();
        if (answer) script.name(answer.id).wait(PAUSE / 2);
        return script.cue('same').end(SAME);
      }
      script.wait(250).say(lines.instruction);
      if (stage !== 'independent') readAloud();
      return script.end(REST);

    case 'correct':
      script.wait(600);
      readAloud();
      script.cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      script.wait(600);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(REST);

    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      readAloud();
      return script.end(REST);

    case 'hint-reveal':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      if (answer) script.name(answer.id);
      return script.end(REST);

    case 'hint-eliminate':
    case 'hint-step':
      return onlySaid(script, lines.hint);
  }
}

/**
 * Build the word. The word is said, and with support said again slowly, a place lighting for each of its sounds
 * as the sound comes: three sounds, three places. In the demonstration it is then said slowly once more, and each
 * letter goes to its place as its sound is said. A wrong try is followed by the slow word; a right one by the
 * slow word with the letters in their places, and then the word as it is spoken.
 */
function buildScript(situation: MakeSituation, challenge: MakeChallenge): Script | null {
  const { task, prompt } = challenge;
  if (task.type !== 'order' || prompt.stimulus?.type !== 'picture') return null;
  const word = prompt.stimulus.id;
  const sounds = task.solution.length;
  const { stage, event, again, lines, seconds } = situation;
  const script = new Writer(seconds);
  const sayWord = () => script.name('prompt', plain(word)).wait(PAUSE / 2);
  const slowly = (show: (index: number) => void = partOfPrompt(script)) =>
    follow(script, `slow.${word}`, sounds, show);
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction);
        sayWord();
        slowly();
        script.beat({ show: 'do', parts: 0 }).wait(PAUSE);
        slowly((index) => script.beat({ show: 'do', parts: index + 1 }).note(index));
        script.cue('same').beat(SAME).say(plain(word));
        return script.end(SAME);
      }
      script.wait(250).say(lines.instruction);
      sayWord();
      if (stage !== 'independent' && !again) slowly();
      return script.end(REST);

    case 'correct':
      script.wait(500);
      slowly();
      script.cue('same').beat(SAME).say(plain(word));
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      script.wait(600);
      if (lines.feedback) script.say(lines.feedback);
      slowly();
      return script.end(REST);

    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      slowly();
      return script.end(REST);

    case 'hint-eliminate':
    case 'hint-step':
    case 'hint-reveal':
      return makingScript(situation);
  }
}

/**
 * What a challenge may say beside its own lines: the words of its pictures, plainly, drawn out and slowly, its
 * sounds, its sentence. They are fetched before they are wanted, so that a clip something is shown in time with
 * starts when the showing does.
 */
export function linesFor(challenge: Challenge): string[] {
  const keys = new Set<string>();
  const add = (...wanted: string[]) => {
    for (const key of wanted) if (has(key)) keys.add(key);
  };
  const word = (id: string) =>
    add(plain(id), `onset.${id}`, `slow.${id}`, `beats.${id}`, `sound.${id}`);
  // The pictures on the table: a letter is given a word that is not one of them, as its script gives it.
  const shown = [
    challenge.prompt.stimulus,
    ...(challenge.kind === 'choose-one' ? challenge.choices.map((choice) => choice.stimulus) : []),
  ];
  const onTheTable = shown.flatMap((each) => (each?.type === 'picture' ? [each.id] : []));
  const of = (stimulus: Stimulus | undefined): void => {
    if (!stimulus) return;
    if (stimulus.type === 'picture' || stimulus.type === 'word') word(stimulus.id);
    if (stimulus.type === 'sound') add(stimulus.clip);
    if (stimulus.type === 'letter') {
      const keyword = keywordFor(stimulus.letters, onTheTable);
      if (keyword !== null) word(keyword);
    }
    const scene = readReadingPicture(stimulus);
    if (scene?.kind === 'rhyme' || scene?.kind === 'beats') word(scene.word);
    if (scene?.kind === 'sentence') add(sentenceClip(scene.words) ?? '');
  };
  of(challenge.prompt.stimulus);
  if (challenge.kind === 'choose-one') for (const choice of challenge.choices) of(choice.stimulus);
  else if (challenge.task.type === 'echo' || challenge.task.type === 'order') {
    for (const card of challenge.task.cards) of(card.stimulus);
  }
  return [...keys];
}

/**
 * A thing to make. A word to build has a script of its own. A pattern of sounds to play back: each thing is lit
 * as its own sound is played, to everyone, since that is the question. Asking to be told again says the words
 * again and no more: hearing the pattern again is help.
 */
export function makeScript(situation: MakeSituation, challenge: MakeChallenge): Script | null {
  const { task } = challenge;
  if (task.type === 'order') return buildScript(situation, challenge);
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
