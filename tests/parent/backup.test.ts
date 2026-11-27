import { describe, expect, it } from 'vitest';
import { loadPack } from '@/content';
import { createSession, advanceDemo, getNextChallenge, submitAttempt } from '@/engine';
import { checkBackupContent } from '@/parent/backup';
import { buildBundle, MemoryDriver, Repository } from '@/storage';

async function fixture() {
  const pack = await loadPack('number-garden');
  const lesson = pack.lessons[0]!;
  const time = Date.UTC(2026, 10, 27);
  let id = 0;
  const makeRepo = () =>
    new Repository({ driver: new MemoryDriver(), now: () => time, newId: () => `id-${++id}` });
  const source = makeRepo();
  const profile = await source.createProfile({ name: 'Explorer', avatar: 'star' });
  let session = createSession(lesson, {
    id: 'session-1',
    profileId: profile.id,
    contentVersion: pack.contentVersion,
    seed: 42,
    now: time,
  });
  if (getNextChallenge(session, lesson)?.stage === 'demo')
    session = advanceDemo(session, lesson, time);
  const view = getNextChallenge(session, lesson)!;
  const challenge = view.challenge;
  if (challenge.kind !== 'choose-one') throw new Error('Expected choices');
  const result = submitAttempt(session, lesson, {
    key: view.key,
    response: challenge.answer,
    now: time,
    day: '2026-11-27',
    durationMs: 100,
  });
  if (!result.accepted) throw new Error(result.reason);
  const input = {
    profile,
    sessions: [result.session],
    attempts: [result.attempt],
    exportedAt: time,
    appVersion: '0.1.0',
    dataVersion: 2,
  };
  return { makeRepo, input };
}

describe('backup curriculum validation', () => {
  it('restores a copy with published content and preserves a world preference', async () => {
    const { makeRepo, input } = await fixture();
    input.profile.settings.leftOut = ['reading-cove'];
    const restored = makeRepo();
    const result = await restored.importBundle(buildBundle(input), checkBackupContent);
    expect(result).toMatchObject({ ok: true, added: { sessions: 1, attempts: 1 } });
    expect((await restored.getProfile(input.profile.id))?.settings.leftOut).toEqual([
      'reading-cove',
    ]);
  });

  it.each(['lesson', 'attempt question', 'sitting question', 'duplicates'] as const)(
    'rejects bad %s without storing anything',
    async (fault) => {
      const { makeRepo, input } = await fixture();
      const restored = makeRepo();
      if (fault === 'lesson') input.sessions[0]!.lessonId = 'ng-unknown-01';
      if (fault === 'attempt question')
        input.attempts[0]!.challengeId = 'ng-same-amount-01.unknown';
      if (fault === 'sitting question')
        input.sessions[0]!.reserve.push('ng-same-amount-01.unknown');
      if (fault === 'duplicates') input.attempts.push(input.attempts[0]!);
      const result = await restored.importBundle(buildBundle(input), checkBackupContent);
      expect(result).toMatchObject({
        ok: false,
        problem: fault === 'duplicates' ? 'duplicate-records' : 'unknown-content',
      });
      expect(await restored.listProfiles()).toEqual([]);
      expect(await restored.listAttempts(input.profile.id)).toEqual([]);
      expect(await restored.listSessions(input.profile.id)).toEqual([]);
    },
  );

  it('does not allow a copy to replace a different player’s sitting', async () => {
    const { makeRepo, input } = await fixture();
    const restored = makeRepo();
    const other = await restored.createProfile({ name: 'Ada', avatar: 'sun' });
    const existing = { ...input.sessions[0]!, profileId: other.id };
    await restored.saveProgress(existing);
    await expect(
      restored.importBundle(buildBundle(input), checkBackupContent),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(await restored.getProfile(input.profile.id)).toBeNull();
    expect(await restored.listSessions(other.id)).toEqual([existing]);
  });
});

/**
 * A lesson that changes is given a new version, and a family's own saved copy can hold answers from the version
 * before. "Make a tune" (ml-tune-01) is in its second version: its first is what such answers would name.
 */
describe('a copy made before an activity changed', () => {
  const fromTheFirstTune = {
    lessonId: 'ml-tune-01',
    lessonVersion: 1,
    challengeId: 'ml-tune-01.dropped',
    skillId: 'music.making.shape-a-tune',
  };

  it('loads an answer from an earlier version, even to a question the newer version has dropped', async () => {
    const { input } = await fixture();
    input.attempts[0] = { ...input.attempts[0]!, ...fromTheFirstTune };
    expect(await checkBackupContent(buildBundle(input))).toBeNull();
  });

  it('still refuses, from an earlier version, a question that is not that activity’s own', async () => {
    const { input } = await fixture();
    input.attempts[0] = {
      ...input.attempts[0]!,
      ...fromTheFirstTune,
      challengeId: 'ng-same-amount-01.q1',
    };
    expect(await checkBackupContent(buildBundle(input))).toBe(
      'The file refers to an unknown question (ng-same-amount-01.q1).',
    );
  });

  it('checks every question of the version this game has', async () => {
    const { input } = await fixture();
    input.attempts[0] = { ...input.attempts[0]!, ...fromTheFirstTune, lessonVersion: 2 };
    expect(await checkBackupContent(buildBundle(input))).toBe(
      'The file refers to an unknown question (ml-tune-01.dropped).',
    );
    // And the skill each was written for.
    input.attempts[0] = {
      ...input.attempts[0],
      challengeId: 'ml-tune-01.demo',
      skillId: 'math.quantity.match-sets-to-3',
    };
    expect(await checkBackupContent(buildBundle(input))).toBe(
      'The file refers to an unknown question (ml-tune-01.demo).',
    );
  });

  it('refuses an answer from a newer version than this game has, and says how to update', async () => {
    const { input } = await fixture();
    input.attempts[0] = { ...input.attempts[0]!, ...fromTheFirstTune, lessonVersion: 3 };
    expect(await checkBackupContent(buildBundle(input))).toMatch(
      /newer version of Training Academy\. Open the game while online/,
    );
  });

  it('refuses a sitting from a newer version, even one that names no question yet', async () => {
    const { input } = await fixture();
    input.attempts.length = 0;
    input.sessions[0] = {
      ...input.sessions[0]!,
      lessonVersion: input.sessions[0]!.lessonVersion + 1,
      steps: [],
      reserve: [],
    };
    expect(await checkBackupContent(buildBundle(input))).toMatch(/newer version/);
  });
});
