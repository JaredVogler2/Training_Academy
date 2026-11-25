import { useMemo, type CSSProperties, type MouseEvent } from 'react';
import { playCount, playCue, sayLine } from '@/audio';
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
import { giveScript } from './script';
import { Thing, describeAmount } from './things';
import styles from './numberGarden.module.css';

/**
 * Giving out exactly as many as are wanted: one for each of the friends. Tapping the pile gives one — the one
 * that was tapped — and tapping what has been given takes one back. When the child thinks every friend has one,
 * they say so, and the friends and what they were given are counted one against the other.
 *
 * In supported steps each friend has a place beside it, so that giving is matching one to one and cannot overrun.
 * On their own there are no places: how many is for the child to keep track of.
 */
export function GiveBoard({ state, runner, pack, module, paused, calm }: BoardProps) {
  const { view, feedback, answered } = state;
  const { challenge } = view;
  if (challenge.kind !== 'make' || challenge.task.type !== 'give') {
    throw new Error('GiveBoard was given something else to do.');
  }
  const { task } = challenge;
  const { Picture } = module;
  const wanted = task.want.count;
  const demo = view.stage === 'demo';
  const revealed = !demo && view.shownAnswer !== null;
  const { asked, again, ask } = useAgain(view.stepIndex);
  const seconds = useSeconds();
  usePreparedLines(state);

  // Which things of the pile have been given, in the order they were given.
  const [taken, setTaken] = useStepState<number[]>(view.stepIndex, []);
  // What a hint has given cannot be taken back, and once the answer is shown there is no giving past it.
  const floor = Math.min(view.given.length, wanted);
  const limit = task.places || revealed ? wanted : task.pile;
  const held = useMemo(() => {
    const own = taken.slice(0, limit);
    for (let spot = task.pile - 1; own.length < floor && spot >= 0; spot--) {
      if (!own.includes(spot)) own.push(spot);
    }
    return own;
  }, [taken, limit, floor, task.pile]);

  const event = eventOf(state);
  const tried = feedback?.outcome === 'incorrect' ? Number(state.picked) : null;
  const script = useMemo(
    () =>
      giveScript({
        stage: view.stage,
        event,
        again,
        wanted,
        given: tried,
        lines: linesOf(state),
        seconds,
      }),
    // `state` changes with every tap; the script depends only on what is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view.key, view.hintsUsed, event, tried, asked, wanted, seconds],
  );
  const run = `${view.key}/${String(view.hintsUsed)}/${event}/${String(asked)}`;
  const { beat, turn } = useScript(script, run, !paused, calm);

  // In a demonstration Glim gives them out one at a time; what is shown is how far that has got.
  const shownGiven = demo
    ? beat.show === 'do'
      ? beat.parts
      : beat.show === 'rest' && !calm
        ? 0
        : wanted
    : held.length;
  const given = demo
    ? Array.from({ length: shownGiven }, (_, index) => task.pile - 1 - index)
    : held;

  const countingFriends = beat.show === 'count' && beat.group === 'prompt';
  const countingGiven = beat.show === 'count' && beat.group !== 'prompt';
  const same = beat.show === 'same';
  const { mood, aim } = useGuide(
    state,
    countingFriends ? 'prompt' : countingGiven || beat.show === 'do' ? 'answers' : null,
  );

  const busy = demo || answered;
  const full = given.length >= limit;

  const give = (event: MouseEvent<HTMLButtonElement>) => {
    if (busy || full) return;
    // The thing that goes is the one that was tapped: the nearest one still in the pile.
    const spots = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-spot]')];
    let nearest = -1;
    let best = Infinity;
    for (const spot of spots) {
      const index = Number(spot.dataset.spot);
      if (held.includes(index)) continue;
      const box = spot.getBoundingClientRect();
      // A key press has no place of its own: it gives the last one.
      const distance =
        event.detail === 0
          ? -index
          : Math.hypot(
              event.clientX - (box.left + box.width / 2),
              event.clientY - (box.top + box.height / 2),
            );
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    }
    if (nearest < 0) return;
    playCount(held.length);
    // With support, each one given is counted aloud; alone, the child keeps count.
    if (view.stage === 'guided') sayLine(`count.${String(held.length + 1)}`);
    setTaken([...held, nearest]);
  };

  const takeBack = () => {
    if (busy || held.length <= floor) return;
    playCue('off');
    setTaken(held.slice(0, -1));
  };

  const friends = describeAmount(wanted, task.want.item);
  const givenSoFar = `${describeAmount(given.length, task.item)} given`;
  // What hops when it is counted is made afresh whenever a count starts, so that the hopping starts from the
  // first one. The button it is in stays as it is: a button put in the place of another drops a press that is
  // under way, and whatever was focused on it.
  const count = countingFriends || countingGiven ? `count-${String(turn)}` : 'still';
  const gift = (index: number, afresh = '') => (
    <span
      // Keyed by where it came from, so that one put back and given again arrives afresh.
      key={`${afresh}/${String(given[index])}`}
      className={styles.gift}
      style={{ '--order': index } as CSSProperties}
      data-fixed={index < floor && !demo}
    >
      <Thing item={task.item} />
    </span>
  );

  return (
    <>
      <div
        className={styles.give}
        data-places={task.places}
        data-many={wanted > 5}
        data-testid="give-board"
        inert={paused}
      >
        {task.places ? (
          <button
            type="button"
            className={styles.friends}
            style={{ '--columns': Math.min(wanted, 5) } as CSSProperties}
            data-same={same}
            data-counting={countingFriends ? 'friends' : countingGiven ? 'given' : undefined}
            data-given={given.length}
            aria-label={`${friends}, each with a place. ${givenSoFar}. Take one back.`}
            aria-disabled={busy || held.length <= floor}
            onClick={takeBack}
          >
            {Array.from({ length: wanted }, (_, index) => (
              <span
                key={`${count}/${String(index)}`}
                className={styles.cell}
                style={{ '--order': index } as CSSProperties}
              >
                <span className={styles.friend}>
                  <Thing item={task.want.item} />
                </span>
                <span className={styles.place} data-filled={index < given.length}>
                  {index < given.length && gift(index)}
                </span>
              </span>
            ))}
          </button>
        ) : (
          <>
            <div className={`${lesson.prompt ?? ''} ${styles.wanting ?? ''}`} data-same={same}>
              <span className="sr-only">{friends}</span>
              <Picture
                key={countingFriends ? `count-${String(turn)}` : 'still'}
                stimulus={task.want}
                counting={countingFriends}
                place="prompt"
              />
            </div>
            <button
              type="button"
              className={styles.tray}
              data-same={same}
              data-counting={countingGiven ? 'given' : undefined}
              data-given={given.length}
              aria-label={`${givenSoFar}. Take one back.`}
              aria-disabled={busy || held.length <= floor}
              onClick={takeBack}
            >
              {revealed &&
                Array.from({ length: wanted - given.length }, (_, index) => (
                  <span key={`place-${String(index)}`} className={styles.ghost} />
                ))}
              {given.map((_, index) => gift(index, countingGiven ? count : 'still'))}
            </button>
          </>
        )}

        <button
          type="button"
          className={styles.pile}
          aria-label={`Give one ${task.item}. ${String(task.pile - given.length)} left.`}
          aria-disabled={busy || full}
          data-full={full}
          onClick={give}
        >
          {Array.from({ length: task.pile }, (_, index) => (
            <span
              key={index}
              className={styles.spot}
              data-spot={index}
              data-gone={given.includes(index)}
            >
              <Thing item={task.item} />
            </span>
          ))}
        </button>
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
        done={{
          ready: held.length > 0,
          submit: () => void runner.answer(String(held.length)),
        }}
      />
    </>
  );
}
