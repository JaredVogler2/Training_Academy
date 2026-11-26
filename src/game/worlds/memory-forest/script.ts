import type { MakeChallenge, Stage, Stimulus, Way } from '@/engine';
import {
  PART_TIME,
  PAUSE,
  REST,
  SAME,
  Writer,
  makingScript,
  type ChooseSituation,
  type MakeSituation,
  type Script,
  type ScriptEvent,
  type Seconds,
} from '@/game/lesson/script';
import { memoryText } from './text';
import { voice } from './voice';

/**
 * How Memory Forest shows a question off. What is to be remembered is uncovered for a look — long enough to take
 * in, a little longer for each thing there is — and then covered, and only then is the question put. Asking to be
 * told again says the words again and does not uncover anything: another look is help, and is asked for as help.
 */

/** How long things stay uncovered: this much, and this much more for each thing there is to take in. */
export const LOOK_AT_LEAST = 1600;
export const LOOK_FOR_EACH = 900;

/** How many separate things a scene holds. */
export function thingsIn(stimulus: Stimulus): number {
  if (stimulus.type !== 'scene') return 1;
  const { ids, owners } = stimulus.of;
  if (Array.isArray(ids)) return ids.length;
  return Array.isArray(owners) ? owners.length * 2 : 1;
}

export function lookingTime(stimulus: Stimulus): number {
  return LOOK_AT_LEAST + LOOK_FOR_EACH * thingsIn(stimulus);
}

export function chooseScript(situation: ChooseSituation): Script {
  const { stage, event, prompt, glance, again, answer, lines, seconds } = situation;
  const script = new Writer(seconds);
  const look = () => script.beat({ show: 'glance' }).wait(lookingTime(prompt)).beat(REST);
  const ask = () => {
    if (lines.ask) script.wait(PAUSE).say(lines.ask);
    return script;
  };

  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction);
        if (glance) look();
        ask().wait(PAUSE);
        if (answer) script.name(answer.id).wait(PAUSE / 2);
        return script.cue('same').end(SAME);
      }
      script.wait(250).say(lines.instruction);
      if (glance && !again) look();
      ask();
      // Nothing was shown just now: the choices are simply offered.
      if (!glance) script.ask();
      return script.end(REST);

    case 'correct':
      script.wait(600);
      if (answer) script.name(answer.id).wait(PAUSE / 2);
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
      if (glance) look();
      return script.end(REST);

    case 'hint-reveal':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      if (answer) script.name(answer.id);
      return script.end(REST);

    case 'hint-eliminate':
    case 'hint-step':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.end(REST);
  }
}

/** How long each thing of an order stays lit where its name is not heard. */
const LIT_TIME = 780;

/**
 * An order to remember: each thing is lit in turn, with a climbing note and its name. Shown to everyone, since it
 * is the question; shown again only as help, or after a wrong try.
 */
export function makeScript(situation: MakeSituation, challenge: MakeChallenge): Script | null {
  const { task } = challenge;
  if (task.type !== 'echo') return null;
  const { stage, event, again, sequence, lines, seconds } = situation;
  const script = new Writer(seconds);
  const show = () => {
    sequence.forEach((id, index) => {
      const word = `word.${id}`;
      script.beat({ show: 'name', which: id }).note(index);
      if (Object.hasOwn(voice.urls, word)) script.say(word);
      if (script.spoken(word) === 0) script.wait(LIT_TIME);
      script.beat(REST).wait(PAUSE / 2);
    });
    return script;
  };
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction);
        show().wait(PAUSE).beat({ show: 'do', parts: 0 });
        sequence.forEach((_, index) => {
          script
            .wait(PAUSE)
            .beat({ show: 'do', parts: index + 1 })
            .note(index)
            .wait(PAUSE);
        });
        return script.wait(PAUSE).cue('same').end(SAME);
      }
      script.wait(250).say(lines.instruction);
      return again ? script.end(REST) : show().end(REST);
    case 'incorrect':
      script.wait(600);
      if (lines.feedback) script.say(lines.feedback);
      return show().end(REST);
    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return show().end(REST);
    case 'correct':
    case 'hint-eliminate':
    case 'hint-step':
    case 'hint-reveal':
      return makingScript(situation);
  }
}

/** How long Glim looks at the things each way, when showing how the game goes. */
export const WAY_TIME = 1500;

/** What a beat says when Glim, showing how, looks at the things one way: `way:groups`. */
export const lookingAs = (way: Way): string => `way:${way}`;

/** Everything a set of things looked at in a chosen way can tell the one who writes its script. */
export interface RecallSituation {
  stage: Stage;
  event: ScriptEvent;
  /** The child has asked to be told again. */
  again: boolean;
  /** The ways there are to look. The first is the one a demonstration keeps, and asks about. */
  ways: readonly Way[];
  /** The things have been put away: what there is to say again is the question, not how to look. */
  put: boolean;
  /** The things as they are looked at, for how long another look lasts. */
  scene: Stimulus;
  lines: { instruction: string; ask: string; feedback: string | null; hint: string | null };
  seconds: Seconds;
}

/**
 * Things looked at in a way of the child's choosing, and then asked about. In a demonstration Glim looks each way
 * in turn, naming it, keeps the first, puts the things away, and answers what that way asks. For a child, the
 * looking and the putting away are theirs to do: the script only says what is wanted. Another look is help, and
 * is in the way the child chose.
 */
export function recallScript(situation: RecallSituation): Script {
  const { stage, event, ways, put, scene, lines, seconds } = situation;
  const script = new Writer(seconds);
  switch (event) {
    case 'new': {
      const [kept, ...others] = ways;
      if (stage === 'demo' && kept !== undefined) {
        script.wait(400).say('lesson.watch').say(lines.instruction);
        // Each way, and the one that is kept last: that is the way the things are in when they are put away.
        for (const way of [...others, kept]) {
          script
            .beat({ show: 'name', which: lookingAs(way) })
            .say(memoryText.wayLine(way))
            .wait(WAY_TIME);
        }
        script.beat({ show: 'do', parts: 0 }).wait(PAUSE).say(lines.ask).wait(PAUSE);
        script.beat({ show: 'do', parts: 1 }).note(0).wait(PART_TIME);
        return script.cue('same').end(SAME);
      }
      return script
        .wait(250)
        .say(put ? lines.ask : lines.instruction)
        .end(REST);
    }
    case 'correct':
      script.wait(500).cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);
    case 'incorrect':
      script.wait(600);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(REST);
    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.beat({ show: 'glance' }).wait(lookingTime(scene)).end(REST);
    case 'hint-eliminate':
    case 'hint-step':
    case 'hint-reveal':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.end(REST);
  }
}
