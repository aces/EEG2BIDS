const {contextBridge, ipcRenderer} = require('electron');

/**
 * contextBridge should be cautious of security risk.
 */
contextBridge.exposeInMainWorld('myAPI', {
  setLogger: () => ipcRenderer.invoke('set-logger', null),
  dialog: (props) => ipcRenderer.invoke('open-dialog', props),
  visitBIDS: () => ipcRenderer.invoke('shell-external', 'https://bids.neuroimaging.io'),
  visitGitHub: () => ipcRenderer.invoke('shell-external', 'https://github.com/aces/eeg2bids'),
  visitIssues: () => ipcRenderer.invoke('shell-external', 'https://github.com/aces/eeg2bids/issues'),
  visitMNE: () => ipcRenderer.invoke('shell-external', 'https://mne.tools/mne-bids/'),
  visitMCIN: () => ipcRenderer.invoke('shell-external', 'https://mcin.ca'),
  visitTemplates: () => ipcRenderer.invoke('shell-external', 'https://github.com/aces/eeg2bids/tree/main/templates'),
  getLorisAuthenticationCredentials: async () => await ipcRenderer.invoke('getLorisAuthenticationCredentials', null),
  setLorisAuthenticationCredentials: (credentials) => ipcRenderer.send('setLorisAuthenticationCredentials', credentials),
  removeLorisAuthenticationCredentials: () => ipcRenderer.send('removeLorisAuthenticationCredentials', null),
  openSettings: () => ipcRenderer.send('openSettingsWindow', null),
  convertMFFToSET: (mffDirectory) => ipcRenderer.invoke('mff-to-set-service', mffDirectory),
});