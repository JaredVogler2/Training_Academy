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
 * How Explorer Harbor shows its questions off. A story is told, one picture at a time, each with its own line:
 * as far as it goes before its ending is asked for, and all through once it has been put in order. A question
 * about why something happened, or about a map, is put plainly, and its demonstration says the answer aloud.
 */

/** The line a story's picture is told with. */
export const panelLine = (id: string): string => `eh.panel.${id}`;

/** How long a picture is dwelt on where its line cannot be heard. */
export const TELL_TIME = 900;

const listOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((each): each is string => typeof each === 'string') : [];

/** The pictures that are on show where the question is about a story with one picture missing. */
export function toldSoFar(prompt: Stimulus): string[] {
  if (prompt.type !== 'scene' || prompt.scene !== 'strip' || prompt.of.kind === 'change') return [];
  const { parts, gap } = prompt.of;
  return listOf(parts).filter((_, index) => index !== gap);
}

function tell(script: Writer, id: string): boolean {
  const key = panelLine(id);
  if (!Object.hasOwn(voice.urls, key)) return false;
  script.say(key);
  return script.spoken(key) > 0;
}

export function chooseScript(situation: ChooseSituation): Script {
  const { stage, event, prompt, answer, lines, seconds } = situation;
  const script = new Writer(seconds);
  const story = toldSoFar(prompt);
  // Where the answer is the picture a story ends with, that picture's own line ends the telling.
  const ending =
    story.length > 0 && answer?.stimulus.type === 'picture' ? answer.stimulus.id : null;
  const put = () => {
    for (const id of story) tell(script, id);
    return script.say(lines.instruction);
  };

  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch');
        put().ask().wait(PAUSE);
        if (answer) script.name(answer.id).wait(PAUSE / 2);
        script.cue('same').beat(SAME);
        if (ending !== null) tell(script, ending);
        else if (lines.correct) script.say(lines.correct);
        return script.end(SAME);
      }
      script.wait(250);
      return put().ask().end(REST);

    case 'correct':
      script.wait(500);
      if (answer) script.name(answer.id).wait(PAUSE / 2);
      script.cue('same').beat(SAME);
      if (ending !== null) tell(script, ending);
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
      if (event === 'hint-reveal' && answer) script.name(answer.id);
      return script.end(REST);
  }
}

/**
 * A story to put in order. In the demonstration each picture is told as it is put in its place; and when a child
 * has put a story in order, they are told so, and then it is told back to them from the beginning, each picture
 * lifted as its line is said.
 */
export function makeScript(situation: MakeSituation, challenge: MakeChallenge): Script | null {
  const { task } = challenge;
  if (task.type !== 'order') return null;
  const { stage, event, lines, seconds } = situation;
  const script = new Writer(seconds);
  const told = (id: string) => {
    if (!tell(script, id)) script.wait(TELL_TIME);
    return script;
  };

  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction).beat({ show: 'do', parts: 0 });
        task.solution.forEach((id, index) => {
          script
            .wait(PAUSE)
            .beat({ show: 'do', parts: index + 1 })
            .note(index);
          told(id);
        });
        return script.wait(PAUSE).cue('same').end(SAME);
      }
      return script.wait(250).say(lines.instruction).end(REST);

    case 'correct':
      // "Yes. Here is the whole story." — and then the story, so that what is written under it is true throughout.
      script.wait(500).cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      script.wait(PAUSE);
      for (const id of task.solution) {
        script.beat({ show: 'name', which: id });
        told(id).wait(PAUSE / 2);
      }
      return script.end(SAME);

    case 'incorrect':
    case 'hint-model':
    case 'hint-eliminate':
    case 'hint-step':
    case 'hint-reveal':
      return makingScript(situation);
  }
}
