const electron = require('electron');
const path = require('path');
const url = require('url');

// [security] Used for inputs.js (dialog call) to succeed.
require('@electron/remote/main').initialize();

const {app} = electron;
const {BrowserWindow} = electron;
const {ipcMain} = require('electron');
const nativeImage = electron.nativeImage;

const EEG2BIDSService = process.env.DEV ?
  require('./eeg2bidsService') :
  require(path.join(__dirname, '../build/eeg2bidsService'));

// Launch python service.
const eeg2bidsService = new EEG2BIDSService();
eeg2bidsService.startup().then((error) => {
  if (error) {
    console.info('[SERVICE] eeg2bids-service failed');
  } else {
    console.info('[SERVICE] eeg2bids-service success');
  }
});

if (process.env.DEV) {
  const {
    default: installExtension,
    REDUX_DEVTOOLS,
    REACT_DEVELOPER_TOOLS,
  } = require('electron-devtools-installer');

  app.whenReady().then(() => {
    installExtension(REDUX_DEVTOOLS).then((name) =>
      console.info(`Added Extension:  ${name}`),
    );
    installExtension(REACT_DEVELOPER_TOOLS).then((name) =>
      console.info(`Added Extension:  ${name}`),
    );
  });
}

const icon = nativeImage.createFromPath(
    path.join(__dirname, 'app_icon.png')
);
let mainWindow;
/**
 * Create Main Window.
 */
const createMainWindow = () => {
  const startUrl = process.env.DEV ?
    'http://localhost:3000?app' :
    `${url.pathToFileURL(path.join(
        __dirname, '/../build/index.html')).href}?app`;
  mainWindow = new BrowserWindow({
    show: false,
    icon,
    webPreferences: {
      webSecurity: true,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js'),
      nativeWindowOpen: true,
    },
    width: 1050,
    height: 880,
    minWidth: 1050,
    minHeight: 880,
    backgroundColor: '#094580',
  });

  mainWindow.removeMenu(); // Hides menu on Linux & Windows
  // mainWindow.maximize();
  mainWindow.show();

  mainWindow.loadURL(startUrl).then(() => {
    if (process.env.DEV) mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
};
let settingsWindow;
/**
 * Create Settings Window.
 */
const createSettingsWindow = () => {
  const startUrl = process.env.DEV ?
    'http://localhost:3000?settings' :
    `${url.pathToFileURL(path.join(
        __dirname, '/../build/index.html')).href}?settings`;
  settingsWindow = new BrowserWindow({
    icon,
    show: true,
    webPreferences: {
      webSecurity: true,
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js'),
      nativeWindowOpen: true,
    },
    width: 600,
    height: 500,
    minWidth: 600,
    minHeight: 500,
    backgroundColor: '#0A826E',
  });
  settingsWindow.removeMenu(); // Hides menu on Linux & Windows
  settingsWindow.show();

  settingsWindow.loadURL(startUrl).then(() => {
    process.env.DEV && settingsWindow.webContents.openDevTools();
  });

  settingsWindow.on('closed', function() {
    settingsWindow = null;
  });
};

app.on('ready', async () => {
  createMainWindow();
  ipcMain.on('openSettingsWindow', (event, arg) => {
    if (settingsWindow === undefined || settingsWindow === null) {
      createSettingsWindow();
    }
  });
  ipcMain.on('removeLorisAuthenticationCredentials',
      async (event, arg) => {
        const keytar = require('keytar');
        // Delete all old credentials
        const services = await keytar.findCredentials('EEG2BIDS');
        for (const service of services) {
          await keytar.deletePassword('EEG2BIDS', service.account);
        }
        // Set lorisURL in electron-store (not secure)
        const Store = require('electron-store');
        const schema = {
          lorisURL: {
            type: 'string',
            //format: 'url',
          },
        };
        const store = new Store({schema});
        store.set('lorisURL', '');
      });
  ipcMain.on('setLorisAuthenticationCredentials',
      async (event, credentials) => {
        const keytar = require('keytar');
        // Delete all old credentials
        const services = await keytar.findCredentials('EEG2BIDS');
        for (const service of services) {
          await keytar.deletePassword('EEG2BIDS', service.account);
        }
        // Set new credentials (secure)
        await keytar.setPassword(
            'EEG2BIDS',
            credentials.lorisUsername,
            credentials.lorisPassword,
        );
        // Set lorisURL in electron-store (not secure)
        const Store = require('electron-store');
        const schema = {
          lorisURL: {
            type: 'string',
            //format: 'url',
          },
        };
        const store = new Store({schema});
        store.set('lorisURL', credentials.lorisURL);
      });
  ipcMain.handle('getLorisAuthenticationCredentials', async (event, arg) => {
    const keytar = require('keytar');
    const credentials = await keytar.findCredentials('EEG2BIDS');
    const Store = require('electron-store');
    const store = new Store();
    return {
      lorisURL: store.get('lorisURL') ?? '',
      lorisUsername: credentials[0] ? credentials[0].account : '',
      lorisPassword: credentials[0] ? credentials[0].password : '',
    };
  });
});

app.on('window-all-closed', () => {
  // Wait for shutdown to stop
  // the service and quit the app
  if (process.platform !== 'darwin') {
    eeg2bidsService.shutdown(() => app.quit());
  }
});

app.on('activate', () => {
  if (mainWindow === undefined || mainWindow === null) {
    createMainWindow();
  }
});
