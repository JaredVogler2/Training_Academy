import {
  amountOf as amountOfPicture,
  amountShown,
  countableIn,
  numberClip,
  readNumberPicture,
  type NumberPicture,
  type Stimulus,
} from '@/engine';
import {
  NAME_TIME,
  PAUSE,
  REST,
  SAME,
  Writer,
  type ChooseSituation,
  type MakeSituation,
  type Script,
} from '@/game/lesson/script';

/**
 * How Number Garden shows a question about amounts: by counting. The group is counted thing by thing with a
 * climbing note for each, then the group that goes with it — the same number of notes — and the two are lit
 * together. A choice that does not match is counted against the group too: a different number of notes.
 */

/**
 * The counting animation, as the stylesheet draws it (numberGarden.module.css): the first thing hops after
 * `HOP_FIRST`, each next one `HOP_EVERY` later, and a hop lasts `HOP_LENGTH`. The note for a thing sounds as it
 * reaches the top of its hop.
 */
export const HOP_FIRST = 150;
export const HOP_EVERY = 420;
export const HOP_LENGTH = 550;
const HOP_TOP = 160;

/** How long a group stays uncovered when it is to be taken in at a glance. */
export const GLANCE_TIME = 1700;

/** How long it takes to count `things` things, from the first hop starting to the last one landing. */
export function countingTime(things: number): number {
  return things <= 0 ? 0 : HOP_FIRST + (things - 1) * HOP_EVERY + HOP_LENGTH;
}

function amountOf(stimulus: Stimulus | undefined): number {
  return amountShown(stimulus) ?? 0;
}

/** Count a group aloud, and move the clock to where its last thing has landed. */
function count(script: Writer, group: string, things: number): Writer {
  script.beat({ show: 'count', group });
  for (let index = 0; index < things; index++) {
    script.note(index, HOP_FIRST + index * HOP_EVERY + HOP_TOP);
  }
  return script.wait(countingTime(things));
}

/**
 * A group to match.
 *
 *   demonstration   count the group, count its match, light them together: "the same amount"
 *   guided step     put the question, then count the group with the child ("we do")
 *   on your own     put the question, and wait ("you do")
 *   right           count the group, count the answer: the same number of notes, then both lit
 *   not right       count the group, then the choice that was tried: a different number of notes
 *   help            what the hint is: the counting, or the answer counted
 *
 * Where the group is only glanced at, it is uncovered for a moment instead of being counted, and counted only
 * once an answer has been given: seeing how many without counting is the whole of that game.
 */
function matchScript(situation: ChooseSituation): Script {
  const { stage, event, glance, revealed, lines, seconds } = situation;
  const amount = amountOf(situation.prompt);
  const triedAmount = situation.tried ? amountOf(situation.tried.stimulus) : null;
  const script = new Writer(seconds);
  const look = () => script.beat({ show: 'glance' }).wait(GLANCE_TIME).beat(REST);

  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(500).say('lesson.watch').say(lines.instruction);
        if (glance) look().wait(PAUSE * 2);
        count(script, 'prompt', amount).wait(PAUSE);
        return count(script, 'answer', amount)
          .wait(PAUSE / 2)
          .cue('same')
          .end(SAME);
      }
      script.wait(250).say(lines.instruction);
      // Asking to be shown again is free, and so it does not uncover the group: another look is help.
      if (glance && !situation.again) return look().end(REST);
      script.ask();
      if (glance) return script.end(REST);
      if (stage === 'guided') count(script.wait(PAUSE / 2), 'prompt', amount);
      return script.end(REST);

    case 'correct':
      // The "yes" notes come first (the screen plays them as the answer lands); the counting follows them.
      count(script.wait(650), 'prompt', amount).wait(PAUSE);
      count(script, 'answer', amount)
        .wait(PAUSE / 2)
        .cue('same')
        .beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      script.wait(700);
      if (lines.feedback) script.say(lines.feedback);
      count(script, 'prompt', amount);
      if (triedAmount !== null) count(script.wait(PAUSE), 'tried', triedAmount);
      if (revealed) count(script.wait(PAUSE), 'answer', amount);
      return script.end(REST);

    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      if (glance) return look().end(REST);
      return count(script, 'prompt', amount).end(REST);

    case 'hint-reveal':
      script.wait(300);
      if (lines.hint) script.say(lines.hint);
      return count(script, 'answer', amount).end(REST);

    case 'hint-eliminate':
    case 'hint-step':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.ask().end(REST);
  }
}

