const {contextBridge} = require('electron');

/**
 * contextBridge should be cautious of security risk.
 */
contextBridge.exposeInMainWorld('myAPI', {
  dialog: () => {
    const {dialog} = require('@electron/remote');
    return dialog;
  },
  visitBIDS: () => {
    const {shell} = require('electron');
    shell.openExternal('https://bids.neuroimaging.io');
  },
  visitGitHub: () => {
    const {shell} = require('electron');
    shell.openExternal('https://github.com/aces/eeg2bids');
  },
  visitIssues: () => {
    const {shell} = require('electron');
    shell.openExternal('https://github.com/aces/eeg2bids/issues');
  },
  visitMNE: () => {
    const {shell} = require('electron');
    shell.openExternal('https://mne.tools/mne-bids/');
  },
  visitMCIN: () => {
    const {shell} = require('electron');
    shell.openExternal('https://mcin.ca');
  },
  getLorisAuthenticationCredentials: async () => {
    const ipcRenderer = require('electron').ipcRenderer;
    const credentials = await ipcRenderer.invoke(
        'getLorisAuthenticationCredentials',
        null,
    );
    return credentials;
  },
  setLorisAuthenticationCredentials: (credentials) => {
    const ipcRenderer = require('electron').ipcRenderer;
    ipcRenderer.send('setLorisAuthenticationCredentials', credentials);
  },
  openSettings: () => {
    const ipcRenderer = require('electron').ipcRenderer;
    ipcRenderer.send('openSettingsWindow', null);
  },
});
