const {test, expect, canConnect, launchElectron} = require('./fixtures');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Generous because the very first `uv run` may build the Python environment;
// the fail-fast test proves failures do not depend on any timeout.
const CONNECT_TIMEOUT = 120000;

test.describe('backend', () => {
  test('starts, opens its port, and the renderer connects', async ({
    mainWindow, backendPort,
  }) => {
    const status = mainWindow.locator('[data-testid="backend-status"]');

    // Renderer Socket.IO connection: the status anchor reaches 'connected'
    // only when the socket actually connects to the backend.
    await expect(status).toHaveAttribute(
        'data-state', 'connected', {timeout: CONNECT_TIMEOUT},
    );

    // Backend port availability, verified independently of the renderer.
    expect(await canConnect(backendPort)).toBe(true);

    // The main process considers the backend running (port accepting
    // connections), not merely spawned. Its readiness poll can lag the
    // renderer's socket connecting by up to one poll interval, so converge.
    await expect.poll(async () => {
      const s = await mainWindow.evaluate(
          () => window.eeg2bids.getBackendStatus(),
      );
      return s.state;
    }, {timeout: 10000}).toBe('running');
  });

  test('a failed backend surfaces immediately, not via timeout', async ({
    backendPort,
  }) => {
    // Point PATH at an empty directory so `uv` cannot be found: the spawn
    // errors out at once, exercising the fail-fast path rather than a hang.
    const emptyPath = fs.mkdtempSync(
        path.join(os.tmpdir(), 'eeg2bids-nopath-'),
    );
    const userDataDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'eeg2bids-userdata-'),
    );
    const app = await launchElectron({
      backendPort,
      userDataDir,
      env: {PATH: emptyPath},
    });
    try {
      const window = await app.firstWindow();
      const status = window.locator('[data-testid="backend-status"]');

      // Well under the suite timeout: the failure is reported promptly.
      await expect(status).toHaveAttribute(
          'data-state', 'unavailable', {timeout: 30000},
      );

      const backend = await window.evaluate(
          () => window.eeg2bids.getBackendStatus(),
      );
      expect(backend.state).toBe('failed');
      // The message is actionable, naming uv rather than a bare timeout.
      expect(backend.error).toContain('uv');

      // The failed port never came up.
      expect(await canConnect(backendPort)).toBe(false);
    } finally {
      await app.close();
      fs.rmSync(emptyPath, {recursive: true, force: true});
      fs.rmSync(userDataDir, {recursive: true, force: true});
    }
  });
});
