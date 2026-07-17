const {app} = require('electron');
const {
  createMainWindow,
  getMainWindow,
  isAllowedRendererUrl,
} = require('./windows');
const {registerIpcHandlers} = require('./ipc');
const backendService = require('./backend-service');

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
