import { luckAmong } from './chance';
import type { Attempt } from './schema';

/**
 * What the learning record says about one skill.
 *
 * The record is the list of attempts and nothing else: a lesson that was opened, a demonstration that was watched or
 * a hint that was read leaves no trace here, so none of them can add up to "mastery". Only a response can, and only a
 * first-try response with no hint and no adult help in an independent step counts as independent evidence.
 *
 * And a run of right answers counts only when it was unlikely to be luck. Some questions are easy to get right
 * without knowing anything (with two pictures to choose from, half of all taps are right), so the caller says how
 * likely a blind answer to this skill's questions is to be right (`chance`, from the concept graph), and a skill is
 * called independent only when the latest first tries alone were too good to put down to that.
 *
 * The thresholds are product heuristics, kept in one place so they can be tuned and so a grown-up can be shown exactly
 * what they are. They are not validated diagnostic cut-offs and nothing here estimates ability, intelligence or
 * development.
 */

export type EvidenceStatus =
  /** No response recorded. Not the same as "cannot do it". */
  | 'not-yet-observed'
  /** Has responded, but never correctly without help. */
  | 'exploring'
  /** Correct at the first try in supported practice; no independent success yet. */
  | 'guided'
  /** Some independent success, not yet enough to say more. */
  | 'practicing'
  /** Enough varied independent success within a short span. */
  | 'provisionally-independent'
  /** Enough varied independent success across separate days. */
  | 'consistently-independent';

export interface EvidencePolicy {
  provisional: {
    minIndependentSuccesses: number;
    minDistinctVariants: number;
    minRecentAccuracy: number;
    /**
     * As likely as the latest first tries alone may have been to come out so well by chance: 0.05 is one time
     * in twenty. Where chance has no part in the questions (a robot's plan) this asks for nothing.
     */
    maxLuck: number;
  };
  consistent: {
    minIndependentSuccesses: number;
    minDistinctVariants: number;
    minDistinctDays: number;
    minRecentAccuracy: number;
    /**
     * The same, for the stronger thing said: 0.005 is one time in two hundred. With two pictures to choose
     * from that is all of the last eight right; with three, five of five, or seven of eight.
     *
     * It was one in fifty at first. Forty made-up months of tapping without looking were then read by both:
     * at one in fifty some skill was called "independent across days" at some time in thirteen of the forty
     * months, at one in two hundred in six, and the learners who do know things lost one to four skills of
     * about fifty from that column at six weeks. One in five hundred brought the thirteen down to one and
     * took a fifth to a half of the column from everybody else. (docs/QUALITY_REPORT.md has the table.)
     */
    maxLuck: number;
  };
  /** How many of the latest independent probes "recent accuracy" looks at. */
  recentWindow: number;
}

export const DEFAULT_EVIDENCE_POLICY: EvidencePolicy = {
  provisional: {
    minIndependentSuccesses: 3,
    minDistinctVariants: 2,
    minRecentAccuracy: 0.75,
    maxLuck: 0.05,
  },
  consistent: {
    minIndependentSuccesses: 5,
    minDistinctVariants: 2,
    minDistinctDays: 2,
    minRecentAccuracy: 0.8,
    maxLuck: 0.005,
  },
  recentWindow: 8,
};

export interface SkillEvidence {
  skillId: string;
  status: EvidenceStatus;
  /** Every response recorded for the skill, of any kind. */
  totalAttempts: number;
  /**
   * Independent successes that count: first try, no hint, no adult help, independent step. The same challenge
   * answered again on the same day is counted once, so replaying a lesson cannot inflate it.
   */
  independentSuccesses: number;
  /** First tries in an independent step with no help that were wrong, or were right without showing the skill. */
  independentMisses: number;
  /** First-try, unhinted, unassisted correct answers in guided steps. */
  guidedSuccesses: number;
  /** Correct answers that needed a retry, a hint or an adult. */
  assistedSuccesses: number;
  distinctVariants: number;
  distinctDays: number;
  distinctSessions: number;
  /** Share of the latest independent probes that were right, or `null` when there are none. */
  recentAccuracy: number | null;
  /**
   * How likely a blind answer was to be right, for the easiest to guess of those latest probes: what each
   * answer says of itself, or what the caller gave for answers written before that was kept. None when there
   * are no probes.
   */
  chance: number;
  /**
   * How likely those latest probes were to come out at least so well by chance alone: `null` when there are
   * none, one when none was right.
   */
  luck: number | null;
  /**
   * True when everything else it takes to be called independent so far is there, and the latest answers could
   * too easily have been lucky: what is wanted is more of the same, not something different.
   */
  heldByLuck: boolean;
  lastAttemptAt: number | null;
  lastIndependentSuccessAt: number | null;
}

