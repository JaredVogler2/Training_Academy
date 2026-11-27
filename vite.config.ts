import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { serviceWorker } from './scripts/vite/service-worker.ts';
import { vercelParity } from './scripts/vite/vercel-parity.ts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

/**
 * A short label for "which build is this", shown to grown-ups under Diagnostics. It never changes what the build
 * does: preview and production deployments of one commit are byte-identical.
 */
function buildLabel(): string {
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromVercel) return fromVercel.slice(0, 7);
  try {
    return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return 'local';
  }
}

export default defineConfig({
  plugins: [react(), vercelParity(), serviceWorker()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_LABEL__: JSON.stringify(buildLabel()),
  },
  build: {
    // Everything Vite emits is content-hashed and lands in /immutable/, which vercel.json caches forever.
    // Files in public/assets keep their names and are revalidated instead.
    assetsDir: 'immutable',
    // A clip of the voice is a file of its own however small it is: written into a script as text it would be
    // downloaded with that script whether or not it is ever played, and could not be kept on its own for offline.
    assetsInlineLimit: (file) => (file.endsWith('.mp3') ? false : undefined),
    sourcemap: false,
    // three.js alone is larger than Vite's default warning threshold; scripts/verify-dist.mjs holds the real budgets.
    chunkSizeWarningLimit: 900,
    modulePreload: {
      // A part that is loaded on demand is fetched by its own `import()`, not by a <link rel="modulepreload"> that
      // Vite would otherwise add just before it. (Its stylesheet is still fetched alongside.) WebKit keeps a preload
      // that failed and hands the same failure to the next request for that file — even after the page is reloaded —
      // so one lost download could leave "Load the page again" unable to help. Found by the WebKit browser tests.
      // The first screen's own files are still preloaded from index.html.
      resolveDependencies: (_file, deps, { hostType }) =>
        hostType === 'js' ? deps.filter((dep) => dep.endsWith('.css')) : deps,
    },
    rolldownOptions: {
      treeshake: {
        // The learning engine is headless: importing one of its modules does nothing but make what it exports.
        // Said here, so that a file that only passes the engine's names on (src/engine/index.ts) is not built
        // to fetch and start every part of the engine "in case" starting them mattered. It was: the small file
        // with the seeded dice in it, which the harbour asks for, went on to ask for the whole lesson engine,
        // and the lesson engine asked for that file back. Every other module is judged as it always was.
        moduleSideEffects: [{ test: /src[\\/]engine[\\/][\w-]+\.ts$/, sideEffects: false }],
      },
      output: {
        codeSplitting: {
          // A group takes exactly the modules its test matches. (By default it would also take everything those
          // modules import, which pulled React itself into the 3D chunk and so the 3D chunk into the first load.
          // scripts/verify-dist.mjs fails the build if that ever happens again.)
          includeDependenciesRecursively: false,
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            { name: 'three', test: /node_modules[\\/]three[\\/]/, priority: 20 },
            {
              // React Three Fiber, Drei and what they bring with them.
              name: 'r3f',
              test: /node_modules[\\/](@react-three|three-stdlib|three-mesh-bvh|maath|zustand|suspend-react|its-fine|react-reconciler|react-use-measure|troika-[\w-]+|camera-controls|meshline|stats-gl|stats\.js|tunnel-rat|detect-gpu|hls\.js|@monogrid|@mediapipe|glsl-noise|bidi-js|webgl-sdf-generator|@use-gesture|use-sync-external-store|utility-types)[\\/]/,
              priority: 10,
            },
            {
              // The part of the engine that runs a lesson: judging answers, a robot's programs, the workbench
              // models, what the record shows, and how likely a blind answer is to be right. The first screen
              // needs none of it (it needs only the shapes of what is stored), so it is kept out of the chunk
              // the first screen fetches.
              //
              name: 'engine-play',
              test: /src[\\/]engine[\\/](session|tasks|robot|models|evidence|chance)\.ts$/,
              priority: 6,
            },
            {
              // The part of the engine that says what Play offers next: when a skill is worth coming back to,
              // what an activity asks for first, and the choice between them. It reads what the record shows,
              // so it waits for the part above, and nothing in the part above waits for it.
              //
              // It is named here, and not left to be gathered up with whatever else is shared, because that is
              // what once went wrong: gathered into one file with the seeded dice the lesson part needs, it
              // and the lesson part each waited for the other. Two files that wait for each other start up in
              // whichever order the page happens to ask for them, and the one that starts first reads the
              // other's constants before they are made: the grown-ups' page could not say what Play would
              // offer. scripts/verify-dist.mjs fails the build if any two files ever wait for each other again.
              name: 'engine-next',
              test: /src[\\/]engine[\\/](days|review|graph|recommend)\.ts$/,
              priority: 6,
            },
            {
              // The harbour itself: the modelling kit, the islands, the water. The hub and the studio both use it,
              // and each stays a small chunk of its own that asks for this one.
              name: 'harbour',
              test: /src[\\/]render[\\/]hub3d[\\/](?!Hub3D\.|Studio\.)/,
              priority: 5,
            },
            {
              // The outlines of the seven continents, for Explorer Harbor's globe: content, as a world's pack of
              // challenges is, and like a pack a file of its own, so that the world's code stays small and the
              // outlines are fetched once and kept. (scripts/verify-dist.mjs counts it with the content.)
              name: 'atlas',
              test: /src[\\/]content[\\/]explorer-harbor[\\/]atlas\.json$/,
              priority: 4,
            },
          ],
        },
      },
    },
  },
  preview: {
    // Vercel sends no CORS headers for static files, so neither does the preview.
    cors: false,
    host: '127.0.0.1',
    // The browser tests start this preview and expect it here (playwright.config.ts).
    port: Number(process.env.E2E_PORT ?? 4173),
    strictPort: true,
  },
});
