import { useId, useRef, useState } from 'react';
import {
  OBSERVATIONS,
  SEEN,
  SESSION_MINUTE_OPTIONS,
  type Observation,
  type Profile,
  type Seen,
} from '@/engine';
import { setHelping, useHelping } from '@/game/helping';
import {
  WATCH_IN,
  placeOfLesson,
  suggestionsFor,
  withLeftOut,
  withObserved,
  withStart,
} from '@/game/placement';
import { updateProfile } from '@/game/profiles';
import { WORLDS, isOpen, lessonsOf, worldById, type WorldInfo } from '@/game/worlds';
import { ActionButton, ActionLink } from '@/ui/controls';
import { IconPlay } from '@/ui/icons';
import { Select } from './Select';
import { grownUpText as text } from './text';
import styles from './GrownUps.module.css';

/** What a lesson is called here: its activity, and which part of it where the activity has several. */
function labelOf(world: WorldInfo, lesson: string): string {
  const place = placeOfLesson(world, lesson);
  if (!place) return lesson;
  return place.parts > 1 ? text.partOf(place.title, place.part) : place.title;
}

/**
 * Where to begin: for the grown-up who knows the child. They may say what they have seen the child do, and choose
 * where the big "Play" button begins in each world.
 *
 * It is their word and it is kept apart from the game's record: nothing here is ever counted as something the
 * child has shown, everything begins at "not yet observed", and no activity is closed by it. It only saves a child
 * who can already count from being walked through "the same amount" for the sake of order.
 */
