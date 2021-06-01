const {contextBridge} = require('electron');

contextBridge.exposeInMainWorld('myAPI', {
  dialog: () => {
    const {dialog} = require('@electron/remote');
    return dialog;
  },
  visitGitHub: () => {
    const {shell} = require('electron');
    shell.openExternal('https://github.com/aces/eeg2bids');
  },
  visitMCIN: () => {
    const {shell} = require('electron');
    shell.openExternal('https://mcin.ca');
  },
  openSettings: () => {
    const ipcRenderer = require('electron').ipcRenderer;
    ipcRenderer.send('openSettingsWindow', null);
  },
});
