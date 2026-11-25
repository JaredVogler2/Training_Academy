import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { DRUM_HZ, TICK_HZ, audio, playTone } from '@/audio';
import { keepTime, readTimeKept, writeTimeKept, type BeatMark } from '@/engine';
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
import { IconPointer } from '@/ui/icons';
import { beatScript, periodOf } from './script';
import { musicText } from './text';
import styles from './musicLab.module.css';

/** After the words, this long before the first beat (ms): time to look from Glim to the strip. */
export const BEFORE_THE_BEAT = 450;
/** After the last beat, this share of a beat is waited for a late tap before the tapping is handed in. */
const WAIT_FOR_LAST = 0.62;
/** A click that follows a press within this long (ms) is the same tap, and is not counted twice. */
const SAME_TAP = 900;

interface Going {
  /** Which run of the beat this is about: a new one starts from nothing. */
  run: string;
  /** How many beats have sounded so far, the ones only listened to included. */
  sounded: number;
  /** The beats (of those to be tapped, from 0) that a tap has been heard near. */
  tapped: number[];
}

interface Live {
  /** When each beat is heard, on the page's clock (ms): the ones only listened to, then the ones to tap. */
  moments: number[];
  taps: number[];
}

/**
 * Tapping along with a slow, steady beat.
 *
 * A strip shows the beat: a few small lights for the beats that are only listened to, then a round light for each
 * beat to be tapped. Each lights in its turn as its click sounds — the click on the audio's own clock, the light
 * following the same clock — so the beat can be seen as well as heard, and with the sound off it can still be
 * followed by eye. The child taps the big drum. When the last beat has gone by the taps are compared with the
 * beats (src/engine/music.ts): most of them met, give or take a generous margin, is keeping the beat, and a steady
 * lateness — the device's, or the child's own — is taken off first.
 *
 * Nothing is handed in by a button: the beat ends, and that is the answer. After a few tries that were not in time
 * Glim taps along (a hand on the drum at every beat), and then tapping with it at all is enough.
 */
