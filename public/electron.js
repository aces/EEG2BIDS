const electron = require('electron');
const path = require('path');
const url = require('url');

const {app} = electron;
const {BrowserWindow} = electron;
const nativeImage = electron.nativeImage;

const PycatService = require('../public/pycatService');

// Launch python service.
const pycatService = new PycatService('production'); // production or development
pycatService.startup();

if (process.env.DEV) {
  const {
    default: installExtension,
    REDUX_DEVTOOLS,
    REACT_DEVELOPER_TOOLS,
  } = require('electron-devtools-installer');

  app.whenReady().then(() => {
    installExtension(REDUX_DEVTOOLS).then((name) =>
      console.log(`Added Extension:  ${name}`),
    );
    installExtension(REACT_DEVELOPER_TOOLS).then((name) =>
      console.log(`Added Extension:  ${name}`),
    );
  });
}

const icon = nativeImage.createFromPath(
    path.join(__dirname, 'app_icon.png')
);
let mainWindow;
/**
 * Create Window.
 */
const createWindow = () => {
  const startUrl = process.env.DEV ?
    'http://localhost:3000' :
    url.format({
      pathname: path.join(__dirname, '/../build/index.html'),
      protocol: 'file:',
      slashes: true,
    });
  mainWindow = new BrowserWindow({
    show: false,
    icon,
    webPreferences: {
      webSecurity: true,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      nativeWindowOpen: true,
    },
    width: 900,
    height: 600,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0A826E',
  });
  mainWindow.removeMenu(); // Hides menu on Linux & Windows
  // mainWindow.maximize();
  mainWindow.show();

  mainWindow.loadURL(startUrl);
  process.env.DEV && mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function() {
    pycatService.shutdown();
    mainWindow = null;
  });
};

app.on('ready', async () => {
  createWindow();
});

app.on('window-all-closed', () => {
  pycatService.shutdown();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
