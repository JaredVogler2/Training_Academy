/**
 * What the lesson board shows off, moment by moment: Glim's demonstration, the question being put, the counting
 * that follows an answer. A script is a list of moments on a clock. It is worked out here, from what the engine has
 * just said, so that it can be read and tested apart from the screen that plays it.
 *
 * Nothing here decides anything. The engine has already said what is right; a script only shows it.
 */

/** What the board is doing at one moment. */
export type Beat =
  /** Nothing in particular: the question and its choices, waiting. */
  | { show: 'rest' }
  /** "Which of these goes with this?": the group to match is offered, then each choice in turn. */
  | { show: 'ask' }
  /** One group counted, thing by thing: the group to match, the right answer, or the choice just tried. */
  | { show: 'count'; group: 'prompt' | 'answer' | 'tried' }
  /** The group to match and its answer, lit together: the same amount. */
  | { show: 'same' };

export type Sound =
  /** The climbing note for the `count`-th thing (0 is the first). */
  { kind: 'count'; index: number } | { kind: 'cue'; cue: 'ask' | 'same' };

export interface Moment {
  /** Milliseconds after the script starts. */
  at: number;
  beat?: Beat;
  sound?: Sound;
}

export interface Script {
  moments: Moment[];
  /** Where the board comes to rest; also what is shown at once when motion is switched off. */
  settled: Beat;
  /** Milliseconds from start to rest. */
  length: number;
}

export type ScriptEvent =
  /** The step has just appeared, or the child has asked to be shown it again. */
  'new' | 'correct' | 'incorrect' | 'hint-model' | 'hint-eliminate' | 'hint-reveal';

export interface Situation {
  stage: 'demo' | 'guided' | 'independent';
  event: ScriptEvent;
  /** How many things are in the group to match (and so in the right answer). */
  amount: number;
  /** How many are in the choice just tried, after a wrong answer. */
  triedAmount: number | null;
  /** The engine is now showing which choice is right (a wrong try or a hint has left it no other). */
  revealed: boolean;
}

/**
 * The counting animation, as the stylesheet draws it (numberGarden.module.css): the first thing hops after
 * `HOP_FIRST`, each next one `HOP_EVERY` later, and a hop lasts `HOP_LENGTH`. The note for a thing sounds as it
 * reaches the top of its hop.
 */
export const HOP_FIRST = 150;
export const HOP_EVERY = 420;
export const HOP_LENGTH = 550;
const HOP_TOP = 160;

/** How long it takes to count `things` things, from the first hop starting to the last one landing. */
export function countingTime(things: number): number {
  return things <= 0 ? 0 : HOP_FIRST + (things - 1) * HOP_EVERY + HOP_LENGTH;
}

/** How long the "which of these?" gesture takes. */
export const ASK_TIME = 1100;
/** A breath between one thing shown and the next. */
const PAUSE = 260;

const REST: Beat = { show: 'rest' };
const SAME: Beat = { show: 'same' };

class Writer {
  readonly moments: Moment[] = [];
  private clock = 0;

  wait(ms: number): this {
    this.clock += ms;
    return this;
  }

  beat(beat: Beat): this {
    this.moments.push({ at: this.clock, beat });
    return this;
  }

  cue(cue: 'ask' | 'same'): this {
    this.moments.push({ at: this.clock, sound: { kind: 'cue', cue } });
    return this;
  }

  /** Count a group aloud, and move the clock to where its last thing has landed. */
  count(group: 'prompt' | 'answer' | 'tried', things: number): this {
    this.beat({ show: 'count', group });
    for (let index = 0; index < things; index++) {
      this.moments.push({
        at: this.clock + HOP_FIRST + index * HOP_EVERY + HOP_TOP,
        sound: { kind: 'count', index },
      });
    }
    return this.wait(countingTime(things));
  }

  ask(): this {
    return this.cue('ask').beat({ show: 'ask' }).wait(ASK_TIME);
  }

  end(settled: Beat): Script {
    this.moments.push({ at: this.clock, beat: settled });
    const moments = [...this.moments].sort((a, b) => a.at - b.at);
    return { moments, settled, length: this.clock };
  }
}

/**
 * The script for what has just happened.
 *
 *   demonstration   count the group, count its match, light them together: "the same amount"
 *   guided step     put the question, then count the group with the child ("we do")
 *   on your own     put the question, and wait ("you do")
 *   right           count the group, count the answer: the same number of notes, then both lit
 *   not right       count the group, then the choice that was tried: a different number of notes
 *   help            what the hint is: the counting, or the answer counted
 */
export function scriptFor(situation: Situation): Script {
  const { stage, event, amount, triedAmount, revealed } = situation;
  const script = new Writer();

  switch (event) {
    case 'new':
      if (stage === 'demo') {
        return script
          .wait(500)
          .count('prompt', amount)
          .wait(PAUSE)
          .count('answer', amount)
          .wait(PAUSE / 2)
          .cue('same')
          .end(SAME);
      }
      script.wait(250).ask();
      if (stage === 'guided') script.wait(PAUSE / 2).count('prompt', amount);
      return script.end(REST);

    case 'correct':
      // The "yes" notes come first (the screen plays them as the answer lands); the counting follows them.
      return script
        .wait(650)
        .count('prompt', amount)
        .wait(PAUSE)
        .count('answer', amount)
        .wait(PAUSE / 2)
        .cue('same')
        .end(SAME);

    case 'incorrect':
      script.wait(700).count('prompt', amount);
      if (triedAmount !== null) script.wait(PAUSE).count('tried', triedAmount);
      if (revealed) script.wait(PAUSE).count('answer', amount);
      return script.end(REST);

    case 'hint-model':
      return script.wait(200).count('prompt', amount).end(REST);

    case 'hint-reveal':
      return script.wait(300).count('answer', amount).end(REST);

    case 'hint-eliminate':
      return script.wait(200).ask().end(REST);
  }
}
