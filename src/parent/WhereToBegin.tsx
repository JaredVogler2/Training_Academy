import { useId, useState } from 'react';
import { OBSERVATIONS, SEEN, type Observation, type Profile, type Seen } from '@/engine';
import { setHelping, useHelping } from '@/game/helping';
import { WATCH_IN, placeOfLesson, suggestionsFor, withObserved, withStart } from '@/game/placement';
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
  const id = useId();
  if (!profile) return null;

  const { settings } = profile;
  const save = (next: Profile['settings']) => {
    updateProfile(profile.id, { settings: next }).then(
      () => setMessage(text.beginSaved),
      () => setMessage(text.couldNotSave),
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
                  save(withObserved(settings, what, value));
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
          <ActionButton tone="sun" onClick={() => save(withStart(settings, world, lesson))}>
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
                  save(withStart(settings, world.id, event.target.value || null))
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
