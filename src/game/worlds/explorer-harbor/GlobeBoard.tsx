import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { Foot, type BoardProps } from '@/game/lesson/frame';
import { useChoosing } from '@/game/lesson/boards/useChoosing';
import lesson from '@/game/lesson/Lesson.module.css';
import { IconCheck, IconPointer } from '@/ui/icons';
import places from '@/content/explorer-harbor/places.json';
import {
  between,
  dragged,
  inSight,
  steady,
  viewOf,
  type LonLat,
  type View,
} from '@/content/explorer-harbor/globe';
import { BALL, Globe, Heard, LandShape, placed } from './Globe';
import { LandmarkPicture } from './landmarks';
import { BACK_AFTER_MS, SLOP, TIP_STEP, TURN_MS, TURN_STEP } from './turning';
import styles from './explorerHarbor.module.css';

const MIDDLES: Readonly<Record<string, { at: number[] }>> = places.continents;

const placeOf = (value: unknown): LonLat | null => {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [lon, lat] = value as unknown[];
  return typeof lon === 'number' && typeof lat === 'number' ? [lon, lat] : null;
};

/**
 * The globe's view, and the ways it changes: by itself, gently, to wherever it should rest (a new question, a
 * place that has been found); under a finger; and by a button or a key, a step at a time.
 */
function useTurning(rest: View, calm: boolean) {
  const [view, setView] = useState<View>(rest);
  const [turning, setTurning] = useState(false);
  /** The view as it is this instant, for what happens between two drawings. */
  const now = useRef<View>(rest);
  const frame = useRef(0);

  const show = useCallback((next: View) => {
    now.current = next;
    setView(next);
  }, []);

  const stop = useCallback(() => {
    if (frame.current !== 0) cancelAnimationFrame(frame.current);
    frame.current = 0;
    setTurning(false);
  }, []);

  /**
   * Turn to a view, gently. `then` is what follows the turn, and is called when the globe has got there, however
   * long that took: a turn that something else takes over (another turn, a finger) is not followed by anything.
   */
  const turnTo = useCallback(
    (to: View, ms: number, then?: () => void) => {
      stop();
      const from = now.current;
      const end = steady(to);
      if (calm || ms <= 0 || (from.lon === end.lon && from.lat === end.lat)) {
        show(end);
        then?.();
        return;
      }
      setTurning(true);
      const began = performance.now();
      const step = (time: number) => {
        const share = Math.min(1, Math.max(0, (time - began) / ms));
        // Quick at first and slow to a stop, as a real globe that has been given a push.
        show(share >= 1 ? end : between(from, end, 1 - (1 - share) ** 3));
        if (share < 1) {
          frame.current = requestAnimationFrame(step);
        } else {
          frame.current = 0;
          setTurning(false);
          then?.();
        }
      };
      frame.current = requestAnimationFrame(step);
    },
    [calm, show, stop],
  );

  // To where it should rest, whenever that changes: a new question, or a place found on this one.
  const { lon, lat } = rest;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    turnTo({ lon, lat }, TURN_MS.question);
  }, [lon, lat, turnTo]);
  useEffect(() => stop, [stop]);

  return { view, turning, now, show, stop, turnTo };
}

/** A pin: a white button with a dot, the same on every land. Which land it stands on is the whole question. */
function PinMark() {
  return (
    <svg className={styles.pinMark} viewBox="-12 -12 24 24" aria-hidden="true" focusable="false">
      <circle r="9.500" fill="#22304f" opacity="0.220" cy="1.400" />
      <circle r="9" fill="#ffffff" />
      <circle r="4.600" fill="#e2573f" />
    </svg>
  );
}

