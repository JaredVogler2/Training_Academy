import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { vercelParity } from './scripts/vite/vercel-parity';

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
  plugins: [react(), vercelParity()],
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
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/, priority: 30 },
            {
              name: 'r3f',
              test: /node_modules[\\/](@react-three|three-stdlib|maath|zustand|suspend-react|its-fine|react-use-measure|troika-[\w-]+|camera-controls|meshline|stats-gl|stats\.js|tunnel-rat|detect-gpu|hls\.js|@monogrid|@mediapipe|glsl-noise|three-mesh-bvh|bidi-js|webgl-sdf-generator|@use-gesture|cross-env|utility-types|react-reconciler)[\\/]/,
              priority: 20,
            },
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
});