/**
 * "Which has more?" (or fewer). There is no group to match: each group on the table is counted in turn, so that
 * more is heard as well as seen — more notes, climbing higher — and then the one that was asked for is lit.
 */
function compareScript(situation: ChooseSituation): Script {
  const { stage, event, choices, answer, tried, lines, seconds } = situation;
  const script = new Writer(seconds);
  const countAll = () => {
    for (const choice of choices) {
      count(script, choice.id, amountOf(choice.stimulus)).wait(PAUSE);
    }
  };

  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(500).say('lesson.watch').say(lines.instruction);
        countAll();
        if (answer) script.name(answer.id);
        return script.cue('same').end(SAME);
      }
      script.wait(250).say(lines.instruction).ask();
      if (stage === 'guided') {
        script.wait(PAUSE / 2);
        countAll();
      }
      return script.end(REST);

    case 'correct':
      script.wait(650);
      if (answer) count(script, 'answer', amountOf(answer.stimulus)).wait(PAUSE / 2);
      script.cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      script.wait(700);
      if (lines.feedback) script.say(lines.feedback);
      if (tried) count(script, 'tried', amountOf(tried.stimulus)).wait(PAUSE);
      for (const choice of choices) {
        count(script, choice.id, amountOf(choice.stimulus)).wait(PAUSE);
      }
      return script.end(REST);

    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      countAll();
      return script.end(REST);

    case 'hint-reveal':
      script.wait(300);
      if (lines.hint) script.say(lines.hint);
      if (answer) count(script, 'answer', amountOf(answer.stimulus));
      return script.end(REST);

    case 'hint-eliminate':
    case 'hint-step':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.ask().end(REST);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Numerals, frames and stories: an amount, and what stands for it
// ---------------------------------------------------------------------------------------------------------------------

const read = (stimulus: Stimulus | undefined): NumberPicture | null =>
  stimulus ? readNumberPicture(stimulus) : null;

/** How long a story shows how things stood before anyone moves, and the least time the moving is given. */
export const STORY_BEFORE = 900;
export const STORY_MOVING = 1300;

/**
 * Count a picture — the things in it hop, a note for each; a numeral shows its amount as dots, and they hop — and
 * then say how many that was. The last number counted is the amount: that is what the word is for. Nothing at all
 * is counted in no time, and is called zero.
 */
function countAndSay(script: Writer, group: string, picture: NumberPicture | null): Writer {
  if (!picture) return script;
  count(script, group, countableIn(picture));
  return script.say(numberClip(amountOfPicture(picture)));
}

/**
 * A question whose answer is an amount: which numeral shows how many, which group has this many, how many more
 * fill the frame, how many there are once some have come or gone.
 *
 *   demonstration   what is asked about is counted and the amount said; the answer is counted, the same number
 *                   of notes; the two are lit together
 *   guided step     the question, and then what is asked about is counted with the child and the amount said
 *   on your own     the question, and wait
 *   right           what was asked about counted and said, the answer counted: the same
 *   not right       what was asked about counted and said; then the choice that was tried, counted and said: a
 *                   different number of notes, and a different word
 *
 * A story is told as its question is put. From the first moment it is shown as it stood before anyone moved —
 * those who will come are not there, those who will go are still with the others — and they move as the words
 * are said: "Here come some more." Asked for again, it is told again, since the telling is the question.
 */
