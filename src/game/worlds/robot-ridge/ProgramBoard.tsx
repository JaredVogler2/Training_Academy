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
import { Arrow, Loop, Scene } from './art';
import {
  HOLD_MS,
  STEP_MS,
  degreesOf,
  emptyTray,
  fixedBy,
  framesOf,
  liveStep,
  modeOf,
  oneMoreTime,
  placed,
  programOf,
  taken,
  trailOf,
  trayOf,
  withFixed,
  type Frame,
  type Tray,
} from './run';
import { robotScript, showingOf, showsTheWay, type RobotSituation } from './script';
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
  const demo = view.stage === 'demo';
  const revealed = !demo && view.shownAnswer !== null;
  const [asked, again] = useAgain();
  const seconds = useSeconds();
  usePreparedLines(state);

  // The answer, and the two runs there are to show: the way there, and the faulty row's way wrong.
  const answer = useMemo(() => parseProgram(task.solution), [task.solution]);
  const way = useMemo(() => framesOf(task, answer), [task, answer]);
  const fault = useMemo(
    () => (task.given === undefined ? null : framesOf(task, parseProgram(task.given))),
    [task],
  );
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
  const situation: RobotSituation = {
    stage: view.stage,
    event,
    again: asked > 0,
    mode,
    way: way.frames.length - 1,
    parts: mode === 'live' ? (answer?.commands.length ?? 0) : mode === 'mend' ? 1 : parts.length,
    fault: fault ? fault.frames.length - 1 : 0,
    faultBumps: fault?.frames.at(-1)?.bumped === true,
    lines: linesOf(state),
    seconds,
  };
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
  const stepping = own !== null && own.at < own.frames.length - 1;
  const handing = own !== null && !stepping && !own.handedIn;
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
      // A step sounds as it is taken; a step that could not be taken sounds like a soft knock instead.
      if (own.frames[own.at + 1]?.bumped === true) playCue('off');
      else playCount(own.at);
      setWork((now) => (now.run ? { ...now, run: { ...now.run, at: now.run.at + 1 } } : now));
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
    const whole = showing?.show === 'run' || beat.show === 'same';
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
  const shownRun = ((): { frames: Frame[]; at: number } => {
    const start = { frames: way.frames, at: 0 };
    const end = { frames: way.frames, at: way.frames.length - 1 };
    if (showing?.show === 'run') return { frames: way.frames, at: showing.frame };
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
    if (kept) return { frames: kept.frames, at: kept.at };
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
  const moving = kept !== null || showing?.show === 'run' || faulty;
  // Which place of the row the step the robot has just carried out is in: gaps are passed over, so it is counted.
  const filled = built.slots.flatMap((slot, place) => (slot === null ? [] : [place]));
  const stepPlace = moving && frame.step ? (filled[frame.step.index] ?? null) : null;
  // A step is lit while it is being carried out, and no longer: when a run is over, the last step done is not
  // "the one", and in a row to mend it is usually not the wrong one. A step the robot could not carry out is
  // marked, and stays marked.
  const carrying = running || showing?.show === 'run' || showing?.show === 'fault';
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

  /** The row changed by the child: whatever was being shown of an earlier run goes, and the robot is at the start. */
  const change = (tray: Tray) => {
    setWork({
      ...work,
      tray,
      mended: work.mended || revealed,
      run: null,
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

  const go = () => {
    if (busy || !program) return;
    playCue('step');
    setWork({
      ...work,
      tray: built,
      mended: work.mended || revealed,
      touched: run,
      hintsAt: view.hintsUsed,
      run: {
        frames: framesOf(task, program).frames,
        text: writeProgram(program),
        at: 0,
        handedIn: false,
        hints: view.hintsUsed,
        shown: revealed,
      },
    });
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
  const rocks = task.rocks.map(([column, row]) => `${String(column)},${String(row)}`).join(';');

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
        data-slots={task.slots}
        data-repeats={task.repeats}
        data-robot={`${String(frame.at[0])},${String(frame.at[1])},${frame.facing}`}
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
            })}{' '}
            {robotText.robotNow(frame.at, frame.facing)}
          </p>
          <p className="sr-only" role="status">
            {liveBump || (frame.bumped && !running) ? robotText.stopped : ''}
          </p>
          <Scene
            columns={task.grid.columns}
            rows={task.grid.rows}
            goal={task.goal}
            rocks={task.rocks}
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
        onAgain={again}
      >
        {mode !== 'live' && !demo && !answered && (
          <ActionButton
            tone="sun"
            big
            className={lesson.done}
            icon={<IconPlay size={32} />}
            disabled={program === null || running}
            data-ready={program !== null && !running}
            onClick={go}
          >
            {robotText.go}
          </ActionButton>
        )}
      </Foot>
    </>
  );
}
