const {test: base, _electron: electron} = require('@playwright/test');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '../..');

/**
 * Reserve a currently-free loopback TCP port. The socket is released before
 * returning, so there is a small window in which the port could be taken by
 * something else; the suite runs serially to keep that unlikely, and the
 * backend service treats an occupied port as an externally managed backend
 * rather than failing.
 * @return {Promise<number>} an available port
 */
const reserveFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const {port} = server.address();
    server.close(() => resolve(port));
  });
});

// Playwright fixtures that launch the Electron app in isolation: every test
// gets a freshly reserved backend port and a throwaway userData directory, so
// tests never assume port 7301 is free and never read or modify the real
// user's credentials or settings.
const test = base.extend({
  // Playwright derives fixture dependencies from the destructured first
  // argument; these two have none, hence the empty pattern.
  // eslint-disable-next-line no-empty-pattern
  backendPort: async ({}, use) => {
    await use(await reserveFreePort());
  },

  // eslint-disable-next-line no-empty-pattern
  userDataDir: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eeg2bids-userdata-'));
    await use(dir);
    fs.rmSync(dir, {recursive: true, force: true});
  },

  electronApp: async ({backendPort, userDataDir}, use) => {
    const electronApp = await electron.launch({
      // Load the app from the repo root (package.json "main"); no DEV env, so
      // the production renderer build under build/ is used.
      args: [REPO_ROOT],
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        EEG2BIDS_BACKEND_PORT: String(backendPort),
        EEG2BIDS_USER_DATA_DIR: userDataDir,
      },
    });
    await use(electronApp);
    await electronApp.close();
  },

  mainWindow: async ({electronApp}, use) => {
    const window = await electronApp.firstWindow();
    await use(window);
  },
});

const {expect} = require('@playwright/test');

module.exports = {test, expect, REPO_ROOT, reserveFreePort};
