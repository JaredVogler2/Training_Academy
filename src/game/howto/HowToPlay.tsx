import { useEffect, useReducer, useRef, type CSSProperties, type ReactNode } from 'react';
import { recordError } from '@/app/diagnostics';
import { navigate } from '@/app/navigation';
import {
  addVoice,
  hushVoice,
  playCount,
  playCue,
  playTone,
  sayLine,
  sayLineIfQuiet,
  voice,
} from '@/audio';
import { KitPicture, wordFor } from '@/art/pictures';
import { setHelping, useHelping } from '@/game/helping';
import boards from '@/game/lesson/boards/boards.module.css';
import lesson from '@/game/lesson/Lesson.module.css';
import { lessonText } from '@/game/lesson/text';
import { activeProfile, refreshProfiles, updateProfile } from '@/game/profiles';
import { Guide, type GuideState } from '@/ui/Guide';
import { ActionButton, ActionLink, HoldToggle } from '@/ui/controls';
import { IconCheck, IconGrownUps, IconHome, IconNext, IconPointer, IconSayAgain } from '@/ui/icons';
import { commonVoice } from '@/voice/common';
import {
  AGAIN,
  IDLE_DONE_MS,
  IDLE_MS,
  PLACE,
  STEPS,
  begin,
  choosing,
  isOver,
  move,
  nextTarget,
  reminderFor,
  showingOf,
  stepOf,
  type HowTo,
  type Move,
  type Mover,
  type Target,
} from './steps';
import { captionOf, howToText } from './text';
import styles from './howto.module.css';

/** Every line this page may say, fetched as it opens so that each starts on time. */
const LINES = [
  'howto.hello',
  'howto.choose',
  'howto.place',
  'howto.done',
  'howto.again',
  'howto.yes',
  'howto.end',
  'help.answers',
  'help.done',
  'help.next',
];

/** Write down that the player who is playing has been shown how to play, so that it is not shown unasked again. */
async function rememberShown(): Promise<void> {
  const player = activeProfile(await refreshProfiles());
  if (!player || player.settings.howTo === 'seen') return;
  await updateProfile(player.id, { settings: { ...player.settings, howTo: 'seen' } });
}

/*
 * What a tap does is decided in one place, `move` in steps.ts, and nowhere here: a board asks, whatever the
 * moment, and is told. (The boards used to ask only when they thought the answer would be yes. That second
 * opinion hid a fault in the rules from every test that taps the screen.)
 */

/**
 * Glim's hand, on whatever it is drawn inside. On a card it hangs a little below the card, as it does in every
 * activity. On something at the foot of the screen (`foot`) there is nothing below to hang into, so it stands
 * inside the thing.
 */
function Hand({ on, at, foot = false }: { on: Target | null; at: Target; foot?: boolean }) {
  if (on !== at) return null;
  return (
    <span
      className={foot ? `${lesson.pointer} ${styles.footHand}` : lesson.pointer}
      aria-hidden="true"
      data-testid="how-to-hand"
      data-on={at}
    >
      <IconPointer size={44} />
    </span>
  );
}

