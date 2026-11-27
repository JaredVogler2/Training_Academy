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
