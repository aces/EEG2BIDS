const {contextBridge} = require('electron');
const jsLog = require('electron-log');
const {archiveLog} = require('./logs');

jsLog.transports.file.fileName = 'js.log';
jsLog.transports.file.archiveLog = archiveLog;

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
  removeLorisAuthenticationCredentials: () => {
    const ipcRenderer = require('electron').ipcRenderer;
    ipcRenderer.send('removeLorisAuthenticationCredentials', null);
  },
  openSettings: () => {
    const ipcRenderer = require('electron').ipcRenderer;
    ipcRenderer.send('openSettingsWindow', null);
  },
  convertMFFToSET: async (mffDirectory, callback) => {
    const path = require('path');
    const MFFToSETService = process.env.DEV ?
    require('./mffToSetService') :
    require(path.join(__dirname, '../build/mffToSetService'));

    // Launch conversion service.
    const mffToSetService = new MFFToSETService();
    await mffToSetService.startup(mffDirectory, callback).then((error) => {
      if (error) {
        console.info('[SERVICE] mffToSet-service failed');
      } else {
        console.info('[SERVICE] mffToSet-service success');
      }
    });
    //return setFile;
  },
  logger: jsLog,
});
