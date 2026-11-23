import { useEffect, useMemo, type CSSProperties } from 'react';
import type { Setup } from '@/engine';
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
import { IconCheck, IconPointer } from '@/ui/icons';
import { SceneView, type Phase } from './scenes';
import { guessScript } from './script';
import { benchText, describeSetup } from './words';
import styles from './inventor.module.css';

/** A scene's set-up, without the word for how it turned out. */
export function setupOf(of: Readonly<Record<string, unknown>>): Setup {
  const setup: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(of)) {
    if (key !== 'shown' && (typeof value === 'string' || typeof value === 'number')) {
      setup[key] = value;
    }
  }
  return setup;
}

/** A thought: three bubbles, growing. The mark on the picture a child picked as their guess. */
function Thought() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <circle cx="5" cy="19" r="1.800" fill="currentColor" />
      <circle cx="9" cy="14.500" r="2.800" fill="currentColor" />
      <circle cx="15.500" cy="8.500" r="5.500" fill="currentColor" />
    </svg>
  );
}

/**
 * What will happen? A set-up is shown, with a picture of each way it could turn out. The child picks one — their
 * guess — and the set-up is tested there and then, on the screen: finding out is the answer.
 *
 * A guess that comes true is lit together with what happened. One that does not is kept, marked as the guess,
 * while the child taps the picture of what did happen: they have just watched it. Nothing is called wrong, because
 * a guess is not wrong for being a guess; it is recorded as it is, and only a guess that came true at the first
 * try, with no help, counts as knowing.
 */
export function GuessBoard({ state, runner, pack, paused, calm }: BoardProps) {
  const { view, answered, picked } = state;
  const { challenge } = view;
  if (challenge.kind !== 'choose-one' || challenge.prompt.stimulus.type !== 'scene') {
    throw new Error('GuessBoard was given something else to do.');
  }
  const { scene, of } = challenge.prompt.stimulus;
  const setup = useMemo(() => setupOf(of), [of]);
  const demo = view.stage === 'demo';
  const [asked, again] = useAgain();
  const seconds = useSeconds();
  usePreparedLines(state);

  // The right picture, only where the engine is showing it: a demonstration, a reveal, or an answer given.
  const shown = view.shownAnswer ?? (answered ? picked : null);
  const revealed = !demo && view.shownAnswer !== null;
  // Whether the test has been watched before now, as far as the engine can say.
  const seenBefore = view.tryIndex > 0 || revealed;
  const event = eventOf(state);

  // What the child has picked on this step, first to last; and the run of the script in which the test was watched.
  const [work, setWork] = useStepState<{ guesses: string[]; watched: string }>(view.stepIndex, {
    guesses: [],
    watched: '',
  });

  const script = useMemo(
    () =>
      guessScript({
        stage: view.stage,
        event,
        again: asked > 0,
        seen: seenBefore,
        answer: demo ? shown : null,
        lines: { ...linesOf(state), outcome: challenge.feedback.correct },
        seconds,
      }),
    // `state` changes with every tap; the script depends only on what is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.key, view.hintsUsed, event, seenBefore, shown, asked, seconds],
  );
  const run = `${view.key}/${String(view.hintsUsed)}/${event}/${String(asked)}`;
  const { beat } = useScript(script, run, !paused, calm);

  const testing = beat.show === 'count';
  useEffect(() => {
    if (testing) setWork((before) => ({ ...before, watched: run }));
    // Only the test starting is of interest here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testing, run]);

  // The set-up stands as it was until its test has been played; after that it stays as it came to rest. Where
  // nothing moves, what the engine has already said happened is simply shown.
  const tests = script.moments.some((moment) => moment.beat?.show === 'count');
  const known = answered || seenBefore;
  const phase: Phase = testing
    ? 'testing'
    : work.watched === run || (calm && (known || demo)) || (known && !tests)
      ? 'after'
      : 'before';

  // In a demonstration Glim guesses before the test: from then on, that picture carries the guess.
  const guessed =
    demo &&
    (calm ||
      beat.show === 'same' ||
      testing ||
      (beat.show === 'name' && beat.which === shown) ||
      work.watched === run);
  const lit = beat.show === 'same' || (calm && (demo || answered));
  const { mood, aim } = useGuide(
    state,
    testing || (beat.show === 'name' && beat.which === 'prompt')
      ? 'prompt'
      : beat.show === 'ask' || beat.show === 'name'
        ? 'answers'
        : null,
  );

  return (
    <>
      <div
        className={lesson.board}
        data-count={view.choices.length}
        data-prompt="scene"
        data-testid="guess-board"
        inert={paused}
      >
        <div
          className={lesson.prompt}
          data-same={lit}
          data-asking={beat.show === 'ask'}
          data-named={beat.show === 'name' && beat.which === 'prompt'}
        >
          <span className="sr-only">{describeSetup(scene, setup)}</span>
          <SceneView scene={scene} setup={setup} phase={phase} />
        </div>

        <ul className={lesson.choices} data-count={view.choices.length}>
          {view.choices.map(({ choice, available }, index) => {
            const isAnswer = shown === choice.id;
            const wasGuessed = work.guesses.includes(choice.id);
            // The answer is marked once it is known and the test is over; in a demonstration, once Glim has guessed.
            const marked = isAnswer && (demo ? guessed : answered);
            const look =
              marked && (lit || answered)
                ? 'same'
                : available
                  ? 'open'
                  : wasGuessed
                    ? 'tried'
                    : 'away';
            const waiting = !available || answered || demo || testing;
            // The hand points at Glim's guess, or at what happened once it has been watched; never during a test,
            // when the thing to look at is the test.
            const pointed =
              isAnswer &&
              !answered &&
              !testing &&
              (demo ? guessed && !lit : revealed && phase === 'after');
            const isGuess = work.guesses[0] === choice.id || (demo && guessed && isAnswer);
            const outcome = choice.stimulus.type === 'scene' ? choice.stimulus.of.shown : undefined;
            return (
              <li key={`${String(view.stepIndex)}-${choice.id}`}>
                <button
                  type="button"
                  className={lesson.choice}
                  style={{ '--order': index } as CSSProperties}
                  data-state={look}
                  data-choice={choice.id}
                  data-shown={typeof outcome === 'string' ? outcome : undefined}
                  data-lit={marked && lit}
                  data-asking={beat.show === 'ask' && available}
                  data-guess={isGuess}
                  aria-label={isGuess ? `${choice.label} (${benchText.guess})` : choice.label}
                  aria-disabled={waiting}
                  onClick={() => {
                    if (waiting) return;
                    setWork((before) => ({ ...before, guesses: [...before.guesses, choice.id] }));
                    void runner.answer(choice.id);
                  }}
                >
                  <SceneView
                    scene={scene}
                    setup={setup}
                    phase="after"
                    outcome={typeof outcome === 'string' ? outcome : undefined}
                  />
                  {isGuess && (
                    <span className={styles.guess} aria-hidden="true">
                      <Thought />
                    </span>
                  )}
                  {marked && (lit || answered) && (
                    <span className={lesson.tick} aria-hidden="true">
                      <IconCheck size={22} />
                    </span>
                  )}
                  {pointed && (
                    <span className={lesson.pointer} aria-hidden="true">
                      <IconPointer size={44} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
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
      />
    </>
  );
}
