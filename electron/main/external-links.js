const {shell} = require('electron');

// The only external destinations the renderer may open. Validation happens
// here in the main process; the renderer only ever passes a string.
const ALLOWED_EXTERNAL_URLS = new Set([
  'https://bids.neuroimaging.io',
  'https://github.com/aces/eeg2bids',
  'https://github.com/aces/eeg2bids/issues',
  'https://mne.tools/mne-bids/',
  'https://mcin.ca',
]);

/**
 * Open an allowlisted HTTPS URL in the user's browser.
 * @param {string} url - the external URL requested by the renderer
 * @return {Promise<boolean>} true if the URL was opened
 */
const openExternal = async (url) => {
  if (typeof url !== 'string' || !ALLOWED_EXTERNAL_URLS.has(url)) {
    console.warn(`[links] blocked external URL: ${url}`);
    return false;
  }
  await shell.openExternal(url);
  return true;
};

module.exports = {openExternal, ALLOWED_EXTERNAL_URLS};
