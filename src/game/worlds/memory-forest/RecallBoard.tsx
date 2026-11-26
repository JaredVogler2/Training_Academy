import { useMemo, type CSSProperties } from 'react';
import { playCue, sayLine } from '@/audio';
import { packText } from '@/content';
import { WAYS, type Stimulus, type Way } from '@/engine';
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
import { lessonText } from '@/game/lesson/text';
import { useScript } from '@/game/lesson/useScript';
import { ActionButton } from '@/ui/controls';
import { IconCheck, IconNext, IconPointer } from '@/ui/icons';
import lesson from '@/game/lesson/Lesson.module.css';
import { lookingAs, recallScript } from './script';
import { memoryText } from './text';
import { WayPicture } from './ways';
import styles from './memoryForest.module.css';

/**
 * Things to remember, looked at in a way of the child's own choosing.
 *
 * Four things are on show, and under them three pictures: two baskets, one thing wearing another, a path. A tap on
 * one lays the same four things out that way: in two groups, as who has what, or each at a place of its own. The
 * child can go from one to another for as long as they like; nothing is timed. "Ready" puts the things away, and
 * the way they were in at that moment is the way that was chosen. Then one question, with a hint that belongs to
 * that way: one of a group, an owner, a place.
 *
 * While the things are on show, what will be asked and what will be offered are not on the page at all. Once
 * they are put away, the things are not: nothing can be read from the page that a child could not see.
 */
