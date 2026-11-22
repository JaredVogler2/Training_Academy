import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/**
 * Writes dist/sw.js at the end of a production build.
 *
 * The worker's code is scripts/vite/sw-source.js, the same for every build. What changes is the one line put in front
 * of it: which files the first screen needs (fetched at install), every content-hashed file the build contains (what
 * may be kept), and a version derived from both — so the worker changes exactly when the build's files do.
 */

export interface BuildManifest {
  version: string;
  /** Fetched when the worker installs: the page and what its first screen needs. */
  shell: string[];
  /** Every content-hashed file in the build. Kept files that are not on this list are deleted on update. */
  immutable: string[];
}

interface ChunkLike {
  type: 'chunk' | 'asset';
  fileName: string;
  isEntry?: boolean;
  imports?: string[];
  viteMetadata?: { importedCss?: Set<string> };
  source?: string | Uint8Array;
}

/** Files that live in public/ and belong to the shell. */
const PUBLIC_SHELL = ['/manifest.webmanifest', '/favicon.svg'];

export function buildManifest(bundle: Record<string, ChunkLike>, assetsDir: string): BuildManifest {
  const files = Object.values(bundle);
  const entry = files.find((file) => file.type === 'chunk' && file.isEntry);
  if (!entry) throw new Error('The build has no entry chunk.');

  // The entry and everything it imports statically. Dynamic imports (worlds, the 3D hub) are deliberately left out.
  const scripts = new Set<string>();
  const styles = new Set<string>();
  const pending = [entry.fileName];
  while (pending.length > 0) {
    const name = pending.pop() as string;
    if (scripts.has(name)) continue;
    scripts.add(name);
    const chunk = bundle[name];
    for (const style of chunk?.viteMetadata?.importedCss ?? []) styles.add(style);
    pending.push(...(chunk?.imports ?? []));
  }
  const fonts = Object.keys(bundle).filter((name) => /\.woff2$/.test(name));

  const shell = [
    '/',
    ...[...scripts, ...styles, ...fonts].sort().map((name) => `/${name}`),
    ...PUBLIC_SHELL,
  ];
  const immutable = Object.keys(bundle)
    .filter((name) => name.startsWith(`${assetsDir}/`))
    .sort()
    .map((name) => `/${name}`);

  const page = bundle['index.html']?.source;
  const version = createHash('sha256')
    .update(JSON.stringify([shell, immutable]))
    .update(typeof page === 'string' ? page : '')
    .digest('hex')
    .slice(0, 12);
  return { version, shell, immutable };
}

export function workerSource(manifest: BuildManifest): string {
  const body = readFileSync(fileURLToPath(new URL('./sw-source.js', import.meta.url)), 'utf8');
  return `const BUILD = ${JSON.stringify(manifest)};\n${body.replace('/* global BUILD */\n', '')}`;
}

export function serviceWorker(): Plugin {
  let assetsDir = 'assets';
  let outDir = 'dist';
  return {
    name: 'training-academy:service-worker',
    apply: 'build',
    configResolved(config) {
      assetsDir = config.build.assetsDir;
      outDir = join(config.root, config.build.outDir);
    },
    writeBundle(_options, bundle) {
      const manifest = buildManifest(bundle, assetsDir);
      writeFileSync(join(outDir, 'sw.js'), workerSource(manifest));
    },
  };
}
