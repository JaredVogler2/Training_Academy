import { useEffect, useState } from 'react';
import { Link } from '@/app/navigation';
import { loadChunk } from '@/app/chunks';
import { recordError } from '@/app/diagnostics';
import { hasPack, loadPack } from '@/content';
import { lessonCalled } from '@/content/lessonList';
import type { Challenge, Lesson, Stimulus, WorldId } from '@/engine';
import { useAdvice } from '@/game/advice';
import { dayInWords } from '@/game/dates';
import { startOf, triedOn, withTried } from '@/game/placement';
import { activeProfile, updateProfile, useProfiles } from '@/game/profiles';
import { nextLessonIn } from '@/game/progress';
import { localDay, now } from '@/game/services';
import { useTimeToRest } from '@/game/sitting';
import { isOpen, lessonsOf, worldById } from '@/game/worlds';
import { hasWorldModule, loadWorldModule, type WorldModule } from '@/game/worlds/modules';
import { IslandVista } from '@/render/IslandVista';
import { placeOf } from '@/render/extents';
import { Guide } from '@/ui/Guide';
import { WorldEmblem } from '@/ui/art';
import { ActionLink, HoldToggle } from '@/ui/controls';
import { IconAsleep, IconBack, IconCheck, IconPlay } from '@/ui/icons';
import { worldText } from './text';
import styles from './World.module.css';

interface Opened {
  /** The world's lessons, in the order they are meant to be met. */
  lessons: Lesson[];
  /** The world's own drawing code, once it has arrived: what lets this page show what each activity is. */
  module: WorldModule | null;
}

