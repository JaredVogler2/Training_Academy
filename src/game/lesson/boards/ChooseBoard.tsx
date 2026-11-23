import type { CSSProperties } from 'react';
import { IconCheck, IconPointer } from '@/ui/icons';
import { Foot, type BoardProps } from '../frame';
import { lessonText } from '../text';
import styles from '../Lesson.module.css';
import { useChoosing } from './useChoosing';

/**
 * A question with choices: what is asked about at the top, the choices below it. One tap answers.
 *
 * What is shown off — the demonstration, the question being put, what follows an answer — is a script written by
 * the world the question belongs to (counting, in Number Garden; saying the words, in Reading Cove). This board
 * plays it: it lifts, counts, lights and covers whatever the script names.
 */
export function ChooseBoard(props: BoardProps) {
  const { state, runner, pack, module, paused, calm } = props;
  const {
    challenge,
    view,
    answered,
    glance,
    again,
    script,
    beat,
    turn,
    counting,
    named,
    mood,
    aim,
    same,
    covered,
    turnedAway,
    standingOf,
  } = useChoosing(props);
  const { Picture } = module;

  const stimulus = challenge.prompt.stimulus;
  return (
    <>
      <div
        className={styles.board}
        data-count={view.choices.length}
        data-prompt={stimulus.type}
        data-asks-about={stimulus.type === 'scene' ? stimulus.scene : undefined}
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
            {covered
              ? `${lessonText.covered}${challenge.prompt.cue ? `. ${module.describe(challenge.prompt.cue, 'prompt')}` : ''}`
              : module.describe(stimulus, 'prompt')}
          </span>
          {/*
            What is covered is not on the page at all: nothing of it can be read from the page, by eye or by
            any tool, until it is uncovered. Re-keyed whenever it is this picture's turn, so that its counting
            starts from the first thing.
          */}
          {!covered && (
            <Picture
              key={counting('prompt') ? `count-${String(turn)}` : 'still'}
              stimulus={stimulus}
              counting={counting('prompt')}
              place="prompt"
              sounding={named('prompt')}
              solved={same}
              onAgain={again}
            />
          )}
          {glance && <span className={styles.cover} aria-hidden="true" />}
          {/* What the question is about, in front of the cover: "what went with this?" */}
          {covered && challenge.prompt.cue && (
            <span className={styles.cue} data-testid="cue">
              <Picture stimulus={challenge.prompt.cue} place="prompt" sounding={named('prompt')} />
            </span>
          )}
        </div>

        <ul className={styles.choices} data-count={view.choices.length}>
          {view.choices.map(({ choice, available }, index) => {
            const { isAnswer, isTried, held, look, waiting } = standingOf(choice, available);
            const hopping =
              (isAnswer && counting('answer')) ||
              (isTried && counting('tried')) ||
              (beat.show === 'count' && beat.group === choice.id);
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
