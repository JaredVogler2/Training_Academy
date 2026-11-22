import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildManifest, workerSource, type BuildManifest } from '../../scripts/vite/service-worker';

/**
 * The service worker's caching and update policy, run against a small in-memory Cache API. (e2e/offline.spec.ts
 * checks the same worker in a real browser.)
 */

const ORIGIN = 'https://academy.test';
const absolute = (input: string | { url: string }) =>
  new URL(typeof input === 'string' ? input : input.url, ORIGIN).href;

class FakeRequest {
  url: string;
  method = 'GET';
  mode = 'cors';
  cache: string | undefined;
  constructor(url: string, init: { cache?: string } = {}) {
    this.url = absolute(url);
    this.cache = init.cache;
  }
}

class FakeCache {
  readonly entries = new Map<string, Response>();
  constructor(private readonly fetcher: (request: FakeRequest) => Promise<Response>) {}

  async addAll(requests: FakeRequest[]): Promise<void> {
    const responses = await Promise.all(requests.map((request) => this.fetcher(request)));
    if (responses.some((response) => !response.ok)) throw new TypeError('Request failed');
    requests.forEach((request, index) => this.entries.set(request.url, responses[index]!));
  }
  async put(request: string | { url: string }, response: Response): Promise<void> {
    this.entries.set(absolute(request), response);
  }
  async match(request: string | { url: string }): Promise<Response | undefined> {
    return this.entries.get(absolute(request))?.clone();
  }
  async keys(): Promise<{ url: string }[]> {
    return [...this.entries.keys()].map((url) => ({ url }));
  }
  async delete(request: string | { url: string }): Promise<boolean> {
    return this.entries.delete(absolute(request));
  }
}

class FakeCacheStorage {
  readonly caches = new Map<string, FakeCache>();
  constructor(private readonly fetcher: (request: FakeRequest) => Promise<Response>) {}

  async open(name: string): Promise<FakeCache> {
    let cache = this.caches.get(name);
    if (!cache) this.caches.set(name, (cache = new FakeCache(this.fetcher)));
    return cache;
  }
  async keys(): Promise<string[]> {
    return [...this.caches.keys()];
  }
  async delete(name: string): Promise<boolean> {
    return this.caches.delete(name);
  }
  async match(request: string | { url: string }): Promise<Response | undefined> {
    for (const cache of this.caches.values()) {
      const found = await cache.match(request);
      if (found) return found;
    }
    return undefined;
  }
  paths(name: string): string[] {
    return [...(this.caches.get(name)?.entries.keys() ?? [])]
      .map((url) => new URL(url).pathname)
      .sort();
  }
}

/** A stand-in for the network: which paths exist, and whether the device is online. */
function network(paths: string[]) {
  const state = { online: true, delayMs: 0, served: [] as string[], files: new Set(paths) };
  const fetcher = async (request: { url: string }): Promise<Response> => {
    const { pathname } = new URL(request.url);
    if (state.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, state.delayMs));
    if (!state.online) throw new TypeError('Failed to fetch');
    state.served.push(pathname);
    // Every page address is the same document, as the host's rewrite makes it.
    const isPage = !pathname.includes('.');
    if (isPage)
      return new Response(`<html>${[...state.files].sort().join()}</html>`, { status: 200 });
    return state.files.has(pathname)
      ? new Response(`contents of ${pathname}`, { status: 200 })
      : new Response('404: NOT_FOUND', { status: 404 });
  };
  return { state, fetcher };
}

