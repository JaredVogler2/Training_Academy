import { describe, expect, it } from 'vitest';
import { toPath, type Route } from '@/app/router';
import { WORLD_IDS } from '@/engine';
import {
  VERCEL_DEFAULT_CACHE_CONTROL,
  compileVercelConfig,
  readVercelConfig,
  resolveRequest,
} from '../../scripts/vite/vercel-parity';

/**
 * vercel.json, checked with Vercel's own route compiler (the same code `vite preview` uses here). These tests are the
 * reason a deep link, a stale chunk and a security header behave the same locally as they will when deployed.
 */

const config = readVercelConfig(process.cwd());
const routes = compileVercelConfig(config);

/** The files a build produces, as far as routing is concerned. */
const DIST = new Set([
  'index.html',
  'favicon.svg',
  'manifest.webmanifest',
  'sw.js',
  'immutable/index-abc123.js',
  'immutable/three-def456.js',
  'assets/icons/icon-192.png',
]);
const get = (path: string) => resolveRequest(routes, path, (file) => DIST.has(file));

const pages: Route[] = [
  { name: 'home' },
  { name: 'grown-ups' },
  ...WORLD_IDS.map((world): Route => ({ name: 'world', world })),
  { name: 'play', world: 'number-garden', lessonId: 'ng-same-amount-01' },
];

describe('vercel.json', () => {
  it('describes a static Vite build with no server code', () => {
    expect(config).toMatchObject({
      framework: 'vite',
      buildCommand: 'npm run build',
      installCommand: 'npm ci',
      outputDirectory: 'dist',
    });
    expect(Object.keys(config)).not.toEqual(
      expect.arrayContaining(['functions', 'crons', 'env', 'build']),
    );
  });

  it('serves the app for every page address, including a refresh deep inside it', () => {
    for (const page of pages) {
      expect(get(toPath(page))).toMatchObject({ kind: 'file', path: 'index.html' });
    }
    // An address the app does not know still gets the app, which shows its own "not on the map" page.
    expect(get('/somewhere/unknown')).toMatchObject({ kind: 'file', path: 'index.html' });
  });

  it('serves real files as themselves', () => {
    expect(get('/favicon.svg')).toMatchObject({ kind: 'file', path: 'favicon.svg' });
    expect(get('/immutable/index-abc123.js')).toMatchObject({
      kind: 'file',
      path: 'immutable/index-abc123.js',
    });
    expect(get('/assets/icons/icon-192.png')).toMatchObject({
      kind: 'file',
      path: 'assets/icons/icon-192.png',
    });
  });

  it('answers 404 for a missing build file instead of handing back the app', () => {
    // After a new deployment an open page may ask for a chunk that no longer exists. HTML with a 200 would be
    // reported by the browser as a broken script; a 404 lets the game say "load the page again".
    expect(get('/immutable/index-old999.js').kind).toBe('not-found');
    expect(get('/immutable/').kind).toBe('not-found');
    expect(get('/assets/audio/missing.mp3').kind).toBe('not-found');
  });

  it('caches content-hashed files forever and everything else not at all', () => {
    expect(get('/immutable/index-abc123.js').headers['Cache-Control']).toBe(
      'public, max-age=31536000, immutable',
    );
    for (const path of [
      '/',
      '/world/number-garden',
      '/favicon.svg',
      '/assets/icons/icon-192.png',
      '/manifest.webmanifest',
    ]) {
      expect(get(path).headers['Cache-Control']).toBe(VERCEL_DEFAULT_CACHE_CONTROL);
    }
  });

  it('never lets a service worker script be cached, so an update can always reach the device', () => {
    expect(get('/sw.js').headers['Cache-Control']).toBe('public, max-age=0, must-revalidate');
  });

  it('sends the security headers with every response, found or not', () => {
    for (const path of [
      '/',
      '/grown-ups',
      '/immutable/index-abc123.js',
      '/immutable/gone.js',
      '/favicon.svg',
    ]) {
      const { headers } = get(path);
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Referrer-Policy']).toBe('no-referrer');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
      expect(headers['Content-Security-Policy']).toBeDefined();
      expect(headers['Permissions-Policy']).toBeDefined();
    }
  });

  it('has a Content-Security-Policy that allows this origin and nothing else', () => {
    const policy = get('/').headers['Content-Security-Policy'] ?? '';
    const directives = Object.fromEntries(
      policy.split(';').map((part) => {
        const [name, ...values] = part.trim().split(/\s+/);
        return [name, values.join(' ')];
      }),
    );
    expect(directives['default-src']).toBe("'self'");
    expect(directives['script-src']).toBe("'self'");
    expect(directives['style-src']).toBe("'self'");
    // Nothing can be sent to another origin: no analytics, no beacons, no third-party anything.
    expect(directives['connect-src']).toBe("'self'");
    expect(directives['font-src']).toBe("'self'");
    expect(directives['object-src']).toBe("'none'");
    expect(directives['frame-ancestors']).toBe("'none'");
    expect(directives['form-action']).toBe("'none'");
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval|https?:|\*/);
  });

  it('switches off device features the game never uses', () => {
    const policy = get('/').headers['Permissions-Policy'] ?? '';
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment']) {
      expect(policy).toContain(`${feature}=()`);
    }
  });

  it('refuses configuration the local preview cannot model, rather than ignoring it', () => {
    expect(() =>
      compileVercelConfig({ ...config, redirects: [{ source: '/a', destination: '/b' }] }),
    ).toThrow(/redirects/);
    expect(() => compileVercelConfig({ ...config, cleanUrls: true })).toThrow(/cleanUrls/);
    expect(() =>
      compileVercelConfig({
        ...config,
        rewrites: [{ source: '/feedback/(?!general)', destination: '/x' }],
      }),
    ).toThrow();
  });
});
