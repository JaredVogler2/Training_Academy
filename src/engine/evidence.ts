import type { Attempt } from './schema';

/**
 * What the learning record says about one skill.
 *
 * The record is the list of attempts and nothing else: a lesson that was opened, a demonstration that was watched or
 * a hint that was read leaves no trace here, so none of them can add up to "mastery". Only a response can, and only a
 * first-try response with no hint and no adult help in an independent step counts as independent evidence.
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
  };
  consistent: {
    minIndependentSuccesses: number;
    minDistinctVariants: number;
    minDistinctDays: number;
    minRecentAccuracy: number;
  };
  /** How many of the latest independent probes "recent accuracy" looks at. */
  recentWindow: number;
}

export const DEFAULT_EVIDENCE_POLICY: EvidencePolicy = {
  provisional: { minIndependentSuccesses: 3, minDistinctVariants: 2, minRecentAccuracy: 0.75 },
  consistent: {
    minIndependentSuccesses: 5,
    minDistinctVariants: 2,
    minDistinctDays: 2,
    minRecentAccuracy: 0.8,
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
  /** First tries in an independent step with no help that were wrong. */
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
  lastAttemptAt: number | null;
  lastIndependentSuccessAt: number | null;
}

/** True for the only kind of attempt that is evidence of independent skill. */
export function isIndependentSuccess(attempt: Attempt): boolean {
  return isIndependentProbe(attempt) && attempt.outcome === 'correct';
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
  const successes = probes.filter((attempt) => attempt.outcome === 'correct');

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
    recent.length === 0
      ? null
      : recent.filter((attempt) => attempt.outcome === 'correct').length / recent.length;

  const guidedSuccesses = own.filter(
    (attempt) =>
      attempt.stage === 'guided' &&
      attempt.outcome === 'correct' &&
      attempt.tryIndex === 0 &&
      attempt.hintLevel === 0 &&
      attempt.assistance === 'none',
  ).length;
  const assistedSuccesses = own.filter(
    (attempt) =>
      attempt.outcome === 'correct' &&
      (attempt.tryIndex > 0 || attempt.hintLevel > 0 || attempt.assistance !== 'none'),
  ).length;

  const meets = (rule: EvidencePolicy['provisional'] & { minDistinctDays?: number }): boolean =>
    independentSuccesses >= rule.minIndependentSuccesses &&
    distinctVariants >= rule.minDistinctVariants &&
    distinctDays >= (rule.minDistinctDays ?? 1) &&
    recentAccuracy !== null &&
    recentAccuracy >= rule.minRecentAccuracy;

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
    lastAttemptAt: own.at(-1)?.at ?? null,
    lastIndependentSuccessAt: successes.at(-1)?.at ?? null,
  };
}
