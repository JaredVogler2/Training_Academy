import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { playCount, playCue, playTone, sayLine } from '@/audio';
import { writeTokens } from '@/engine';
import { IconPointer } from '@/ui/icons';
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
import {
  PAUSE,
  REST,
  SAME,
  Writer,
  makingScript,
  type MakeSituation,
  type Script,
} from '../script';
import { lessonText } from '../text';
import { useScript } from '../useScript';
import lesson from '../Lesson.module.css';
import styles from './boards.module.css';

/** How long each thing of a sequence stays lit while the sequence is being shown. */
export const SHOW_TIME = 780;

/**
 * A sequence to do again. What is to be echoed is shown first, one thing at a time, each with its own note — to
 * everyone, since it is the question. Asking to be told again says the words again and no more: seeing the
 * sequence a second time is help, and is asked for as help.
 */
export function echoScript(situation: MakeSituation): Script {
  const { stage, event, again, sequence, lines, seconds } = situation;
  const script = new Writer(seconds);
  const show = () => {
    sequence.forEach((id, index) => {
      script.beat({ show: 'name', which: id }).note(index).wait(SHOW_TIME);
      script.beat(REST).wait(PAUSE / 2);
    });
    return script;
  };
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction);
        show().wait(PAUSE).beat({ show: 'do', parts: 0 });
        sequence.forEach((_, index) => {
          script
            .wait(PAUSE)
            .beat({ show: 'do', parts: index + 1 })
            .note(index)
            .wait(PAUSE);
        });
        return script.wait(PAUSE).cue('same').end(SAME);
      }
      script.wait(250).say(lines.instruction);
      return again ? script.end(REST) : show().end(REST);
    case 'incorrect':
      script.wait(600);
      if (lines.feedback) script.say(lines.feedback);
      // Not that way round: here it is once more.
      return show().end(REST);
    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return show().end(REST);
    case 'correct':
    case 'hint-eliminate':
    case 'hint-step':
    case 'hint-reveal':
      return makingScript(situation);
  }
}

/**
 * Two games with one rule: the right things, in the right order.
 *
 *   order   cards lie in a row out of order, with a place for each: first, next, last. A tap sends a card to the
 *           first empty place; a tap on a placed card takes it back. When every place is filled the child says so.
 *   echo    things light up one after another, and the child taps them in the same order. There is nothing to
 *           hand in: the last tap is the answer.
 */
