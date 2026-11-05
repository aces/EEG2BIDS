const {BrowserWindow, dialog, ipcMain, shell} = require('electron');
const credentials = require('./credentials');
const backendService = require('./backend-service');
const {
  scanDirectory, saveBatchFile, openBatchFile, statPaths,
} = require('./batch-io');

// The only external destinations the renderer may open. Validation happens
// here in the main process; the renderer only ever passes a string.
const ALLOWED_EXTERNAL_URLS = new Set([
  'https://bids.neuroimaging.io',
  'https://github.com/aces/eeg2bids',
  'https://github.com/aces/eeg2bids/issues',
  'https://mne.tools/mne-bids/',
  'https://mcin.ca',
]);

/**
 * Register all IPC channels exposed to the renderer through the preload
 * bridge. Inputs and results are plain serializable values only.
 */
const registerIpcHandlers = () => {
  ipcMain.handle('dialog:select-directory', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
    });
    return result.filePaths[0] ?? null;
  });

  ipcMain.handle('discovery:scan-directory',
      (event, root) => scanDirectory(root));
  ipcMain.handle('batch:save', (event, payload) =>
    saveBatchFile(BrowserWindow.fromWebContents(event.sender), payload));
  ipcMain.handle('batch:open', (event) =>
    openBatchFile(BrowserWindow.fromWebContents(event.sender)));
  ipcMain.handle('files:stat', (event, paths) => statPaths(paths));

  ipcMain.handle('links:open-external', async (event, url) => {
    if (!ALLOWED_EXTERNAL_URLS.has(url)) {
      console.warn(`[links] blocked external URL: ${url}`);
      return false;
    }
    await shell.openExternal(url);
    return true;
  });

  ipcMain.handle('backend:get-status', () => backendService.getStatus());
  ipcMain.handle('backend:restart', () => backendService.restart());

  ipcMain.handle('credentials:get', () => credentials.get());
  ipcMain.handle('credentials:set', (event, values) => credentials.set(values));
  ipcMain.handle('credentials:remove', () => credentials.remove());
};

module.exports = {registerIpcHandlers};
