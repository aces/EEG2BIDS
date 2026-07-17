const {BrowserWindow, nativeImage} = require('electron');
const path = require('path');
const url = require('url');

const icon = nativeImage.createFromPath(
    path.join(__dirname, '../../public/logo512.png'),
);

let mainWindow = null;
let settingsWindow = null;

/**
 * Resolve the renderer URL for development or a production build.
 * @param {string} query - optional query string without the leading "?"
 * @return {string} the URL to load
 */
const rendererUrl = (query) => {
  const base = process.env.DEV ?
    'http://localhost:3000/' :
    url.pathToFileURL(path.join(__dirname, '../../build/index.html')).href;
  return query ? `${base}?${query}` : base;
};

const webPreferences = {
  nodeIntegration: false,
  contextIsolation: true,
  preload: path.join(__dirname, '../preload/index.js'),
};

/**
 * Create the main window.
 */
const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    show: false,
    icon,
    webPreferences,
    width: 1050,
    height: 880,
    minWidth: 1050,
    minHeight: 880,
    backgroundColor: '#094580',
  });
  mainWindow.removeMenu();
  mainWindow.show();

  mainWindow.loadURL(rendererUrl()).then(() => {
    if (process.env.DEV) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

/**
 * Create the settings window, or focus it if it is already open.
 */
const createSettingsWindow = () => {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    icon,
    show: true,
    webPreferences,
    width: 600,
    height: 500,
    minWidth: 600,
    minHeight: 500,
    backgroundColor: '#0A826E',
  });
  settingsWindow.removeMenu();
  settingsWindow.show();

  settingsWindow.loadURL(rendererUrl('settings')).then(() => {
    if (process.env.DEV) {
      settingsWindow.webContents.openDevTools();
    }
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
};

/**
 * Get the main window, if one exists.
 * @return {BrowserWindow|null} the main window or null
 */
const getMainWindow = () => mainWindow;

module.exports = {createMainWindow, createSettingsWindow, getMainWindow};
