/* global BUILD */
// Training Academy service worker. This file is the body of dist/sw.js: the build puts one line in front of it,
//   const BUILD = { version, shell, immutable };
// (see scripts/vite/service-worker.ts). Plain script, no imports.
//
// The caching policy, in full:
//
//   Pages (navigations)   network first, so an online device always gets the current game; the last page seen is
//                         kept and used when the network fails or takes longer than a few seconds.
//   /immutable/ files     cache first. Their names contain a hash of their contents, so a cached copy can never be
//                         stale. The files the first screen needs are fetched at install; the rest (a world, the 3D
//                         hub) are kept the first time they are used. Nothing is downloaded "just in case".
//   Everything else       network, falling back to a kept copy if there is one. Never stored from here.
//
// What is kept is bounded by the size of one build: when a new worker takes over it deletes the previous shell and
// every kept file that the new build does not contain.
//
// A new worker never interrupts a running game: it waits until every tab of the old version has closed.

const SHELL_CACHE = `ta-shell-${BUILD.version}`;
const RUNTIME_CACHE = 'ta-immutable';
const NAVIGATION_TIMEOUT_MS = 4000;
const PAGE_KEY = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // `reload` bypasses the HTTP cache, so the shell is exactly what the server has now.
      .then((cache) =>
        cache.addAll(BUILD.shell.map((url) => new Request(url, { cache: 'reload' }))),
      ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('ta-shell-') && name !== SHELL_CACHE)
          .map((name) => caches.delete(name)),
      );
      const current = new Set(BUILD.immutable);
      const runtime = await caches.open(RUNTIME_CACHE);
      for (const request of await runtime.keys()) {
        if (!current.has(new URL(request.url).pathname)) await runtime.delete(request);
      }
      // Take over the page that installed this worker, so what it loads next is kept for offline use.
      await self.clients.claim();
    })(),
  );
});

function withTimeout(promise, milliseconds) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), milliseconds);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function page(request) {
  try {
    const response = await withTimeout(fetch(request), NAVIGATION_TIMEOUT_MS);
    if (response.ok) {
      // Every page address is the same document; keep the latest under one key.
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(PAGE_KEY, response.clone());
    }
    return response;
  } catch {
    const kept = await caches.match(PAGE_KEY);
    return kept || Response.error();
  }
}

async function immutable(request) {
  const kept = await caches.match(request);
  if (kept) return kept;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function passThrough(request) {
  try {
    return await fetch(request);
  } catch {
    const kept = await caches.match(request);
    return kept || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') event.respondWith(page(request));
  else if (url.pathname.startsWith('/immutable/')) event.respondWith(immutable(request));
  else event.respondWith(passThrough(request));
});
