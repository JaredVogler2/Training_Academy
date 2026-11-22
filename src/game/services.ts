import { browserStorage, openRepository, type Repository } from '@/storage';

/**
 * The browser-side singletons the game shares: the clock, id and seed generators, and the one repository.
 * The engine itself never reaches for any of these; they are passed in.
 */

export const now = (): number => Date.now();

export function newId(): string {
  const { crypto } = globalThis;
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Pages served over plain HTTP (a phone on the home network during development) have no randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** A fresh unsigned 32-bit seed for a lesson sitting. */
export function newSeed(): number {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

/** The calendar day of `at` as the device sees it, `YYYY-MM-DD`. */
export function localDay(at: number): string {
  const date = new Date(at);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

let repository: Promise<Repository> | null = null;

/** Open storage once, on first use. Never rejects: see src/storage/open.ts. */
export function getRepository(): Promise<Repository> {
  repository ??= openRepository({
    env: browserStorage(window),
    now,
    newId,
    appVersion: __APP_VERSION__,
  });
  return repository;
}
