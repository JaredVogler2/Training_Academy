import type { ProgramTask, Stage } from '@/engine';
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
import { GHOST_MS, STEP_MS, modeOf, type Mode, type Runs } from './run';

/**
 * What Robot Ridge's board shows off, moment by moment: Glim tapping out a journey, the robot's shadow going the
 * way first, a program being built and run (all at once, a step at a time, or twice over where a bridge may be up
 * or down), a faulty one running to where it goes wrong.
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
  /** A longer plan, which can be run a step at a time: Glim runs it that way, to show the two buttons that do. */
  stepwise: boolean;
  /**
   * Where there is a bridge on the way. `waits`: the frames of the answer's run, with every bridge up, at which
   * the robot stands waiting. `down`: how many commands the same answer carries out with every bridge down, and
   * `passes`: the frames of that run at which the step that waits finds nothing to wait for. Where there is no
   * bridge these are empty, nought and empty.
   */
  waits: readonly number[];
  down: number;
  passes: readonly number[];
  lines: { instruction: string; feedback: string | null; hint: string | null };
  seconds: Seconds;
}

/**
 * The situation of a journey: everything the script needs to know of the task, worked out in one place, so that
 * the board and the tests of every journey in the pack are told the same.
 */
export function situationOf(
  task: ProgramTask,
  runs: Runs,
  rest: Pick<RobotSituation, 'stage' | 'event' | 'again' | 'lines' | 'seconds'>,
): RobotSituation {
  const mode = modeOf(task);
  const { answer, way, down, fault } = runs;
  return {
    ...rest,
    mode,
    way: way.frames.length - 1,
    parts:
      mode === 'live'
        ? (answer?.commands.length ?? 0)
        : mode === 'mend'
          ? 1
          : task.solution.split('-').length,
    fault: fault ? fault.frames.length - 1 : 0,
    faultBumps: fault?.frames.at(-1)?.bumped === true,
    stepwise: task.stepwise === true,
    waits: way.frames.flatMap((frame, at) => (frame.waiting ? [at] : [])),
    down: down ? down.frames.length - 1 : 0,
    passes: down
      ? down.frames.flatMap((frame, at) => (frame.step?.command === 'wait' ? [at] : []))
      : [],
  };
}

/** What Glim says of a bridge while a run is shown: the two lines are in src/voice/lines.json. */
export const BRIDGE_LINES = { waits: 'robot.waits', passes: 'robot.passes' } as const;

/** What a beat of these scripts asks the board to show, beyond the frame's own beats. */
export type Showing =
  /** The robot's shadow is at this frame of the way there. */
  | { show: 'shadow'; frame: number }
  /**
   * The robot is at this frame of the answer's run. `by` is there when Glim has got it there with one of the two
   * buttons that run a row a step at a time: one step on, or one step back.
   */
  | { show: 'run'; frame: number; by?: 'on' | 'back' }
  /** The robot is at this frame of the answer's run with every bridge down. */
  | { show: 'down'; frame: number }
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
  const [what, frame, by] = beat.which.split(':');
  if (what === 'run') {
    return { show: 'run', frame: Number(frame), ...(by === 'on' || by === 'back' ? { by } : {}) };
  }
  if (what !== 'shadow' && what !== 'fault' && what !== 'astray' && what !== 'down') return null;
  return { show: what, frame: Number(frame) };
}

/** How long a part of a program stays just put in place before Glim puts in the next. */
export const PART_MS = 460;
/**
 * The same, with the breath before it, where there is more to show afterwards: a longer plan is run a step at a
 * time, and a plan with a bridge is run twice. The whole of a demonstration is still under ten seconds.
 */
export const BRISK_MS = 300;

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
 *                     (a longer plan is run a step at a time, with one step back; a plan with a bridge on the way
 *                     is run twice, with the bridge up and then with it down)
 *     with support    the question, and the shadow goes the way: "there. Now you tell the robot"
 *     on your own     the question, and the arrows offered
 *   a row to mend
 *     demonstration   the faulty row runs to where it goes wrong; the wrong step is pointed at and changed; it runs
 *     a new row       the faulty row runs, and the robot is left where it went wrong
 *   help              the shadow goes the way again; or the faulty row runs again
 */
export function robotScript(situation: RobotSituation): Script {
  const { stage, event, mode, way, parts, fault, faultBumps, lines, seconds } = situation;
  const { stepwise, waits, down, passes } = situation;
  const script = new Writer(seconds);

  const shadow = () => {
    for (let frame = 1; frame <= way; frame++) {
      script.beat(named(`shadow:${String(frame)}`)).wait(GHOST_MS);
    }
    return script.wait(PAUSE).beat(REST);
  };
  const run = (
    which: 'run' | 'fault' | 'down',
    frames: number,
    said?: { at: readonly number[]; line: string },
  ) => {
    let told = false;
    for (let frame = 1; frame <= frames; frame++) {
      script.beat(named(`${which}:${String(frame)}`));
      // A step sounds as the robot gets there; a step it could not take sounds like a soft knock instead.
      if (which === 'fault' && faultBumps && frame === frames) script.cue('off');
      else script.note(frame - 1, STEP_MS * 0.4);
      // What a bridge makes of a step is said as it happens, once, and the robot stands there while it is said.
      if (said && !told && said.at.includes(frame)) {
        told = true;
        script.say(said.line);
      }
      script.wait(STEP_MS);
    }
    return script;
  };
  // A longer plan, run by Glim a step at a time: two steps on, one back to show that it goes back too, and on.
  const stepped = () => {
    const order = Array.from({ length: way }, (_, at) => at + 1);
    if (way >= 3) order.splice(2, 0, 1, 2);
    let before = 0;
    for (const frame of order) {
      const by = frame > before ? 'on' : 'back';
      script.beat(named(`run:${String(frame)}:${by}`));
      if (by === 'on') script.note(frame - 1, STEP_MS * 0.4);
      else script.cue('tap');
      script.wait(STEP_MS);
      before = frame;
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
        if (stepwise || down > 0) {
          // There is more to show than the row being made, so it is made briskly, and the shadow does not go
          // first: the run that follows is the way.
          script.wait(PAUSE).beat({ show: 'do', parts: 0 });
          for (let part = 1; part <= parts; part++) {
            script
              .wait(BRISK_MS * 0.4)
              .beat({ show: 'do', parts: part })
              .cue('tap')
              .wait(BRISK_MS * 0.6);
          }
          script.wait(PAUSE * 2);
          if (stepwise) return stepped().wait(PAUSE).cue('same').end(SAME);
          // With the bridge up the robot waits for it. And once more with it down: the same steps, and the one
          // that waits has nothing to wait for.
          run('run', way, { at: waits, line: BRIDGE_LINES.waits }).wait(PAUSE * 2);
          script.beat(named('down:0')).wait(PAUSE * 2);
          return run('down', down, { at: passes, line: BRIDGE_LINES.passes })
            .wait(PAUSE)
            .cue('same')
            .end(SAME);
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
