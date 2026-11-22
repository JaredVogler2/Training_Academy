import type { StorageDriver, WriteOp } from './driver';

/**
 * Version of the *data* in the stores (the record shapes in src/engine/schema.ts). The object stores themselves are
 * versioned separately by IndexedDB (IDB_STRUCTURE_VERSION).
 *
 * To change a stored shape: bump RECORD_SCHEMA_VERSION and DATA_VERSION, add a migration here that rewrites old
 * records, and add a fixture of the old data to tests/storage/migrations.test.ts. Never edit a shipped migration.
 */
export const DATA_VERSION = 1;

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

/** Shipped migrations, in order. Empty: version 1 is the first. */
export const MIGRATIONS: readonly Migration[] = [];

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
