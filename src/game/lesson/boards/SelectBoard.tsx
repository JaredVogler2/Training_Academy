import { useMemo, type CSSProperties } from 'react';
import { playCue, sayLine } from '@/audio';
import { writeTokens } from '@/engine';
import { ActionButton } from '@/ui/controls';
import { IconCheck, IconNext, IconPointer } from '@/ui/icons';
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
} from '../frame';
import { PAUSE, Writer, makingScript, type MakeSituation, type Script } from '../script';
import { lessonText } from '../text';
import { useScript } from '../useScript';
import lesson from '../Lesson.module.css';
import styles from './boards.module.css';

/** How long Glim leaves the things to remember in view when showing how the game goes. */
const STUDY_TIME = 2600;

/**
 * Where there are things to look at first and then put away, a demonstration shows that too: here they are, now
 * they are hidden, and these are the ones that were there.
 */
function selectScript(situation: MakeSituation, study: boolean, ask: string | null): Script {
  if (!study || situation.event !== 'new' || situation.stage !== 'demo') {
    return makingScript(situation);
  }
  const { parts, lines, seconds } = situation;
  const script = new Writer(seconds);
  script
    .wait(400)
    .say('lesson.watch')
    .beat({ show: 'glance' })
    .say(lines.instruction)
    .wait(STUDY_TIME)
    .beat({ show: 'do', parts: 0 });
  if (ask) script.say(ask);
  for (let part = 1; part <= parts; part++) {
    script
      .wait(PAUSE * 1.4)
      .beat({ show: 'do', parts: part })
      .note(part - 1)
      .wait(PAUSE * 1.4);
  }
  return script.wait(PAUSE).cue('same').end({ show: 'do', parts });
}

/**
 * Picking out the ones that belong: every card that does, and none that does not. A tap picks a card and another
 * tap puts it back; when the child thinks they have them all, they say so.
 *
 * Some of these are memory games: a few things are shown first, for as long as the child likes, and then put away,
 * and the cards are for saying which ones they were.
 */