function numberScript(situation: ChooseSituation): Script {
  const { stage, event, answer, tried, revealed, lines, seconds } = situation;
  const script = new Writer(seconds);
  const asked = read(situation.prompt);
  const story = asked?.kind === 'story';
  const shown = read(answer?.stimulus);
  const countAnswer = () => count(script, 'answer', shown ? countableIn(shown) : 0);
  /** Put the question; where it is a story, the story happens as it is put. */
  const put = () => {
    if (!story) return script.say(lines.instruction);
    script.wait(STORY_BEFORE).beat({ show: 'name', which: 'prompt', part: 1 });
    const from = script.now;
    script.say(lines.instruction);
    // Where the words are not heard, the moving still takes its time.
    if (script.now - from < STORY_MOVING) script.wait(STORY_MOVING - (script.now - from));
    return script.beat(REST);
  };

  switch (event) {
    case 'new':
      if (story) script.beat({ show: 'name', which: 'prompt', part: 0 });
      if (stage === 'demo') {
        script.wait(500).say('lesson.watch');
        put();
        countAndSay(script, 'prompt', asked).wait(PAUSE);
        return countAnswer()
          .wait(PAUSE / 2)
          .cue('same')
          .end(SAME);
      }
      script.wait(250);
      put().ask();
      if (stage === 'guided') countAndSay(script.wait(PAUSE / 2), 'prompt', asked);
      return script.end(REST);

    case 'correct':
      countAndSay(script.wait(650), 'prompt', asked).wait(PAUSE);
      countAnswer()
        .wait(PAUSE / 2)
        .cue('same')
        .beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      script.wait(700);
      if (lines.feedback) script.say(lines.feedback);
      countAndSay(script, 'prompt', asked);
      if (tried) countAndSay(script.wait(PAUSE), 'tried', read(tried.stimulus));
      if (revealed) countAnswer();
      return script.end(REST);

    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return countAndSay(script, 'prompt', asked).end(REST);

    case 'hint-reveal':
      script.wait(300);
      if (lines.hint) script.say(lines.hint);
      return countAnswer().end(REST);

    case 'hint-eliminate':
    case 'hint-step':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.ask().end(REST);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// One more each time: a staircase with a step missing, and a path of numbered stones with one bare
// ---------------------------------------------------------------------------------------------------------------------

/** How long one step of a staircase is lifted while its note plays. */
export const STEP_TIME = 460;

type Shown = { id: string; stimulus: Stimulus };

/**
 * A staircase is sung: each tower is lifted in turn and plays the note of its height, so that the stairs are a
 * scale climbing (or coming down) a note at a time. The missing step is a silence in it. A choice is tried by
 * singing the stairs with that choice where the gap is: the right one completes the scale, and a wrong one is a
 * note out of place — heard, as well as seen.
 */
function stairsScript(
  situation: ChooseSituation,
  stairs: Extract<NumberPicture, { kind: 'stairs' }>,
): Script {
  const { stage, event, answer, tried, revealed, lines, seconds } = situation;
  const script = new Writer(seconds);
  const sing = (inGap: Shown | null) => {
    stairs.heights.forEach((height, index) => {
      if (index !== stairs.gap) {
        script
          .beat({ show: 'name', which: 'prompt', part: index })
          .note(height - 1)
          .wait(STEP_TIME);
        return;
      }
      const tower = read(inGap?.stimulus);
      if (inGap && tower) {
        script
          .beat({ show: 'name', which: inGap.id })
          .note(amountOfPicture(tower) - 1)
          .wait(STEP_TIME);
      } else script.beat({ show: 'name', which: 'prompt', part: index }).wait(STEP_TIME);
    });
    return script.beat(REST);
  };

  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(500).say('lesson.watch').say(lines.instruction);
        sing(null).wait(PAUSE * 2);
        return sing(answer).wait(PAUSE).cue('same').end(SAME);
      }
      script.wait(250).say(lines.instruction).ask();
      if (stage === 'guided') sing(null);
      return script.end(REST);

    case 'correct':
      script.wait(650);
      sing(answer)
        .wait(PAUSE / 2)
        .cue('same')
        .beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      script.wait(700);
      if (lines.feedback) script.say(lines.feedback);
      sing(tried);
      if (revealed) {
        script.wait(PAUSE);
        sing(answer);
      }
      return script.end(REST);

    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return sing(null).end(REST);

    case 'hint-reveal':
      script.wait(300);
      if (lines.hint) script.say(lines.hint);
      return sing(answer).end(REST);

    case 'hint-eliminate':
    case 'hint-step':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.ask().end(REST);
  }
}

