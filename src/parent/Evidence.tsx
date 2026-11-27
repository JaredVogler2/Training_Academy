import { useEffect, useState } from 'react';
import { recordError } from '@/app/diagnostics';
import { DEFAULT_EVIDENCE_POLICY, getSkillEvidence, type Attempt, type Profile } from '@/engine';
import { getRepository } from '@/game/services';
import { worldById } from '@/game/worlds';
import { TROUBLE, WAITING, useGraph, useSkills, type Fetched } from './fetched';
import { describeEvidence, grownUpText as text } from './text';
import styles from './GrownUps.module.css';

/**
 * What the player has shown: every skill the worlds teach, and what the record says of each.
 *
 * Nothing is said of any skill until the record has been read, and the list of skills and the concept graph
 * fetched (the graph says how easy each skill's questions are to get right by luck, which what is said of a
 * skill depends on). "Nothing recorded
 * yet" is a statement about a child, and for the moment it takes to read the record it used to be on the page
 * beside every skill: said of a child whose record nobody had yet looked at. (A test that read the page in that
 * moment is how it was found, in CI's run 55.) Where the record cannot be read, the page says that and nothing
 * else.
 */

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
  const graph = useGraph();
  const record = useRecord(profile);
  if (!profile) return null;
  const trouble =
    skills.state === 'trouble' || record.state === 'trouble' || graph.state === 'trouble';
  const here = skills.state === 'here' && record.state === 'here' && graph.state === 'here';
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
      ) : skills.state !== 'here' || record.state !== 'here' || graph.state !== 'here' ? (
        <p className={styles.small} role="status">
          {text.shownReading}
        </p>
      ) : (
        skills.value.map((group) => (
          <div key={group.world} className={styles.world} data-world={group.world}>
            <h3>{worldById(group.world).name}</h3>
            <ul className={styles.skills}>
              {group.skills.map((skill) => {
                // An answer written down before each one said how easy it was to guess is taken to be as easy
                // as the graph says its skill's questions are.
                const evidence = getSkillEvidence(
                  record.value,
                  skill.id,
                  DEFAULT_EVIDENCE_POLICY,
                  graph.value.skills[skill.id]?.chance ?? 0,
                );
                return (
                  <li
                    key={skill.id}
                    className={styles.skill}
                    data-testid="skill"
                    data-skill={skill.id}
                    data-status={evidence.status}
                    data-held-by-luck={evidence.heldByLuck}
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
