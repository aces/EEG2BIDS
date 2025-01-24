const {
  ipcMain,
  dialog,
  shell,
  app,
  BrowserWindow,
  nativeImage,
} = require('electron');

const path = require('path');
const url = require('url');
const Store = require('electron-store');
const jsLog = require('electron-log');
const {archiveLog} = require('./logs');

// Set data in electron-store (not secure)
const store = new Store({
  schema: {
    lorisURL: {
      type: 'string',
    },
    lorisUsername: {
      type: 'string',
    },
    lorisToken: {
      type: 'string',
    }
  }
});

// [security] Used for inputs.js (dialog call) to succeed.
require('@electron/remote/main').initialize();

const SET2BIDSService = process.env.DEV ?
  require('./set2bidsService') :
  require(path.join(__dirname, '../build/set2bidsService'));

// Launch python service.
const set2bidsService = new SET2BIDSService();
set2bidsService.startup().then((error) => {
  if (error) {
    console.info('[SERVICE] set2bids-service failed');
  } else {
    console.info('[SERVICE] set2bids-service success');
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
    'http://127.0.0.1:3000?app' :
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
    height: 700,
    minWidth: 1050,
    minHeight: 700,
    backgroundColor: '#094580',
  });

  mainWindow.removeMenu(); // Hides menu on Linux & Windows
  // mainWindow.maximize();
  mainWindow.show();

  require('@electron/remote/main').enable(mainWindow.webContents);


  mainWindow.loadURL(startUrl).then(() => {
    if (process.env.DEV) mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
};

app.on('ready', async () => {
  createMainWindow();
  const updateCredential = async (event, credentials) => {
    credentials?.lorisURL && store.set('lorisURL', credentials?.lorisURL);
    credentials?.lorisUsername && store.set('lorisUsername', credentials?.lorisUsername);
    store.set('lorisToken', credentials?.lorisToken || '');
  };

  ipcMain.on('removeLorisAuthenticationCredentials', updateCredential);
  ipcMain.on('setLorisAuthenticationCredentials', updateCredential);
  ipcMain.handle('getLorisAuthenticationCredentials', async () => {
    return {
      lorisURL: store.get('lorisURL') ?? '',
      lorisUsername: store.get('lorisUsername') ?? '',
      lorisToken: store.get('lorisToken') ?? '',
    };
  });
  ipcMain.handle('open-dialog', async (event, props) => {
    return await dialog.showOpenDialog(props);
  });
  ipcMain.handle('shell-external', async (event, url) => {
    return await shell.openExternal(url);
  });
  ipcMain.handle('set-logger', async (event) => {
    jsLog.transports.file.fileName = 'js.log';
    jsLog.transports.file.archiveLog = archiveLog;
    Object.assign(console, jsLog.functions);
  });
  ipcMain.handle('mff-to-set-service', async (event, mffDirectory) => {
    const MFFToSETService = process.env.DEV ?
      require('./mffToSetService') :
      require(path.join(__dirname, '../build/mffToSetService'));
    const mffToSetService = new MFFToSETService();
    return await mffToSetService.startup(mffDirectory).then((result) => {
       if (!result.success) {
          console.info('[SERVICE] mffToSet-service failed');
        } else {
          console.info('[SERVICE] mffToSet-service success');
        }
        return result;
    });
  });
});

app.on('window-all-closed', () => {
  // Wait for shutdown to stop
  // the service and quit the app
  if (process.platform !== 'darwin') {
    set2bidsService.shutdown(() => app.quit());
  }
});

app.on('activate', () => {
  if (mainWindow === undefined || mainWindow === null) {
    createMainWindow();
  }
});
