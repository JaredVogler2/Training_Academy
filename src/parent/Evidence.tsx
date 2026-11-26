import { useEffect, useState } from 'react';
import { recordError } from '@/app/diagnostics';
import { hasPack, loadPack } from '@/content';
import {
  WORLD_IDS,
  getSkillEvidence,
  type Attempt,
  type Profile,
  type Skill,
  type WorldId,
} from '@/engine';
import { getRepository } from '@/game/services';
import { worldById } from '@/game/worlds';
import { describeEvidence, grownUpText as text } from './text';
import styles from './GrownUps.module.css';

/**
 * What the player has shown: every skill the worlds teach, and what the record says of each.
 *
 * Nothing is said of any skill until the record has been read and the list of skills fetched. "Nothing recorded
 * yet" is a statement about a child, and for the moment it takes to read the record it used to be on the page
 * beside every skill: said of a child whose record nobody had yet looked at. (A test that read the page in that
 * moment is how it was found, in CI's run 55.) Where the record cannot be read, the page says that and nothing
 * else.
 */

/** Something that has to be fetched before anything can be said: not here yet, here, or not to be had. */
type Fetched<T> = { state: 'waiting' } | { state: 'trouble' } | { state: 'here'; value: T };

const WAITING = { state: 'waiting' } as const;
const TROUBLE = { state: 'trouble' } as const;

/** What each world with content teaches, world by world, in the order the worlds are met. */
function useSkills(): Fetched<{ world: WorldId; skills: Skill[] }[]> {
  const [skills, setSkills] = useState<Fetched<{ world: WorldId; skills: Skill[] }[]>>(WAITING);
  useEffect(() => {
    let current = true;
    Promise.all(WORLD_IDS.filter(hasPack).map((world) => loadPack(world))).then(
      (packs) => {
        if (!current) return;
        setSkills({
          state: 'here',
          value: packs.map((pack) => ({ world: pack.world, skills: pack.skills })),
        });
      },
      (error: unknown) => {
        recordError('chunk', error);
        if (current) setSkills(TROUBLE);
      },
    );
    return () => {
      current = false;
    };
  }, []);
  return skills;
}

/**
 * Every answer recorded for a player. It is read again whenever the player's entry is read again (a copy has
 * been loaded into it, perhaps with more answers); what was read before stays on the page until the new reading
 * is in. What was read for one player is never given for another.
 */
function useRecord(profile: Profile | null): Fetched<Attempt[]> {
  const [read, setRead] = useState<{ of: string; record: Fetched<Attempt[]> } | null>(null);
  useEffect(() => {
    if (!profile) return;
    const { id } = profile;
    let current = true;
    getRepository()
      .then((repository) => repository.listAttempts(id))
      .then(
        (attempts) => {
          if (current) setRead({ of: id, record: { state: 'here', value: attempts } });
        },
        (error: unknown) => {
          recordError('storage', error);
          if (current) setRead({ of: id, record: TROUBLE });
        },
      );
    return () => {
      current = false;
    };
  }, [profile]);
  return read !== null && read.of === profile?.id ? read.record : WAITING;
}

export function Evidence({ profile }: { profile: Profile | null }) {
  const skills = useSkills();
  const record = useRecord(profile);
  if (!profile) return null;
  const trouble = skills.state === 'trouble' || record.state === 'trouble';
  const here = skills.state === 'here' && record.state === 'here';
  return (
    <section
      className={styles.card}
      aria-labelledby="evidence-title"
      data-testid="evidence"
      // Whether what is here is all there will be: the list, or the word that it could not be read.
      data-settled={trouble || here}
    >
      <h2 id="evidence-title">{text.shown(profile.name)}</h2>
      <p className={styles.small}>{text.shownHelp}</p>
      {trouble ? (
        <p className={styles.warning} role="status">
          {text.shownTrouble}
        </p>
      ) : skills.state !== 'here' || record.state !== 'here' ? (
        <p className={styles.small} role="status">
          {text.shownReading}
        </p>
      ) : (
        skills.value.map((group) => (
          <div key={group.world} className={styles.world} data-world={group.world}>
            <h3>{worldById(group.world).name}</h3>
            <ul className={styles.skills}>
              {group.skills.map((skill) => {
                const evidence = getSkillEvidence(record.value, skill.id);
                return (
                  <li
                    key={skill.id}
                    className={styles.skill}
                    data-testid="skill"
                    data-skill={skill.id}
                    data-status={evidence.status}
                  >
                    <div>
                      <strong>{skill.title}</strong>
                      <p className={styles.small}>{skill.objective}</p>
                    </div>
                    <p className={styles.status}>{text.status[evidence.status]}</p>
                    <p className={styles.evidence}>{describeEvidence(evidence)}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
