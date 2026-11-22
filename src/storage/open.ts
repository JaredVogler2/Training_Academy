import { MemoryDriver, type StorageDriver } from './driver';
import { IndexedDbDriver } from './indexedDbDriver';
import { LocalStorageDriver } from './localStorageDriver';
import { migrate } from './migrations';
import { Repository, type BackendNote } from './repository';

/** The browser's storage objects, or `null` for each one it will not hand over. */
export interface StorageEnvironment {
  indexedDB: IDBFactory | null;
  localStorage: Storage | null;
}

/**
 * Collect the storage objects from a window-like scope. Merely touching `localStorage` or `indexedDB` throws in some
 * privacy modes and sandboxed frames, so each is read behind a guard.
 */
export function browserStorage(
  scope: { indexedDB?: IDBFactory; localStorage?: Storage } = globalThis,
): StorageEnvironment {
  const read = <T>(getter: () => T | undefined): T | null => {
    try {
      return getter() ?? null;
    } catch {
      return null;
    }
  };
  return {
    indexedDB: read(() => scope.indexedDB),
    localStorage: read(() => scope.localStorage),
  };
}

export interface OpenOptions {
  /** How long to wait for IndexedDB before giving up on it. */
  timeoutMs?: number;
  databaseName?: string;
}

/**
 * Open the best storage the browser allows: IndexedDB, else localStorage, else memory. It never rejects — a game that
 * cannot save is still a game — and the notes say what was given up and why.
 */
export async function openDriver(
  env: StorageEnvironment,
  options: OpenOptions = {},
): Promise<{ driver: StorageDriver; notes: BackendNote[] }> {
  const notes: BackendNote[] = [];

  if (env.indexedDB) {
    try {
      const driver = await IndexedDbDriver.open(env.indexedDB, {
        ...(options.databaseName === undefined ? {} : { name: options.databaseName }),
        ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
      });
      await driver.get('meta', 'schema');
      return { driver, notes };
    } catch {
      notes.push('indexeddb-unavailable');
    }
  } else {
    notes.push('indexeddb-unavailable');
  }

  if (env.localStorage) {
    try {
      const probe = 'training-academy.probe';
      env.localStorage.setItem(probe, '1');
      env.localStorage.removeItem(probe);
      const driver = new LocalStorageDriver(env.localStorage);
      await driver.get('meta', 'schema');
      if (driver.recoveredFromCorruption) notes.push('local-data-was-unreadable');
      return { driver, notes };
    } catch {
      notes.push('localstorage-unavailable');
    }
  } else {
    notes.push('localstorage-unavailable');
  }

  return { driver: new MemoryDriver(), notes };
}

export interface OpenRepositoryDeps extends OpenOptions {
  env: StorageEnvironment;
  now: () => number;
  newId: () => string;
  appVersion?: string;
}

/**
 * Open storage, bring its data up to the current version, and return the repository. If the data on the device was
 * written by a newer version of the game, or cannot be upgraded, it is left untouched and the game runs from memory.
 */
export async function openRepository(deps: OpenRepositoryDeps): Promise<Repository> {
  const { driver, notes } = await openDriver(deps.env, deps);
  const repository = (chosen: StorageDriver, chosenNotes: BackendNote[]) =>
    new Repository({
      driver: chosen,
      now: deps.now,
      newId: deps.newId,
      notes: chosenNotes,
      ...(deps.appVersion === undefined ? {} : { appVersion: deps.appVersion }),
    });
  const fromMemory = async (extra: BackendNote) => {
    driver.close();
    const memory = new MemoryDriver();
    await migrate(memory);
    return repository(memory, [...notes, extra]);
  };

  try {
    const outcome = await migrate(driver);
    if (outcome.status === 'newer-data') return await fromMemory('newer-data');
  } catch {
    if (driver.kind === 'memory') throw new Error('In-memory storage failed to initialise.');
    return fromMemory(
      driver.kind === 'indexeddb' ? 'indexeddb-unavailable' : 'localstorage-unavailable',
    );
  }
  return repository(driver, notes);
}
