import {
  PROFILE_SCOPED_STORES,
  STORE_NAMES,
  StorageError,
  isQuotaError,
  type StorageDriver,
  type StoreName,
  type WriteOp,
} from './driver';

export const IDB_NAME = 'training-academy';
/** Version of the object stores and indexes. Data shape changes go through src/storage/migrations.ts instead. */
export const IDB_STRUCTURE_VERSION = 1;
const PROFILE_INDEX = 'profileId';

function createStructure(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    for (const name of STORE_NAMES) {
      const store = db.createObjectStore(name);
      if (PROFILE_SCOPED_STORES.includes(name)) store.createIndex(PROFILE_INDEX, PROFILE_INDEX);
    }
  }
}

function openDatabase(factory: IDBFactory, name: string, timeoutMs: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      action();
    };
    // Some browsers neither succeed nor fail when storage is blocked; do not leave the game waiting.
    const timer = setTimeout(() => {
      settle(() => reject(new StorageError('unavailable', 'IndexedDB did not answer in time.')));
    }, timeoutMs);

    let request: IDBOpenDBRequest;
    try {
      request = factory.open(name, IDB_STRUCTURE_VERSION);
    } catch (error) {
      settle(() =>
        reject(new StorageError('unavailable', 'IndexedDB refused to open.', { cause: error })),
      );
      return;
    }
    request.onupgradeneeded = (event) => {
      createStructure(request.result, event.oldVersion);
    };
    request.onsuccess = () => {
      const db = request.result;
      if (settled) {
        db.close();
        return;
      }
      settle(() => resolve(db));
    };
    request.onerror = () => {
      settle(() =>
        reject(
          new StorageError('unavailable', 'IndexedDB could not be opened.', {
            cause: request.error,
          }),
        ),
      );
    };
    request.onblocked = () => {
      settle(() =>
        reject(new StorageError('unavailable', 'IndexedDB is held open by another tab.')),
      );
    };
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function toStorageError(error: unknown, fallback: string): StorageError {
  if (error instanceof StorageError) return error;
  const name = (error as { name?: unknown } | null)?.name;
  if (name === 'ConstraintError') {
    return new StorageError('conflict', 'A record with that key already exists.', { cause: error });
  }
  if (isQuotaError(error)) {
    return new StorageError('quota', 'There is no room left to save on this device.', {
      cause: error,
    });
  }
  return new StorageError('unavailable', fallback, { cause: error });
}

/**
 * IndexedDB, the preferred store. Every batch is one transaction; requests are issued without awaiting in between, so
 * the transaction cannot auto-commit half-way. If the browser closes the connection underneath the page (storage
 * cleared, another tab upgrading), the next operation reopens it.
 */
export class IndexedDbDriver implements StorageDriver {
  readonly kind = 'indexeddb' as const;
  readonly persistent = true;
  private db: IDBDatabase | null = null;

  private constructor(
    private readonly factory: IDBFactory,
    private readonly name: string,
    private readonly timeoutMs: number,
  ) {}

  static async open(
    factory: IDBFactory,
    options: { name?: string; timeoutMs?: number } = {},
  ): Promise<IndexedDbDriver> {
    const driver = new IndexedDbDriver(
      factory,
      options.name ?? IDB_NAME,
      options.timeoutMs ?? 3000,
    );
    await driver.database();
    return driver;
  }

  private async database(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    const db = await openDatabase(this.factory, this.name, this.timeoutMs);
    const forget = () => {
      if (this.db === db) this.db = null;
    };
    db.onversionchange = () => {
      db.close();
      forget();
    };
    db.onclose = forget;
    this.db = db;
    return db;
  }

  private async transaction(
    stores: StoreName[],
    mode: IDBTransactionMode,
  ): Promise<IDBTransaction> {
    const options: IDBTransactionOptions = mode === 'readwrite' ? { durability: 'strict' } : {};
    try {
      return (await this.database()).transaction(stores, mode, options);
    } catch {
      // The connection was closed underneath us: open a fresh one, once.
      this.db?.close();
      this.db = null;
      return (await this.database()).transaction(stores, mode, options);
    }
  }

  async get(store: StoreName, key: string): Promise<unknown> {
    try {
      const tx = await this.transaction([store], 'readonly');
      return await requestResult<unknown>(tx.objectStore(store).get(key));
    } catch (error) {
      throw toStorageError(error, 'IndexedDB could not be read.');
    }
  }

  async list(store: StoreName, where?: { profileId: string }): Promise<unknown[]> {
    try {
      const tx = await this.transaction([store], 'readonly');
      const source = tx.objectStore(store);
      const request =
        where && PROFILE_SCOPED_STORES.includes(store)
          ? source.index(PROFILE_INDEX).getAll(IDBKeyRange.only(where.profileId))
          : source.getAll();
      return await requestResult<unknown[]>(request);
    } catch (error) {
      throw toStorageError(error, 'IndexedDB could not be read.');
    }
  }

  async write(ops: readonly WriteOp[]): Promise<void> {
    if (ops.length === 0) return;
    try {
      const stores = [...new Set(ops.map((operation) => operation.store))];
      const tx = await this.transaction(stores, 'readwrite');
      await new Promise<void>((resolve, reject) => {
        let failure: DOMException | null = null;
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(failure ?? tx.error ?? new Error('The transaction was aborted.'));
        tx.onerror = () => {
          failure ??= tx.error;
        };
        for (const operation of ops) {
          const store = tx.objectStore(operation.store);
          const request =
            operation.op === 'delete'
              ? store.delete(operation.key)
              : operation.op === 'add'
                ? store.add(operation.value, operation.key)
                : store.put(operation.value, operation.key);
          request.onerror = () => {
            failure ??= request.error;
          };
        }
      });
    } catch (error) {
      throw toStorageError(error, 'IndexedDB could not be written.');
    }
  }

  async clear(): Promise<void> {
    try {
      const tx = await this.transaction([...STORE_NAMES], 'readwrite');
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error ?? new Error('The transaction was aborted.'));
        for (const name of STORE_NAMES) tx.objectStore(name).clear();
      });
    } catch (error) {
      throw toStorageError(error, 'IndexedDB could not be cleared.');
    }
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}