/** A world's lessons, and the code that draws them. Entering the world is what fetches its content and its code. */
function useWorld(world: WorldId): Opened {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [module, setModule] = useState<WorldModule | null>(null);
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

  return { lessons, module };
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
  // A robot's journey, a thing on a workbench, a beat and a tune are pictures of their own, where the task has one.
  if (
    task.type === 'program' ||
    task.type === 'design' ||
    task.type === 'beat' ||
    task.type === 'tune'
  ) {
    return shown.prompt.stimulus ? [shown.prompt.stimulus] : [];
  }
  // Something made to go with a picture (a word built from its letters): the picture, and the first of it.
  if (task.type === 'order' && shown.prompt.stimulus) {
    const first = task.cards.find((card) => card.id === task.solution[0]);
    return first ? [shown.prompt.stimulus, first.stimulus] : [shown.prompt.stimulus];
  }
  // Something recalled in a chosen way: what is asked about, the first way, and what went with it.
  if (task.type === 'recall') {
    const [way] = task.ways;
    const answer = task.cards.find((card) => card.id === way?.answer);
    return way && answer ? [way.cue, answer.stimulus] : [];
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
 * A grown-up's word that the thing to try together was tried: a switch that has to be held, because it is on a
 * page a child taps, and under it the day they said so. It says in so many words that the game did not see it.
 */
function Tried({
  lesson,
  day,
  onChange,
  told = false,
}: {
  lesson: string;
  day: string | undefined;
  onChange: (lesson: string, tried: boolean) => void;
  /** It is a story told back that is being said of, not a thing tried: the same switch, in its own words. */
  told?: boolean;
}) {
  const label = told ? worldText.told : worldText.tried;
  const hold = told ? worldText.holdToSayTold : worldText.holdToSay;
  const on = told ? worldText.toldOn : worldText.triedOn;
  return (
    <p
      className={told ? `${styles.tried} ${styles.triedAlone}` : styles.tried}
      data-testid="tried"
      data-lesson={lesson}
      data-tried={day !== undefined}
    >
      <HoldToggle
        pressed={day !== undefined}
        onChange={(tried) => onChange(lesson, tried)}
        label={label}
        stateText={day === undefined ? hold : label}
        icon={<IconCheck size={22} />}
      />
      <span>{day === undefined ? hold : on(dayInWords(day))}</span>
    </p>
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
  const { lessons, module } = useWorld(world);
  // What "Play" goes to is what the game would offer next here (`engine/recommend.ts`): something new that
  // builds on what has been done, or something played before that it is time to come back to. Until that is
  // known, and where it cannot be worked out, it is the first activity not yet finished, from where a grown-up
  // has chosen for this player to begin if they have.
  const { done, known, advice } = useAdvice();
  // When a sitting of the length a grown-up chose has been played, nothing is offered: no big Play button, and
  // no activity marked as the next. Every activity is still there to be played from its picture.
  const { rest, minutes } = useTimeToRest();
  const offered = rest ? null : (advice?.byWorld[world] ?? null);
  const order = lessonsOf(info);
  const players = useProfiles();
  const player = activeProfile(players);
  const startAt = startOf(player, world);
  const [unsaved, setUnsaved] = useState(false);
  // A grown-up says a thing was tried away from the screen, or takes it back. It is written into the player's
  // settings with the day, beside the other things a grown-up says, and read by nothing that reports what a
  // child has shown.
  const sayTried = (lesson: string, tried: boolean) => {
    if (!player) return;
    const settings = withTried(player.settings, lesson, tried ? localDay(now()) : null);
    updateProfile(player.id, { settings }).then(
      () => setUnsaved(false),
      () => setUnsaved(true),
    );
  };
  // Whether the page knows yet who is playing, what they have finished and what to offer them. Until it does,
  // Play goes where it would for someone new, for the blink that takes; the page says so, for whoever reads
  // it. (A test read Play at once and found "the beginning" whatever a grown-up had chosen.)
  const settled = known;
  const nextId = offered?.lessonId ?? nextLessonIn(info, done, startAt) ?? undefined;
  // Something played before, offered because it is time to come back to it (or, with everything finished and
  // nothing due, because it was played longest ago): the note under Play says which.
  const back = offered !== null && offered.kind !== 'new' && offered.kind !== 'reach';
  const next = lessons.find((lesson) => lesson.id === nextId) ?? null;
  // What it is called is known at once, before the world's content has arrived: the page is whole from its
  // first moment, and nothing on it moves afterwards.
  const nextCalled = nextId === undefined ? null : lessonCalled(nextId);
  const allDone = order.length > 0 && order.every((id) => done.has(id));
  const unbuilt = info.activities.some((activity) => activity.lessons.length === 0);

  return (
    <article
      className={styles.world}
      data-role={info.role}
      data-world={world}
      data-settled={settled}
    >
      <ActionLink to={{ name: 'home' }} icon={<IconBack size={24} />} className={styles.back}>
        {worldText.islands}
      </ActionLink>

      <header className={styles.hero}>
        <IslandVista place={placeOf(world)} />
        <div className={styles.heading}>
          <span className={styles.heroMark} aria-hidden="true">
            <WorldEmblem world={world} />
          </span>
          <h1>{info.name}</h1>
          <p className={styles.focus}>{info.focus}</p>
        </div>
      </header>

      {open && rest ? (
        <section
          className={styles.rest}
          aria-label={worldText.restHeading}
          data-testid="world-rest"
        >
          <Guide state="rest" className={styles.restGuide} />
          <p className={styles.playNote}>{worldText.restNote(minutes ?? 0)}</p>
        </section>
      ) : open && nextId !== undefined ? (
        <section
          className={styles.play}
          aria-label={worldText.playHeading}
          // Why this is what Play goes to: the kind of thing the game offers, or the plain order of the page.
          data-offered={offered?.kind ?? 'in-order'}
        >
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
            {!nextCalled
              ? worldText.getting
              : offered?.kind === 'free'
                ? worldText.freeNote(nextCalled.title)
                : back
                  ? worldText.backNote(nextCalled.title, nextCalled.minutes)
                  : allDone
                    ? worldText.againNote
                    : worldText.lessonNote(nextCalled.title, nextCalled.minutes)}
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
          {/*
            Every card is whole from the start: its name is known before the world's content arrives, and room
            is kept for its picture, so that nothing moves when the pictures come. (The names used to come with
            the content, some of them on two lines, and every card below them moved down as they did: as much as
            78 pixels on a small phone, under whatever finger was already on its way to a card.)
          */}
          <ol className={styles.cards}>
            {order.map((id) => {
              const lesson = lessons.find((candidate) => candidate.id === id);
              const called = lessonCalled(id);
              const finished = done.has(id);
              return (
                <li key={id}>
                  <Link
                    to={{ name: 'play', world, lessonId: id }}
                    className={styles.card}
                    data-lesson={id}
                    data-done={finished}
                    data-next={!rest && id === nextId && (offered !== null || !allDone)}
                    aria-label={
                      called
                        ? finished
                          ? worldText.doneNote(called.title)
                          : called.title
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
                      {called?.title ?? ''}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {open && info.room && (
        <section className={styles.room} aria-label={worldText.roomHeading}>
          <ActionLink
            to={{ name: 'room', world }}
            big
            className={styles.roomButton}
            icon={<WorldEmblem world={world} className={styles.roomArt} />}
          >
            {info.room.title}
          </ActionLink>
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
                {ready && activity.together && player && (
                  <Tried
                    lesson={activity.lessons[0] ?? ''}
                    day={triedOn(player, activity.lessons[0] ?? '')}
                    onChange={sayTried}
                  />
                )}
              </li>
            );
          })}
        </ol>
        {unsaved && (
          <p className={styles.note} role="status">
            {worldText.couldNotSave}
          </p>
        )}
        <p className={styles.note}>
          {open
            ? `${worldText.openExplain}${unbuilt ? ` ${worldText.partExplain}` : ''}`
            : worldText.laterExplain}
        </p>
        {open && info.room && (
          <p className={styles.note}>
            <strong>{info.room.title}.</strong> {info.room.note}
          </p>
        )}
        {open && info.room?.told !== undefined && player && (
          <Tried
            lesson={info.room.told}
            day={triedOn(player, info.room.told)}
            onChange={sayTried}
            told
          />
        )}
        {info.later && (
          <>
            <h3>{worldText.laterHeading}</h3>
            {/* A list to read, and nothing more: none of these is a link or a button, because none exists. */}
            <ul className={styles.rooms} data-testid="rooms-not-built">
              {info.later.map((room) => (
                <li key={room.name}>
                  <span className={styles.roomName}>{room.name}</span>
                  <span className={styles.stage}>{worldText.notBuilt}</span>
                  <p className={styles.together}>{room.about}</p>
                </li>
              ))}
            </ul>
            <p className={styles.note}>{worldText.laterRooms}</p>
          </>
        )}
      </section>
    </article>
  );
}
