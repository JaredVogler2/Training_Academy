import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { playCue } from '@/audio';
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
import { PAUSE, REST, SAME, Writer, type MakeSituation, type Script } from '../script';
import { lessonText } from '../text';
import { useScript } from '../useScript';
import styles from './boards.module.css';

/** How long two cards that do not match stay face up before they turn back: long enough to see both. */
export const LOOK_TIME = 1150;
/** How long every card lies face up when help is asked for. */
export const PEEK_TIME = 2400;

/**
 * Finding pairs.
 *
 *   demonstration   Glim turns two cards that match: this is what a pair is, and they stay face up
 *   help            every card is turned face up for a moment, and turned back
 */
export function pairsScript(situation: MakeSituation): Script {
  const { stage, event, lines, seconds } = situation;
  const script = new Writer(seconds);
  switch (event) {
    case 'new':
      if (stage === 'demo') {
        script.wait(400).say('lesson.watch').say(lines.instruction).beat({ show: 'do', parts: 0 });
        script
          .wait(PAUSE * 2)
          .beat({ show: 'do', parts: 1 })
          .cue('tap')
          .wait(PAUSE * 3);
        script
          .beat({ show: 'do', parts: 2 })
          .cue('tap')
          .wait(PAUSE * 3);
        return script.cue('same').end(SAME);
      }
      return script.wait(250).say(lines.instruction).end(REST);
    case 'correct':
      script.wait(400).cue('same').beat(SAME);
      if (lines.feedback) script.say(lines.feedback);
      return script.end(SAME);
    case 'hint-model':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.beat({ show: 'glance' }).wait(PEEK_TIME).end(REST);
    // There is no wrong answer here, and no other kind of help; whatever else is said is said and no more.
    case 'incorrect':
    case 'hint-eliminate':
    case 'hint-step':
    case 'hint-reveal':
      script.wait(200);
      if (lines.hint) script.say(lines.hint);
      return script.end(REST);
  }
}

interface Table {
  /** The places of the cards face up and not yet matched: at most two. */
  up: number[];
  /** The cards whose pair has been found, by id. */
  found: string[];
  /** How many times two cards have been turned. */
  turns: number;
}

/**
 * Cards face down, two of each. Two are turned at a time: a pair stays face up, two that differ are looked at and
 * turn back. There is no wrong answer and nothing to hand in: when the last pair is found the game is done, and
 * how many turns it took is what is written down.
 */
export function PairsBoard({ state, runner, pack, module, paused, calm }: BoardProps) {
  const { view, answered } = state;
  const { challenge } = view;
  if (challenge.kind !== 'make' || challenge.task.type !== 'pairs') {
    throw new Error('PairsBoard was given something else to do.');
  }
  const { task } = challenge;
  const { Picture } = module;
  const demo = view.stage === 'demo';
  const { asked, again, ask } = useAgain(view.stepIndex);
  const seconds = useSeconds();
  usePreparedLines(state);

  const [table, setTable] = useStepState<Table>(view.stepIndex, { up: [], found: [], turns: 0 });
  const event = eventOf(state);
  const script = useMemo(
    () =>
      pairsScript({
        stage: view.stage,
        event,
        again,
        parts: 2,
        sequence: [],
        lines: linesOf(state),
        seconds,
      }),
    // `state` changes with every tap; the script depends only on what is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.key, view.hintsUsed, event, asked, seconds],
  );
  const run = `${view.key}/${String(view.hintsUsed)}/${event}/${String(asked)}`;
  const { beat } = useScript(script, run, !paused, calm);
  const peeking = beat.show === 'glance';
  const { mood, aim } = useGuide(state, peeking || beat.show === 'do' ? 'answers' : null);

  // In a demonstration Glim turns the first pair there is: the first card, and its match.
  const first = view.cards[0];
  const demoPair = first === undefined ? [] : [0, view.cards.lastIndexOf(first)];
  const demoUp =
    beat.show === 'do'
      ? demoPair.slice(0, beat.parts)
      : beat.show === 'rest' && !calm
        ? []
        : demoPair;

  // Two cards that differ turn back after a look; a pair is kept. Either way the turn is over.
  const settle = useRef<number | null>(null);
  useEffect(() => () => window.clearTimeout(settle.current ?? undefined), []);
  const pairs = task.cards.length;

  const turn = (place: number) => {
    const id = view.cards[place];
    if (demo || answered || peeking || id === undefined) return;
    if (table.up.length >= 2 || table.up.includes(place) || table.found.includes(id)) return;
    playCue('tap');
    const up = [...table.up, place];
    if (up.length < 2) {
      setTable({ ...table, up });
      return;
    }
    const turns = table.turns + 1;
    const other = view.cards[up[0] ?? -1];
    if (other === id) {
      const found = [...table.found, id];
      setTable({ up: [], found, turns });
      playCue('same');
      if (found.length === pairs) {
        // The last pair: the game is done. How many turns it took is the answer.
        settle.current = window.setTimeout(() => void runner.answer(String(turns)), 500);
      }
      return;
    }
    setTable({ ...table, up, turns });
    settle.current = window.setTimeout(() => {
      setTable((now) => ({ ...now, up: [] }));
    }, LOOK_TIME);
  };

  return (
    <>
      <div className={styles.pairs} data-testid="pairs-board" inert={paused}>
        <ul className={styles.pairCards} data-count={view.cards.length}>
          {view.cards.map((id, place) => {
            const card = task.cards.find((candidate) => candidate.id === id);
            if (!card) return null;
            const found = demo
              ? beat.show === 'same' && demoPair.includes(place)
              : table.found.includes(id);
            const picked = demo ? demoUp.includes(place) : table.up.includes(place);
            // Where the cards lie face up from the start, the two that are picked are lifted instead of turned.
            const faceUp = found || peeking || picked || task.open === true;
            return (
              <li key={`${String(view.stepIndex)}-${String(place)}`}>
                <button
                  type="button"
                  className={styles.pairCard}
                  style={{ '--order': place } as CSSProperties}
                  data-place={place}
                  data-up={faceUp}
                  data-picked={picked && !found}
                  data-found={found}
                  aria-label={faceUp ? card.label : lessonText.turnedOver}
                  aria-disabled={demo || answered || found}
                  onClick={() => turn(place)}
                >
                  <span className={styles.pairFace}>
                    {faceUp && <Picture stimulus={card.stimulus} place="card" />}
                  </span>
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
      />
    </>
  );
}
