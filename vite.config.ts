/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // vedro is published as CommonJS with `exports.default`; inlining makes Vitest
    // apply the same ESM interop as Vite does in the browser.
    server: { deps: { inline: ['vedro'] } },
    restoreMocks: true,
  },
});