/**
 * Right, in a way that shows the skill. An answer can be right without that in one kind of task only: pairs all
 * found, by turning cards over far more often than remembering needs (`clean: false` on the record).
 */
export function showsTheSkill(attempt: Attempt): boolean {
  return attempt.outcome === 'correct' && attempt.clean !== false;
}

/** True for the only kind of attempt that is evidence of independent skill. */
export function isIndependentSuccess(attempt: Attempt): boolean {
  return isIndependentProbe(attempt) && showsTheSkill(attempt);
}

/** A first, unhinted, unassisted response in an independent step — right or wrong. */
export function isIndependentProbe(attempt: Attempt): boolean {
  return (
    attempt.stage === 'independent' &&
    attempt.tryIndex === 0 &&
    attempt.hintLevel === 0 &&
    attempt.assistance === 'none'
  );
}

function byTime(a: Attempt, b: Attempt): number {
  return a.at - b.at || a.sessionId.localeCompare(b.sessionId) || a.seq - b.seq;
}

export function getSkillEvidence(
  attempts: readonly Attempt[],
  skillId: string,
  policy: EvidencePolicy = DEFAULT_EVIDENCE_POLICY,
  /**
   * How likely a blind answer to this skill's questions is to be right, for answers that do not say it of
   * themselves (those written before it was kept): none unless the caller says.
   */
  chance = 0,
): SkillEvidence {
  const seen = new Set<string>();
  const own = attempts
    .filter((attempt) => {
      if (attempt.skillId !== skillId || seen.has(attempt.id)) return false;
      seen.add(attempt.id);
      return true;
    })
    .sort(byTime);

  const probes = own.filter(isIndependentProbe);
  const successes = probes.filter(showsTheSkill);

  // One success per challenge per day.
  const counted = new Map<string, Attempt>();
  for (const attempt of successes) {
    const key = `${attempt.challengeId}@${attempt.day}`;
    if (!counted.has(key)) counted.set(key, attempt);
  }
  const countedSuccesses = [...counted.values()];

  const independentSuccesses = countedSuccesses.length;
  const distinctVariants = new Set(countedSuccesses.map((attempt) => attempt.variant)).size;
  const distinctDays = new Set(countedSuccesses.map((attempt) => attempt.day)).size;
  const distinctSessions = new Set(countedSuccesses.map((attempt) => attempt.sessionId)).size;

  const recent = probes.slice(-policy.recentWindow);
  const recentAccuracy =
    recent.length === 0 ? null : recent.filter(showsTheSkill).length / recent.length;

  const guidedSuccesses = own.filter(
    (attempt) =>
      attempt.stage === 'guided' &&
      showsTheSkill(attempt) &&
      attempt.tryIndex === 0 &&
      attempt.hintLevel === 0 &&
      attempt.assistance === 'none',
  ).length;
  const assistedSuccesses = own.filter(
    (attempt) =>
      attempt.outcome === 'correct' &&
      (attempt.tryIndex > 0 || attempt.hintLevel > 0 || attempt.assistance !== 'none'),
  ).length;

  const chances = recent.map((attempt) => attempt.chance ?? chance);
  const luck = recent.length === 0 ? null : luckAmong(recent.filter(showsTheSkill).length, chances);
  const butForLuck = (
    rule: EvidencePolicy['provisional'] & { minDistinctDays?: number },
  ): boolean =>
    independentSuccesses >= rule.minIndependentSuccesses &&
    distinctVariants >= rule.minDistinctVariants &&
    distinctDays >= (rule.minDistinctDays ?? 1) &&
    recentAccuracy !== null &&
    recentAccuracy >= rule.minRecentAccuracy;
  const meets = (rule: EvidencePolicy['provisional'] & { minDistinctDays?: number }): boolean =>
    butForLuck(rule) && luck !== null && luck <= rule.maxLuck;

  let status: EvidenceStatus;
  if (own.length === 0) status = 'not-yet-observed';
  else if (meets(policy.consistent)) status = 'consistently-independent';
  else if (meets(policy.provisional)) status = 'provisionally-independent';
  else if (independentSuccesses > 0) status = 'practicing';
  else if (guidedSuccesses > 0) status = 'guided';
  else status = 'exploring';

  return {
    skillId,
    status,
    totalAttempts: own.length,
    independentSuccesses,
    independentMisses: probes.length - successes.length,
    guidedSuccesses,
    assistedSuccesses,
    distinctVariants,
    distinctDays,
    distinctSessions,
    recentAccuracy,
    chance: Math.max(0, ...chances),
    luck,
    heldByLuck: butForLuck(policy.provisional) && !meets(policy.provisional),
    lastAttemptAt: own.at(-1)?.at ?? null,
    lastIndependentSuccessAt: successes.at(-1)?.at ?? null,
  };
}
