import { useEffect, useState } from 'react';
import { Link } from '@/app/navigation';
import { loadChunk } from '@/app/chunks';
import { recordError } from '@/app/diagnostics';
import { hasPack, loadPack } from '@/content';
import type { Challenge, Lesson, Stimulus, WorldId } from '@/engine';
import { nextLessonIn, useFinishedLessons } from '@/game/progress';
import { isOpen, lessonsOf, worldById } from '@/game/worlds';
import { hasWorldModule, loadWorldModule, type WorldModule } from '@/game/worlds/modules';
import { IslandPicture } from '@/render/IslandPicture';
import { WorldEmblem } from '@/ui/art';
import { ActionLink } from '@/ui/controls';
import { IconAsleep, IconBack, IconCheck, IconPlay } from '@/ui/icons';
import { worldText } from './text';
import styles from './World.module.css';

interface Opened {
  /** The world's lessons, in the order they are meant to be met. */
  lessons: Lesson[];
  /** The world's own drawing code, once it has arrived: what lets this page show what each activity is. */
  module: WorldModule | null;
  /** The lessons this player has finished at least once. */
  done: ReadonlySet<string>;
}

/** A world's lessons and how far this player has got. Entering the world is what fetches its content and its code. */
function useWorld(world: WorldId): Opened {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [module, setModule] = useState<WorldModule | null>(null);
  const done = useFinishedLessons();
  useEffect(() => {
    if (!hasPack(world)) return;
    let current = true;
    const order = lessonsOf(worldById(world));
    loadChunk(`content:${world}`, () => loadPack(world)).then(
      (pack) => {
        if (!current) return;
        setLessons(order.flatMap((id) => pack.lessons.find((lesson) => lesson.id === id) ?? []));
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
  }, [world]);

  return { lessons, module, done };
}

/**
 * What an activity is, as one or two pictures taken from its own demonstration, so that a card can never show
 * something the activity does not do. Two pictures are a thing and what goes with it.
 */
function picturesOf(shown: Challenge): Stimulus[] {
  if (shown.kind === 'choose-one') {
    const answer = shown.choices.find((choice) => choice.id === shown.answer);
    return answer ? [shown.prompt.stimulus, answer.stimulus] : [shown.prompt.stimulus];
  }
  const { task } = shown;
  if (task.type === 'give') return [task.want];
  // A robot's journey and a thing on a workbench are pictures of their own, where the task has one.
  if (task.type === 'program' || task.type === 'design') {
    return shown.prompt.stimulus ? [shown.prompt.stimulus] : [];
  }
  const wanted = task.type === 'pairs' ? task.cards.slice(0, 2) : task.cards;
  const ids: readonly string[] = task.type === 'pairs' ? [] : task.solution;
  const first = wanted.filter((card) => ids.length === 0 || ids.includes(card.id)).slice(0, 2);
  return first.map((card) => card.stimulus);
}

function Example({ lesson, module }: { lesson: Lesson; module: WorldModule }) {
  const shown = lesson.challenges.find((challenge) => challenge.id === lesson.plan.demo[0]);
  if (!shown) return null;
  const [first, second] = picturesOf(shown);
  if (!first) return null;
  const { Picture } = module;
  return (
    <span className={styles.example} aria-hidden="true" data-pictures={second ? 2 : 1}>
      <span className={styles.exampleCard}>
        <Picture stimulus={first} place="card" />
      </span>
      {second && (
        <>
          <span className={styles.exampleSame} />
          <span className={styles.exampleCard} data-match="true">
            <Picture stimulus={second} place="card" />
          </span>
        </>
      )}
    </span>
  );
}

/**
 * A world's front door. A world that has something to play offers the next thing with one large button, and every
 * activity as a picture below it. A world that has not been built says so plainly, tells the grown-up what is
 * planned, and offers nothing that looks tappable.
 */
export default function WorldView({ world }: { world: WorldId }) {
  const info = worldById(world);
  const open = isOpen(info);
  const { lessons, module, done } = useWorld(world);
  // What "Play" goes to: the first lesson not yet finished; once they all are, the first again.
  const order = lessonsOf(info);
  const nextId = nextLessonIn(info, done) ?? undefined;
  const next = lessons.find((lesson) => lesson.id === nextId) ?? null;
  const allDone = order.length > 0 && order.every((id) => done.has(id));
  const unbuilt = info.activities.some((activity) => activity.lessons.length === 0);

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

      {open && nextId !== undefined ? (
        <section className={styles.play} aria-label={worldText.playHeading}>
          {/* Room is kept for the example, so the button does not move when it arrives. */}
          <div
            className={styles.exampleRoom}
            data-testid={next && module ? 'world-example' : undefined}
          >
            {next && module && <Example lesson={next} module={module} />}
          </div>
          <ActionLink
            to={{ name: 'play', world, lessonId: nextId }}
            tone="sun"
            big
            className={styles.playButton}
            icon={<IconPlay size={34} />}
          >
            {worldText.play}
          </ActionLink>
          <p className={styles.playNote}>
            {allDone
              ? worldText.againNote
              : next
                ? worldText.lessonNote(next.title, next.estimatedMinutes)
                : worldText.getting}
          </p>
        </section>
      ) : (
        <p className={styles.asleep}>
          <IconAsleep size={22} />
          <span>{worldText.notOpen}</span>
        </p>
      )}

      {open && order.length > 1 && (
        <section className={styles.all} aria-labelledby="world-activities">
          <h2 id="world-activities" className="sr-only">
            {worldText.activities}
          </h2>
          {/* Room is kept for every card from the start, so that nothing jumps when the pictures arrive. */}
          <ol className={styles.cards}>
            {order.map((id) => {
              const lesson = lessons.find((candidate) => candidate.id === id);
              const finished = done.has(id);
              return (
                <li key={id}>
                  <Link
                    to={{ name: 'play', world, lessonId: id }}
                    className={styles.card}
                    data-lesson={id}
                    data-done={finished}
                    data-next={id === nextId && !allDone}
                    aria-label={
                      lesson
                        ? finished
                          ? worldText.doneNote(lesson.title)
                          : lesson.title
                        : worldText.getting
                    }
                  >
                    <span className={styles.cardArt}>
                      {lesson && module && <Example lesson={lesson} module={module} />}
                    </span>
                    {finished && (
                      <span className={styles.cardDone} aria-hidden="true">
                        <IconCheck size={18} />
                      </span>
                    )}
                    <span className={styles.cardTitle} aria-hidden="true">
                      {lesson?.title ?? ''}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className={styles.about} aria-labelledby="world-about" data-selectable>
        <h2 id="world-about">{worldText.forGrownUps}</h2>
        <p>{info.about}</p>
        <h3>{worldText.whatIsHere}</h3>
        <ol className={styles.planned}>
          {info.activities.map((activity) => {
            const ready = activity.lessons.length > 0;
            return (
              <li key={activity.title} data-ready={ready}>
                <span>{activity.title}</span>
                <span className={styles.stage}>{ready ? worldText.ready : worldText.later}</span>
                {ready && activity.together && (
                  <p className={styles.together}>
                    <strong>{worldText.together}</strong> {activity.together.what}{' '}
                    <em>{activity.together.safety}</em>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        <p className={styles.note}>
          {open
            ? `${worldText.openExplain}${unbuilt ? ` ${worldText.partExplain}` : ''}`
            : worldText.laterExplain}
        </p>
      </section>
    </article>
  );
}
