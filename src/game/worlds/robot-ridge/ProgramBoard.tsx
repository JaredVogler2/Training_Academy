import { useEffect, useMemo, type CSSProperties } from 'react';
import { playCount, playCue } from '@/audio';
import { parseProgram, writeProgram, type Command } from '@/engine';
import {
  Foot,
  eventOf,
  linesOf,
  useAgain,
  useGuide,
  usePreparedLines,
  useSeconds,
  useStepState,
  type BoardProps,
} from '@/game/lesson/frame';
import { useScript } from '@/game/lesson/useScript';
import lesson from '@/game/lesson/Lesson.module.css';
import { ActionButton } from '@/ui/controls';
import { IconPlay, IconPointer } from '@/ui/icons';
import { Arrow, Loop, Scene, StepArrow, TakeOut, type BridgeShown } from './art';
import {
  HOLD_MS,
  STEP_MS,
  bridgeLies,
  carriedOver,
  degreesOf,
  emptyTray,
  fixedBy,
  framesOf,
  isFull,
  lastOpen,
  liveStep,
  modeOf,
  oneMoreTime,
  placed,
  programOf,
  runsOf,
  standingFor,
  taken,
  trailOf,
  trayOf,
  undone,
  withFixed,
  type Frame,
  type Tray,
} from './run';
import { robotScript, showingOf, showsTheWay, situationOf } from './script';
import { robotText } from './text';
import styles from './robotRidge.module.css';

/** How long the robot stays where it ran out of power before it is put back at the start (ms). */
export const REWIND_MS = 1700;

/** A run the child has set going: the frames of it, how far it has got, and whether it has been handed in. */
interface OwnRun {
  frames: Frame[];
  /** The program as it is written down: what is handed in when the run is over. */
  text: string;
  at: number;
  handedIn: boolean;
  /** How much help had been asked for when it was run, and whether the answer was being shown. */
  hints: number;
  shown: boolean;
  /** It goes on by itself, a step at a time ("Go"). Otherwise it is moved by hand, one step on or one back. */
  auto: boolean;
  /**
   * It is the run of a row with every place used. Of a longer plan only such a run is handed in; a row with
   * places still empty can be run and looked at, and is nobody's answer yet. (Every other row is whole as it is.)
   */
  whole: boolean;
  /** It has been carried out to its end, by "Go" or by hand, and is to be handed in. */
  over: boolean;
}

/** A run moved one frame on, or one back. Carried on to its end, the run of a whole row is over. */
function moved(run: OwnRun, by: 1 | -1): OwnRun {
  const last = run.frames.length - 1;
  const at = Math.max(0, Math.min(last, run.at + by));
  return { ...run, at, over: run.over || (by > 0 && run.whole && at === last) };
}

/**
 * The sound of the robot arriving at a frame: a soft knock where it could not go, a tap where it stands waiting,
 * and otherwise the next note up.
 */
function sound(frame: Frame | undefined, index: number): void {
  if (!frame) return;
  if (frame.bumped) playCue('off');
  else if (frame.waiting) playCue('tap');
  else playCount(index - 1);
}

interface Work {
  /** The row of steps, as the child has left it. */
  tray: Tray;
  /** The child has changed the row since the answer began to be shown. */
  mended: boolean;
  /** One tap at a time: the commands carried out so far, and the try they belong to. */
  live: { key: string; commands: Command[] };
  /** The last tap was stopped by a rock or the edge, and how many have been: each is its own small nudge. */
  bumped: boolean;
  bumps: number;
  run: OwnRun | null;
  /** The showing during which the child last changed the row or ran it, and how much help had been asked for. */
  touched: string;
  hintsAt: number;
  /** How many times an arrow has been tapped with no empty place for it: the row says "take one out first". */
  full: number;
}

const letterOf = (command: Command) => command.charAt(0);

