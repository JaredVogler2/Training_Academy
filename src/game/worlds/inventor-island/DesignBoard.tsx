import { useEffect, useMemo } from 'react';
import { playCue } from '@/audio';
import { designOf, startingDesign, writeTokens, type Setup } from '@/engine';
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
import { OptionPicture, SceneView, type Phase } from './scenes';
import { mendScript } from './script';
import { CONTROL_NAMES, benchText, describeSetup, optionName } from './words';
import styles from './inventor.module.css';

/**
 * A workbench. A thing that does not work is on it — a bridge that sags, a beam that tips — with the parts of it
 * that can be changed laid out underneath, each value a picture to tap. The child changes a part, presses test,
 * and watches what the model says happens. If it still does not work it is left exactly as it is, to change again.
 *
 * The trouble is shown first, for nothing: watching the thing fail as it was handed over is where mending starts,
 * and is not a try. After that a test is a try, and the test button waits until something has been changed since
 * the last one — so that every test is a test of a change.
 *
 * The board decides nothing. It draws the design, hands it to the engine as it stands, and plays what comes back.
 */
export function DesignBoard({ state, runner, pack, paused, calm }: BoardProps) {
  const { view, feedback, answered, picked } = state;
  const { challenge } = view;
  if (challenge.kind !== 'make' || challenge.task.type !== 'design') {
    throw new Error('DesignBoard was given something else to do.');
  }
  const { task } = challenge;
  const demo = view.stage === 'demo';
  const { asked, again, ask } = useAgain(view.stepIndex);
  const seconds = useSeconds();
  usePreparedLines(state);

  const start = useMemo(() => startingDesign(task), [task]);
  // The answer, where the engine is showing it: a demonstration, or after a reveal.
  const answer = view.shownAnswer === null ? null : designOf(view.shownAnswer);
  const revealed = !demo && answer !== null;
  // What a hint has set is in place from then on, and stays.
  const given = view.given;

  const [work, setWork] = useStepState<{ design: string[] | null; watched: string }>(
    view.stepIndex,
    { design: null, watched: '' },
  );
  const design = (work.design ?? start).map((option, index) => given[index] ?? option);
  const written = writeTokens(design);
  // The design that was last handed in, if one has been since this step began.
  const tested = feedback ? picked : null;
  const untouched = written === writeTokens(start);

  const event = eventOf(state);
  const script = useMemo(
    () =>
      mendScript({
        stage: view.stage,
        event,
        again,
        untouched,
        parts: task.controls.length,
        changes: (answer ?? []).flatMap((option, index) =>
          option === start[index] ? [] : index + 1,
        ),
        lines: linesOf(state),
        seconds,
      }),
    // `state` changes with every tap; the script depends only on what is listed. Whether the design has been
    // touched is read when a step, a test or a hint begins, and not again: changing a part must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.key, view.hintsUsed, event, asked, seconds],
  );
  const run = `${view.key}/${String(view.hintsUsed)}/${event}/${String(asked)}`;
  const { beat } = useScript(script, run, !paused, calm);

  const testing = beat.show === 'count';
  const showingTrouble = testing && beat.group === 'start';
  useEffect(() => {
    if (testing && !showingTrouble) setWork((before) => ({ ...before, watched: run }));
    // Only a test starting is of interest here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testing, showingTrouble, run]);

  // What is on the bench just now, and which face of it.
  let shown = design;
  let phase: Phase = 'before';
  if (demo) {
    // Glim mends it: first the trouble, then one part at a time, then the test. Once the mended design has
    // been put to the test it stays mended, and stays where it came to rest.
    const mended =
      calm || beat.show === 'same' || (testing && !showingTrouble) || work.watched === run;
    const done = mended ? task.controls.length : beat.show === 'do' ? beat.parts : 0;
    shown = start.map((option, index) => (index < done ? (answer?.[index] ?? option) : option));
    phase = testing ? 'testing' : mended ? 'after' : 'before';
  } else if (showingTrouble) {
    // The trouble is only shown while the design is still as it was handed over.
    if (untouched) phase = 'testing';
  } else if (testing && tested !== null) {
    shown = designOf(tested);
    phase = 'testing';
  } else if (tested !== null && tested === written && (work.watched === run || calm)) {
    // Tested, and not changed since: it stays as it came to rest.
    phase = 'after';
  } else if (calm && untouched && tested === null) {
    // Where nothing moves, the trouble is shown standing still: the thing as it is after it has failed.
    phase = 'after';
  }
  const onBench: Record<string, string | number> = { ...task.given };
  task.controls.forEach((control, index) => {
    onBench[control.id] = shown[index] ?? '';
  });
  const setup: Setup = onBench;

  const works = beat.show === 'same' || (answered && phase === 'after');
  const { mood, aim } = useGuide(state, testing ? 'prompt' : beat.show === 'do' ? 'answers' : null);

  const busy = demo || answered || (testing && !showingTrouble);
  // Every test is a test of a change: of the design as handed over, or of the one last tested.
  const changed = written !== (tested ?? writeTokens(start));
  const choose = (index: number, option: string) => {
    if (busy || index < given.length || design[index] === option) return;
    playCue('tap');
    setWork((before) => ({
      ...before,
      design: design.map((current, at) => (at === index ? option : current)),
    }));
  };

  return (
    <>
      <div
        className={styles.bench}
        data-bench={task.model}
        data-testid="design-board"
        inert={paused}
      >
        <div className={styles.stage} data-works={works}>
          <span className="sr-only">{describeSetup(task.model, setup)}</span>
          <SceneView scene={task.model} setup={setup} phase={phase} />
        </div>

        <div className={styles.controls}>
          {task.controls.map((control, index) => {
            const fixed = index < given.length && !demo;
            // In a demonstration the hand is on the part Glim is changing; after a reveal, on every part that
            // is not yet as it should be.
            const pointedAt =
              answer === null
                ? null
                : demo
                  ? beat.show === 'do' && beat.parts === index + 1
                    ? answer[index]
                    : null
                  : revealed && !answered && shown[index] !== answer[index]
                    ? answer[index]
                    : null;
            return (
              <div
                key={control.id}
                className={styles.control}
                role="group"
                aria-label={CONTROL_NAMES[control.id] ?? control.id}
                data-control={control.id}
              >
                {control.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={styles.part}
                    data-option={option}
                    data-given={fixed && shown[index] === option}
                    aria-label={optionName(control.id, option)}
                    aria-pressed={shown[index] === option}
                    aria-disabled={busy || fixed}
                    onClick={() => choose(index, option)}
                  >
                    <OptionPicture control={control.id} option={option} />
                    {pointedAt === option && (
                      <span className={lesson.pointer} aria-hidden="true">
                        <IconPointer size={40} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
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
        onAgain={ask}
      >
        {!demo && !answered && (
          <ActionButton
            tone="sun"
            big
            className={lesson.done}
            icon={<IconPlay size={30} />}
            disabled={busy || !changed}
            data-ready={changed && !busy}
            aria-describedby={changed ? undefined : 'bench-waits'}
            onClick={() => {
              playCue('step');
              void runner.answer(written);
            }}
          >
            {benchText.test}
          </ActionButton>
        )}
      </Foot>
      {!demo && !answered && !changed && (
        <p id="bench-waits" className="sr-only">
          {benchText.changeFirst}
        </p>
      )}
    </>
  );
}
