import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChunkLoadError, loadChunk } from '@/app/chunks';
import {
  getDiagnostics,
  mark,
  recordChunk,
  recordError,
  resetDiagnosticsForTest,
  setHubDiagnostics,
  subscribeDiagnostics,
} from '@/app/diagnostics';

describe('on-device diagnostics', () => {
  beforeEach(() => resetDiagnosticsForTest());

  it('records the first time something happens, and only the first', () => {
    mark('shell-ready');
    const first = getDiagnostics().marks['shell-ready'];
    expect(first).toBeGreaterThanOrEqual(0);
    mark('shell-ready');
    expect(getDiagnostics().marks['shell-ready']).toBe(first);
  });

  it('records chunk loads with their time and outcome', () => {
    recordChunk('hub-3d', 123.456, true);
    recordChunk('world', 9, false);
    expect(getDiagnostics().chunks).toEqual([
      { name: 'hub-3d', ms: 123.5, ok: true },
      { name: 'world', ms: 9, ok: false },
    ]);
  });

  it('keeps errors short, and only the most recent ones', () => {
    recordError('render', new TypeError('boom'));
    expect(getDiagnostics().errors[0]).toMatchObject({
      source: 'render',
      message: 'TypeError: boom',
    });
    recordError('window', 'x'.repeat(5000));
    expect(getDiagnostics().errors[1]?.message).toHaveLength(300);
    for (let index = 0; index < 120; index++) recordError('promise', index);
    expect(getDiagnostics().errors).toHaveLength(50);
    expect(getDiagnostics().errors.at(-1)?.message).toBe('119');
  });

  it('merges what is known about the hub', () => {
    setHubDiagnostics({ mode: '3d', tier: 'medium' });
    setHubDiagnostics({ frames: { fps: 58, p95Ms: 19.5, samples: 90 } });
    expect(getDiagnostics().hub).toMatchObject({
      mode: '3d',
      tier: 'medium',
      frames: { fps: 58, p95Ms: 19.5, samples: 90 },
    });
  });

  it('tells subscribers when something is recorded', () => {
    const listener = vi.fn();
    const stop = subscribeDiagnostics(listener);
    mark('a');
    recordChunk('b', 1, true);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
    mark('c');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('loading code on demand', () => {
  beforeEach(() => resetDiagnosticsForTest());

  it('times a successful load and passes the module through', async () => {
    const module = { default: 'the-module' };
    await expect(loadChunk('world', () => Promise.resolve(module))).resolves.toBe(module);
    expect(getDiagnostics().chunks).toMatchObject([{ name: 'world', ok: true }]);
    expect(getDiagnostics().errors).toEqual([]);
  });

  it('turns a failed load into a ChunkLoadError that names the chunk', async () => {
    const cause = new TypeError('Failed to fetch dynamically imported module');
    const failed = loadChunk('hub-3d', () => Promise.reject(cause));
    await expect(failed).rejects.toBeInstanceOf(ChunkLoadError);
    await expect(failed).rejects.toMatchObject({ chunk: 'hub-3d', cause });
    expect(getDiagnostics().chunks).toMatchObject([{ name: 'hub-3d', ok: false }]);
    expect(getDiagnostics().errors[0]).toMatchObject({ source: 'chunk' });
  });
});
