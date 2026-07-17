const {app, safeStorage} = require('electron');
const fs = require('fs');
const path = require('path');
const settings = require('./settings');

// LORIS credential persistence. The username/password pair is encrypted
// with Electron safeStorage and written under the userData directory; the
// LORIS URL is not a secret and lives in the ordinary settings store.
// Credential and token values must never be logged here.

/**
 * Path of the encrypted credentials file.
 * @return {string} absolute path under userData
 */
const credentialsFile = () =>
  path.join(app.getPath('userData'), 'loris-credentials.enc');

let backendChecked = false;

/**
 * Warn once when Linux has no usable secret service and safeStorage falls
 * back to its 'basic_text' backend, which obfuscates with a hardcoded key
 * rather than encrypting with an OS-backed secret.
 */
const checkStorageBackend = () => {
  if (backendChecked || process.platform !== 'linux') {
    return;
  }
  backendChecked = true;
  const backend = safeStorage.getSelectedStorageBackend();
  if (backend === 'basic_text' || backend === 'unknown') {
    console.warn(
        `[credentials] safeStorage backend is '${backend}': no usable ` +
        `secret service (GNOME Keyring / KWallet) was found, so stored ` +
        `credentials are only obfuscated, NOT securely encrypted.`,
    );
  }
};

/**
 * Read the stored LORIS credentials.
 * @return {Promise<object>} lorisURL, lorisUsername and lorisPassword,
 *   each '' when unset or undecryptable
 */
const get = async () => {
  const lorisURL = settings.get('lorisURL') ?? '';
  const empty = {lorisURL, lorisUsername: '', lorisPassword: ''};
  let encrypted;
  try {
    encrypted = fs.readFileSync(credentialsFile());
  } catch (error) {
    return empty;
  }
  try {
    const decrypted = JSON.parse(safeStorage.decryptString(encrypted));
    return {
      lorisURL,
      lorisUsername: decrypted.lorisUsername ?? '',
      lorisPassword: decrypted.lorisPassword ?? '',
    };
  } catch (error) {
    // Wrong key (the OS keyring changed) or a corrupt file: treat as
    // signed out rather than failing.
    console.warn('[credentials] stored credentials could not be ' +
      'decrypted; ignoring them');
    return empty;
  }
};

/**
 * Replace the stored LORIS credentials.
 * @param {object} values - lorisURL, lorisUsername and lorisPassword
 */
const set = async (values) => {
  checkStorageBackend();
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
        'safeStorage reports no encryption backend; refusing to persist ' +
        'credentials. Install/unlock a secret service (GNOME Keyring or ' +
        'KWallet) and try again.',
    );
  }
  const encrypted = safeStorage.encryptString(JSON.stringify({
    lorisUsername: values.lorisUsername,
    lorisPassword: values.lorisPassword,
  }));
  fs.mkdirSync(path.dirname(credentialsFile()), {recursive: true});
  fs.writeFileSync(credentialsFile(), encrypted, {mode: 0o600});
  settings.set('lorisURL', values.lorisURL);
};

/**
 * Remove the stored LORIS credentials.
 */
const remove = async () => {
  fs.rmSync(credentialsFile(), {force: true});
  settings.set('lorisURL', '');
};

module.exports = {get, set, remove};
