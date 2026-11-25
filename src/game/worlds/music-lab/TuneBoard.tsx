import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { playCue, playTone } from '@/audio';
import { writeTokens } from '@/engine';
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
import type { MakeSituation } from '@/game/lesson/script';
import { useScript } from '@/game/lesson/useScript';
import lesson from '@/game/lesson/Lesson.module.css';
import { IconBack, IconPlay, IconPointer } from '@/ui/icons';
import { BAR_COLOURS, Bar, Sign } from './pictures';
import { BAR_TIME, tuneScript } from './script';
import { musicText, noteWord } from './text';
import styles from './musicLab.module.css';

/**
 * Making up a tune that has a shape: going up, coming home.
 *
 * The bars stand along the bottom, lowest first. Tapping one plays it and adds it to the tune, which is drawn above
 * as it grows — a dot for each note, higher up for a higher note, so that the shape of the tune can be seen as well
 * as heard. The last note can be taken back, and the tune can be played over as often as the child likes before
 * they say it is done. Any tune with the shape asked for is right.
 */
export function TuneBoard({ state, runner, pack, paused, calm }: BoardProps) {
  const { view, answered } = state;
  const { challenge } = view;
  if (challenge.kind !== 'make' || challenge.task.type !== 'tune') {
    throw new Error('TuneBoard was given something else to do.');
  }
  const { task } = challenge;
  const { length, notes } = task;
  const demo = view.stage === 'demo';
  const revealed = !demo && view.shownAnswer !== null;
  const shownAnswer = useMemo(
    () => (view.shownAnswer ? view.shownAnswer.split('-') : []),
    [view.shownAnswer],
  );
  const { asked, ask } = useAgain(view.stepIndex);
  const seconds = useSeconds();
  usePreparedLines(state);

  // What the child has chosen so far, and at which moment of the step they last chose. Showing one way to do it
  // starts the tune afresh, so that following the hand leads to a tune that works: what was chosen before the
  // answer was shown is set aside.
  const moment = `${view.key}/${String(view.hintsUsed)}`;
  const [work, setWork] = useStepState<{ picked: string[]; at: string }>(view.stepIndex, {
    picked: [],
    at: '',
  });
  const fixed = view.given;
  const picked = useMemo(() => {
    const own = revealed && work.at !== moment ? [] : work.picked;
    // What a hint has given is in place from the start, and stays.
    return [...fixed, ...own.slice(fixed.length)].slice(0, length);
  }, [revealed, work, moment, fixed, length]);

  const event = eventOf(state);
  const made = useMemo(
    () => (answered && state.picked ? state.picked.split('-') : []),
    [answered, state.picked],
  );
  const script = useMemo(
    () => {
      const situation: MakeSituation = {
        stage: view.stage,
        event,
        again: false,
        parts: length,
        sequence: [],
        lines: linesOf(state),
        seconds,
      };
      return tuneScript(situation, task.solution, made);
    },
    // `state` changes with every tap; the script depends only on what is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.key, view.hintsUsed, event, asked, seconds, task, made],
  );
  const run = `${view.key}/${String(view.hintsUsed)}/${event}/${String(asked)}`;
  const { beat } = useScript(script, run, !paused, calm, true);

  // Playing the tune over, at the child's asking: which note it has got to, or none.
  const [playing, setPlaying] = useState<{ step: number; at: number } | null>(null);
  useEffect(() => {
    if (playing === null) return;
    if (paused || playing.at >= picked.length) {
      const stop = window.setTimeout(() => setPlaying(null), 0);
      return () => window.clearTimeout(stop);
    }
    playTone('bar', picked[playing.at] ?? '');
    const next = window.setTimeout(
      () => setPlaying((now) => (now ? { ...now, at: now.at + 1 } : null)),
      BAR_TIME,
    );
    return () => window.clearTimeout(next);
  }, [playing, picked, paused]);
  const over = playing !== null && playing.step === view.stepIndex ? playing.at : null;

  // What is drawn: in a demonstration the tune as far as Glim has made it; otherwise the child's own.
  const shownParts = beat.show === 'do' ? beat.parts : beat.show === 'rest' && !calm ? 0 : length;
  const drawn = demo ? task.solution.slice(0, shownParts) : answered ? made : picked;
  const ghosts = revealed && !answered ? shownAnswer : [];
  const sounding = beat.show === 'name' ? Number(beat.which) : over;
  const same = beat.show === 'same' || (answered && beat.show !== 'name');
  const busy = demo || answered || over !== null;
  const full = picked.length >= length;
  const expected = revealed && !full ? shownAnswer[picked.length] : undefined;
  const { mood, aim } = useGuide(state, beat.show === 'do' ? 'answers' : null);

  const add = (note: string) => {
    if (busy) return;
    playTone('bar', note);
    if (full) return;
    setWork({ picked: [...picked, note], at: moment });
  };
  const takeBack = () => {
    if (busy || picked.length <= fixed.length) return;
    playCue('off');
    setWork({ picked: picked.slice(0, -1), at: moment });
  };

  // The drawing: a column for each note of the tune, a row for each bar, the lowest at the bottom.
  const rows = notes.length;
  const WIDE = 44;
  const HIGH = 20;
  const height = rows * HIGH + 12;
  const x = (column: number) => column * WIDE + WIDE / 2;
  const y = (note: string) => height - 6 - (notes.indexOf(note) + 0.5) * HIGH;
  const line = drawn.map((note, column) => `${String(x(column))} ${String(y(note))}`).join('L');

  return (
    <>
      <div className={styles.tune} data-testid="tune-board" inert={paused}>
        <div className={styles.asked} data-same={same}>
          <Sign id={task.shape} />
        </div>
        <svg
          className={styles.plot}
          viewBox={`0 0 ${String(length * WIDE)} ${String(height)}`}
          role="img"
          aria-label={musicText.tuneSoFar(drawn.map(noteWord), length)}
          data-same={same}
          data-notes={drawn.join('-')}
        >
          {notes.map((note) => (
            <path
              key={note}
              d={`M6 ${String(y(note))}H${String(length * WIDE - 6)}`}
              stroke={BAR_COLOURS[note[0] ?? 'c']?.[0] ?? '#f0564a'}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.35"
            />
          ))}
          {Array.from({ length }, (_, column) => (
            <rect
              key={column}
              className={styles.column}
              x={column * WIDE + 3}
              y="2"
              width={WIDE - 6}
              height={height - 4}
              rx="10"
              data-filled={column < drawn.length}
              data-next={!busy && column === drawn.length}
            />
          ))}
          {ghosts.map((note, column) =>
            column < drawn.length ? null : (
              <circle
                key={`ghost-${String(column)}`}
                className={styles.ghost}
                data-ghost={column}
                cx={x(column)}
                cy={y(note)}
                r="7"
              />
            ),
          )}
          {drawn.length > 1 && <path className={styles.line} d={`M${line}`} />}
          {drawn.map((note, column) => {
            const [fill, rim] = BAR_COLOURS[note[0] ?? 'c'] ?? ['#f0564a', '#b83a30'];
            return (
              <circle
                key={`${String(column)}-${note}`}
                className={styles.dot}
                cx={x(column)}
                cy={y(note)}
                r="8"
                fill={fill}
                stroke={rim}
                strokeWidth="3"
                data-column={column}
                data-sounding={sounding === column}
                data-fixed={!demo && column < fixed.length}
              />
            );
          })}
        </svg>

        <div className={styles.tools}>
          <button
            type="button"
            className={styles.tool}
            aria-label={musicText.takeBack}
            aria-disabled={busy || picked.length <= fixed.length}
            onClick={takeBack}
          >
            <IconBack size={28} />
          </button>
          <button
            type="button"
            className={styles.tool}
            aria-label={musicText.playTune}
            aria-disabled={busy || picked.length === 0}
            data-playing={over !== null}
            onClick={() => {
              if (busy || picked.length === 0) return;
              setPlaying({ step: view.stepIndex, at: 0 });
            }}
          >
            <IconPlay size={28} />
          </button>
        </div>

        <ul className={styles.keys} data-count={notes.length}>
          {notes.map((note, index) => {
            const glowing =
              (sounding !== null && drawn[sounding] === note) ||
              (demo && beat.show === 'do' && task.solution[beat.parts - 1] === note);
            return (
              <li key={note}>
                <button
                  type="button"
                  className={styles.key}
                  style={{ '--order': index } as CSSProperties}
                  data-note={note}
                  data-lit={glowing}
                  data-expected={expected === note || undefined}
                  aria-label={musicText.bar(note)}
                  aria-disabled={busy}
                  onClick={() => add(note)}
                >
                  <Bar note={note} sounding={glowing} />
                  {expected === note && (
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
        onAgain={() => ask()}
        done={{
          ready: full && over === null,
          submit: () => void runner.answer(writeTokens(picked)),
        }}
      />
    </>
  );
}
