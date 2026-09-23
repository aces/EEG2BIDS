const {BrowserWindow, nativeImage} = require('electron');
const path = require('path');
const url = require('url');
const {BACKEND_PORT} = require('./backend-service');

const icon = nativeImage.createFromPath(
    path.join(__dirname, '../../public/logo512.png'),
);

let mainWindow = null;

// The renderer URL for development or a production build.
const RENDERER_URL = process.env.DEV ?
  'http://localhost:3000/' :
  url.pathToFileURL(path.join(__dirname, '../../build/index.html')).href;

const webPreferences = {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  preload: path.join(__dirname, '../preload/index.js'),
  // Carry the configured backend port to the sandboxed renderer. The preload
  // reads it from process.argv and exposes it; the renderer must not assume
  // the default 7301.
  additionalArguments: [`--backend-port=${BACKEND_PORT}`],
};

/**
 * Whether a navigation target is one of our own renderer URLs. Anything
 * else (external sites, arbitrary files) must not load in a window.
 * @param {string} targetUrl - the URL a window is trying to navigate to
 * @return {boolean} true if navigation is allowed
 */
const isAllowedRendererUrl = (targetUrl) =>
  targetUrl.startsWith(RENDERER_URL);

/**
 * Create the main window.
 */
const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    icon,
    webPreferences,
    width: 1050,
    height: 880,
    minWidth: 1050,
    minHeight: 880,
    backgroundColor: '#094580',
  });
  mainWindow.removeMenu();

  mainWindow.loadURL(RENDERER_URL).then(() => {
    if (process.env.DEV) {
      mainWindow.webContents.openDevTools();
    }
  }).catch((error) => {
    console.error(
        `[electron:main] could not load the renderer from ` +
        `${RENDERER_URL}: ${error.message}.` +
        (process.env.DEV ?
          ' Is the Vite dev server running (npm run dev)?' : ''),
    );
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

/**
 * Get the main window, if one exists.
 * @return {BrowserWindow|null} the main window or null
 */
const getMainWindow = () => mainWindow;

module.exports = {
  createMainWindow,
  getMainWindow,
  isAllowedRendererUrl,
};
