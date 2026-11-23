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
