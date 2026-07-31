const fs = require('fs');
const path = require('path');
const util = require('util');

let initialized = false;

/**
 * Tee main-process console output (including captured backend output) to a
 * persistent file for installed-app diagnostics. Values still go to the
 * original console and credentials are never logged by this module.
 * @param {Electron.App} app - Electron application
 * @return {string} path to the active log file
 */
const initializeLogging = (app) => {
  if (initialized) {
    return path.join(app.getPath('userData'), 'logs', 'main.log');
  }
  const logDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDir, {recursive: true});
  const logPath = path.join(logDir, 'main.log');

  for (const level of ['info', 'warn', 'error']) {
    // This module deliberately wraps the process console as the source that is
    // teed to the diagnostic file.
    // eslint-disable-next-line no-console
    const original = console[level].bind(console);
    // eslint-disable-next-line no-console
    console[level] = (...args) => {
      original(...args);
      const message = util.format(...args).replaceAll('\r', '');
      const line = `${new Date().toISOString()} ${level.toUpperCase()} ` +
        `${message}\n`;
      try {
        fs.appendFileSync(logPath, line, {encoding: 'utf8'});
      } catch (error) {
        original(`[electron:main] could not write ${logPath}:`, error);
      }
    };
  }
  initialized = true;
  console.info(`[electron:main] logging to ${logPath}`);
  return logPath;
};

module.exports = {initializeLogging};
