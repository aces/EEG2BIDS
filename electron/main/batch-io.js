const fs = require('fs');
const path = require('path');
const {dialog} = require('electron');

// The main process only moves bytes and stats paths; the renderer's
// batchFile module owns the manifest's shape.
const filters = [{name: 'Batch manifest', extensions: ['json']}];

// Every file under root, sorted. Symlinked directories are not followed and
// unreadable directories are skipped rather than failing the whole scan.
const scanDirectory = async (root) => {
  const files = [];
  const walk = async (dir) => {
    const entries = await fs.promises.readdir(dir, {withFileTypes: true})
        .catch(() => []);
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) files.push(full);
    }
  };
  await walk(root);
  return files.sort((a, b) => a.localeCompare(b));
};

const saveBatchFile = async (window, {suggestedName, data}) => {
  const {canceled, filePath} = await dialog.showSaveDialog(window, {
    defaultPath: suggestedName || 'batch.json', filters,
  });
  if (canceled || !filePath) return null;
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  return filePath;
};

const openBatchFile = async (window) => {
  const {canceled, filePaths: [filePath]} = await dialog.showOpenDialog(
      window, {properties: ['openFile'], filters});
  if (canceled || !filePath) return null;
  const text = await fs.promises.readFile(filePath, 'utf8');
  try {
    return {filePath, data: JSON.parse(text)};
  } catch {
    throw new Error(`${filePath} is not a valid batch file (invalid JSON).`);
  }
};

// {path: {size, mtimeMs}}, or null for a path that can't be read, so a
// reopened batch can report missing or changed sources.
const statPaths = async (paths) => Object.fromEntries(
    await Promise.all((paths || []).map(async (filePath) => [filePath,
      await fs.promises.stat(filePath).then(
          ({size, mtimeMs}) => ({size, mtimeMs}), () => null)])));

module.exports = {scanDirectory, saveBatchFile, openBatchFile, statPaths};
