const {test, expect} = require('./fixtures');

// Smoke test: the app launches against the production renderer build and the
// renderer reaches a stable readiness state. The fixture owns clean shutdown
// and the isolated port/userData directory.
test('launches and renders the app', async ({mainWindow}) => {
  // The readiness anchor is always present once the renderer mounts.
  const appRoot = mainWindow.locator('[data-testid="app-root"]');
  await expect(appRoot).toBeAttached();

  // The splash screen advances to the Welcome step on its own, confirming the
  // renderer is running rather than merely loaded.
  await expect(appRoot).toHaveAttribute('data-appmode', 'Welcome');
});
