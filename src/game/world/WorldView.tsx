import { useEffect, useState } from 'react';
import { loadChunk } from '@/app/chunks';
import { recordError } from '@/app/diagnostics';
import { findLesson, hasPack, loadPack } from '@/content';
import type { Lesson, WorldId } from '@/engine';
import { worldById } from '@/game/worlds';
import { hasWorldModule, loadWorldModule } from '@/game/worlds/modules';
import { IslandPicture } from '@/render/IslandPicture';
import { ActionLink } from '@/ui/controls';
import { IconAsleep, IconBack, IconPlay } from '@/ui/icons';
import { worldText } from './text';
import styles from './World.module.css';

/** The first lesson of a world that has one. Entering the world is what fetches its content and its code. */
function useFirstLesson(world: WorldId, lessonId: string | null): Lesson | null {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  useEffect(() => {
    if (lessonId === null || !hasPack(world)) return;
    let current = true;
    loadChunk(`content:${world}`, () => loadPack(world)).then(
      (pack) => {
        if (current) setLesson(findLesson(pack, lessonId));
      },
      (error: unknown) => recordError('chunk', error),
    );
    // Warm the world's own code too, so that "Play" does not have to wait for it.
    if (hasWorldModule(world)) void loadWorldModule(world).catch(() => undefined);
    return () => {
      current = false;
    };
  }, [world, lessonId]);
  return lesson;
}

/**
 * A world's front door. A world that has something to play offers it with one large button. A world that has not been
 * built says so plainly, tells the grown-up what is planned, and offers nothing that looks tappable.
 */
export default function WorldView({ world }: { world: WorldId }) {
  const info = worldById(world);
  const lessonId = info.status === 'sample' ? info.firstLessonId : null;
  const lesson = useFirstLesson(world, lessonId);

  return (
    <article className={styles.world} data-role={info.role} data-world={world}>
      <ActionLink to={{ name: 'home' }} icon={<IconBack size={24} />} className={styles.back}>
        {worldText.islands}
      </ActionLink>

      <header className={styles.hero}>
        <div className={styles.emblem}>
          <IslandPicture place={world} />
        </div>
        <div className={styles.heading}>
          <h1>{info.name}</h1>
          <p className={styles.focus}>{info.focus}</p>
        </div>
      </header>

      {lessonId !== null ? (
        <section className={styles.play} aria-label={worldText.playHeading}>
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

      <section className={styles.about} aria-labelledby="world-about">
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
