import { beforeEach, describe, expect, it } from 'vitest';
import {
  advanceDemo,
  getNextChallenge,
  getSkillEvidence,
  submitAttempt,
  type Attempt,
  type LessonSession,
} from '@/engine';
import {
  MAX_PROFILES,
  StorageError,
  buildBundle,
  checksumOf,
  type ExportBundle,
  type Repository,
} from '@/storage';
import {
  DAY_MS,
  T0,
  answerCorrectly,
  answerWrongFirst,
  attempt as madeAttempt,
  dayOf,
  newSession,
  play,
  sampleLesson,
} from '../helpers/content';
import {
  BACKEND_NAMES,
  freshBackend,
  repositoryOn,
  type Backend,
  type TestClock,
} from '../helpers/storage';

const lesson = sampleLesson();
const SKILL = 'math.quantity.match-sets-to-3';

/** Play a whole lesson for a player, saving every step the way the game does. */
async function playAndSave(
  repo: Repository,
  profileId: string,
  seed: number,
  now: number,
  player = answerCorrectly,
): Promise<{ session: LessonSession; attempts: Attempt[] }> {
  const start = { ...newSession(lesson, seed, `sess-${profileId}-${seed}`, now), profileId };
  await repo.saveProgress(start);
  const result = play(lesson, start, player, { now });
  // Replay the same moves through storage, one save per step.
  let session = start;
  let cursor = 0;
  for (;;) {
    const view = getNextChallenge(session, lesson);
    if (!view) break;
    if (view.stage === 'demo') {
      session = advanceDemo(session, lesson, now);
      await repo.saveProgress(session);
      continue;
    }
    const recorded = result.attempts[cursor++];
    if (!recorded) break;
    const submitted = submitAttempt(session, lesson, {
      key: view.key,
      choiceId: recorded.response,
      now: recorded.at,
      day: recorded.day,
      durationMs: recorded.durationMs,
    });
    if (!submitted.accepted) throw new Error(submitted.reason);
    session = submitted.session;
    await repo.saveProgress(session, submitted.attempt);
  }
  return { session, attempts: result.attempts.map((a) => ({ ...a, profileId })) };
}

