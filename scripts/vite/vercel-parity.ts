import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { getTransformedRoutes } from '@vercel/routing-utils';
import type { Plugin } from 'vite';

/**
 * `vite preview` behaves like the Vercel deployment would.
 *
 * `vercel.json` is compiled with Vercel's own route compiler (`@vercel/routing-utils`), and the small subset of the
 * result that this project uses is interpreted here: response headers, the filesystem check, and rewrites. The browser
 * tests therefore run under the production Content-Security-Policy, cache rules and deep-link behaviour, and a request
 * for a file that does not exist is a 404 (as on Vercel) instead of Vite's catch-all `index.html`.
 *
 * Anything in `vercel.json` that this interpreter does not understand is an error, never silently ignored.
 */

/** What Vercel sends for a static file when no rule says otherwise. */
export const VERCEL_DEFAULT_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

export interface VercelConfig {
  rewrites?: { source: string; destination: string }[];
  headers?: { source: string; headers: { key: string; value: string }[] }[];
  redirects?: unknown[];
  cleanUrls?: boolean;
  trailingSlash?: boolean;
  outputDirectory?: string;
  buildCommand?: string;
  installCommand?: string;
  framework?: string;
}

interface HeaderRule {
  pattern: RegExp;
  headers: Record<string, string>;
}

interface RewriteRule {
  pattern: RegExp;
  destination: string;
}

export interface CompiledRoutes {
  headerRules: HeaderRule[];
  rewrites: RewriteRule[];
}

export type Resolution =
  | { kind: 'file'; path: string; headers: Record<string, string> }
  | { kind: 'not-found'; headers: Record<string, string> };

export function compileVercelConfig(config: VercelConfig): CompiledRoutes {
  for (const key of ['redirects', 'cleanUrls', 'trailingSlash'] as const) {
    if (config[key] !== undefined) {
      throw new Error(`vercel.json "${key}" is not modelled by the preview server yet.`);
    }
  }
  const { routes, error } = getTransformedRoutes({
    rewrites: config.rewrites,
    headers: config.headers,
  });
  if (error) throw new Error(`vercel.json does not compile: ${error.message}`);

  const compiled: CompiledRoutes = { headerRules: [], rewrites: [] };
  let afterFilesystem = false;
  for (const route of routes ?? []) {
    // The compiler marks phase boundaries with `handle`. (Its type calls the field internal: it is, to vercel.json.)
    const phase = (route as { handle?: string }).handle;
    if (phase !== undefined) {
      if (phase !== 'filesystem') {
        throw new Error(`Unsupported routing phase "${phase}" in vercel.json.`);
      }
      afterFilesystem = true;
      continue;
    }
    const { src, dest, headers, status } = route as {
      src: string;
      dest?: string;
      headers?: Record<string, string>;
      status?: number;
    };
    const plain = !('has' in route) && !('missing' in route) && status === undefined;
    const flags = route as { continue?: boolean; check?: boolean };
    if (
      plain &&
      !afterFilesystem &&
      headers !== undefined &&
      dest === undefined &&
      flags.continue
    ) {
      compiled.headerRules.push({ pattern: new RegExp(src), headers });
    } else if (
      plain &&
      afterFilesystem &&
      dest !== undefined &&
      headers === undefined &&
      flags.check
    ) {
      compiled.rewrites.push({ pattern: new RegExp(src), destination: dest });
    } else {
      throw new Error(`Unsupported route in vercel.json: ${JSON.stringify(route)}`);
    }
  }
  return compiled;
}

/**
 * Decide what a GET for `pathname` returns. `fileExists` receives a path relative to the output directory, without a
 * leading slash.
 */
export function resolveRequest(
  routes: CompiledRoutes,
  pathname: string,
  fileExists: (relativePath: string) => boolean,
): Resolution {
  const headers: Record<string, string> = { 'Cache-Control': VERCEL_DEFAULT_CACHE_CONTROL };
  for (const rule of routes.headerRules) {
    if (rule.pattern.test(pathname)) Object.assign(headers, rule.headers);
  }

  const asFile = (path: string): string | null => {
    const relative = path.replace(/^\/+/, '');
    if (relative === '' || relative.endsWith('/')) {
      const index = `${relative}index.html`;
      return fileExists(index) ? index : null;
    }
    return fileExists(relative) ? relative : null;
  };

  const direct = asFile(pathname);
  if (direct !== null) return { kind: 'file', path: direct, headers };

  for (const rule of routes.rewrites) {
    if (!rule.pattern.test(pathname)) continue;
    const rewritten = asFile(rule.destination);
    if (rewritten !== null) return { kind: 'file', path: rewritten, headers };
  }
  return { kind: 'not-found', headers };
}

export function readVercelConfig(root: string): VercelConfig {
  return JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')) as VercelConfig;
}

export function vercelParity(): Plugin {
  return {
    name: 'training-academy:vercel-parity',
    configurePreviewServer(server) {
      const root = server.config.root;
      const routes = compileVercelConfig(readVercelConfig(root));
      const outDir = resolve(root, server.config.build.outDir);
      const isFile = (relativePath: string): boolean => {
        const absolute = resolve(outDir, relativePath);
        if (absolute !== outDir && !absolute.startsWith(outDir + sep)) return false;
        return existsSync(absolute) && statSync(absolute).isFile();
      };

      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next();
          return;
        }
        let pathname: string;
        try {
          pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://preview.invalid').pathname);
        } catch {
          res.statusCode = 400;
          res.end('400: BAD_REQUEST');
          return;
        }

        const resolution = resolveRequest(routes, pathname, isFile);
        for (const [name, value] of Object.entries(resolution.headers)) res.setHeader(name, value);

        if (resolution.kind === 'not-found') {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('404: NOT_FOUND');
          return;
        }
        if (resolution.path.endsWith('.html')) {
          // Served here so the headers above are exactly what the page gets.
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(
            req.method === 'HEAD' ? undefined : readFileSync(resolve(outDir, resolution.path)),
          );
          return;
        }
        // A real file: Vite's static middleware streams it (ranges, ETag) and keeps the headers already set.
        next();
      });
    },
  };
}
