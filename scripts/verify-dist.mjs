// Checks the production build the way a release would be checked: is it whole, is it lean, is it safe to serve under
// the headers in vercel.json, and is the 3D code really kept out of the first load?
//
//   npm run build && npm run verify:dist
//
// Plain Node, no dependencies. Exits non-zero if anything fails, so CI can gate on it.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

/**
 * Size budgets, in kilobytes after gzip (what actually crosses the network). They are set a little above what the
 * build measures today, so that a regression fails here instead of being discovered on a phone. Raise one on purpose,
 * with a reason in the commit, or not at all.
 */
const BUDGET_KB = {
  /** Script the first paint waits for: the entry and everything it imports statically. */
  initialScript: 110,
  initialStyles: 12,
  fonts: 80,
  /** three.js, React Three Fiber, Drei and the harbour scene: fetched after the shell, only where WebGL works. */
  hub3d: 290,
  /** The pictures of the islands the hub shows first (WebP, already compressed, so measured as they are). */
  hubPictures: 330,
  /** Any other on-demand chunk (a world, the lesson frame, the grown-ups area, a content pack). */
  lazyChunk: 30,
  /**
   * Everything in dist but the voice and the content, uncompressed: the game itself. It grows when code or
   * pictures are added, and a jump in it is a library or a picture that was not meant to be there.
   */
  totalRaw: 2700,
  /**
   * The content together, uncompressed: every challenge of every world, written out, and the outlines of the
   * continents for Explorer Harbor's globe. This is meant to grow, an activity at a time; each pack is fetched
   * only on entering its world, and has to fit `lazyChunk`, as the outlines do.
   */
  contentRaw: 900,
  /** One clip of the voice (MP3, measured as it is): a sentence or a word, never a recording of any length. */
  voiceClip: 60,
  /** Every clip of the voice together. Each is fetched only when it is first wanted, and kept after that. */
  voiceTotal: 9000,
};

/** Chunks that must never be part of the first load. */
const LAZY_ONLY = [
  /^three-/,
  /^r3f-/,
  /^Hub3D-/,
  /^harbour-/,
  /^Studio-/,
  /^GuideSheet-/,
  /^WorldView-/,
  /^LessonView-/,
  /^GrownUps-/,
  /^VoiceCheck-/,
  /^engine-play-/,
  // A world's own code and its content pack, whichever world it is.
  /^(reading-cove|number-garden|robot-ridge|memory-forest|inventor-island|explorer-harbor)/,
];
const HUB_3D = [/^three-/, /^r3f-/, /^Hub3D-/, /^harbour-/];

const failures = [];
const notes = [];
const check = (ok, message) => {
  if (ok) notes.push(`  ok    ${message}`);
  else failures.push(message);
};
const kb = (bytes) => Math.round((bytes / 1024) * 10) / 10;
const gzipSize = (file) => gzipSync(readFileSync(file)).length;

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html is missing. Run `npm run build` first.');
  process.exit(1);
}

const files = walk(dist);
const relativeFiles = files.map((file) => relative(dist, file).split('\\').join('/'));
const html = readFileSync(join(dist, 'index.html'), 'utf8');

// --- 1. The page refers only to files that exist ----------------------------------------------------------------------

