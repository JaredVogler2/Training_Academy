import { addDays, dayNumber } from './days';
import {
  DEFAULT_EVIDENCE_POLICY,
  getSkillEvidence,
  isIndependentProbe,
  showsTheSkill,
  type EvidencePolicy,
  type SkillEvidence,
} from './evidence';
import type { Attempt } from './schema';

/**
 * When a skill is worth coming back to.
 *
 * Something a child has done is offered again after a wait, and the wait grows with what the record says of it
 * and with the number of separate days it has been done alone on: a day for something done alone once or twice,
 * a week and more for something done alone steadily on separate days. Where
 * the last day's tries alone ended with one that was not right, the wait is a day whatever went before; and where
 * that has happened on several days running, or the thing has never yet been done alone, the wait grows with the
 * days, so that nobody is brought back to the same trouble day after day.
 *
 * It is all reckoned in calendar days, from the day written on each answer when it was given and from "today" as
 * the caller says it is. No hour, no time zone and no clock is read, so the same record on the same day gives the
 * same answer on any device, however the answers are ordered in storage and whatever the clock has done since.
 * A day that is not the same day is at least one day later: nothing is ever due again on the day it was practised.
 *
 * The numbers are product heuristics, kept together here so that they can be changed and shown. They are not a
 * finding about how children remember, and nothing here measures a child.
 */

export interface ReviewPolicy {
  /** Whole days from the last day a skill was practised until it is offered again. Each is at least one. */
  afterDays: {
    /**
     * After trouble: by how many days running it has gone badly. A day goes badly when its last first try without
     * help was not right; for a skill never yet done alone, every day it was practised on is one. The last number
     * is used from there on.
     */
    trouble: readonly number[];
    /**
     * Right without help, not yet often or steadily enough to say more: by how many separate days it has been
     * done alone on. Something that stays here day after day is not brought back day after day.
     */
    practicing: readonly number[];
    /**
     * Independent so far, within a short span: by how many separate days it has been done alone on. Coming back
     * on another day is what shows it has lasted.
     */
    provisional: readonly number[];
    /**
     * Independent across days: the wait, by how many separate days it has been done alone on beyond the fewest
     * that asks for. The last number is used from there on.
     */
    consistent: readonly number[];
  };
  /**
   * How far after today a day in the record may be and still be believed. A traveller's calendar can go back by
   * as much as two days; a day later than that was written by a clock that was wrong, or today's is.
   */
  calendarSlackDays: number;
}

export const DEFAULT_REVIEW_POLICY: ReviewPolicy = {
  afterDays: {
    trouble: [1, 2, 4, 7, 14],
    practicing: [1, 2, 4, 7],
    provisional: [2, 4, 7],
    consistent: [14, 30, 60],
  },
  calendarSlackDays: 2,
};

/** What the wait is reckoned from. */
export type ReviewBasis =
  /** Nothing recorded: there is nothing to come back to. Its activity teaches it when it is met. */
  | 'not-yet-observed'
  /** Answered, never yet right at a first try without help. */
  | 'not-yet-alone'
  /** Has been right without help, and the last day's first tries without help ended with one that was not. */
  | 'missed-last'
  | 'practicing'
  | 'provisional'
  | 'consistent';

export interface SkillReview {
  skillId: string;
  evidence: SkillEvidence;
  basis: ReviewBasis;
  /**
   * The last day the skill was practised that the calendar can vouch for, as it is written in the record.
   * `null` when nothing is recorded, or when every day recorded is after today.
   */
  lastDay: string | null;
  /** Whole days from then to today, never fewer than none. `null` with `lastDay`. */
  daysSince: number | null;
  /** The wait, in days. `null` when nothing is recorded. */
  waitDays: number | null;
  /** How many days running it has gone badly (see the policy). None when the last day went well. */
  troubleDays: number;
  /** Whether the wait is over. */
  due: boolean;
  /** Days past the day it fell due: none on the day itself, fewer than none before it. `null` with `waitDays`. */
  overdueDays: number | null;
  /** The day it falls due, or fell due. `null` when nothing is recorded. */
  dueOn: string | null;
  /**
   * True when days in the record are after today by more than a journey could explain: the device's calendar was
   * wrong then or is wrong now. Those days are not counted from.
   */
  calendarInDoubt: boolean;
}

const wholeDays = (days: number): number =>
  Number.isFinite(days) ? Math.max(1, Math.floor(days)) : 1;

function byTime(a: Attempt, b: Attempt): number {
  return a.at - b.at || a.sessionId.localeCompare(b.sessionId) || a.seq - b.seq;
}

/** Every answer recorded for a skill, once each. */
function ownAttempts(attempts: readonly Attempt[], skillId: string): Attempt[] {
  const seen = new Set<string>();
  return attempts.filter((attempt) => {
    if (attempt.skillId !== skillId || seen.has(attempt.id)) return false;
    seen.add(attempt.id);
    return true;
  });
}

/**
 * How long ago a day in the record was, as far as today's calendar can vouch for it.
 * `'not-a-day'` for text that is no calendar day; `'after-today'` for a day too far ahead to be believed.
 */
export function daysAgo(
  day: string,
  today: string,
  slackDays: number = DEFAULT_REVIEW_POLICY.calendarSlackDays,
): number | 'not-a-day' | 'after-today' {
  const [then, now] = [dayNumber(day), dayNumber(today)];
  if (then === null || now === null) return 'not-a-day';
  const ago = now - then;
  if (ago < -Math.max(0, Math.floor(slackDays))) return 'after-today';
  // A day or two "ahead" is the same visit seen from another time zone: it is taken as today.
  return Math.max(0, ago);
}

