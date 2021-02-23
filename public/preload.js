const {contextBridge} = require('electron');

contextBridge.exposeInMainWorld('myAPI', {
  dialog: () => {
    const electron = require('electron');
    const {dialog} = electron.remote;
    return dialog;
  },
});
