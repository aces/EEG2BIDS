const fs = require('fs');
const path = require('path');

/**
 * Recursively list every regular file under a root directory.
 *
 * The renderer's batch discovery is pure and works from a flat path list, so
 * the main process only has to produce that list. Directories are walked
 * depth-first; symbolic links are not followed (a symlinked directory reports
 * isDirectory() false), which keeps the walk free of cycles and outside the
 * chosen tree. Unreadable subdirectories are skipped rather than aborting the
 * whole scan. The returned paths are absolute and sorted, so discovery from
 * them is deterministic.
 *
 * @param {string} root - the absolute root directory to scan
 * @return {Promise<string[]>} absolute file paths under root, sorted
 */
async function scanDirectory(root) {
  const files = [];

  /**
   * walk - collect files under one directory, recursing into real subdirs.
   * @param {string} dir - the directory to read
   */
  const walk = async (dir) => {
    let entries;
    try {
      entries = await fs.promises.readdir(dir, {withFileTypes: true});
    } catch {
      // A directory we cannot read (permissions, races) is skipped, not fatal.
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
  };

  await walk(root);
  return files.sort((a, b) => a.localeCompare(b));
}

module.exports = {scanDirectory};