/** The number at a place in a ladder of waits, the last of them for any place beyond it. */
function rung(ladder: readonly number[], place: number, otherwise: number): number {
  const wait = ladder[Math.min(Math.max(0, place), ladder.length - 1)];
  return wholeDays(wait ?? otherwise);
}

function waitFor(
  basis: Exclude<ReviewBasis, 'not-yet-observed'>,
  evidence: SkillEvidence,
  troubleDays: number,
  policy: ReviewPolicy,
  evidencePolicy: EvidencePolicy,
): number {
  const { afterDays } = policy;
  switch (basis) {
    case 'not-yet-alone':
    case 'missed-last':
      return rung(afterDays.trouble, troubleDays - 1, 1);
    case 'practicing':
      return rung(afterDays.practicing, evidence.distinctDays - 1, 1);
    case 'provisional':
      return rung(afterDays.provisional, evidence.distinctDays - 1, 1);
    case 'consistent': {
      const beyond = evidence.distinctDays - evidencePolicy.consistent.minDistinctDays;
      return rung(afterDays.consistent, beyond, 1);
    }
  }
}

/**
 * How many days running a skill has gone badly, counting back from the last day it was practised.
 *
 * For a skill never yet done alone, every day it was practised on counts. Otherwise a day counts when the last
 * first try without help on it was not right; a day with no first try without help is passed by, and a day whose
 * last one was right ends the count. Days are taken in the order of the calendar, and the tries of one day in the
 * order they were given; text that is not a day is left out.
 */
function daysOfTrouble(own: readonly Attempt[], everAlone: boolean): number {
  const days = new Map<number, Attempt[]>();
  for (const attempt of own) {
    const number = dayNumber(attempt.day);
    if (number === null) continue;
    days.set(number, [...(days.get(number) ?? []), attempt]);
  }
  if (!everAlone) return days.size;
  let running = 0;
  for (const number of [...days.keys()].sort((a, b) => b - a)) {
    const last = (days.get(number) ?? []).filter(isIndependentProbe).sort(byTime).at(-1);
    if (!last) continue;
    if (showsTheSkill(last)) break;
    running += 1;
  }
  return running;
}

/**
 * When one skill is worth coming back to, from every answer recorded and the day it is today.
 * The answers may be in any order, and may hold other skills' answers and the same answer twice.
 */
export function getSkillReview(
  attempts: readonly Attempt[],
  skillId: string,
  today: string,
  policy: ReviewPolicy = DEFAULT_REVIEW_POLICY,
  evidencePolicy: EvidencePolicy = DEFAULT_EVIDENCE_POLICY,
  /** How likely a blind answer to this skill's questions is to be right (see `getSkillEvidence`). */
  chance = 0,
): SkillReview {
  const own = ownAttempts(attempts, skillId);
  const evidence = getSkillEvidence(own, skillId, evidencePolicy, chance);
  if (own.length === 0) {
    return {
      skillId,
      evidence,
      basis: 'not-yet-observed',
      lastDay: null,
      daysSince: null,
      waitDays: null,
      troubleDays: 0,
      due: false,
      overdueDays: null,
      dueOn: null,
      calendarInDoubt: false,
    };
  }

  // The last day it was practised, in any way at all: with the guide, with a hint, with a grown-up, or alone.
  let lastDay: string | null = null;
  let daysSince: number | null = null;
  let calendarInDoubt = dayNumber(today) === null;
  for (const attempt of own) {
    const ago = daysAgo(attempt.day, today, policy.calendarSlackDays);
    if (ago === 'after-today') calendarInDoubt = true;
    if (typeof ago !== 'number') continue;
    // Of two days as long ago as each other (both taken as today), the earlier text is kept, to be the same
    // answer whatever order the record comes in.
    if (
      daysSince === null ||
      ago < daysSince ||
      (ago === daysSince && attempt.day < (lastDay ?? ''))
    ) {
      daysSince = ago;
      lastDay = attempt.day;
    }
  }

  const everAlone = evidence.independentSuccesses > 0;
  const troubleDays = daysOfTrouble(own, everAlone);
  const basis: Exclude<ReviewBasis, 'not-yet-observed'> = !everAlone
    ? 'not-yet-alone'
    : troubleDays > 0
      ? 'missed-last'
      : evidence.status === 'consistently-independent'
        ? 'consistent'
        : evidence.status === 'provisionally-independent'
          ? 'provisional'
          : 'practicing';
  const waitDays = waitFor(basis, evidence, troubleDays, policy, evidencePolicy);

  // With no day to count from (today is not a day, or every day recorded is after it), nothing is known about
  // how long it has been. When today is a day, it is offered again now: once practised today, there is a day to
  // count from. When today is not a day, nothing is offered: there is no calendar to go by at all.
  if (daysSince === null) {
    const known = dayNumber(today) !== null;
    return {
      skillId,
      evidence,
      basis,
      lastDay: null,
      daysSince: null,
      waitDays,
      troubleDays,
      due: known,
      overdueDays: known ? 0 : null,
      dueOn: known ? today : null,
      calendarInDoubt: true,
    };
  }

  return {
    skillId,
    evidence,
    basis,
    lastDay,
    daysSince,
    waitDays,
    troubleDays,
    due: daysSince >= waitDays,
    overdueDays: daysSince - waitDays,
    dueOn: addDays(today, waitDays - daysSince),
    calendarInDoubt,
  };
}

/** The answers of a record, sorted into one list for each skill: for looking at many skills without reading it all again for each. */
export function attemptsBySkill(attempts: readonly Attempt[]): Map<string, Attempt[]> {
  const sorted = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const list = sorted.get(attempt.skillId);
    if (list) list.push(attempt);
    else sorted.set(attempt.skillId, [attempt]);
  }
  return sorted;
}
