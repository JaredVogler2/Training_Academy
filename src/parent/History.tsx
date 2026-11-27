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
                  {/* "0 of 0 first tries" is true and says nothing: a day of practice only says so. */}
                  <p>
                    {day.alone > 0
                      ? `${String(day.aloneRight)} of ${count(day.alone, 'first try', 'first tries')} ${day.alone === 1 ? 'was' : 'were'} right without help in independent steps.`
                      : 'No first tries in independent steps: practice and help only.'}
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
                {count(days.length - DAYS_SHOWN, 'earlier day')}{' '}
                {days.length - DAYS_SHOWN === 1 ? 'is' : 'are'} not shown here. A saved copy holds
                every day.
              </p>
            )}
          </>
        ))}
    </section>
  );
}
