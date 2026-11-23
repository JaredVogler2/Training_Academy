import type { Cue } from '@/audio';
import type { Stage, Stimulus } from '@/engine';

/**
 * What a lesson board shows off, moment by moment: Glim's demonstration, the question being put, what follows an
 * answer. A script is a list of moments on a clock. It is worked out from what the engine has just said, so that it
 * can be read and tested apart from the screen that plays it.
 *
 * Nothing here decides anything. The engine has already said what is right; a script only shows it, and says it:
 * a moment may carry a line for the voice, and the clock waits while the line is spoken.
 */

/** What the board is doing at one moment. */
export type Beat =
  /** Nothing in particular: the question and what there is to answer it with, waiting. */
  | { show: 'rest' }
  /** "Which of these goes with this?": what is asked about is offered, then each choice in turn. */
  | { show: 'ask' }
  /**
   * One group counted, thing by thing: `prompt` (what is asked about), `answer` (the right choice), `tried` (the
   * choice just tried), or the id of any choice.
   */
  | { show: 'count'; group: string }
  /** What was asked about and its answer, lit together: these go together. */
  | { show: 'same' }
  /** One picture lifted while it is named or sounded: `prompt`, or the id of a choice or a card. */
  | { show: 'name'; which: string }
  /** What has to be taken in at a glance is uncovered, for a look. */
  | { show: 'glance' }
  /** A thing being made, part by part: the first `parts` parts of the answer are in place. */
  | { show: 'do'; parts: number };

export type Sound =
  /** The climbing note for the `index`-th thing counted (0 is the first). */
  | { kind: 'count'; index: number }
  | { kind: 'cue'; cue: Cue }
  /** A line for the voice, by its key. */
  | { kind: 'say'; key: string };

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
  'new' | 'correct' | 'incorrect' | 'hint-model' | 'hint-eliminate' | 'hint-step' | 'hint-reveal';

/** How long a line takes to say, in seconds; 0 when it will not be heard (no voice, or sound off). */
export type Seconds = (key: string) => number;

/** A breath between one thing shown and the next. */
export const PAUSE = 260;
/** How long the "which of these?" gesture takes. */
export const ASK_TIME = 1100;
/** How long one picture stays lifted when it is pointed out without a word. */
export const NAME_TIME = 700;
/** A breath after a spoken line before the next thing happens. */
const AFTER_A_LINE = 180;

export const REST: Beat = { show: 'rest' };
export const SAME: Beat = { show: 'same' };

export class Writer {
  readonly moments: Moment[] = [];
  private clock = 0;

  constructor(private readonly seconds: Seconds = () => 0) {}

  get now(): number {
    return this.clock;
  }

  wait(ms: number): this {
    this.clock += ms;
    return this;
  }

  beat(beat: Beat): this {
    this.moments.push({ at: this.clock, beat });
    return this;
  }

  cue(cue: Cue): this {
    this.moments.push({ at: this.clock, sound: { kind: 'cue', cue } });
    return this;
  }

  note(index: number, after = 0): this {
    this.moments.push({ at: this.clock + after, sound: { kind: 'count', index } });
    return this;
  }

  /** Say a line, and wait for it. A line that will not be heard takes no time. */
  say(key: string): this {
    const spoken = this.seconds(key) * 1000;
    this.moments.push({ at: this.clock, sound: { kind: 'say', key } });
    return spoken > 0 ? this.wait(Math.round(spoken) + AFTER_A_LINE) : this;
  }

  /** How long a line takes, in milliseconds, for a beat that should last as long as its words. */
  spoken(key: string): number {
    return Math.round(this.seconds(key) * 1000);
  }

  ask(): this {
    return this.cue('ask').beat({ show: 'ask' }).wait(ASK_TIME);
  }

  /** Lift one picture for as long as its word takes (or for a moment, where there is no word). */
  name(which: string, key?: string): this {
    this.beat({ show: 'name', which });
    const spoken = key === undefined ? 0 : this.spoken(key);
    if (key !== undefined) this.moments.push({ at: this.clock, sound: { kind: 'say', key } });
    return this.wait(Math.max(NAME_TIME, spoken + AFTER_A_LINE));
  }