function Choosing({ state, tap }: { state: HowTo; tap: (action: Move) => void }) {
  const { same, choices } = choosing(state);
  const mine = state.phase === 'turn';
  return (
    <div className={lesson.board} data-count={choices.length} data-prompt="picture">
      <div className={lesson.prompt} data-same={state.chosen !== null}>
        <span className="sr-only">{wordFor(same)}</span>
        <KitPicture id={same} className={styles.picture} />
      </div>
      <ul className={lesson.choices} data-count={choices.length}>
        {choices.map((id, index) => (
          // Keyed by showing, so that the child's turn gets new cards instead of the old ones changed.
          <li key={`${String(state.round)}-${state.phase === 'show' ? 'show' : 'turn'}-${id}`}>
            <button
              type="button"
              className={lesson.choice}
              style={{ '--order': index } as CSSProperties}
              data-state={state.chosen === id ? 'same' : state.tried === id ? 'tried' : 'open'}
              data-choice={id}
              data-lit={state.chosen === id}
              aria-label={wordFor(id)}
              aria-disabled={!mine}
              onClick={() => tap({ type: 'choose', choice: id })}
            >
              <KitPicture id={id} className={styles.picture} />
              {state.chosen === id && (
                <span className={lesson.tick} aria-hidden="true">
                  <IconCheck size={22} />
                </span>
              )}
              <Hand on={state.hand} at={`choice:${id}`} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Placing({ state, tap }: { state: HowTo; tap: (action: Move) => void }) {
  const mine = state.phase === 'turn';
  return (
    <div className={boards.order} data-count={PLACE.cards.length}>
      <ol className={boards.slots} data-same={state.handedIn}>
        {state.placed.map((id, index) => (
          <li key={index}>
            <button
              type="button"
              className={boards.slot}
              style={{ '--order': index } as CSSProperties}
              data-slot={index}
              data-filled={id !== null}
              aria-label={`${lessonText.place(index + 1)}: ${id === null ? lessonText.empty : wordFor(id)}`}
              aria-disabled={!mine || id === null}
              onClick={() => tap({ type: 'take-back', place: index })}
            >
              {id !== null && (
                <span key={id} className={boards.slotted}>
                  <KitPicture id={id} className={styles.picture} />
                </span>
              )}
              <span className={boards.slotMarks} aria-hidden="true">
                {Array.from({ length: index + 1 }, (_, mark) => (
                  <i key={mark} />
                ))}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <ul className={boards.tray} data-count={PLACE.cards.length}>
        {PLACE.cards.map((id, index) => {
          const gone = state.placed.includes(id);
          return (
            <li key={`${String(state.round)}-${id}`}>
              <button
                type="button"
                className={boards.card}
                style={{ '--order': index } as CSSProperties}
                data-card={id}
                data-gone={gone}
                aria-label={wordFor(id)}
                aria-disabled={!mine || gone}
                aria-hidden={gone}
                tabIndex={gone ? -1 : undefined}
                onClick={() => tap({ type: 'place', card: id })}
              >
                <KitPicture id={id} className={styles.picture} />
                <Hand on={state.hand} at={`card:${id}`} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Ringing({ state }: { state: HowTo }) {
  return (
    <div className={styles.single}>
      <div className={lesson.prompt} data-rung={state.rung} data-testid="how-to-bell">
        <span className="sr-only" role="status">
          {state.rung > 0 ? howToText.rings : howToText.bell}
        </span>
        {/* Keyed by how often it has rung, so that each ring swings it from the start. */}
        <span key={state.rung} className={styles.bell} data-ringing={state.rung > 0}>
          <KitPicture id={AGAIN.picture} className={styles.picture} />
        </span>
      </div>
    </div>
  );
}

/** A button with Glim's hand able to stand on it. */
function Way({ children }: { children: ReactNode }) {
  return <span className={styles.way}>{children}</span>;
}

/**
 * How to play. Glim shows three things, and after each the child does it: tap the one that is asked for; tap a
 * picture and it goes to its place, then the tick; tap Glim to have something shown again. Then the arrow, which
 * is the way on everywhere in the game.
 *
 * It is made of the game's own boards and foot, so it looks and behaves like an activity; but nothing in it is a
 * question, nothing is recorded, and the way out (the house, top left) is there from the first moment. A new
 * player meets it once, straight after choosing their picture; a grown-up can open it again from their area.
 */
export default function HowToPlay() {
  const [state, act] = useReducer(
    (before: HowTo, { by, action }: { by: Mover; action: Move }) => move(before, by, action),
    undefined,
    begin,
  );
  const helping = useHelping();
  const step = stepOf(state);
  const { phase, round } = state;
  const over = isOver(state);
  const child = (action: Move) => act({ by: 'child', action });

  // The lines this page says belong to the lines every world shares.
  useEffect(() => {
    addVoice(commonVoice);
    voice().prepare(LINES);
    // Leaving, by any road: whatever was being said stops, and this player has been shown (or has passed it
    // by, which is theirs to do).
    return () => {
      hushVoice();
      rememberShown().catch((error: unknown) => recordError('storage', error));
    };
  }, []);

  // The last of the three is done: this player has been shown, and it is written down now, while the page is
  // certainly still open, and not left for the moment of leaving. (Left for then, a page closed the instant
  // "how to play" ended had not been written, and the child was shown it all again.)
  const shown = step === 'again' && phase === 'done';
  useEffect(() => {
    if (shown) rememberShown().catch((error: unknown) => recordError('storage', error));
  }, [shown]);

  // All three done: on to the islands. The way back does not return here.
  useEffect(() => {
    if (over) navigate({ name: 'home' }, { replace: true });
  }, [over]);

  // A showing: its beats, one after another. Begun again from the first whenever the showing is.
  useEffect(() => {
    if (step === null || phase !== 'show') return;
    const first = state.step === 0 && round === 0;
    let timer = 0;
    // How long each beat waits is worked out when the beat before it has happened, and not all at the start.
    // How long a line takes is known only while the voice can be heard, and the tap that brought a new player
    // here is the tap that wakes it: a moment too early and every line is taken for unheard, and the next
    // begins on top of its last word.
    const play = (index: number) => {
      const beat = showingOf(step, first, voice().seconds)[index];
      if (!beat) return;
      timer = window.setTimeout(() => {
        if (beat.say !== undefined) sayLine(beat.say);
        if (beat.do) act({ by: 'glim', action: beat.do });
        play(index + 1);
      }, beat.wait);
    };
    play(0);
    return () => window.clearTimeout(timer);
  }, [step, phase, round, state.step]);

  // What is heard as things happen. Sounds go with the pictures; nothing depends on hearing them.
  const placedCount = state.placed.filter((card) => card !== null).length;
  const before = useRef({ placedCount: 0, rung: 0 });
  useEffect(() => {
    if (state.chosen !== null) playCue('success');
  }, [state.chosen]);
  useEffect(() => {
    if (state.tried !== null) playCue('again');
  }, [state.tried]);
  useEffect(() => {
    if (state.handedIn) playCue('success');
  }, [state.handedIn]);
  useEffect(() => {
    if (placedCount > before.current.placedCount) playCount(placedCount - 1);
    else if (placedCount < before.current.placedCount && phase === 'turn') playCue('off');
    before.current.placedCount = placedCount;
  }, [placedCount, phase]);
  useEffect(() => {
    if (state.rung > before.current.rung) playTone('bar', AGAIN.note);
    before.current.rung = state.rung;
  }, [state.rung]);

  // The child has done it: Glim says so. After the last of the three, that this is all there is to it.
  useEffect(() => {
    if (phase !== 'done' || step === null) return;
    if (step !== 'again') {
      sayLine('howto.yes');
      return;
    }
    sayLine('howto.again');
    const timer = window.setTimeout(
      () => sayLine('howto.end'),
      Math.max(1200, voice().seconds('howto.again') * 1000 + 300),
    );
    return () => window.clearTimeout(timer);
  }, [phase, step]);

  // Nothing tapped for a while: Glim's hand goes to what there is to tap, and says what it is, if nothing is
  // being said. Once for each thing: a child who is looking is not nagged.
  const waitingOn = nextTarget(state);
  useEffect(() => {
    if (waitingOn === null) return;
    const timer = window.setTimeout(
      () => {
        act({ by: 'glim', action: { type: 'hand', on: waitingOn } });
        sayLineIfQuiet(reminderFor(waitingOn));
      },
      phase === 'done' ? IDLE_DONE_MS : IDLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [waitingOn, phase, state.tried, state.rung]);

  if (step === null) return null;

  const mood: GuideState = phase === 'done' ? 'celebrate' : phase === 'show' ? 'point' : 'think';
  const ready = step === 'place' && placedCount === PLACE.cards.length && !state.handedIn;
  return (
    <div
      className={lesson.lesson}
      data-role="explorer"
      data-testid="how-to"
      data-step={step}
      data-phase={phase}
      data-round={round}
      data-helping={helping || undefined}
    >
      <div className={lesson.bar}>
        <ActionLink
          to={{ name: 'home' }}
          round
          className={lesson.barButton}
          icon={<IconHome />}
          aria-label={howToText.skip}
          data-tip={howToText.skip}
          data-tip-align="start"
        />
        <ol className={lesson.steps} aria-label={howToText.progress(state.step + 1, STEPS.length)}>
          {STEPS.map((each, index) => (
            <li
              key={each}
              className={lesson.step}
              data-state={index < state.step ? 'done' : index === state.step ? 'now' : 'ahead'}
              aria-hidden="true"
            />
          ))}
        </ol>
        <div className={lesson.barEnd}>
          {/* A grown-up's to set, so it is held to change: a tap, by anyone, does nothing to it. */}
          <HoldToggle
            pressed={helping}
            label={lessonText.helping}
            stateText={helping ? lessonText.helpingOn : lessonText.helpingOff}
            icon={<IconGrownUps />}
            onChange={(on) => {
              setHelping(on);
              playCue(on ? 'on' : 'off');
            }}
          />
        </div>
      </div>

      <h1 className="sr-only">{howToText.title}</h1>
      {step === 'choose' && <Choosing state={state} tap={child} />}
      {step === 'place' && <Placing state={state} tap={child} />}
      {step === 'again' && <Ringing state={state} />}

      <div className={lesson.foot}>
        {/* Glim is the "show me again" button, here as in every activity. */}
        <button
          type="button"
          className={lesson.again}
          aria-label={lessonText.sayAgain}
          data-tip={lessonText.sayAgain}
          data-tip-side="top"
          data-tip-align="start"
          onClick={() => child({ type: 'again' })}
        >
          <Guide state={mood} aim={62} className={lesson.guide} />
          <span className={lesson.againBadge} aria-hidden="true">
            <IconSayAgain size={22} />
          </span>
          <Hand on={state.hand} at="glim" foot />
        </button>
        <p
          className={lesson.caption}
          role="status"
          aria-live="polite"
          data-tone={phase === 'done' ? 'correct' : undefined}
        >
          {captionOf(state)}
        </p>
        {phase === 'done' ? (
          <Way>
            <ActionButton
              key={`${String(state.step)}-next`}
              tone="sun"
              big
              className={lesson.next}
              icon={<IconNext size={32} />}
              onClick={() => {
                playCue('step');
                child({ type: 'next' });
              }}
            >
              {lessonText.next}
            </ActionButton>
            <Hand on={state.hand} at="next" foot />
          </Way>
        ) : (
          step === 'place' && (
            <Way>
              <ActionButton
                tone="sun"
                big
                className={lesson.done}
                icon={<IconCheck size={32} />}
                // Not `disabled`: Glim's hand presses it in the showing, and it is there to be seen all along.
                aria-disabled={!ready || phase !== 'turn'}
                data-ready={ready}
                data-pale={!ready && !state.handedIn}
                onClick={() => child({ type: 'hand-in' })}
              >
                {lessonText.done}
              </ActionButton>
              <Hand on={state.hand} at="tick" foot />
            </Way>
          )
        )}
      </div>
    </div>
  );
}
