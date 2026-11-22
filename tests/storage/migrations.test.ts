import { beforeEach, describe, expect, it } from 'vitest';
import {
  DATA_VERSION,
  MIGRATIONS,
  MemoryDriver,
  migrate,
  type Migration,
  type StorageDriver,
  type WriteOp,
} from '@/storage';
import { BACKEND_NAMES, freshBackend } from '../helpers/storage';

/** Two made-up upgrades, standing in for the ones later versions will need. */
const renameNickname: Migration = {
  to: 2,
  describe: 'profiles: nickname → name',
  async plan(read) {
    const profiles = (await read.list('profiles')) as { id: string; nickname?: string }[];
    return profiles.map(({ nickname, ...rest }): WriteOp => ({
      op: 'put',
      store: 'profiles',
      key: rest.id,
      value: { ...rest, name: nickname ?? 'Explorer' },
    }));
  },
};

const addSettings: Migration = {
  to: 3,
  describe: 'profiles: add settings',
  async plan(read) {
    const profiles = (await read.list('profiles')) as { id: string }[];
    return profiles.map((profile): WriteOp => ({
      op: 'put',
      store: 'profiles',
      key: profile.id,
      value: { ...profile, settings: { sessionMinutes: null } },
    }));
  },
};

const version = async (driver: StorageDriver) =>
  ((await driver.get('meta', 'schema')) as { dataVersion: number } | undefined)?.dataVersion;

describe.each(BACKEND_NAMES)('data migrations on %s', (name) => {
  let driver: StorageDriver;

  beforeEach(async () => {
    driver = await freshBackend(name).open();
  });

  it('stamps a brand-new database with the current version', async () => {
    expect(await migrate(driver)).toEqual({
      status: 'ready',
      from: DATA_VERSION,
      to: DATA_VERSION,
      applied: [],
    });
    expect(await version(driver)).toBe(DATA_VERSION);
  });

  it('is a no-op when the data is already current', async () => {
    await migrate(driver);
    await driver.write([{ op: 'put', store: 'profiles', key: 'p', value: { id: 'p' } }]);
    expect(await migrate(driver)).toMatchObject({ status: 'ready', applied: [] });
    expect(await driver.get('profiles', 'p')).toEqual({ id: 'p' });
  });

  it('upgrades old data step by step, in order', async () => {
    await driver.write([
      { op: 'put', store: 'meta', key: 'schema', value: { dataVersion: 1 } },
      { op: 'put', store: 'profiles', key: 'p1', value: { id: 'p1', nickname: 'Ada' } },
      { op: 'put', store: 'profiles', key: 'p2', value: { id: 'p2' } },
    ]);
    const outcome = await migrate(driver, 3, [addSettings, renameNickname]);
    expect(outcome).toEqual({
      status: 'ready',
      from: 1,
      to: 3,
      applied: ['profiles: nickname → name', 'profiles: add settings'],
    });
    expect(await driver.get('profiles', 'p1')).toEqual({
      id: 'p1',
      name: 'Ada',
      settings: { sessionMinutes: null },
    });
    expect(await driver.get('profiles', 'p2')).toEqual({
      id: 'p2',
      name: 'Explorer',
      settings: { sessionMinutes: null },
    });
    expect(await version(driver)).toBe(3);
  });

  it('treats data with no version marker as version 1', async () => {
    await driver.write([
      { op: 'put', store: 'profiles', key: 'p1', value: { id: 'p1', nickname: 'Ada' } },
    ]);
    const outcome = await migrate(driver, 2, [renameNickname]);
    expect(outcome).toMatchObject({ status: 'ready', from: 1, to: 2 });
    expect(await driver.get('profiles', 'p1')).toEqual({ id: 'p1', name: 'Ada' });
  });

  it('an interrupted upgrade is never half done, and finishes on the next start', async () => {
    await driver.write([
      { op: 'put', store: 'meta', key: 'schema', value: { dataVersion: 1 } },
      { op: 'put', store: 'profiles', key: 'p1', value: { id: 'p1', nickname: 'Ada' } },
    ]);
    const failing: Migration = {
      ...addSettings,
      async plan(read) {
        const ops = await addSettings.plan(read);
        // The device fails in the middle of this step's batch: an insert that cannot succeed.
        return [...ops, { op: 'add', store: 'profiles', key: 'p1', value: {} }];
      },
    };
    await expect(migrate(driver, 3, [renameNickname, failing])).rejects.toMatchObject({
      code: 'conflict',
    });
    // Step one is complete and recorded; step two left no trace.
    expect(await version(driver)).toBe(2);
    expect(await driver.get('profiles', 'p1')).toEqual({ id: 'p1', name: 'Ada' });

    expect(await migrate(driver, 3, [renameNickname, addSettings])).toMatchObject({
      from: 2,
      to: 3,
      applied: ['profiles: add settings'],
    });
    expect(await driver.get('profiles', 'p1')).toEqual({
      id: 'p1',
      name: 'Ada',
      settings: { sessionMinutes: null },
    });
  });

  it('leaves data from a newer game exactly as it found it', async () => {
    await driver.write([
      { op: 'put', store: 'meta', key: 'schema', value: { dataVersion: 99 } },
      { op: 'put', store: 'profiles', key: 'p1', value: { id: 'p1', future: true } },
    ]);
    expect(await migrate(driver)).toEqual({ status: 'newer-data', found: 99 });
    expect(await version(driver)).toBe(99);
    expect(await driver.get('profiles', 'p1')).toEqual({ id: 'p1', future: true });
  });

  it('refuses to guess when a step is missing', async () => {
    await driver.write([{ op: 'put', store: 'meta', key: 'schema', value: { dataVersion: 1 } }]);
    await expect(migrate(driver, 3, [addSettings])).rejects.toThrow(
      /No migration produces data version 2/,
    );
    expect(await version(driver)).toBe(1);
  });
});

describe('shipped migrations', () => {
  it('form an unbroken chain from version 1 to the current version', () => {
    expect(MIGRATIONS.map((migration) => migration.to)).toEqual(
      Array.from({ length: DATA_VERSION - 1 }, (_, index) => index + 2),
    );
  });

  it('a damaged version marker is treated as missing', async () => {
    const driver = new MemoryDriver();
    await driver.write([
      { op: 'put', store: 'meta', key: 'schema', value: { dataVersion: 'two' } },
    ]);
    expect(await migrate(driver)).toMatchObject({ status: 'ready', to: DATA_VERSION });
  });
});
