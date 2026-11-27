import { lessonCalled } from '@/content/lessonList';
import type { Profile } from '@/engine';
import { useAdvice } from '@/game/advice';
import { WORLDS, isOpen, worldById } from '@/game/worlds';
import { useSkills } from './fetched';
import { grownUpText as text } from './text';
import { KIND_IN_WORDS, reasonInWords, type Names } from './why';
import styles from './GrownUps.module.css';

/**
 * What Play offers next, world by world, and why: every reason the engine gave for it, each in a sentence.
 *
 * It is the same advice the map and the worlds' pages go by, asked for in the same way, so what is said here is
 * what the big button does. Nothing is said until it has been worked out; where it cannot be, the page says that
 * Play goes by the plain order of the activities, which is then what it does.
 */
export function NextUp({ profile }: { profile: Profile | null }) {
  const { known, advice } = useAdvice();
  const skills = useSkills();
  if (!profile) return null;

  const titles = new Map<string, string>();
  if (skills.state === 'here') {
    for (const group of skills.value) {
      for (const skill of group.skills) titles.set(skill.id, skill.title);
    }
  }
  const names: Names = {
    lesson: (id) => lessonCalled(id)?.title ?? id,
    skill: (id) => titles.get(id) ?? id,
  };
  const waiting = !known || skills.state === 'waiting';
  const trouble = !waiting && (advice === null || skills.state === 'trouble');

  return (
    <section
      className={styles.card}
      aria-labelledby="next-title"
      data-testid="next-up"
      // Whether what is here is all there will be: what Play offers, or the word that it could not be worked out.
      data-settled={!waiting}
    >
      <h2 id="next-title">{text.next(profile.name)}</h2>
      <p className={styles.small}>{text.nextHelp}</p>
      {waiting ? (
        <p className={styles.small} role="status">
          {text.nextReading}
        </p>
      ) : trouble || advice === null ? (
        <p className={styles.warning} role="status">
          {text.nextTrouble}
        </p>
      ) : (
        <>
          {advice.top && (
            <p data-testid="next-top" data-world={advice.top.world}>
              {text.nextGlim(worldById(advice.top.world).name, names.lesson(advice.top.lessonId))}
            </p>
          )}
          <ul className={styles.skills}>
            {WORLDS.filter(isOpen).flatMap((world) => {
              const offered = advice.byWorld[world.id];
              if (!offered) return [];
              return [
                <li
                  key={world.id}
                  className={styles.skill}
                  data-testid="next-offer"
                  data-world={world.id}
                  data-lesson={offered.lessonId}
                  data-kind={offered.kind}
                >
                  <strong>{text.nextIn(world.name, names.lesson(offered.lessonId))}</strong>
                  <p className={styles.status}>{KIND_IN_WORDS[offered.kind]}</p>
                  <ul className={styles.reasons}>
                    {offered.reasons.map((reason, index) => (
                      <li key={index} data-why={reason.why}>
                        {reasonInWords(reason, names)}
                      </li>
                    ))}
                  </ul>
                </li>,
              ];
            })}
          </ul>
          <p className={styles.small} data-testid="next-today">
            {text.nextToday(advice.day.before, advice.day.fresh)} {text.nextDue(advice.due.length)}
          </p>
        </>
      )}
    </section>
  );
}
