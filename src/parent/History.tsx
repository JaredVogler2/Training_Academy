import { useMemo } from 'react';
import { dayByDay } from '@/engine/history';
import type { Attempt, Profile } from '@/engine/schema';
import { dayInWords } from '@/game/dates';
import type { Fetched } from './fetched';
import styles from './GrownUps.module.css';

const DAYS_SHOWN = 14;
const count = (value: number, singular: string, plural = `${singular}s`) =>
  `${value} ${value === 1 ? singular : plural}`;

export function History({ profile, record }: { profile: Profile; record: Fetched<Attempt[]> }) {
  const days = useMemo(() => (record.state === 'here' ? dayByDay(record.value) : []), [record]);
  return (
    <section
      className={styles.card}
      aria-labelledby="history-title"
      data-testid="learning-history"
      data-settled={record.state !== 'waiting'}
    >
      <h2 id="history-title">{profile.name}’s learning history</h2>
      {record.state === 'waiting' && <p role="status">Reading the record…</p>}
      {record.state === 'trouble' && <p role="status">The record could not be read.</p>}
      {record.state === 'here' &&
        (days.length === 0 ? (
          <p>No answers recorded yet.</p>
        ) : (
          <>
            <ol className={styles.skills}>
              {days.slice(0, DAYS_SHOWN).map((day) => (
                <li key={day.day} className={styles.skill} data-day={day.day}>
                  <h3>
                    <time dateTime={day.day}>{dayInWords(day.day)}</time>
                  </h3>
                  <p>
                    {count(day.lessons.size, 'activity', 'activities')} practised and{' '}
                    {count(day.answers, 'answer')} recorded.
                  </p>
                  <p>
                    {day.aloneRight} of {day.alone} first tries were right without help in
                    independent steps.
                  </p>
                  <p>
                    {count(day.rightWithHelp, 'right answer')} came with practice, a retry, or help.
                  </p>
                  {day.firstTimeAlone.size > 0 && (
                    <p>
                      First right answer without help for {count(day.firstTimeAlone.size, 'skill')}.
                    </p>
                  )}
                </li>
              ))}
            </ol>
            {days.length > DAYS_SHOWN && (
              <p className={styles.small}>
                A saved copy also holds {count(days.length - DAYS_SHOWN, 'earlier day')}.
              </p>
            )}
          </>
        ))}
    </section>
  );
}
