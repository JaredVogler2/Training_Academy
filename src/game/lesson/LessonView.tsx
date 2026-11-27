import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { loadChunk } from '@/app/chunks';
import { recordError } from '@/app/diagnostics';
import { navigate } from '@/app/navigation';
import { settingsStore, useReducedMotion } from '@/app/settings';
import { addVoice, audio, hushVoice, playCue, sayLine } from '@/audio';
import { findLesson, hasPack, loadPack } from '@/content';
import type { ContentPack, Lesson, WorldId } from '@/engine';
import { isHelping, setHelping, useHelping } from '@/game/helping';
import { LessonRunner, type RunnerState } from '@/game/lessonRunner';
import { ensureActiveProfile } from '@/game/profiles';
import { getRepository, localDay, newId, newSeed, now } from '@/game/services';
import { createPlayClock, useClockStopped, type PlayClock } from '@/game/playClock';
import { useSittingClock, useTimeToRest } from '@/game/sitting';
import { worldById } from '@/game/worlds';
import { hasWorldModule, loadWorldModule, type WorldModule } from '@/game/worlds/modules';
import { IslandPicture } from '@/render/IslandPicture';
import { placeOf } from '@/render/extents';
import { Guide } from '@/ui/Guide';
import { ActionButton, ActionLink } from '@/ui/controls';
import { IconGrownUps, IconHint, IconHome, IconPause, IconReplay, IconSoundOn } from '@/ui/icons';
import { commonVoice } from '@/voice/common';
import { PauseSheet } from './PauseSheet';
import { Stage } from './Stage';
import { NudgeWords } from './frame';
import { lessonText } from './text';
import { useNudge } from './useNudge';
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
  lesson: Lesson;
  module: WorldModule;
  /** What times each answer: it stands still while the activity is paused. */
  clock: PlayClock;
}

type Load =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'failed'; error: Error }
  | ({ status: 'ready' } & Loaded);

/** Loads in flight, so two requests for the same lesson (React's development double-render) share one sitting. */
const inFlight = new Map<string, Promise<Loaded | null>>();

/**
 * What an activity that is being opened is waiting for, written on the page for as long as it waits: the
 * world's content and the code that draws it; the device's store and who is playing; or the sitting itself,
 * found or begun in that store. It is for whoever has to explain a page that stays at "Getting ready…". (One
 * did, for ten seconds, once, in CI's run 56, and nothing there said which of the three it was waiting for.)
 */
function waitingFor(what: 'content' | 'store' | 'sitting' | null): void {
  const page = document.documentElement;
  if (what === null) delete page.dataset.opening;
  else page.dataset.opening = what;
}

