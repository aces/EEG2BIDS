const {test, expect} = require('./fixtures');

// Native OS boundaries (file dialogs, opening the browser, window creation)
// are intercepted at runtime with electronApp.evaluate, which stubs the
// shared electron `dialog`/`shell` objects the main process already captured.
// Nothing test-only ships in the app, and no real dialog or browser opens.

test.describe('directory selection', () => {
  test('returns the chosen directory', async ({electronApp, mainWindow}) => {
    await electronApp.evaluate(({dialog}, chosen) => {
      dialog.showOpenDialog = async () => (
        {canceled: false, filePaths: [chosen]}
      );
    }, '/tmp/eeg2bids-selected');

    const dir = await mainWindow.evaluate(
        () => window.eeg2bids.selectDirectory(),
    );
    expect(dir).toBe('/tmp/eeg2bids-selected');
  });

  test('returns null when cancelled', async ({electronApp, mainWindow}) => {
    await electronApp.evaluate(({dialog}) => {
      dialog.showOpenDialog = async () => ({canceled: true, filePaths: []});
    });

    const dir = await mainWindow.evaluate(
        () => window.eeg2bids.selectDirectory(),
    );
    expect(dir).toBeNull();
  });
});

test.describe('settings window', () => {
  test('opens a second window on the settings route', async ({
    electronApp, mainWindow,
  }) => {
    expect(electronApp.windows()).toHaveLength(1);

    const [settingsWindow] = await Promise.all([
      electronApp.waitForEvent('window'),
      mainWindow.evaluate(() => window.eeg2bids.openSettings()),
    ]);
    await settingsWindow.waitForLoadState('domcontentloaded');

    expect(electronApp.windows()).toHaveLength(2);
    expect(settingsWindow.url()).toContain('settings');
  });
});

test.describe('external links', () => {
  test('opens allowlisted URLs and rejects the rest', async ({
    electronApp, mainWindow,
  }) => {
    // Record openExternal calls instead of launching the developer's browser.
    await electronApp.evaluate(({shell}) => {
      global.__opened = [];
      shell.openExternal = async (url) => {
        global.__opened.push(url);
      };
    });

    const allowed = await mainWindow.evaluate(
        () => window.eeg2bids.openExternal('https://mcin.ca'),
    );
    const rejected = await mainWindow.evaluate(
        () => window.eeg2bids.openExternal('https://evil.example.com'),
    );
    const opened = await electronApp.evaluate(() => global.__opened);

    expect(allowed).toBe(true);
    expect(rejected).toBe(false);
    // Only the allowlisted URL reached the native boundary.
    expect(opened).toEqual(['https://mcin.ca']);
  });
});
