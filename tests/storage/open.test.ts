import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import {
  IndexedDbDriver,
  LOCAL_STORAGE_KEY,
  browserStorage,
  checksumOf,
  openDriver,
  openRepository,
  stableStringify,
} from '@/storage';
import { FakeStorage } from '../helpers/storage';

const refusingFactory = {
  open: () => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  },
} as unknown as IDBFactory;

const deps = { now: () => 1_800_000_000_000, newId: () => 'fixed-id' };

describe('choosing where to save', () => {
  it('prefers IndexedDB', async () => {
    const { driver, notes } = await openDriver({
      indexedDB: new IDBFactory(),
      localStorage: new FakeStorage(),
    });
    expect(driver.kind).toBe('indexeddb');
    expect(driver.persistent).toBe(true);
    expect(notes).toEqual([]);
  });

  it('falls back to localStorage when IndexedDB is refused', async () => {
    const { driver, notes } = await openDriver({
      indexedDB: refusingFactory,
      localStorage: new FakeStorage(),
    });
    expect(driver.kind).toBe('localstorage');
    expect(notes).toEqual(['indexeddb-unavailable']);
  });

  it('falls back to localStorage when IndexedDB never answers', async () => {
    const silent = { open: () => ({}) } as unknown as IDBFactory;
    const { driver, notes } = await openDriver(
      { indexedDB: silent, localStorage: new FakeStorage() },
      { timeoutMs: 20 },
    );
    expect(driver.kind).toBe('localstorage');
    expect(notes).toEqual(['indexeddb-unavailable']);
  });

  it('falls back to memory when nothing persistent is allowed, and says so', async () => {
    const blocked = new FakeStorage();
    blocked.broken = true;
    const { driver, notes } = await openDriver({ indexedDB: null, localStorage: blocked });
    expect(driver.kind).toBe('memory');
    expect(driver.persistent).toBe(false);
    expect(notes).toEqual(['indexeddb-unavailable', 'localstorage-unavailable']);

    const none = await openDriver({ indexedDB: null, localStorage: null });
    expect(none.driver.kind).toBe('memory');
  });

  it('treats a localStorage with no room at all as unavailable', async () => {
    const full = new FakeStorage();
    full.quota = 0;
    const { driver } = await openDriver({ indexedDB: null, localStorage: full });
    expect(driver.kind).toBe('memory');
  });

  it('notes when unreadable saved data had to be set aside', async () => {
    const storage = new FakeStorage();
    storage.setItem(LOCAL_STORAGE_KEY, 'definitely not json');
    const { driver, notes } = await openDriver({ indexedDB: null, localStorage: storage });
    expect(driver.kind).toBe('localstorage');
    expect(notes).toEqual(['indexeddb-unavailable', 'local-data-was-unreadable']);
  });

  it('reads the browser’s storage objects without letting a privacy error escape', () => {
    const hostile = {
      get indexedDB(): IDBFactory {
        throw new DOMException('denied', 'SecurityError');
      },
      get localStorage(): Storage {
        throw new DOMException('denied', 'SecurityError');
      },
    };
    expect(browserStorage(hostile)).toEqual({ indexedDB: null, localStorage: null });
    expect(browserStorage({})).toEqual({ indexedDB: null, localStorage: null });
    const storage = new FakeStorage();
    expect(browserStorage({ localStorage: storage }).localStorage).toBe(storage);
  });
});

describe('opening the repository', () => {
  it('opens a working, versioned repository on a new device', async () => {
    const repo = await openRepository({
      env: { indexedDB: new IDBFactory(), localStorage: new FakeStorage() },
      ...deps,
    });
    expect(repo.backend).toEqual({ kind: 'indexeddb', persistent: true, notes: [] });
    const profile = await repo.createProfile({ name: 'Ada', avatar: 'sun' });
    expect(profile.id).toBe('fixed-id');
  });

  it('still opens, in memory, on a device that allows no storage', async () => {
    const repo = await openRepository({ env: { indexedDB: null, localStorage: null }, ...deps });
    expect(repo.backend).toEqual({
      kind: 'memory',
      persistent: false,
      notes: ['indexeddb-unavailable', 'localstorage-unavailable'],
    });
    await repo.createProfile({ name: 'Ada', avatar: 'sun' });
    expect(await repo.listProfiles()).toHaveLength(1);
  });

  it('never overwrites data written by a newer version of the game', async () => {
    const factory = new IDBFactory();
    const newer = await IndexedDbDriver.open(factory);
    await newer.write([
      { op: 'put', store: 'meta', key: 'schema', value: { dataVersion: 42 } },
      { op: 'put', store: 'profiles', key: 'future', value: { id: 'future', shape: 'unknown' } },
    ]);
    newer.close();

    const repo = await openRepository({ env: { indexedDB: factory, localStorage: null }, ...deps });
    expect(repo.backend).toMatchObject({
      kind: 'memory',
      persistent: false,
      notes: ['newer-data'],
    });
    await repo.createProfile({ name: 'Ada', avatar: 'sun' });
    await repo.resetAll();

    const check = await IndexedDbDriver.open(factory);
    expect(await check.get('meta', 'schema')).toEqual({ dataVersion: 42 });
    expect(await check.get('profiles', 'future')).toEqual({ id: 'future', shape: 'unknown' });
  });
});

describe('checksums', () => {
  it('do not depend on key order', () => {
    expect(stableStringify({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: null } })).toBe(
      '{"a":{"c":null,"d":[3,{"y":2,"z":1}]},"b":1}',
    );
    expect(checksumOf({ a: 1, b: 2 })).toBe(checksumOf({ b: 2, a: 1 }));
  });

  it('change when the data changes', () => {
    expect(checksumOf({ a: 1 })).not.toBe(checksumOf({ a: 2 }));
    expect(checksumOf([1, 2])).not.toBe(checksumOf([2, 1]));
    expect(checksumOf({ a: 1 })).toMatch(/^cyrb53:[0-9a-f]{14}$/);
  });

  it('ignore undefined properties, as JSON does', () => {
    expect(checksumOf({ a: 1, b: undefined })).toBe(checksumOf({ a: 1 }));
  });
});
