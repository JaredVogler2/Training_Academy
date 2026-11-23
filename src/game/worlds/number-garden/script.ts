import type { Stimulus } from '@/engine';
import {
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

export function amountOf(stimulus: Stimulus | undefined): number {
  return stimulus?.type === 'quantity' ? stimulus.count : 0;
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

export function chooseScript(situation: ChooseSituation): Script {
  return situation.prompt.type === 'quantity' ? matchScript(situation) : compareScript(situation);
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
