import type { Stage } from '@/engine';
import {
  PAUSE,
  REST,
  SAME,
  Writer,
  type Beat,
  type Script,
  type ScriptEvent,
  type Seconds,
} from '@/game/lesson/script';
import { GHOST_MS, STEP_MS, type Mode } from './run';

/**
 * What Robot Ridge's board shows off, moment by moment: Glim tapping out a journey, the robot's shadow going the
 * way first, a program being built and run, a faulty one running to where it goes wrong.
 *
 * A journey is shown as frames (see run.ts): the robot where it starts, then where it is after each command. A
 * script names the frame to show — "the shadow is at frame 2 of the way", "the robot is at frame 3 of the faulty
 * run", "the faulty run is over and the robot is left at frame 3" — and the board draws it. Nothing here knows
 * where anything is; it only keeps time.
 */

export interface RobotSituation {
  stage: Stage;
  event: ScriptEvent;
  /** The child has asked to be told again. */
  again: boolean;
  mode: Mode;
  /** How many commands the answer's run carries out: how many frames the way there has after the first. */
  way: number;
  /** How many parts Glim puts in place to build the answer: its commands, and how many times, where it is done over. */
  parts: number;
  /** How many commands the faulty program carries out before it stops, where there is one to mend. */
  fault: number;
  /** The faulty program ends by driving at a rock or the edge. */
  faultBumps: boolean;
  lines: { instruction: string; feedback: string | null; hint: string | null };
  seconds: Seconds;
}

/** What a beat of these scripts asks the board to show, beyond the frame's own beats. */
export type Showing =
  /** The robot's shadow is at this frame of the way there. */
  | { show: 'shadow'; frame: number }
  /** The robot is at this frame of the answer's run. */
  | { show: 'run'; frame: number }
  /** The robot is at this frame of the faulty program's run. */
  | { show: 'fault'; frame: number }
  /**
   * The faulty program has run, and the robot is left standing at this frame of it: where it went astray. Nothing
   * is being carried out any more, so no step of the row is lit — the last step done is very often not the wrong one.
   */
  | { show: 'astray'; frame: number }
  /** The wrong step is being pointed at. */
  | { show: 'pick' };

const named = (which: string): Beat => ({ show: 'name', which });

/** Read one of these scripts' own beats. `null` for the frame's beats (rest, ask, do, same). */
export function showingOf(beat: Beat): Showing | null {
  if (beat.show !== 'name') return null;
  if (beat.which === 'pick') return { show: 'pick' };
  const [what, frame] = beat.which.split(':');
  if (what !== 'shadow' && what !== 'run' && what !== 'fault' && what !== 'astray') return null;
  return { show: what, frame: Number(frame) };
}

/** How long a part of a program stays just put in place before Glim puts in the next. */
export const PART_MS = 460;

/**
 * Whether what has just happened shows the way there: the robot's shadow goes ahead along it. (A board that shows
 * nothing moving draws the way as a line of marks instead; this is how it knows to.)
 */
export function showsTheWay({ stage, event, mode }: RobotSituation): boolean {
  if (mode === 'mend') return false;
  if (event === 'hint-model') return true;
  return event === 'new' && mode !== 'live' && stage !== 'independent';
}

/**
 * The script for what has just happened.
 *
 *   one tap at a time
 *     demonstration   Glim taps the arrows one by one; the robot does each as it is tapped
 *     a new journey   the question, and the arrows offered
 *   a plan (and a plan done over)
 *     demonstration   the shadow goes the way; the steps are put in place one by one; the row is run
 *     with support    the question, and the shadow goes the way: "there. Now you tell the robot"
 *     on your own     the question, and the arrows offered
 *   a row to mend
 *     demonstration   the faulty row runs to where it goes wrong; the wrong step is pointed at and changed; it runs
 *     a new row       the faulty row runs, and the robot is left where it went wrong
 *   help              the shadow goes the way again; or the faulty row runs again
 */
export function robotScript(situation: RobotSituation): Script {
  const { stage, event, mode, way, parts, fault, faultBumps, lines, seconds } = situation;
  const script = new Writer(seconds);

  const shadow = () => {
    for (let frame = 1; frame <= way; frame++) {
      script.beat(named(`shadow:${String(frame)}`)).wait(GHOST_MS);
    }
    return script.wait(PAUSE).beat(REST);
  };
  const run = (which: 'run' | 'fault', frames: number) => {
    for (let frame = 1; frame <= frames; frame++) {
      script.beat(named(`${which}:${String(frame)}`));
      // A step sounds as the robot gets there; a step it could not take sounds like a soft knock instead.
      if (which === 'fault' && faultBumps && frame === frames) script.cue('off');
      else script.note(frame - 1, STEP_MS * 0.4);
      script.wait(STEP_MS);
    }
    return script;
  };
  const stayAtTheFault = () => run('fault', fault).end(named(`astray:${String(fault)}`));

  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction);
        if (mode === 'live') {
          script.beat({ show: 'do', parts: 0 });
          for (let part = 1; part <= parts; part++) {
            script
              .wait(PAUSE * 1.5)
              .beat({ show: 'do', parts: part })
              .note(part - 1, STEP_MS * 0.4)
              .wait(STEP_MS);
          }
          return script.wait(PAUSE).cue('same').end(SAME);
        }
        if (mode === 'mend') {
          run('fault', fault)
            .wait(PAUSE * 3)
            .beat(named('pick'))
            .wait(900)
            .beat({ show: 'do', parts: 1 })
            .cue('tap')
            .wait(PART_MS + PAUSE * 2);
          return run('run', way).wait(PAUSE).cue('same').end(SAME);
        }
        shadow().wait(PAUSE).beat({ show: 'do', parts: 0 });
        for (let part = 1; part <= parts; part++) {
          script.wait(PAUSE).beat({ show: 'do', parts: part }).cue('tap').wait(PART_MS);
        }
        script.wait(PAUSE * 2);
        return run('run', way).wait(PAUSE).cue('same').end(SAME);
      }
      script.wait(250).say(lines.instruction);
      if (mode === 'mend') return stayAtTheFault();
      if (mode !== 'live' && stage === 'guided') return shadow().end(REST);
      return script.ask().end(REST);

    case 'correct':
      script.wait(300).cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);

    case 'incorrect':
      script.wait(450);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(REST);

    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return mode === 'mend' ? stayAtTheFault() : shadow().end(REST);

    case 'hint-step':
    case 'hint-eliminate':
    case 'hint-reveal':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.end(REST);
  }
}
