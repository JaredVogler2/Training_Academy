import { describe, expect, it } from 'vitest';
import { getSkillEvidence, type EvidenceStatus } from '@/engine';
import { describeEvidence, grownUpText } from '@/parent/text';
import { DAY_MS, T0, attempt } from '../helpers/content';

const SKILL = 'math.quantity.match-sets-to-3';

describe('explaining the record to a grown-up', () => {
  it('says plainly when nothing has been recorded', () => {
    expect(describeEvidence(getSkillEvidence([], SKILL))).toBe('Nothing recorded yet.');
  });

  it('counts independent successes, with how varied and how spread out they were', () => {
    const attempts = [
      attempt({ seq: 0, challengeId: 'ng-same-amount-01.a', variant: 'one' }),
      attempt({ seq: 1, challengeId: 'ng-same-amount-01.b', variant: 'two' }),
      attempt({
        sessionId: 's-2',
        seq: 0,
        at: T0 + DAY_MS,
        challengeId: 'ng-same-amount-01.c',
        variant: 'two',
      }),
    ];
    expect(describeEvidence(getSkillEvidence(attempts, SKILL))).toBe(
      '3 independent successes in 2 kinds of question on 2 days.',
    );
  });

  it('keeps help, retries and guided practice separate from independence', () => {
    const attempts = [
      attempt({ seq: 0, outcome: 'incorrect', response: 'a' }),
      attempt({ seq: 1, tryIndex: 1 }),
      attempt({ seq: 2, stage: 'guided', challengeId: 'ng-same-amount-01.g' }),
      attempt({ seq: 3, hintLevel: 1, assistance: 'hint', challengeId: 'ng-same-amount-01.h' }),
    ];
    expect(describeEvidence(getSkillEvidence(attempts, SKILL))).toBe(
      'No independent success yet. 1 first try without help was not right. ' +
        '1 right at the first try in practice with the guide. 2 right after a hint, another try or help.',
    );
  });

  it('uses singular and plural correctly', () => {
    expect(describeEvidence(getSkillEvidence([attempt()], SKILL))).toBe(
      '1 independent success in 1 kind of question on 1 day.',
    );
  });

  it('has a label for every status, none of which grades the child', () => {
    const statuses: EvidenceStatus[] = [
      'not-yet-observed',
      'exploring',
      'guided',
      'practicing',
      'provisionally-independent',
      'consistently-independent',
    ];
    for (const status of statuses) {
      const label = grownUpText.status[status];
      expect(label.length).toBeGreaterThan(3);
      expect(label).not.toMatch(/fail|behind|gifted|IQ|score|level|mastered/i);
    }
  });

  it('never calls the hold button a lock', () => {
    expect(grownUpText.gateHonest).toContain('not a lock');
  });
});
