import {defineConfig} from 'vitest/config';

// Pure renderer logic runs quickly in Node. UI and Electron integration
// behavior remains covered by the Playwright suite.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
