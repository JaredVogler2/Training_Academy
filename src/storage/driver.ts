/**
 * The smallest storage interface the game needs: four named stores of JSON records, read by key or in bulk, and
 * written in all-or-nothing batches. IndexedDB, localStorage and plain memory each implement it, so everything above
 * this file is the same whichever one the browser allows.
 */

export const STORE_NAMES = ['meta', 'profiles', 'sessions', 'attempts'] as const;
export type StoreName = (typeof STORE_NAMES)[number];

/** Stores whose records belong to a profile and can be listed by it. */
export const PROFILE_SCOPED_STORES: readonly StoreName[] = ['sessions', 'attempts'];

export type WriteOp =
  /** Insert or replace. */
  | { op: 'put'; store: StoreName; key: string; value: unknown }
  /** Insert only: the whole batch fails with a `conflict` if the key is already taken. */
  | { op: 'add'; store: StoreName; key: string; value: unknown }
  | { op: 'delete'; store: StoreName; key: string };

export type DriverKind = 'indexeddb' | 'localstorage' | 'memory';

export interface StorageDriver {
  readonly kind: DriverKind;
  /** Whether what is written survives closing the page. */
  readonly persistent: boolean;
  /** The stored value, or `undefined`. */
  get(store: StoreName, key: string): Promise<unknown>;
  /** Every value in a store; with `where`, only those belonging to that profile. */
  list(store: StoreName, where?: { profileId: string }): Promise<unknown[]>;
  /** Apply every operation, or none of them. */
  write(ops: readonly WriteOp[]): Promise<void>;
  /** Remove every record in every store. */
  clear(): Promise<void>;
  close(): void;
}

export type StorageErrorCode =
  /** The browser refused or lost the storage. */
  | 'unavailable'
  /** No room left on the device. */
  | 'quota'
  /** An insert-only write found the key already taken (usually another tab). */
  | 'conflict'
  /** A record did not pass validation and was not written. */
  | 'invalid-record'
  /** The stored data was written by a newer version of the game. */
  | 'newer-data'
  | 'not-found'
  | 'limit';

export class StorageError extends Error {
  override name = 'StorageError';
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.code = code;
  }
}

export function isQuotaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { name, code } = error as { name?: unknown; code?: unknown };
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22;
}

function belongsTo(value: unknown, profileId: string): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { profileId?: unknown }).profileId === profileId
  );
}

type Tables = Record<StoreName, Map<string, unknown>>;

const emptyTables = (): Tables => ({
  meta: new Map(),
  profiles: new Map(),
  sessions: new Map(),
  attempts: new Map(),
});

/**
 * Apply a batch to in-memory tables, all or nothing. Shared by the memory and localStorage drivers so "atomic" means
 * the same thing in both.
 */
export function applyOps(tables: Tables, ops: readonly WriteOp[]): Tables {
  const next: Tables = {
    meta: new Map(tables.meta),
    profiles: new Map(tables.profiles),
    sessions: new Map(tables.sessions),
    attempts: new Map(tables.attempts),
  };
  for (const operation of ops) {
    const table = next[operation.store];
    if (operation.op === 'delete') {
      table.delete(operation.key);
      continue;
    }
    if (operation.op === 'add' && table.has(operation.key)) {
      throw new StorageError('conflict', `${operation.store}/${operation.key} already exists.`);
    }
    // A structured copy, so what is stored cannot be changed through the caller's object.
    table.set(operation.key, structuredClone(operation.value));
  }
  return next;
}

export function listFrom(table: Map<string, unknown>, where?: { profileId: string }): unknown[] {
  const values = [...table.values()];
  const filtered = where ? values.filter((value) => belongsTo(value, where.profileId)) : values;
  return filtered.map((value) => structuredClone(value));
}

/** Storage that lasts as long as the page: the last resort when the browser allows nothing else. */
export class MemoryDriver implements StorageDriver {
  readonly kind = 'memory' as const;
  readonly persistent = false;
  private tables = emptyTables();

  get(store: StoreName, key: string): Promise<unknown> {
    return Promise.resolve(structuredClone(this.tables[store].get(key)));
  }

  list(store: StoreName, where?: { profileId: string }): Promise<unknown[]> {
    return Promise.resolve(listFrom(this.tables[store], where));
  }

  write(ops: readonly WriteOp[]): Promise<void> {
    try {
      this.tables = applyOps(this.tables, ops);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  clear(): Promise<void> {
    this.tables = emptyTables();
    return Promise.resolve();
  }

  close(): void {
    // Nothing to release.
  }
}

export { emptyTables, type Tables };
