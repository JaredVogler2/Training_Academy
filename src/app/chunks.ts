import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { recordChunk, recordError } from './diagnostics';

/**
 * Code that is fetched only when it is needed: the 3D hub, each world, the lesson player, the grown-ups area.
 * Every such load is timed, and a failed one becomes a ChunkLoadError that the error boundary knows how to explain
 * (usually the device went offline, or the game was updated while the page was open).
 */

export class ChunkLoadError extends Error {
  override name = 'ChunkLoadError';
  readonly chunk: string;

  constructor(chunk: string, cause: unknown) {
    super(`Could not load "${chunk}".`, { cause });
    this.chunk = chunk;
  }
}

export function loadChunk<T>(name: string, loader: () => Promise<T>): Promise<T> {
  const started = performance.now();
  return loader().then(
    (module) => {
      recordChunk(name, performance.now() - started, true);
      return module;
    },
    (cause: unknown) => {
      recordChunk(name, performance.now() - started, false);
      const error = new ChunkLoadError(name, cause);
      recordError('chunk', error);
      throw error;
    },
  );
}

export function lazyView<Props>(
  name: string,
  loader: () => Promise<{ default: ComponentType<Props> }>,
): LazyExoticComponent<ComponentType<Props>> {
  return lazy(() => loadChunk(name, loader));
}
