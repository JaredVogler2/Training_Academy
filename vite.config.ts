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
              // The harbour itself: the modelling kit, the islands, the water. The hub and the studio both use it,
              // and each stays a small chunk of its own that asks for this one.
              name: 'harbour',
              test: /src[\\/]render[\\/]hub3d[\\/](?!Hub3D\.|Studio\.)/,
              priority: 5,
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
    port: 4173,
    strictPort: true,
  },
});
