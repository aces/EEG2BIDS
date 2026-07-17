const {contextBridge, ipcRenderer} = require('electron');

// The only bridge between the renderer and the main process. Every
// operation goes through a fixed IPC channel and passes plain serializable
// values; no Electron objects are ever exposed to renderer code.
contextBridge.exposeInMainWorld('eeg2bids', {
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
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
