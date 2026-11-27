/**
 * Local-first persistence: see docs/ARCHITECTURE.md. Nothing in here talks to a network.
 */
export {
  MemoryDriver,
  STORE_NAMES,
  StorageError,
  type DriverKind,
  type StorageDriver,
  type StorageErrorCode,
  type StoreName,
  type WriteOp,
} from './driver';
export { IDB_NAME, IndexedDbDriver } from './indexedDbDriver';
export { LOCAL_STORAGE_KEY, LocalStorageDriver } from './localStorageDriver';
export {
  DATA_VERSION,
  MIGRATIONS,
  PAIRS_PAR,
  migrate,
  withThePairsMark,
  type Migration,
  type MigrationOutcome,
} from './migrations';
export {
  MAX_PROFILES,
  Repository,
  type BackendInfo,
  type BackendNote,
  type ImportResult,
  type ProfileInput,
  type ProfilePatch,
} from './repository';
export { browserStorage, openDriver, openRepository, type StorageEnvironment } from './open';
export {
  EXPORT_FORMAT,
  EXPORT_FORMAT_VERSION,
  MAX_IMPORT_BYTES,
  buildBundle,
  readBundle,
  type ExportBundle,
  type ImportProblem,
} from './transfer';
export { checksumOf, stableStringify } from './checksum';