export function WhereToBegin({ profile }: { profile: Profile | null }) {
  const helping = useHelping();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<Profile['settings'] | null>(null);
  const id = useId();
  /** The settings on their way to being saved, if any are: what the next change is made to. */
  const saving = useRef<Profile['settings'] | null>(null);
  if (!profile) return null;

  const settings = pending ?? profile.settings;
  // A change is made to the settings as they will be once whatever is still being saved has been: two things
  // changed one straight after the other are both kept. (Each used to start from the settings as the card
  // last drew them, and the second saved over the first.)
  const save = (change: (now: Profile['settings']) => Profile['settings']) => {
    const next = change(saving.current ?? settings);
    saving.current = next;
    setPending(next);
    const done = (message: string) => () => {
      if (saving.current !== next) return;
      saving.current = null;
      setPending(null);
      setMessage(message);
    };
    updateProfile(profile.id, { settings: next }).then(
      done(text.beginSaved),
      done(text.couldNotSave),
    );
  };
  const open = WORLDS.filter(isOpen);

  return (
    <section className={styles.card} aria-labelledby="begin-title" data-testid="where-to-begin">
      <h2 id="begin-title">{text.begin(profile.name)}</h2>
      <p className={styles.small}>{text.beginHelp}</p>

      <h3 className={styles.part}>{text.seenTitle}</h3>
      <p className={styles.small}>{text.seenHelp}</p>
      <ul className={styles.observations}>
        {OBSERVATIONS.map((what: Observation) => {
          const seen = settings.observed?.[what];
          const watch = WATCH_IN[what];
          return (
            <li key={what} className={styles.observation} data-observation={what} data-seen={seen}>
              <label htmlFor={`${id}-${what}`}>{text.observations[what]}</label>
              <Select
                id={`${id}-${what}`}
                value={seen ?? ''}
                onChange={(event) => {
                  const value = SEEN.find((each: Seen) => each === event.target.value) ?? null;
                  save((now) => withObserved(now, what, value));
                }}
              >
                <option value="">{text.notObserved}</option>
                {SEEN.map((each) => (
                  <option key={each} value={each}>
                    {text.seen[each]}
                  </option>
                ))}
              </Select>
              {watch && (
                <ActionLink
                  to={{ name: 'play', world: watch.world, lessonId: watch.lesson }}
                  icon={<IconPlay size={20} />}
                >
                  {text.watchIn(labelOf(worldById(watch.world), watch.lesson))}
                </ActionLink>
              )}
              {what === 'taps' && seen === 'not-yet' && (
                <p className={styles.small}>{text.tapsNote}</p>
              )}
              {what === 'listens' && seen === 'not-yet' && (
                <p className={styles.small}>{text.listensNote}</p>
              )}
            </li>
          );
        })}
      </ul>

      {suggestionsFor(settings, WORLDS).map(({ world, lesson }) => (
        <div key={world} className={styles.suggestion} data-testid="begin-suggestion">
          <p>{text.suggest(worldById(world).name, labelOf(worldById(world), lesson))}</p>
          <ActionButton tone="sun" onClick={() => save((now) => withStart(now, world, lesson))}>
            {text.beginThere}
          </ActionButton>
        </div>
      ))}

      <h3 className={styles.part}>{text.startsTitle}</h3>
      <p className={styles.small}>{text.startsHelp}</p>
      <ul className={styles.starts}>
        {open.map((world) => {
          const [first, ...later] = lessonsOf(world);
          const start = settings.startAt?.[world.id];
          const chosen = start !== undefined && later.includes(start) ? start : first;
          return (
            <li key={world.id} className={styles.field} data-world={world.id}>
              <label htmlFor={`${id}-${world.id}`}>{text.startOf(world.name)}</label>
              <Select
                id={`${id}-${world.id}`}
                value={chosen === first ? '' : chosen}
                onChange={(event) =>
                  save((now) => withStart(now, world.id, event.target.value || null))
                }
              >
                <option value="">
                  {first === undefined
                    ? text.atTheBeginning
                    : `${text.atTheBeginning}: ${labelOf(world, first)}`}
                </option>
                {later.map((lesson) => (
                  <option key={lesson} value={lesson}>
                    {labelOf(world, lesson)}
                  </option>
                ))}
              </Select>
              {/* The list's own words are cut short where they are longer than a phone is wide: here in full. */}
              {chosen !== undefined && (
                <p className={styles.small} data-begins-at={chosen}>
                  {text.beginsAt(labelOf(world, chosen))}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <fieldset className={styles.suggestions}>
        <legend>Worlds Glim suggests</legend>
        <p className={styles.small}>
          Choose where Glim may point on the map. Every world stays open for play.
        </p>
        {open.map(({ id: world, name }) => (
          <label key={world} className={styles.check}>
            <input
              type="checkbox"
              checked={!settings.leftOut?.includes(world)}
              onChange={(event) => {
                const out = !event.target.checked;
                save((now) => withLeftOut(now, world, out));
              }}
            />
            <span>{name}</span>
          </label>
        ))}
      </fieldset>

      <h3 className={styles.part}>{text.sittingTitle}</h3>
      <p className={styles.small}>
        Leave time to move or play away from the screen between sittings.
      </p>
      <p className={styles.small}>{text.sittingHelp}</p>
      <div className={styles.field} data-testid="sitting-length">
        <label htmlFor={`${id}-sitting`}>{text.sittingLabel}</label>
        <Select
          id={`${id}-sitting`}
          value={settings.sessionMinutes === null ? '' : String(settings.sessionMinutes)}
          onChange={(event) => {
            const minutes = SESSION_MINUTE_OPTIONS.find(
              (option) => String(option) === event.target.value,
            );
            save((now) => ({ ...now, sessionMinutes: minutes ?? null }));
          }}
        >
          <option value="">{text.sittingNone}</option>
          {SESSION_MINUTE_OPTIONS.map((minutes) => (
            <option key={minutes} value={String(minutes)}>
              {text.sittingMinutes(minutes)}
            </option>
          ))}
        </Select>
      </div>

      <h3 className={styles.part}>{text.togetherTitle}</h3>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={helping}
          onChange={(event) => setHelping(event.target.checked)}
        />
        <span>{text.helpingToday}</span>
      </label>
      <p className={styles.small}>{text.helpingHelp}</p>
      <div className={styles.row}>
        <ActionLink to={{ name: 'how-to' }} icon={<IconPlay size={22} />}>
          {text.howToAgain}
        </ActionLink>
      </div>

      <p className={styles.message} role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
