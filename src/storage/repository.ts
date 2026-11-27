import {
  RECORD_SCHEMA_VERSION,
  parseAttempt,
  parseLessonSession,
  parseProfile,
  type Attempt,
  type AvatarId,
  type LessonSession,
  type ParseResult,
  type Profile,
} from '@/engine/schema';
import { StorageError, type DriverKind, type StorageDriver, type WriteOp } from './driver';
import { DATA_VERSION, withThePairsMark } from './migrations';
import { buildBundle, readBundle, type ExportBundle, type ImportProblem } from './transfer';

/**
 * Everything the game reads and writes about its players, on top of whichever driver the browser allowed.
 *
 *   - Nothing invalid is written: records are checked against the engine's schemas first.
 *   - Nothing invalid is trusted: records that fail the check on the way out are skipped and counted, never crash a
 *     child's game, and are left in place rather than deleted.
 *   - Changes that belong together (a lesson step and the attempt that caused it; a player and all their records) are
 *     one all-or-nothing batch.
 */

export const MAX_PROFILES = 8;
const ACTIVE_PROFILE_KEY = 'activeProfileId';

export type BackendNote =
  'indexeddb-unavailable' | 'localstorage-unavailable' | 'local-data-was-unreadable' | 'newer-data';

export interface BackendInfo {
  kind: DriverKind;
  /** False when progress will be forgotten as soon as the page closes. */
  persistent: boolean;
  /** Why the preferred storage is not in use, for the grown-up's diagnostics. */
  notes: BackendNote[];
}

export interface ProfileInput {
  name: string;
  avatar: AvatarId;
}

export interface ProfilePatch {
  name?: string;
  avatar?: AvatarId;
  settings?: Profile['settings'];
}

export type ImportResult =
  | {
      ok: true;
      profile: Profile;
      /** False when the player already existed here and the file was merged into them. */
      created: boolean;
      added: { sessions: number; attempts: number };
    }
  | { ok: false; problem: ImportProblem | 'too-many-profiles'; detail: string };

export interface RepositoryDeps {
  driver: StorageDriver;
  now: () => number;
  newId: () => string;
  notes?: BackendNote[];
  appVersion?: string;
}

export class Repository {
  readonly backend: BackendInfo;
  private readonly driver: StorageDriver;
  private readonly now: () => number;
  private readonly newId: () => string;
  private readonly appVersion: string;
  private skipped = 0;

  constructor(deps: RepositoryDeps) {
    this.driver = deps.driver;
    this.now = deps.now;
    this.newId = deps.newId;
    this.appVersion = deps.appVersion ?? '0.0.0';
    this.backend = {
      kind: deps.driver.kind,
      persistent: deps.driver.persistent,
      notes: deps.notes ?? [],
    };
  }

  /** How many stored records have been skipped because they did not pass validation. */
  get invalidRecords(): number {
    return this.skipped;
  }

  private keep<T>(records: unknown[], parse: (data: unknown) => ParseResult<T>): T[] {
    const valid: T[] = [];
    for (const record of records) {
      const parsed = parse(record);
      if (parsed.ok) valid.push(parsed.value);
      else this.skipped += 1;
    }
    return valid;
  }

  private static checked<T>(parsed: ParseResult<T>, what: string): T {
    if (parsed.ok) return parsed.value;
    throw new StorageError(
      'invalid-record',
      `Refusing to save an invalid ${what}: ${parsed.issues[0] ?? ''}`,
    );
  }

  // -------------------------------------------------------------------------------------------------------------------
  // Players
  // -------------------------------------------------------------------------------------------------------------------

  async listProfiles(): Promise<Profile[]> {
    const profiles = this.keep(await this.driver.list('profiles'), parseProfile);
    return profiles.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  }

  async getProfile(id: string): Promise<Profile | null> {
    const record = await this.driver.get('profiles', id);
    if (record === undefined) return null;
    const parsed = parseProfile(record);
    if (!parsed.ok) {
      this.skipped += 1;
      return null;
    }
    return parsed.value;
  }

