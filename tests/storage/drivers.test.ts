import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  IndexedDbDriver,
  LOCAL_STORAGE_KEY,
  LocalStorageDriver,
  StorageError,
  type StorageDriver,
} from '@/storage';
import { BACKEND_NAMES, FakeStorage, freshBackend, type Backend } from '../helpers/storage';

const record = (id: string, profileId: string, extra: object = {}) => ({ id, profileId, ...extra });

describe.each(BACKEND_NAMES)('%s driver', (name) => {
  let backend: Backend;
  let driver: StorageDriver;

  beforeEach(async () => {
    backend = freshBackend(name);
    driver = await backend.open();
  });

  it('returns undefined for a key that was never written', async () => {
    expect(await driver.get('profiles', 'nobody')).toBeUndefined();
    expect(await driver.list('attempts')).toEqual([]);
  });

  it('stores and returns JSON values', async () => {
    const value = { id: 'p1', nested: { list: [1, 2, 3], flag: true, nothing: null } };
    await driver.write([{ op: 'put', store: 'profiles', key: 'p1', value }]);
    expect(await driver.get('profiles', 'p1')).toEqual(value);
  });

  it('keeps its own copy: changing the object afterwards does not change what is stored', async () => {
    const value = { id: 'p1', name: 'Ada' };
    await driver.write([{ op: 'put', store: 'profiles', key: 'p1', value }]);
    value.name = 'changed';
    expect(await driver.get('profiles', 'p1')).toEqual({ id: 'p1', name: 'Ada' });
    const read = (await driver.get('profiles', 'p1')) as { name: string };
    read.name = 'changed again';
    expect(await driver.get('profiles', 'p1')).toEqual({ id: 'p1', name: 'Ada' });
  });

  it('lists a whole store, or only one player’s records', async () => {
    await driver.write([
      { op: 'put', store: 'attempts', key: 'a1', value: record('a1', 'p1') },
      { op: 'put', store: 'attempts', key: 'a2', value: record('a2', 'p2') },
      { op: 'put', store: 'attempts', key: 'a3', value: record('a3', 'p1') },
      { op: 'put', store: 'sessions', key: 's1', value: record('s1', 'p2') },
    ]);
    const ids = (values: unknown[]) => values.map((value) => (value as { id: string }).id).sort();
    expect(ids(await driver.list('attempts'))).toEqual(['a1', 'a2', 'a3']);
    expect(ids(await driver.list('attempts', { profileId: 'p1' }))).toEqual(['a1', 'a3']);
    expect(ids(await driver.list('sessions', { profileId: 'p1' }))).toEqual([]);
    expect(ids(await driver.list('sessions', { profileId: 'p2' }))).toEqual(['s1']);
  });

  it('replaces with put and removes with delete', async () => {
    await driver.write([{ op: 'put', store: 'meta', key: 'k', value: 1 }]);
    await driver.write([{ op: 'put', store: 'meta', key: 'k', value: 2 }]);
    expect(await driver.get('meta', 'k')).toBe(2);
    await driver.write([{ op: 'delete', store: 'meta', key: 'k' }]);
    expect(await driver.get('meta', 'k')).toBeUndefined();
    await driver.write([{ op: 'delete', store: 'meta', key: 'never-there' }]);
  });

  it('add refuses to overwrite and reports a conflict', async () => {
    await driver.write([{ op: 'add', store: 'attempts', key: 'a1', value: record('a1', 'p1') }]);
    const again = driver.write([
      { op: 'add', store: 'attempts', key: 'a1', value: record('a1', 'p1', { changed: true }) },
    ]);
    await expect(again).rejects.toMatchObject({ name: 'StorageError', code: 'conflict' });
    expect(await driver.get('attempts', 'a1')).toEqual(record('a1', 'p1'));
  });

  it('applies a batch completely or not at all', async () => {
    await driver.write([
      { op: 'put', store: 'sessions', key: 's1', value: record('s1', 'p1', { step: 1 }) },
    ]);
    await driver.write([{ op: 'add', store: 'attempts', key: 'a1', value: record('a1', 'p1') }]);

    const batch = driver.write([
      { op: 'put', store: 'sessions', key: 's1', value: record('s1', 'p1', { step: 2 }) },
      { op: 'put', store: 'profiles', key: 'p9', value: { id: 'p9' } },
      { op: 'delete', store: 'meta', key: 'schema' },
      { op: 'add', store: 'attempts', key: 'a1', value: record('a1', 'p1', { duplicate: true }) },
    ]);
    await expect(batch).rejects.toBeInstanceOf(StorageError);

    expect(await driver.get('sessions', 's1')).toEqual(record('s1', 'p1', { step: 1 }));
    expect(await driver.get('profiles', 'p9')).toBeUndefined();
    expect(await driver.get('attempts', 'a1')).toEqual(record('a1', 'p1'));
  });

  it('writes across stores in one batch', async () => {
    await driver.write([
      { op: 'put', store: 'sessions', key: 's1', value: record('s1', 'p1') },
      { op: 'add', store: 'attempts', key: 'a1', value: record('a1', 'p1') },
      { op: 'put', store: 'meta', key: 'activeProfileId', value: 'p1' },
    ]);
    expect(await driver.get('sessions', 's1')).toBeDefined();
    expect(await driver.get('attempts', 'a1')).toBeDefined();
    expect(await driver.get('meta', 'activeProfileId')).toBe('p1');
  });

  it('accepts an empty batch', async () => {
    await expect(driver.write([])).resolves.toBeUndefined();
  });

  it('clear removes everything', async () => {
    await driver.write([
      { op: 'put', store: 'profiles', key: 'p1', value: { id: 'p1' } },
      { op: 'put', store: 'attempts', key: 'a1', value: record('a1', 'p1') },
      { op: 'put', store: 'meta', key: 'schema', value: { dataVersion: 1 } },
    ]);
    await driver.clear();
    expect(await driver.list('profiles')).toEqual([]);
    expect(await driver.list('attempts')).toEqual([]);
    expect(await driver.get('meta', 'schema')).toBeUndefined();
  });

  it('survives a reload exactly when it says it is persistent', async () => {
    await driver.write([{ op: 'put', store: 'profiles', key: 'p1', value: { id: 'p1' } }]);
    driver.close();
    const reopened = await backend.open();
    expect(reopened.persistent).toBe(backend.persistent);
    expect(await reopened.get('profiles', 'p1')).toEqual({ id: 'p1' });
  });
});