function startWorker(
  manifest: BuildManifest,
  storage: FakeCacheStorage,
  fetcher: (request: { url: string }) => Promise<Response>,
) {
  const listeners: Record<string, (event: any) => void> = {};
  const claim = vi.fn(async () => undefined);
  const scope = {
    addEventListener: (type: string, listener: (event: any) => void) =>
      (listeners[type] = listener),
    location: { origin: ORIGIN },
    clients: { claim },
  };
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- running the generated worker is the point
  new Function('self', 'caches', 'fetch', 'Request', workerSource(manifest))(
    scope,
    storage,
    fetcher,
    FakeRequest,
  );

  const lifecycle = async (type: 'install' | 'activate') => {
    let work: Promise<unknown> = Promise.resolve();
    listeners[type]?.({ waitUntil: (promise: Promise<unknown>) => (work = promise) });
    await work;
  };
  return {
    claim,
    install: () => lifecycle('install'),
    activate: () => lifecycle('activate'),
    /** Returns the worker's response, or `null` when it leaves the request to the browser. */
    request(
      path: string,
      init: { mode?: string; method?: string; origin?: string } = {},
    ): Promise<Response> | null {
      let response: Promise<Response> | null = null;
      listeners.fetch?.({
        request: {
          url: (init.origin ?? ORIGIN) + path,
          method: init.method ?? 'GET',
          mode: init.mode ?? 'cors',
        },
        respondWith: (promise: Promise<Response>) => (response = Promise.resolve(promise)),
      });
      return response;
    },
  };
}

const V1: BuildManifest = {
  version: 'aaaaaaaaaaaa',
  shell: [
    '/',
    '/immutable/index-1.js',
    '/immutable/index-1.css',
    '/immutable/font-1.woff2',
    '/manifest.webmanifest',
  ],
  immutable: [
    '/immutable/index-1.js',
    '/immutable/index-1.css',
    '/immutable/font-1.woff2',
    '/immutable/three-1.js',
    '/immutable/world-1.js',
  ],
};
const V2: BuildManifest = {
  version: 'bbbbbbbbbbbb',
  shell: [
    '/',
    '/immutable/index-2.js',
    '/immutable/index-1.css',
    '/immutable/font-1.woff2',
    '/manifest.webmanifest',
  ],
  immutable: [
    '/immutable/index-2.js',
    '/immutable/index-1.css',
    '/immutable/font-1.woff2',
    '/immutable/three-1.js',
    '/immutable/world-2.js',
  ],
};
const filesOf = (manifest: BuildManifest) => [
  ...manifest.immutable,
  '/manifest.webmanifest',
  '/assets/icons/icon-192.png',
];
const text = async (response: Promise<Response> | null) => (await response)?.text();

function setup(manifest = V1) {
  const net = network(filesOf(manifest));
  const storage = new FakeCacheStorage(net.fetcher);
  const worker = startWorker(manifest, storage, net.fetcher);
  return { net, storage, worker };
}

afterEach(() => vi.useRealTimers());

describe('service worker: install', () => {
  it('fetches the first screen’s files, fresh from the server, and nothing else', async () => {
    const { net, storage, worker } = setup();
    await worker.install();
    expect(storage.paths('ta-shell-aaaaaaaaaaaa')).toEqual([...V1.shell].sort());
    expect(net.state.served).not.toContain('/immutable/three-1.js');
    expect(net.state.served).not.toContain('/immutable/world-1.js');
  });

  it('fails as a whole if any shell file is missing, leaving no half-filled cache', async () => {
    const { net, storage, worker } = setup();
    net.state.files.delete('/immutable/index-1.js');
    await expect(worker.install()).rejects.toThrow();
    expect(storage.paths('ta-shell-aaaaaaaaaaaa')).toEqual([]);
  });
});

describe('service worker: pages', () => {
  it('goes to the network first, so an online device always gets the current game', async () => {
    const { net, worker } = setup();
    await worker.install();
    net.state.files.add('/immutable/brand-new.js');
    expect(await text(worker.request('/', { mode: 'navigate' }))).toContain('brand-new');
  });

  it('opens from what it kept when the device is offline, at any address', async () => {
    const { net, worker } = setup();
    await worker.install();
    await worker.request('/world/number-garden', { mode: 'navigate' });
    net.state.online = false;
    for (const path of [
      '/',
      '/world/number-garden',
      '/grown-ups',
      '/world/number-garden/play/ng-same-amount-01',
    ]) {
      expect(await text(worker.request(path, { mode: 'navigate' }))).toContain('<html>');
    }
  });

  it('gives up on a network that does not answer within a few seconds', async () => {
    vi.useFakeTimers();
    const { net, worker } = setup();
    await worker.install();
    net.state.delayMs = 60_000;
    const response = worker.request('/', { mode: 'navigate' });
    await vi.advanceTimersByTimeAsync(4100);
    expect(await text(response)).toContain('<html>');
  });

  it('does not keep an error page', async () => {
    const { net, storage, worker } = setup();
    await worker.install();
    const kept = await (await storage.match('/'))?.text();
    const failing = async () => new Response('Server error', { status: 500 });
    const flaky = startWorker(V1, storage, failing);
    expect((await flaky.request('/', { mode: 'navigate' }))?.status).toBe(500);
    expect(await (await storage.match('/'))?.text()).toBe(kept);
    expect(net.state.online).toBe(true);
  });

  it('reports a plain network error when offline with nothing kept', async () => {
    const { net, worker } = setup();
    net.state.online = false;
    const response = await worker.request('/', { mode: 'navigate' });
    expect(response?.type).toBe('error');
  });
});