/** An arrow that goes round: which way a button turns the globe. */
function TurnArrow({ to }: { to: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      aria-hidden="true"
      focusable="false"
      style={to === 'right' ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M19 15.500a8 8 0 0 0-14-4.200"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.600"
        strokeLinecap="round"
      />
      <path
        d="M4.300 5.800v5.700h5.700"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.600"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The globe, to answer on. The lands to choose between each have a pin, and a tap on a pin is the answer: the
 * same pin on every one, so that nothing says which land is which but the land.
 *
 * Beside it is what is asked for: the shape of a land, drawn plainly; or a famous place and the shape of the land
 * it is in; or, where the question is only heard, nothing until help is asked for, and then the shape.
 *
 * The globe can be turned: pulled with a finger, or a step at a time with the two buttons or the arrow keys. It
 * cannot be turned to where the question cannot be answered and left there: when a pin has gone out of sight, it
 * turns back by itself. When the land has been found, the globe turns to look at it; and a famous place that
 * has been found is put on the globe where the place is.
 */
export function GlobeBoard(props: BoardProps) {
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
  } = useChoosing(props);
  const { stimulus } = challenge.prompt;
  const of = stimulus.type === 'scene' ? stimulus.of : {};
  const ask = typeof of.ask === 'string' ? of.ask : '';
  const want = typeof of.want === 'string' ? of.want : '';
  const landmark = typeof of.landmark === 'string' ? of.landmark : null;
  // What the question is made of does not change while it is asked: each of these is worked out once.
  const home = useMemo(() => placeOf(of.view), [of.view]);
  const place = useMemo(() => placeOf(of.at), [of.at]);
  const middle = useMemo(() => placeOf(MIDDLES[want]?.at), [want]);

  // A famous place that has been found is put where it is.
  const found = same && landmark !== null && place !== null;
  // Where the globe rests: as the question has it; and when the land has been found, looking at that land (and
  // at the famous place in it), wherever a child had turned the globe to.
  const rest = useMemo((): View => {
    if (same && middle) return viewOf(found ? [place, middle] : [middle]);
    const [lon, lat] = home ?? [0, 0];
    return { lon, lat };
  }, [same, found, place, middle, home]);
  const { view: globe, turning, now, show, stop, turnTo } = useTurning(rest, calm);

  const pins = view.choices.flatMap(({ choice, available }) => {
    const at = choice.stimulus.type === 'scene' ? placeOf(choice.stimulus.of.at) : null;
    return at ? [{ choice, available, at, ...standingOf(choice, available) }] : [];
  });

  // Turned by hand, the globe is left as it is while every pin that can still be chosen is in sight. When one is
  // not, it waits a moment and turns back: a child can look round the world and never lose the question.
  const back = useRef(0);
  const open = pins
    .filter((pin) => pin.look === 'open' || pin.look === 'same')
    .map((pin) => pin.at);
  const settle = () => {
    window.clearTimeout(back.current);
    const lost = open.some((at) => !inSight(now.current, at));
    if (lost) back.current = window.setTimeout(() => turnTo(rest, TURN_MS.back), BACK_AFTER_MS);
  };
  useEffect(() => () => window.clearTimeout(back.current), []);
  // What follows a turn by a button or a key is decided when the turn is over, by the board as it is then.
  const settleNow = useRef(settle);
  useEffect(() => {
    settleNow.current = settle;
  });
  // A new question, or a place found: the globe is on its way there, and nothing is owed to where it was.
  useEffect(() => {
    window.clearTimeout(back.current);
  }, [rest]);

  /**
   * Answer with a pin, if it can be answered with now. A press on a pin is told of twice, as the finger comes
   * up and again by the click a browser makes of it, and is taken once: by the time the click comes the pin
   * has been answered with and is waiting, and the lesson's runner takes no second answer while it is busy
   * with the first.
   */
  const choose = (id: string) => {
    const pin = pins.find(({ choice }) => choice.id === id);
    if (!pin || pin.waiting) return;
    void runner.answer(id);
  };

  const turnBy = (lon: number, lat: number) => {
    if (lon !== 0) lastTurned.current = lon < 0 ? 'left' : 'right';
    window.clearTimeout(back.current);
    // Whether a pin has gone out of sight is asked when the globe has got there, and the wait before it turns
    // back is counted from then. (It was counted from the press, as the time a turn takes and then the wait. A
    // page that stopped for two seconds in the middle of a turn then woke to find it was time to turn back, and
    // turned back from half-way: the turn was never finished. CI's run 54 met it once, on a busy machine.)
    turnTo({ lon: now.current.lon + lon, lat: now.current.lat + lat }, TURN_MS.step, () =>
      settleNow.current(),
    );
  };

  /** The pin a press landed on, if it landed on one: the one that holds what was touched. */
  const pinAt = (target: EventTarget | null): string | null =>
    (target instanceof Element ? target.closest<HTMLElement>('[data-choice]') : null)?.dataset
      .choice ?? null;

  // A pull. Until the finger has moved further than a press may slip, it is a press, and the pin under it has it.
  const pull = useRef<{
    id: number;
    x: number;
    y: number;
    from: View;
    moved: boolean;
    /** The pin the finger came down on. */
    pin: string | null;
  } | null>(null);
  /** A pull has just ended: the click that the browser makes of it is not a press. */
  const pulled = useRef(false);
  const [pulling, setPulling] = useState(false);
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // One finger turns the globe, and the first one down is the one: a second finger is nothing to do with it.
    if (pull.current !== null || !event.isPrimary) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pulled.current = false;
    pull.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      from: now.current,
      moved: false,
      pin: pinAt(event.target),
    };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const held = pull.current;
    if (held?.id !== event.pointerId) return;
    const dx = event.clientX - held.x;
    const dy = event.clientY - held.y;
    if (!held.moved) {
      if (Math.hypot(dx, dy) < SLOP) return;
      held.moved = true;
      // From where the globe is now: it may have been turning by itself when the finger came down.
      held.from = now.current;
      held.x = event.clientX;
      held.y = event.clientY;
      window.clearTimeout(back.current);
      stop();
      setPulling(true);
      try {
        // So that the pull goes on when the finger leaves the globe's square.
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // The finger has gone already (a flick): what it did while it was down still counts.
      }
      return;
    }
    // The ball's own radius on the screen: a little less than half its picture, which has room for its edge.
    const radius = (event.currentTarget.getBoundingClientRect().width / 2) * BALL || 1;
    show(dragged(held.from, dx / radius, dy / radius));
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const held = pull.current;
    if (held?.id !== event.pointerId) return;
    pull.current = null;
    if (!held.moved) {
      // A press: down and up on the same pin, without a pull between. It is taken here, as the finger comes
      // up, and not left to the click a browser makes of it: for a fifth of a second after a globe has been
      // flicked, Chromium makes no click of a tap at all (it takes the tap for a hand put out to stop a page
      // that is still gliding), and a child who flicked the globe and at once pressed a pin pressed nothing.
      const pin = pinAt(document.elementFromPoint(event.clientX, event.clientY));
      if (event.type === 'pointerup' && held.pin !== null && pin === held.pin) choose(held.pin);
      return;
    }
    // The click a browser may make of the end of a pull comes at once, before anything else can be pressed.
    pulled.current = true;
    window.setTimeout(() => {
      pulled.current = false;
    }, 0);
    setPulling(false);
    settle();
  };

  /**
   * The pin that holds the keyboard, if one does. A pin that has gone round the back of the world cannot hold
   * it (it is not there to be pressed), and a browser that takes the keyboard away from it gives it to nothing:
   * the next arrow key would then turn nothing, and Tab would start again from the top of the page. So it is
   * handed to the button that turns the globe the way it was last turned, where the next arrow key still works.
   */
  const holdsKeys = useRef<string | null>(null);
  const lastTurned = useRef<'left' | 'right'>('right');
  const turnLeft = useRef<HTMLButtonElement>(null);
  const turnRight = useRef<HTMLButtonElement>(null);
  const outOfSight = pins
    .filter((pin) => !inSight(globe, pin.at))
    .map((pin) => pin.choice.id)
    .join(' ');
  useLayoutEffect(() => {
    const holder = holdsKeys.current;
    if (holder === null || !outOfSight.split(' ').includes(holder)) return;
    (lastTurned.current === 'left' ? turnLeft : turnRight).current?.focus();
  }, [outOfSight]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const by: Readonly<Record<string, [number, number]>> = {
      ArrowLeft: [-TURN_STEP, 0],
      ArrowRight: [TURN_STEP, 0],
      ArrowUp: [0, TIP_STEP],
      ArrowDown: [0, -TIP_STEP],
    };
    const turn = by[event.key];
    if (!turn || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    turnBy(turn[0], turn[1]);
  };

  // The shape of the land that is asked for: there from the start where it is to be matched; in a question that
  // is only heard, when help is asked for, and when the land has been found.
  const helping = state.hint !== null && !answered;
  const shape = ask !== 'name' || view.hintsUsed > 0 || same;

  return (
    <>
      <div className={styles.globeBoard} data-testid="globe-board" data-ask={ask} inert={paused}>
        <div className={styles.globeLayout}>
          <span className="sr-only">{module.describe(stimulus, 'prompt')}</span>

          <div className={styles.wanted} data-helping={helping} data-testid="wanted">
            {landmark !== null && (
              <span className={styles.wantedTile} data-wanted="place">
                <LandmarkPicture id={landmark} className={styles.wantedPicture} />
              </span>
            )}
            <span className={styles.wantedTile} data-wanted={shape ? 'shape' : 'heard'}>
              {shape ? (
                <LandShape land={want} className={styles.wantedPicture} />
              ) : (
                <Heard className={styles.wantedPicture} />
              )}
            </span>
          </div>

          <div
            className={styles.globeBox}
            data-testid="globe"
            data-turning={turning}
            data-pulling={pulling}
            data-same={same}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          >
            <Globe view={globe} lit={same ? want : null} />
            <ul className={styles.pins}>
              {pins.map(({ choice, at, isAnswer, isTried, held, look, waiting }, index) => {
                // The place that has been found stands where it is; every other pin, in the middle of its land.
                const landed = found && isAnswer;
                const here = landed ? place : at;
                const behind = !inSight(globe, here);
                return (
                  // Keyed by step, so a new question gets new pins instead of sliding the old ones about.
                  <li
                    key={`${String(view.stepIndex)}-${choice.id}`}
                    style={placed(globe, here)}
                    data-behind={behind}
                    inert={behind}
                  >
                    <button
                      type="button"
                      className={styles.pin}
                      style={{ '--order': index } as CSSProperties}
                      data-state={look}
                      data-choice={choice.id}
                      data-lit={isAnswer && same}
                      data-landed={landed}
                      data-asking={beat.show === 'ask' && look === 'open'}
                      data-named={named(choice.id)}
                      data-just-tried={isTried && !held}
                      aria-label={choice.label}
                      aria-disabled={waiting}
                      onKeyDown={onKeyDown}
                      onFocus={() => {
                        holdsKeys.current = choice.id;
                      }}
                      onBlur={() => {
                        if (holdsKeys.current === choice.id) holdsKeys.current = null;
                      }}
                      onClick={() => {
                        // The end of a pull is not a press, whatever the browser makes of it. A click that
                        // comes of nothing a finger did (the keyboard, a screen reader) is a press.
                        if (pulled.current) return;
                        choose(choice.id);
                      }}
                    >
                      <span className={styles.pinHead}>
                        {landed ? (
                          <LandmarkPicture id={landmark} className={styles.landedPicture} />
                        ) : (
                          <PinMark />
                        )}
                      </span>
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
                );
              })}
            </ul>
          </div>

          <button
            type="button"
            className={styles.turn}
            ref={turnLeft}
            data-turn="left"
            data-aside="true"
            aria-label="Turn the globe to the left"
            onKeyDown={onKeyDown}
            onClick={() => {
              turnBy(-TURN_STEP, 0);
            }}
          >
            <TurnArrow to="left" />
          </button>
          <button
            type="button"
            className={styles.turn}
            ref={turnRight}
            data-turn="right"
            data-aside="true"
            aria-label="Turn the globe to the right"
            onKeyDown={onKeyDown}
            onClick={() => {
              turnBy(TURN_STEP, 0);
            }}
          >
            <TurnArrow to="right" />
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
        onAgain={again}
      />
    </>
  );
}
