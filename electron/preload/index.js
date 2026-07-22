const {contextBridge, ipcRenderer, webUtils} = require('electron');

// The main process passes the configured backend port through
// additionalArguments as "--backend-port=NNNN"; fall back to 7301.
const backendPortArg = process.argv.find((arg) =>
  arg.startsWith('--backend-port='));
const backendPort = backendPortArg ?
  Number(backendPortArg.split('=')[1]) || 7301 : 7301;

// The only bridge between the renderer and the main process. Every
// operation goes through a fixed IPC channel and passes plain serializable
// values; no Electron objects are ever exposed to renderer code.
contextBridge.exposeInMainWorld('eeg2bids', {
  getBackendPort: () => backendPort,
  // Electron no longer exposes the native path as File.path. Resolve it in
  // the preload, where webUtils can safely unwrap a renderer File object.
  getPathForFile: (file) => webUtils.getPathForFile(file),
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  // Recursively list every file under a chosen root, for batch discovery.
  scanDirectory: (root) => ipcRenderer.invoke('discovery:scan-directory', root),
  // Save a serialized batch manifest to a user-chosen file; returns its path.
  saveBatchFile: (payload) => ipcRenderer.invoke('batch:save', payload),
  // Open a batch manifest file; returns {filePath, data} or null if cancelled.
  openBatchFile: () => ipcRenderer.invoke('batch:open'),
  // Stat source paths so a reopened manifest can be reconciled against disk.
  statPaths: (paths) => ipcRenderer.invoke('files:stat', paths),
  openExternal: (url) => ipcRenderer.invoke('links:open-external', url),
  getLorisAuthenticationCredentials: () =>
    ipcRenderer.invoke('credentials:get'),
  setLorisAuthenticationCredentials: (credentials) =>
    ipcRenderer.invoke('credentials:set', credentials),
  removeLorisAuthenticationCredentials: () =>
    ipcRenderer.invoke('credentials:remove'),
  openSettings: () => ipcRenderer.send('settings:open-window'),
  getBackendStatus: () => ipcRenderer.invoke('backend:get-status'),
  restartBackend: () => ipcRenderer.invoke('backend:restart'),
  onBackendStatusChange: (callback) => {
    ipcRenderer.on('backend:status', (event, status) => callback(status));
  },
});
