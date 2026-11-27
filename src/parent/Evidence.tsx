import { useMemo } from 'react';
import { packText } from '@/content';
import { lessonCalled } from '@/content/lessonList';
import { DEFAULT_EVIDENCE_POLICY, type Profile } from '@/engine';
import { conceptsOf, type Concept } from '@/engine/graph';
import { DEFAULT_REVIEW_POLICY, attemptsBySkill, getSkillReview } from '@/engine/review';
import { dayInWords } from '@/game/dates';
import { localDay, now } from '@/game/services';
import { worldById } from '@/game/worlds';
import { useGraph, useRecord, useSkills } from './fetched';
import { History } from './History';
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

export function Evidence({ profile }: { profile: Profile | null }) {
  const skills = useSkills();
  const graph = useGraph();
  const record = useRecord(profile);
  const concepts = useMemo(
    () =>
      new Map(
        skills.state === 'here'
          ? skills.value.flatMap(({ pack }) =>
              conceptsOf(pack).map((concept) => [concept.skillId, concept] as const),
            )
          : [],
      ),
    [skills],
  );
  const names = useMemo(
    () =>
      new Map(
        skills.state === 'here'
          ? skills.value.flatMap(({ skills }) =>
              skills.map(({ id, title }) => [id, title] as const),
            )
          : [],
      ),
    [skills],
  );
  const attempts = useMemo(
    () => (record.state === 'here' ? attemptsBySkill(record.value) : null),
    [record],
  );
  if (!profile) return null;
  const today = localDay(now());
  const trouble =
    skills.state === 'trouble' || record.state === 'trouble' || graph.state === 'trouble';
  const here = skills.state === 'here' && record.state === 'here' && graph.state === 'here';
  return (
    <>
      <History profile={profile} record={record} />
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
        ) : skills.state !== 'here' || !attempts || graph.state !== 'here' ? (
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
                  const review = getSkillReview(
                    attempts.get(skill.id) ?? [],
                    skill.id,
                    today,
                    DEFAULT_REVIEW_POLICY,
                    DEFAULT_EVIDENCE_POLICY,
                    graph.value.skills[skill.id]?.chance ?? 0,
                  );
                  const { evidence } = review;
                  const concept = concepts.get(skill.id);
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
                      {review.lastDay && (
                        <p className={styles.small}>
                          Last practised on {dayInWords(review.lastDay)}.{' '}
                          {review.due
                            ? 'Worth coming back to now.'
                            : review.dueOn &&
                              `Worth coming back to from ${dayInWords(review.dueOn)}.`}
                        </p>
                      )}
                      {review.calendarInDoubt && (
                        <p className={styles.small}>
                          Check this device’s date before using this review date.
                        </p>
                      )}
                      {concept && (
                        <ConceptDetails
                          concept={concept}
                          names={names}
                          instruction={(key) => packText(group.pack, key)}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>
    </>
  );
}

const hintNames = {
  model: 'Show an example',
  eliminate: 'Set choices aside',
  step: 'Show one step',
  reveal: 'Show the answer',
} satisfies Record<Concept['hintLadder'][number], string>;

function ConceptDetails({
  concept,
  names,
  instruction,
}: {
  concept: Concept;
  names: ReadonlyMap<string, string>;
  instruction: (key: string) => string;
}) {
  const { prerequisites, lessons, examples, questions, sittings, hintLadder, misconceptions } =
    concept;
  return (
    <details className={styles.concept}>
      <summary>About this skill</summary>
      <dl className={styles.conceptFacts}>
        <div>
          <dt>Builds on</dt>
          <dd>
            {prerequisites.flatMap((id) => names.get(id) ?? []).join(', ') || 'Introduced here'}
          </dd>
        </div>
        <div>
          <dt>Activities</dt>
          <dd>
            <ul>
              {/* Names, not links: an activity opened from here would be played as the child, and a grown-up's
                  answers would go into the child's record. */}
              {lessons.map((id) => (
                <li key={id}>{lessonCalled(id)?.title ?? id}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt>Examples</dt>
          <dd>
            <ul>
              {examples.map((example) => (
                <li key={example.challengeId}>{instruction(example.instruction)}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt>Questions in the game</dt>
          <dd>
            {questions.shown} demonstrations, {questions.guided} with Glim, {questions.alone} for
            independent practice, {questions.attimes} used at other points.
          </dd>
        </div>
        {sittings.length > 0 && (
          <div>
            <dt>In one sitting</dt>
            <dd>
              <ul>
                {sittings.map(({ lesson, drawn, from, again }) => (
                  <li key={lesson}>
                    {lessonCalled(lesson)?.title ?? 'Activity'} draws {drawn} of {from} independent
                    questions and can offer up to {again} more after help.
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {hintLadder.length > 0 && (
          <div>
            <dt>Help offered</dt>
            <dd>{hintLadder.map((hint) => hintNames[hint]).join(' → ')}</dd>
          </div>
        )}
        {misconceptions.length > 0 && (
          <div>
            <dt>Patterns these questions can pick up</dt>
            <dd>{misconceptions.map((pattern) => pattern.replaceAll('-', ' ')).join(', ')}</dd>
          </div>
        )}
      </dl>
    </details>
  );
}
