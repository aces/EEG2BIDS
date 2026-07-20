const {test, expect} = require('./fixtures');
const fs = require('fs');
const path = require('path');

// Credential save/read/remove against an isolated userData directory. The
// real user's credentials can never be reached: app.setPath('userData', ...)
// is verified to point at the throwaway directory. safeStorage is stubbed at
// the runtime boundary because this environment has no OS secret service; the
// test therefore exercises the persistence and isolation logic only and makes
// no claim that the stored file is securely encrypted. (On headless Linux the
// real backend may fall back to --password-store=basic, which likewise does
// NOT provide secure storage.)
test('saves, reads, and removes credentials in isolation', async ({
  electronApp, mainWindow, userDataDir,
}) => {
  // Isolation guarantee: user data is redirected to the throwaway directory.
  const resolved = await electronApp.evaluate(
      ({app}) => app.getPath('userData'),
  );
  expect(resolved).toBe(userDataDir);

  // Replace real OS encryption with a reversible marker so the round-trip is
  // deterministic on any machine. This does not encrypt anything.
  await electronApp.evaluate(({safeStorage}) => {
    safeStorage.isEncryptionAvailable = () => true;
    safeStorage.getSelectedStorageBackend = () => 'basic_text';
    safeStorage.encryptString = (s) => Buffer.from('stub:' + s, 'utf8');
    safeStorage.decryptString = (b) =>
      Buffer.from(b).toString('utf8').replace(/^stub:/, '');
  });

  const encFile = path.join(userDataDir, 'loris-credentials.enc');
  expect(fs.existsSync(encFile)).toBe(false);

  await mainWindow.evaluate(() => window.eeg2bids
      .setLorisAuthenticationCredentials({
        lorisURL: 'https://loris.example',
        lorisUsername: 'test-user',
        lorisPassword: 'test-pass',
      }));

  // The encrypted file lands only in the isolated directory.
  expect(fs.existsSync(encFile)).toBe(true);

  const got = await mainWindow.evaluate(
      () => window.eeg2bids.getLorisAuthenticationCredentials(),
  );
  expect(got).toEqual({
    lorisURL: 'https://loris.example',
    lorisUsername: 'test-user',
    lorisPassword: 'test-pass',
  });

  await mainWindow.evaluate(
      () => window.eeg2bids.removeLorisAuthenticationCredentials(),
  );
  expect(fs.existsSync(encFile)).toBe(false);

  const after = await mainWindow.evaluate(
      () => window.eeg2bids.getLorisAuthenticationCredentials(),
  );
  expect(after).toEqual({
    lorisURL: '',
    lorisUsername: '',
    lorisPassword: '',
  });
});
