import { useMemo, type CSSProperties } from 'react';
import { IconCheck, IconPointer } from '@/ui/icons';
import {
  Foot,
  eventOf,
  linesOf,
  useAgain,
  useGuide,
  usePreparedLines,
  useSeconds,
  type BoardProps,
} from '../frame';
import { pointingScript, type ChooseSituation } from '../script';
import { lessonText } from '../text';
import { useScript } from '../useScript';
import styles from '../Lesson.module.css';

/**
 * A question with choices: what is asked about at the top, the choices below it. One tap answers.
 *
 * What is shown off — the demonstration, the question being put, what follows an answer — is a script written by
 * the world the question belongs to (counting, in Number Garden; saying the words, in Reading Cove). This board
 * plays it: it lifts, counts, lights and covers whatever the script names.
 */
export function ChooseBoard({ state, runner, pack, module, paused, calm }: BoardProps) {
  const { view, feedback, answered, picked } = state;
  const { challenge } = view;
  if (challenge.kind !== 'choose-one') throw new Error('ChooseBoard was given a thing to make.');
  const { Picture } = module;
  const demo = view.stage === 'demo';
  const glance = challenge.prompt.glance === true;
  const [asked, again] = useAgain();
  const seconds = useSeconds();
  usePreparedLines(state);

  // The right choice, only where the engine is showing it: a demonstration, a reveal, or an answer already given.
  const shown = view.shownAnswer ?? (answered ? picked : null);
  const tried = feedback?.outcome === 'incorrect' ? picked : null;
  const revealed = !demo && view.shownAnswer !== null;
  const event = eventOf(state);

  const situation = useMemo((): ChooseSituation => {
    const find = (id: string | null) => {
      const found = view.choices.find(({ choice }) => choice.id === id)?.choice;
      return found ? { id: found.id, stimulus: found.stimulus } : null;
    };
    return {
      stage: view.stage,
      event,
      prompt: challenge.prompt.stimulus,
      glance,
      again: asked > 0,
      choices: view.choices
        .filter(({ available }) => available)
        .map(({ choice }) => ({ id: choice.id, stimulus: choice.stimulus })),
      answer: find(shown),
      tried: find(tried),
      revealed,
      lines: linesOf(state),
      seconds,
    };
    // `state` changes with every tap; the script depends only on what is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.key, view.hintsUsed, event, shown, tried, revealed, asked, seconds]);
  const script = useMemo(
    () => (module.chooseScript ?? pointingScript)(situation),
    [module, situation],
  );
  const run = `${view.key}/${String(view.hintsUsed)}/${event}/${String(asked)}`;
  const { beat, turn } = useScript(script, run, !paused, calm, glance);

  /** Whether the script is, at this moment, counting the picture in this place. */
  const counting = (role: 'prompt' | 'answer' | 'tried', id?: string) =>
    beat.show === 'count' && (beat.group === role || (id !== undefined && beat.group === id));
  const named = (which: string) => beat.show === 'name' && beat.which === which;

  const pointing =
    beat.show === 'count'
      ? beat.group === 'prompt'
        ? 'prompt'
        : 'answers'
      : beat.show === 'name'
        ? beat.which === 'prompt'
          ? 'prompt'
          : 'answers'
        : beat.show === 'ask'
          ? 'answers'
          : beat.show === 'glance'
            ? 'prompt'
            : null;
  const { mood, aim } = useGuide(state, pointing);

  // What was asked about and its answer are lit together when the script says so (at once, where nothing moves).
  const same = beat.show === 'same';
  // In a demonstration the answer is not pointed out until the showing gets to it. (Where nothing moves, it is
  // simply shown.)
  const reached =
    !demo ||
    calm ||
    same ||
    (beat.show === 'count' && beat.group === 'answer') ||
    (beat.show === 'name' && beat.which === shown) ||
    asked > 0;
  // After a wrong answer the choice that was tried stays where it is until the script has dealt with it; only
  // then is it set aside. (Where nothing moves, it is set aside at once.)
  const comparing = !calm && (turn === 0 || (beat.show === 'count' && beat.group !== 'answer'));

  // A group to be taken in at a glance lies covered except while it is being looked at or counted. While it is
  // uncovered for a look, the choices are turned away: seeing how many is not the same as matching by eye.
  const covered =
    glance && !answered && (beat.show === 'rest' || beat.show === 'ask' || beat.show === 'name');
  const turnedAway = glance && beat.show === 'glance';

  const stimulus = challenge.prompt.stimulus;
  return (
    <>
      <div
        className={styles.board}
        data-count={view.choices.length}
        data-prompt={stimulus.type}
        inert={paused}
      >
        <div
          className={styles.prompt}
          data-same={same}
          data-asking={beat.show === 'ask'}
          data-named={named('prompt')}
          data-covered={covered}
          data-glance={glance || undefined}
        >
          <span className="sr-only">
            {covered ? lessonText.covered : module.describe(stimulus, 'prompt')}
          </span>
          {/* Re-keyed whenever it is this picture's turn, so its counting starts from the first thing. */}
          <Picture
            key={counting('prompt') ? `count-${String(turn)}` : 'still'}
            stimulus={stimulus}
            counting={counting('prompt')}
            place="prompt"
            sounding={named('prompt')}
            onAgain={again}
          />
          {glance && <span className={styles.cover} aria-hidden="true" />}
        </div>

        <ul className={styles.choices} data-count={view.choices.length}>
          {view.choices.map(({ choice, available }, index) => {
            const isAnswer = shown === choice.id && reached;
            const isTried = tried === choice.id;
            const held = isTried && comparing;
            const look = isAnswer ? 'same' : available ? 'open' : held ? 'tried' : 'away';
            const hopping =
              (isAnswer && counting('answer')) ||
              (isTried && counting('tried')) ||
              (beat.show === 'count' && beat.group === choice.id);
            const waiting = !available || answered || demo || turnedAway;
            return (
              // Keyed by step, so a new question gets new cards instead of morphing the old ones.
              <li key={`${String(view.stepIndex)}-${choice.id}`}>
                <button
                  type="button"
                  className={styles.choice}
                  style={{ '--order': index } as CSSProperties}
                  data-state={look}
                  data-choice={choice.id}
                  data-lit={isAnswer && same}
                  data-asking={beat.show === 'ask' && available}
                  data-named={named(choice.id)}
                  data-comparing={isTried && counting('tried')}
                  data-just-tried={isTried && !held}
                  data-turned-away={turnedAway}
                  aria-label={choice.label}
                  aria-disabled={waiting}
                  onClick={() => {
                    if (waiting) return;
                    void runner.answer(choice.id);
                  }}
                >
                  <Picture
                    key={hopping ? `count-${String(turn)}` : 'still'}
                    stimulus={choice.stimulus}
                    counting={hopping}
                    place="choice"
                    sounding={named(choice.id)}
                  />
                  {isAnswer && answered && (
                    <span className={styles.tick} aria-hidden="true">
                      <IconCheck size={22} />
                    </span>
                  )}
                  {isAnswer && !answered && (
                    <span className={styles.pointer} aria-hidden="true">
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
