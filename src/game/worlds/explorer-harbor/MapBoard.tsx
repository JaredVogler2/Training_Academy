import type { CSSProperties } from 'react';
import { Foot, type BoardProps } from '@/game/lesson/frame';
import { useChoosing } from '@/game/lesson/boards/useChoosing';
import lesson from '@/game/lesson/Lesson.module.css';
import { IconCheck, IconPointer } from '@/ui/icons';
import { MAP, distance, pointOf, type Point } from '@/content/explorer-harbor/maps';
import styles from './explorerHarbor.module.css';

/** Where a point of the map is on the screen, as a share of the map's own box. */
const placed = (point: Point): CSSProperties => ({
  left: `${String((point.x / MAP.width) * 100)}%`,
  top: `${String((point.y / MAP.height) * 100)}%`,
});

/** Where a boat stops when it sails to a place: just short of it, so that it does not sit on what is there. */
function alongside(from: Point, to: Point): Point {
  const far = distance(from, to);
  const short = Math.max(0, far - LANDING) / (far || 1);
  return { x: from.x + (to.x - from.x) * short, y: from.y + (to.y - from.y) * short };
}
const LANDING = 13;

/** A small boat with one sail. The middle of the drawing is where the boat is. */
function Boat() {
  return (
    <svg viewBox="-8 -9 16 16" aria-hidden="true" focusable="false">
      <path d="M-6.500 1.500h13l-2.200 3.800h-8.600z" fill="#c94f3b" />
      <path
        d="M0 1V-7.500"
        fill="none"
        stroke="#22304f"
        strokeWidth="0.900"
        strokeLinecap="round"
      />
      <path d="M0.800-7.500l5 7.200h-5z" fill="#ffffff" />
      <path d="M-0.800-5.500l-3.800 5.200h3.800z" fill="#fff1d6" />
    </svg>
  );
}

/**
 * A map to answer on. The places to choose between are on the map itself, where they are, and a tap on one is
 * the answer: nothing has to be found on a map and then found again in a row of cards.
 *
 * Where the question is about how far away things are, the boat it is asked about is on the map too. When help
 * is asked for, a line is drawn from the boat to each place, so that the lines can be compared; and when the
 * answer is shown, the boat sails to it.
 */
export function MapBoard(props: BoardProps) {
  const { state, runner, pack, module, paused, calm } = props;
  const {
    challenge,
    view,
    answered,
    again,
    shown,
    script,
    beat,
    named,
    mood,
    aim,
    same,
    standingOf,
    over,
  } = useChoosing(props);
  const { Picture } = module;
  const { stimulus } = challenge.prompt;
  const of = stimulus.type === 'scene' ? stimulus.of : {};
  const ask = typeof of.ask === 'string' ? of.ask : '';
  const boat = pointOf(of.boat);

  const spots = view.choices.flatMap(({ choice, available }) => {
    const at =
      choice.stimulus.type === 'scene'
        ? pointOf([choice.stimulus.of.x, choice.stimulus.of.y])
        : null;
    return at ? [{ choice, available, at, ...standingOf(choice, available) }] : [];
  });
  const answer = spots.find((spot) => spot.isAnswer) ?? null;
  // Help that shows the map itself: which part is water, or how far each place is.
  const helping = state.hint !== null && !answered;
  // The boat sets off for the answer once the answer is being shown as right.
  const arrived = boat !== null && answer !== null && same;

  return (
    <>
      <div
        className={styles.mapBoard}
        data-testid="map-board"
        data-ask={ask}
        data-shown={over}
        inert={paused}
      >
        <div className={styles.map} data-same={same} data-helping={helping ? ask : undefined}>
          <span className="sr-only">{module.describe(stimulus, 'prompt')}</span>
          <Picture stimulus={stimulus} place="prompt" solved={same} />

          {boat && (
            <svg
              className={styles.routes}
              viewBox={`0 0 ${String(MAP.width)} ${String(MAP.height)}`}
              aria-hidden="true"
              focusable="false"
            >
              {spots.map((spot) => {
                const drawn = arrived ? spot.isAnswer : helping && spot.available;
                return drawn ? (
                  <line
                    key={spot.choice.id}
                    x1={boat.x}
                    y1={boat.y}
                    x2={spot.at.x}
                    y2={spot.at.y}
                    data-route={spot.choice.id}
                    data-answer={spot.isAnswer}
                  />
                ) : null;
              })}
            </svg>
          )}

          <ul className={styles.spots}>
            {spots.map(({ choice, at, isAnswer, isTried, held, look, waiting }, index) => (
              // Keyed by step, so a new map gets new places instead of sliding the old ones about.
              <li key={`${String(view.stepIndex)}-${choice.id}`} style={placed(at)}>
                <button
                  type="button"
                  className={styles.spot}
                  style={{ '--order': index } as CSSProperties}
                  data-state={look}
                  data-choice={choice.id}
                  data-lit={isAnswer && same}
                  data-asking={beat.show === 'ask' && look === 'open'}
                  data-named={named(choice.id)}
                  data-just-tried={isTried && !held}
                  aria-label={choice.label}
                  aria-disabled={waiting}
                  onClick={() => {
                    if (waiting) return;
                    void runner.answer(choice.id);
                  }}
                >
                  <Picture stimulus={choice.stimulus} place="choice" />
                  {isAnswer && answered && (
                    <span className={lesson.tick} aria-hidden="true">
                      <IconCheck size={22} />
                    </span>
                  )}
                  {isAnswer && !answered && shown === choice.id && (
                    <span className={lesson.pointer} aria-hidden="true">
                      <IconPointer size={44} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {boat && (
            <span
              className={styles.boat}
              style={placed(arrived ? alongside(boat, answer.at) : boat)}
              data-testid="boat"
              data-arrived={arrived}
              aria-hidden="true"
            >
              <Boat />
            </span>
          )}
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
        onAgain={again}
      />
    </>
  );
}
