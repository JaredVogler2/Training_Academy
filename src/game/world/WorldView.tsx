import { useEffect, useState } from 'react';
import { loadChunk } from '@/app/chunks';
import { recordError } from '@/app/diagnostics';
import { findLesson, hasPack, loadPack } from '@/content';
import type { Lesson, WorldId } from '@/engine';
import { worldById } from '@/game/worlds';
import { hasWorldModule, loadWorldModule, type WorldModule } from '@/game/worlds/modules';
import { IslandPicture } from '@/render/IslandPicture';
import { WorldEmblem } from '@/ui/art';
import { ActionLink } from '@/ui/controls';
import { IconAsleep, IconBack, IconPlay } from '@/ui/icons';
import { worldText } from './text';
import styles from './World.module.css';

interface FirstLesson {
  lesson: Lesson | null;
  /** The world's own drawing code, once it has arrived: what lets this page show an example of the activity. */
  module: WorldModule | null;
}

/** The first lesson of a world that has one. Entering the world is what fetches its content and its code. */
function useFirstLesson(world: WorldId, lessonId: string | null): FirstLesson {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [module, setModule] = useState<WorldModule | null>(null);
  useEffect(() => {
    if (lessonId === null || !hasPack(world)) return;
    let current = true;
    loadChunk(`content:${world}`, () => loadPack(world)).then(
      (pack) => {
        if (current) setLesson(findLesson(pack, lessonId));
      },
      (error: unknown) => recordError('chunk', error),
    );
    // The world's own code too, so that "Play" does not have to wait for it.
    if (hasWorldModule(world)) {
      loadWorldModule(world).then(
        (loaded) => {
          if (current) setModule(() => loaded);
        },
        () => undefined,
      );
    }
    return () => {
      current = false;
    };
  }, [world, lessonId]);
  return { lesson, module };
}

/**
 * What the activity asks, in one picture: the group Glim will show first, and the group that goes with it.
 * It is taken from the lesson's own demonstration, so it can never show something the activity does not do.
 */
function Example({ lesson, module }: { lesson: Lesson; module: WorldModule }) {
  const shown = lesson.challenges.find((challenge) => challenge.id === lesson.plan.demo[0]);
  const match = shown?.choices.find((choice) => choice.id === shown.answer);
  if (!shown || !match) return null;
  const { Picture } = module;
  return (
    <div className={styles.example} aria-hidden="true" data-testid="world-example">
      <span className={styles.exampleCard}>
        <Picture stimulus={shown.prompt.stimulus} />
      </span>
      <span className={styles.exampleSame} />
      <span className={styles.exampleCard} data-match="true">
        <Picture stimulus={match.stimulus} />
      </span>
    </div>
  );
}

/**
 * A world's front door. A world that has something to play offers it with one large button. A world that has not been
 * built says so plainly, tells the grown-up what is planned, and offers nothing that looks tappable.
 */
export default function WorldView({ world }: { world: WorldId }) {
  const info = worldById(world);
  const lessonId = info.status === 'sample' ? info.firstLessonId : null;
  const { lesson, module } = useFirstLesson(world, lessonId);

  return (
    <article className={styles.world} data-role={info.role} data-world={world}>
      <ActionLink to={{ name: 'home' }} icon={<IconBack size={24} />} className={styles.back}>
        {worldText.islands}
      </ActionLink>

      <header className={styles.hero}>
        {/* The place, and pinned to it what the place is for: one picture a child can take in at a glance. */}
        <div className={styles.emblem}>
          <IslandPicture place={world} />
          <span className={styles.badge}>
            <WorldEmblem world={world} />
          </span>
        </div>
        <div className={styles.heading}>
          <h1>{info.name}</h1>
          <p className={styles.focus}>{info.focus}</p>
        </div>
      </header>

      {lessonId !== null ? (
        <section className={styles.play} aria-label={worldText.playHeading}>
          {/* Room is kept for the example, so the button does not move when it arrives. */}
          <div className={styles.exampleRoom}>
            {lesson && module && <Example lesson={lesson} module={module} />}
          </div>
          <ActionLink
            to={{ name: 'play', world, lessonId }}
            tone="sun"
            big
            className={styles.playButton}
            icon={<IconPlay size={34} />}
          >
            {worldText.play}
          </ActionLink>
          <p className={styles.playNote}>
            {lesson
              ? worldText.lessonNote(lesson.title, lesson.estimatedMinutes)
              : worldText.sampleNote}
          </p>
        </section>
      ) : (
        <p className={styles.asleep}>
          <IconAsleep size={22} />
          <span>{worldText.notOpen}</span>
        </p>
      )}

      <section className={styles.about} aria-labelledby="world-about" data-selectable>
        <h2 id="world-about">{worldText.forGrownUps}</h2>
        <p>{info.about}</p>
        <h3>{worldText.planned}</h3>
        <ol className={styles.planned}>
          {info.planned.map((item, index) => (
            <li key={item} data-ready={lessonId !== null && index === 0}>
              <span>{item}</span>
              <span className={styles.stage}>
                {lessonId !== null && index === 0 ? worldText.firstReady : worldText.later}
              </span>
            </li>
          ))}
        </ol>
        <p className={styles.note}>
          {lessonId !== null ? worldText.sampleExplain : worldText.laterExplain}
        </p>
      </section>
    </article>
  );
}