describe('service worker: content-hashed files', () => {
  it('serves a kept file without touching the network', async () => {
    const { net, worker } = setup();
    await worker.install();
    net.state.served.length = 0;
    expect(await text(worker.request('/immutable/index-1.js'))).toBe(
      'contents of /immutable/index-1.js',
    );
    expect(net.state.served).toEqual([]);
  });

  it('keeps an on-demand file the first time it is used, and then works offline', async () => {
    const { net, storage, worker } = setup();
    await worker.install();
    await worker.request('/immutable/three-1.js');
    expect(storage.paths('ta-immutable')).toEqual(['/immutable/three-1.js']);

    net.state.online = false;
    expect(await text(worker.request('/immutable/three-1.js'))).toBe(
      'contents of /immutable/three-1.js',
    );
    await expect(worker.request('/immutable/world-1.js')).rejects.toThrow();
  });

  it('does not keep a 404, so a missing chunk is never mistaken for a real one', async () => {
    const { storage, worker } = setup();
    await worker.install();
    expect((await worker.request('/immutable/gone-9.js'))?.status).toBe(404);
    expect(storage.paths('ta-immutable')).toEqual([]);
  });
});

describe('service worker: everything else', () => {
  it('passes other requests through without storing them', async () => {
    const { storage, worker } = setup();
    await worker.install();
    expect(await text(worker.request('/assets/icons/icon-192.png'))).toContain('icon-192');
    expect(await storage.match('/assets/icons/icon-192.png')).toBeUndefined();
  });

  it('falls back to a kept copy when offline, if there is one', async () => {
    const { net, worker } = setup();
    await worker.install();
    net.state.online = false;
    expect(await text(worker.request('/manifest.webmanifest'))).toContain('manifest');
    expect((await worker.request('/assets/icons/icon-192.png'))?.type).toBe('error');
  });

  it('leaves non-GET and other-origin requests entirely alone', async () => {
    const { worker } = setup();
    expect(worker.request('/', { method: 'POST' })).toBeNull();
    expect(worker.request('/tracker.js', { origin: 'https://elsewhere.test' })).toBeNull();
  });
});