/**
 * A path of stones is walked: each stone is lifted in turn and its number said. The bare stone is a pause. A
 * choice is tried by walking the path with that numeral where the bare stone is: "three, four, five, six" — or
 * "three, four, seven, six", which is heard to be out of order.
 */
function pathScript(
  situation: ChooseSituation,
  path: Extract<NumberPicture, { kind: 'path' }>,
): Script {
  const { stage, event, answer, tried, revealed, lines, seconds } = situation;
  const script = new Writer(seconds);
  const step = (beat: { show: 'name'; which: string; part?: number }, clip: string | null) => {
    script.beat(beat);
    const spoken = clip === null ? 0 : script.spoken(clip);
    if (clip !== null) script.say(clip);
    // Where the word is not heard, the stone is still lifted for its moment.
    if (spoken === 0) script.wait(NAME_TIME);
  };
  const walk = (onBare: Shown | null) => {
    path.numbers.forEach((number, index) => {
      if (index !== path.gap) {
        step({ show: 'name', which: 'prompt', part: index }, numberClip(number));
        return;
      }
      const numeral = read(onBare?.stimulus);
      if (onBare && numeral) {
        step({ show: 'name', which: onBare.id }, numberClip(amountOfPicture(numeral)));
      } else step({ show: 'name', which: 'prompt', part: index }, null);
    });
    return script.beat(REST);
  };

  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(500).say('lesson.watch').say(lines.instruction);
        walk(null).wait(PAUSE * 2);
        return walk(answer).wait(PAUSE).cue('same').end(SAME);
      }
      script.wait(250).say(lines.instruction).ask();
      if (stage === 'guided') walk(null);
      return script.end(REST);

    case 'correct':
      script.wait(650);
      walk(answer)
        .wait(PAUSE / 2)
        .cue('same')
        .beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      script.wait(700);
      if (lines.feedback) script.say(lines.feedback);
      walk(tried);
      if (revealed) {
        script.wait(PAUSE);
        walk(answer);
      }
      return script.end(REST);

    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return walk(null).end(REST);

    case 'hint-reveal':
      script.wait(300);
      if (lines.hint) script.say(lines.hint);
      return walk(answer).end(REST);

    case 'hint-eliminate':
    case 'hint-step':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.ask().end(REST);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// A number to listen to
// ---------------------------------------------------------------------------------------------------------------------

/**
 * A number is said, and its numeral is to be found. What is said is the question itself, so it is said even to
 * someone who has asked for less movement, and nothing can be answered until it has been said. Asking to hear it
 * again says it again, as often as it is asked for.
 *
 * A wrong numeral is answered by what it is: its dots are counted and its own name said — "four" — and then the
 * number that was asked for is said again.
 */
