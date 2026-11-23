import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { loadChunk } from '@/app/chunks';
import { recordError } from '@/app/diagnostics';
import { navigate } from '@/app/navigation';
import { useReducedMotion } from '@/app/settings';
import { playCue } from '@/audio';
import { findLesson, hasPack, loadPack, packText } from '@/content';
import type { ContentPack, WorldId } from '@/engine';
import { LessonRunner, type RunnerState } from '@/game/lessonRunner';
import { ensureActiveProfile } from '@/game/profiles';
import { getRepository, localDay, newId, newSeed, now } from '@/game/services';
import { worldById } from '@/game/worlds';
import { hasWorldModule, loadWorldModule, type WorldModule } from '@/game/worlds/modules';
import { IslandPicture } from '@/render/IslandPicture';
import { Guide, type GuideState } from '@/ui/Guide';
import { ActionButton, ActionLink } from '@/ui/controls';
import {
  IconCheck,
  IconHint,
  IconHome,
  IconNext,
  IconPause,
  IconPointer,
  IconReplay,
  IconSayAgain,
} from '@/ui/icons';
import { PauseSheet } from './PauseSheet';
import { scriptFor, type Beat, type ScriptEvent } from './script';
import { lessonText } from './text';
import { useScript } from './useScript';
import styles from './Lesson.module.css';

/**
 * The lesson frame shared by every world: the way home, progress, help and pause along the top; the challenge in
 * the middle; and at the foot Glim, who shows what to do and shows it again when tapped, and the way on.
 *
 * It draws what the engine says and reports what the child taps; it never decides whether an answer is right.
 * A child who cannot read can use all of it: Glim demonstrates first, pictures carry the question, sounds follow
 * the pictures, and the captions are there for the grown-up alongside (and for screen readers).
 */

interface Loaded {
  runner: LessonRunner;
  pack: ContentPack;
  module: WorldModule;
}

type Load =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'failed'; error: Error }
  | ({ status: 'ready' } & Loaded);

/** Loads in flight, so two requests for the same lesson (React's development double-render) share one sitting. */
const inFlight = new Map<string, Promise<Loaded | null>>();

function openLesson(world: WorldId, lessonId: string): Promise<Loaded | null> {
  const key = `${world}/${lessonId}`;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const loading = (async (): Promise<Loaded | null> => {
    if (!hasPack(world) || !hasWorldModule(world)) return null;
    const [pack, module] = await Promise.all([
      loadChunk(`content:${world}`, () => loadPack(world)),
      loadWorldModule(world),
    ]);
    const lesson = findLesson(pack, lessonId);
    if (!lesson) return null;
    const [repository, profile] = await Promise.all([getRepository(), ensureActiveProfile()]);
    const runner = await LessonRunner.start({
      repository,
      pack,
      lesson,
      profileId: profile.id,
      now,
      newId,
      newSeed,
      localDay,
      elapsed: () => performance.now(),
      onSaveError: (error) => recordError('storage', error),
    });
    return { runner, pack, module };
  })();
  inFlight.set(key, loading);
  void loading.finally(() => inFlight.delete(key)).catch(() => undefined);
  return loading;
}