  async createProfile(input: ProfileInput): Promise<Profile> {
    const existing = await this.listProfiles();
    if (existing.length >= MAX_PROFILES) {
      throw new StorageError('limit', `This device already has ${MAX_PROFILES} players.`);
    }
    const at = this.now();
    const profile = Repository.checked(
      parseProfile({
        schemaVersion: RECORD_SCHEMA_VERSION,
        id: this.newId(),
        name: input.name,
        avatar: input.avatar,
        createdAt: at,
        updatedAt: at,
        settings: { sessionMinutes: null },
      }),
      'player',
    );
    const ops: WriteOp[] = [{ op: 'add', store: 'profiles', key: profile.id, value: profile }];
    // The first player on a device becomes the one who is playing.
    if (existing.length === 0) {
      ops.push({ op: 'put', store: 'meta', key: ACTIVE_PROFILE_KEY, value: profile.id });
    }
    await this.driver.write(ops);
    return profile;
  }

  async updateProfile(id: string, patch: ProfilePatch): Promise<Profile> {
    const current = await this.getProfile(id);
    if (!current) throw new StorageError('not-found', 'That player does not exist.');
    const next = Repository.checked(
      parseProfile({
        ...current,
        ...(patch.name === undefined ? {} : { name: patch.name }),
        ...(patch.avatar === undefined ? {} : { avatar: patch.avatar }),
        ...(patch.settings === undefined ? {} : { settings: patch.settings }),
        updatedAt: Math.max(this.now(), current.updatedAt),
      }),
      'player',
    );
    await this.driver.write([{ op: 'put', store: 'profiles', key: id, value: next }]);
    return next;
  }

  /** Remove a player and everything recorded about them, together. */
  async deleteProfile(id: string): Promise<void> {
    const [sessions, attempts, active, profiles] = await Promise.all([
      this.driver.list('sessions', { profileId: id }),
      this.driver.list('attempts', { profileId: id }),
      this.getActiveProfileId(),
      this.listProfiles(),
    ]);
    const keyOf = (record: unknown): string | null => {
      const key = (record as { id?: unknown } | null)?.id;
      return typeof key === 'string' ? key : null;
    };
    const ops: WriteOp[] = [{ op: 'delete', store: 'profiles', key: id }];
    for (const record of sessions) {
      const key = keyOf(record);
      if (key !== null) ops.push({ op: 'delete', store: 'sessions', key });
    }
    for (const record of attempts) {
      const key = keyOf(record);
      if (key !== null) ops.push({ op: 'delete', store: 'attempts', key });
    }
    if (active === id) {
      const next = profiles.find((profile) => profile.id !== id);
      ops.push({ op: 'put', store: 'meta', key: ACTIVE_PROFILE_KEY, value: next?.id ?? null });
    }
    await this.driver.write(ops);
  }

  async getActiveProfileId(): Promise<string | null> {
    const value = await this.driver.get('meta', ACTIVE_PROFILE_KEY);
    return typeof value === 'string' ? value : null;
  }

  /** The player who is playing, if they still exist. */
  async getActiveProfile(): Promise<Profile | null> {
    const id = await this.getActiveProfileId();
    return id === null ? null : this.getProfile(id);
  }

  async setActiveProfileId(id: string | null): Promise<void> {
    if (id !== null && !(await this.getProfile(id))) {
      throw new StorageError('not-found', 'That player does not exist.');
    }
    await this.driver.write([{ op: 'put', store: 'meta', key: ACTIVE_PROFILE_KEY, value: id }]);
  }

  // -------------------------------------------------------------------------------------------------------------------
  // Lesson sittings and the learning record
  // -------------------------------------------------------------------------------------------------------------------

  async listSessions(profileId: string): Promise<LessonSession[]> {
    const sessions = this.keep(
      await this.driver.list('sessions', { profileId }),
      parseLessonSession,
    );
    return sessions.sort((a, b) => a.startedAt - b.startedAt || a.id.localeCompare(b.id));
  }

  /** The sitting of this lesson that the player left unfinished, most recent first, or `null`. */
  async findActiveSession(profileId: string, lessonId: string): Promise<LessonSession | null> {
    const sessions = await this.listSessions(profileId);
    return (
      sessions
        .filter((session) => session.lessonId === lessonId && session.status === 'active')
        .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
    );
  }

  /**
   * Save a sitting, and with it the attempt that moved it on. The attempt is insert-only: if it is already there
   * (another tab answered first), nothing is written and a `conflict` is thrown so the caller can reload.
   */
  async saveProgress(session: LessonSession, attempt?: Attempt): Promise<void> {
    const ops: WriteOp[] = [
      {
        op: 'put',
        store: 'sessions',
        key: session.id,
        value: Repository.checked(parseLessonSession(session), 'lesson session'),
      },
    ];
    if (attempt) {
      if (attempt.sessionId !== session.id || attempt.profileId !== session.profileId) {
        throw new StorageError('invalid-record', 'The attempt does not belong to that session.');
      }
      ops.push({
        op: 'add',
        store: 'attempts',
        key: attempt.id,
        value: Repository.checked(parseAttempt(attempt), 'attempt'),
      });
    }
    await this.driver.write(ops);
  }

