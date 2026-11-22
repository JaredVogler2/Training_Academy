import { mark, recordError } from './diagnostics';

/**
 * Register the service worker (production builds only): it keeps the game's own files so that a family who has
 * opened it once can open it again without a connection. Its caching policy is written out in
 * scripts/vite/sw-source.js and tested in tests/config/serviceWorker.test.ts and e2e/offline.spec.ts.
 *
 * Registration waits for the page to finish loading, so it never competes with the first paint.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const register = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(
      () => mark('service-worker-registered'),
      (error: unknown) => recordError('window', error),
    );
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
