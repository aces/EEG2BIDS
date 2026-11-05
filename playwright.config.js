const {defineConfig} = require('@playwright/test');

// Playwright Electron integration suite; see electron/tests/fixtures.js.
module.exports = defineConfig({
  testDir: './electron/tests',
  // Electron app instances share this machine's single display and the same
  // repo checkout; run serially to keep backend ports and process ownership
  // unambiguous.
  workers: 1,
  // The first launch may run `uv run`, which can build the Python environment;
  // allow a generous per-test budget. Individual waits still fail fast when the
  // backend reports a failed state.
  timeout: 180000,
  expect: {timeout: 15000},
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure',
  },
});