  /** Forget an unfinished sitting. What was already answered in it stays in the learning record. */
  async discardSession(sessionId: string): Promise<void> {
    await this.driver.write([{ op: 'delete', store: 'sessions', key: sessionId }]);
  }

  async listAttempts(profileId: string): Promise<Attempt[]> {
    const attempts = this.keep(await this.driver.list('attempts', { profileId }), parseAttempt);
    return attempts.sort(
      (a, b) => a.at - b.at || a.sessionId.localeCompare(b.sessionId) || a.seq - b.seq,
    );
  }

  // -------------------------------------------------------------------------------------------------------------------
  // The grown-up's controls: save a copy, load a copy, start over
  // -------------------------------------------------------------------------------------------------------------------

  async exportProfile(profileId: string): Promise<ExportBundle> {
    const profile = await this.getProfile(profileId);
    if (!profile) throw new StorageError('not-found', 'That player does not exist.');
    const [sessions, attempts] = await Promise.all([
      this.listSessions(profileId),
      this.listAttempts(profileId),
    ]);
    return buildBundle({
      profile,
      sessions,
      attempts,
      exportedAt: this.now(),
      appVersion: this.appVersion,
      dataVersion: DATA_VERSION,
    });
  }

  /**
   * Load an exported file. A player who is not on this device is added; one who is, is merged: attempts are unioned
   * by id (they never change once written), and the more recently updated copy of the player and of each sitting
   * wins. Loading the same file twice changes nothing the second time.
   */
  async importBundle(input: unknown): Promise<ImportResult> {
    const read = readBundle(input);
    if (!read.ok) return read;
    const { bundle } = read;
    const { profile } = bundle;

    const [existing, profiles, localSessions, localAttempts] = await Promise.all([
      this.getProfile(profile.id),
      this.listProfiles(),
      this.listSessions(profile.id),
      this.listAttempts(profile.id),
    ]);
    if (!existing && profiles.length >= MAX_PROFILES) {
      return {
        ok: false,
        problem: 'too-many-profiles',
        detail: `This device already has ${MAX_PROFILES} players.`,
      };
    }

    const ops: WriteOp[] = [];
    const winner = existing && existing.updatedAt >= profile.updatedAt ? existing : profile;
    if (winner !== existing) {
      ops.push({ op: 'put', store: 'profiles', key: profile.id, value: winner });
    }

    const sessionsById = new Map(localSessions.map((session) => [session.id, session]));
    let sessionsAdded = 0;
    for (const session of bundle.sessions) {
      const local = sessionsById.get(session.id);
      if (!local) sessionsAdded += 1;
      if (!local || session.updatedAt > local.updatedAt) {
        ops.push({ op: 'put', store: 'sessions', key: session.id, value: session });
      }
    }

    const attemptIds = new Set(localAttempts.map((attempt) => attempt.id));
    let attemptsAdded = 0;
    for (const attempt of bundle.attempts) {
      if (attemptIds.has(attempt.id)) continue;
      attemptsAdded += 1;
      // A file saved by a game from before data version 2 has games of pairs with no mark on them: they are
      // given it on the way in, as the ones stored here were when this game first opened them.
      const value = withThePairsMark(attempt) ?? attempt;
      ops.push({ op: 'add', store: 'attempts', key: attempt.id, value });
    }

    if (profiles.length === 0) {
      ops.push({ op: 'put', store: 'meta', key: ACTIVE_PROFILE_KEY, value: profile.id });
    }
    await this.driver.write(ops);
    return {
      ok: true,
      profile: winner,
      created: !existing,
      added: { sessions: sessionsAdded, attempts: attemptsAdded },
    };
  }

  /** Erase every player and every record on this device. */
  async resetAll(): Promise<void> {
    await this.driver.clear();
    await this.driver.write([
      { op: 'put', store: 'meta', key: 'schema', value: { dataVersion: DATA_VERSION } },
    ]);
  }

  close(): void {
    this.driver.close();
  }
}
