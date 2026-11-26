import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The asset manifest (docs/assets.manifest.json) is a promise: everything the game ships is listed, with where it
 * came from and under what terms, and nothing is fetched from anywhere else. These tests keep the promise.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

interface Asset {
  id: string;
  kind: string;
  origin: 'original' | 'derived' | 'third-party';
  what: string;
  paths: string[];
  licence: string;
  madeWith: string;
  source?: string;
  holder?: string;
}

const manifest = JSON.parse(readFileSync(join(root, 'docs/assets.manifest.json'), 'utf8')) as {
  assets: Asset[];
};
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>;
};

function walk(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** `dir/*.ext` and exact paths: all the manifest needs. */
function matcher(pattern: string): (path: string) => boolean {
  const source = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^/]*');
  const expression = new RegExp(`^${source}$`);
  return (path) => expression.test(path);
}

const listed = manifest.assets.flatMap((asset) => asset.paths.map(matcher));
const isListed = (path: string): boolean => listed.some((matches) => matches(path));
const repoFiles = (directory: string): string[] =>
  walk(join(root, directory)).map((file) => relative(root, file).split('\\').join('/'));

describe('the asset manifest', () => {
  it('names every asset once, with what it is and how it was made', () => {
    const ids = manifest.assets.map((asset) => asset.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const asset of manifest.assets) {
      expect(asset.what.length, asset.id).toBeGreaterThan(5);
      expect(asset.madeWith.length, asset.id).toBeGreaterThan(5);
      expect(asset.paths.length, asset.id).toBeGreaterThan(0);
      expect(['original', 'derived', 'third-party'], asset.id).toContain(asset.origin);
    }
  });

  it('points only at files that exist', () => {
    const everything = [
      ...repoFiles('src'),
      ...repoFiles('public'),
      ...repoFiles('node_modules/@fontsource-variable'),
    ];
    for (const asset of manifest.assets) {
      for (const pattern of asset.paths) {
        expect(everything.some(matcher(pattern)), `${asset.id}: ${pattern}`).toBe(true);
      }
    }
  });

  it('lists everything in src/assets and public: nothing ships unlisted', () => {
    const unlisted = [...repoFiles('src/assets'), ...repoFiles('public')].filter(
      (file) => !isListed(file),
    );
    expect(unlisted).toEqual([]);
  });

  it('finds no picture, font, sound or model anywhere else in the source', () => {
    const binary =
      /\.(png|jpe?g|gif|webp|avif|svg|woff2?|ttf|otf|mp3|ogg|wav|m4a|webm|mp4|glb|gltf|bin|ktx2?|hdr|exr)$/i;
    const stray = repoFiles('src').filter((file) => binary.test(file) && !isListed(file));
    expect(stray).toEqual([]);
  });

  it('gives a source, a holder and a licence for everything that came from elsewhere', () => {
    // "Public-Domain" is for what its makers have put in the public domain in their own words, where there is
    // no licence to name: Natural Earth's map data, which the continents' outlines are made from.
    const allowed = ['OFL-1.1', 'MIT', 'Apache-2.0', 'CC0-1.0', 'CC-BY-4.0', 'Public-Domain'];
    for (const asset of manifest.assets) {
      if (asset.origin === 'third-party') {
        expect(asset.source, asset.id).toBeTruthy();
        expect(asset.holder, asset.id).toBeTruthy();
        expect(allowed, `${asset.id}: ${asset.licence}`).toContain(asset.licence);
      } else {
        expect(asset.licence, asset.id).toBe('Project');
      }
    }
  });

  it('names the version of each font package that is actually installed', () => {
    for (const asset of manifest.assets.filter((entry) => entry.kind === 'font')) {
      const [, name, version] = /^npm (\S+) (\S+)$/.exec(asset.source ?? '') ?? [];
      expect(name, asset.id).toBeTruthy();
      expect(pkg.dependencies[name ?? ''], asset.id).toBe(version);
    }
  });
});

describe('hot links', () => {
  it('are nowhere: no file the game ships refers to another site', () => {
    // XML namespaces are names, not addresses; nothing is fetched from them.
    const harmless =
      /https?:\/\/www\.w3\.org\/(2000\/svg|1999\/xlink|1999\/xhtml|XML\/1998\/namespace)/g;
    const text = /\.(tsx?|css|json|html|svg|webmanifest|txt|md)$/;
    const offenders: string[] = [];
    for (const file of [...repoFiles('src'), ...repoFiles('public'), 'index.html']) {
      if (!text.test(file)) continue;
      const content = readFileSync(join(root, file), 'utf8').replace(harmless, '');
      const found = content.match(/(?:https?:)?\/\/[a-z0-9-]+(\.[a-z0-9-]+)+[^\s"'`)]*/gi);
      if (found) offenders.push(`${file}: ${found.slice(0, 3).join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });
});