/**
 * Telling a robot how to get to a star.
 *
 *   one tap at a time   each arrow is carried out as it is tapped. The robot has power for a few moves more than
 *                       the journey needs; an arrow it cannot carry out — into a rock, off the edge — costs
 *                       nothing and is not part of the journey.
 *   a plan              arrows go into a row, first empty place first; a tap on a step takes it out. "Go" runs the
 *                       row, a step at a time, and the run is what is handed in. A run that does not arrive stays
 *                       on the board, the robot where it stopped, until the row is changed.
 *   done again          the same, with a button that says how many times the row is done, in dots.
 *   to be mended        the same, with the row already filled in and one step of it wrong.
 *   a longer plan       a plan whose row is too long to press: small tiles, changed from the end, with a key that
 *                       takes the last step out. "Go" runs it; the two buttons beside the row run it a step at a
 *                       time, on and back, and the robot stays where the steps so far have taken it while more
 *                       are put in. The run of a full row, carried out to its end either way, is what is handed
 *                       in. A row with places still empty can be run and looked at, and is nobody's answer yet.
 *   over a bridge       a plan with one more arrow, three dots: wait. Nobody knows whether the bridge is up until
 *                       a run begins, and it is drawn going up and down. A program is judged with every bridge
 *                       up; one that works is then shown with the bridge as its journey says: up, to see the
 *                       robot wait for it, or down, to see the same step passed over.
 *
 * What moves is worked out by the engine's own interpreter (run.ts); this draws it and decides nothing.
 */