export function RecallBoard({ state, runner, pack, module, paused, calm }: BoardProps) {
  const { view, feedback, answered } = state;
  const { challenge } = view;
  if (challenge.kind !== 'make' || challenge.task.type !== 'recall') {
    throw new Error('RecallBoard was given something else to do.');
  }
  const { task } = challenge;
  const { Picture } = module;
  const demo = view.stage === 'demo';
  const { asked, again, ask } = useAgain(view.stepIndex);
  const seconds = useSeconds();
  usePreparedLines(state, module);

  const [work, setWork] = useStepState<{ way: Way | null; put: boolean; tried: string[] }>(
    view.stepIndex,
    { way: null, put: false, tried: [] },
  );
  const ways = task.ways.map((each) => each.way);
  const shown = task.ways[0];
  const own = task.ways.find((each) => each.way === work.way);
  // Before a way is chosen, the things are simply there, as they come.
  const plain: Stimulus = { type: 'scene', scene: 'things', of: { ids: task.study } };

  const event = eventOf(state);
  const lines = linesOf(state);
  const script = useMemo(
    () =>
      recallScript({
        stage: view.stage,
        event,
        again,
        ways,
        put: work.put,
        scene: (demo ? shown : own)?.scene ?? plain,
        lines: { ...lines, ask: (demo ? shown : own)?.ask ?? lines.instruction },
        seconds,
      }),
    // `state` changes with every tap; the script depends only on what is listed. (Choosing a way, and putting
    // the things away, are the child's own doing and start nothing over: only asking again does.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.key, view.hintsUsed, event, asked, seconds],
  );
  const run = `${view.key}/${String(view.hintsUsed)}/${event}/${String(asked)}`;
  const { beat } = useScript(script, run, !paused, calm);

  // What is on the board at this moment. In a demonstration Glim does it all, and the script says how far that
  // has got; otherwise it is the child's own doing, but for another look, which is help.
  const showing = WAYS.find((way) => beat.show === 'name' && beat.which === lookingAs(way));
  const looking = demo ? beat.show === 'rest' || showing !== undefined : !work.put && !answered;
  const lookingAgain = !demo && work.put && !answered && beat.show === 'glance';
  const settled = demo ? beat.show === 'same' : answered;
  const way = demo ? (looking ? (showing ?? null) : (shown?.way ?? null)) : work.way;
  const chosen = task.ways.find((each) => each.way === way);
  const covered = !looking && !lookingAgain && !settled;
  const scene = chosen?.scene ?? plain;

  const revealed = !demo && view.shownAnswer !== null;
  const answerShown =
    (demo && (settled || (beat.show === 'do' && beat.parts >= 1))) || revealed || answered;
  const offered = chosen ? view.cards.filter((id) => chosen.choices.includes(id)) : [];
  const { mood, aim } = useGuide(
    state,
    demo ? (looking ? 'prompt' : 'answers') : lookingAgain ? 'prompt' : null,
  );

  const choose = (each: Way) => {
    if (demo || work.put) return;
    playCue('tap');
    sayLine(memoryText.wayLine(each));
    setWork({ ...work, way: each });
  };
  const putAway = () => {
    if (!own) return;
    playCue('step');
    setWork({ ...work, put: true });
    sayLine(own.ask);
  };
  const answer = (id: string) => {
    if (!own) return;
    setWork({ ...work, tried: [...work.tried, id] });
    void runner.answer(`${own.way}-${id}`);
  };

  // What is written where Glim's words are: what was just chosen, or what is being asked. What follows an
  // answer, and help, are the lesson's own to say.
  const caption =
    feedback !== null || state.hint !== null
      ? undefined
      : looking
        ? way === null
          ? undefined
          : `${demo ? `${lessonText.watch} ` : ''}${memoryText.wayWords(way)}`
        : chosen
          ? `${demo ? `${lessonText.watch} ` : ''}${packText(pack, chosen.ask)}`
          : undefined;

  return (
    <>
      <div
        className={`${lesson.board ?? ''} ${styles.recall ?? ''}`}
        data-count={3}
        data-phase={looking ? 'look' : lookingAgain ? 'again' : settled ? 'settled' : 'ask'}
        data-way={way ?? ''}
        data-testid="recall-board"
        inert={paused}
      >
        <div
          className={lesson.prompt}
          data-covered={covered}
          data-same={settled}
          data-glance="true"
          data-testid="recall-things"
        >
          <span className="sr-only">
            {covered
              ? `${lessonText.covered}${chosen ? `. ${module.describe(chosen.cue, 'prompt')}` : ''}`
              : module.describe(scene, 'prompt')}
          </span>
          {/* Once they are put away they are not on the page at all, for any eye or any tool. */}
          {!covered && <Picture key={way ?? 'as-they-come'} stimulus={scene} place="prompt" />}
          <span className={lesson.cover} aria-hidden="true" />
          {/* What the question is about, in front of the cover: one of a group, an owner, a place. */}
          {covered && chosen && (
            <span className={lesson.cue} data-testid="cue">
              <Picture stimulus={chosen.cue} place="prompt" />
            </span>
          )}
        </div>

        {looking ? (
          <ul className={styles.ways} aria-label={memoryText.ways}>
            {task.ways.map(({ way: each }, index) => (
              <li key={each}>
                <button
                  type="button"
                  className={styles.way}
                  style={{ '--order': index } as CSSProperties}
                  data-way-button={each}
                  // Nothing has been chosen yet: the three are offered, each in turn.
                  data-offered={!demo && work.way === null}
                  aria-label={memoryText.wayButton(each)}
                  aria-pressed={way === each}
                  aria-disabled={demo}
                  onClick={() => choose(each)}
                >
                  <WayPicture way={each} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className={lesson.choices} data-count={offered.length}>
            {offered.map((id, index) => {
              const card = task.cards.find((each) => each.id === id);
              if (!card || !chosen) return null;
              const isAnswer = answerShown && id === chosen.answer;
              const away = !isAnswer && (work.tried.includes(id) || revealed || answered);
              const waiting = demo || answered || lookingAgain || away;
              return (
                <li key={`${String(view.stepIndex)}-${id}`}>
                  <button
                    type="button"
                    className={lesson.choice}
                    style={{ '--order': index } as CSSProperties}
                    data-state={isAnswer ? 'same' : away ? 'away' : 'open'}
                    data-choice={id}
                    data-lit={isAnswer && settled}
                    data-turned-away={lookingAgain}
                    aria-label={card.label}
                    aria-disabled={waiting}
                    onClick={() => {
                      if (!waiting) answer(id);
                    }}
                  >
                    <Picture stimulus={card.stimulus} place="choice" />
                    {isAnswer && (answered || settled) && (
                      <span className={lesson.tick} aria-hidden="true">
                        <IconCheck size={22} />
                      </span>
                    )}
                    {isAnswer && !answered && !settled && (
                      <span className={lesson.pointer} aria-hidden="true">
                        <IconPointer size={44} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Foot
        state={state}
        runner={runner}
        pack={pack}
        paused={paused}
        mood={mood}
        aim={aim}
        after={calm ? 0 : script.length}
        // Asked while another look is under way, the look starts over; otherwise only the words are said again.
        onAgain={() => ask(!lookingAgain)}
        caption={caption}
      >
        {looking && !demo && own !== undefined && (
          <ActionButton
            tone="sun"
            big
            className={lesson.done}
            icon={<IconNext size={32} />}
            onClick={putAway}
          >
            {lessonText.ready}
          </ActionButton>
        )}
      </Foot>
    </>
  );
}