function hearScript(
  situation: ChooseSituation,
  spoken: Extract<NumberPicture, { kind: 'spoken' }>,
): Script {
  const { stage, event, answer, tried, lines, seconds } = situation;
  const script = new Writer(seconds).essential();
  const clip = numberClip(spoken.value);
  const hear = () => script.name('prompt', clip).beat(REST);

  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(500).say('lesson.watch').say(lines.instruction);
        hear().wait(PAUSE * 2);
        if (answer) script.name(answer.id, clip);
        return script.cue('same').end(SAME);
      }
      script.wait(250).say(lines.instruction);
      return hear().end(REST);

    case 'correct':
      script.wait(500);
      if (answer) script.name(answer.id, clip);
      script.cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      script.wait(600);
      if (tried) countAndSay(script, 'tried', read(tried.stimulus)).wait(PAUSE);
      if (lines.feedback) script.say(lines.feedback);
      return hear().end(REST);

    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return hear().end(REST);

    case 'hint-reveal':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      if (answer) script.name(answer.id, clip);
      return script.end(REST);

    case 'hint-eliminate':
    case 'hint-step':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.end(REST);
  }
}

export function chooseScript(situation: ChooseSituation): Script {
  const { prompt, choices } = situation;
  if (prompt.type === 'sign') return compareScript(situation);
  const asked = read(prompt);
  switch (asked?.kind) {
    case 'stairs':
      return stairsScript(situation, asked);
    case 'path':
      return pathScript(situation, asked);
    case 'spoken':
      return hearScript(situation, asked);
    case 'group':
      // A group matched with groups is the first game of all, and has no number said in it.
      return choices.every((choice) => choice.stimulus.type === 'quantity')
        ? matchScript(situation)
        : numberScript(situation);
    case 'numeral':
    case 'tower':
    case 'frame':
    case 'story':
      return numberScript(situation);
    case undefined:
      return compareScript(situation);
  }
}

/** How long Glim takes to give one thing, where no word is spoken for it. */
const GIVE_TIME = 620;

export interface GiveSituation extends Omit<MakeSituation, 'parts' | 'sequence'> {
  /** How many friends there are: how many are wanted. */
  wanted: number;
  /** How many were given, after a wrong answer. */
  given: number | null;
}

/**
 * Giving out so many.
 *
 *   demonstration   Glim gives one to each friend, counting aloud, then friends and gifts are counted one against
 *                   the other: the same number of notes
 *   guided step     say what is wanted, and count the friends with the child
 *   on your own     say what is wanted, and wait
 *   right           the friends counted, then what they were given: the same, and both lit
 *   not right       the friends counted, then what was given: a different number of notes
 */
export function giveScript(situation: GiveSituation): Script {
  const { stage, event, wanted, given, lines, seconds } = situation;
  const script = new Writer(seconds);

  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(500).say('lesson.watch').say(lines.instruction).beat({ show: 'do', parts: 0 });
        for (let part = 1; part <= wanted; part++) {
          const word = `count.${String(part)}`;
          script
            .wait(PAUSE)
            .beat({ show: 'do', parts: part })
            .note(part - 1)
            .say(word);
          // Where the word is not heard, the giving still takes its time.
          if (script.spoken(word) === 0) script.wait(GIVE_TIME - PAUSE);
        }
        count(script.wait(PAUSE * 2), 'prompt', wanted).wait(PAUSE);
        return count(script, 'answer', wanted)
          .wait(PAUSE / 2)
          .cue('same')
          .end(SAME);
      }
      script.wait(250).say(lines.instruction);
      if (stage === 'guided') count(script.wait(PAUSE / 2), 'prompt', wanted);
      return script.end(REST);

    case 'correct':
      count(script.wait(650), 'prompt', wanted).wait(PAUSE);
      count(script, 'answer', wanted)
        .wait(PAUSE / 2)
        .cue('same')
        .beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      script.wait(700);
      if (lines.feedback) script.say(lines.feedback);
      count(script, 'prompt', wanted);
      if (given !== null) count(script.wait(PAUSE), 'tried', given);
      return script.end(REST);

    case 'hint-model':
    case 'hint-reveal':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return count(script, 'prompt', wanted).end(REST);

    case 'hint-step':
    case 'hint-eliminate':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.end(REST);
  }
}
