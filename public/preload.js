const {contextBridge, ipcRenderer} = require('electron');
const jsLog = require('electron-log');
const {archiveLog} = require('./logs');
const {dialog} = require('@electron/remote');
const {shell} = require('electron');
const path = require('path');
const MFFToSETService = process.env.DEV ?
  require('./mffToSetService') :
  require(path.join(__dirname, '../build/mffToSetService'));

jsLog.transports.file.fileName = 'js.log';
jsLog.transports.file.archiveLog = archiveLog;

/**
 * contextBridge should be cautious of security risk.
 */
contextBridge.exposeInMainWorld('myAPI', {
  dialog: () => dialog,
  visitBIDS: () => {
    shell.openExternal('https://bids.neuroimaging.io');
  },
  visitGitHub: () => {
    shell.openExternal('https://github.com/aces/eeg2bids');
  },
  visitIssues: () => {
    shell.openExternal('https://github.com/aces/eeg2bids/issues');
  },
  visitMNE: () => {
    shell.openExternal('https://mne.tools/mne-bids/');
  },
  visitMCIN: () => {
    shell.openExternal('https://mcin.ca');
  },
  getLorisAuthenticationCredentials: async () => {
    const credentials = await ipcRenderer.invoke(
        'getLorisAuthenticationCredentials',
        null,
    );
    return credentials;
  },
  setLorisAuthenticationCredentials: (credentials) => {
    ipcRenderer.send('setLorisAuthenticationCredentials', credentials);
  },
  removeLorisAuthenticationCredentials: () => {
    ipcRenderer.send('removeLorisAuthenticationCredentials', null);
  },
  convertMFFToSET: async (mffDirectory, callback) => {
    // Launch conversion service.
    const mffToSetService = new MFFToSETService();
    await mffToSetService.startup(mffDirectory, callback).then((error) => {
      if (error) {
        console.info('[SERVICE] mffToSet-service failed');
      } else {
        console.info('[SERVICE] mffToSet-service success');
      }
    });
  },
  logger: jsLog,
});
