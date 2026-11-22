import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import {
  IndexedDbDriver,
  LocalStorageDriver,
  MemoryDriver,
  Repository,
  migrate,
  type StorageDriver,
} from '@/storage';

/** A `Storage` that can be told to run out of room or to refuse everything. */
export class FakeStorage implements Storage {
  private readonly items = new Map<string, string>();
  /** Total characters allowed across all values; `Infinity` for no limit. */
  quota = Infinity;
  broken = false;

  get length(): number {
    return this.items.size;
  }

  private guard(): void {
    if (this.broken) throw new DOMException('The operation is insecure.', 'SecurityError');
  }

  clear(): void {
    this.guard();
    this.items.clear();
  }

  getItem(key: string): string | null {
    this.guard();
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.guard();
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.guard();
    let size = value.length;
    for (const [other, stored] of this.items) if (other !== key) size += stored.length;
    if (size > this.quota) throw new DOMException('Quota exceeded.', 'QuotaExceededError');
    this.items.set(key, value);
  }
}

/** A way to make a driver, and to make a second one over the same underlying data ("the page was reloaded"). */
export interface Backend {
  name: string;
  persistent: boolean;
  open(): Promise<StorageDriver>;
}

export function backends(): Backend[] {
  const storage = new FakeStorage();
  const factory = new IDBFactory();
  const memory = new MemoryDriver();
  return [
    { name: 'memory', persistent: false, open: () => Promise.resolve(memory) },
    {
      name: 'localStorage',
      persistent: true,
      open: () => Promise.resolve(new LocalStorageDriver(storage)),
    },
    { name: 'IndexedDB', persistent: true, open: () => IndexedDbDriver.open(factory) },
  ];
}

export const BACKEND_NAMES = ['memory', 'localStorage', 'IndexedDB'] as const;

/** A fresh backend of one kind, so every test starts from an empty device. */
export function freshBackend(name: (typeof BACKEND_NAMES)[number]): Backend {
  const backend = backends().find((candidate) => candidate.name === name);
  if (!backend) throw new Error(name);
  return backend;
}

export interface TestClock {
  now: number;
}

/** A repository with a controllable clock and predictable ids. */
export async function repositoryOn(
  backend: Backend,
  clock: TestClock = { now: Date.UTC(2026, 10, 2, 9, 0, 0) },
  idPrefix = 'id',
): Promise<Repository> {
  const driver = await backend.open();
  await migrate(driver);
  let counter = 0;
  return new Repository({
    driver,
    now: () => clock.now,
    newId: () => `${idPrefix}-${++counter}-${Math.floor(clock.now / 1000)}`,
    appVersion: '0.0.0-test',
  });
}