describe.each(BACKEND_NAMES)('repository on %s', (name) => {
  let backend: Backend;
  let clock: TestClock;
  let repo: Repository;

  beforeEach(async () => {
    backend = freshBackend(name);
    clock = { now: T0 };
    repo = await repositoryOn(backend, clock);
  });

  describe('players', () => {
    it('starts with none', async () => {
      expect(await repo.listProfiles()).toEqual([]);
      expect(await repo.getActiveProfileId()).toBeNull();
      expect(await repo.getActiveProfile()).toBeNull();
    });

    it('creates a player from a nickname and a picture — nothing else is asked for', async () => {
      const profile = await repo.createProfile({ name: '  Robin  ', avatar: 'leaf' });
      expect(profile).toEqual({
        schemaVersion: 1,
        id: profile.id,
        name: 'Robin',
        avatar: 'leaf',
        createdAt: T0,
        updatedAt: T0,
        settings: { sessionMinutes: null },
      });
      expect(Object.keys(profile).sort()).toEqual(
        ['avatar', 'createdAt', 'id', 'name', 'schemaVersion', 'settings', 'updatedAt'].sort(),
      );
      expect(await repo.getProfile(profile.id)).toEqual(profile);
    });

    it('makes the first player the active one, and leaves later ones alone', async () => {
      const first = await repo.createProfile({ name: 'One', avatar: 'sun' });
      clock.now += 1000;
      await repo.createProfile({ name: 'Two', avatar: 'moon' });
      expect(await repo.getActiveProfileId()).toBe(first.id);
      expect((await repo.getActiveProfile())?.name).toBe('One');
    });

    it('lists players oldest first', async () => {
      for (const playerName of ['A', 'B', 'C']) {
        await repo.createProfile({ name: playerName, avatar: 'star' });
        clock.now += 1000;
      }
      expect((await repo.listProfiles()).map((p) => p.name)).toEqual(['A', 'B', 'C']);
    });

    it('renames, re-pictures and changes settings', async () => {
      const profile = await repo.createProfile({ name: 'Sam', avatar: 'sun' });
      clock.now += 5000;
      const updated = await repo.updateProfile(profile.id, {
        name: 'Sammy',
        avatar: 'drop',
        settings: { sessionMinutes: 15 },
      });
      expect(updated).toMatchObject({
        id: profile.id,
        name: 'Sammy',
        avatar: 'drop',
        createdAt: T0,
        updatedAt: T0 + 5000,
        settings: { sessionMinutes: 15 },
      });
      expect(await repo.getProfile(profile.id)).toEqual(updated);
    });

    it.each([
      ['an empty name', { name: '   ', avatar: 'sun' }],
      ['a very long name', { name: 'x'.repeat(40), avatar: 'sun' }],
      ['an unknown picture', { name: 'Kit', avatar: 'dragon' }],
    ])('refuses %s and writes nothing', async (_label, input) => {
      await expect(repo.createProfile(input as never)).rejects.toMatchObject({
        code: 'invalid-record',
      });
      expect(await repo.listProfiles()).toEqual([]);
    });

    it('refuses an invalid change and keeps the player as they were', async () => {
      const profile = await repo.createProfile({ name: 'Kit', avatar: 'sun' });
      await expect(repo.updateProfile(profile.id, { name: '' })).rejects.toBeInstanceOf(
        StorageError,
      );
      await expect(
        repo.updateProfile(profile.id, { settings: { sessionMinutes: 45 as never } }),
      ).rejects.toBeInstanceOf(StorageError);
      expect(await repo.getProfile(profile.id)).toEqual(profile);
      await expect(repo.updateProfile('nobody', { name: 'x' })).rejects.toMatchObject({
        code: 'not-found',
      });
    });

    it(`stops at ${MAX_PROFILES} players`, async () => {
      for (let index = 0; index < MAX_PROFILES; index++) {
        await repo.createProfile({ name: `P${index}`, avatar: 'star' });
      }
      await expect(repo.createProfile({ name: 'Extra', avatar: 'star' })).rejects.toMatchObject({
        code: 'limit',
      });
      expect(await repo.listProfiles()).toHaveLength(MAX_PROFILES);
    });

    it('switches the active player, and only to one that exists', async () => {
      const one = await repo.createProfile({ name: 'One', avatar: 'sun' });
      const two = await repo.createProfile({ name: 'Two', avatar: 'moon' });
      await repo.setActiveProfileId(two.id);
      expect(await repo.getActiveProfileId()).toBe(two.id);
      await expect(repo.setActiveProfileId('nobody')).rejects.toMatchObject({ code: 'not-found' });
      expect(await repo.getActiveProfileId()).toBe(two.id);
      await repo.setActiveProfileId(null);
      expect(await repo.getActiveProfileId()).toBeNull();
      expect(one.id).not.toBe(two.id);
    });

    it('deleting a player removes everything recorded about them, and nobody else’s', async () => {
      const keep = await repo.createProfile({ name: 'Keep', avatar: 'sun' });
      const drop = await repo.createProfile({ name: 'Drop', avatar: 'moon' });
      await playAndSave(repo, keep.id, 1, T0);
      await playAndSave(repo, drop.id, 2, T0);
      await repo.setActiveProfileId(drop.id);

      await repo.deleteProfile(drop.id);

      expect((await repo.listProfiles()).map((p) => p.id)).toEqual([keep.id]);
      expect(await repo.listSessions(drop.id)).toEqual([]);
      expect(await repo.listAttempts(drop.id)).toEqual([]);
      expect(await repo.listSessions(keep.id)).toHaveLength(1);
      expect(await repo.listAttempts(keep.id)).toHaveLength(5);
      // The remaining player takes over.
      expect(await repo.getActiveProfileId()).toBe(keep.id);

      await repo.deleteProfile(keep.id);
      expect(await repo.getActiveProfileId()).toBeNull();
    });
  });

  describe('lesson sittings', () => {
    it('saves a sitting step by step and restores it exactly after a reload', async () => {
      const profile = await repo.createProfile({ name: 'Ada', avatar: 'star' });
      let session: LessonSession = { ...newSession(lesson, 5, 'sess-a'), profileId: profile.id };
      await repo.saveProgress(session);
      session = advanceDemo(session, lesson, T0 + 1000);
      await repo.saveProgress(session);
      const view = getNextChallenge(session, lesson)!;
      const submitted = submitAttempt(session, lesson, {
        key: view.key,
        choiceId: view.challenge.answer,
        now: T0 + 2000,
        day: dayOf(T0),
        durationMs: 1500,
      });
      if (!submitted.accepted) throw new Error(submitted.reason);
      await repo.saveProgress(submitted.session, submitted.attempt);

      // "Reload": a new repository over the same device.
      repo.close();
      const reopened = await repositoryOn(backend, clock);
      const restored = await reopened.findActiveSession(profile.id, lesson.id);
      expect(restored).toEqual(submitted.session);
      expect(await reopened.listAttempts(profile.id)).toEqual([submitted.attempt]);

      // The restored sitting continues with the same question in the same order.
      expect(getNextChallenge(restored!, lesson)).toEqual(
        getNextChallenge(submitted.session, lesson),
      );
    });

    it('a finished sitting is not offered for resuming', async () => {
      const profile = await repo.createProfile({ name: 'Ada', avatar: 'star' });
      const { session } = await playAndSave(repo, profile.id, 3, T0);
      expect(session.status).toBe('completed');
      expect(await repo.findActiveSession(profile.id, lesson.id)).toBeNull();
      expect(await repo.listSessions(profile.id)).toHaveLength(1);
    });

    it('offers the most recent unfinished sitting, and only for the right lesson and player', async () => {
      const ada = await repo.createProfile({ name: 'Ada', avatar: 'star' });
      const bo = await repo.createProfile({ name: 'Bo', avatar: 'sun' });
      const older = { ...newSession(lesson, 1, 'older', T0), profileId: ada.id };
      const newer = { ...newSession(lesson, 2, 'newer', T0 + 9000), profileId: ada.id };
      await repo.saveProgress(older);
      await repo.saveProgress(newer);
      expect((await repo.findActiveSession(ada.id, lesson.id))?.id).toBe('newer');
      expect(await repo.findActiveSession(ada.id, 'another-lesson')).toBeNull();
      expect(await repo.findActiveSession(bo.id, lesson.id)).toBeNull();
    });

    it('never records the same attempt twice: the second writer changes nothing', async () => {
      const profile = await repo.createProfile({ name: 'Ada', avatar: 'star' });
      let session: LessonSession = { ...newSession(lesson, 5, 'sess-a'), profileId: profile.id };
      session = advanceDemo(session, lesson, T0);
      await repo.saveProgress(session);
      const view = getNextChallenge(session, lesson)!;
      const input = {
        key: view.key,
        now: T0 + 1000,
        day: dayOf(T0),
        durationMs: 900,
      };
      const first = submitAttempt(session, lesson, { ...input, choiceId: view.challenge.answer });
      if (!first.accepted) throw new Error(first.reason);
      await repo.saveProgress(first.session, first.attempt);

      // A second tab, still showing the old step, answers differently.
      const wrong = view.choices.find((c) => c.choice.id !== view.challenge.answer)!.choice.id;
      const second = submitAttempt(session, lesson, { ...input, choiceId: wrong });
      if (!second.accepted) throw new Error(second.reason);
      await expect(repo.saveProgress(second.session, second.attempt)).rejects.toMatchObject({
        code: 'conflict',
      });

      expect(await repo.findActiveSession(profile.id, lesson.id)).toEqual(first.session);
      expect(await repo.listAttempts(profile.id)).toEqual([first.attempt]);
    });

    it('refuses to save records that do not validate or do not belong together', async () => {
      const profile = await repo.createProfile({ name: 'Ada', avatar: 'star' });
      const session = { ...newSession(lesson, 5, 'sess-a'), profileId: profile.id };
      await expect(repo.saveProgress({ ...session, cursor: -1 })).rejects.toMatchObject({
        code: 'invalid-record',
      });
      await expect(
        repo.saveProgress(
          session,
          madeAttempt({ sessionId: 'someone-else', profileId: profile.id }),
        ),
      ).rejects.toMatchObject({ code: 'invalid-record' });
      await expect(
        repo.saveProgress(
          session,
          madeAttempt({ sessionId: 'sess-a', profileId: profile.id, tryIndex: -3 }),
        ),
      ).rejects.toMatchObject({ code: 'invalid-record' });
      expect(await repo.listSessions(profile.id)).toEqual([]);
      expect(await repo.listAttempts(profile.id)).toEqual([]);
    });

    it('discarding a sitting keeps the answers already given', async () => {
      const profile = await repo.createProfile({ name: 'Ada', avatar: 'star' });
      const { session } = await playAndSave(repo, profile.id, 4, T0);
      await repo.discardSession(session.id);
      expect(await repo.listSessions(profile.id)).toEqual([]);
      expect(await repo.listAttempts(profile.id)).toHaveLength(5);
    });

    it('keeps each player’s record to themselves', async () => {
      const ada = await repo.createProfile({ name: 'Ada', avatar: 'star' });
      const bo = await repo.createProfile({ name: 'Bo', avatar: 'sun' });
      await playAndSave(repo, ada.id, 1, T0, answerCorrectly);
      await playAndSave(repo, bo.id, 1, T0, answerWrongFirst);

      const adaAttempts = await repo.listAttempts(ada.id);
      const boAttempts = await repo.listAttempts(bo.id);
      expect(adaAttempts.every((a) => a.profileId === ada.id)).toBe(true);
      expect(boAttempts.every((a) => a.profileId === bo.id)).toBe(true);
      expect(getSkillEvidence(adaAttempts, SKILL).independentSuccesses).toBe(3);
      expect(getSkillEvidence(boAttempts, SKILL).independentSuccesses).toBe(0);
    });

    it('returns attempts in the order they happened', async () => {
      const profile = await repo.createProfile({ name: 'Ada', avatar: 'star' });
      await playAndSave(repo, profile.id, 2, T0 + DAY_MS);
      await playAndSave(repo, profile.id, 1, T0);
      const times = (await repo.listAttempts(profile.id)).map((a) => a.at);
      expect(times).toEqual([...times].sort((a, b) => a - b));
    });
  });

  describe('save a copy, load a copy, start over', () => {
    async function seeded(): Promise<{ profileId: string; bundle: ExportBundle }> {
      const profile = await repo.createProfile({ name: 'Ada', avatar: 'star' });
      await playAndSave(repo, profile.id, 1, T0, answerCorrectly);
      await playAndSave(repo, profile.id, 2, T0 + DAY_MS, answerWrongFirst);
      const unfinished = {
        ...newSession(lesson, 3, 'unfinished', T0 + 2 * DAY_MS),
        profileId: profile.id,
      };
      await repo.saveProgress(unfinished);
      clock.now = T0 + 3 * DAY_MS;
      return { profileId: profile.id, bundle: await repo.exportProfile(profile.id) };
    }

    it('exports a readable, versioned, checksummed file', async () => {
      const { bundle, profileId } = await seeded();
      expect(bundle).toMatchObject({
        format: 'training-academy.profile-export',
        formatVersion: 1,
        exportedAt: T0 + 3 * DAY_MS,
        app: { version: '0.0.0-test', dataVersion: 1 },
      });
      expect(bundle.profile.id).toBe(profileId);
      expect(bundle.sessions).toHaveLength(3);
      expect(bundle.attempts.length).toBeGreaterThan(10);
      expect(bundle.checksum).toMatch(/^cyrb53:[0-9a-f]{14}$/);
      expect(JSON.parse(JSON.stringify(bundle))).toEqual(bundle);
      await expect(repo.exportProfile('nobody')).rejects.toMatchObject({ code: 'not-found' });
    });

    it('export → erase everything → import gives back identical progress', async () => {
      const { profileId, bundle } = await seeded();
      const before = {
        profiles: await repo.listProfiles(),
        sessions: await repo.listSessions(profileId),
        attempts: await repo.listAttempts(profileId),
      };
      const evidenceBefore = getSkillEvidence(before.attempts, SKILL);
      const file = JSON.stringify(bundle);

      await repo.resetAll();
      expect(await repo.listProfiles()).toEqual([]);
      expect(await repo.listAttempts(profileId)).toEqual([]);
      expect(await repo.getActiveProfileId()).toBeNull();

      const result = await repo.importBundle(file);
      expect(result).toMatchObject({
        ok: true,
        created: true,
        added: { sessions: 3, attempts: before.attempts.length },
      });
      expect(await repo.listProfiles()).toEqual(before.profiles);
      expect(await repo.listSessions(profileId)).toEqual(before.sessions);
      expect(await repo.listAttempts(profileId)).toEqual(before.attempts);
      expect(getSkillEvidence(await repo.listAttempts(profileId), SKILL)).toEqual(evidenceBefore);
      expect(await repo.getActiveProfileId()).toBe(profileId);
      // The unfinished sitting can be picked up again.
      expect((await repo.findActiveSession(profileId, lesson.id))?.id).toBe('unfinished');
    });

    it('importing the same file twice changes nothing the second time', async () => {
      const { profileId, bundle } = await seeded();
      const snapshot = await repo.listAttempts(profileId);
      const again = await repo.importBundle(bundle);
      expect(again).toMatchObject({
        ok: true,
        created: false,
        added: { sessions: 0, attempts: 0 },
      });
      expect(await repo.listAttempts(profileId)).toEqual(snapshot);
    });

    it('merges a file into a player who has played on since it was saved', async () => {
      const { profileId, bundle } = await seeded();
      await playAndSave(repo, profileId, 9, T0 + 5 * DAY_MS);
      clock.now = T0 + 6 * DAY_MS;
      await repo.updateProfile(profileId, { name: 'Ada L' });
      const local = await repo.listAttempts(profileId);

      const result = await repo.importBundle(bundle);
      expect(result).toMatchObject({ ok: true, created: false, added: { attempts: 0 } });
      expect(await repo.listAttempts(profileId)).toEqual(local);
      // The newer name on the device is kept.
      expect((await repo.getProfile(profileId))?.name).toBe('Ada L');
    });

    it('merges a newer file over an older device copy', async () => {
      const { profileId } = await seeded();
      const older = await repo.exportProfile(profileId);
      await playAndSave(repo, profileId, 9, T0 + 5 * DAY_MS);
      clock.now = T0 + 6 * DAY_MS;
      await repo.updateProfile(profileId, { name: 'Ada L', avatar: 'moon' });
      const newer = await repo.exportProfile(profileId);

      await repo.resetAll();
      await repo.importBundle(older);
      const result = await repo.importBundle(newer);
      expect(result).toMatchObject({
        ok: true,
        created: false,
        added: { sessions: 1, attempts: 5 },
      });
      expect(await repo.listAttempts(profileId)).toEqual(
        newer.attempts.sort(
          (a, b) => a.at - b.at || a.sessionId.localeCompare(b.sessionId) || a.seq - b.seq,
        ),
      );
      expect(await repo.getProfile(profileId)).toMatchObject({ name: 'Ada L', avatar: 'moon' });
    });

    it('refuses anything that is not an intact export, and writes nothing', async () => {
      const { profileId, bundle } = await seeded();
      const before = await repo.listAttempts(profileId);
      const tampered = structuredClone(bundle);
      tampered.attempts[0]!.outcome =
        tampered.attempts[0]!.outcome === 'correct' ? 'incorrect' : 'correct';
      const promoted = structuredClone(bundle);
      for (const a of promoted.attempts) {
        a.tryIndex = 0;
        a.hintLevel = 0;
        a.assistance = 'none';
        a.outcome = 'correct';
        a.stage = 'independent';
      }
      const foreignAttempts = [
        ...bundle.attempts,
        madeAttempt({ profileId: 'someone-else', sessionId: 'x' }),
      ];
      const foreign = buildBundle({
        profile: bundle.profile,
        sessions: bundle.sessions,
        attempts: foreignAttempts,
        exportedAt: T0,
        appVersion: 't',
        dataVersion: 1,
      });
      const malformed = { ...bundle, attempts: [{ nonsense: true }] };

      const cases: [unknown, string][] = [
        ['{ not json', 'not-json'],
        ['x'.repeat(6 * 1024 * 1024), 'too-large'],
        [42, 'wrong-format'],
        [JSON.stringify({ format: 'something-else' }), 'wrong-format'],
        [{ ...bundle, formatVersion: 2 }, 'unsupported-version'],
        [malformed, 'invalid-shape'],
        [tampered, 'checksum-mismatch'],
        [promoted, 'checksum-mismatch'],
        [{ ...bundle, checksum: checksumOf('something else') }, 'checksum-mismatch'],
        [foreign, 'foreign-records'],
      ];
      for (const [input, problem] of cases) {
        expect(await repo.importBundle(input)).toMatchObject({ ok: false, problem });
      }
      expect(await repo.listAttempts(profileId)).toEqual(before);
      expect(await repo.listProfiles()).toHaveLength(1);
    });

    it('will not import an extra player onto a full device', async () => {
      const { bundle } = await seeded();
      await repo.resetAll();
      for (let index = 0; index < MAX_PROFILES; index++) {
        await repo.createProfile({ name: `P${index}`, avatar: 'star' });
      }
      expect(await repo.importBundle(bundle)).toMatchObject({
        ok: false,
        problem: 'too-many-profiles',
      });
    });

    it('starting over leaves an empty, working game', async () => {
      await seeded();
      await repo.resetAll();
      expect(await repo.listProfiles()).toEqual([]);
      const fresh = await repo.createProfile({ name: 'New', avatar: 'sun' });
      expect(await repo.getActiveProfileId()).toBe(fresh.id);
      repo.close();
      const reopened = await repositoryOn(backend, clock);
      expect(await reopened.listProfiles()).toHaveLength(1);
    });
  });

  describe('damaged records', () => {
    it('skips records that do not validate, counts them, and leaves the rest usable', async () => {
      const profile = await repo.createProfile({ name: 'Ada', avatar: 'star' });
      await playAndSave(repo, profile.id, 1, T0);
      const driver = await backend.open();
      await driver.write([
        {
          op: 'put',
          store: 'attempts',
          key: 'junk-1',
          value: { profileId: profile.id, id: 'junk-1' },
        },
        {
          op: 'put',
          store: 'sessions',
          key: 'junk-2',
          value: { profileId: profile.id, id: 'junk-2', status: 'weird' },
        },
        { op: 'put', store: 'profiles', key: 'junk-3', value: 'not even an object' },
      ]);

      const reader = await repositoryOn(backend, clock);
      expect(await reader.listAttempts(profile.id)).toHaveLength(5);
      expect(await reader.listSessions(profile.id)).toHaveLength(1);
      expect(await reader.listProfiles()).toHaveLength(1);
      expect(await reader.getProfile('junk-3')).toBeNull();
      expect(reader.invalidRecords).toBe(4);
      // Nothing was deleted behind the grown-up's back.
      expect(await driver.get('attempts', 'junk-1')).toBeDefined();
    });
  });
});