describe('localStorage driver specifics', () => {
  it('leaves other keys alone and removes only its own on clear', async () => {
    const storage = new FakeStorage();
    storage.setItem('someone-else', 'keep me');
    const driver = new LocalStorageDriver(storage);
    await driver.write([{ op: 'put', store: 'meta', key: 'k', value: 1 }]);
    expect(storage.getItem(LOCAL_STORAGE_KEY)).toContain('training-academy.local-db');
    await driver.clear();
    expect(storage.getItem(LOCAL_STORAGE_KEY)).toBeNull();
    expect(storage.getItem('someone-else')).toBe('keep me');
  });

  it('reports a full device as "quota" and keeps what was already saved', async () => {
    const storage = new FakeStorage();
    const driver = new LocalStorageDriver(storage);
    await driver.write([{ op: 'put', store: 'profiles', key: 'p1', value: { id: 'p1' } }]);
    storage.quota = (storage.getItem(LOCAL_STORAGE_KEY)?.length ?? 0) + 10;

    const big = driver.write([
      { op: 'put', store: 'profiles', key: 'p2', value: { id: 'p2', blob: 'x'.repeat(500) } },
    ]);
    await expect(big).rejects.toMatchObject({ code: 'quota' });
    expect(await driver.get('profiles', 'p1')).toEqual({ id: 'p1' });
    expect(await driver.get('profiles', 'p2')).toBeUndefined();
  });

  it('sets unreadable data aside instead of crashing or silently deleting it', async () => {
    const storage = new FakeStorage();
    storage.setItem(LOCAL_STORAGE_KEY, '{"format":"training-academy.local-db","stores":{"profi');
    const driver = new LocalStorageDriver(storage);
    expect(await driver.list('profiles')).toEqual([]);
    expect(driver.recoveredFromCorruption).toBe(true);
    expect(storage.getItem(`${LOCAL_STORAGE_KEY}.corrupt`)).toContain('"profi');

    await driver.write([{ op: 'put', store: 'profiles', key: 'p1', value: { id: 'p1' } }]);
    expect(await driver.get('profiles', 'p1')).toEqual({ id: 'p1' });
  });

  it('does not mistake some other JSON for its database', async () => {
    const storage = new FakeStorage();
    storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ hello: 'world' }));
    const driver = new LocalStorageDriver(storage);
    expect(await driver.list('profiles')).toEqual([]);
    expect(driver.recoveredFromCorruption).toBe(true);
  });

  it('turns a refusing browser into an "unavailable" error, not an unhandled exception', async () => {
    const storage = new FakeStorage();
    const driver = new LocalStorageDriver(storage);
    storage.broken = true;
    await expect(driver.get('meta', 'k')).rejects.toMatchObject({ code: 'unavailable' });
    await expect(
      driver.write([{ op: 'put', store: 'meta', key: 'k', value: 1 }]),
    ).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('two drivers over one storage see each other (two tabs)', async () => {
    const storage = new FakeStorage();
    const first = new LocalStorageDriver(storage);
    const second = new LocalStorageDriver(storage);
    await first.write([{ op: 'put', store: 'meta', key: 'k', value: 'from-first' }]);
    expect(await second.get('meta', 'k')).toBe('from-first');
    await second.write([{ op: 'put', store: 'meta', key: 'j', value: 'from-second' }]);
    expect(await first.get('meta', 'j')).toBe('from-second');
    expect(await first.get('meta', 'k')).toBe('from-first');
  });
});

