import * as v from 'valibot';
import {
  AttemptSchema,
  LessonSessionSchema,
  ProfileSchema,
  parseWith,
  type Attempt,
  type LessonSession,
  type Profile,
} from '@/engine/schema';
import { checksumOf } from './checksum';

/**
 * The file a grown-up can save and load: one player, with everything recorded about them. Readable JSON, versioned,
 * and checked on the way back in for type, size, shape, integrity and ownership before anything is written.
 */

export const EXPORT_FORMAT = 'training-academy.profile-export';
export const EXPORT_FORMAT_VERSION = 1;
/** Far above anything a real player produces; a guard against being handed the wrong file. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const ExportBundleSchema = v.object({
  format: v.literal(EXPORT_FORMAT),
  formatVersion: v.literal(EXPORT_FORMAT_VERSION),
  exportedAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
  app: v.object({
    version: v.string(),
    dataVersion: v.pipe(v.number(), v.integer(), v.minValue(1)),
  }),
  profile: ProfileSchema,
  sessions: v.array(LessonSessionSchema),
  attempts: v.array(AttemptSchema),
  checksum: v.string(),
});
export type ExportBundle = v.InferOutput<typeof ExportBundleSchema>;
export type CheckBackupContent = (bundle: ExportBundle) => Promise<string | null>;

export type ImportProblem =
  | 'not-json'
  | 'too-large'
  | 'wrong-format'
  | 'unsupported-version'
  | 'invalid-shape'
  | 'checksum-mismatch'
  | 'foreign-records'
  | 'duplicate-records'
  | 'unknown-content';

export type ReadBundleResult =
  { ok: true; bundle: ExportBundle } | { ok: false; problem: ImportProblem; detail: string };

const byId = <T extends { id: string }>(a: T, b: T): number => a.id.localeCompare(b.id);

function payloadOf(profile: Profile, sessions: LessonSession[], attempts: Attempt[]) {
  return { profile, sessions, attempts };
}

export function buildBundle(input: {
  profile: Profile;
  sessions: readonly LessonSession[];
  attempts: readonly Attempt[];
  exportedAt: number;
  appVersion: string;
  dataVersion: number;
}): ExportBundle {
  const sessions = [...input.sessions].sort(byId);
  const attempts = [...input.attempts].sort(byId);
  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: input.exportedAt,
    app: { version: input.appVersion, dataVersion: input.dataVersion },
    profile: input.profile,
    sessions,
    attempts,
    checksum: checksumOf(payloadOf(input.profile, sessions, attempts)),
  };
}

/** Check a file's text (or already-parsed JSON) and return the bundle, or the first reason it cannot be used. */
export function readBundle(input: unknown): ReadBundleResult {
  const fail = (problem: ImportProblem, detail: string): ReadBundleResult => ({
    ok: false,
    problem,
    detail,
  });

  let data = input;
  if (typeof input === 'string') {
    if (input.length > MAX_IMPORT_BYTES) return fail('too-large', 'The file is too large.');
    try {
      data = JSON.parse(input) as unknown;
    } catch {
      return fail('not-json', 'The file is not JSON.');
    }
  }
  if (typeof data !== 'object' || data === null) {
    return fail('wrong-format', 'The file is not a Training Academy export.');
  }
  const { format, formatVersion } = data as { format?: unknown; formatVersion?: unknown };
  if (format !== EXPORT_FORMAT) {
    return fail('wrong-format', 'The file is not a Training Academy export.');
  }
  if (formatVersion !== EXPORT_FORMAT_VERSION) {
    return fail(
      'unsupported-version',
      `This game reads export version ${EXPORT_FORMAT_VERSION}; the file is version ${String(formatVersion)}.`,
    );
  }

  const parsed = parseWith(ExportBundleSchema, data);
  if (!parsed.ok) return fail('invalid-shape', parsed.issues.slice(0, 3).join('; '));
  const bundle = parsed.value;

  const expected = checksumOf(payloadOf(bundle.profile, bundle.sessions, bundle.attempts));
  if (bundle.checksum !== expected) {
    return fail('checksum-mismatch', 'The file has been changed or damaged since it was saved.');
  }
  const foreign =
    bundle.sessions.some((session) => session.profileId !== bundle.profile.id) ||
    bundle.attempts.some((attempt) => attempt.profileId !== bundle.profile.id);
  if (foreign) {
    return fail('foreign-records', 'The file holds records that belong to a different player.');
  }
  if (
    new Set(bundle.sessions.map(({ id }) => id)).size !== bundle.sessions.length ||
    new Set(bundle.attempts.map(({ id }) => id)).size !== bundle.attempts.length
  ) {
    return fail('duplicate-records', 'The file contains duplicate records.');
  }
  return { ok: true, bundle };
}
