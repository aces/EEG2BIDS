const {app} = require('electron');
const {
  createMainWindow,
  getMainWindow,
  isAllowedRendererUrl,
} = require('./windows');
const {registerIpcHandlers} = require('./ipc');

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
  createMainWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (!getMainWindow()) {
    createMainWindow();
  }
});
