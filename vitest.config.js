import {defineConfig} from 'vitest/config';

// Focused unit tests for the renderer's pure logic (currently the batch
// workbench manifest model). These exercise plain modules, so they run in a
// Node environment without the app's Vite/React/CSP plumbing. UI and
// integration behaviour is covered by the Playwright/Electron suite.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
