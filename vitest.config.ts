import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
    __BUILD_LABEL__: JSON.stringify('test'),
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    // Engine, content and storage tests run headless in Node; component tests opt in to a DOM per file.
    environment: 'node',
    restoreMocks: true,
    testTimeout: 20_000,
  },
});