export function SelectBoard({ state, runner, pack, module, paused, calm }: BoardProps) {
  const { view, feedback, answered } = state;
  const { challenge } = view;
  if (challenge.kind !== 'make' || challenge.task.type !== 'select') {
    throw new Error('SelectBoard was given something else to do.');
  }
  const { task } = challenge;
  const { Picture } = module;
  const demo = view.stage === 'demo';
  const revealed = !demo && view.shownAnswer !== null;
  const { asked, again, ask } = useAgain(view.stepIndex);
  const seconds = useSeconds();
  usePreparedLines(state);

  const study = task.study ?? null;
  const [work, setWork] = useStepState<{ picked: string[]; studied: boolean; judged: string }>(
    view.stepIndex,
    { picked: [], studied: false, judged: '' },
  );
  // After a wrong try, the cards that did belong stay picked and the others are put back.
  const kept = feedback?.outcome === 'incorrect' && work.judged !== view.key;
  const own = kept ? work.picked.filter((id) => feedback.right.includes(id)) : work.picked;
  const fixed = view.given;
  const picked = [...new Set([...fixed, ...own])];
  const studying = study !== null && !work.studied && !demo && !answered;

  const event = eventOf(state);
  const solution = demo && view.shownAnswer ? view.shownAnswer.split('-') : [];
  const script = useMemo(
    () =>
      selectScript(
        {
          stage: view.stage,
          event,
          again,
          parts: solution.length,
          sequence: [],
          lines: linesOf(state),
          seconds,
        },
        study !== null,
        task.ask ?? null,
      ),
    // `state` changes with every tap; the script depends only on what is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.key, view.hintsUsed, event, asked, seconds],
  );
  const run = `${view.key}/${String(view.hintsUsed)}/${event}/${String(asked)}`;
  const { beat } = useScript(script, run, !paused, calm);

  // In a demonstration Glim does the picking; what is shown is how far that has got.
  const shownPicked = demo
    ? beat.show === 'do'
      ? solution.slice(0, beat.parts)
      : beat.show === 'rest' || beat.show === 'glance'
        ? calm
          ? solution
          : []
        : solution
    : picked;
  const showingStudy = demo ? beat.show === 'glance' : studying;
  const same =
    beat.show === 'same' || (demo && beat.show === 'do' && beat.parts === solution.length);
  const { mood, aim } = useGuide(
    state,
    showingStudy ? 'prompt' : beat.show === 'do' ? 'answers' : null,
  );

  const busy = demo || answered || studying;
  const toggle = (id: string) => {
    if (busy || fixed.includes(id)) return;
    const has = picked.includes(id);
    // No more can be picked than there are to find; the count is part of what is being asked.
    if (!has && picked.length >= task.solution.length) return;
    playCue(has ? 'off' : 'tap');
    setWork({
      ...work,
      judged: view.key,
      picked: has ? picked.filter((other) => other !== id) : [...picked, id],
    });
  };

  const cardOf = (id: string) => task.cards.find((card) => card.id === id);
  const wanted = revealed && view.shownAnswer ? view.shownAnswer.split('-') : [];

  return (
    <>
      <div
        className={styles.select}
        data-count={view.cards.length}
        data-study={study !== null}
        data-testid="select-board"
        inert={paused}
      >
        {study !== null && (
          <div
            className={`${lesson.prompt ?? ''} ${styles.study ?? ''}`}
            data-covered={!showingStudy}
            data-same={same}
          >
            <span className="sr-only">
              {showingStudy
                ? study.map((id) => cardOf(id)?.label ?? id).join(', ')
                : lessonText.covered}
            </span>
            {/* Once they are put away they are not on the page at all, for any eye or any tool. */}
            {showingStudy && (
              <ul className={styles.studied} aria-hidden="true">
                {study.map((id, index) => {
                  const card = cardOf(id);
                  return (
                    <li key={id} style={{ '--order': index } as CSSProperties}>
                      {card && <Picture stimulus={card.stimulus} place="card" />}
                    </li>
                  );
                })}
              </ul>
            )}
            <span className={lesson.cover} aria-hidden="true" />
          </div>
        )}

        <ul className={styles.cards} data-count={view.cards.length} data-waiting={showingStudy}>
          {view.cards.map((id, index) => {
            const card = cardOf(id);
            if (!card) return null;
            const isPicked = shownPicked.includes(id);
            const isWanted = wanted.includes(id) && !isPicked;
            return (
              <li key={`${String(view.stepIndex)}-${id}`}>
                <button
                  type="button"
                  className={styles.card}
                  style={{ '--order': index } as CSSProperties}
                  data-card={id}
                  data-picked={isPicked}
                  data-fixed={fixed.includes(id)}
                  data-lit={isPicked && (same || answered)}
                  aria-label={showingStudy ? lessonText.turnedOver : card.label}
                  aria-pressed={isPicked}
                  aria-disabled={busy || fixed.includes(id)}
                  onClick={() => toggle(id)}
                >
                  {/*
                    While the things to remember are on show, the cards are blank: seeing what will be offered
                    would let them be compared, and that is not remembering.
                  */}
                  {!showingStudy && <Picture stimulus={card.stimulus} place="card" />}
                  {isPicked && (
                    <span className={lesson.tick} aria-hidden="true">
                      <IconCheck size={22} />
                    </span>
                  )}
                  {isWanted && (
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
        onAgain={ask}
        done={
          studying
            ? undefined
            : {
                ready: picked.length > 0,
                submit: () => {
                  setWork({ ...work, picked, judged: '' });
                  void runner.answer(writeTokens([...picked].sort()));
                },
              }
        }
      >
        {studying && (
          <ActionButton
            tone="sun"
            big
            className={lesson.done}
            icon={<IconNext size={32} />}
            onClick={() => {
              playCue('step');
              setWork({ ...work, studied: true });
              if (task.ask) sayLine(task.ask);
            }}
          >
            {lessonText.ready}
          </ActionButton>
        )}
      </Foot>
    </>
  );
}