export function SequenceBoard({ state, runner, pack, module, paused, calm }: BoardProps) {
  const { view, feedback, answered } = state;
  const { challenge } = view;
  if (
    challenge.kind !== 'make' ||
    (challenge.task.type !== 'order' && challenge.task.type !== 'echo')
  ) {
    throw new Error('SequenceBoard was given something else to do.');
  }
  const { task } = challenge;
  const echo = task.type === 'echo';
  const { Picture } = module;
  const length = task.solution.length;
  const demo = view.stage === 'demo';
  const revealed = !demo && view.shownAnswer !== null;
  const shownAnswer = view.shownAnswer ? view.shownAnswer.split('-') : [];
  const { asked, again: toldBefore, ask } = useAgain(view.stepIndex);
  const seconds = useSeconds();
  usePreparedLines(state, module);

  // What the child has put down so far: for an order, a card or nothing in each place; for an echo, the taps.
  const [work, setWork] = useStepState<{ placed: (string | null)[]; judged: string }>(
    view.stepIndex,
    { placed: [], judged: '' },
  );
  const fixed = view.given;
  // After a wrong order, the cards that were in their places stay there and the rest go back.
  const kept = feedback?.outcome === 'incorrect' && work.judged !== view.key;
  const placed = useMemo(() => {
    const own = echo
      ? kept
        ? []
        : work.placed
      : Array.from({ length }, (_, place) => {
          const card = work.placed[place] ?? null;
          return kept && card !== null && !feedback.right.includes(card) ? null : card;
        });
    // What a hint has given is in place from the start, and stays.
    if (echo) return own.length < fixed.length ? [...fixed] : own;
    return own.map((card, place) => fixed[place] ?? (fixed.includes(card ?? '') ? null : card));
  }, [echo, kept, work.placed, length, fixed, feedback]);

  const event = eventOf(state);
  const situation = useMemo(
    (): MakeSituation => ({
      stage: view.stage,
      event,
      again: toldBefore,
      parts: length,
      sequence: echo ? task.solution : [],
      lines: linesOf(state),
      seconds,
    }),
    // `state` changes with every tap; the script depends only on what is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.key, view.hintsUsed, event, asked, toldBefore, seconds],
  );
  const script = useMemo(
    () =>
      module.makeScript?.(situation, challenge) ??
      (echo ? echoScript(situation) : makingScript(situation)),
    [module, situation, challenge, echo],
  );
  const run = `${view.key}/${String(view.hintsUsed)}/${event}/${String(asked)}`;
  // An echo's showing is the question itself: it plays even where nothing else moves.
  const { beat, turn } = useScript(script, run, !paused, calm, echo);

  const showing = echo && beat.show === 'name';
  // The showing is one thing from beginning to end: from the moment the question arrives until the last of it
  // has been lit and gone dark again. (The cards used to be open while the words were still being said, and
  // again in each pause between one light and the next, and a tap there was taken as the start of an answer.)
  const lastShown = useMemo(() => {
    let beats = 0;
    let last = 0;
    for (const moment of script.moments) {
      if (!moment.beat) continue;
      beats += 1;
      if (moment.beat.show === 'name') last = beats;
    }
    return last;
  }, [script]);
  const watching = echo && !demo && !answered && lastShown > 0 && turn <= lastShown;
  // Asked to be told again before it has all been shown, the showing is still owed and starts over; asked once
  // it has been seen through, only the words are said again.
  const again = () => ask(!watching);
  // In an order that has been got right, the story is told back: the card whose turn it is, and its words.
  const telling = !echo && beat.show === 'name' ? beat.which : null;
  const lit = showing ? beat.which : null;
  const doing = beat.show === 'do' ? beat.parts : demo && beat.show === 'same' ? length : 0;
  const same = beat.show === 'same';
  const { mood, aim } = useGuide(state, showing || beat.show === 'do' ? 'answers' : null);

  // A tap on something to echo lights it for a moment, as the showing did.
  const [flash, setFlash] = useState<{ id: string; at: number } | null>(null);
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 320);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const busy = demo || answered || showing || watching;
  const cardOf = (id: string) => task.cards.find((card) => card.id === id);

  if (echo) {
    const tapped = placed.filter((id): id is string => id !== null);
    const expected = revealed ? shownAnswer[tapped.length] : undefined;
    const tap = (id: string) => {
      if (busy || tapped.length >= length) return;
      const next = [...tapped, id];
      // A thing that makes a sound of its own makes it; anything else gets the next note of the scale.
      const card = cardOf(id);
      const tone = card ? module.toneOf?.(card.stimulus) : null;
      const own = card ? module.soundOf?.(card.stimulus) : null;
      if (tone) playTone(tone.timbre, tone.pitch);
      else if (own) sayLine(own);
      else playCount(tapped.length);
      setFlash({ id, at: next.length });
      setWork({ placed: next, judged: view.key });
      if (next.length === length) {
        // The last tap is the answer; it is handed in once its light has shown.
        window.setTimeout(() => void runner.answer(writeTokens(next)), 360);
      }
    };
    const done = demo ? doing : tapped.length;
    return (
      <>
        <div className={styles.echo} data-testid="echo-board" inert={paused}>
          <ul
            className={styles.echoCards}
            data-count={view.cards.length}
            data-layout={module.echoLayout}
          >
            {view.cards.map((id, index) => {
              const card = cardOf(id);
              if (!card) return null;
              const glowing =
                lit === id ||
                flash?.id === id ||
                (demo && beat.show === 'do' && task.solution[beat.parts - 1] === id);
              return (
                <li key={`${String(view.stepIndex)}-${id}`}>
                  <button
                    type="button"
                    className={styles.echoCard}
                    style={{ '--order': index } as CSSProperties}
                    data-card={id}
                    data-lit={glowing}
                    aria-label={card.label}
                    aria-disabled={busy}
                    onClick={() => tap(id)}
                  >
                    <Picture stimulus={card.stimulus} place="card" sounding={glowing} />
                    {expected === id && (
                      <span className={lesson.pointer} aria-hidden="true">
                        <IconPointer size={44} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {/* How far along the sequence is: one mark for each thing to tap, filled as it is tapped. */}
          <ol className={styles.echoMarks} aria-label={lessonText.progress(done, length)}>
            {Array.from({ length }, (_, index) => (
              <li key={index} data-done={index < done} aria-hidden="true" />
            ))}
          </ol>
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

  const slots = demo ? task.solution.map((id, place) => (place < doing ? id : null)) : placed;
  const filled = slots.every((card) => card !== null);
  const inTray = view.cards.filter((id) => !slots.includes(id));

  const place = (id: string) => {
    if (busy) return;
    const empty = placed.indexOf(null);
    if (empty < 0) return;
    playCount(empty);
    setWork({
      placed: placed.map((card, index) => (index === empty ? id : card)),
      judged: view.key,
    });
  };
  const takeBack = (index: number) => {
    if (busy || index < fixed.length || placed[index] === null) return;
    playCue('off');
    setWork({
      placed: placed.map((card, at) => (at === index ? null : card)),
      judged: view.key,
    });
  };

  return (
    <>
      <div className={styles.order} data-count={length} data-testid="order-board" inert={paused}>
        <ol className={styles.slots} data-same={same || (answered && filled)}>
          {slots.map((id, index) => {
            const card = id === null ? null : cardOf(id);
            const ghost = revealed && id === null ? cardOf(shownAnswer[index] ?? '') : null;
            return (
              <li key={index}>
                <button
                  type="button"
                  className={styles.slot}
                  style={{ '--order': index } as CSSProperties}
                  data-slot={index}
                  data-filled={card !== null && card !== undefined}
                  data-telling={id !== null && id === telling}
                  data-fixed={index < fixed.length && !demo}
                  aria-label={`${lessonText.place(index + 1)}: ${card ? card.label : lessonText.empty}`}
                  aria-disabled={busy || !card || index < fixed.length}
                  onClick={() => takeBack(index)}
                >
                  {card ? (
                    <span key={card.id} className={styles.slotted}>
                      <Picture stimulus={card.stimulus} place="card" />
                    </span>
                  ) : ghost ? (
                    <span className={styles.ghost} aria-hidden="true">
                      <Picture stimulus={ghost.stimulus} place="card" />
                    </span>
                  ) : null}
                  {/* Which place this is, without a numeral: one mark for the first, two for the second. */}
                  <span className={styles.slotMarks} aria-hidden="true">
                    {Array.from({ length: index + 1 }, (_, mark) => (
                      <i key={mark} />
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <ul className={styles.tray} data-count={view.cards.length}>
          {view.cards.map((id, index) => {
            const card = cardOf(id);
            if (!card) return null;
            const gone = !inTray.includes(id);
            return (
              <li key={`${String(view.stepIndex)}-${id}`}>
                <button
                  type="button"
                  className={styles.card}
                  style={{ '--order': index } as CSSProperties}
                  data-card={id}
                  data-gone={gone}
                  aria-label={card.label}
                  aria-disabled={busy || gone}
                  aria-hidden={gone}
                  tabIndex={gone ? -1 : undefined}
                  onClick={() => {
                    if (!gone) place(id);
                  }}
                >
                  <Picture stimulus={card.stimulus} place="card" />
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
        caption={telling === null ? undefined : cardOf(telling)?.label}
        done={{
          ready: placed.every((card) => card !== null),
          submit: () => {
            setWork({ placed, judged: '' });
            void runner.answer(writeTokens(placed.filter((card): card is string => card !== null)));
          },
        }}
      />
    </>
  );
}