  end(settled: Beat): Script {
    // Where the board is already showing what it comes to rest on, at this very moment, that is not said twice.
    const last = this.moments.findLast((moment) => moment.beat !== undefined);
    const already =
      last !== undefined &&
      last.at === this.clock &&
      JSON.stringify(last.beat) === JSON.stringify(settled);
    if (!already) this.moments.push({ at: this.clock, beat: settled });
    const moments = [...this.moments].sort((a, b) => a.at - b.at);
    return { moments, settled, length: this.clock };
  }
}

/** Everything a question with choices can tell the one who writes its script. */
export interface ChooseSituation {
  stage: Stage;
  event: ScriptEvent;
  /** What is asked about. */
  prompt: Stimulus;
  /** The prompt is shown for a moment and then covered. */
  glance: boolean;
  /** The child has asked to be shown again. What is being asked is said again; nothing that is help is given. */
  again: boolean;
  /** The choices still on the table, in the order they are shown. */
  choices: { id: string; stimulus: Stimulus }[];
  /** The right choice, where the lesson is showing it: a demonstration, a reveal, or an answer just given. */
  answer: { id: string; stimulus: Stimulus } | null;
  /** The choice just tried, after a wrong answer. */
  tried: { id: string; stimulus: Stimulus } | null;
  /** The engine is now showing which choice is right (a wrong try or a hint has left it no other). */
  revealed: boolean;
  /**
   * The lines that go with this moment, by key. `ask` is what is asked once the prompt has been covered; `correct`
   * is what is said of the right answer, for a demonstration that says it.
   */
  lines: {
    instruction: string;
    feedback: string | null;
    hint: string | null;
    ask?: string | null;
    correct?: string | null;
  };
  seconds: Seconds;
}

/**
 * The script any question with choices gets unless its world writes its own: say what is asked, offer the
 * choices, and when the answer is shown, point to it and light it with what was asked about.
 */
export function pointingScript(situation: ChooseSituation): Script {
  const { stage, event, answer, lines, seconds } = situation;
  const script = new Writer(seconds);
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say(lines.instruction).ask().wait(PAUSE);
        if (answer) script.name(answer.id).wait(PAUSE / 2);
        return script.cue('same').end(SAME);
      }
      return script.wait(250).say(lines.instruction).ask().end(REST);
    case 'correct':
      script.wait(650);
      if (lines.feedback) script.say(lines.feedback);
      return script.cue('same').end(SAME);
    case 'incorrect':
      script.wait(700);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(REST);
    case 'hint-model':
    case 'hint-eliminate':
    case 'hint-step':
    case 'hint-reveal':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      if (event === 'hint-reveal' && answer) script.name(answer.id);
      return script.end(REST);
  }
}

/** Everything a thing to make can tell the one who writes its script. */
export interface MakeSituation {
  stage: Stage;
  event: ScriptEvent;
  /** The child has asked to be shown again. */
  again: boolean;
  /** How many parts the answer has, where the lesson is showing it being made; otherwise 0. */
  parts: number;
  /** What is shown first to be done again (a sequence to echo), by card id; empty where nothing is. */
  sequence: string[];
  lines: { instruction: string; feedback: string | null; hint: string | null };
  seconds: Seconds;
}

/** How long one part of a thing takes to be put in place when Glim makes it. */
export const PART_TIME = 720;

/**
 * The script any thing to make gets unless its board writes its own: say what is wanted; in a demonstration,
 * make it part by part with a note for each; and say what there is to say about an answer or a hint.
 */
export function makingScript(situation: MakeSituation): Script {
  const { stage, event, parts, lines, seconds } = situation;
  const script = new Writer(seconds);
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction).beat({ show: 'do', parts: 0 });
        for (let part = 1; part <= parts; part++) {
          script
            .wait(PART_TIME / 2)
            .beat({ show: 'do', parts: part })
            .note(part - 1)
            .wait(PART_TIME / 2);
        }
        return script.wait(PAUSE).cue('same').end({ show: 'do', parts });
      }
      return script.wait(250).say(lines.instruction).end(REST);
    case 'correct':
      script.wait(500).cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);
    case 'incorrect':
      script.wait(600);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(REST);
    case 'hint-model':
    case 'hint-eliminate':
    case 'hint-step':
    case 'hint-reveal':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.end(REST);
  }
}