function openLesson(world: WorldId, lessonId: string): Promise<Loaded | null> {
  const key = `${world}/${lessonId}`;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const loading = (async (): Promise<Loaded | null> => {
    if (!hasPack(world) || !hasWorldModule(world)) return null;
    addVoice(commonVoice);
    waitingFor('content');
    const [pack, module] = await Promise.all([
      loadChunk(`content:${world}`, () => loadPack(world)),
      loadWorldModule(world),
    ]);
    const lesson = findLesson(pack, lessonId);
    if (!lesson) return null;
    waitingFor('store');
    const [repository, profile] = await Promise.all([getRepository(), ensureActiveProfile()]);
    waitingFor('sitting');
    const clock = createPlayClock();
    const runner = await LessonRunner.start({
      repository,
      pack,
      lesson,
      profileId: profile.id,
      now,
      newId,
      newSeed,
      localDay,
      elapsed: clock.now,
      onSaveError: (error) => recordError('storage', error),
      adultHelping: isHelping,
    });
    return { runner, pack, lesson, module, clock };
  })();
  inFlight.set(key, loading);
  void loading
    .finally(() => {
      inFlight.delete(key);
      waitingFor(null);
    })
    .catch(() => undefined);
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
  // A grown-up may have said how long a sitting is. When that much has been played, the end of an activity
  // says so, once, in a picture and a line: Glim rests. Nothing is closed, and "Again" is still there.
  const { rest, minutes } = useTimeToRest();
  useEffect(() => {
    if (rest) sayLine('lesson.rest');
  }, [rest]);
  return (
    <section className={styles.finished} data-testid="lesson-finished" data-rest={rest}>
      <div className={styles.finishedArt}>
        <IslandPicture place={placeOf(world)} />
        <Guide state={rest ? 'rest' : 'celebrate'} className={styles.finishedGuide} />
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
      {rest && minutes !== null && (
        <p className={styles.report} data-testid="lesson-rest">
          {lessonText.rest(minutes)}
        </p>
      )}
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

/**
 * An activity that is all listening, when nothing can be heard: the sound is switched off, or no touch has woken
 * the audio yet (a page opened straight from its address). Played silently it would be a guessing game, so it
 * waits, with one large thing to press. The press is itself the touch a browser needs before it will make sound.
 */
function SoundGate() {
  return (
    <section className={styles.gate} data-testid="lesson-needs-sound">
      <Guide state="point" aim={62} className={styles.gateGuide} />
      <ActionButton
        tone="sun"
        big
        round
        className={styles.gateButton}
        icon={<IconSoundOn size={56} />}
        aria-label={lessonText.soundOn}
        onClick={() => {
          settingsStore().set({ sound: true });
          audio().unlock();
        }}
      />
      <p className={styles.caption}>{lessonText.needsSound}</p>
    </section>
  );
}

function Player({ runner, pack, lesson, module, clock, world }: Loaded & { world: WorldId }) {
  const state = useSyncExternalStore(runner.subscribe, runner.getState);
  const audible = useSyncExternalStore(audio().subscribe, () => audio().canPlayClips);
  const silenced = lesson.needsSound === true && !audible && state.phase === 'playing';
  const [paused, setPaused] = useState(false);
  // A grown-up has said they are helping: for this visit, until they say otherwise.
  const helping = useHelping();
  const calm = useReducedMotion();
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
  // Leaving the activity, by any road, stops whatever was being said.
  useEffect(() => hushVoice, []);
  // Time in an activity is what a sitting is made of: on the screen, in play, and not paused.
  useSittingClock(state.phase === 'playing' && !paused);
  // And how long an answer took is not counted while the activity is paused (which a hidden page makes it).
  useClockStopped(clock, paused);

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
  // Help with the screen, when taps have been landing on nothing: what can be pressed is pointed out.
  const { nudge, onPointerDownCapture } = useNudge(
    key,
    playing?.view.stage,
    playing?.answered ?? false,
    playing !== null && !paused && !silenced,
  );
  const canHint =
    playing !== null &&
    !silenced &&
    !playing.answered &&
    playing.view.stage !== 'demo' &&
    playing.view.hintsAvailable > 0;

  return (
    <div
      className={styles.lesson}
      data-role={worldById(world).role}
      data-testid="lesson"
      data-paused={paused}
      // Which challenge is on the screen: for the grown-up who reports a fault, and for the tests.
      data-challenge={playing?.view.challenge.id}
      data-stage={playing?.view.stage}
      data-nudge={nudge ?? undefined}
      data-helping={helping || undefined}
      onPointerDownCapture={onPointerDownCapture}
    >
      <div className={styles.bar} inert={paused}>
        <ActionLink
          to={{ name: 'home' }}
          round
          className={styles.barButton}
          icon={<IconHome />}
          aria-label={lessonText.leave}
          data-tip={lessonText.leave}
          data-tip-align="start"
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
              {/* While a grown-up is helping, the pause button says so: it is where that is switched off. */}
              <ActionButton
                round
                className={styles.barButton}
                icon={helping ? <IconGrownUps /> : <IconPause />}
                aria-label={
                  helping ? `${lessonText.pause}. ${lessonText.helping}` : lessonText.pause
                }
                data-tip={lessonText.pause}
                data-tip-align="end"
                onClick={() => {
                  playCue('tap');
                  setPaused(true);
                }}
              />
            </>
          )}
        </div>
      </div>
      {silenced ? (
        <SoundGate />
      ) : playing ? (
        // What is pointed out about the screen is said aloud where nothing else is being said, and written at
        // the foot, where Glim's words are, for the grown-up and for a screen reader.
        <NudgeWords value={nudge ? lessonText.nudge[nudge] : null}>
          <Stage
            state={playing}
            runner={runner}
            pack={pack}
            module={module}
            paused={paused}
            calm={calm}
          />
        </NudgeWords>
      ) : (
        state.phase === 'finished' && <Finished state={state} runner={runner} world={world} />
      )}
      {playing && !playing.saved && <p className={styles.unsaved}>{lessonText.notSaved}</p>}
      <PauseSheet
        open={paused && playing !== null}
        onResume={() => setPaused(false)}
        helping={helping}
        onHelping={setHelping}
      />
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
  return (
    <Player
      runner={load.runner}
      pack={load.pack}
      lesson={load.lesson}
      module={load.module}
      clock={load.clock}
      world={world}
    />
  );
}