describe('service worker: updating', () => {
  it('a new version removes the old shell and every kept file the new build does not contain', async () => {
    const net = network(filesOf(V1));
    const storage = new FakeCacheStorage(net.fetcher);
    const old = startWorker(V1, storage, net.fetcher);
    await old.install();
    await old.activate();
    await old.request('/immutable/three-1.js');
    await old.request('/immutable/world-1.js');

    // A new build is deployed.
    for (const file of filesOf(V2)) net.state.files.add(file);
    const next = startWorker(V2, storage, net.fetcher);
    await next.install();
    // Until the new worker takes over, the old version's files are all still there for the tabs that use them.
    expect(storage.paths('ta-shell-aaaaaaaaaaaa')).toEqual([...V1.shell].sort());
    expect(storage.paths('ta-immutable')).toEqual([
      '/immutable/three-1.js',
      '/immutable/world-1.js',
    ]);

    await next.activate();
    expect(await storage.keys()).toEqual(['ta-immutable', 'ta-shell-bbbbbbbbbbbb']);
    expect(storage.paths('ta-shell-bbbbbbbbbbbb')).toEqual([...V2.shell].sort());
    // three-1.js is unchanged in the new build and is kept; world-1.js is gone from it and is deleted.
    expect(storage.paths('ta-immutable')).toEqual(['/immutable/three-1.js']);
    expect(next.claim).toHaveBeenCalledTimes(1);
  });

  it('never calls skipWaiting: a running game is not swapped out from under a child', () => {
    expect(workerSource(V1)).not.toMatch(/skipWaiting\s*\(/);
  });

  it('leaves caches that are not its own alone', async () => {
    const { storage, worker } = setup();
    await (await storage.open('someone-elses-cache')).put('/x', new Response('x'));
    await worker.install();
    await worker.activate();
    expect(await storage.keys()).toContain('someone-elses-cache');
  });
});

describe('the build manifest', () => {
  const bundle = (overrides: Record<string, object> = {}) => ({
    'index.html': { type: 'asset' as const, fileName: 'index.html', source: '<html>1</html>' },
    'immutable/index-a.js': {
      type: 'chunk' as const,
      fileName: 'immutable/index-a.js',
      isEntry: true,
      imports: ['immutable/react-b.js', 'immutable/engine-c.js'],
      viteMetadata: { importedCss: new Set(['immutable/index-d.css']) },
    },
    'immutable/react-b.js': {
      type: 'chunk' as const,
      fileName: 'immutable/react-b.js',
      imports: ['immutable/runtime-e.js'],
    },
    'immutable/engine-c.js': {
      type: 'chunk' as const,
      fileName: 'immutable/engine-c.js',
      imports: [],
    },
    'immutable/runtime-e.js': {
      type: 'chunk' as const,
      fileName: 'immutable/runtime-e.js',
      imports: [],
    },
    'immutable/three-f.js': {
      type: 'chunk' as const,
      fileName: 'immutable/three-f.js',
      imports: ['immutable/runtime-e.js'],
    },
    'immutable/Hub3D-g.js': {
      type: 'chunk' as const,
      fileName: 'immutable/Hub3D-g.js',
      imports: ['immutable/three-f.js', 'immutable/react-b.js'],
      viteMetadata: { importedCss: new Set(['immutable/hub-h.css']) },
    },
    'immutable/index-d.css': { type: 'asset' as const, fileName: 'immutable/index-d.css' },
    'immutable/hub-h.css': { type: 'asset' as const, fileName: 'immutable/hub-h.css' },
    'immutable/font-i.woff2': { type: 'asset' as const, fileName: 'immutable/font-i.woff2' },
    ...overrides,
  });

  it('puts the entry, what it imports statically, its styles and the fonts in the shell', () => {
    const manifest = buildManifest(bundle(), 'immutable');
    expect(manifest.shell).toEqual([
      '/',
      '/immutable/engine-c.js',
      '/immutable/font-i.woff2',
      '/immutable/index-a.js',
      '/immutable/index-d.css',
      '/immutable/react-b.js',
      '/immutable/runtime-e.js',
      '/manifest.webmanifest',
      '/favicon.svg',
    ]);
  });

  it('keeps on-demand code (the 3D hub) out of the shell but knows it belongs to the build', () => {
    const manifest = buildManifest(bundle(), 'immutable');
    expect(manifest.shell.join()).not.toMatch(/three|Hub3D|hub-h/);
    expect(manifest.immutable).toEqual(
      expect.arrayContaining(['/immutable/three-f.js', '/immutable/Hub3D-g.js']),
    );
    expect(manifest.immutable).not.toContain('/index.html');
  });

  it('gets a new version exactly when the build’s files or page change', () => {
    const version = buildManifest(bundle(), 'immutable').version;
    expect(version).toMatch(/^[0-9a-f]{12}$/);
    expect(buildManifest(bundle(), 'immutable').version).toBe(version);
    const renamed = bundle({
      'immutable/three-z.js': { type: 'chunk', fileName: 'immutable/three-z.js', imports: [] },
    });
    expect(buildManifest(renamed, 'immutable').version).not.toBe(version);
    const edited = bundle({
      'index.html': { type: 'asset', fileName: 'index.html', source: '<html>2</html>' },
    });
    expect(buildManifest(edited, 'immutable').version).not.toBe(version);
  });

  it('refuses a build with no entry', () => {
    expect(() => buildManifest({}, 'immutable')).toThrow(/entry/);
  });
});
