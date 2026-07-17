const {app} = require('electron');
const {createMainWindow, getMainWindow} = require('./windows');
const {registerIpcHandlers} = require('./ipc');

registerIpcHandlers();

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