export function ProgramBoard({ state, runner, pack, paused, calm }: BoardProps) {
  const { view, feedback, answered } = state;
  const { challenge } = view;
  if (challenge.kind !== 'make' || challenge.task.type !== 'program') {
    throw new Error('ProgramBoard was given something else to do.');
  }
  const { task } = challenge;
  const mode = modeOf(task);
  const stepwise = task.stepwise === true;
  const demo = view.stage === 'demo';
  const revealed = !demo && view.shownAnswer !== null;
  const { asked, again, ask } = useAgain(view.stepIndex);
  const seconds = useSeconds();
  usePreparedLines(state);

  // The answer, and the runs there are to show: the way there (with every bridge up, where there are bridges, and
  // again with every bridge down), and the faulty row's way wrong.
  const runs = useMemo(() => runsOf(task), [task]);
  const { answer, way, down, fault } = runs;
  const parts = task.solution.split('-');
  const answerTray = trayOf(task.solution, task.slots);

  const [work, setWork] = useStepState<Work>(view.stepIndex, {
    tray: task.given === undefined ? emptyTray(task.slots) : trayOf(task.given, task.slots),
    mended: false,
    live: { key: view.key, commands: [] },
    bumped: false,
    bumps: 0,
    run: null,
    touched: '',
    hintsAt: view.hintsUsed,
    full: 0,
  });

  const event = eventOf(state);
  const situation = situationOf(task, runs, {
    stage: view.stage,
    event,
    again,
    lines: linesOf(state),
    seconds,
  });
  const script = useMemo(
    () => robotScript(situation),
    // `state` changes with every tap; the script depends only on what is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.key, view.hintsUsed, event, asked, seconds],
  );
  const run = `${view.key}/${String(view.hintsUsed)}/${event}/${String(asked)}`;
  const { beat } = useScript(script, run, !paused, calm);
  const showing = showingOf(beat);
  /** The faulty row is running, or has run and left the robot where it went astray. */
  const faulty = showing?.show === 'fault' || showing?.show === 'astray';

  // ---- The child's own run: a step at a time, then handed in ------------------------------------------------------
  const own = work.run;
  // Going on by itself; and over, with a moment to stand where it ended before it is handed in.
  const stepping = own !== null && own.auto && own.at < own.frames.length - 1;
  const handing = own !== null && own.over && !own.handedIn;
  const running = stepping || handing;
  // When it is over, the run stays on the board — the robot where it stopped — until help is asked for, or the
  // answer begins to be shown: either redraws the row, and a run belongs to the row that was run. (Changing the
  // row takes it away too; see `change`. Asking to be told again does not: where the robot stopped is what there
  // is to look at.)
  const kept =
    own !== null &&
    (running || answered || (own.hints === view.hintsUsed && own.shown === revealed))
      ? own
      : null;

  // A row to mend goes back to how it was given whenever the faulty row is run for the child — when it is first
  // asked about, when that is asked for again, and as help — and whenever more help is asked for: a run and a row
  // that did not match would explain nothing, and "this is the step to change" is about the row as it was given.
  // It stays that way until the child changes the row, or runs it.
  const asGiven =
    fault !== null &&
    !kept &&
    ((showingOf(script.settled)?.show === 'astray' && work.touched !== run) ||
      work.hintsAt !== view.hintsUsed);

  const ownAt = own?.at ?? 0;
  useEffect(() => {
    if (!own || !stepping || paused) return;
    const timer = window.setTimeout(() => {
      // A step sounds as it is taken.
      sound(own.frames[own.at + 1], own.at + 1);
      setWork((now) => (now.run ? { ...now, run: moved(now.run, 1) } : now));
    }, STEP_MS);
    return () => window.clearTimeout(timer);
    // One timer for each step: how far the run has got is what moves it on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepping, paused, ownAt]);

  const text = own?.text ?? '';
  useEffect(() => {
    if (!handing || paused) return;
    const timer = window.setTimeout(() => {
      setWork((now) => (now.run ? { ...now, run: { ...now.run, handedIn: true } } : now));
      void runner.answer(text);
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handing, paused, text, runner]);

  // ---- One tap at a time ------------------------------------------------------------------------------------------
  // After the power has run out, the robot stays where it stopped for a moment, and is then put back at the start.
  const spent =
    mode === 'live' &&
    !demo &&
    !answered &&
    work.live.key !== view.key &&
    work.live.commands.length > 0;
  const key = view.key;
  useEffect(() => {
    if (!spent) return;
    const timer = window.setTimeout(() => {
      setWork((now) => ({ ...now, live: { key, commands: [] }, bumped: false }));
    }, REWIND_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spent, key]);

  // ---- The row of steps, as it is to be drawn ---------------------------------------------------------------------
  const built = (() => {
    if (!demo) {
      const mine = asGiven ? trayOf(task.given ?? '', task.slots) : work.tray;
      // Where the answer is being shown, the steps that are not the answer's are taken out, and what belongs in
      // each empty place is drawn there faintly, until the child changes the row for themselves.
      const base =
        revealed && !work.mended
          ? {
              ...mine,
              slots: mine.slots.map((slot, place) =>
                slot === answerTray.slots[place] ? slot : null,
              ),
            }
          : mine;
      return withFixed(base, view.given);
    }
    // In a demonstration the row is as far along as Glim has got with it.
    const whole = showing?.show === 'run' || showing?.show === 'down' || beat.show === 'same';
    if (mode === 'mend') {
      const given = trayOf(task.given ?? task.solution, task.slots);
      if (showing?.show === 'pick') {
        // The wrong step is taken out: that is what "this one" looks like.
        return {
          ...given,
          slots: given.slots.map((slot, place) => (slot === answerTray.slots[place] ? slot : null)),
        };
      }
      return whole || (beat.show === 'do' && beat.parts >= 1) ? answerTray : given;
    }
    const done = beat.show === 'do' ? beat.parts : whole ? parts.length : 0;
    return withFixed(emptyTray(task.slots), parts.slice(0, done));
  })();
  const fixed = demo ? { times: null, commands: [] as Command[] } : fixedBy(view.given);
  const program = programOf(built);

  // ---- Where the robot is, and which run it is in the middle of ---------------------------------------------------
  // (`real`: it is a run, and not only the robot standing where it starts. How a bridge stands is known in a run.)
  const shownRun = ((): { frames: Frame[]; at: number; real?: true } => {
    const start = { frames: way.frames, at: 0 };
    const end = { frames: way.frames, at: way.frames.length - 1, real: true as const };
    if (showing?.show === 'run') return { frames: way.frames, at: showing.frame, real: true };
    if (showing?.show === 'down' && down) {
      return { frames: down.frames, at: showing.frame, real: true };
    }
    if (demo) {
      if (beat.show === 'same') return end;
      if (mode === 'live')
        return beat.show === 'do' ? { frames: way.frames, at: beat.parts } : start;
      if (fault && showing?.show === 'fault') return { frames: fault.frames, at: showing.frame };
      if (fault && showing?.show === 'pick') {
        return { frames: fault.frames, at: fault.frames.length - 1 };
      }
      return start;
    }
    if (mode === 'live') {
      const lived = framesOf(
        task,
        work.live.commands.length > 0 ? { times: 1, commands: work.live.commands } : null,
      );
      return { frames: lived.frames, at: lived.frames.length - 1 };
    }
    if (kept) return { frames: kept.frames, at: kept.at, real: true };
    // A faulty row runs, and the robot is left standing where it went astray, until the child begins to change it.
    if (fault && faulty && asGiven) return { frames: fault.frames, at: showing.frame };
    return start;
  })();
  const frame = shownRun.frames[shownRun.at] ?? way.frames[0];
  if (!frame) throw new Error('A journey has nowhere to start.');

  // The robot's shadow, going the way first. Where nothing moves, the whole way is marked instead.
  const wholeWay = calm && !demo && !kept && showsTheWay(situation);
  const shadow =
    showing?.show === 'shadow' && !kept
      ? { frames: way.frames, at: showing.frame }
      : wholeWay
        ? { frames: way.frames, at: way.frames.length - 1 }
        : null;
  const shadowFrame = shadow ? shadow.frames[shadow.at] : undefined;
  const trail = [
    ...(shownRun.at > 0 ? trailOf(shownRun.frames, shownRun.at) : []),
    ...(shadow ? trailOf(shadow.frames, shadow.at) : []),
  ].filter(
    (cell, index, all) =>
      all.findIndex((other) => other[0] === cell[0] && other[1] === cell[1]) === index,
  );

  const won = feedback?.outcome === 'correct' || (demo && beat.show === 'same');
  const liveBump = mode === 'live' && !demo && work.bumped;
  const moving = kept !== null || showing?.show === 'run' || showing?.show === 'down' || faulty;

  // The river and its bridges. Until a run begins nobody knows how a bridge stands.
  const lie = {
    columns: task.grid.columns,
    rows: task.grid.rows,
    rocks: task.rocks,
    water: task.water ?? [],
    bridges: task.bridges ?? [],
  };
  const bridges: BridgeShown[] = lie.bridges.map((at, index) => ({
    at,
    lies: bridgeLies(lie, at),
    state: shownRun.real !== true ? 'maybe' : frame.raised[index] === true ? 'up' : 'down',
  }));
  // Which place of the row the step the robot has just carried out is in: gaps are passed over, so it is counted.
  const filled = built.slots.flatMap((slot, place) => (slot === null ? [] : [place]));
  const stepPlace = moving && frame.step ? (filled[frame.step.index] ?? null) : null;
  // A step is lit while it is being carried out, and no longer: when a run is over, the last step done is not
  // "the one", and in a row to mend it is usually not the wrong one. A step the robot could not carry out is
  // marked, and stays marked.
  // (A longer plan that is part-way through by hand keeps its last step lit: that is what there is to look at.)
  const byHand =
    stepwise &&
    kept !== null &&
    !kept.auto &&
    kept.at > 0 &&
    !(kept.handedIn && kept.at === kept.frames.length - 1);
  const carrying =
    running ||
    byHand ||
    showing?.show === 'run' ||
    showing?.show === 'down' ||
    showing?.show === 'fault';
  const nowPlace = carrying && !frame.bumped ? stepPlace : null;
  const stoppedPlace = frame.bumped ? stepPlace : null;
  const round = carrying && frame.step ? frame.step.round : null;

  const { mood, aim } = useGuide(
    state,
    moving || shadow !== null || (demo && mode === 'live' && beat.show === 'do')
      ? 'prompt'
      : beat.show === 'do' || beat.show === 'ask'
        ? 'answers'
        : null,
  );

  // ---- What a tap does --------------------------------------------------------------------------------------------
  const busy = demo || answered || running;

  /** A run of a row, from its start. */
  const begin = (tray: Tray, auto: boolean): OwnRun | null => {
    const made = programOf(tray);
    if (!made) return null;
    return {
      frames: framesOf(task, made, standingFor(task, made)).frames,
      text: writeProgram(made),
      at: 0,
      handedIn: false,
      hints: view.hintsUsed,
      shown: revealed,
      auto,
      whole: !stepwise || isFull(tray),
      over: false,
    };
  };

  /**
   * The row changed by the child: whatever was being shown of an earlier run goes, and the robot is at the start.
   * A longer plan is changed from its end, and there the robot stays where the steps that are still in the row
   * have taken it.
   */
  const change = (tray: Tray) => {
    let carried: OwnRun | null = null;
    if (stepwise && kept) {
      const next = begin(tray, false);
      const before = parseProgram(kept.text)?.commands ?? [];
      const after = programOf(tray)?.commands ?? [];
      const at = next ? carriedOver(kept.at, before, after, next.frames) : 0;
      carried = next && at > 0 ? { ...next, at } : null;
    }
    setWork({
      ...work,
      tray,
      mended: work.mended || revealed,
      run: carried,
      touched: run,
      hintsAt: view.hintsUsed,
    });
  };

  const tapLive = (command: Command) => {
    if (busy || spent) return;
    const commands = work.live.key === view.key ? work.live.commands : [];
    const step = liveStep(task, commands, command);
    if (step.bumped) {
      playCue('off');
      setWork({ ...work, live: { key: view.key, commands }, bumped: true, bumps: work.bumps + 1 });
      return;
    }
    playCount(step.commands.length - 1);
    setWork({ ...work, live: { key: view.key, commands: step.commands }, bumped: false });
    // On the star, or out of power: either way the journey is over, and is handed in as it was made.
    if (step.arrived || step.spent) {
      void runner.answer(writeProgram({ times: 1, commands: step.commands }));
    }
  };

  const put = (command: Command) => {
    if (busy) return;
    const next = placed(built, command);
    if (!next) {
      // No empty place: the steps in the row stir, which is how they say "take one of us out first".
      playCue('off');
      setWork({ ...work, full: work.full + 1 });
      return;
    }
    playCue('tap');
    change(next);
  };

  const takeOut = (place: number) => {
    if (busy || place < fixed.commands.length || built.slots[place] === null) return;
    playCue('off');
    change(taken(built, place));
  };

  const oneMore = () => {
    if (busy || fixed.times !== null) return;
    playCue('tap');
    change(oneMoreTime(built, task.repeats));
  };

  /** The row as it is drawn becomes the row that was run, with this run of it. */
  const ran = (next: OwnRun | null) => {
    setWork({
      ...work,
      tray: built,
      mended: work.mended || revealed,
      touched: run,
      hintsAt: view.hintsUsed,
      run: next,
    });
  };

  const go = () => {
    if (busy || !program) return;
    playCue('step');
    ran(begin(built, true));
  };

  // ---- A longer plan: its last step taken out, and its run a step at a time -----------------------------------------
  const lastStep = stepwise ? lastOpen(built, fixed.commands.length) : -1;
  const takeLast = () => {
    const next = busy ? null : undone(built, fixed.commands.length);
    if (!next) return;
    playCue('off');
    change(next);
  };

  // One step on: there is a step not yet carried out; or the run of a full row stands at its end (it was stopped
  // there by a rock) and has not been handed in, and one more press says "that is my answer".
  const canStepOn =
    stepwise &&
    !busy &&
    program !== null &&
    (kept === null || kept.at < kept.frames.length - 1 || (kept.whole && !kept.handedIn));
  const stepOn = () => {
    if (!canStepOn) return;
    const from = kept ?? begin(built, false);
    if (!from) return;
    const next = moved({ ...from, auto: false }, 1);
    sound(next.frames[next.at], next.at);
    ran(next);
  };

  const canStepBack = stepwise && !busy && kept !== null && kept.at > 0;
  const stepBack = () => {
    if (!canStepBack) return;
    playCue('tap');
    setWork({ ...work, run: { ...kept, at: kept.at - 1, auto: false } });
  };

  // ---- Where the hand points, when the answer is being shown ------------------------------------------------------
  const firstGap = built.slots.indexOf(null);
  const tapped = work.live.key === view.key ? work.live.commands : [];
  // One tap at a time, the hand goes along the answer for as long as the child has kept to it.
  const onTheWay = tapped.every((command, index) => command === answer?.commands[index]);
  const wantedNext: Command | null =
    !revealed || busy || spent
      ? null
      : mode === 'live'
        ? onTheWay
          ? (answer?.commands[tapped.length] ?? null)
          : null
        : firstGap >= 0
          ? (answerTray.slots[firstGap] ?? null)
          : null;
  const wantedTimes = revealed && mode === 'again' && built.times !== answerTray.times;

  // In a demonstration, the arrow Glim is tapping, or the step Glim has just put in.
  const demoKey: Command | null = (() => {
    if (!demo || beat.show !== 'do' || beat.parts < 1) return null;
    if (mode === 'live') return answer?.commands[beat.parts - 1] ?? null;
    if (mode === 'mend') return null;
    const part = parts[beat.parts - 1] ?? '';
    return part.startsWith('x') ? null : (parseProgram(part)?.commands[0] ?? null);
  })();
  const demoAgain =
    demo && mode === 'again' && beat.show === 'do' && (parts[beat.parts - 1] ?? '').startsWith('x');

  const used = mode === 'live' ? (demo ? shownRun.at : shownRun.frames.length - 1) : 0;
  const squares = (list: readonly (readonly [number, number])[]) =>
    list.map(([column, row]) => `${String(column)},${String(row)}`).join(';');
  const rocks = squares(task.rocks);
  // A longer row is two lines of tiles where one line of them would be too small to make out.
  const perLine = task.slots > 5 ? Math.ceil(task.slots / 2) : task.slots;
  // What Glim says of the bridge stays written while the rest of that run is shown.
  const [firstWait] = situation.waits;
  const [firstPass] = situation.passes;
  const said =
    !demo || !showing
      ? undefined
      : showing.show === 'run' && firstWait !== undefined && showing.frame >= firstWait
        ? robotText.waits
        : showing.show === 'down' && firstPass !== undefined && showing.frame >= firstPass
          ? robotText.passes
          : undefined;

  return (
    <>
      <div
        className={styles.board}
        data-testid="program-board"
        data-mode={mode}
        data-columns={task.grid.columns}
        data-rows={task.grid.rows}
        data-start={`${String(task.start.at[0])},${String(task.start.at[1])},${task.start.facing}`}
        data-goal={`${String(task.goal[0])},${String(task.goal[1])}`}
        data-rocks={rocks}
        data-water={task.water ? squares(task.water) : undefined}
        data-bridges={task.bridges ? squares(task.bridges) : undefined}
        data-raised={task.bridges ? bridges.map((bridge) => bridge.state).join(',') : undefined}
        data-slots={task.slots}
        data-repeats={task.repeats}
        data-stepwise={stepwise || undefined}
        data-at={stepwise ? (kept?.at ?? 0) : undefined}
        data-robot={`${String(frame.at[0])},${String(frame.at[1])},${frame.facing}`}
        data-waiting={frame.waiting || undefined}
        data-running={running}
        inert={paused}
      >
        <div className={styles.ground} data-won={won}>
          <p className="sr-only">
            {robotText.journey({
              columns: task.grid.columns,
              rows: task.grid.rows,
              start: task.start.at,
              facing: task.start.facing,
              goal: task.goal,
              rocks: task.rocks,
              water: lie.water,
              bridges,
            })}{' '}
            {robotText.robotNow(frame.at, frame.facing)}
          </p>
          <p className="sr-only" role="status">
            {liveBump || (frame.bumped && !running)
              ? robotText.stopped
              : frame.waiting
                ? robotText.waits
                : ''}
          </p>
          <Scene
            columns={task.grid.columns}
            rows={task.grid.rows}
            goal={task.goal}
            rocks={task.rocks}
            water={lie.water}
            bridges={bridges}
            waiting={frame.waiting}
            robot={{ at: frame.at, degrees: degreesOf(task, frame) }}
            ghost={
              shadowFrame ? { at: shadowFrame.at, degrees: degreesOf(task, shadowFrame) } : null
            }
            trail={trail}
            bumped={liveBump || frame.bumped}
            bumpKey={liveBump ? work.bumps : shownRun.at}
            won={won}
          />
        </div>

        {mode === 'live' ? (
          <div
            className={styles.power}
            role="img"
            aria-label={robotText.power(task.slots - used)}
            data-left={task.slots - used}
          >
            {Array.from({ length: task.slots }, (_, cell) => (
              <i key={cell} data-spent={cell >= task.slots - used} />
            ))}
          </div>
        ) : stepwise ? (
          <div className={styles.tray} data-stepwise="true">
            <button
              type="button"
              className={styles.stepKey}
              data-step="back"
              data-now={demo && showing?.show === 'run' && showing.by === 'back'}
              aria-label={robotText.stepBack}
              aria-disabled={!canStepBack}
              onClick={stepBack}
            >
              <StepArrow back />
            </button>
            <ol
              className={styles.strip}
              aria-label={robotText.steps}
              style={{ '--per-line': perLine, '--all': task.slots } as CSSProperties}
            >
              {built.slots.map((slot, place) => {
                const wanted = revealed && slot === null ? (answerTray.slots[place] ?? null) : null;
                return (
                  <li
                    key={place}
                    className={styles.tile}
                    data-tile={place}
                    data-command={slot ?? undefined}
                    data-filled={slot !== null}
                    data-fixed={!demo && place < fixed.commands.length}
                    data-now={nowPlace === place}
                    data-stopped={stoppedPlace === place}
                  >
                    <span className="sr-only">{robotText.tile(place + 1, slot)}</span>
                    {slot !== null ? (
                      <Arrow command={slot} />
                    ) : (
                      wanted !== null && <Arrow command={wanted} className={styles.wanted} />
                    )}
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              className={styles.stepKey}
              data-step="on"
              data-now={demo && showing?.show === 'run' && showing.by === 'on'}
              aria-label={robotText.stepOn}
              aria-disabled={!canStepOn}
              onClick={stepOn}
            >
              <StepArrow />
            </button>
          </div>
        ) : (
          <div
            className={styles.tray}
            data-again={mode === 'again'}
            // Four steps and the "again" button side by side: on a narrow screen the button gives up some width.
            data-crowded={mode === 'again' && task.slots > 3}
          >
            <ol
              className={styles.slots}
              aria-label={robotText.steps}
              // Two names for one stir, taken in turn, so that each tap sets it off afresh.
              data-full={work.full === 0 || demo ? undefined : work.full % 2 === 0 ? 'a' : 'b'}
            >
              {built.slots.map((slot, place) => {
                const locked = !demo && place < fixed.commands.length;
                const wanted = revealed && slot === null ? (answerTray.slots[place] ?? null) : null;
                return (
                  <li key={place}>
                    <button
                      type="button"
                      className={styles.slot}
                      data-slot={place}
                      data-command={slot ?? undefined}
                      data-filled={slot !== null}
                      data-fixed={locked}
                      data-now={nowPlace === place}
                      data-stopped={stoppedPlace === place}
                      aria-label={
                        slot !== null && locked
                          ? robotText.fixedStep(place + 1, slot)
                          : robotText.step(place + 1, slot)
                      }
                      aria-disabled={busy || locked || slot === null}
                      onClick={() => takeOut(place)}
                    >
                      {slot !== null ? (
                        <Arrow command={slot} />
                      ) : (
                        wanted !== null && <Arrow command={wanted} className={styles.wanted} />
                      )}
                      {demo && showing?.show === 'pick' && slot === null && (
                        <span className={lesson.pointer} aria-hidden="true">
                          <IconPointer size={44} />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
            {mode === 'again' && (
              <button
                type="button"
                className={styles.again}
                data-times={built.times}
                data-fixed={fixed.times !== null}
                data-now={demoAgain}
                aria-label={
                  fixed.times !== null
                    ? robotText.againFixed(built.times)
                    : robotText.again(built.times, task.repeats)
                }
                aria-disabled={busy || fixed.times !== null}
                onClick={oneMore}
              >
                <Loop />
                <span className={styles.times} aria-hidden="true">
                  {Array.from({ length: task.repeats }, (_, dot) => (
                    <i
                      key={dot}
                      data-on={dot < built.times}
                      data-now={round === dot}
                      data-wanted={wantedTimes && dot < answerTray.times}
                    />
                  ))}
                </span>
                {wantedTimes && !busy && firstGap < 0 && (
                  <span className={lesson.pointer} aria-hidden="true">
                    <IconPointer size={44} />
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        <div className={styles.palette} role="group" aria-label={robotText.arrows}>
          {task.commands.map((command, index) => {
            const full = mode !== 'live' && firstGap < 0;
            const waiting = busy || spent || full;
            return (
              <button
                key={command}
                type="button"
                className={styles.key}
                style={{ '--order': index } as CSSProperties}
                data-key={letterOf(command)}
                data-asking={beat.show === 'ask' && !waiting}
                data-now={demoKey === command}
                aria-label={robotText.command(command)}
                aria-disabled={waiting}
                onClick={() => (mode === 'live' ? tapLive(command) : put(command))}
              >
                <Arrow command={command} />
                {wantedNext === command && !waiting && (
                  <span className={lesson.pointer} aria-hidden="true">
                    <IconPointer size={44} />
                  </span>
                )}
              </button>
            );
          })}
          {/* A longer plan's row is not pressed: this takes its last step out. Tapped with no room in the row, an
              arrow makes this stir, which is how the row says "take one out first". */}
          {stepwise && (
            <button
              type="button"
              className={`${styles.key} ${styles.takeOut}`}
              style={{ '--order': task.commands.length } as CSSProperties}
              data-key="out"
              data-stir={work.full === 0 || demo ? undefined : work.full % 2 === 0 ? 'a' : 'b'}
              aria-label={robotText.takeOut}
              aria-disabled={busy || lastStep < 0}
              onClick={takeLast}
            >
              <TakeOut />
            </button>
          )}
        </div>
      </div>

      <Foot
        state={state}
        runner={runner}
        pack={pack}
        paused={paused}
        mood={mood}
        aim={aim}
        after={calm ? 0 : script.length}
        onAgain={ask}
        caption={said}
      >
        {mode !== 'live' && !demo && !answered && (
          <ActionButton
            tone="sun"
            big
            className={lesson.done}
            icon={<IconPlay size={32} />}
            disabled={program === null || running}
            // A longer plan is ready when its row is full: until then "Go" only shows how far it gets.
            data-ready={program !== null && !running && (!stepwise || isFull(built))}
            onClick={go}
          >
            {robotText.go}
          </ActionButton>
        )}
      </Foot>
    </>
  );
}