export function BeatBoard({ state, runner, pack, paused, calm }: BoardProps) {
  const { view, feedback, answered } = state;
  const { challenge } = view;
  if (challenge.kind !== 'make' || challenge.task.type !== 'beat') {
    throw new Error('BeatBoard was given something else to do.');
  }
  const { task } = challenge;
  const demo = view.stage === 'demo';
  const revealed = !demo && view.shownAnswer !== null;
  const { asked, ask } = useAgain(view.stepIndex);
  const seconds = useSeconds();
  usePreparedLines(state);

  const event = eventOf(state);
  const script = useMemo(
    () => {
      const situation: MakeSituation = {
        stage: view.stage,
        event,
        again: false,
        parts: task.beats,
        sequence: [],
        lines: linesOf(state),
        seconds,
      };
      return beatScript(situation, task);
    },
    // `state` changes with every answer; the script depends only on what is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.key, view.hintsUsed, event, asked, seconds, task],
  );
  // A beat that ran its course with too little tapping to hand in starts over: `round` counts those.
  const [round, setRound] = useStepState(view.stepIndex, 0);
  const run = `${view.key}/${String(view.hintsUsed)}/${event}/${String(asked)}/${String(round)}`;
  const { beat } = useScript(script, run, !paused, calm, true);

  const total = task.lead + task.beats;
  const [going, setGoing] = useState<Going>({ run: '', sounded: 0, tapped: [] });
  const live = useRef<Live | null>(null);
  const [struck, setStruck] = useState(0);
  const lastPress = useRef(-Infinity);

  useEffect(() => {
    if (paused || demo || answered) return;
    const period = periodOf(task);
    const timers: number[] = [];
    const later = (then: () => void, at: number) => {
      timers.push(window.setTimeout(then, Math.max(0, at - performance.now())));
    };
    // The words first; then the beat.
    timers.push(
      window.setTimeout(() => {
        const origin = performance.now() + 120;
        const heardLate = (audio().clock?.latency ?? 0) * 1000;
        const moments = Array.from(
          { length: total },
          (_, index) => origin + heardLate + index * period,
        );
        const mine: Live = { moments, taps: [] };
        live.current = mine;
        setGoing({ run, sounded: 0, tapped: [] });
        /** Put one click on the audio's own clock, well ahead of its moment, so that it falls exactly. */
        const click = (index: number) => {
          const clock = audio().clock;
          if (!clock) return;
          const due = origin + index * period;
          playTone('tick', TICK_HZ, {
            at: clock.now + (due - performance.now()) / 1000,
            level: index < task.lead ? 0.15 : 0.2,
          });
        };
        click(0);
        moments.forEach((moment, index) => {
          later(() => {
            setGoing((was) => (was.run === run ? { ...was, sounded: index + 1 } : was));
            if (index + 1 < total) click(index + 1);
          }, moment);
        });
        later(
          () => {
            live.current = null;
            const beats = moments.slice(task.lead);
            const first = beats[0] ?? 0;
            // Taps made while the beat was only being listened to are joining in early, not answers.
            const taps = mine.taps.filter((tap) => tap >= first - period / 2);
            const kept = keepTime(taps, beats, period);
            const response = writeTimeKept(kept);
            const inTime = kept.marks.filter((mark) => mark === 'on').length >= task.need;
            if (!revealed || inTime) void runner.answer(response);
            // Glim is tapping along: tapping with it at all is what is asked now.
            else if (taps.length >= task.need && view.shownAnswer !== null) {
              void runner.answer(view.shownAnswer);
            } else setRound((before) => before + 1);
          },
          (moments.at(-1) ?? origin) + period * WAIT_FOR_LAST,
        );
      }, script.length + BEFORE_THE_BEAT),
    );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      live.current = null;
    };
    // The run names everything this depends on: the step, the try, the hints, the asking, the round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, paused, demo, answered]);

  // A tap is timed when it is heard of, on the page's own clock: the clock the beats were laid out on. (The
  // browser's own stamp on the event is a few milliseconds nearer the finger, and is not used: whatever is lost
  // is the same for every tap, and a steady lateness is taken off before the taps are judged.)
  const strike = (at: number) => {
    if (demo || answered || paused) return;
    playTone('drum', DRUM_HZ);
    setStruck((count) => count + 1);
    const mine = live.current;
    if (!mine) return;
    mine.taps.push(at);
    const first = mine.moments[task.lead] ?? 0;
    const nearest = Math.round((at - first) / periodOf(task));
    if (nearest >= 0 && nearest < task.beats) {
      setGoing((was) =>
        was.tapped.includes(nearest) ? was : { ...was, tapped: [...was.tapped, nearest] },
      );
    }
  };
  const press = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    lastPress.current = performance.now();
    strike(lastPress.current);
  };
  // A key, or a tap the browser reported only as a click: counted here, and never a second time.
  const click = () => {
    const now = performance.now();
    if (now - lastPress.current < SAME_TAP) return;
    strike(now);
  };

  // Where the beat has got to, and what each beat to tap looks like.
  const mine = going.run === run && !demo ? going : null;
  const sounded = demo
    ? beat.show === 'do'
      ? beat.parts
      : beat.show === 'same'
        ? total
        : 0
    : (mine?.sounded ?? 0);
  const marks: BeatMark[] | null = useMemo(() => {
    if (!feedback || state.picked === null) return null;
    return readTimeKept(state.picked, task.beats)?.marks ?? null;
  }, [feedback, state.picked, task.beats]);
  const lit = sounded - 1;
  const glimTaps = demo ? sounded > task.lead : revealed && sounded > task.lead;
  const same = beat.show === 'same';
  const { mood, aim } = useGuide(state, demo && sounded > 0 ? 'answers' : null);

  return (
    <>
      <div className={styles.beat} data-testid="beat-board" inert={paused}>
        <ol
          className={styles.strip}
          aria-label={musicText.strip(task.lead, task.beats)}
          data-going={mine !== null || demo}
          // The beat has gone by and been looked at: the lights that were met are lit, and stay so for a moment.
          data-judged={marks !== null}
        >
          {Array.from({ length: total }, (_, index) => {
            const tapping = index - task.lead;
            // Only a beat that was met is marked. One that was not is simply not lit: nothing here says "wrong".
            const met = tapping >= 0 && marks?.[tapping] === 'on';
            return (
              <li
                key={index}
                className={styles.light}
                aria-hidden="true"
                data-kind={tapping < 0 ? 'listen' : 'tap'}
                data-beat={index}
                data-now={index === lit}
                data-past={index < lit}
                data-tapped={
                  tapping >= 0 && (demo ? index <= lit : (mine?.tapped.includes(tapping) ?? false))
                }
                data-met={met || undefined}
              />
            );
          })}
        </ol>

        {/* The drum is as large as the room there is, and round: the room is measured, not guessed at. */}
        <div className={styles.drumRoom}>
          <button
            type="button"
            className={styles.drum}
            aria-label={musicText.drum}
            aria-disabled={demo || answered}
            data-same={same}
            data-sounded={sounded}
            onPointerDown={press}
            onClick={click}
          >
            <svg viewBox="-60 -60 120 120" aria-hidden="true" focusable="false">
              <circle r="56" fill="#ff8f7a" stroke="#c94f3b" strokeWidth="5" />
              <circle r="44" fill="#fff6e3" stroke="#c94f3b" strokeWidth="3" />
              <circle r="20" fill="none" stroke="#ffd9b8" strokeWidth="4" />
            </svg>
            {/* The beat itself, on the drum's rim: a ring that comes and goes with every beat. */}
            {sounded > 0 && sounded <= total && (
              <span key={`pulse-${String(sounded)}`} className={styles.pulse} aria-hidden="true" />
            )}
            {/* The child's own tap, and Glim's in a demonstration. */}
            {(struck > 0 || (demo && sounded > task.lead)) && (
              <span
                key={demo ? `glim-${String(sounded)}` : `tap-${String(struck)}`}
                className={styles.ripple}
                aria-hidden="true"
              />
            )}
            {glimTaps && sounded <= total && (
              <span
                key={`hand-${String(sounded)}`}
                className={[lesson.pointer, styles.hand].join(' ')}
                aria-hidden="true"
              >
                <IconPointer size={48} />
              </span>
            )}
          </button>
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
        onAgain={() => ask()}
      />
    </>
  );
}
