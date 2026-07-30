const {app} = require('electron');
const {
  createMainWindow,
  getMainWindow,
  isAllowedRendererUrl,
} = require('./windows');
const {registerIpcHandlers} = require('./ipc');
const backendService = require('./backend-service');

// Redirect all user data (settings + encrypted credentials) to an isolated
// directory when asked. Integration tests point this at a temporary dir so
// they can never read or modify the real user's credentials. This must run
// before anything reads app.getPath('userData').
if (process.env.EEG2BIDS_USER_DATA_DIR) {
  app.setPath('userData', process.env.EEG2BIDS_USER_DATA_DIR);
}

registerIpcHandlers();

// Renderer content is untrusted: windows may only show our own renderer,
// never open new windows, and never attach webviews. External links go
// through the allowlisted 'links:open-external' IPC channel instead.
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => ({action: 'deny'}));
  contents.on('will-navigate', (navigation, targetUrl) => {
    if (!isAllowedRendererUrl(targetUrl)) {
      navigation.preventDefault();
    }
  });
  contents.on('will-attach-webview', (navigation) => {
    navigation.preventDefault();
  });
});

// Surface actionable diagnostics when a child process dies abnormally. A
// Chromium sandbox that cannot initialize — for example an installed sandbox
// helper or AppArmor profile that is missing or misconfigured — shows up here
// as a renderer or GPU process that fails to launch or crashes at startup,
// rather than as a blank window with no explanation. A hard sandbox abort can
// still take the whole process down before these fire; in that case Chromium
// prints its own SUID-sandbox message to stderr. Launch from a terminal to see
// either. Never work around it with --no-sandbox.
const SANDBOX_HINT =
  'If this occurred at startup it may be a Chromium sandbox failure. Do not ' +
  'launch with --no-sandbox; see docs/installation.md for supported ' +
  'environments and sandbox setup.';

app.on('render-process-gone', (event, webContents, details) => {
  if (details.reason === 'clean-exit') {
    return;
  }
  console.error(
      `[electron:main] renderer process gone (reason: ${details.reason}, ` +
      `exitCode: ${details.exitCode}). ${SANDBOX_HINT}`,
  );
});

app.on('child-process-gone', (event, details) => {
  if (details.reason === 'clean-exit') {
    return;
  }
  console.error(
      `[electron:main] ${details.type} process gone (reason: ` +
      `${details.reason}). ${SANDBOX_HINT}`,
  );
});

app.whenReady().then(() => {
  console.info('[electron:main] app ready, starting backend and main window');
  backendService.start();
  createMainWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

// Hold quit until the owned backend process group is terminated, so no
// python process is ever orphaned.
app.on('will-quit', (event) => {
  if (backendService.isRunning()) {
    console.info('[electron:main] quitting, stopping the backend process');
    event.preventDefault();
    backendService.stop().then(() => app.quit());
  }
});

app.on('activate', () => {
  if (!getMainWindow()) {
    createMainWindow();
  }
});

// A terminal Ctrl+C or kill must go through the ordinary quit path, so the
// detached backend process group is terminated rather than orphaned.
['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    console.info(`[electron:main] received ${signal}, quitting`);
    app.quit();
  });
});
