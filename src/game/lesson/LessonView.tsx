import { useEffect, useState, useSyncExternalStore } from 'react';
import { loadChunk } from '@/app/chunks';
import { recordError } from '@/app/diagnostics';
import { navigate } from '@/app/navigation';
import { playCue } from '@/audio';
import { findLesson, hasPack, loadPack, packText } from '@/content';
import type { ContentPack, WorldId } from '@/engine';
import { LessonRunner, type RunnerState } from '@/game/lessonRunner';
import { ensureActiveProfile } from '@/game/profiles';
import { getRepository, localDay, newId, newSeed, now } from '@/game/services';
import { worldById } from '@/game/worlds';
import { hasWorldModule, loadWorldModule, type WorldModule } from '@/game/worlds/modules';
import { Guide, type GuideState } from '@/ui/Guide';
import { WorldEmblem } from '@/ui/art';
import { ActionButton, ActionLink } from '@/ui/controls';
import {
  IconBack,
  IconCheck,
  IconHint,
  IconHome,
  IconNext,
  IconPointer,
  IconReplay,
} from '@/ui/icons';
import { lessonText } from './text';
import styles from './Lesson.module.css';

/**
 * The lesson frame shared by every world: a way out, progress, help, the challenge, and what comes next.
 *
 * It draws what the engine says and reports what the child taps; it never decides whether an answer is right.
 * A child who cannot read can use all of it: the guide's hand shows where to tap, pictures carry the question, and the
 * captions are there for the grown-up alongside (and for screen readers).
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

/**
 * What the guide is doing, from what the lesson is doing. The guide never knows more than the engine has said:
 * it points while something is being shown, wonders when a question is new, is glad of a right answer, and after a
 * wrong one tilts its head and waits — never anything that looks like disappointment.
 */
function useGuideMood(state: Playing): GuideState {
  const { view, feedback, hint } = state;
  const question = `${view.key}-${String(view.hintsUsed)}`;
  const [pondered, setPondered] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setPondered(question), PONDER_MS);
    return () => window.clearTimeout(timer);
  }, [question]);

  if (feedback?.outcome === 'correct') return 'celebrate';
  if (feedback?.outcome === 'incorrect') return 'retry';
  if (hint !== null || view.stage === 'demo') return 'point';
  return pondered === question ? 'idle' : 'think';
}

function Challenge({ state, runner, pack, module }: { state: Playing } & Loaded) {
  const { view, feedback, hint, answered, picked } = state;
  const { Picture } = module;
  const demo = view.stage === 'demo';
  const text = (key: string) => packText(pack, key);

  // What the grown-up reads (and a screen reader announces): the question, then whatever just happened.
  const caption = feedback
    ? text(feedback.caption)
    : hint
      ? text(hint.caption)
      : demo
        ? `${lessonText.watch} ${text(view.challenge.prompt.instruction)}`
        : text(view.challenge.prompt.instruction);

  const mood = useGuideMood(state);

  // "Count with me" whenever the lesson is teaching rather than asking: the demonstration, a hint, any feedback.
  const counting = demo || feedback !== null || hint !== null;
  const showSame = answered || demo;

  return (
    <>
      <div className={styles.board} data-count={view.choices.length}>
        <div className={styles.prompt} data-same={showSame}>
          <span className="sr-only">
            {lessonText.thisGroup}
            {module.describe(view.challenge.prompt.stimulus)}
          </span>
          {/* Re-keyed so the counting animation restarts each time there is something new to show. */}
          <Picture
            key={`${view.key}-${view.hintsUsed}-${String(answered)}`}
            stimulus={view.challenge.prompt.stimulus}
            counting={counting}
          />
        </div>

        <ul className={styles.choices} data-count={view.choices.length}>
          {view.choices.map(({ choice, available }) => {
            const isAnswer = view.shownAnswer === choice.id || (answered && picked === choice.id);
            const state = isAnswer ? 'same' : available ? 'open' : 'away';
            return (
              // Keyed by step, so a new question gets new cards instead of morphing the old ones.
              <li key={`${view.stepIndex}-${choice.id}`}>
                <button
                  type="button"
                  className={styles.choice}
                  data-state={state}
                  data-choice={choice.id}
                  data-just-tried={!available && picked === choice.id}
                  aria-label={choice.label}
                  aria-disabled={!available || answered || demo}
                  onClick={() => {
                    if (!available || answered || demo) return;
                    void runner.answer(choice.id);
                  }}
                >
                  <Picture
                    key={`${view.key}-${String(isAnswer)}`}
                    stimulus={choice.stimulus}
                    counting={isAnswer && counting}
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

      <div className={styles.foot}>
        <Guide state={mood} aim={105} className={styles.guide} />
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
        <WorldEmblem world={world} className={styles.finishedEmblem} />
        <Guide state="celebrate" className={styles.finishedGuide} />
      </div>
      <h1>{lessonText.allDone}</h1>
      <ol className={styles.grown} aria-hidden="true">
        {Array.from({ length: state.stepCount - 1 }, (_, index) => (
          <li
            key={index}
            className={styles.sprout}
            style={{ animationDelay: `${index * 0.12}s` }}
          />
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
  const outcome = state.phase === 'playing' ? state.feedback?.outcome : undefined;
  const key = state.phase === 'playing' ? state.view.key : 'finished';

  // One sound per result. Sounds accompany the pictures; nothing depends on hearing them.
  useEffect(() => {
    if (outcome === 'correct') playCue('success');
    else if (outcome === 'incorrect') playCue('again');
  }, [outcome, key]);
  useEffect(() => {
    if (state.phase === 'finished') playCue('success');
  }, [state.phase]);

  const playing = state.phase === 'playing' ? state : null;
  const canHint =
    playing !== null &&
    !playing.answered &&
    playing.view.stage !== 'demo' &&
    playing.view.hintsAvailable > 0;

  return (
    <div className={styles.lesson} data-role={worldById(world).role} data-testid="lesson">
      <div className={styles.bar}>
        <ActionLink
          to={{ name: 'world', world }}
          round
          icon={<IconBack />}
          aria-label={lessonText.leave}
        />
        {playing ? (
          <Steps index={playing.view.stepIndex} count={playing.view.stepCount} />
        ) : (
          <span />
        )}
        <ActionButton
          round
          icon={<IconHint />}
          aria-label={lessonText.help}
          disabled={!canHint}
          onClick={() => {
            playCue('tap');
            void runner.hint();
          }}
        />
      </div>
      {playing ? (
        <Challenge state={playing} runner={runner} pack={pack} module={module} />
      ) : (
        state.phase === 'finished' && <Finished state={state} runner={runner} world={world} />
      )}
      {playing && !playing.saved && <p className={styles.unsaved}>{lessonText.notSaved}</p>}
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
