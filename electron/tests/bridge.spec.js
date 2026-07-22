const {test, expect} = require('./fixtures');

// The complete preload bridge contract exposed to the renderer as
// window.eeg2bids. The exact set of member names is asserted, so adding or
// removing a bridge method without updating this test fails. (Function arity
// is not checked: contextBridge wraps every exposed function and does not
// preserve its declared parameter count.)
const EXPECTED_API = [
  'getBackendPort',
  'getPathForFile',
  'selectDirectory',
  'scanDirectory',
  'saveBatchFile',
  'openBatchFile',
  'statPaths',
  'openExternal',
  'getLorisAuthenticationCredentials',
  'setLorisAuthenticationCredentials',
  'removeLorisAuthenticationCredentials',
  'openSettings',
  'getBackendStatus',
  'restartBackend',
  'onBackendStatusChange',
];

test('preload exposes exactly the expected bridge API', async ({
  mainWindow,
}) => {
  const api = await mainWindow.evaluate(() => {
    const bridge = window.eeg2bids;
    return Object.keys(bridge).map((key) => [key, typeof bridge[key]]);
  });
  const names = api.map(([key]) => key);

  // Exact member set, nothing extra and nothing missing.
  expect(names.sort()).toEqual([...EXPECTED_API].sort());

  // Every member is a function.
  for (const [key, type] of api) {
    expect(type, `${key} should be a function`).toBe('function');
  }
});

test('getBackendPort returns the configured, isolated port', async ({
  mainWindow, backendPort,
}) => {
  const port = await mainWindow.evaluate(
      () => window.eeg2bids.getBackendPort(),
  );
  expect(port).toBe(backendPort);
  // The suite must not depend on the fixed development port.
  expect(port).not.toBe(7301);
});
