import { DRUM_HZ, TICK_HZ } from '@/audio';
import type { BeatTask, MakeChallenge, Stimulus } from '@/engine';
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
import { BETWEEN_MS, STEP_MS, phrasesOf, type Phrase } from './phrases';

/**
 * How the Music Lab puts a question: by playing it. Each one who has something to play is lifted while they play
 * it, one after the other, and only when the last has finished can anything be answered. Asking to be told again
 * plays the whole question again, as often as it is asked for: hearing it is not help, it is the question.
 *
 * What is played is the question itself, so these scripts are played even for someone who has asked for less
 * movement: nothing here moves for the sake of moving.
 */

/** How long a chime bar is lit while it shows a note to be played back. */
export const BAR_TIME = 2 * STEP_MS;

/** Lift one player (or one of two in the same picture) and play what they have. */
function play(script: Writer, which: string, played: Phrase | undefined, part?: number): void {
  if (!played || played.strokes.length === 0) return;
  script.beat(part === undefined ? { show: 'name', which } : { show: 'name', which, part });
  for (const stroke of played.strokes) script.tone(stroke.timbre, stroke.pitch).wait(stroke.lasts);
  script.beat(REST).wait(BETWEEN_MS);
}

type Shown = { id: string; stimulus: Stimulus };

export function chooseScript(situation: ChooseSituation): Script {
  const { stage, event, prompt, choices, answer, lines, seconds } = situation;
  const script = new Writer(seconds).essential();
  const asked = phrasesOf(prompt);
  const sing = (shown: Shown | null) => {
    if (shown) play(script, shown.id, phrasesOf(shown.stimulus)[0]);
  };
  /** The whole question, as it is heard: whatever is asked about, and then each one there is to choose from. */
  const hear = () => {
    asked.forEach((played, index) =>
      play(script, 'prompt', played, asked.length > 1 ? index : undefined),
    );
    for (const choice of choices) sing(choice);
  };

  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction);
        hear();
        script.wait(PAUSE);
        // The answer, once more, and what there is to say about it.
        if (answer) {
          if (phrasesOf(answer.stimulus).length > 0) sing(answer);
          else script.name(answer.id).wait(PAUSE / 2);
        }
        script.cue('same').beat(SAME);
        if (lines.correct) script.say(lines.correct);
        return script.end(SAME);
      }
      script.wait(250).say(lines.instruction);
      hear();
      return script.end(REST);

    case 'correct':
      script.wait(500).cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      script.wait(600);
      if (lines.feedback) script.say(lines.feedback);
      // "Listen again": here it is.
      hear();
      return script.end(REST);

    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      hear();
      return script.end(REST);

    case 'hint-reveal':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      if (answer) {
        if (phrasesOf(answer.stimulus).length > 0) sing(answer);
        else script.name(answer.id);
      }
      return script.end(REST);

    case 'hint-eliminate':
    case 'hint-step':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.end(REST);
  }
}

/**
 * Notes to play back: each bar is lit as it sounds. Shown to everyone, since it is the question; shown again only
 * as help, or after a wrong try.
 */
function echoScript(situation: MakeSituation): Script {
  const { stage, event, again, sequence, lines, seconds } = situation;
  const script = new Writer(seconds).essential();
  const show = () => {
    for (const note of sequence) {
      script.beat({ show: 'name', which: note }).tone('bar', note).wait(BAR_TIME);
      script.beat(REST).wait(PAUSE / 2);
    }
    return script;
  };
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction);
        show().wait(PAUSE).beat({ show: 'do', parts: 0 });
        sequence.forEach((note, index) => {
          script
            .wait(PAUSE)
            .beat({ show: 'do', parts: index + 1 })
            .tone('bar', note)
            .wait(BAR_TIME);
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

export function makeScript(situation: MakeSituation, challenge: MakeChallenge): Script | null {
  return challenge.task.type === 'echo' ? echoScript(situation) : null;
}

/** The time from one beat to the next, in milliseconds. */
export function periodOf(task: BeatTask): number {
  return 60_000 / task.tempo;
}

/**
 * What is said about a beat, and — where Glim is showing how — the beat itself with Glim tapping along: the beats
 * to listen to are only clicked, and from then on the drum is struck on every one. For the child's own turn the
 * script is only the words; the beat is kept by the board, on the audio's own clock, where it has to be exact.
 */
export function beatScript(situation: MakeSituation, task: BeatTask): Script {
  const { stage, event, lines, seconds } = situation;
  const script = new Writer(seconds).essential();
  const period = periodOf(task);
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction).wait(PAUSE);
        for (let beat = 0; beat < task.lead + task.beats; beat++) {
          script.beat({ show: 'do', parts: beat + 1 }).tone('tick', TICK_HZ);
          if (beat >= task.lead) script.tone('drum', DRUM_HZ);
          script.wait(period);
        }
        return script.cue('same').end(SAME);
      }
      return script.wait(250).say(lines.instruction).end(REST);
    case 'correct':
      script.wait(400).cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);
    case 'incorrect':
      script.wait(500);
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

/**
 * What is said about a tune to make up; where Glim is showing how, the tune being made, note by note; and after a
 * right answer, the child's own tune played back to them.
 */
export function tuneScript(
  situation: MakeSituation,
  shown: readonly string[],
  made: readonly string[],
): Script {
  const { stage, event, lines, seconds } = situation;
  const script = new Writer(seconds).essential();
  const playBack = (tune: readonly string[]) => {
    tune.forEach((note, index) => {
      script
        .beat({ show: 'name', which: String(index) })
        .tone('bar', note)
        .wait(BAR_TIME);
    });
    return script.beat(REST);
  };
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction).beat({ show: 'do', parts: 0 });
        shown.forEach((note, index) => {
          script
            .wait(PAUSE)
            .beat({ show: 'do', parts: index + 1 })
            .tone('bar', note)
            .wait(BAR_TIME);
        });
        script.wait(PAUSE * 2);
        return playBack(shown).wait(PAUSE).cue('same').end(SAME);
      }
      return script.wait(250).say(lines.instruction).end(REST);
    case 'correct':
      script.wait(400).cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return playBack(made).end(SAME);
    case 'incorrect':
      script.wait(500);
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
