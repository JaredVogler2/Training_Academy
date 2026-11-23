import type { Stage } from '@/engine';
import {
  PART_TIME,
  PAUSE,
  REST,
  SAME,
  Writer,
  type Script,
  type ScriptEvent,
  type Seconds,
} from '@/game/lesson/script';
import { TEST_TIME } from './geometry';

/**
 * How Inventor Island shows its questions: by testing the thing. Nothing here says what happens — the model has
 * said that already, and the picture plays it. A script only says when the test is played, and what is said round
 * it.
 *
 * A test is one beat: `count`, for as long as a test takes to watch. Which set-up is tested is the beat's `group`:
 *
 *   prompt   the set-up that was asked about, or the design that was just handed in
 *   tried    a design that was handed in and did not work
 *   start    the design a mend begins with: the problem, shown before anything is changed
 */

/** A breath after a test, so that where it came to rest can be taken in. */
const TAKE_IT_IN = PAUSE * 2;

function test(script: Writer, group: 'prompt' | 'tried' | 'start'): Writer {
  return script.beat({ show: 'count', group }).wait(TEST_TIME).beat(REST).wait(TAKE_IT_IN);
}

// ---------------------------------------------------------------------------------------------------------------------
// A guess
// ---------------------------------------------------------------------------------------------------------------------

export interface GuessSituation {
  stage: Stage;
  event: ScriptEvent;
  /** The child has asked to be told again. */
  again: boolean;
  /** The test has been watched already in this step: a guess that did not come true, or help that tested it. */
  seen: boolean;
  /** In a demonstration, the picture Glim guesses: the one that shows what happens. */
  answer: string | null;
  lines: {
    instruction: string;
    feedback: string | null;
    hint: string | null;
    /** What is said at the end of a demonstration: what happened. */
    outcome: string;
  };
  seconds: Seconds;
}

/**
 * What will happen?
 *
 *   demonstration   the question; Glim guesses; the test; the guess and what happened, lit together
 *   a new step      the question, and the pictures of how it might turn out offered in turn
 *   a guess         the test, straight away: finding out is the answer. If the guess came true, the two are lit
 *                   together. If not, the child is asked to tap what did happen — they have just watched it
 *   help            look at it; then, not this one; then the test itself
 *
 * A test that has been watched is not played again for a right answer: the child is saying what they saw.
 */
export function guessScript(situation: GuessSituation): Script {
  const { stage, event, again, seen, answer, lines, seconds } = situation;
  const script = new Writer(seconds);
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction).ask();
        if (answer !== null) script.name(answer).wait(PAUSE);
        test(script, 'prompt').cue('same').beat(SAME).say(lines.outcome);
        return script.end(SAME);
      }
      script.wait(250).say(lines.instruction);
      return again ? script.end(REST) : script.ask().end(REST);

    case 'correct':
      script.wait(300);
      if (!seen) test(script, 'prompt');
      script.cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      test(script.wait(300), 'prompt');
      if (lines.feedback) script.say(lines.feedback);
      return script.end(REST);

    case 'hint-reveal':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return test(script, 'prompt').end(REST);

    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      // "Look at it": the thing itself is lifted for a moment.
      return script.name('prompt').end(REST);

    case 'hint-eliminate':
    case 'hint-step':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.end(REST);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// A mend
// ---------------------------------------------------------------------------------------------------------------------

export interface MendSituation {
  stage: Stage;
  event: ScriptEvent;
  again: boolean;
  /** The design is still as it was handed over, so the trouble with it can be shown. */
  untouched: boolean;
  /** How many parts can be changed. */
  parts: number;
  /** In a demonstration, which parts Glim changes, counted from 1, in the order they are shown. */
  changes: number[];
  lines: { instruction: string; feedback: string | null; hint: string | null };
  seconds: Seconds;
}

/**
 * Change it until it works.
 *
 *   demonstration   what is wanted; the trouble (the design as handed over, tested); Glim changes a part, and
 *                   another if it takes two; the test; it works
 *   a new step      what is wanted, and the trouble shown once — watching it fail is free, and is the start of
 *                   mending it. Once the child has changed anything, it is not shown again
 *   a test          the design as it now stands, tested. It works, or it does not and is left as it is to change
 *   help            what each part does; then one part, set; then the whole answer, pointed out
 *
 * A `do` beat with `parts: n` means the first `n` parts are as they are in the answer.
 */
export function mendScript(situation: MendSituation): Script {
  const { stage, event, untouched, parts, changes, lines, seconds } = situation;
  const script = new Writer(seconds);
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction);
        test(script, 'start').beat({ show: 'do', parts: 0 });
        changes.forEach((part, index) => {
          script
            .wait(PART_TIME / 2)
            .beat({ show: 'do', parts: part })
            .note(index)
            .wait(PART_TIME);
        });
        script.beat({ show: 'do', parts }).wait(PAUSE);
        return test(script, 'prompt').cue('same').end(SAME);
      }
      script.wait(250).say(lines.instruction);
      return untouched ? test(script, 'start').end(REST) : script.end(REST);

    case 'correct':
      test(script.wait(250), 'prompt').cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      test(script.wait(250), 'tried');
      if (lines.feedback) script.say(lines.feedback);
      return script.end(REST);

    case 'hint-model':
    case 'hint-step':
    case 'hint-reveal':
    case 'hint-eliminate':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.end(REST);
  }
}
