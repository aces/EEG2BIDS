const {defineConfig} = require('@playwright/test');

// Linux-first Playwright Electron integration suite (see electron/tests/).
// Automated Electron coverage initially targets the supported Linux
// development environment; cross-platform packaging is out of scope.
//
// Tests drive the production renderer build (npm run test:electron runs the
// build first). They must not assume the fixed development port 7301 and must
// never touch the real user's credentials — the launch fixture reserves a free
// port and an isolated userData directory for every app instance.
module.exports = defineConfig({
  testDir: './electron/tests',
  // Electron app instances share this machine's single display and the same
  // repo checkout; run serially to keep backend ports and process ownership
  // unambiguous.
  workers: 1,
  fullyParallel: false,
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
