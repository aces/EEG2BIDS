const {app} = require('electron');
const fs = require('fs');
const path = require('path');

// Plain, non-secret application settings (currently just the LORIS URL)
// persisted as JSON under the Electron userData directory. Secrets never
// belong here — they live in credentials.js, encrypted with safeStorage.

/**
 * Path of the settings file.
 * @return {string} absolute path under userData
 */
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

/**
 * Read the whole settings object.
 * @return {object} the stored settings, or {} when missing or unreadable
 */
const readAll = () => {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[settings] ignoring unreadable settings file: ` +
        `${error.message}`);
    }
    return {};
  }
};

/**
 * Read one setting.
 * @param {string} key - the setting name
 * @return {*} the stored value, or undefined
 */
const get = (key) => readAll()[key];

/**
 * Write one setting.
 * @param {string} key - the setting name
 * @param {*} value - any JSON-serializable value
 */
const set = (key, value) => {
  const settings = {...readAll(), [key]: value};
  fs.mkdirSync(path.dirname(settingsFile()), {recursive: true});
  fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2) + '\n');
};

module.exports = {get, set};
