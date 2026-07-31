const {test, expect, launchElectron, REPO_ROOT} = require('./fixtures');
const path = require('path');

const BACKEND_SERVICE = path.join(
    REPO_ROOT, 'electron/main/backend-service.js',
);

/**
 * Whether a process (or, with a negative pid, a process group) still exists.
 * Signal 0 performs the permission/existence check without delivering a
 * signal; EPERM means the process exists but is not ours to signal.
 * @param {number} pid - the pid, or a negative process-group id
 * @return {boolean} true when the process/group is still present
 */
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
};

// Clean shutdown must leave no owned backend process behind. The owned pid is
// read from the app itself (the backend service tracks it), so the test never
// inspects or terminates unrelated Python processes.
test('shutdown terminates the owned backend process group', async ({
  backendPort, userDataDir,
}) => {
  const app = await launchElectron({backendPort, userDataDir});
  try {
    const window = await app.firstWindow();

    // Wait until the backend is actually up, so an owned pid exists.
    await expect(window.locator('[data-testid="backend-status"]'))
        .toHaveAttribute('data-state', 'connected', {timeout: 120000});

    const pid = await app.evaluate(
        // eslint-disable-next-line no-empty-pattern
        async ({}, modulePath) =>
          process.mainModule.require(modulePath).getOwnedPid(),
        BACKEND_SERVICE,
    );
    expect(typeof pid).toBe('number');
    expect(pid).toBeGreaterThan(0);
    expect(alive(pid)).toBe(true);
    // POSIX exposes the detached process group through a negative pid.
    // Windows process trees are terminated with taskkill /T instead.
    if (process.platform !== 'win32') {
      expect(alive(-pid)).toBe(true);
    }

    await app.close();

    if (process.platform !== 'win32') {
      await expect.poll(() => alive(-pid), {timeout: 8000}).toBe(false);
    }
    await expect.poll(() => alive(pid), {timeout: 8000}).toBe(false);
  } finally {
    // close() is idempotent enough here; guard against a still-open app if an
    // assertion threw before the explicit close above.
    await app.close().catch(() => {});
  }
});
