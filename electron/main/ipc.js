const {BrowserWindow, dialog, ipcMain} = require('electron');
const {createSettingsWindow} = require('./windows');
const credentials = require('./credentials');
const {openExternal} = require('./external-links');
const backendService = require('./backend-service');

/**
 * Register all IPC channels exposed to the renderer through the preload
 * bridge. Inputs and results are plain serializable values only.
 */
const registerIpcHandlers = () => {
  ipcMain.on('settings:open-window', () => {
    createSettingsWindow();
  });

  ipcMain.handle('dialog:select-directory', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('links:open-external', (event, url) => openExternal(url));

  ipcMain.handle('backend:get-status', () => backendService.getStatus());

  ipcMain.handle('credentials:get', () => credentials.get());
  ipcMain.handle('credentials:set', (event, values) =>
    credentials.set(values));
  ipcMain.handle('credentials:remove', () => credentials.remove());
};

module.exports = {registerIpcHandlers};
