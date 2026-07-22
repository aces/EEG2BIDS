const fs = require('fs');
const {dialog} = require('electron');

// The single file type the batch workbench reads and writes: a JSON document
// whose shape is owned by the renderer's batchFile module. The main process
// only moves bytes and stats paths; it never interprets the manifest.
const BATCH_FILTERS = [{name: 'Batch manifest', extensions: ['json']}];

/**
 * saveBatchFile - prompt for a location and write a serialized manifest to it.
 *
 * The document is written exactly as the renderer serialized it (pretty-printed
 * for a human-readable, diff-friendly file). Saving is the only writer of a
 * batch file, and it happens solely on this explicit action, so loading a batch
 * or changing Configuration never rewrites the source manifest.
 * @param {Electron.BrowserWindow} window - the parent window for the dialog
 * @param {{suggestedName: string, data: object}} payload - name hint + document
 * @return {Promise<?string>} the written path, or null if the user cancelled
 */
async function saveBatchFile(window, {suggestedName, data}) {
  const result = await dialog.showSaveDialog(window, {
    defaultPath: suggestedName || 'batch.json',
    filters: BATCH_FILTERS,
  });
  if (result.canceled || !result.filePath) {
    return null;
  }
  await fs.promises.writeFile(
      result.filePath, JSON.stringify(data, null, 2), 'utf8');
  return result.filePath;
}

/**
 * openBatchFile - prompt for a batch file and return its parsed document.
 *
 * The bytes are read and parsed here; validating the document's shape and
 * version is the renderer's job (see batchFile.deserializeManifest), which
 * reports problems rather than refusing to open. A malformed JSON file throws a
 * clear error so the renderer can tell the user the file could not be read.
 * @param {Electron.BrowserWindow} window - the parent window for the dialog
 * @return {Promise<?{filePath: string, data: object}>} the file, or null if
 *   cancelled
 */
async function openBatchFile(window) {
  const result = await dialog.showOpenDialog(window, {
    properties: ['openFile'],
    filters: BATCH_FILTERS,
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  const filePath = result.filePaths[0];
  const text = await fs.promises.readFile(filePath, 'utf8');
  try {
    return {filePath, data: JSON.parse(text)};
  } catch {
    throw new Error(`${filePath} is not a valid batch file (invalid JSON).`);
  }
}

/**
 * statPaths - a lightweight signature for each requested path.
 *
 * Returns a plain map from path to {size, mtimeMs}, or null when the path can no
 * longer be read. This is what lets the renderer reconcile a reopened manifest
 * against the current sources (present / missing / changed) without the pure
 * renderer code ever touching the filesystem.
 * @param {string[]} paths - source paths to stat
 * @return {Promise<Object<string, ?{size: number, mtimeMs: number}>>} signatures
 */
async function statPaths(paths) {
  const signatures = {};
  for (const filePath of paths || []) {
    try {
      const stats = await fs.promises.stat(filePath);
      signatures[filePath] = {size: stats.size, mtimeMs: stats.mtimeMs};
    } catch {
      // An unreadable or absent source is reported as null (missing), not fatal.
      signatures[filePath] = null;
    }
  }
  return signatures;
}

module.exports = {saveBatchFile, openBatchFile, statPaths};