describe('IndexedDB driver specifics', () => {
  it('reopens when the browser closes the connection underneath the page', async () => {
    const driver = await IndexedDbDriver.open(new IDBFactory());
    await driver.write([{ op: 'put', store: 'meta', key: 'k', value: 1 }]);
    (driver as unknown as { db: IDBDatabase }).db.close();
    expect(await driver.get('meta', 'k')).toBe(1);
    await driver.write([{ op: 'put', store: 'meta', key: 'k', value: 2 }]);
    expect(await driver.get('meta', 'k')).toBe(2);
  });

  it('works again after close()', async () => {
    const driver = await IndexedDbDriver.open(new IDBFactory());
    await driver.write([{ op: 'put', store: 'meta', key: 'k', value: 1 }]);
    driver.close();
    expect(await driver.get('meta', 'k')).toBe(1);
  });

  it('gives up on a browser that never answers', async () => {
    const silent = { open: () => ({}) } as unknown as IDBFactory;
    await expect(IndexedDbDriver.open(silent, { timeoutMs: 20 })).rejects.toMatchObject({
      code: 'unavailable',
    });
  });

  it('reports a browser that refuses outright', async () => {
    const refusing = {
      open: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    } as unknown as IDBFactory;
    await expect(IndexedDbDriver.open(refusing)).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('keeps separate databases separate', async () => {
    const factory = new IDBFactory();
    const one = await IndexedDbDriver.open(factory, { name: 'one' });
    const two = await IndexedDbDriver.open(factory, { name: 'two' });
    await one.write([{ op: 'put', store: 'meta', key: 'k', value: 'one' }]);
    expect(await two.get('meta', 'k')).toBeUndefined();
  });
});