const attributes = (pattern) => [...html.matchAll(pattern)].map((match) => match[1]);
const scripts = attributes(/<script\b[^>]*\bsrc="([^"]+)"/g);
const styles = attributes(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/g);
const preloads = attributes(/<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"/g);
const otherLinks = attributes(/<link\b[^>]*\bhref="([^"]+)"/g).filter(
  (href) => !styles.includes(href) && !preloads.includes(href),
);
const inDist = (url) => relativeFiles.includes(url.replace(/^\//, ''));

check(scripts.length === 1, `index.html loads exactly one entry script (found ${scripts.length})`);
for (const url of [...scripts, ...styles, ...preloads, ...otherLinks]) {
  check(inDist(url), `index.html refers to ${url}, which exists`);
}
for (const url of [...scripts, ...styles, ...preloads]) {
  check(
    url.startsWith('/immutable/'),
    `${url} is served from /immutable/ (absolute, so deep links work)`,
  );
}

// --- 2. Nothing inline, so the Content-Security-Policy can stay strict -------------------------------------------------

check(!/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(html), 'index.html has no inline script');
check(!/<style\b/i.test(html), 'index.html has no inline <style>');
check(!/\sstyle="/i.test(html), 'index.html has no style attributes');
check(!/\son[a-z]+="/i.test(html), 'index.html has no inline event handlers');

// --- 3. What the first load really pulls in ----------------------------------------------------------------------------

/** Static imports of a built chunk (not `import(...)`, which is on demand). */
function staticImports(file) {
  const source = readFileSync(join(dist, file), 'utf8');
  const found = new Set();
  for (const match of source.matchAll(
    /(?:^|[;}\s])import\s*(?:[^"'()]*?\bfrom\s*)?["'](\.{1,2}\/[^"']+)["']/g,
  )) {
    found.add(posix.normalize(posix.join(posix.dirname(file), match[1])));
  }
  return [...found];
}

const initial = new Set();
const queue = [...scripts, ...preloads].map((url) => url.replace(/^\//, ''));
while (queue.length > 0) {
  const file = queue.pop();
  if (initial.has(file)) continue;
  initial.add(file);
  if (inDist(file)) queue.push(...staticImports(file));
}
const baseName = (file) => file.split('/').pop();

for (const file of initial) {
  const lazy = LAZY_ONLY.find((pattern) => pattern.test(baseName(file)));
  check(
    !lazy,
    `first load does not include ${baseName(file)}${lazy ? ' (it must load on demand)' : ''}`,
  );
}
const allScripts = relativeFiles.filter(
  (file) => file.endsWith('.js') && file.startsWith('immutable/'),
);
for (const group of HUB_3D) {
  check(
    allScripts.some((file) => group.test(baseName(file))),
    `the build has a separate ${group.source.replace(/[\^\\-]/g, '')} chunk`,
  );
}

// --- 4. Budgets --------------------------------------------------------------------------------------------------------

const sum = (list, measure) => list.reduce((total, file) => total + measure(join(dist, file)), 0);
const initialScript = sum([...initial], gzipSize);
const initialStyles = sum(
  styles.map((url) => url.replace(/^\//, '')),
  gzipSize,
);
const fontFiles = relativeFiles.filter((file) => /\.woff2?$/.test(file));
const fonts = sum(fontFiles, (file) => statSync(file).size);
const hubFiles = allScripts.filter((file) =>
  HUB_3D.some((pattern) => pattern.test(baseName(file))),
);
const hub3d = sum(hubFiles, gzipSize);
const clips = relativeFiles.filter((file) => /^immutable\/.*\.mp3$/.test(file));
// A content pack is built as a chunk named after its file: number-garden.v3-<hash>.js.
const packs = relativeFiles.filter((file) => /^immutable\/[a-z-]+\.v\d+-[\w-]+\.js$/.test(file));
// The outlines of the continents, for Explorer Harbor's globe, are content as the packs are: a chunk of their own
// (vite.config.ts), fetched with that world.
const atlas = relativeFiles.filter((file) => /^immutable\/atlas-[\w-]+\.js$/.test(file));
const content = [...packs, ...atlas];
const totalRaw = sum(
  relativeFiles.filter((file) => !clips.includes(file) && !content.includes(file)),
  (file) => statSync(file).size,
);
const contentRaw = sum(content, (file) => statSync(file).size);
const voiceTotal = sum(clips, (file) => statSync(file).size);

const within = (label, bytes, budget) =>
  check(bytes <= budget * 1024, `${label}: ${kb(bytes)} kB of ${budget} kB`);
within('first-load script (gzip)', initialScript, BUDGET_KB.initialScript);
within('first-load styles (gzip)', initialStyles, BUDGET_KB.initialStyles);
within('fonts', fonts, BUDGET_KB.fonts);
within('3D hub chunks (gzip)', hub3d, BUDGET_KB.hub3d);
const pictures = relativeFiles.filter((file) => /^immutable\/.*\.webp$/.test(file));
check(pictures.length >= 7, `the build has the hub's pictures (${pictures.length} WebP files)`);
within(
  'hub pictures',
  sum(pictures, (file) => statSync(file).size),
  BUDGET_KB.hubPictures,
);
within(
  'whole build without the voice and the content (uncompressed)',
  totalRaw,
  BUDGET_KB.totalRaw,
);
check(packs.length >= 7, `the build has a content pack for each world (${packs.length} of them)`);
check(
  atlas.length === 1,
  `the outlines of the continents are one file of their own (${atlas.length})`,
);
within(
  `the content, ${packs.length} packs and the atlas (uncompressed)`,
  contentRaw,
  BUDGET_KB.contentRaw,
);
within(`the voice, ${clips.length} clips`, voiceTotal, BUDGET_KB.voiceTotal);
const largestClip = clips.reduce(
  (largest, file) => Math.max(largest, statSync(join(dist, file)).size),
  0,
);
within('the largest clip of the voice', largestClip, BUDGET_KB.voiceClip);
// The first screen says nothing: no clip is named by anything the first load fetches.
for (const file of initial) {
  if (!inDist(file)) continue;
  check(
    !/\.mp3["'`]/.test(readFileSync(join(dist, file), 'utf8')),
    `${baseName(file)} names no clip of the voice (the voice loads with a lesson, not before)`,
  );
}
for (const file of allScripts) {
  if (initial.has(file) || hubFiles.includes(file)) continue;
  within(
    `on-demand chunk ${baseName(file)} (gzip)`,
    gzipSize(join(dist, file)),
    BUDGET_KB.lazyChunk,
  );
}

// --- 5. Cache rules match what was built --------------------------------------------------------------------------------

const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
check(vercel.outputDirectory === 'dist', 'vercel.json serves dist');
const immutableRule = (vercel.headers ?? []).find((rule) => rule.source === '/immutable/(.*)');
check(
  immutableRule?.headers?.some(
    (header) => header.key === 'Cache-Control' && /immutable/.test(header.value),
  ),
  'vercel.json caches /immutable/ forever',
);
for (const file of relativeFiles.filter((name) => name.startsWith('immutable/'))) {
  check(/-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(file), `${file} has a content hash in its name`);
}
const policy = (vercel.headers ?? [])
  .flatMap((rule) => rule.headers)
  .find((header) => header.key === 'Content-Security-Policy')?.value;
check(
  Boolean(policy) && !/unsafe-inline|unsafe-eval/.test(policy),
  'the Content-Security-Policy allows nothing inline',
);

// --- 6. Nothing that should not ship ------------------------------------------------------------------------------------

check(!relativeFiles.some((file) => file.endsWith('.map')), 'no source maps are published');
check(!relativeFiles.some((file) => /(^|\/)\.env/.test(file)), 'no .env file is published');
for (const file of allScripts) {
  const source = readFileSync(join(dist, file), 'utf8');
  check(
    !/https?:\/\/(localhost|127\.0\.0\.1)/.test(source),
    `${baseName(file)} has no development URL in it`,
  );
}

// --- 7. Installable-app metadata ----------------------------------------------------------------------------------------

try {
  const manifest = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8'));
  check(
    manifest.start_url === '/' && manifest.scope === '/',
    'the web manifest starts at / and covers the whole site',
  );
  for (const icon of manifest.icons ?? [])
    check(inDist(icon.src), `manifest icon ${icon.src} exists`);
  check(
    (manifest.icons ?? []).some((icon) => icon.sizes === '512x512'),
    'the manifest has a 512 px icon',
  );
} catch {
  check(false, 'dist/manifest.webmanifest exists and is valid JSON');
}

// --- 8. The service worker, if there is one -----------------------------------------------------------------------------

if (inDist('sw.js')) {
  const worker = readFileSync(join(dist, 'sw.js'), 'utf8');
  const firstLine = worker.slice(0, worker.indexOf('\n'));
  let build = null;
  try {
    build = JSON.parse(firstLine.replace(/^const BUILD = /, '').replace(/;$/, ''));
  } catch {
    // Reported by the check below.
  }
  check(build !== null && Array.isArray(build.shell), 'sw.js starts with its build manifest');
  if (build) {
    for (const url of new Set([...build.shell, ...build.immutable])) {
      check(url === '/' || inDist(url), `the service worker's ${url} exists`);
    }
    // At install the worker fetches the first screen and nothing else: no 3D code, no world a child may never open.
    const shellScripts = build.shell
      .filter((url) => url.endsWith('.js'))
      .map((url) => url.replace(/^\//, ''));
    check(
      shellScripts.length === initial.size && shellScripts.every((file) => initial.has(file)),
      'the service worker pre-downloads exactly the first-load scripts',
    );
    check(
      relativeFiles
        .filter((file) => file.startsWith('immutable/'))
        .every((file) => build.immutable.includes(`/${file}`)),
      'the service worker knows every content-hashed file of this build',
    );
  }
  check(
    (vercel.headers ?? []).some(
      (rule) => rule.source === '/sw.js' && rule.headers.some((h) => /max-age=0/.test(h.value)),
    ),
    'vercel.json never lets sw.js be cached',
  );
}

// --- Report -------------------------------------------------------------------------------------------------------------

console.log('Build contents (gzip, kB):');
for (const file of allScripts.sort()) {
  const tag = initial.has(file) ? 'first load' : hubFiles.includes(file) ? '3D hub' : 'on demand';
  console.log(
    `  ${String(kb(gzipSize(join(dist, file)))).padStart(7)}  ${tag.padEnd(10)}  ${file}`,
  );
}
console.log(
  `\nFirst load: ${kb(initialScript)} kB script + ${kb(initialStyles)} kB styles (gzip), ${kb(fonts)} kB fonts.` +
    `\n3D hub: ${kb(hub3d)} kB (gzip), on demand. The game: ${kb(totalRaw)} kB uncompressed; its content, ` +
    `${packs.length} packs and the atlas: ${kb(contentRaw)} kB. ${relativeFiles.length} files in all. ` +
    `The voice: ${clips.length} clips, ${kb(voiceTotal)} kB.\n`,
);
console.log(notes.join('\n'));

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED:`);
  for (const failure of failures) console.error(`  FAIL  ${failure}`);
  process.exit(1);
}
console.log(`\nAll ${notes.length} checks passed.`);
