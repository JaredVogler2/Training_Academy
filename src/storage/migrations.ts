import type { StorageDriver, WriteOp } from './driver';

/**
 * Version of the *data* in the stores (the record shapes in src/engine/schema.ts). The object stores themselves are
 * versioned separately by IndexedDB (IDB_STRUCTURE_VERSION).
 *
 * To change a stored shape: bump RECORD_SCHEMA_VERSION and DATA_VERSION, add a migration here that rewrites old
 * records, and add a fixture of the old data to tests/storage/migrations.test.ts. Never edit a shipped migration.
 */
export const DATA_VERSION = 2;

const SCHEMA_KEY = 'schema';

export interface Migration {
  /** The data version this migration produces; it upgrades from `to - 1`. */
  to: number;
  describe: string;
  /**
   * Read what is there and return the writes that upgrade it. The writes are applied together with the version bump
   * in one batch, so an interrupted upgrade is either not started or finished — never half done.
   */
  plan(read: Pick<StorageDriver, 'get' | 'list'>): Promise<WriteOp[]>;
}

/**
 * How many turns each board of "Find the pairs" allows before finding every pair no longer shows remembering:
 * the `par` of each board of `mf-pairs-01` as it stood, at version 1, while the game was writing such answers
 * down with no mark on them.
 *
 * Until data version 2 a game of pairs that took more turns than that was written into the record exactly as one
 * that took few: right, at the first try, with no help. The sitting did not count it as done alone, and the
 * record did. An answer written since carries `clean: false`; these are for the answers written before.
 * (tests/storage/pairsMark.test.ts holds the numbers to the lesson.)
 */
export const PAIRS_PAR: Readonly<Record<string, number>> = {
  'mf-pairs-01.guided-face-up': 3,
  'mf-pairs-01.guided-two': 4,
  'mf-pairs-01.animals': 6,
  'mf-pairs-01.clothes': 6,
  'mf-pairs-01.sounds': 6,
  'mf-pairs-01.sky-and-leaf': 8,
  'mf-pairs-01.food': 8,
  'mf-pairs-01.small-animals': 8,
};

/**
 * A stored answer with the mark it should have had: a game of pairs, right, in more turns than its board allows.
 * `null` for every other record, and for one that has the mark already: nothing is to be changed.
 */
export function withThePairsMark<T>(record: T): (T & { clean: false }) | null {
  if (typeof record !== 'object' || record === null) return null;
  const { challengeId, lessonVersion, outcome, response, clean } = record as {
    challengeId?: unknown;
    lessonVersion?: unknown;
    outcome?: unknown;
    response?: unknown;
    clean?: unknown;
  };
  if (typeof challengeId !== 'string' || !Object.hasOwn(PAIRS_PAR, challengeId)) return null;
  // A later version of the lesson is written down by a game that marks its own answers.
  if (lessonVersion !== 1 || outcome !== 'correct' || clean === false) return null;
  const par = PAIRS_PAR[challengeId];
  if (typeof response !== 'string' || !/^[1-9][0-9]?$/.test(response) || par === undefined) {
    return null;
  }
  return Number(response) > par ? { ...record, clean: false } : null;
}

const markPairs: Migration = {
  to: 2,
  describe:
    'answers: a game of pairs that took more turns than remembering needs is marked as such',
  async plan(read) {
    const ops: WriteOp[] = [];
    for (const record of await read.list('attempts')) {
      const marked = withThePairsMark(record);
      const { id } = (marked ?? {}) as { id?: unknown };
      if (marked && typeof id === 'string') {
        ops.push({ op: 'put', store: 'attempts', key: id, value: marked });
      }
    }
    return ops;
  },
};

/** Shipped migrations, in order. */
export const MIGRATIONS: readonly Migration[] = [markPairs];

export type MigrationOutcome =
  | { status: 'ready'; from: number; to: number; applied: string[] }
  /** The data was written by a newer game. It is left exactly as found. */
  | { status: 'newer-data'; found: number };

function storedVersion(record: unknown): number | null {
  if (typeof record !== 'object' || record === null) return null;
  const { dataVersion } = record as { dataVersion?: unknown };
  return typeof dataVersion === 'number' && Number.isInteger(dataVersion) && dataVersion >= 1
    ? dataVersion
    : null;
}

const versionRecord = (dataVersion: number): WriteOp => ({
  op: 'put',
  store: 'meta',
  key: SCHEMA_KEY,
  value: { dataVersion },
});

export async function migrate(
  driver: StorageDriver,
  target: number = DATA_VERSION,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<MigrationOutcome> {
  let found = storedVersion(await driver.get('meta', SCHEMA_KEY));
  if (found === null) {
    // No marker. An empty database is simply new; one with players in it predates the marker, i.e. version 1.
    const hasData = (await driver.list('profiles')).length > 0;
    if (!hasData) {
      await driver.write([versionRecord(target)]);
      return { status: 'ready', from: target, to: target, applied: [] };
    }
    found = 1;
  }
  if (found > target) return { status: 'newer-data', found };

  const from = found;
  const applied: string[] = [];
  for (let version = found + 1; version <= target; version++) {
    const migration = migrations.find((candidate) => candidate.to === version);
    if (!migration) throw new Error(`No migration produces data version ${version}.`);
    const ops = await migration.plan(driver);
    await driver.write([...ops, versionRecord(version)]);
    applied.push(migration.describe);
  }
  if (applied.length === 0 && storedVersion(await driver.get('meta', SCHEMA_KEY)) === null) {
    await driver.write([versionRecord(target)]);
  }
  return { status: 'ready', from, to: target, applied };
}