function useLesson(world: WorldId, lessonId: string): Load {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  useEffect(() => {
    let current = true;
    openLesson(world, lessonId).then(
      (loaded) => {
        if (current) setLoad(loaded ? { status: 'ready', ...loaded } : { status: 'missing' });
      },
      (error: unknown) => {
        if (current) {
          setLoad({
            status: 'failed',
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    );
    return () => {
      current = false;
    };
  }, [world, lessonId]);
  return load;
}

function Steps({ index, count }: { index: number; count: number }) {
  return (
    <ol
      className={styles.steps}
      aria-label={lessonText.progress(Math.min(index + 1, count), count)}
    >
      {Array.from({ length: count }, (_, step) => (
        <li
          key={step}
          className={styles.step}
          data-state={step < index ? 'done' : step === index ? 'now' : 'ahead'}
          aria-hidden="true"
        />
      ))}
    </ol>
  );
}

type Playing = Extract<RunnerState, { phase: 'playing' }>;

/** How long the guide wonders along with the child before settling down to wait. */
const PONDER_MS = 3200;

/** Where Glim, at the foot of the screen, points: up and a little left to the group, up and right to the choices. */
const AIM_AT_GROUP = 112;
const AIM_AT_CHOICES = 62;

/**
 * What the guide is doing, from what the lesson is doing. The guide never knows more than the engine has said:
 * it points at whatever is being shown, wonders when a question is new, is glad of a right answer, and after a
 * wrong one tilts its head and waits — never anything that looks like disappointment.
 */
function useGuide(state: Playing, beat: Beat): { mood: GuideState; aim: number } {
  const { view, feedback, hint } = state;
  const question = `${view.key}-${String(view.hintsUsed)}`;
  const [pondered, setPondered] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setPondered(question), PONDER_MS);
    return () => window.clearTimeout(timer);
  }, [question]);

  if (feedback?.outcome === 'correct') return { mood: 'celebrate', aim: 90 };
  if (beat.show === 'count') {
    return { mood: 'point', aim: beat.group === 'prompt' ? AIM_AT_GROUP : AIM_AT_CHOICES };
  }
  if (beat.show === 'ask') return { mood: 'point', aim: AIM_AT_CHOICES };
  if (feedback?.outcome === 'incorrect') return { mood: 'retry', aim: 90 };
  if (hint !== null || view.stage === 'demo') return { mood: 'point', aim: AIM_AT_CHOICES };
  return { mood: pondered === question ? 'idle' : 'think', aim: 90 };
}

function Challenge({
  state,
  runner,
  pack,
  module,
  paused,
}: { state: Playing; paused: boolean } & Loaded) {
  const { view, feedback, hint, answered, picked } = state;
  const { Picture } = module;
  const demo = view.stage === 'demo';
  const calm = useReducedMotion();
  const text = (key: string) => packText(pack, key);

  // How many times the child has asked to be shown again. Asking is free: it is not help, and nothing records it.
  const [asked, setAsked] = useState(0);

  // The right choice, only where the engine is showing it: a demonstration, a reveal, or an answer already given.
  const shown = view.shownAnswer ?? (answered ? picked : null);
  const tried = feedback?.outcome === 'incorrect' ? picked : null;
  const triedChoice = view.choices.find(({ choice }) => choice.id === tried)?.choice ?? null;

  const amount = module.countable?.(view.challenge.prompt.stimulus) ?? 0;
  const triedAmount = triedChoice ? (module.countable?.(triedChoice.stimulus) ?? 0) : null;
  const revealed = !demo && view.shownAnswer !== null;
  const event: ScriptEvent = feedback ? feedback.outcome : hint ? `hint-${hint.type}` : 'new';
  const script = useMemo(
    () => scriptFor({ stage: view.stage, event, amount, triedAmount, revealed }),
    [view.stage, event, amount, triedAmount, revealed],
  );
  const run = `${view.key}/${String(view.hintsUsed)}/${event}/${String(asked)}`;
  const { beat, turn } = useScript(script, run, !paused, calm);
  const counting = (group: 'prompt' | 'answer' | 'tried') =>
    beat.show === 'count' && beat.group === group;

  const { mood, aim } = useGuide(state, beat);

  // What the grown-up reads (and a screen reader announces): the question, then whatever just happened.
  const caption = feedback
    ? text(feedback.caption)
    : hint
      ? text(hint.caption)
      : demo
        ? `${lessonText.watch} ${text(view.challenge.prompt.instruction)}`
        : text(view.challenge.prompt.instruction);

  // The group and its match are lit together when the script says "the same" (at once, where nothing moves).
  const same = beat.show === 'same';

  return (
    <>
      <div className={styles.board} data-count={view.choices.length} inert={paused}>
        <div className={styles.prompt} data-same={same} data-asking={beat.show === 'ask'}>
          <span className="sr-only">
            {lessonText.thisGroup}
            {module.describe(view.challenge.prompt.stimulus)}
          </span>
          {/* Re-keyed whenever it is this picture's turn, so its counting starts from the first thing. */}
          <Picture
            key={counting('prompt') ? `count-${String(turn)}` : 'still'}
            stimulus={view.challenge.prompt.stimulus}
            counting={counting('prompt')}
          />
        </div>

        <ul className={styles.choices} data-count={view.choices.length}>
          {view.choices.map(({ choice, available }, index) => {
            const isAnswer = shown === choice.id;
            const isTried = tried === choice.id;
            const look = isAnswer ? 'same' : available ? 'open' : 'away';
            const hopping = (isAnswer && counting('answer')) || (isTried && counting('tried'));
            const waiting = !available || answered || demo;
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
                  data-comparing={isTried && counting('tried')}
                  data-just-tried={isTried && !available}
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

      <div className={styles.foot} inert={paused}>
        {/* Glim is the "show me again" button: tapping the one who showed it is how a child asks. */}
        <button
          type="button"
          className={styles.again}
          aria-label={lessonText.sayAgain}
          data-tip={lessonText.sayAgain}
          onClick={() => {
            playCue('tap');
            setAsked((times) => times + 1);
          }}
        >
          <Guide state={mood} aim={aim} className={styles.guide} />
          <span className={styles.againBadge} aria-hidden="true">
            <IconSayAgain size={22} />
          </span>
        </button>
        <p
          className={styles.caption}
          role="status"
          aria-live="polite"
          data-tone={feedback?.outcome}
        >
          {caption}
        </p>
        {(demo || answered) && (
          <ActionButton
            key={view.key}
            tone="sun"
            big
            className={demo ? styles.myTurn : styles.next}
            // The way on arrives when the showing is over; it is there, and works, from the start.
            style={{ '--after': `${String(calm ? 0 : script.length)}ms` } as CSSProperties}
            icon={<IconNext size={32} />}
            onClick={() => {
              playCue('step');
              void runner.next();
            }}
          >
            {demo ? lessonText.myTurn : lessonText.next}
          </ActionButton>
        )}
      </div>
    </>
  );
}

function Finished({
  state,
  runner,
  world,
}: {
  state: Extract<RunnerState, { phase: 'finished' }>;
  runner: LessonRunner;
  world: WorldId;
}) {
  const { summary } = state;
  return (
    <section className={styles.finished} data-testid="lesson-finished">
      <div className={styles.finishedArt}>
        <IslandPicture place={world} />
        <Guide state="celebrate" className={styles.finishedGuide} />
      </div>
      <h1>{lessonText.allDone}</h1>
      {/* One flower for each thing done: something has grown here, and nothing is being scored. */}
      <ol className={styles.grown} aria-hidden="true">
        {Array.from({ length: state.stepCount - 1 }, (_, index) => (
          <li key={index} className={styles.flower} style={{ '--order': index } as CSSProperties} />
        ))}
      </ol>
      {/* For the grown-up: what this sitting showed, in plain words, with no score for the child to chase. */}
      <p className={styles.report}>
        {lessonText.report(summary.independentFirstTryCorrect, summary.independentProbes)}
      </p>
      {!state.saved && <p className={styles.unsaved}>{lessonText.notSaved}</p>}
      <div className={styles.finishedActions}>
        <ActionButton
          big
          icon={<IconReplay />}
          onClick={() => {
            playCue('step');
            void runner.restart();
          }}
        >
          {lessonText.again}
        </ActionButton>
        <ActionLink to={{ name: 'home' }} tone="sun" big icon={<IconHome />}>
          {lessonText.islands}
        </ActionLink>
      </div>
    </section>
  );
}

function Player({ runner, pack, module, world }: Loaded & { world: WorldId }) {
  const state = useSyncExternalStore(runner.subscribe, runner.getState);
  const [paused, setPaused] = useState(false);
  const outcome = state.phase === 'playing' ? state.feedback?.outcome : undefined;
  const key = state.phase === 'playing' ? state.view.key : 'finished';

  // One sound per result. Sounds accompany the pictures; nothing depends on hearing them.
  useEffect(() => {
    if (outcome === 'correct') playCue('success');
    else if (outcome === 'incorrect') playCue('again');
  }, [outcome, key]);
  useEffect(() => {
    if (state.phase === 'finished') playCue('done');
  }, [state.phase]);

  // A phone put down, or another app opened on top: the activity waits, and asks for a tap to carry on.
  const inPlay = state.phase === 'playing';
  useEffect(() => {
    if (!inPlay) return;
    const whenHidden = () => {
      if (document.visibilityState === 'hidden') setPaused(true);
    };
    document.addEventListener('visibilitychange', whenHidden);
    return () => document.removeEventListener('visibilitychange', whenHidden);
  }, [inPlay]);

  const playing = state.phase === 'playing' ? state : null;
  const canHint =
    playing !== null &&
    !playing.answered &&
    playing.view.stage !== 'demo' &&
    playing.view.hintsAvailable > 0;

  return (
    <div
      className={styles.lesson}
      data-role={worldById(world).role}
      data-testid="lesson"
      data-paused={paused}
    >
      <div className={styles.bar} inert={paused}>
        <ActionLink
          to={{ name: 'home' }}
          round
          className={styles.barButton}
          icon={<IconHome />}
          aria-label={lessonText.leave}
        />
        {playing ? (
          <Steps index={playing.view.stepIndex} count={playing.view.stepCount} />
        ) : (
          <span />
        )}
        <div className={styles.barEnd}>
          {playing && (
            <>
              <ActionButton
                round
                className={styles.barButton}
                icon={<IconHint />}
                aria-label={lessonText.help}
                data-tip={lessonText.help}
                disabled={!canHint}
                onClick={() => {
                  playCue('tap');
                  void runner.hint();
                }}
              />
              <ActionButton
                round
                className={styles.barButton}
                icon={<IconPause />}
                aria-label={lessonText.pause}
                data-tip={lessonText.pause}
                onClick={() => {
                  playCue('tap');
                  setPaused(true);
                }}
              />
            </>
          )}
        </div>
      </div>
      {playing ? (
        <Challenge state={playing} runner={runner} pack={pack} module={module} paused={paused} />
      ) : (
        state.phase === 'finished' && <Finished state={state} runner={runner} world={world} />
      )}
      {playing && !playing.saved && <p className={styles.unsaved}>{lessonText.notSaved}</p>}
      <PauseSheet open={paused && playing !== null} onResume={() => setPaused(false)} />
    </div>
  );
}

export default function LessonView({ world, lessonId }: { world: WorldId; lessonId: string }) {
  const load = useLesson(world, lessonId);

  useEffect(() => {
    // An address for a lesson that does not exist goes back to the world it names.
    if (load.status === 'missing') navigate({ name: 'world', world }, { replace: true });
  }, [load.status, world]);

  if (load.status === 'failed') throw load.error;
  if (load.status !== 'ready') {
    return (
      <div className={styles.lesson} role="status">
        <span className="sr-only">{lessonText.loading}</span>
      </div>
    );
  }
  return <Player runner={load.runner} pack={load.pack} module={load.module} world={world} />;
}
