import {
  STORE_NAMES,
  StorageError,
  applyOps,
  emptyTables,
  isQuotaError,
  listFrom,
  type StorageDriver,
  type StoreName,
  type Tables,
  type WriteOp,
} from './driver';

export const LOCAL_STORAGE_KEY = 'training-academy.db.v1';
const DOCUMENT_FORMAT = 'training-academy.local-db';

/**
 * The fallback when IndexedDB is refused: the whole database is one JSON document under one key. A single `setItem`
 * either happens or does not, which is what makes a batch atomic here. It is read afresh for every operation, so two
 * tabs see each other's writes.
 */
export class LocalStorageDriver implements StorageDriver {
  readonly kind = 'localstorage' as const;
  readonly persistent = true;
  /** True when a document that could not be read was set aside and the store started empty. */
  recoveredFromCorruption = false;

  constructor(
    private readonly storage: Storage,
    private readonly key: string = LOCAL_STORAGE_KEY,
  ) {}

  private read(): Tables {
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.key);
    } catch (error) {
      throw new StorageError('unavailable', 'localStorage could not be read.', { cause: error });
    }
    if (raw === null) return emptyTables();

    try {
      const document = JSON.parse(raw) as { format?: unknown; stores?: Record<string, unknown> };
      if (document.format !== DOCUMENT_FORMAT || typeof document.stores !== 'object') {
        throw new Error('Not a Training Academy database.');
      }
      const tables = emptyTables();
      for (const store of STORE_NAMES) {
        const records = document.stores[store];
        if (typeof records !== 'object' || records === null) continue;
        for (const [key, value] of Object.entries(records)) tables[store].set(key, value);
      }
      return tables;
    } catch {
      // Keep what was there for a grown-up or a developer to look at, and carry on empty.
      try {
        this.storage.setItem(`${this.key}.corrupt`, raw);
        this.storage.removeItem(this.key);
      } catch {
        // Nothing more can be done; the next write replaces the document.
      }
      this.recoveredFromCorruption = true;
      return emptyTables();
    }
  }

  private persist(tables: Tables): void {
    const stores = Object.fromEntries(
      STORE_NAMES.map((store) => [store, Object.fromEntries(tables[store])]),
    );
    try {
      this.storage.setItem(this.key, JSON.stringify({ format: DOCUMENT_FORMAT, stores }));
    } catch (error) {
      if (isQuotaError(error)) {
        throw new StorageError('quota', 'There is no room left to save on this device.', {
          cause: error,
        });
      }
      throw new StorageError('unavailable', 'localStorage could not be written.', { cause: error });
    }
  }

  private attempt<T>(body: () => T): Promise<T> {
    try {
      return Promise.resolve(body());
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  get(store: StoreName, key: string): Promise<unknown> {
    return this.attempt(() => this.read()[store].get(key));
  }

  list(store: StoreName, where?: { profileId: string }): Promise<unknown[]> {
    return this.attempt(() => listFrom(this.read()[store], where));
  }

  write(ops: readonly WriteOp[]): Promise<void> {
    return this.attempt(() => {
      this.persist(applyOps(this.read(), ops));
    });
  }

  clear(): Promise<void> {
    return this.attempt(() => {
      try {
        this.storage.removeItem(this.key);
      } catch (error) {
        throw new StorageError('unavailable', 'localStorage could not be cleared.', {
          cause: error,
        });
      }
    });
  }

  close(): void {
    // Nothing to release.
  }
}
