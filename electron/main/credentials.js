// LORIS credential persistence. The username/password pair lives in the OS
// keychain via keytar; the LORIS URL is not a secret and lives in
// electron-store. Replacing keytar/electron-store with safeStorage and a
// first-party settings store is tracked in #137 (phase 5).
const keytar = require('keytar');
const Store = require('electron-store');

const SERVICE = 'EEG2BIDS';

const store = new Store({
  schema: {
    lorisURL: {
      type: 'string',
    },
  },
});

/**
 * Delete every stored credential for the service.
 */
const deleteAllPasswords = async () => {
  const stored = await keytar.findCredentials(SERVICE);
  for (const {account} of stored) {
    await keytar.deletePassword(SERVICE, account);
  }
};

/**
 * Read the stored LORIS credentials.
 * @return {Promise<object>} lorisURL, lorisUsername and lorisPassword,
 *   each '' when unset
 */
const get = async () => {
  const stored = await keytar.findCredentials(SERVICE);
  return {
    lorisURL: store.get('lorisURL') ?? '',
    lorisUsername: stored[0] ? stored[0].account : '',
    lorisPassword: stored[0] ? stored[0].password : '',
  };
};

/**
 * Replace the stored LORIS credentials.
 * @param {object} values - lorisURL, lorisUsername and lorisPassword
 */
const set = async (values) => {
  await deleteAllPasswords();
  await keytar.setPassword(
      SERVICE,
      values.lorisUsername,
      values.lorisPassword,
  );
  store.set('lorisURL', values.lorisURL);
};

/**
 * Remove the stored LORIS credentials.
 */
const remove = async () => {
  await deleteAllPasswords();
  store.set('lorisURL', '');
};

module.exports = {get, set, remove};
