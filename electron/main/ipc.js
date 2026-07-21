const {BrowserWindow, dialog, ipcMain} = require('electron');
const {createSettingsWindow} = require('./windows');
const credentials = require('./credentials');
const {openExternal} = require('./external-links');
const backendService = require('./backend-service');
const {scanDirectory} = require('./discovery');

/**
 * Register an invocable IPC channel. Failures are logged in the launching
 * terminal before propagating to the renderer, so handler errors are
 * visible during development without opening DevTools.
 * @param {string} channel - the IPC channel name
 * @param {Function} handler - the channel handler
 */
const handle = (channel, handler) => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      console.error(`[electron:main] ipc ${channel} failed:`, error);
      throw error;
    }
  });
};

/**
 * Register all IPC channels exposed to the renderer through the preload
 * bridge. Inputs and results are plain serializable values only.
 */
const registerIpcHandlers = () => {
  ipcMain.on('settings:open-window', () => {
    createSettingsWindow();
  });

  handle('dialog:select-directory', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  handle('discovery:scan-directory', (event, root) => scanDirectory(root));

  handle('links:open-external', (event, url) => openExternal(url));

  handle('backend:get-status', () => backendService.getStatus());
  handle('backend:restart', () => backendService.restart());

  handle('credentials:get', () => credentials.get());
  handle('credentials:set', (event, values) => credentials.set(values));
  handle('credentials:remove', () => credentials.remove());
};

module.exports = {registerIpcHandlers};
