const {contextBridge} = require('electron');

contextBridge.exposeInMainWorld('myAPI', {
  dialog: () => {
    const electron = require('electron');
    const {dialog} = electron.remote;
    return dialog;
  },
  visitGitHub: () => {
    const {shell} = require('electron');
    shell.openExternal('https://github.com/aces/pyCat');
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
